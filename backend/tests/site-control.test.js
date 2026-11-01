const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const { SiteControlService, defaults } = require('../services/SiteControlService');
const { createSiteControlMiddleware } = require('../middleware/siteControl');
const createRoutes = require('../routes/siteControlRoutes');

async function setup(t) {
  const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const repository = db.define('SiteConfig', { key: { type: DataTypes.STRING, unique: true }, value: DataTypes.TEXT });
  await db.sync();
  const service = new SiteControlService(repository);
  process.env.JWT_SECRET = 'site-control-isolated-test-secret';
  const app = express();
  app.use(express.json());
  app.use(createSiteControlMiddleware(service));
  app.use('/api/v1/site-control', createRoutes(service));
  app.use('/api/site-control', createRoutes(service));
  app.use((req, res) => res.json({ success: true }));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await db.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const token = role => ({ Authorization: `Bearer ${jwt.sign({ role }, process.env.JWT_SECRET)}` });
  return { service, repository, url, token };
}

test('default is open; stopping persists and leaves recovery access available', async t => {
  const { service, repository, url, token } = await setup(t);
  assert.equal((await service.get()).enabled, true);
  const config = defaults(); config.enabled = false; config.notice.enabled = true;
  const response = await fetch(`${url}/api/v1/site-control`, { method: 'PUT', headers: { ...token('admin'), 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
  assert.equal(response.status, 200);
  assert.equal((await new SiteControlService(repository).get()).enabled, false);
  for (const path of ['/api/v1/materials', '/api/materials', '/API/V1/MATERIALS', '/api/proxy/media', '/proxy/media', '/uploads/a.jpg', '/api/v1/feedbacks']) {
    const denied = await fetch(url + path);
    assert.equal(denied.status, 503, path);
    assert.equal((await denied.json()).code, 'SITE_DISABLED');
  }
  for (const path of ['/api/auth/login', '/api/v1/auth/me', '/api/v1/health', '/api/site-control']) assert.equal((await fetch(url + path)).status, 200, path);
  assert.equal((await fetch(`${url}/api/materials`, { headers: token('user') })).status, 503);
  assert.equal((await fetch(`${url}/api/materials`, { headers: token('admin') })).status, 200);
  await service.save({ ...config, enabled: true });
  assert.equal((await fetch(`${url}/api/materials`)).status, 200);
});

test('module controls block only the relevant resources and cannot be changed by visitors', async t => {
  const { service, url, token } = await setup(t);
  const config = defaults(); config.modules.materials = false; config.modules.drawer = false;
  await service.save(config);
  for (const path of ['/api/materials', '/api/v1/materials/1', '/uploads/a.jpg', '/api/proxy/media', '/api/feedbacks']) assert.equal((await fetch(url + path)).status, 503, path);
  assert.equal((await fetch(`${url}/api/drawer-config/page-categories`)).status, 200);
  for (const role of [null, 'user']) {
    const response = await fetch(`${url}/api/site-control`, { method: 'PUT', headers: { ...(role ? token(role) : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(defaults()) });
    assert.equal(response.status, role ? 403 : 401);
  }
  const data = await (await fetch(`${url}/api/site-control`)).json();
  assert.equal(data.isAdmin, false);
});

test('malformed updates are rejected without overwriting persisted configuration', async t => {
  const { service, url, token } = await setup(t);
  const initial = await service.save(defaults());
  for (const input of [{}, { ...defaults(), enabled: 'false' }, { ...defaults(), modules: {} }, { ...defaults(), notice: { enabled: true, title: '', content: 'x' } }, { ...defaults(), notice: { enabled: true, title: 'x', content: 'x'.repeat(3001) } }]) {
    const response = await fetch(`${url}/api/site-control`, { method: 'PUT', headers: { ...token('admin'), 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    assert.equal(response.status, 400);
    assert.equal((await service.get()).revision, initial.revision);
  }
});

test('unreadable configuration fails closed and control/login routes remain reachable', async t => {
  const { repository, url } = await setup(t);
  await repository.upsert({ key: 'site_control', value: 'invalid json' });
  assert.equal((await fetch(`${url}/api/materials`)).status, 503);
  assert.equal((await fetch(`${url}/api/auth/login`)).status, 200);
  assert.equal((await fetch(`${url}/api/site-control`)).status, 503);
});
