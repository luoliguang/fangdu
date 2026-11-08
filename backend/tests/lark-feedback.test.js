const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Sequelize, DataTypes } = require('sequelize');
const { LarkNotifyService, normalizeWebhookUrl } = require('../services/LarkNotifyService');
const createLarkRoutes = require('../routes/larkConfigRoutes');
const { createFeedbackGuard } = require('../middleware/feedbackGuard');

const HOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/abcdef12-3456-7890';
const UID = '12345678-1234-4234-8234-123456789abc';

async function setup(t, fetchImpl) {
  const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const repository = db.define('SiteConfig', { key: { type: DataTypes.STRING, unique: true }, value: DataTypes.TEXT });
  await db.sync();
  const calls = [];
  const service = new LarkNotifyService(repository, {
    fetchImpl: fetchImpl || (async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ code: 0 }) }; })
  });
  process.env.JWT_SECRET = 'lark-isolated-test-secret';
  const app = express();
  app.use(express.json());
  app.use('/lark', createLarkRoutes(service));
  const server = await new Promise(r => { const l = app.listen(0, '127.0.0.1', () => r(l)); });
  t.after(async () => { await new Promise(r => server.close(r)); await db.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const auth = role => ({ Authorization: `Bearer ${jwt.sign({ role }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' });
  return { service, url, auth, calls };
}

test('webhook 地址只允许飞书官方域名', () => {
  assert.equal(normalizeWebhookUrl(HOOK + '?x=1'), HOOK);
  for (const bad of ['http://open.feishu.cn/open-apis/bot/v2/hook/abcdef12', 'https://evil.com/open-apis/bot/v2/hook/abcdef12',
    'https://open.feishu.cn.evil.com/open-apis/bot/v2/hook/abcdef12', 'https://127.0.0.1/open-apis/bot/v2/hook/abcdef12',
    'https://open.feishu.cn:8443/open-apis/bot/v2/hook/abcdef12', 'https://open.feishu.cn/other/abcdef12', 'nonsense']) {
    assert.throws(() => normalizeWebhookUrl(bad), /Webhook/, bad);
  }
});

test('配置接口仅管理员可用，且不回传完整地址和密钥', async t => {
  const { url, auth } = await setup(t);
  assert.equal((await fetch(`${url}/lark`)).status, 401);
  assert.equal((await fetch(`${url}/lark`, { headers: auth('user') })).status, 403);
  const saved = await fetch(`${url}/lark`, { method: 'PUT', headers: auth('admin'), body: JSON.stringify({ enabled: true, webhookUrl: HOOK, secret: 'topsecret' }) });
  assert.equal(saved.status, 200);
  const text = await (await fetch(`${url}/lark`, { headers: auth('admin') })).text();
  assert.ok(!text.includes('abcdef12-3456-7890') && !text.includes('topsecret'));
  const data = JSON.parse(text).data;
  assert.equal(data.configured, true); assert.equal(data.hasSecret, true);
});

test('保存时留空保持原值；未配置地址不能启用', async t => {
  const { url, auth, service } = await setup(t);
  const put = body => fetch(`${url}/lark`, { method: 'PUT', headers: auth('admin'), body: JSON.stringify(body) });
  assert.equal((await put({ enabled: true })).status, 400);
  await put({ enabled: false, webhookUrl: HOOK, secret: 's1' });
  await put({ enabled: true });
  const cfg = await service.get();
  assert.equal(cfg.webhookUrl, HOOK); assert.equal(cfg.secret, 's1'); assert.equal(cfg.enabled, true);
  assert.equal((await put({ enabled: true, webhookUrl: 'https://evil.com/x' })).status, 400);
});

test('测试消息带正确签名，飞书报错时给出友好提示', async t => {
  const { url, auth, calls } = await setup(t);
  const res = await fetch(`${url}/lark/test`, { method: 'POST', headers: auth('admin'), body: JSON.stringify({ webhookUrl: HOOK, secret: 'k' }) });
  assert.equal(res.status, 200);
  const { body } = calls[0];
  const expected = crypto.createHmac('sha256', `${body.timestamp}\nk`).update('').digest('base64');
  assert.equal(body.sign, expected);

  const failing = await setup(t, async () => ({ ok: true, json: async () => ({ code: 19021, msg: 'sign match fail' }) }));
  const bad = await fetch(`${failing.url}/lark/test`, { method: 'POST', headers: failing.auth('admin'), body: JSON.stringify({ webhookUrl: HOOK }) });
  assert.equal(bad.status, 502);
  assert.match((await bad.json()).message, /签名/);
});

test('飞书推送失败或超限都不抛错，且有节流', async t => {
  const { service, calls } = await setup(t);
  await service.repository.upsert({ key: 'lark_webhook', value: JSON.stringify({ enabled: true, webhookUrl: HOOK, secret: '' }) });
  for (let i = 0; i < 25; i++) await service.notifyFeedback({ id: i, message: '【想要新素材】来点蕾丝', user_id: UID });
  assert.equal(calls.length, 20);
  const broken = await setup(t, async () => { throw new Error('network down'); });
  await broken.service.repository.upsert({ key: 'lark_webhook', value: JSON.stringify({ enabled: true, webhookUrl: HOOK, secret: '' }) });
  await assert.doesNotReject(broken.service.notifyFeedback({ id: 1, message: 'hi', user_id: null }));
});

async function guardApp(t, nowRef, options = {}) {
  const app = express();
  app.use(express.json());
  app.post('/f', ...createFeedbackGuard({ now: () => nowRef.t, ...options }), (req, res) => res.status(201).json({ success: true }));
  const server = await new Promise(r => { const l = app.listen(0, '127.0.0.1', () => r(l)); });
  t.after(() => new Promise(r => server.close(r)));
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/f`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return post;
}

test('留言防刷：校验、冷却、重复内容', async t => {
  const now = { t: 1_000_000 };
  const post = await guardApp(t, now, { burstLimit: 100 }); // 放宽 IP 突发限制，单独测校验与冷却逻辑
  assert.equal((await post({ message: 123 })).status, 400);
  assert.equal((await post({ message: '   ' })).status, 400);
  assert.equal((await post({ message: '!!!???' })).status, 400);
  assert.equal((await post({ message: 'aaaaaaaaaaaa' })).status, 400);
  assert.equal((await post({ message: 'hello', user_id: 'not-a-uuid' })).status, 400);
  assert.equal((await post({ message: 'x'.repeat(1001) })).status, 400);
  assert.equal((await post({ message: '想要蕾丝面料', user_id: UID })).status, 201);
  assert.equal((await post({ message: '另一条留言', user_id: UID })).status, 429); // 冷却
  now.t += 11_000;
  assert.equal((await post({ message: '想要蕾丝面料', user_id: UID })).status, 429); // 重复
  assert.equal((await post({ message: '换个内容', user_id: UID })).status, 201);
});

test('留言防刷：同 IP 每分钟最多 5 条', async t => {
  const now = { t: 1_000_000 };
  const post = await guardApp(t, now);
  const codes = [];
  for (let i = 0; i < 7; i++) { now.t += 11_000; codes.push((await post({ message: `第${i}条不同的留言`, user_id: UID })).status); }
  assert.deepEqual(codes, [201, 201, 201, 201, 201, 429, 429]);
});
