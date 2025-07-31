# 🚀 AI客户开发系统 - 完整部署指南

## 📋 部署选择说明

### ❌ GitHub Pages限制
GitHub Pages只能托管静态文件，**无法运行**：
- Node.js后端服务器
- SQLite数据库
- API路由
- AI接口调用
- 邮件发送功能

### ✅ Railway.app - 推荐方案
- 🆓 **完全免费**（每月500小时）
- 🔄 **自动部署**（GitHub连接）
- 🌐 **HTTPS域名**（自动SSL）
- 📊 **数据持久化**
- 🛠️ **完整后端支持**

## 🎯 一键部署到Railway

### 步骤1：访问Railway
1. 打开：https://railway.app
2. 点击"Sign up"使用**GitHub账号**登录

### 步骤2：创建项目
1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择您的仓库：**`Jeff010726/ai-customer-dev`**
4. 点击 **"Deploy Now"**

### 步骤3：配置环境变量
在Railway控制台点击项目 → **Variables** 标签，添加：

```env
NODE_ENV=production
PORT=3001

# DeepSeek AI配置（推荐）
OPENAI_API_KEY=sk-your_deepseek_api_key_here
OPENAI_MODEL=deepseek-chat

# 网易163邮箱配置（推荐）
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@163.com
SMTP_PASS=your_email_password

# 数据库配置
DATABASE_URL=./database.sqlite
DATABASE_DIALECT=sqlite
```

### 步骤4：等待部署
- ⏱️ 部署时间：5-10分钟
- 📊 实时日志：在Deployments标签查看
- ✅ 成功标志：显示绿色"Success"

### 步骤5：获取访问地址
部署完成后：
1. 点击 **"View App"** 或复制提供的URL
2. 地址格式：`https://your-app-name.railway.app`

## 🔧 环境变量配置详解

### 1. DeepSeek API密钥获取
1. 访问：https://platform.deepseek.com/
2. 注册/登录账号
3. 进入"API Keys"页面
4. 创建新的API密钥
5. 复制密钥（格式：sk-xxxxxxx）

### 2. 网易163邮箱配置
1. 登录网易邮箱：https://mail.163.com
2. 进入"设置" → "客户端设置"
3. 开启"SMTP服务"
4. 记录邮箱地址和密码

### 3. QQ邮箱配置（备选）
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@qq.com
SMTP_PASS=your_authorization_code
```

## 🎉 部署完成！

### 访问应用
- 🌐 **在线地址**：https://your-app.railway.app
- 📱 **手机访问**：同一地址
- 🔒 **HTTPS安全**：自动SSL证书

### 首次使用
1. 访问"设置"页面
2. 配置AI API密钥和邮箱
3. 测试连接成功
4. 开始创建活动

## 🛠️ 常见问题

### Q: 部署失败怎么办？
A: 查看Railway的Deployments日志，通常是环境变量配置错误

### Q: 访问404错误？
A: 等待部署完全完成，通常需要5-10分钟

### Q: AI搜索不工作？
A: 检查DeepSeek API密钥是否正确，账户是否有余额

### Q: 邮件发送失败？
A: 确认邮箱配置正确，网易邮箱开启SMTP服务

### Q: 数据会丢失吗？
A: Railway提供数据持久化，数据不会丢失

## 💰 费用说明
- 🆓 **免费计划**：每月500小时（约20天24小时运行）
- 📊 **用量监控**：Railway控制台实时显示
- 🔄 **自动暂停**：无访问时自动休眠节省时间

## 🚀 开始使用
部署成功后，您就拥有了一个完全在线的AI客户开发系统！