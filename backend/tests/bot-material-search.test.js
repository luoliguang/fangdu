const { test } = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3').verbose();
const { BotMaterialSearch, termsFromMessage } = require('../services/BotMaterialSearch');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, error => error ? reject(error) : resolve()));
}

test('read-only photo search uses real visible names and separates search from process ability', async t => {
  const db = new sqlite3.Database(':memory:');
  t.after(() => new Promise(resolve => db.close(resolve)));
  await run(db, 'CREATE TABLE materials (id INTEGER PRIMARY KEY, name TEXT, tags TEXT, file_path TEXT, conversion_status TEXT)');
  for (const [name, tags, filePath, status] of [
    ['涤纶提花纹样', '涤纶,提花', '/a.jpg', null],
    ['涤纶运动面料', '涤纶,运动', '/b.jpg', null],
    ['纯棉运动面料', '纯棉,运动', '/c.jpg', null],
    ['Cotton blend', '涤纶,cotton', '/cotton.jpg', null],
    ['涤纶运动转码', '涤纶,运动', '/d.mov', 'converting'],
    ['涤纶运动未上传', '涤纶,运动', null, null],
    ['经典速干小方格', '涤纶,速干', '/e.jpg', null],
    ['雪纺印花', '雪纺', '/chiffon.jpg', null],
    ['礼服廓形', '礼服', '/dress.jpg', null],
    [`涤纶${'超长'.repeat(45)}`, '涤纶', '/long.jpg', null],
    ['涤纶`特殊名称', '涤纶', '/backtick.jpg', null]
  ]) await run(db, 'INSERT INTO materials (name, tags, file_path, conversion_status) VALUES (?, ?, ?, ?)', [name, tags, filePath, status]);
  // 最近 35 条只命中“涤纶”；较早的精确名称仍应优先于它们。
  for (let i = 0; i < 35; i++) {
    await run(db, 'INSERT INTO materials (name, tags, file_path) VALUES (?, ?, ?)', [`涤纶样布${i}`, '涤纶', `/new-${i}.jpg`]);
  }
  const search = new BotMaterialSearch(db);
  const names = await search.search('帮我找涤纶运动面料');
  assert.ok(names.includes('涤纶运动面料'));
  assert.ok(names.every(name => !/转码|未上传/i.test(name)));
  assert.deepEqual(await search.search('找纯棉运动面料实拍图'), ['纯棉运动面料']);
  assert.ok((await search.recommend('涤纶')).names.every(name => name.length <= 80 && !name.includes('`')));
  assert.deepEqual(await search.search('速干布'), ['经典速干小方格']);
  assert.deepEqual(await search.search('完全不存在的昵称'), []);
  assert.deepEqual(termsFromMessage('你们有雪纺礼服吗？').sort(), ['礼服', '雪纺']);
  assert.deepEqual(await search.search('你们有雪纺礼服吗？'), [], '不同素材分别命中一个词，也不能拼成不存在的品类');
  const related = await search.recommend('你们有雪纺礼服吗？');
  assert.equal(related.kind, 'related');
  assert.deepEqual(related.names.sort(), ['礼服廓形', '雪纺印花']);
  assert.ok(related.names.every(name => name !== '雪纺礼服'));
  const guide = await search.recommend('怎么拆关键词搜索实拍图');
  assert.deepEqual(guide, { kind: 'guide', names: [], terms: [] });
  assert.equal((await search.recommend('我不知道怎么搜索素材')).kind, 'guide');
  assert.equal((await search.recommend('想找运动透气面料')).kind, 'related');
  assert.ok(termsFromMessage('帮我找涤纶面料').includes('涤纶'));
  const split = termsFromMessage('我想找蓝色条纹实拍图');
  assert.ok(split.includes('蓝色') && split.includes('条纹'));
  assert.ok(!split.includes('实拍图'));
});
