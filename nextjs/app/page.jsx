'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// VAPID 공개키(base64url)를 브라우저가 받는 바이트 배열로 바꿔요.
function keyToBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// 알림 상태: loading, unsupported(브라우저가 못 함), install(iPhone은 홈 화면에 추가해야 함), off, on, denied
async function readNotifyState() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
    return ios && !standalone ? 'install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) ? 'on' : 'off';
}

async function sendSubscription(method, subscription) {
  const response = await fetch('/api/push', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  if (!response.ok) throw new Error((await response.json()).error);
}

const INSTALL_DISMISSED = 'praise-install-dismissed';

// 처음 들어온 사람에게 "앱으로 등록할까요?"를 물어요.
// Chrome·Edge·Android는 beforeinstallprompt로 설치 창을 바로 띄우고,
// iPhone(Safari)은 설치 API가 없어서 홈 화면에 추가하는 방법을 안내해요.
function useInstallPrompt() {
  const [mode, setMode] = useState(null); // null | 'prompt' | 'ios'
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem(INSTALL_DISMISSED) === '1'; } catch {}
    if (standalone || dismissed) return;

    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
      setMode('prompt');
    };
    const onInstalled = () => setMode(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setMode('ios');
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function close() {
    try { localStorage.setItem(INSTALL_DISMISSED, '1'); } catch {}
    setMode(null);
  }

  async function install() {
    if (!deferred) return close();
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setMode(null);
    else close();
  }

  return { mode, install, close };
}

export default function Home() {
  const installPrompt = useInstallPrompt();
  const [notify, setNotify] = useState('loading');
  const [notifyError, setNotifyError] = useState('');
  const [entries, setEntries] = useState([]);
  const [listStatus, setListStatus] = useState({ text: '칭찬을 불러오는 중…', error: false });
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [formStatus, setFormStatus] = useState({ text: '', error: false });

  async function loadEntries() {
    try {
      const response = await fetch('/api/entries', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEntries(data.entries);
      setListStatus({
        text: data.entries.length ? `칭찬 ${data.entries.length}개` : '아직 칭찬이 없어요. 첫 칭찬을 남겨 주세요.',
        error: false,
      });
    } catch {
      setListStatus({ text: '목록을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.', error: true });
    }
  }

  useEffect(() => {
    loadEntries();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    readNotifyState().then(setNotify).catch(() => setNotify('unsupported'));
  }, []);

  async function toggleNotify() {
    setNotifyError('');
    try {
      const registration = await navigator.serviceWorker.ready;
      if (notify === 'on') {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await sendSubscription('DELETE', subscription);
          await subscription.unsubscribe();
        }
        setNotify('off');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotify(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY),
      });
      await sendSubscription('POST', subscription);
      setNotify('on');
    } catch (error) {
      setNotifyError(error.message || '알림 설정을 바꾸지 못했어요.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormStatus({ text: '저장하는 중…', error: false });
    try {
      // 내 기기에는 내 칭찬 알림이 오지 않게 내 구독 주소를 함께 보내요.
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
      const mine = registration ? await registration.pushManager?.getSubscription() : null;
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(mine ? { 'X-Push-Endpoint': mine.endpoint } : {}),
        },
        body: JSON.stringify({ name, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '저장하지 못했어요.');
      setMessage('');
      setFormStatus({ text: '칭찬을 남겼어요!', error: false });
      await loadEntries();
    } catch (error) {
      const text = error instanceof TypeError ? '서버에 연결하지 못했어요.' : error.message;
      setFormStatus({ text, error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">DB Inc · 우리 팀</p>
        <h1>칭찬 릴레이</h1>
        <p className="lead">고마운 동료에게 한마디 남기고, 다음 사람에게 바통을 넘겨요.</p>
      </header>

      {notify !== 'loading' && notify !== 'unsupported' && (
        <div className="notify">
          <p>
            {notify === 'on' && '새 칭찬이 오면 이 기기로 알려 드려요.'}
            {notify === 'off' && '새 칭찬이 오면 알림을 받아 보세요.'}
            {notify === 'denied' && '알림이 차단돼 있어요. 브라우저 사이트 설정에서 알림을 허용해 주세요.'}
            {notify === 'install' && 'iPhone은 공유 › 홈 화면에 추가로 앱을 설치한 뒤 알림을 켤 수 있어요.'}
            {notifyError && <span className="status error"> {notifyError}</span>}
          </p>
          {(notify === 'on' || notify === 'off') && (
            <button type="button" className={notify === 'on' ? 'ghost' : ''} onClick={toggleNotify}>
              {notify === 'on' ? '알림 끄기' : '알림 켜기'}
            </button>
          )}
        </div>
      )}

      <form className="card form" onSubmit={handleSubmit}>
        <label htmlFor="name">보내는 사람</label>
        <input id="name" value={name} maxLength={40} required placeholder="내 이름"
          onChange={(e) => setName(e.target.value)} />
        <label htmlFor="message">칭찬 한마디</label>
        <textarea id="message" value={message} maxLength={500} required rows={3}
          placeholder="예: 회의 자료 정리해 줘서 고마워요!"
          onChange={(e) => setMessage(e.target.value)} />
        <div className="form-footer">
          <span className={`status ${formStatus.error ? 'error' : ''}`} role="status">{formStatus.text}</span>
          <span className="count">{message.length}/500</span>
          <button type="submit" disabled={saving}>{saving ? '저장 중…' : '칭찬 남기기'}</button>
        </div>
      </form>

      <section className="list">
        <div className="list-header">
          <h2>도착한 칭찬</h2>
          <button type="button" className="ghost" onClick={loadEntries}>새로고침</button>
        </div>
        <p className={`status ${listStatus.error ? 'error' : ''}`}>{listStatus.text}</p>
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="bubble-row">
              <div className="meta">
                <strong>{entry.name}</strong>
                <time dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString('ko-KR')}
                </time>
              </div>
              <p className="bubble">{entry.message}</p>
            </li>
          ))}
        </ul>
      </section>

      {installPrompt.mode && (
        <div className="install-backdrop">
          <div className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title">
            <img src="/icons/icon-192.png" alt="" width="64" height="64" />
            <h2 id="install-title">칭찬 릴레이를 앱으로 등록할까요?</h2>
            {installPrompt.mode === 'prompt' ? (
              <p>홈 화면에 아이콘이 생기고, 앱처럼 바로 열 수 있어요. 새 칭찬 알림도 받을 수 있어요.</p>
            ) : (
              <p>Safari 아래쪽의 <strong>공유</strong> 버튼을 누르고 <strong>홈 화면에 추가</strong>를 고르면 앱으로 등록돼요.</p>
            )}
            <div className="install-actions">
              <button type="button" className="ghost" onClick={installPrompt.close}>
                {installPrompt.mode === 'prompt' ? '나중에' : '닫기'}
              </button>
              {installPrompt.mode === 'prompt' && (
                <button type="button" onClick={installPrompt.install} autoFocus>예, 등록할게요</button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
