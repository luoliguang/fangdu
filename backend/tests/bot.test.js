const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const { BotService, DEEPSEEK_URL, DEFAULT_QUOTE_POLICY } = require('../services/BotService');
const createBotConfigRoutes = require('../routes/botConfigRoutes');
const createBotChatRoutes = require('../routes/botChatRoutes');

async function setup(t, fetchImpl) {
  const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const repository = db.define('SiteConfig', { key: { type: DataTypes.STRING, unique: true }, value: DataTypes.TEXT });
  await db.sync();
  const calls = [];
  const fake = fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: ' 你好呀 ' } }] }) }));
  const service = new BotService(repository, { fetchImpl: async (url, init) => { calls.push({ url, init }); return fake(url, init); } });
  process.env.JWT_SECRET = 'bot-isolated-test-secret';
  const app = express();
  app.use(express.json());
  app.use('/api/v1/bot-config', createBotConfigRoutes(service));
  app.use('/api/v1/bot', createBotChatRoutes(service));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await db.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const adminHeaders = { Authorization: `Bearer ${jwt.sign({ role: 'admin' }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' };
  return { service, repository, calls, url, adminHeaders };
}

const enabledInput = (extra = {}) => ({ enabled: true, apiKey: 'sk-secret-key', ...extra });

test('getPublic and save never expose the api key', async t => {
  const { service, repository } = await setup(t);
  const saved = await service.save(enabledInput());
  assert.equal(saved.hasApiKey, true);
  assert.equal(saved.configured, true);
  assert.ok(!('apiKey' in saved));
  assert.ok(!JSON.stringify(await service.getPublic()).includes('sk-secret-key'));
  // masked or empty key keeps the stored value; clearApiKey removes it
  await service.save({ enabled: true, apiKey: '••••' });
  assert.equal((await service.get()).apiKey, 'sk-secret-key');
  await service.save({ enabled: false, clearApiKey: true });
  assert.equal((await service.get()).apiKey, '');
  assert.ok(await repository.findOne({ where: { key: 'chat_bot' } }));
});

test('save rejects invalid input without overwriting stored config', async t => {
  const { service } = await setup(t);
  await service.save(enabledInput());
  const bad = [
    {}, { enabled: 'yes' }, enabledInput({ model: 'gpt-4' }), enabledInput({ temperature: 3 }),
    enabledInput({ maxTokens: 0 }), enabledInput({ maxTokens: 1.5 }), enabledInput({ systemPrompt: 'x'.repeat(2001) }),
    enabledInput({ quotePolicy: 'x'.repeat(1001) }), enabledInput({ welcomeMessage: 'x'.repeat(301) }),
    enabledInput({ apiKey: 'k'.repeat(201) })
  ];
  for (const input of bad) await assert.rejects(service.save(input), { status: 400 });
  assert.equal((await service.get()).apiKey, 'sk-secret-key');
  assert.equal((await service.get()).model, 'deepseek-chat');
});

test('save rejects enabling without an api key', async t => {
  const { service } = await setup(t);
  await assert.rejects(service.save({ enabled: true }), { status: 400, message: '请先填写 API Key 再启用' });
});

test('chat returns enabled:false when disabled and does not call DeepSeek', async t => {
  const { service, calls } = await setup(t);
  assert.deepEqual(await service.chat({ message: 'hi' }), { enabled: false, reply: null });
  await service.save({ enabled: false, apiKey: 'sk-secret-key' });
  assert.deepEqual(await service.chat({ message: 'hi' }), { enabled: false, reply: null });
  assert.equal(calls.length, 0);
});

test('chat sends the expected DeepSeek request with quote policy in the system message', async t => {
  const { service, calls } = await setup(t);
  await service.save(enabledInput({ temperature: 0.3, maxTokens: 200 }));
  const history = [{ role: 'user', content: '你好' }, { role: 'assistant', content: '嗨' }];
  const result = await service.chat({ userId: 'u1', message: '  多少钱？ ', history });
  assert.deepEqual(result, { enabled: true, reply: '你好呀' });
  const { url, init } = calls[0];
  assert.equal(url, DEEPSEEK_URL);
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer sk-secret-key');
  const body = JSON.parse(init.body);
  assert.equal(body.model, 'deepseek-chat');
  assert.equal(body.temperature, 0.3);
  assert.equal(body.max_tokens, 200);
  assert.equal(body.stream, false);
  assert.equal(body.messages[0].role, 'system');
  assert.ok(body.messages[0].content.includes(DEFAULT_QUOTE_POLICY));
  assert.deepEqual(body.messages.slice(1), [...history, { role: 'user', content: '多少钱？' }]);
});

test('chat validates message and history', async t => {
  const { service, calls } = await setup(t);
  await service.save(enabledInput());
  const many = Array.from({ length: 21 }, () => ({ role: 'user', content: 'a' }));
  for (const input of [
    { message: '' }, { message: '   ' }, { message: 5 }, { message: 'x'.repeat(1001) },
    { message: 'hi', history: 'nope' }, { message: 'hi', history: many },
    { message: 'hi', history: [{ role: 'system', content: 'x' }] },
    { message: 'hi', history: [{ role: 'user', content: 'x'.repeat(2001) }] }
  ]) await assert.rejects(service.chat(input), { status: 400 });
  assert.equal(calls.length, 0);
});

test('chat maps DeepSeek errors to friendly messages without leaking the key', async t => {
  const original = console.error;
  console.error = () => {};
  t.after(() => { console.error = original; });
  const cases = [
    [401, 502, 'API Key 无效，请在后台机器人配置里检查'],
    [402, 502, 'DeepSeek 账户余额不足'],
    [429, 429, 'AI 请求过于频繁，请稍后再试'],
    [500, 502, 'AI 服务暂时不可用，请稍后再试']
  ];
  for (const [upstream, status, message] of cases) {
    const { service } = await setup(t, async () => ({ ok: false, status: upstream, json: async () => ({}) }));
    await service.save(enabledInput());
    await assert.rejects(service.chat({ message: 'hi' }), error => {
      assert.equal(error.status, status);
      assert.equal(error.message, message);
      assert.ok(!error.message.includes('sk-secret-key'));
      return true;
    });
  }
  const { service } = await setup(t, async () => { throw Object.assign(new Error('aborted'), { name: 'TimeoutError' }); });
  await service.save(enabledInput());
  await assert.rejects(service.chat({ message: 'hi' }), { status: 502, message: 'AI 响应超时，请稍后再试' });
});

test('test() uses draft overrides and requires an api key', async t => {
  const { service, calls } = await setup(t);
  await assert.rejects(service.test({}), { status: 400, message: '请先填写 API Key' });
  const result = await service.test({ apiKey: 'sk-draft', model: 'deepseek-reasoner', temperature: 1 });
  assert.deepEqual(result, { reply: '你好呀' });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer sk-draft');
  assert.equal(JSON.parse(calls[0].init.body).model, 'deepseek-reasoner');
  assert.equal((await service.get()).apiKey, '', 'draft key must not be persisted');
});

test('bot-config routes require an admin token', async t => {
  const { url, adminHeaders } = await setup(t);
  for (const [method, path] of [['GET', ''], ['PUT', ''], ['POST', '/test']]) {
    const anonymous = await fetch(`${url}/api/v1/bot-config${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
    assert.ok([401, 403].includes(anonymous.status), `${method} anonymous`);
    const user = await fetch(`${url}/api/v1/bot-config${path}`, {
      method,
      headers: { Authorization: `Bearer ${jwt.sign({ role: 'user' }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : '{}'
    });
    assert.ok([401, 403].includes(user.status), `${method} user`);
  }
  const ok = await fetch(`${url}/api/v1/bot-config`, { headers: adminHeaders });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  const body = await ok.json();
  assert.equal(body.success, true);
  assert.equal(body.data.hasApiKey, false);
});

test('public bot routes report status and fall back when AI is disabled', async t => {
  const { url, adminHeaders } = await setup(t);
  const chat = await fetch(`${url}/api/v1/bot/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'hi', userId: 'u1', history: [] }) });
  assert.equal(chat.status, 200);
  const chatBody = await chat.json();
  assert.equal(chatBody.success, true);
  assert.equal(chatBody.data.ai, false);

  let status = (await (await fetch(`${url}/api/v1/bot/status`)).json()).data;
  assert.equal(status.aiEnabled, false);
  assert.ok(status.welcomeMessage);

  const saved = await fetch(`${url}/api/v1/bot-config`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify(enabledInput()) });
  assert.equal(saved.status, 200);
  assert.ok(!JSON.stringify(await saved.json()).includes('sk-secret-key'));
  status = (await (await fetch(`${url}/api/v1/bot/status`)).json()).data;
  assert.equal(status.aiEnabled, true);
  assert.ok(!('apiKey' in status));

  const ai = await (await fetch(`${url}/api/v1/bot/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'hi' }) })).json();
  assert.deepEqual(ai, { success: true, data: { ai: true, reply: '你好呀' } });
  const invalid = await fetch(`${url}/api/v1/bot/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '' }) });
  assert.equal(invalid.status, 400);
});
