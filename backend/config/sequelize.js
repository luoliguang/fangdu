const { Sequelize } = require('sequelize');
const path = require('path');

// 创建Sequelize实例，使用SQLite数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database', 'drawer_config.db'),
  logging: console.log, // 可以设置为false来禁用SQL日志
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

// 同步数据库表结构
async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log('数据库表结构同步成功');
  } catch (error) {
    console.error('数据库表结构同步失败:', error);
  }
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};