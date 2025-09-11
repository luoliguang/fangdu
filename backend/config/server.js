require('dotenv').config();
const OSS = require('ali-oss');

/**
 * 服务器配置管理
 */
class ServerConfig {
  constructor() {
    this.validateEnvironment();
    this.initializeOSS();
  }

  /**
   * 验证必要的环境变量
   */
  validateEnvironment() {
    const requiredEnvVars = [
      'SECRET_TOKEN',
      'ALI_OSS_REGION',
      'ALI_OSS_ACCESS_KEY_ID',
      'ALI_OSS_ACCESS_KEY_SECRET',
      'ALI_OSS_BUCKET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`严重错误：缺少以下环境变量: ${missingVars.join(', ')}`);
      console.error('请检查 .env 文件配置！');
      process.exit(1);
    }
  }

  /**
   * 初始化阿里云OSS客户端
   */
  initializeOSS() {
    try {
      const region = process.env.ALI_OSS_REGION;
      const endpoint = `https://${region}.aliyuncs.com`;
      
      this.ossClient = new OSS({
        region: region,
        endpoint: endpoint,
        accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
        bucket: process.env.ALI_OSS_BUCKET,
      });
      console.log(`阿里云OSS客户端初始化成功，endpoint: ${endpoint}`);
    } catch (error) {
      console.error('阿里云OSS客户端初始化失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 获取服务器配置
   */
  getServerConfig() {
    return {
      port: process.env.PORT || 3001,
      nodeEnv: process.env.NODE_ENV || 'development',
      secretToken: process.env.SECRET_TOKEN,
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
      },
      upload: {
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/avi']
      }
    };
  }

  /**
   * 获取OSS配置
   */
  getOSSConfig() {
    return {
      region: process.env.ALI_OSS_REGION,
      bucket: process.env.ALI_OSS_BUCKET,
      endpoint: `https://${process.env.ALI_OSS_BUCKET}.${process.env.ALI_OSS_REGION}.aliyuncs.com`
    };
  }

  /**
   * 获取OSS客户端实例
   */
  getOSSClient() {
    return this.ossClient;
  }

  /**
   * 获取数据库配置
   */
  getDatabaseConfig() {
    return {
      type: 'sqlite3',
      filename: 'my_materials.db',
      pool: {
        min: 1,
        max: 10
      },
      migrations: {
        directory: './migrations'
      }
    };
  }

  /**
   * 获取日志配置
   */
  getLogConfig() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'combined',
      file: {
        enabled: process.env.LOG_TO_FILE === 'true',
        filename: process.env.LOG_FILENAME || 'app.log',
        maxSize: process.env.LOG_MAX_SIZE || '10MB',
        maxFiles: process.env.LOG_MAX_FILES || '5'
      }
    };
  }

  /**
   * 获取安全配置
   */
  getSecurityConfig() {
    return {
      rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1分钟
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 30,
        message: 'Too many requests from this IP'
      },
      helmet: {
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: false
      }
    };
  }

  /**
   * 检查是否为开发环境
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * 检查是否为生产环境
   */
  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * 获取完整配置
   */
  getAllConfig() {
    return {
      server: this.getServerConfig(),
      database: this.getDatabaseConfig(),
      oss: this.getOSSConfig(),
      logging: this.getLogConfig(),
      security: this.getSecurityConfig()
    };
  }
}

// 创建单例实例
const serverConfig = new ServerConfig();

// 添加静态方法以保持向后兼容
ServerConfig.getConfig = () => {
  return serverConfig.getAllConfig();
};

module.exports = ServerConfig;