const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

let currentLevel = levels[process.env.LOG_LEVEL] || levels.info;

// 格式化时间
function formatTime() {
  return new Date().toISOString();
}

// 格式化日志消息
function formatMessage(level, message, meta = {}) {
  const timestamp = formatTime();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`.trim();
}

// 写入文件
function writeToFile(level, message, meta) {
  const logFile = process.env.LOG_FILE || path.join(logsDir, 'app.log');
  const formattedMessage = formatMessage(level, message, meta);
  
  fs.appendFile(logFile, formattedMessage + '\n', (err) => {
    if (err) {
      console.error('写入日志文件失败:', err);
    }
  });
}

// 输出到控制台
function writeToConsole(level, message, meta) {
  const formattedMessage = formatMessage(level, message, meta);
  
  switch (level) {
    case 'error':
      console.error('\x1b[31m%s\x1b[0m', formattedMessage); // 红色
      break;
    case 'warn':
      console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // 黄色
      break;
    case 'info':
      console.info('\x1b[36m%s\x1b[0m', formattedMessage); // 青色
      break;
    case 'debug':
      console.debug('\x1b[37m%s\x1b[0m', formattedMessage); // 白色
      break;
    default:
      console.log(formattedMessage);
  }
}

// 日志函数
function log(level, message, meta = {}) {
  if (levels[level] > currentLevel) {
    return; // 跳过低级别日志
  }
  
  // 输出到控制台
  writeToConsole(level, message, meta);
  
  // 写入文件
  writeToFile(level, message, meta);
}

// 导出日志方法
module.exports = {
  error: (message, meta = {}) => log('error', message, meta),
  warn: (message, meta = {}) => log('warn', message, meta),
  info: (message, meta = {}) => log('info', message, meta),
  debug: (message, meta = {}) => log('debug', message, meta),
  
  // 工具方法
  setLevel: (level) => {
    if (levels[level] !== undefined) {
      currentLevel = levels[level];
    }
  },
  
  // 获取日志文件内容
  getLogs: async (lines = 100) => {
    const logFile = process.env.LOG_FILE || path.join(logsDir, 'app.log');
    
    try {
      if (!fs.existsSync(logFile)) {
        return [];
      }
      
      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      
      // 返回最后N行
      return logLines.slice(-lines);
    } catch (error) {
      console.error('读取日志文件失败:', error);
      return [];
    }
  },
  
  // 清理日志文件
  clearLogs: async () => {
    const logFile = process.env.LOG_FILE || path.join(logsDir, 'app.log');
    
    try {
      if (fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '');
      }
      return true;
    } catch (error) {
      console.error('清理日志文件失败:', error);
      return false;
    }
  }
}; 