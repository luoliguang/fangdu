const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const { createHash } = require('node:crypto');
const MigrationService = require('../services/MigrationService');
const FeedbackService = require('../services/FeedbackService');
const createFeedbackRoutes = require('../routes/feedbackRoutes');
const createBotChatRoutes = require('../routes/botChatRoutes');
const lark = require('../services/LarkNotifyService');

function run(db, sql) {
  return new Promise((resolve, reject) => db.run(sql, error => error ? reject(error) : resolve()));
}
function get(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
}

test('an explicit photo request notifies once and an admin reply reaches the same user', async t => {
  const db = new sqlite3.Database(':memory:');
  t.after(() => new Promise(resolve => db.close(resolve)));
  // 模拟已有真实留言的旧业务库，再运行正式迁移；历史记录必须保留。
  await run(db, 'CREATE TABLE feedbacks (id INTEGER PRIMARY KEY, message TEXT, status TEXT, user_id TEXT, created_at TEXT)');
  await run(db, "INSERT INTO feedbacks (message, status, created_at) VALUES ('旧留言', 'pending', CURRENT_TIMESTAMP)");
  const migrations = new MigrationService(db);
  await migrations.run();
  await migrations.run();
  assert.equal((await get(db, 'SELECT message FROM feedbacks WHERE id = 1')).message, '旧留言');
  const notices = [];
  const original = lark.getShared;
  lark.getShared = () => ({ notifyFeedback: item => { notices.push(item); } });
  t.after(() => { lark.getShared = original; });
  process.env.JWT_SECRET = 'isolated-photo-feedback-secret';
  const app = express();
  app.use(express.json());
  app.use('/api/v1/bot', createBotChatRoutes({ get: async () => ({ enabled: false }) }, { feedbackService: new FeedbackService(db) }));
  app.use('/api/v1/feedbacks', createFeedbackRoutes(db));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const userId = randomUUID();
  const submit = await fetch(`${base}/bot/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '【没找到想要的】试过蓝色、条纹，希望找蓝色条纹实拍图', user_id: userId })
  });
  assert.equal(submit.status, 201);
  const saved = (await submit.json()).data;
  const id = saved.id;
  const code = saved.accessCode;
  assert.match(code, /^[A-Za-z0-9_-]{32}$/);
  const stored = await get(db, 'SELECT access_token_hash FROM feedbacks WHERE id = ?', [id]);
  assert.equal(stored.access_token_hash, createHash('sha256').update(code).digest('hex'));
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, id);
  assert.ok(!JSON.stringify(notices[0]).includes(code));
  const lookupUrl = `${base}/bot/request/lookup`;
  const lookup = accessCode => fetch(lookupUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode }) });
  assert.equal((await lookup(code)).status, 200);
  assert.equal((await lookup('x'.repeat(32))).status, 404);
  assert.equal((await lookup(String(id))).status, 404);
  const replyUrl = `${base}/feedbacks/${id}/reply`;
  const unauthorized = await fetch(replyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminReply: '找到了，请搜索：蓝色条纹' }) });
  assert.equal(unauthorized.status, 401);
  const adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
  const replied = await fetch(replyUrl, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ adminReply: '找到了，请搜索：蓝色条纹' }) });
  assert.equal(replied.status, 200);
  const own = await (await fetch(`${base}/feedbacks/user/${userId}`)).json();
  assert.equal(own.data[0].admin_reply, '找到了，请搜索：蓝色条纹');
  assert.ok(!JSON.stringify(own).includes('access_token_hash'));
  const crossDevice = await (await lookup(code)).json();
  assert.equal(crossDevice.data.admin_reply, '找到了，请搜索：蓝色条纹');
  assert.ok(!JSON.stringify(crossDevice).includes(code));
  assert.equal(own.data[0].status, 'replied');
  const other = await (await fetch(`${base}/feedbacks/user/${randomUUID()}`)).json();
  assert.deepEqual(other.data, []);
  assert.equal(notices.length, 1, 'admin replying must not send another Feishu notification');
});
