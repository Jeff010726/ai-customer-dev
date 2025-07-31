# AI客户开发系统 - Docker配置
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json文件
COPY package*.json ./
COPY client/package*.json ./client/

# 安装依赖
RUN npm install
RUN cd client && npm install

# 复制源代码
COPY . .

# 构建客户端
RUN npm run build

# 创建日志目录
RUN mkdir -p logs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]