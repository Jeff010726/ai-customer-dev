#!/bin/bash

# AI客户开发系统 - 部署脚本
echo "🚀 开始部署 AI客户开发系统..."

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ 需要Node.js 18或更高版本，当前版本: $(node -v)"
    exit 1
fi
echo "✅ Node.js版本检查通过: $(node -v)"

# 安装依赖
echo "📦 安装依赖..."
npm run install:all
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 检查环境配置
echo "🔧 检查环境配置..."
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，从示例文件创建..."
    cp config.example.env .env
    echo "📝 请编辑.env文件并配置您的API密钥和邮箱信息"
    echo "⏸️  配置完成后，请重新运行此脚本"
    exit 0
fi

# 构建客户端
echo "🔨 构建客户端..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 客户端构建失败"
    exit 1
fi

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p logs

# 启动服务
echo "🎯 启动服务..."
echo "📊 服务将在 http://localhost:3001 运行"
echo "🌐 前端将在 http://localhost:3001 访问"
echo ""
echo "🎉 部署完成！正在启动服务..."
npm start