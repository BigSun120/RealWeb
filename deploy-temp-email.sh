#!/bin/bash

# 临时邮箱系统部署脚本
# 使用方法: ./deploy-temp-email.sh [环境]
# 环境: dev | prod

set -e

ENVIRONMENT=${1:-prod}
DOMAIN="godaug.fun"

echo "🚀 开始部署临时邮箱系统 (环境: $ENVIRONMENT)"

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建目录结构..."
mkdir -p logs
mkdir -p ssl
mkdir -p nginx

# 设置环境变量
echo "🔧 设置环境变量..."
export DOMAIN=$DOMAIN
export NODE_ENV=$ENVIRONMENT

# 构建和启动服务
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🏗️ 构建生产环境..."
    
    # 检查SSL证书
    if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
        echo "⚠️ SSL证书不存在，将使用HTTP模式"
        echo "请运行以下命令获取SSL证书:"
        echo "sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN"
    fi
    
    # 停止现有服务
    docker-compose -f docker-compose.prod.yml down
    
    # 构建并启动服务
    docker-compose -f docker-compose.prod.yml up --build -d
    
    echo "✅ 生产环境部署完成!"
    echo "🌐 网站地址: https://$DOMAIN"
    echo "📧 邮件管理: https://$DOMAIN/admin"
    
else
    echo "🏗️ 构建开发环境..."
    
    # 停止现有服务
    docker-compose -f docker-compose.dev.yml down
    
    # 启动开发服务
    docker-compose -f docker-compose.dev.yml up -d
    
    echo "✅ 开发环境部署完成!"
    echo "🌐 前端地址: http://localhost:3000"
    echo "🔧 后端地址: http://localhost:5000"
    echo "📧 Inbucket: http://localhost:9000"
fi

# 显示服务状态
echo ""
echo "📊 服务状态:"
docker-compose -f docker-compose.$ENVIRONMENT.yml ps

# 显示日志
echo ""
echo "📝 最近日志:"
docker-compose -f docker-compose.$ENVIRONMENT.yml logs --tail=20

echo ""
echo "🎉 部署完成!"
echo ""
echo "📋 常用命令:"
echo "  查看日志: docker-compose -f docker-compose.$ENVIRONMENT.yml logs -f"
echo "  重启服务: docker-compose -f docker-compose.$ENVIRONMENT.yml restart"
echo "  停止服务: docker-compose -f docker-compose.$ENVIRONMENT.yml down"
echo "  更新服务: ./deploy-temp-email.sh $ENVIRONMENT"
