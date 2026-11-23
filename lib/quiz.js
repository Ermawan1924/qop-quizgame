export function cleanQuiz(z) {
  if (!z || !Array.isArray(z.questions) || !z.questions.length || z.questions.length > 60) return null;
  const title = String(z.title || '').trim();
  if (!title) return null;
  const questions = [];
  for (const q of z.questions) {
    if (!q || typeof q.q !== 'string' || !q.q.trim() || !Array.isArray(q.options)) return null;
    const options = q.options.map((o) => String(o).trim()).slice(0, 4);
    if (options.length < 2 || options.some((o) => !o) || !Number.isInteger(q.correct) || q.correct < 0 || q.correct >= options.length) return null;
    questions.push({ q: q.q.trim().slice(0, 200), options: options.map((o) => o.slice(0, 100)), correct: q.correct, time: Math.min(120, Math.max(5, Number(q.time) || 20)) });
  }
  return { title: title.slice(0, 80), questions };
}
