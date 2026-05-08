const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入配置
const ServerConfig = require('./config/server');
const DatabaseConfig = require('./config/database');
const { sequelize, testConnection, syncDatabase } = require('./config/sequelize');

// 导入路由
const createRoutes = require('./routes');
const createProxyRoutes = require('./routes/proxyRoutes');

// 导入控制器（用于访问记录中间件）
const VisitController = require('./controllers/VisitController');

/**
 * 房都素材管理系统服务器
 * 重构后的分层架构版本
 */
class Server {
  constructor() {
    this.app = express();
    this.config = null;
    this.db = null;
    this.visitController = null;
  }

  /**
   * 初始化服务器
   */
  async initialize() {
    try {
      // 1. 加载配置
      await this.loadConfig();
      
      // 2. 初始化数据库
      await this.initializeDatabase();
      
      // 3. 配置中间件
      this.setupMiddleware();
      
      // 4. 配置路由
      this.setupRoutes();
      
      // 5. 配置错误处理
      this.setupErrorHandling();
      
      console.log('✅ 服务器初始化完成');
    } catch (error) {
      console.error('❌ 服务器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      this.config = ServerConfig.getConfig();
      console.log('✅ 配置加载完成');
      console.log(`📊 环境: ${this.config.server.nodeEnv}`);
      console.log(`🚀 端口: ${this.config.server.port}`);
    } catch (error) {
      console.error('❌ 配置加载失败:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库
   */
  async initializeDatabase() {
    try {
      // 初始化原有的SQLite数据库
      const dbConfig = new DatabaseConfig(this.config.database);
      this.db = await dbConfig.initialize();
      console.log('✅ 原有数据库初始化完成');
      
      // 初始化Sequelize数据库（用于抽屉配置）
      await testConnection();
      await syncDatabase();
      console.log('✅ Sequelize数据库初始化完成');
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 配置中间件
   */
  setupMiddleware() {
    // CORS配置
    this.app.use(cors(this.config.server.cors));
    
    // 解析JSON和URL编码的请求体
    this.app.use(express.json({ limit: this.config.server.upload.maxFileSize }));
    this.app.use(express.urlencoded({ extended: true, limit: this.config.server.upload.maxFileSize }));
    
    // 静态文件服务
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // 为静态文件添加CORS头部
    this.app.use('/uploads', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    }, express.static(uploadsDir));
    
    // 信任代理（用于获取真实IP）
    this.app.set('trust proxy', true);
    
    // 访问记录中间件
    this.visitController = new VisitController(this.db);
    this.app.use(this.visitController.visitTrackingMiddleware.bind(this.visitController));
    
    // 请求日志中间件（避免高并发下日志导致CPU占用升高）
    if (this.config.logging.requests) {
      this.app.use((req, res, next) => {
        const start = Date.now();

        // 避免记录高频静态资源和心跳类请求，减少I/O压力
        const ignoredPrefixes = ['/uploads', '/favicon.ico'];
        const ignoredExactPaths = ['/api/v1/visits/heartbeat'];
        const shouldIgnore =
          ignoredPrefixes.some(prefix => req.path.startsWith(prefix)) ||
          ignoredExactPaths.includes(req.path);

        if (!shouldIgnore) {
          res.on('finish', () => {
            const duration = Date.now() - start;

            // 仅记录慢请求和错误请求，降低日志开销
            const isSlow = duration >= 300;
            const isError = res.statusCode >= 400;
            if (isSlow || isError) {
              console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
            }
          });
        }

        next();
      });
    }
    
    console.log('✅ 中间件配置完成');
  }

  /**
   * 配置路由
   */
  setupRoutes() {
    // 主路由
    const routes = createRoutes(this.db);
    this.app.use('/', routes);
    // 直接在应用层挂载代理路由，防止生产环境路由前缀/反向代理导致的匹配问题
    this.app.use('/api/proxy', createProxyRoutes());
    this.app.use('/api/v1/proxy', createProxyRoutes());
    this.app.use('/proxy', createProxyRoutes());
    
    console.log('✅ 路由配置完成');
  }

  /**
   * 配置错误处理
   */
  setupErrorHandling() {
    // 全局错误处理中间件
    this.app.use((error, req, res, next) => {
      console.error('🚨 全局错误:', error);
      
      // Multer文件上传错误
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `文件大小超过限制 (${this.config.server.upload.maxFileSize})`,
          error: 'FILE_TOO_LARGE'
        });
      }
      
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: '不支持的文件字段',
          error: 'INVALID_FILE_FIELD'
        });
      }
      
      // 数据库错误
      if (error.code === 'SQLITE_ERROR') {
        return res.status(500).json({
          success: false,
          message: '数据库操作失败',
          error: 'DATABASE_ERROR'
        });
      }
      
      // 默认错误处理
      const statusCode = error.statusCode || error.status || 500;
      const message = error.message || '服务器内部错误';
      
      res.status(statusCode).json({
        success: false,
        message: message,
        error: this.config.server.nodeEnv === 'development' ? error.stack : 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      });
    });
    
    // 未捕获的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 未处理的Promise拒绝:', reason);
      // 在生产环境中可能需要优雅关闭服务器
    });
    
    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('🚨 未捕获的异常:', error);
      // 在生产环境中应该优雅关闭服务器
      process.exit(1);
    });
    
    console.log('✅ 错误处理配置完成');
  }

  /**
   * 启动服务器
   */
  async start() {
    try {
      await this.initialize();
      
      const server = this.app.listen(this.config.server.port, () => {
        console.log('🎉 ================================');
        console.log('🚀 方度素材管理系统启动成功!');
        console.log(`📡 服务器运行在: http://localhost:${this.config.server.port}`);
        console.log(`🌍 环境: ${this.config.server.nodeEnv}`);
        console.log(`📊 API文档: http://localhost:${this.config.server.port}/api/v1/info`);
        console.log('🎉 ================================');
      });
      
      // 优雅关闭处理
      this.setupGracefulShutdown(server);
      
      return server;
    } catch (error) {
      console.error('❌ 服务器启动失败:', error);
      process.exit(1);
    }
  }

  /**
   * 配置优雅关闭
   */
  setupGracefulShutdown(server) {
    const shutdown = async (signal) => {
      console.log(`\n🛑 收到 ${signal} 信号，开始优雅关闭...`);
      
      // 停止接受新连接
      server.close(async () => {
        console.log('📡 HTTP服务器已关闭');
        
        try {
          // 关闭数据库连接
          if (this.db) {
            await this.db.close();
            console.log('🗄️ 数据库连接已关闭');
          }
          
          console.log('✅ 优雅关闭完成');
          process.exit(0);
        } catch (error) {
          console.error('❌ 关闭过程中发生错误:', error);
          process.exit(1);
        }
      });
      
      // 强制关闭超时
      setTimeout(() => {
        console.error('⏰ 强制关闭超时，立即退出');
        process.exit(1);
      }, 10000);
    };
    
    // 监听关闭信号
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * 获取应用实例（用于测试）
   */
  getApp() {
    return this.app;
  }

  /**
   * 获取数据库实例
   */
  getDatabase() {
    return this.db;
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  const server = new Server();
  server.start().catch(error => {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  });
}

module.exports = Server;