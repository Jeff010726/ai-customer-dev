# AI客户开发系统

🤖 智能自动化客户开发工具，使用AI技术自动搜索买手店信息、生成个性化开发信并自动发送。

## 功能特点

- 🔍 **智能搜索**：自动在多个平台搜索目标客户信息
- 🤖 **AI内容生成**：使用GPT生成个性化开发信
- 📧 **自动发送**：模拟人工操作自动发送邮件  
- 🎭 **反检测系统**：随机延时、用户代理轮换、人性化操作
- 📊 **数据管理**：客户信息存储、重复检测、发送记录
- ⚙️ **自定义配置**：可配置搜索平台、条件、发送策略

## 技术架构

- **前端**：React + TypeScript + Material-UI
- **后端**：Node.js + Express + Sequelize
- **数据库**：SQLite (可扩展至MySQL/PostgreSQL)
- **自动化**：Playwright + Puppeteer
- **AI引擎**：OpenAI GPT API

## 系统要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn 包管理器
- 操作系统：Windows、macOS 或 Linux

## 快速开始

### 1. 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
npm install
cd client && npm install
```

### 2. 配置环境变量

```bash
# 复制配置文件
cp config.example.env .env

# 编辑配置文件，填入你的API密钥
# Windows: notepad .env
# Linux/macOS: nano .env
```

**必须配置的重要参数：**

```env
# OpenAI API密钥（必需）
OPENAI_API_KEY=your_openai_api_key_here

# 邮箱SMTP配置（必需）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 其他配置保持默认即可
```

### 3. 启动开发服务器

```bash
# 同时启动前后端开发服务器
npm run dev
```

这将启动：
- 后端API服务器：http://localhost:3001
- 前端开发界面：http://localhost:3000

### 4. 生产部署

```bash
# 构建并启动
npm run setup
npm start
```

## 初次使用

1. **访问系统设置**：首次进入后，先到"系统设置"页面配置必要参数
2. **创建活动**：在"活动管理"中创建您的第一个营销活动
3. **设置搜索条件**：配置目标平台和搜索关键词
4. **启动活动**：开始自动搜索和邮件发送

## 功能模块

### 活动管理
- 创建营销活动
- 配置搜索平台和关键词
- 设置发送策略和时间

### 客户管理
- 查看搜索结果
- 管理客户信息
- 跟踪联系状态

### 邮件系统
- AI生成个性化开发信
- 自动发送和跟踪
- 回复率统计

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # Windows检查端口占用
   netstat -ano | findstr :3000
   # macOS/Linux检查端口占用
   lsof -ti:3000
   ```

2. **数据库连接失败**
   - 检查SQLite文件权限
   - 确保logs目录存在

3. **API密钥错误**
   - 验证OpenAI API密钥是否正确
   - 检查账户余额是否充足

4. **邮件发送失败**
   - 确认SMTP设置正确
   - 对于Gmail，使用应用密码而非账户密码

### 日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# Windows用户可以直接打开日志文件
notepad logs/app.log
```

## API文档

### 核心接口

- `POST /api/campaigns` - 创建新的营销活动
- `GET /api/campaigns` - 获取活动列表
- `POST /api/emails/generate` - 生成开发信
- `POST /api/emails/send` - 发送邮件
- `GET /api/customers` - 获取客户列表
- `GET /api/health` - 健康检查

## 目录结构

```
ai-customer-development/
├── client/              # React前端应用
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── pages/       # 页面组件
│   │   └── services/    # API服务
├── server/              # Node.js后端
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   └── utils/           # 工具函数
├── logs/                # 日志文件（运行时生成）
├── database.sqlite      # SQLite数据库（运行时生成）
└── config.example.env   # 环境变量示例
```

## 重要提醒

⚠️ **合规使用提醒**：

1. **遵守法律法规**：确保符合反垃圾邮件法律
2. **尊重网站条款**：遵守目标网站的robots.txt和使用条款
3. **适度使用**：建议每日发送量不超过50封
4. **提供退订**：在邮件中包含退订链接
5. **数据保护**：妥善保护客户信息，定期备份数据库
6. **API配额**：注意OpenAI API使用量和费用

## 许可证

MIT License 