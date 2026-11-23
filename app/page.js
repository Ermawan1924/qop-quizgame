'use client';
import { useState } from 'react';
import { api } from './hooks';

export default function Join() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { id } = await api({ action: 'join', pin, name });
      location.href = `/play?pin=${pin}&id=${id}`;
    } catch (x) { setErr(x.message); setBusy(false); }
  }

  return (
    <main className="center">
      <h1 className="logo">QuizRoom</h1>
      <form className="panel" onSubmit={join}>
        <input inputMode="numeric" maxLength={6} placeholder="Game PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        <input maxLength={20} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        {err && <p className="err">{err}</p>}
        <button className="btn" disabled={busy || pin.length < 6 || !name.trim()}>Join game</button>
      </form>
      <a className="muted" href="/host">Host a quiz</a>
    </main>
  );
}
