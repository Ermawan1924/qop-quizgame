'use client';
import { useEffect, useState } from 'react';

export const SHAPES = ['▲', '◆', '●', '■'];

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => {
      const d = await r.json();
      if (!r.ok) { const e = new Error(d.error || 'Something went wrong'); e.status = r.status; throw e; }
      return d;
    });
export const getKey = () => (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('qr-key')) || '';
export const api = (body) => post('/api/game', body);
export const adm = (body) => post('/api/admin', { ...body, key: getKey() });

export function usePoll(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!url) return;
    let on = true;
    const tick = async () => {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        const j = await r.json();
        if (!on) return;
        if (r.ok) { setData(j); setError(null); } else setError(j.error);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => { on = false; clearInterval(t); };
  }, [url]);
  return [data, error];
}

export function Board({ rows }) {
  return (
    <ol className="board">
      {rows.map((r, i) => (
        <li key={i}><span className="rank">{i + 1}</span><span className="nm">{r.name}</span><b>{r.score}</b></li>
      ))}
    </ol>
  );
}
