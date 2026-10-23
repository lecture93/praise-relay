-- Supabase SQL Editor에서 한 번 실행해요.
create table if not exists public.entries (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 40),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

-- 화면은 Next.js API를 거쳐서만 DB에 닿아요.
-- RLS를 켜고 정책을 두지 않아, 공개 anon 키로는 이 표를 읽거나 쓸 수 없게 해요.
alter table public.entries enable row level security;

-- 웹 푸시 알림을 받을 기기 목록
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
