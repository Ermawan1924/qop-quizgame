'use client';
import { useEffect, useState } from 'react';
import { adm, api, getKey } from '../hooks';

const newQ = () => ({ q: '', options: ['', '', '', ''], correct: 0, time: 20 });
const TIMES = [10, 15, 20, 30, 45, 60, 90];

export default function Admin() {
  const [list, setList] = useState(null);
  const [needPw, setNeedPw] = useState(false);
  const [pw, setPw] = useState('');
  const [draft, setDraft] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    try { const d = await adm({ action: 'list' }); setList(d.quizzes); setNeedPw(false); setErr(''); }
    catch (x) { if (x.status === 401) { setNeedPw(true); if (getKey()) setErr('Wrong password.'); } else setErr(x.message); }
  }
  useEffect(() => { load(); }, []);

  async function host(id) {
    try {
      const g = await api({ action: 'create', quizId: id, adminKey: getKey() });
      sessionStorage.setItem('qr-game', JSON.stringify(g));
      location.href = '/host';
    } catch (x) { setErr(x.message); }
  }
  async function remove(z) {
    if (!confirm(`Delete “${z.quiz.title}”?`)) return;
    try { await adm({ action: 'delete', id: z.id }); load(); } catch (x) { setErr(x.message); }
  }
  async function save(thenHost) {
    const qz = draft.quiz;
    if (!qz.title.trim()) return setErr('Give the quiz a title.');
    for (const [i, q] of qz.questions.entries()) {
      if (!q.q.trim()) return setErr(`Question ${i + 1} has no text.`);
      if (q.options.some((o) => !o.trim())) return setErr(`Question ${i + 1} has an empty answer. Fill it in or remove it.`);
    }
    try {
      const { id } = await adm({ action: 'save', id: draft.id, quiz: qz });
      setErr('');
      if (thenHost) return host(id);
      setDraft(null); load();
    } catch (x) { setErr(x.message); }
  }

  if (needPw)
    return (
      <main className="center">
        <h1>Admin</h1>
        <form className="panel" onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem('qr-key', pw); load(); }}>
          <input type="password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={!pw}>Sign in</button>
        </form>
      </main>
    );

  if (draft) {
    const qz = draft.quiz;
    const mut = (fn) => setDraft((d) => { const c = structuredClone(d); fn(c.quiz); return c; });
    return (
      <main className="wide stack">
        <div className="top"><h1>{draft.id ? 'Edit quiz' : 'New quiz'}</h1>
          <button className="btn alt sm" onClick={() => { setDraft(null); setErr(''); }}>Cancel</button></div>
        <input placeholder="Quiz title" maxLength={80} value={qz.title} onChange={(e) => mut((z) => { z.title = e.target.value; })} />
        {qz.questions.map((q, i) => (
          <section className="qcard" key={i}>
            <div className="top"><b>Question {i + 1}</b>
              <span className="row">
                <button className="btn sm alt" disabled={i === 0} onClick={() => mut((z) => { [z.questions[i - 1], z.questions[i]] = [z.questions[i], z.questions[i - 1]]; })}>Move up</button>
                <button className="btn sm alt" disabled={i === qz.questions.length - 1} onClick={() => mut((z) => { [z.questions[i + 1], z.questions[i]] = [z.questions[i], z.questions[i + 1]]; })}>Move down</button>
                <button className="btn sm alt" disabled={qz.questions.length === 1} onClick={() => mut((z) => { z.questions.splice(i, 1); })}>Remove</button>
              </span></div>
            <input placeholder="Question text" maxLength={200} value={q.q} onChange={(e) => mut((z) => { z.questions[i].q = e.target.value; })} />
            <p className="muted">Select the circle next to the correct answer.</p>
            {q.options.map((o, k) => (
              <div className="row" key={k}>
                <input type="radio" name={`c${i}`} checked={q.correct === k} aria-label={`Answer ${k + 1} is correct`} onChange={() => mut((z) => { z.questions[i].correct = k; })} />
                <input className={`ans b${k}`} placeholder={`Answer ${k + 1}`} maxLength={100} value={o} onChange={(e) => mut((z) => { z.questions[i].options[k] = e.target.value; })} />
                {q.options.length > 2 && (
                  <button className="btn sm alt" aria-label={`Remove answer ${k + 1}`} onClick={() => mut((z) => {
                    const zq = z.questions[i]; zq.options.splice(k, 1);
                    if (zq.correct === k) zq.correct = 0; else if (zq.correct > k) zq.correct -= 1;
                  })}>✕</button>
                )}
              </div>
            ))}
            <div className="row">
              {q.options.length < 4 && <button className="btn sm alt" onClick={() => mut((z) => { z.questions[i].options.push(''); })}>Add answer</button>}
              <label className="row">Time
                <select value={q.time} onChange={(e) => mut((z) => { z.questions[i].time = Number(e.target.value); })}>
                  {[...new Set([...TIMES, q.time])].sort((a, b) => a - b).map((t) => <option key={t} value={t}>{t} seconds</option>)}
                </select>
              </label>
            </div>
          </section>
        ))}
        {qz.questions.length < 60 && <button className="btn alt" onClick={() => mut((z) => { z.questions.push(newQ()); })}>Add question</button>}
        {err && <p className="err">{err}</p>}
        <div className="row"><button className="btn" onClick={() => save(false)}>Save quiz</button>
          <button className="btn alt" onClick={() => save(true)}>Save and host</button></div>
      </main>
    );
  }

  return (
    <main className="wide stack">
      <div className="top"><h1>Quizzes</h1>
        <span className="row"><a className="btn alt sm" href="/host">Host screen</a>
          <button className="btn" onClick={() => setDraft({ quiz: { title: '', questions: [newQ()] } })}>New quiz</button></span></div>
      {err && <p className="err">{err}</p>}
      {!list && <p className="muted">Loading…</p>}
      <div className="list">
        {(list || []).map((z) => (
          <div key={z.id} className="item">
            <div><b>{z.quiz.title}</b><p className="muted">{z.quiz.questions.length} questions</p></div>
            <span className="row">
              <button className="btn sm" onClick={() => host(z.id)}>Host</button>
              <button className="btn sm alt" onClick={() => setDraft({ id: z.id, quiz: structuredClone(z.quiz) })}>Edit</button>
              <button className="btn sm alt" onClick={() => setDraft({ quiz: { ...structuredClone(z.quiz), title: z.quiz.title + ' (copy)' } })}>Duplicate</button>
              <button className="btn sm alt" onClick={() => remove(z)}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
