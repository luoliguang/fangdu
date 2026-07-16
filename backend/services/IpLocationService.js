const http = require('http');

// 私有/保留 IP 段，无法通过公网 API 定位
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^localhost$/i,
  /^unknown$/i,
  /^0\.0\.0\.0$/
];

class IpLocationService {
  constructor(db) {
    this.db = db;
    // 内存缓存，避免同一进程生命周期内重复查同一 IP
    this._memCache = new Map();
  }

  isPrivateIp(ip) {
    return !ip || PRIVATE_IP_PATTERNS.some(p => p.test(ip));
  }

  /** 从数据库读取缓存的地理位置 */
  async getCached(ip) {
    if (this._memCache.has(ip)) return this._memCache.get(ip);
    return new Promise((resolve) => {
      this.db.get('SELECT * FROM ip_locations WHERE ip = ?', [ip], (err, row) => {
        if (row) this._memCache.set(ip, row);
        resolve(row || null);
      });
    });
  }

  /** 将地理位置写入数据库缓存 */
  async saveToCache(ip, location) {
    this._memCache.set(ip, location);
    return new Promise((resolve) => {
      this.db.run(
        `INSERT OR REPLACE INTO ip_locations (ip, country, region, city, isp, queried_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [ip, location.country, location.region, location.city, location.isp],
        resolve
      );
    });
  }

  /** 通过 ip-api.com 查询地理位置（免费、无需 key，45次/分钟） */
  fetchFromApi(ip) {
    return new Promise((resolve) => {
      const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp&lang=zh-CN`;
      const req = http.get(url, { timeout: 4000 }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'success') {
              resolve({
                country: json.country || '',
                region: json.regionName || '',
                city: json.city || '',
                isp: json.isp || ''
              });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

  /**
   * 主入口：优先读缓存，缓存未命中才查 API。
   * 火忘模式（fire-and-forget）调用，不阻塞请求。
   */
  async enrichAsync(ip) {
    if (this.isPrivateIp(ip)) return;
    try {
      const cached = await this.getCached(ip);
      if (cached) return;

      const location = await this.fetchFromApi(ip);
      if (location) {
        await this.saveToCache(ip, location);
      }
    } catch (err) {
      // 地理位置查询失败不影响主流程
      console.error('[IpLocation] enrichAsync error:', err.message);
    }
  }
}

module.exports = IpLocationService;
