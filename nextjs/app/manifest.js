// 홈 화면에 앱으로 설치할 때 쓰는 PWA 매니페스트예요. /manifest.webmanifest로 나가요.
export default function manifest() {
  return {
    name: '칭찬 릴레이',
    short_name: '칭찬 릴레이',
    description: '고마운 동료에게 한마디 남기는 우리 팀 칭찬 릴레이',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f7f6',
    theme_color: '#00854a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
