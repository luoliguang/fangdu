const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const Material = require('../models/Material');
const { convertToMp4 } = require('../utils/videoConverter');
const queues = new WeakMap();
class ConversionQueue {
  constructor(db, ossClient, options = {}) {
    this.model = new Material(db);
    this.ossClient = ossClient;
    this.directory = options.directory || path.join(__dirname, '..', 'database', 'conversion-sources');
    this.convert = options.convert || convertToMp4;
    this.pending = [];
    this.running = false;
  }
  enqueue(source, data) {
    // Serialize admission so simultaneous upload requests cannot exceed the queue cap.
    const task = (this.admission || Promise.resolve()).then(() => this.persist(source, data));
    this.admission = task.catch(() => {});
    return task;
  }
  async discard(material) {
    this.pending = this.pending.filter(id => id !== material.id);
    if (material.conversion_source) {
      await fs.unlink(path.join(this.directory, path.basename(material.conversion_source))).catch(() => {});
    }
  }
  async persist(source, data) {
    const { total } = await this.model.queryOne("SELECT COUNT(*) AS total FROM materials WHERE conversion_status = 'converting'");
    if (total >= (Number(process.env.MAX_PENDING_CONVERSIONS) || 100)) throw new Error('Conversion queue is full, retry later');
    await fs.mkdir(this.directory, { recursive: true });
    const filename = `${randomUUID()}.mov`;
    const target = path.join(this.directory, filename);
    await fs.copyFile(source, target);
    let material;
    try {
      material = await this.model.create({ ...data, filePath: '_converting_', conversionStatus: 'converting', conversionSource: filename });
    } catch (error) { await fs.unlink(target).catch(() => {}); throw error; }
    this.pending.push(material.id);
    this.kick();
    return material;
  }
  async recover() {
    if (this.running) return;
    const rows = await this.model.queryAll("SELECT id, conversion_source FROM materials WHERE conversion_status = 'converting'");
    const sources = new Set(rows.map(row => row.conversion_source));
    // Remove files left by a crash between copying, inserting, and final cleanup.
    await fs.mkdir(this.directory, { recursive: true });
    for (const filename of await fs.readdir(this.directory)) {
      if (/^[0-9a-f-]{36}\.mov(?:\.[0-9a-f-]{36}\.mp4)?$/.test(filename) && !sources.has(filename)) {
        await fs.unlink(path.join(this.directory, filename)).catch(() => {});
      }
    }
    this.pending.push(...rows.map(row => row.id));
    this.kick();
  }
  kick() {
    if (this.running) return;
    this.running = true;
    this.idle = this.drain().finally(() => { this.running = false; if (this.pending.length) this.kick(); });
  }
  async drain() {
    while (this.pending.length) {
      const id = this.pending.shift();
      try { await this.process(id); } catch (error) { console.error(`[conversion ${id}]`, error.message); }
    }
  }
  async process(id) {
    const material = await this.model.getById(id);
    if (!material || material.conversion_status !== 'converting') return;
    const source = material.conversion_source && path.join(this.directory, path.basename(material.conversion_source));
    const output = source && `${source}.${randomUUID()}.mp4`;
    let terminal = false;
    try {
      if (!source) throw new Error('Conversion source missing');
      await this.convert(source, output);
      const key = `converted-${id}.mp4`;
      const result = await this.ossClient.put(key, output, { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'inline' } });
      if (!await this.model.getById(id)) await this.ossClient.delete(key);
      else await this.model.updateConversionStatus(id, { status: 'done', filePath: result.url.replace(/^http:/, 'https:') });
      terminal = true;
    } catch (error) {
      await this.model.updateConversionStatus(id, { status: 'failed' });
      terminal = true;
      console.error(`[conversion ${id}]`, error.message);
    } finally {
      if (output) await fs.unlink(output).catch(() => {});
      if (terminal && source) await fs.unlink(source).catch(() => {});
    }
  }
}
function getQueue(db, ossClient) {
  if (!queues.has(db)) queues.set(db, new ConversionQueue(db, ossClient));
  return queues.get(db);
}
module.exports = { getQueue, ConversionQueue };
