const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const logger = require('./utils/logger');

// 导入路由
const campaignRoutes = require('./routes/campaigns');
const customerRoutes = require('./routes/customers');
const emailRoutes = require('./routes/emails');
const searchRoutes = require('./routes/search');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway部署优化 - 监听所有接口
const HOST = process.env.HOST || '0.0.0.0';

// 中间件配置
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// API路由
app.use('/api/campaigns', campaignRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);

// 健康检查 - Railway部署专用
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Railway根路径健康检查
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Railway根路径
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  } else {
    res.json({ 
      message: 'AI客户开发系统 API服务器',
      status: 'running',
      endpoints: {
        health: '/api/health',
        campaigns: '/api/campaigns',
        customers: '/api/customers',
        search: '/api/search'
      }
    });
  }
});

// 静态文件服务 (生产环境)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || '服务器内部错误',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: '接口不存在',
      path: req.originalUrl
    }
  });
});

// 数据库连接和服务器启动
async function startServer() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    // 同步数据库模型 - Railway优化
    await sequelize.sync({ 
      force: false,  // 生产环境不强制重建
      alter: process.env.NODE_ENV === 'development',
      logging: false  // Railway环境减少日志
    });
    logger.info('数据库模型同步完成');
    
    // 启动服务器 - Railway优化
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 服务器运行在 ${HOST}:${PORT}`);
      logger.info(`📊 健康检查：/api/health`);
      logger.info(`🌍 环境：${process.env.NODE_ENV || 'development'}`);
      logger.info(`💾 数据库：${process.env.DATABASE_URL || 'SQLite本地'}`);
    });
    
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
});

startServer(); 