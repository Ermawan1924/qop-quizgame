'use client';
import { useEffect, useState } from 'react';
import { api, usePoll, SHAPES, Board, Podium, Confetti, TimerBar } from '../hooks';

export default function Play() {
  const [ids, setIds] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setIds({ pin: p.get('pin'), id: p.get('id') });
  }, []);
  const [v, err] = usePoll(ids ? `/api/game?pin=${ids.pin}&id=${ids.id}` : null);
  const [picked, setPicked] = useState(null);
  useEffect(() => { setPicked(null); }, [v?.qIndex]);

  if (err) return <main className="center"><p className="err">{err}</p><a className="btn" href="/">Back to join</a></main>;
  if (!v) return <main className="center"><p className="muted">Connecting…</p></main>;
  if (v.unknown) return <main className="center"><p className="err">You are not in this game.</p><a className="btn" href="/">Back to join</a></main>;

  async function answer(i) {
    setPicked(i);
    try { await api({ action: 'answer', pin: ids.pin, id: ids.id, choice: i }); } catch {}
  }

  if (v.state === 'lobby')
    return <main className="center"><h2>You’re in!</h2><p className="muted">Waiting for the host to start. {v.count} joined.</p></main>;

  const me = v.me;
  if (v.phase === 'question') {
    const done = picked !== null || me?.answered;
    return (
      <main className="stack">
        <div className="top"><span>{v.qIndex + 1} / {v.total}</span><span className="timer">{Math.ceil(v.left / 1000)}</span></div>
        <TimerBar key={v.qIndex} ms={v.left} />
        <h2 className="q">{v.q.text}</h2>
        {done ? (
          <div className="center grow"><div className={`pick c${picked ?? me?.choice}`}>{SHAPES[picked ?? me?.choice]}</div><h2>Answer locked in</h2><p className="muted">Waiting for the others…</p></div>
        ) : (
          <div className="opts phone">
            {v.q.options.map((o, i) => (
              <button key={i} className={`opt c${i}`} onClick={() => answer(i)}><span>{SHAPES[i]}</span> {o}</button>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (v.phase === 'results')
    return (
      <main className={`center ${me?.correct ? 'good' : 'bad'}`}>
        {me?.correct && <Confetti count={70} />}
        <h1 className="pop">{me?.answered ? (me.correct ? 'Correct' : 'Not this time') : 'No answer'}</h1>
        <p>{v.q.text}</p>
        <p><b>Answer: {SHAPES[v.correct]} {v.q.options[v.correct]}</b></p>
        {me?.correct && <p className="big">+{me.gained}</p>}
        <p>{me?.score} points · rank {me?.rank} of {v.count}</p>
      </main>
    );

  return (
    <main className="center">
      <Confetti count={me?.rank <= 3 ? 200 : 80} />
      <h1 className="pop">{me?.rank === 1 ? 'You won!' : me?.rank <= 3 ? 'Top 3!' : 'Game over'}</h1>
      <p className="big pop">#{me?.rank}</p>
      <p className="muted">{me?.name}, {me?.score} points</p>
      <Podium rows={v.board} />
    </main>
  );
}
