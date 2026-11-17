const request = require('supertest');
const app = require('../server');

describe('Online Examination API', () => {
  test('GET /api/questions returns questions without answers', async () => {
    const res = await request(app).get('/api/questions');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(5);
    expect(res.body[0].answer).toBeUndefined();
    expect(res.body[0]).toHaveProperty('options');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('POST /api/submit calculates score accurately', async () => {
    const res = await request(app)
      .post('/api/submit')
      .send({ answers: { 1: 'New Delhi', 2: 'FTP', 3: '96' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ total: 5, score: 2, percentage: 40 });
  });

  test('POST /api/submit accepts unanswered questions', async () => {
    const res = await request(app).post('/api/submit').send({ answers: {} });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ total: 5, score: 0, percentage: 0 });
  });

  test.each([
    ['missing answers', {}],
    ['answers as an array', { answers: [] }],
    ['unknown question IDs', { answers: { 99: 'Anything' } }],
    ['options not in the question', { answers: { 1: 'Delhi' } }]
  ])('POST /api/submit rejects %s', async (_description, body) => {
    const res = await request(app).post('/api/submit').send(body);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET / serves the examination app', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<title>Online Exam</title>');
  });

  test('GET /api/health reports service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});