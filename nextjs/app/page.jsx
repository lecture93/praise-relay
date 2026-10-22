'use client';

import { useEffect, useState } from 'react';

export default function Home() {
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
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormStatus({ text: '저장하는 중…', error: false });
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    </main>
  );
}
