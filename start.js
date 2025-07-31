// Railway启动脚本
const { spawn } = require('child_process');

console.log('🚀 Starting AI Customer Development System...');
console.log('📍 Environment:', process.env.NODE_ENV || 'production');
console.log('🌐 Port:', process.env.PORT || 3001);

// 启动服务器
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🔚 Server process exited with code ${code}`);
  process.exit(code);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.kill('SIGINT');
});