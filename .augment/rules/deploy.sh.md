---
type: "always_apply"
---

#!/bin/bash

# 网站部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始部署网站..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 版本过低，需要 16+，当前版本: $(node -v)"
    exit 1
fi

# 检查MongoDB
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB 未安装，请确保 MongoDB 服务可用"
fi

# 安装依赖
echo "📦 安装依赖..."
npm run setup

# 构建前端
echo "🔨 构建前端..."
npm run build

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，从示例文件复制..."
    cp rules/.env.example .env
    echo "📝 请编辑 .env 文件配置实际参数"
fi

# 选择部署方式
echo "🎯 选择部署方式:"
echo "1) 直接运行 (npm start)"
echo "2) PM2 管理 (推荐生产环境)"
read -p "请选择 (1-2): " choice

case $choice in
    1)
        echo "🏃 直接启动服务..."
        npm start
        ;;
    2)
        # 检查PM2
        if ! command -v pm2 &> /dev/null; then
            echo "📦 安装 PM2..."
            npm install -g pm2
        fi
        
        echo "🏃 使用 PM2 启动服务..."
        pm2 start backend/app.js --name website
        pm2 startup
        pm2 save
        
        echo "✅ 服务已启动，使用以下命令管理:"
        echo "   pm2 status        - 查看状态"
        echo "   pm2 logs website  - 查看日志"
        echo "   pm2 restart website - 重启服务"
        echo "   pm2 stop website  - 停止服务"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 部署完成！"
echo "📱 前端访问: http://localhost:3000"
echo "🔗 API访问: http://localhost:8000"
echo "📊 健康检查: http://localhost:8000/health"
