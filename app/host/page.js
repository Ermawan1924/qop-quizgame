'use client';
import { useEffect, useState } from 'react';
import { api, adm, getKey, usePoll, SHAPES, Board } from '../hooks';

export default function Host() {
  const [game, setGame] = useState(null);
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    try { const g = JSON.parse(sessionStorage.getItem('qr-game')); if (g) { setGame(g); return; } } catch {}
    adm({ action: 'list' }).then((d) => setList(d.quizzes)).catch((x) => (x.status === 401 ? (location.href = '/admin') : setErr(x.message)));
  }, []);

  async function create(quizId) {
    setErr('');
    try {
      const g = await api({ action: 'create', quizId, adminKey: getKey() });
      sessionStorage.setItem('qr-game', JSON.stringify(g));
      setGame(g);
    } catch (x) { setErr(x.message); }
  }

  const [v] = usePoll(game ? `/api/game?pin=${game.pin}&token=${game.token}` : null);
  const act = (action) => api({ action, pin: game.pin, token: game.token }).catch((x) => setErr(x.message));

  if (!game)
    return (
      <main className="wide stack">
        <div className="top"><h1>Pick a quiz to host</h1><a className="btn alt sm" href="/admin">Manage quizzes</a></div>
        {err && <p className="err">{err}</p>}
        {list && !list.length && <p className="muted">No quizzes yet. Create one in Manage quizzes.</p>}
        <div className="list">
          {(list || []).map((z) => (
            <div key={z.id} className="item">
              <div><b>{z.quiz.title}</b><p className="muted">{z.quiz.questions.length} questions</p></div>
              <button className="btn" onClick={() => create(z.id)}>Host</button>
            </div>
          ))}
        </div>
      </main>
    );

  if (!v) return <main className="center"><p className="muted">Loading…</p></main>;

  if (v.state === 'lobby')
    return (
      <main className="wide center">
        <p className="muted">Join at <b>{typeof location !== 'undefined' ? location.host : ''}</b> with PIN</p>
        <div className="pin">{game.pin}</div>
        <p>{v.count} {v.count === 1 ? 'player' : 'players'} joined</p>
        <div className="chips">{v.players.map((n, i) => <span key={i}>{n}</span>)}</div>
        <button className="btn" disabled={!v.count} onClick={() => act('next')}>Start quiz</button>
      </main>
    );

  if (v.phase === 'final')
    return (
      <main className="wide center">
        <h1>Final results</h1>
        <Board rows={v.board} />
        <button className="btn" onClick={() => { sessionStorage.removeItem('qr-game'); location.href = '/host'; }}>New game</button>
      </main>
    );

  const last = v.qIndex + 1 >= v.total;
  return (
    <main className="wide stack">
      <div className="top"><span>{v.qIndex + 1} / {v.total}</span><span>{v.answered} / {v.count} answered</span>
        {v.phase === 'question' && <span className="timer">{Math.ceil(v.left / 1000)}</span>}</div>
      <h1 className="q">{v.q.text}</h1>
      <div className="opts">
        {v.q.options.map((o, i) => (
          <div key={i} className={`opt c${i} ${v.phase === 'results' && v.correct !== i ? 'dim' : ''}`}>
            <span>{SHAPES[i]}</span> {o}
            {v.phase === 'results' && <b className="cnt">{v.counts[i]}</b>}
          </div>
        ))}
      </div>
      {v.phase === 'question' && <button className="btn alt" onClick={() => act('skip')}>Skip timer</button>}
      {v.phase === 'results' && (<><Board rows={v.board} /><button className="btn" onClick={() => act('next')}>{last ? 'Show final results' : 'Next question'}</button></>)}
      {err && <p className="err">{err}</p>}
    </main>
  );
}
