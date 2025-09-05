#!/bin/bash

# 前端部署脚本
# 使用方法: ./deploy-frontend.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署前端到生产服务器..."

# 检查是否在项目根目录
if [ ! -d "frontend" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 进入前端目录
cd frontend

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "📦 安装/更新依赖..."
npm install

echo "🔨 构建生产版本..."
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "❌ 构建失败：dist 目录不存在"
    exit 1
fi

echo "📤 上传文件到服务器..."

# 使用 rsync 同步文件（更高效，支持增量更新）
if command -v rsync &> /dev/null; then
    echo "使用 rsync 同步文件..."
    rsync -avz --delete --progress dist/ root@38.146.30.42:/var/www/html/
else
    echo "使用 scp 上传文件..."
    scp -r dist/* root@38.146.30.42:/var/www/html/
fi

echo "✅ 验证部署..."

# 测试前端是否正常访问
if curl -f -s -I https://godaug.fun > /dev/null; then
    echo "✅ 前端页面访问正常"
else
    echo "⚠️  前端页面访问异常，请检查"
fi

# 测试静态资源
echo "🔍 检查静态资源..."
ssh root@38.146.30.42 "ls -la /var/www/html/ | head -10"

echo ""
echo "🎉 前端部署完成！"
echo "🌐 访问地址: https://godaug.fun"
echo "📝 如有问题，请检查 nginx 日志: ssh root@38.146.30.42 'tail -f /var/log/nginx/error.log'"

cd ..
