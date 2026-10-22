# 칭찬 릴레이

우리 팀이 동료에게 고마운 점을 한마디씩 남기고 함께 보는 작은 웹앱이에요. 요구사항은 [PRD.md](PRD.md)에 있어요.

## 폴더

| 폴더 | 내용 |
| --- | --- |
| `nextjs/` | **배포용.** Next.js 화면 + API(`/api/entries`), DB는 Supabase Postgres |
| `supabase/schema.sql` | Supabase에 만들 `entries` 표 |
| `api/`, `web/` | 처음 만든 로컬 버전(Spring Boot 8080 + React/Vite 5173, SQLite) |

## 배포 (GitHub → Vercel, DB는 Supabase)

1. **Supabase**: 새 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행해요.
2. **연결 문자열**: Supabase의 Connect › Transaction pooler(6543 포트) 주소를 복사해요.
3. **Vercel**: Add New › Project에서 이 GitHub 저장소를 가져와요.
   - Root Directory: `nextjs`
   - Environment Variables: `DATABASE_URL` = 2번의 연결 문자열
4. Deploy를 누르면 끝이에요.

## 로컬에서 실행

```bash
cd nextjs
cp .env.example .env.local   # DATABASE_URL을 채워요
npm install
npm run dev                  # http://127.0.0.1:3000
```

## API 약속

| 요청 | 성공 응답 | 내용 |
| --- | --- | --- |
| `GET /api/entries` | 200, `{"entries": [...]}` | 최신 글부터 최대 200개 |
| `POST /api/entries` | 201, `{"entry": {...}}` | JSON 본문의 `name`, `message`를 저장 |

실패하면 `{"error": "설명"}`으로 답해요. 잘못된 값과 깨진 JSON은 400, 8KiB가 넘는 본문은 413, JSON이 아닌 형식은 415, 없는 주소는 404예요.
