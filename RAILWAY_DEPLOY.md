# Railway.app 部署指南

## 🚀 一键免费部署到Railway

### 准备工作（已完成）
- ✅ GitHub仓库已创建
- ✅ Railway配置文件已添加
- ✅ 构建脚本已优化

### 部署步骤

#### 1. 访问Railway
打开 https://railway.app 并使用GitHub账号登录

#### 2. 创建新项目
- 点击 "New Project"
- 选择 "Deploy from GitHub repo"
- 选择 `Jeff010726/ai-customer-dev`

#### 3. 配置环境变量
在Railway控制台中添加以下环境变量：

```
NODE_ENV=production
OPENAI_API_KEY=你的DeepSeek或OpenAI密钥
OPENAI_MODEL=deepseek-chat
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的邮箱
SMTP_PASS=你的邮箱密码
```

#### 4. 等待部署
- Railway会自动构建和部署
- 通常需要5-10分钟
- 部署完成后会提供一个公网URL

#### 5. 访问应用
- 使用Railway提供的URL访问
- 格式类似：https://your-app.railway.app

### 优势
- ✅ 完全免费（每月500小时）
- ✅ 自动SSL证书（HTTPS）
- ✅ 自动域名
- ✅ 支持自定义域名
- ✅ 自动构建和部署
- ✅ 日志监控
- ✅ 数据库持久化

### 注意事项
- 数据库文件会保存在Railway服务器上
- 如需备份数据，可通过API导出
- 免费计划有每月使用时间限制