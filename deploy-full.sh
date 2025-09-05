#!/bin/bash

# 完整部署脚本（前端 + 后端）
# 使用方法: ./deploy-full.sh

set -e  # 遇到错误立即退出

echo "🚀 开始完整部署（前端 + 后端）..."

# 检查是否在项目根目录
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 询问用户确认
read -p "确定要部署到生产服务器吗？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 部署已取消"
    exit 1
fi

echo "📋 部署计划："
echo "  1. 部署后端代码"
echo "  2. 部署前端代码"
echo "  3. 验证部署结果"
echo ""

# 第一步：部署后端
echo "🔧 步骤 1/3: 部署后端..."
if ./deploy-backend.sh; then
    echo "✅ 后端部署成功"
else
    echo "❌ 后端部署失败，停止部署"
    exit 1
fi

echo ""

# 第二步：部署前端
echo "🎨 步骤 2/3: 部署前端..."
if ./deploy-frontend.sh; then
    echo "✅ 前端部署成功"
else
    echo "❌ 前端部署失败"
    exit 1
fi

echo ""

# 第三步：完整验证
echo "🔍 步骤 3/3: 完整验证..."

SERVER="root@38.146.30.42"

# 验证前端
echo "验证前端..."
if curl -f -s -I https://godaug.fun > /dev/null; then
    echo "✅ 前端访问正常"
else
    echo "❌ 前端访问失败"
fi

# 验证后端 API
echo "验证后端 API..."
if ssh $SERVER "curl -f -s https://godaug.fun/api/health" > /dev/null; then
    echo "✅ 后端 API 正常"
else
    echo "❌ 后端 API 失败"
fi

# 验证数据库连接
echo "验证数据库连接..."
if ssh $SERVER "curl -f -s https://godaug.fun/api/articles?limit=1" > /dev/null; then
    echo "✅ 数据库连接正常"
else
    echo "⚠️  数据库连接可能有问题"
fi

echo ""
echo "🎉 完整部署完成！"
echo ""
echo "📊 部署摘要："
echo "  🌐 网站地址: https://godaug.fun"
echo "  🔗 API 地址: https://godaug.fun/api"
echo "  👤 管理后台: https://godaug.fun/admin"
echo ""
echo "🔧 管理命令："
echo "  查看后端状态: ssh $SERVER 'pm2 status'"
echo "  查看后端日志: ssh $SERVER 'pm2 logs website-backend'"
echo "  重启后端: ssh $SERVER 'pm2 restart website-backend'"
echo "  查看 nginx 日志: ssh $SERVER 'tail -f /var/log/nginx/error.log'"
echo ""
echo "✅ 部署完成，请进行功能测试！"
