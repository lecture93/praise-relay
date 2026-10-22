import './globals.css';

export const metadata = {
  title: '칭찬 릴레이',
  description: '고마운 동료에게 한마디 남기는 우리 팀 칭찬 릴레이',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
