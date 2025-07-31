// Railway专用极简服务器
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Railway server...');
console.log('📍 Port:', PORT);

// 极简健康检查
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  console.log('✅ API Health check requested');
  res.status(200).json({ status: 'OK' });
});

app.get('/', (req, res) => {
  res.status(200).send('AI Customer Development System - Railway Ready');
});

// 简单API响应
app.get('/api/test', (req, res) => {
  res.json({ message: 'Railway server is working!' });
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Railway server running on 0.0.0.0:${PORT}`);
  console.log(`📊 Health check: /health`);
  console.log(`✅ Server is ready!`);
});

// 错误处理
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});