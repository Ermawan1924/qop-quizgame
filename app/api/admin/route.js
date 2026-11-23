import { NextResponse } from 'next/server';
import { r } from '@/lib/redis';
import { authed } from '@/lib/auth';
import { cleanQuiz } from '@/lib/quiz';

const J = (d, s = 200) => NextResponse.json(d, { status: s, headers: { 'Cache-Control': 'no-store' } });
const SAMPLE = {
  title: 'Office trivia',
  questions: [
    { q: 'Which planet is closest to the sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], correct: 1, time: 15 },
    { q: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Tech Transfer Process', 'Host Terminal Protocol'], correct: 0, time: 20 },
  ],
};

export async function POST(req) {
  const b = await req.json();
  if (!authed(b.key)) return J({ error: 'Wrong password.' }, 401);

  if (b.action === 'list') {
    let all = await r.hgetall('quizzes');
    if (!all) { await r.hset('quizzes', { sample: SAMPLE }); all = { sample: SAMPLE }; }
    const quizzes = Object.entries(all).map(([id, quiz]) => ({ id, quiz })).sort((a, c) => a.quiz.title.localeCompare(c.quiz.title));
    return J({ quizzes });
  }
  if (b.action === 'save') {
    const quiz = cleanQuiz(b.quiz);
    if (!quiz) return J({ error: 'Invalid quiz. Check the title, question text and answers.' }, 400);
    const id = b.id || Math.random().toString(36).slice(2, 10);
    await r.hset('quizzes', { [id]: quiz });
    return J({ id });
  }
  if (b.action === 'delete') {
    await r.hdel('quizzes', String(b.id));
    return J({ ok: true });
  }
  return J({ error: 'Unknown action.' }, 400);
}
