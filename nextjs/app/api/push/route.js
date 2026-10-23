import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

function error(status, message) {
  return Response.json({ error: message }, { status });
}

async function readSubscription(request) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return [null, error(415, 'application/json으로 보내 주세요.')];
  const text = await request.text();
  if (text.length > 4096) return [null, error(413, '요청 본문이 너무 큽니다.')];
  try {
    const body = JSON.parse(text);
    const endpoint = body?.endpoint;
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) throw new Error();
    return [body, null];
  } catch {
    return [null, error(400, '알림 구독 정보를 확인해 주세요.')];
  }
}

// 알림 구독을 저장해요. 브라우저의 PushSubscription.toJSON() 모양을 그대로 받아요.
export async function POST(request) {
  const [body, failed] = await readSubscription(request);
  if (failed) return failed;
  const { p256dh, auth } = body.keys || {};
  if (typeof p256dh !== 'string' || typeof auth !== 'string') {
    return error(400, '알림 구독 정보를 확인해 주세요.');
  }
  try {
    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth)
      VALUES (${body.endpoint}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`;
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return error(500, '알림 구독을 저장하지 못했습니다.');
  }
}

// 알림 끄기: 구독을 지워요.
export async function DELETE(request) {
  const [body, failed] = await readSubscription(request);
  if (failed) return failed;
  try {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${body.endpoint}`;
    return Response.json({ ok: true });
  } catch {
    return error(500, '알림 구독을 지우지 못했습니다.');
  }
}
