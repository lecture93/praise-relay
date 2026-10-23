import { after } from 'next/server';
import { sql } from '../../../lib/db';
import { notifyNewEntry } from '../../../lib/push';

export const dynamic = 'force-dynamic';

const MAX_BODY = 8192;

function error(status, message) {
  return Response.json({ error: message }, { status });
}

// 글 하나를 API 약속의 모양으로 바꿔요. created_at은 UTC ISO 문자열이에요.
function toEntry(row) {
  return {
    id: Number(row.id),
    name: row.name,
    message: row.message,
    created_at: new Date(row.created_at).toISOString(),
  };
}

// 문자열인지 보고, 앞뒤 공백을 지운 뒤 1~maximum자인지 검사해요.
function field(body, key, label, maximum) {
  const raw = body[key];
  if (typeof raw !== 'string' || !raw.trim()) throw new Error(`${label}을 입력해 주세요.`);
  const value = raw.trim();
  if ([...value].length > maximum) throw new Error(`${label}은 ${maximum}자 이내로 입력해 주세요.`);
  return value;
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, message, created_at FROM entries ORDER BY id DESC LIMIT 200`;
    return Response.json({ entries: rows.map(toEntry) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return error(500, '목록을 불러오지 못했습니다.');
  }
}

export async function POST(request) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return error(415, 'application/json으로 보내 주세요.');
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) {
    return error(413, '요청 본문이 너무 큽니다.');
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_BODY) return error(413, '요청 본문이 너무 큽니다.');

  let body;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return error(400, 'JSON 형식을 확인해 주세요.');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return error(400, 'JSON 객체를 보내 주세요.');
  }

  let name, message;
  try {
    name = field(body, 'name', '이름', 40);
    message = field(body, 'message', '내용', 500);
  } catch (e) {
    return error(400, e.message);
  }

  try {
    const [row] = await sql`
      INSERT INTO entries (name, message) VALUES (${name}, ${message})
      RETURNING id, name, message, created_at`;
    const entry = toEntry(row);
    // 응답을 먼저 보내고, 그다음 구독한 기기들에 알림을 보내요.
    const exceptEndpoint = request.headers.get('x-push-endpoint');
    after(() => notifyNewEntry(entry, exceptEndpoint).catch(() => {}));
    return Response.json({ entry }, { status: 201 });
  } catch {
    return error(500, '저장하지 못했습니다. 다시 시도해 주세요.');
  }
}
