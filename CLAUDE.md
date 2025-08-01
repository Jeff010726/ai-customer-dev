# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Tasks

### Development Environment Setup
```bash
# Install all dependencies (both frontend and backend)
npm run install:all

# Copy and configure environment variables
cp config.example.env .env
# Edit .env file with your API keys and SMTP settings
```

### Service Management (推荐使用)
```bash
# 完整启动（前端 + 后端 + 数据库）- 推荐
npm run start:full

# 只启动前端服务
npm run start:frontend

# 只启动后端服务
npm run start:backend

# 停止所有服务
npm run stop

# 查看服务管理帮助
npm run services
```

### Running in Development Mode (传统方式)
```bash
# Start both frontend and backend servers concurrently
npm run dev

# Or run separately:
npm run server:dev  # Backend with nodemon on port 3001
npm run client:dev  # Frontend with Vite on port 5173
```

### Building for Production
```bash
# Build frontend assets
npm run build

# Start production server
npm start

# Complete setup and start (for fresh deployments)
npm run setup
```

### Database Management
```bash
# Database migrations are handled automatically on server start
# Reset database (development only)
rm database.sqlite
```

### Docker Commands
```bash
npm run docker:build  # Build Docker image
npm run docker:run    # Start with Docker Compose
npm run docker:stop   # Stop containers
```

### Clean Project
```bash
npm run clean  # Remove node_modules, build files, logs, and database
```

## High-Level Architecture

This is an AI-powered customer development system that automates B2B outreach through intelligent web scraping and personalized email generation.

### Frontend Architecture
- **Stack**: React 18 + TypeScript + Material-UI v5
- **Build Tool**: Vite with proxy configuration to backend
- **State Management**: React Query for server state caching
- **Key Pages**: Dashboard, Campaigns, Customers, Emails, Settings
- **API Communication**: Axios with centralized API service (`client/src/services/api.ts`)

### Backend Architecture
- **Framework**: Express.js with modular route structure
- **Database**: Sequelize ORM with SQLite (configurable to MySQL/PostgreSQL)
- **AI Integration**: OpenAI API with support for DeepSeek and GPT models
- **Web Automation**: Playwright/Puppeteer with stealth plugins for anti-detection
- **Email Service**: Nodemailer with SMTP configuration
- **Task System**: Custom task scheduler service for background processing

### Key System Components

1. **Campaign Management** (`server/routes/campaigns.js`)
   - Create marketing campaigns with search criteria
   - Configure target platforms and keywords
   - Set sending strategies and timing

2. **Customer Discovery** (`server/routes/search.js`)
   - Multi-platform web scraping
   - Anti-detection mechanisms (user agent rotation, random delays)
   - Duplicate detection using email/phone matching

3. **AI Email Generation** 
   - Personalized content generation using customer context
   - Template management system
   - Support for multiple AI providers

4. **Email Automation** (`server/routes/emails.js`)
   - Batch email sending with rate limiting
   - Support for Gmail, 163, QQ Mail
   - Delivery tracking and reporting

5. **Task Scheduler** (`server/services/taskScheduler.js`)
   - Background job processing
   - Automated workflow execution
   - Status tracking and error handling

### Database Models
- **Campaign**: Marketing campaign configurations
- **Customer**: Customer information with contact details
- **Email**: Email sending records and tracking
- **EmailTemplate**: Reusable email templates
- **SearchResult**: Web scraping results
- **Task**: Background task management
- **Setting**: System configuration
- **Report**: Analytics and reporting

### Important Patterns

1. **API Response Format**: All endpoints return consistent JSON structure:
   ```javascript
   { success: boolean, data?: any, error?: string }
   ```

2. **Error Handling**: Centralized error handling in routes with proper status codes

3. **Authentication**: Currently no authentication implemented - consider adding for production

4. **Environment Variables**: Required configs in `.env`:
   - `OPENAI_API_KEY`: AI service integration
   - SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - Optional proxy settings for web scraping

5. **Anti-Detection Strategy**: 
   - Random delays between operations
   - User agent rotation
   - Stealth plugins for browser automation
   - Proxy support for IP rotation

### Deployment Considerations

- The system is configured for Railway, Docker, and traditional VPS deployment
- Production builds are optimized with Vite
- SQLite database is suitable for small-medium scale; migrate to PostgreSQL for larger deployments
- Consider rate limiting and compliance with anti-spam regulations
- Recommended daily email limit: 50 emails per account

### Testing
Currently no test framework is implemented. Consider adding:
- Jest for unit testing
- Playwright for E2E testing
- Supertest for API testing