// 只读业务 SQLite：搜索实拍图名称与标签，返回真实名称供用户在画廊检索。
const STOP_WORDS = new Set([
  '我', '你', '你们', '这里', '店里', '请问', '是否', '有没有', '有', '帮', '帮我', '给我',
  '想', '想要', '要', '找', '找点', '搜', '搜索', '推荐', '看看', '一下', '一些',
  '什么', '哪些', '可以', '能', '的', '和', '或者', '关于', '素材', '面料', '款式',
  '名字', '昵称', '图案', '图片', '网站', '怎么', '如何', '不知道', '知道', '不会',
  '哪里', '哪种', '什么样', '输入', '这个', '那个', '实拍图', '实拍', '照片', '图', '需要',
  '搜索词', '关键词', '关键', '隔离', '拆分', '搜索栏', '顶部', '我要',
  '怎么办', '没搜到', '搜不到', '找不到', '没找到'
]);
const MAX_TERMS = 5;
const MAX_RESULTS = 3;
const VISIBLE_MATERIALS = `
      FROM materials
      WHERE (conversion_status IS NULL OR conversion_status != 'converting')
        AND file_path IS NOT NULL AND file_path != ''
        AND LENGTH(name) <= 80 AND INSTR(name, CHAR(96)) = 0`;

function termsFromMessage(message) {
  if (typeof message !== 'string') return [];
  const result = [];
  for (const segment of new Intl.Segmenter('zh', { granularity: 'word' }).segment(message.slice(0, 100))) {
    if (!segment.isWordLike) continue;
    const word = segment.segment.trim().toLowerCase().replace(/(面料|布料|款式|布)$/u, '');
    if (word.length < 2 || word.length > 24 || STOP_WORDS.has(word) || !/^[\p{L}\p{N}]+$/u.test(word)) continue;
    if (!result.includes(word)) result.push(word);
    if (result.length >= MAX_TERMS) break;
  }
  // 分词可能把“雪纺”拆成单字：补齐不与已识别词重叠的双字组合。
  // 所有词必须在同一个真实名称中命中；不能把两款素材合并成“雪纺礼服”。
  const known = [...result, ...STOP_WORDS].map(term => ({ start: message.indexOf(term), end: message.indexOf(term) + term.length }));
  for (const pair of message.slice(0, 50).matchAll(/(?=([\u3400-\u9fff]{2}))/gu)) {
    const term = pair[1];
    if (/[我你们有是否这里店需件点找搜荐什么吗呢的想要请帮给布问]/u.test(term) || STOP_WORDS.has(term) || result.includes(term)) continue;
    if (known.some(({ start, end }) => start >= 0 && pair.index < end && pair.index + 2 > start)) continue;
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
    const filters = terms.map(() => "name LIKE ? ESCAPE '\\'");
    const rows = await this.query(`SELECT name ${VISIBLE_MATERIALS}
      AND ${filters.join(' AND ')} ORDER BY id DESC LIMIT ?`, [...terms.map(likeTerm), MAX_RESULTS]);
    return this.names(rows);
  }

  names(rows) {
    return [...new Set(rows.map(row => row.name)
      .filter(name => typeof name === 'string' && name.trim() && name.length <= 80 && !/[`\r\n\\]/.test(name))
      .map(name => name.trim()))];
  }

  async recommend(message) {
    const terms = termsFromMessage(message);
    if (!terms.length) return { kind: 'guide', names: [], terms: [] };
    const exact = await this.search(message);
    if (exact.length) return { kind: 'exact', names: exact, terms };

    const filters = terms.map(() => "(name LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')");
    const score = terms.map(() => "(CASE WHEN name LIKE ? ESCAPE '\\' THEN 3 ELSE 0 END + CASE WHEN tags LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END)").join(' + ');
    const params = terms.flatMap(term => [likeTerm(term), likeTerm(term)]);
    const rows = await this.query(`SELECT name ${VISIBLE_MATERIALS}
      AND (${filters.join(' OR ')}) ORDER BY (${score}) DESC, id DESC LIMIT ?`,
    [...params, ...params, MAX_RESULTS]);
    return { kind: 'related', names: this.names(rows), terms };
  }
}

module.exports = { BotMaterialSearch, termsFromMessage };
