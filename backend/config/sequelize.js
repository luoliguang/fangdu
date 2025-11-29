const { Sequelize } = require('sequelize');
const path = require('path');

// 创建Sequelize实例，使用SQLite数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database', 'drawer_config.db'),
  logging: false, // 禁用SQL日志以加快启动速度
  define: {
    timestamps: true,
    underscored: true, // 使用下划线命名
    freezeTableName: true // 防止表名复数化
  }
});

// 测试数据库连接
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Sequelize数据库连接成功');
  } catch (error) {
    console.error('Sequelize数据库连接失败:', error);
  }
}

// 同步数据库表结构（快速启动模式）
async function syncDatabase() {
  try {
    // 快速启动：只在表不存在时创建表，不进行结构变更检查
    // 这样可以大大加快启动速度（从几秒缩短到毫秒级）
    // 如果需要添加新字段，请手动运行迁移脚本或使用 alter: true（会慢）
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ 数据库表结构检查完成（快速启动模式）');
  } catch (error) {
    console.error('数据库表结构同步失败:', error);
    // 即使失败也继续，避免阻塞启动
  }
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};