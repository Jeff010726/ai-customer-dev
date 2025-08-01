#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 停止所有相关服务
function stopAllServices() {
  return new Promise((resolve) => {
    log('🛑 正在停止所有服务...', 'yellow');
    
    // 停止占用端口的进程
    const killCommands = [
      'lsof -ti:3000 | xargs kill -9 2>/dev/null || true',
      'lsof -ti:3001 | xargs kill -9 2>/dev/null || true',
      'pkill -f "nodemon" 2>/dev/null || true',
      'pkill -f "node server/index.js" 2>/dev/null || true',
      'pkill -f "vite" 2>/dev/null || true'
    ];
    
    let completed = 0;
    killCommands.forEach((cmd) => {
      exec(cmd, () => {
        completed++;
        if (completed === killCommands.length) {
          log('✅ 所有服务已停止', 'green');
          // 等待1秒确保进程完全停止
          setTimeout(resolve, 1000);
        }
      });
    });
  });
}

// 启动前端服务
function startFrontend() {
  return new Promise((resolve, reject) => {
    log('🚀 启动前端服务...', 'cyan');
    
    const frontend = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../client'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    let started = false;
    
    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') && !started) {
        started = true;
        log('✅ 前端服务已启动: http://localhost:3000', 'green');
        resolve(frontend);
      }
    });
    
    frontend.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('EADDRINUSE') || error.includes('port') && error.includes('already')) {
        log('❌ 端口3000被占用，请先运行停止服务命令', 'red');
        reject(new Error('Port in use'));
      }
    });
    
    frontend.on('error', (error) => {
      log(`❌ 前端服务启动失败: ${error.message}`, 'red');
      reject(error);
    });
    
    // 超时处理
    setTimeout(() => {
      if (!started) {
        log('⏰ 前端服务启动超时，但可能仍在后台运行', 'yellow');
        resolve(frontend);
      }
    }, 30000);
  });
}

// 启动后端服务
function startBackend() {
  return new Promise((resolve, reject) => {
    log('🚀 启动后端服务...', 'cyan');
    
    const backend = spawn('npm', ['run', 'server:dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    let started = false;
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on') && !started) {
        started = true;
        log('✅ 后端服务已启动: http://localhost:3001', 'green');
        resolve(backend);
      }
    });
    
    backend.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('EADDRINUSE') || error.includes('port') && error.includes('already')) {
        log('❌ 端口3001被占用，请先运行停止服务命令', 'red');
        reject(new Error('Port in use'));
      }
    });
    
    backend.on('error', (error) => {
      log(`❌ 后端服务启动失败: ${error.message}`, 'red');
      reject(error);
    });
    
    // 超时处理
    setTimeout(() => {
      if (!started) {
        log('⏰ 后端服务启动超时，但可能仍在后台运行', 'yellow');
        resolve(backend);
      }
    }, 30000);
  });
}

// 启动完整服务
async function startFullStack() {
  try {
    await stopAllServices();
    
    log('🚀 启动完整服务（前端 + 后端 + 数据库）...', 'magenta');
    
    // 先启动后端
    const backendProcess = await startBackend();
    
    // 等待2秒确保后端完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 再启动前端
    const frontendProcess = await startFrontend();
    
    log('', 'reset');
    log('🎉 所有服务启动成功！', 'green');
    log('📊 前端界面: http://localhost:3000', 'cyan');
    log('🔗 后端API: http://localhost:3001', 'cyan');
    log('🏥 健康检查: http://localhost:3001/health', 'cyan');
    log('', 'reset');
    log('按 Ctrl+C 可以停止所有服务', 'yellow');
    
    // 处理退出信号
    const handleExit = () => {
      log('🛑 正在停止所有服务...', 'yellow');
      backendProcess.kill();
      frontendProcess.kill();
      stopAllServices().then(() => {
        log('👋 所有服务已停止', 'green');
        process.exit(0);
      });
    };
    
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
    
    // 保持进程运行
    return new Promise(() => {});
    
  } catch (error) {
    log(`❌ 启动失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 主函数
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'stop':
      await stopAllServices();
      break;
      
    case 'frontend':
      await stopAllServices();
      await startFrontend();
      log('前端服务已在后台运行，可以通过 npm run stop 停止', 'yellow');
      break;
      
    case 'backend':
      await stopAllServices();
      await startBackend();
      log('后端服务已在后台运行，可以通过 npm run stop 停止', 'yellow');
      break;
      
    case 'start':
    case 'full':
      await startFullStack();
      break;
      
    default:
      log('AI客户开发系统 - 服务管理器', 'magenta');
      log('', 'reset');
      log('使用方法:', 'cyan');
      log('  npm run start:frontend  # 只启动前端服务', 'reset');
      log('  npm run start:backend   # 只启动后端服务', 'reset');
      log('  npm run start:full      # 启动完整服务（推荐）', 'reset');
      log('  npm run stop            # 停止所有服务', 'reset');
      log('', 'reset');
      log('或者直接使用:', 'cyan');
      log('  node scripts/service-manager.js [frontend|backend|full|stop]', 'reset');
  }
}

main().catch((error) => {
  log(`❌ 执行失败: ${error.message}`, 'red');
  process.exit(1);
});