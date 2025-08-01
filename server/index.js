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
const tasksRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway部署优化 - 监听所有接口
const HOST = process.env.HOST || '0.0.0.0';

// 中间件配置 - Railway优化
app.use(cors({
  origin: true, // Railway部署时允许所有域名
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
app.use('/api/tasks', tasksRoutes);

// 超简单健康检查 - Railway专用
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('AI Customer Development System - Running');
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
    
    // 同步数据库模型
        await sequelize.sync({
      force: false,  // 恢复正常模式，不再强制重建
      alter: process.env.NODE_ENV === 'development',  // 开发环境允许修改表结构
      logging: false  // 减少日志输出
    });
    logger.info('数据库模型同步完成');
    
    // 启动任务调度器
    const taskScheduler = require('./services/taskScheduler');
    taskScheduler.start();
    
    // 启动服务器 - Railway优化
    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📊 Health check: /health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.DATABASE_URL || 'SQLite'}`);
      console.log(`📅 任务调度器已启动`);
      
      // Railway健康检查响应
      if (process.env.NODE_ENV === 'production') {
        console.log('✅ Railway deployment ready!');
      }
    });
    
    // 设置超时
    server.timeout = 30000;
    
    // 优雅关闭时停止任务调度器
    const gracefulShutdown = async () => {
      logger.info('正在关闭服务器...');
      taskScheduler.stop();
      server.close(() => {
        logger.info('服务器已关闭');
      });
      await sequelize.close();
      process.exit(0);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}



// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
});

startServer(); 