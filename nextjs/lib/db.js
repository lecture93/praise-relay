import postgres from 'postgres';

// Supabase의 연결 문자열(Transaction pooler, 6543 포트)을 DATABASE_URL 환경 변수로 받아요.
// 서버리스 환경에서는 prepare를 꺼야 pooler와 함께 쓸 수 있어요.
const globalForDb = globalThis;

export const sql =
  globalForDb.praiseSql ??
  postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: 'require' });

if (process.env.NODE_ENV !== 'production') globalForDb.praiseSql = sql;
