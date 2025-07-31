# AI客户开发系统 - 部署指南

## 🚀 快速部署

### 方式一：本地部署（推荐）

1. **克隆项目**
```bash
git clone https://github.com/your-username/ai-customer-dev.git
cd ai-customer-dev
```

2. **安装依赖**
```bash
npm run install:all
```

3. **配置环境**
```bash
cp config.example.env .env
# 编辑 .env 文件，配置您的API密钥和邮箱
```

4. **一键部署**
```bash
chmod +x deploy.sh
./deploy.sh
```

### 方式二：Docker部署

1. **构建和运行**
```bash
docker-compose up -d
```

2. **查看日志**
```bash
docker-compose logs -f
```

3. **停止服务**
```bash
docker-compose down
```

## 📋 必需配置

### AI API配置
选择以下之一：

**DeepSeek API（推荐）**
- 访问：https://platform.deepseek.com/
- 价格：性价比最高
- 配置：`OPENAI_API_KEY=sk-xxx`

**OpenAI API**
- 访问：https://platform.openai.com/
- 价格：较高但效果好
- 配置：`OPENAI_API_KEY=sk-xxx`

### 邮箱配置
选择以下之一：

**Gmail（推荐）**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**163邮箱**
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@163.com
SMTP_PASS=your_password
```

## 🌐 部署到云服务器

### Vercel部署
1. Fork本项目到您的GitHub
2. 在Vercel中导入项目
3. 添加环境变量
4. 部署

### Railway部署
1. 连接GitHub仓库
2. 添加环境变量
3. 自动部署

### AWS/阿里云部署
1. 购买云服务器
2. 安装Node.js 18+
3. 克隆项目并配置
4. 使用PM2守护进程

```bash
npm install -g pm2
pm2 start server/index.js --name "ai-customer-dev"
pm2 save
pm2 startup
```

## 🔧 系统要求

- Node.js 18.0+
- npm 8.0+
- 2GB+ RAM
- 10GB+ 存储空间

## 📊 环境变量说明

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| OPENAI_API_KEY | 是 | AI API密钥 | sk-xxx |
| SMTP_USER | 是 | 邮箱用户名 | user@gmail.com |
| SMTP_PASS | 是 | 邮箱密码/应用密码 | your_password |
| PORT | 否 | 服务端口 | 3001 |
| NODE_ENV | 否 | 运行环境 | production |

## 🐛 常见问题

### 数据库连接失败
```bash
# 删除数据库文件重新创建
rm database.sqlite
npm start
```

### 端口占用
```bash
# 查找占用进程
lsof -i :3001
# 杀死进程
kill -9 <PID>
```

### 依赖安装失败
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📈 性能优化

### 生产环境配置
```env
NODE_ENV=production
LOG_LEVEL=warn
EMAIL_RATE_LIMIT=5
SEARCH_TIMEOUT=20000
```

### 内存优化
```bash
# 增加Node.js内存限制
node --max-old-space-size=4096 server/index.js
```

## 🔒 安全配置

1. **设置强密码**
```env
JWT_SECRET=complex_random_string_here
SESSION_SECRET=another_complex_string
```

2. **配置防火墙**
```bash
# 只允许特定端口
ufw allow 3001
ufw enable
```

3. **使用HTTPS**
```bash
# 使用Nginx反向代理
# 配置SSL证书
```

## 📞 技术支持

如有问题，请提交GitHub Issue或联系技术支持。

## 🎉 部署成功

部署成功后，访问：
- 应用地址：http://your-domain:3001
- API健康检查：http://your-domain:3001/api/health

祝您使用愉快！🚀