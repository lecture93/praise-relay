import webpush from 'web-push';
import { sql } from './db';

// VAPID 키가 없으면 알림 없이 글 저장만 해요.
const ready = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (ready) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'https://github.com/lecture93/praise-relay',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// 새 칭찬을 구독한 모든 기기에 알려요. 글쓴이 본인의 기기(exceptEndpoint)는 빼요.
// 브라우저가 구독을 끊었으면(404, 410) DB에서도 지워요.
export async function notifyNewEntry(entry, exceptEndpoint) {
  if (!ready) return;
  const subscriptions = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`;
  const payload = JSON.stringify({
    title: `${entry.name}님이 칭찬을 남겼어요`,
    body: entry.message.length > 120 ? `${entry.message.slice(0, 120)}…` : entry.message,
    tag: `praise-${entry.id}`,
    url: '/',
  });
  await Promise.all(
    subscriptions
      .filter((s) => s.endpoint !== exceptEndpoint)
      .map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 }
          );
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${s.endpoint}`;
          }
        }
      })
  );
}
