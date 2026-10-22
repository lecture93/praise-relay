// /api 아래의 없는 주소는 {"error": "..."} 모양의 404로 답해요.
function notFound() {
  return Response.json({ error: '찾을 수 없는 경로입니다.' }, { status: 404 });
}

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
