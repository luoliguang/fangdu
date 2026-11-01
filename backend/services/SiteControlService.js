const { randomUUID } = require('crypto');

const KEY = 'site_control';
const MODULES = ['materials', 'colorCard', 'sizeConverter', 'drawer', 'fabricDetail', 'officialSite'];
const NOTICE = '本网站由我个人开发和维护，服务器等运行费用均由我个人承担，与工厂无关。\n\n因原跟单人员已离职，站内素材及相关信息未能及时更新，部分内容可能已不符合当前实际情况。为避免给大家造成误导，本站即日起停止提供服务。\n\n如需最新素材或业务信息，请直接联系现任跟单人员获取。感谢大家一直以来的使用与理解。';

function defaults() {
  return {
    enabled: true,
    modules: Object.fromEntries(MODULES.map(key => [key, true])),
    notice: { enabled: false, title: '网站停止服务公告', content: NOTICE },
    revision: 'initial'
  };
}

function validate(input) {
  const invalid = () => { throw Object.assign(new Error('配置格式无效，请检查开关及公告内容'), { status: 400 }); };
  if (!input || typeof input.enabled !== 'boolean' || !input.modules || !input.notice) invalid();
  if (MODULES.some(key => typeof input.modules[key] !== 'boolean')) invalid();
  const { enabled, title, content } = input.notice;
  if (typeof enabled !== 'boolean' || typeof title !== 'string' || typeof content !== 'string') invalid();
  if (!title.trim() || title.length > 80 || !content.trim() || content.length > 3000) invalid();
  return {
    enabled: input.enabled,
    modules: Object.fromEntries(MODULES.map(key => [key, input.modules[key]])),
    notice: { enabled, title: title.trim(), content: content.trim() }
  };
}

class SiteControlService {
  constructor(repository) { this.repository = repository; }
  async get() {
    const row = await this.repository.findOne({ where: { key: KEY } });
    if (!row) return defaults();
    const stored = JSON.parse(row.value);
    return { ...validate(stored), revision: stored.revision };
  }
  async save(input) {
    const config = { ...validate(input), revision: randomUUID() };
    await this.repository.upsert({ key: KEY, value: JSON.stringify(config) });
    return config;
  }
}

module.exports = { SiteControlService, defaults, validate, KEY };
