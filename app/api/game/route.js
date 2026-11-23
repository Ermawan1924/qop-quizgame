import { NextResponse } from 'next/server';
import { r, TTL } from '@/lib/redis';
import { authed } from '@/lib/auth';
const J = (d, s = 200) => NextResponse.json(d, { status: s, headers: { 'Cache-Control': 'no-store' } });
const rid = () => Math.random().toString(36).slice(2, 10);
const pts = (q, a) => (a && a.c === q.correct ? Math.round(1000 * (1 - Math.min(1, a.e / (q.time * 1000)) / 2)) : 0);

async function view(pin, id, token) {
  const m = await r.get('g:' + pin);
  if (!m) return null;
  const pl = (await r.hgetall('p:' + pin)) || {};
  const ids = Object.keys(pl);
  const host = !!token && token === m.token;
  const qs = m.quiz.questions;
  const v = { state: m.state, title: m.quiz.title, total: qs.length, qIndex: m.qIndex, count: ids.length };
  if (host) v.players = ids.map((i) => String(pl[i]));
  if (id && !(id in pl)) v.unknown = true;
  if (m.state === 'lobby') return v;

  const q = qs[m.qIndex];
  const left = m.startedAt + q.time * 1000 - Date.now();
  const cur = (await r.hgetall(`a:${pin}:${m.qIndex}`)) || {};
  const answered = Object.keys(cur).length;
  let phase = m.state;
  if (phase === 'question' && (left <= 0 || (ids.length && answered >= ids.length))) phase = 'results';
  v.phase = phase;
  v.q = { text: q.q, options: q.options, time: q.time };
  v.answered = answered;
  if (phase === 'question') {
    v.left = Math.max(0, left);
  } else {
    v.correct = q.correct;
    v.counts = q.options.map(() => 0);
    Object.values(cur).forEach((a) => { if (v.counts[a.c] !== undefined) v.counts[a.c]++; });
  }
  const prev = (await r.hgetall('s:' + pin)) || {};
  const addCur = phase !== 'question' && m.fin !== m.qIndex;
  const sc = {};
  ids.forEach((i) => { sc[i] = Number(prev[i] || 0) + (addCur ? pts(q, cur[i]) : 0); });
  const sorted = [...ids].sort((a, b) => sc[b] - sc[a]);
  v.board = sorted.slice(0, phase === 'final' ? 10 : 5).map((i) => ({ name: String(pl[i]), score: sc[i] }));
  if (id && id in pl) {
    v.me = { name: String(pl[id]), score: sc[id], rank: sorted.indexOf(id) + 1, answered: !!cur[id], choice: cur[id]?.c, gained: pts(q, cur[id]), correct: cur[id]?.c === q.correct };
  }
  return v;
}

export async function GET(req) {
  const p = req.nextUrl.searchParams;
  const v = await view(p.get('pin'), p.get('id'), p.get('token'));
  return v ? J(v) : J({ error: 'Game not found' }, 404);
}

export async function POST(req) {
  const b = await req.json();
  const { action, pin } = b;

  if (action === 'create') {
    if (!authed(b.adminKey)) return J({ error: 'Admin password required.' }, 401);
    const quiz = b.quizId ? await r.hget('quizzes', String(b.quizId)) : null;
    if (!quiz) return J({ error: 'Quiz not found.' }, 404);
    let code;
    do { code = String(Math.floor(100000 + Math.random() * 900000)); } while (await r.exists('g:' + code));
    const token = rid() + rid();
    await r.set('g:' + code, { token, quiz, state: 'lobby', qIndex: -1, startedAt: 0, fin: -1 }, { ex: TTL });
    return J({ pin: code, token });
  }

  const m = await r.get('g:' + pin);
  if (!m) return J({ error: 'Game not found. Check the PIN.' }, 404);

  if (action === 'join') {
    if (m.state !== 'lobby') return J({ error: 'This game has already started.' }, 400);
    const name = String(b.name || '').trim().slice(0, 20);
    if (!name) return J({ error: 'Enter a name.' }, 400);
    const names = Object.values((await r.hgetall('p:' + pin)) || {}).map((n) => String(n).toLowerCase());
    if (names.includes(name.toLowerCase())) return J({ error: 'That name is taken. Try another.' }, 400);
    const id = rid();
    await r.hset('p:' + pin, { [id]: name });
    await r.expire('p:' + pin, TTL);
    return J({ id });
  }

  if (action === 'answer') {
    if (m.state !== 'question') return J({ error: 'No active question.' }, 400);
    const q = m.quiz.questions[m.qIndex];
    const e = Date.now() - m.startedAt;
    if (e > q.time * 1000 + 1500) return J({ error: 'Too late.' }, 400);
    if (!(await r.hexists('p:' + pin, b.id)) || !Number.isInteger(b.choice)) return J({ error: 'Invalid answer.' }, 400);
    const key = `a:${pin}:${m.qIndex}`;
    await r.hsetnx(key, b.id, { c: b.choice, e });
    await r.expire(key, TTL);
    return J({ ok: true });
  }

  if (b.token !== m.token) return J({ error: 'Not allowed.' }, 403);

  if (action === 'next') {
    if (m.state === 'question' && m.fin !== m.qIndex) {
      const q = m.quiz.questions[m.qIndex];
      const cur = (await r.hgetall(`a:${pin}:${m.qIndex}`)) || {};
      await Promise.all(Object.entries(cur).map(([k, a]) => (pts(q, a) ? r.hincrby('s:' + pin, k, pts(q, a)) : null)));
      await r.expire('s:' + pin, TTL);
      m.fin = m.qIndex;
    }
    if (m.state === 'lobby' || (m.state === 'question' && m.qIndex + 1 < m.quiz.questions.length)) {
      m.state = 'question';
      m.qIndex += 1;
      m.startedAt = Date.now();
    } else m.state = 'final';
  } else if (action === 'skip' && m.state === 'question') {
    m.startedAt = Date.now() - m.quiz.questions[m.qIndex].time * 1000 - 1;
  }
  await r.set('g:' + pin, m, { ex: TTL });
  return J({ ok: true });
}
