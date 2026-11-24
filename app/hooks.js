'use client';
import { useEffect, useRef, useState } from 'react';

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

export function Board({ rows, start = 0 }) {
  return (
    <ol className="board">
      {rows.map((r, i) => (
        <li key={i} style={{ animationDelay: `${i * 70}ms` }}><span className="rank">{start + i + 1}</span><span className="nm">{r.name}</span><b>{r.score}</b></li>
      ))}
    </ol>
  );
}

export function TimerBar({ ms }) {
  const [d] = useState(ms);
  return <div className="tbar" aria-hidden="true"><i style={{ animationDuration: `${d}ms` }} /></div>;
}

export function Podium({ rows }) {
  const order = [1, 0, 2].filter((i) => rows[i]);
  return (
    <div className="podium">
      {order.map((i) => (
        <div key={i} className={`step s${i}`} style={{ animationDelay: `${(2 - i) * 0.7}s` }}>
          <div className="who">{i === 0 ? '👑 ' : ''}{rows[i].name}</div>
          <div className="pts">{rows[i].score}</div>
          <div className="bar">{i + 1}</div>
        </div>
      ))}
    </div>
  );
}

export function Confetti({ burst = 1, count = 160 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = ref.current, ctx = cv.getContext('2d');
    const W = (cv.width = innerWidth), H = (cv.height = innerHeight);
    const cols = ['#e2394b', '#2a6fdb', '#e9a800', '#1f9d62', '#a855f7', '#ffffff'];
    const ps = Array.from({ length: count }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.4,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4,
      s: 6 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    }));
    let raf; const t0 = performance.now();
    const loop = (t) => {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore();
      });
      if (t - t0 < 4500) raf = requestAnimationFrame(loop); else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [burst, count]);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
