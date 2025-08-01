# 跨平台部署指南

## 🌍 环境配置

### 本地开发环境
```bash
# 复制配置文件
cp config.example.env .env

# 编辑配置文件，设置本地地址
SERVER_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000
VITE_API_URL=http://localhost:3001
```

### 服务器部署环境
```bash
# 设置服务器地址
SERVER_URL=http://your-server-ip:3001
CLIENT_URL=http://your-server-ip:3000
VITE_API_URL=http://your-server-ip:3001

# 或使用域名
SERVER_URL=https://your-domain.com
CLIENT_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com
```

### Docker 部署
```bash
# 设置容器内部通信
SERVER_URL=http://ai-customer-dev:3001
CLIENT_URL=http://localhost:3000
VITE_API_URL=http://localhost:3001
```

### Railway/Heroku 等云平台
```bash
# 使用平台提供的URL
SERVER_URL=https://your-app.railway.app
CLIENT_URL=https://your-app.railway.app
VITE_API_URL=https://your-app.railway.app
```

## 🔧 关键配置说明

### 1. SERVER_URL
- **用途**: 后端内部API调用地址
- **本地**: `http://localhost:3001`
- **服务器**: `http://服务器IP:3001` 或 `https://域名`
- **Docker**: `http://容器名:3001`

### 2. CLIENT_URL
- **用途**: 前端访问地址，用于CORS配置
- **本地**: `http://localhost:3000`
- **生产**: `https://域名` 或 `http://服务器IP:3000`

### 3. VITE_API_URL
- **用途**: 前端开发时的API代理地址
- **本地**: `http://localhost:3001`
- **生产**: 与SERVER_URL相同

## 🚀 部署步骤

### 1. 准备环境
```bash
# 克隆代码
git clone https://github.com/Jeff010726/ai-customer-dev.git
cd ai-customer-dev

# 复制并编辑配置
cp config.example.env .env
# 根据部署环境修改 .env 文件
```

### 2. 安装依赖
```bash
npm run install:all
```

### 3. 构建前端
```bash
npm run build
```

### 4. 启动服务
```bash
# 生产模式
npm start

# 或开发模式
npm run dev
```

## ⚠️ 常见问题

### 1. API调用失败
- 检查 `SERVER_URL` 是否正确
- 确保端口没有被防火墙阻挡
- 验证服务器是否正常运行

### 2. 前端无法访问后端
- 检查 `VITE_API_URL` 配置
- 确保CORS配置正确
- 验证网络连通性

### 3. 数据库路径问题
- 使用相对路径: `./database.sqlite`
- 或绝对路径: `/app/data/database.sqlite`
- 确保目录有写权限

### 4. 日志文件权限
- 确保 `logs/` 目录存在且可写
- 检查文件权限设置

## 🔒 安全建议

1. **生产环境**:
   - 使用HTTPS
   - 设置强密码
   - 限制API访问

2. **防火墙配置**:
   - 只开放必要端口
   - 配置IP白名单

3. **环境变量**:
   - 不要提交 `.env` 文件
   - 使用平台环境变量管理

## 📝 环境变量模板

```bash
# 基础配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 服务器地址 (根据实际情况修改)
SERVER_URL=https://your-domain.com
CLIENT_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com

# 数据库
DATABASE_URL=./database.sqlite

# API密钥
OPENAI_API_KEY=your_api_key_here

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```