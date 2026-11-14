// 机器人只读查询业务 SQLite 的公开素材名称；不加载文件、OSS 或整个素材库。
const STOP_WORDS = new Set([
  '我', '你', '帮', '帮我', '给我', '想', '想要', '要', '找', '找点', '搜', '搜索', '推荐',
  '一下', '一些', '有没有', '什么', '哪些', '可以', '能', '的', '和', '或者', '关于',
  '素材', '面料', '款式', '名字', '昵称', '图案', '图片', '网站', '怎么', '这个', '那个'
]);
const MAX_TERMS = 5;
const MAX_CANDIDATES = 30;
const MAX_RESULTS = 3;

function termsFromMessage(message) {
  if (typeof message !== 'string') return [];
  const words = new Intl.Segmenter('zh', { granularity: 'word' }).segment(message.slice(0, 100));
  const result = [];
  for (const segment of words) {
    if (!segment.isWordLike) continue;
    const word = segment.segment.trim().toLowerCase().replace(/(面料|布料|款式|布)$/u, '');
    if (word.length < 2 || word.length > 24 || STOP_WORDS.has(word) || !/^[\p{L}\p{N}]+$/u.test(word)) continue;
    if (!result.includes(word)) result.push(word);
    if (word.length >= 3 && word.length <= 6 && /^[\p{Script=Han}]+$/u.test(word)) {
      const prefix = word.slice(0, 2);
      if (!result.includes(prefix)) result.push(prefix);
    }
    if (result.length >= MAX_TERMS) break;
  }
  // “速干布”等连写昵称在分词时可能被切错，用含义明确的相邻汉字补充检索。
  for (const pair of message.slice(0, 50).matchAll(/(?=([\u3400-\u9fff]{2}))/gu)) {
    const term = pair[1];
    if (/[我你找搜荐什么吗呢的想要请帮给]/u.test(term) || STOP_WORDS.has(term) || result.includes(term)) continue;
    result.push(term);
    if (result.length >= MAX_TERMS) break;
  }
  return result.slice(0, MAX_TERMS);
}

function likeTerm(value) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

class BotMaterialSearch {
  constructor(db) {
    this.db = db;
  }

  query(sql, params) {
    return new Promise((resolve, reject) => this.db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
  }

  async search(message) {
    const terms = termsFromMessage(message);
    if (!terms.length) return [];
    const filters = terms.map(() => "(name LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')");
    const params = terms.flatMap(term => [likeTerm(term), likeTerm(term)]);
    const score = terms.map(() => "(CASE WHEN name LIKE ? ESCAPE '\\' THEN 3 ELSE 0 END + CASE WHEN tags LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END)").join(' + ');
    const rows = await this.query(`
      SELECT id, name, tags FROM materials
      WHERE (conversion_status IS NULL OR conversion_status != 'converting')
        AND file_path IS NOT NULL AND file_path != ''
        AND name NOT LIKE '%棉%' AND LOWER(name) NOT LIKE '%cotton%'
        AND (tags IS NULL OR (tags NOT LIKE '%棉%' AND LOWER(tags) NOT LIKE '%cotton%'))
        AND (${filters.join(' OR ')})
      ORDER BY (${score}) DESC, id DESC LIMIT ?
    `, [...params, ...params, MAX_CANDIDATES]);
    return rows.filter(row => typeof row.name === 'string' && !/棉|cotton/i.test(`${row.name} ${row.tags || ''}`))
      .map(row => ({
        name: row.name.trim().slice(0, 80),
        score: terms.reduce((score, term) => score + (row.name.toLowerCase().includes(term) ? 3 : 0)
          + (String(row.tags || '').toLowerCase().includes(term) ? 1 : 0), 0),
        id: row.id
      }))
      .filter(row => row.name && row.score > 0)
      .sort((a, b) => b.score - a.score || b.id - a.id)
      .slice(0, MAX_RESULTS)
      .map(({ name }) => name);
  }

  async examples() {
    const rows = await this.query(`
      SELECT name, tags FROM materials
      WHERE (conversion_status IS NULL OR conversion_status != 'converting')
        AND file_path IS NOT NULL AND file_path != ''
        AND name NOT LIKE '%棉%' AND LOWER(name) NOT LIKE '%cotton%'
        AND (tags IS NULL OR (tags NOT LIKE '%棉%' AND LOWER(tags) NOT LIKE '%cotton%'))
        AND (name LIKE ? OR tags LIKE ?)
      ORDER BY id DESC LIMIT ?
    `, ['%涤纶%', '%涤纶%', 12]);
    return rows.filter(row => typeof row.name === 'string' && !/棉|cotton/i.test(`${row.name} ${row.tags || ''}`))
      .map(row => row.name.trim().slice(0, 80)).filter(Boolean).slice(0, 2);
  }
}

module.exports = { BotMaterialSearch, termsFromMessage };
