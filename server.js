const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({ limit: '10kb' }));

const publicDirectory = path.join(__dirname, 'public');
app.use(express.static(publicDirectory));

const questions = [
  { id: 1, question: 'What is the capital of India?', options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], answer: 'New Delhi' },
  { id: 2, question: 'Which protocol is stateless by design?', options: ['HTTP', 'FTP', 'SMTP', 'SSH'], answer: 'HTTP' },
  { id: 3, question: 'What is the result of 12 × 8?', options: ['84', '92', '96', '108'], answer: '96' },
  { id: 4, question: 'Which data structure follows the first-in, first-out principle?', options: ['Stack', 'Queue', 'Tree', 'Graph'], answer: 'Queue' },
  { id: 5, question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Mercury'], answer: 'Mars' }
];

app.get('/api/questions', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const sanitized = questions.map(({ answer, ...rest }) => rest);
  res.json(sanitized);
});

app.post('/api/submit', (req, res) => {
  const userAnswers = req.body && req.body.answers;
  if (!userAnswers || typeof userAnswers !== 'object' || Array.isArray(userAnswers)) {
    return res.status(400).json({ error: 'Submit answers as an object keyed by question ID.' });
  }

  const questionById = new Map(questions.map((question) => [String(question.id), question]));
  for (const [questionId, answer] of Object.entries(userAnswers)) {
    const question = questionById.get(questionId);
    if (!question || typeof answer !== 'string' || !question.options.includes(answer)) {
      return res.status(400).json({ error: 'One or more submitted answers are invalid.' });
    }
  }

  let score = 0;
  questions.forEach(q => {
    if (userAnswers[q.id] === q.answer) score += 1;
  });
  res.set('Cache-Control', 'no-store');
  res.json({ total: questions.length, score, percentage: Math.round((score / questions.length) * 100) });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  app.listen(3000, () => console.log('Exam server running on port 3000'));
}

module.exports = app;