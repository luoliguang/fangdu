const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { EventEmitter } = require('events');
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');
const Material = require('../models/Material');
const MigrationService = require('../services/MigrationService');
const { ConversionQueue } = require('../services/ConversionQueue');
const { positiveInteger } = require('../utils/pagination');
const { requireAdmin } = require('../middleware/auth');
const { createUploadStorage, uploadAdmission } = require('../utils/uploadStorage');

async function database(t) {
  const db = new sqlite3.Database(':memory:');
  t.after(() => new Promise(resolve => db.close(resolve)));
  await new MigrationService(db).run();
  return { db, model: new Material(db) };
}
async function directory(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fangdu-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('admin access rejects anonymous, invalid and ordinary user tokens', () => {
  process.env.JWT_SECRET = 'isolated-test-secret';
  for (const [role, expected] of [[null,401], ['invalid',401], ['user',403], ['admin',200]]) {
    const token = role === 'invalid' ? 'bad-token' : jwt.sign({ role }, process.env.JWT_SECRET);
    const req = { headers: role ? { authorization: `Bearer ${token}` } : {} };
    let status;
    requireAdmin(req, { status(code) { status = code; return this; }, json() {} }, () => { status = 200; });
    assert.equal(status, expected);
  }
});

test('pagination rejects negative, fractional, malformed and unsafe values', () => {
  for (const value of [-1, 0, '2abc', '1.5', [], [1], {}, '9007199254740993']) assert.equal(positiveInteger(value,20,100),20);
  assert.equal(positiveInteger('200',20,100),100);
  assert.equal(positiveInteger('2',20,100),2);
});

test('negative SQL limit no longer returns the entire library', async t => {
  const { model } = await database(t);
  for (let i=0;i<25;i++) await model.create({name:`image${i}`,filePath:'test.jpg',tags:'test',mediaType:'image'});
  const result = await model.getAll({limit:-1,page:-10});
  assert.equal(result.data.length,20);
  assert.equal(result.meta.page,1);
  assert.equal(result.meta.total,25);
});

test('disk upload counts total bytes across multiple files without Content-Length', async () => {
  process.env.MAX_BATCH_UPLOAD_BYTES = '10';
  const storage = createUploadStorage();
  delete process.env.MAX_BATCH_UPLOAD_BYTES;
  const req = new EventEmitter();
  const upload = content => new Promise((resolve,reject) => storage._handleFile(req,{stream:Readable.from([Buffer.from(content)])},(e,f)=>e?reject(e):resolve(f)));
  const first = await upload('123456');
  try {
    assert.equal(await fs.readFile(first.path,'utf8'),'123456');
    assert.equal(first.buffer,undefined);
    await assert.rejects(upload('123456'), {status:413});
    const remaining = [];
    for (const filename of req.uploadPaths) { try { await fs.access(filename); remaining.push(filename); } catch (_) {} }
    assert.deepEqual(remaining,[first.path]);
  } finally { await Promise.all([...req.uploadPaths].map(f=>fs.unlink(f).catch(()=>{}))); }
});

test('upload concurrency slots release once when response closes', () => {
  process.env.MAX_CONCURRENT_UPLOADS='1';
  const first = new EventEmitter();
  let admitted=0, denied;
  uploadAdmission({},first,()=>admitted++);
  uploadAdmission({}, {status(c){denied=c;return this;},json(){}},()=>admitted++);
  assert.equal(denied,503);
  first.emit('finish'); first.emit('close');
  const second = new EventEmitter();
  uploadAdmission({},second,()=>admitted++);
  assert.equal(admitted,2);
  second.emit('finish');
  delete process.env.MAX_CONCURRENT_UPLOADS;
});

test('restart recovery processes persisted MOV jobs serially and cleans source files', async t => {
  const { db, model } = await database(t);
  const dir = await directory(t);
  for (let i=0;i<3;i++) {
    await fs.writeFile(path.join(dir,`${i}.mov`),'source');
    await model.create({name:`video${i}`,tags:'test',mediaType:'video',filePath:'_converting_',conversionStatus:'converting',conversionSource:`${i}.mov`});
  }
  let active=0, maximum=0, uploads=0;
  const queue = new ConversionQueue(db, {async put(key, output) {
    assert.equal(await fs.readFile(output,'utf8'),'mp4'); uploads++;
    return {url:`http://test/${key}`};
  }}, {directory:dir, async convert(input,output) {
    maximum=Math.max(maximum,++active);
    await fs.copyFile(input,output); await fs.writeFile(output,'mp4'); active--;
  }});
  await queue.recover(); await queue.idle;
  assert.equal(maximum,1); assert.equal(uploads,3);
  assert.equal((await model.queryOne("SELECT COUNT(*) AS total FROM materials WHERE conversion_status = 'done'")).total,3);
  assert.deepEqual(await fs.readdir(dir),[]);
});

test('missing legacy source and encoder failures become failed instead of hanging', async t => {
  const { db, model } = await database(t);
  const dir = await directory(t);
  await model.create({name:'legacy',tags:'test',mediaType:'video',filePath:'_converting_',conversionStatus:'converting'});
  await fs.writeFile(path.join(dir,'bad.mov'),'bad');
  await model.create({name:'bad',tags:'test',mediaType:'video',filePath:'_converting_',conversionStatus:'converting',conversionSource:'bad.mov'});
  const queue = new ConversionQueue(db, {}, {directory:dir,async convert(){throw new Error('invalid video');}});
  await queue.recover(); await queue.idle;
  assert.equal((await model.queryOne("SELECT COUNT(*) AS total FROM materials WHERE conversion_status = 'failed'")).total,2);
  assert.deepEqual(await fs.readdir(dir),[]);
});

test('enqueue persists source before returning and survives original upload cleanup', async t => {
  const { db, model } = await database(t);
  const dir = await directory(t);
  const source = path.join(dir,'upload.mov'); await fs.writeFile(source,'original');
  const queue = new ConversionQueue(db,{}, {directory:path.join(dir,'persistent')});
  queue.kick = () => {}; // Simulate process stopping before worker starts.
  const material = await queue.enqueue(source,{name:'queued',tags:'test',mediaType:'video'});
  await fs.unlink(source);
  const row = await model.getById(material.id);
  assert.equal(row.conversion_status,'converting');
  assert.equal(await fs.readFile(path.join(queue.directory,row.conversion_source),'utf8'),'original');
});

test('multipart upload uses disk storage and removes files after the response', async t => {
  const express = require('express');
  const multer = require('multer');
  const app = express();
  const storage = createUploadStorage();
  let uploaded;
  app.post('/',uploadAdmission,multer({storage}).single('file'),async (req,res,next) => {
    try {
      uploaded=req.file.path;
      assert.equal(req.file.buffer,undefined);
      assert.equal(await fs.readFile(uploaded,'utf8'),'image-content');
      res.json({size:req.file.size});
    } catch (e) { next(e); }
  });
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const form=new FormData();
  form.append('file',new Blob(['image-content'],{type:'image/png'}),'test.png');
  const response=await fetch(`http://127.0.0.1:${server.address().port}/`,{method:'POST',body:form});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{size:13});
  // Flush asynchronous response-finish cleanup.
  for (let i=0;i<20;i++) {
    try { await fs.access(uploaded); } catch(e) { assert.equal(e.code,'ENOENT'); return; }
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.fail('Upload temporary file was not removed');
});

test('actual ffmpeg converts a disk MOV to a playable MP4', async t => {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const { binary } = require('../utils/videoConverter');
  const dir = await directory(t);
  const input = path.join(dir,'sample.mov');
  const output = path.join(dir,'sample.mp4');
  await promisify(execFile)(binary,['-f','lavfi','-i','color=c=green:s=64x64:d=0.2','-c:v','mpeg4','-y',input],{windowsHide:true});
  await require('../utils/videoConverter').convertToMp4(input,output);
  assert.ok((await fs.stat(output)).size>100);
  await promisify(execFile)(binary,['-v','error','-i',output,'-f','null','-'],{windowsHide:true});
});

test('queue admission rejects excess jobs and deletion cleans queued sources', async t => {
  const { db,model }=await database(t);
  const dir=await directory(t);
  const source=path.join(dir,'source.mov'); await fs.writeFile(source,'mov');
  const queue=new ConversionQueue(db,{}, {directory:path.join(dir,'persistent')});
  queue.kick=()=>{};
  process.env.MAX_PENDING_CONVERSIONS='1';
  try {
    const results=await Promise.allSettled([queue.enqueue(source,{name:'one',tags:'test',mediaType:'video'}),queue.enqueue(source,{name:'two',tags:'test',mediaType:'video'})]);
    assert.equal(results[0].status,'fulfilled');
    assert.equal(results[1].status,'rejected');
    const row=await model.getById(results[0].value.id);
    await model.delete(row.id); await queue.discard(row);
    assert.deepEqual(await fs.readdir(queue.directory),[]);
    assert.equal(queue.pending.length,0);
  } finally { delete process.env.MAX_PENDING_CONVERSIONS; }
});
