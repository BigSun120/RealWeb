#!/bin/bash

# 后端部署脚本
# 使用方法: ./deploy-backend.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署后端到生产服务器..."

# 检查是否在项目根目录
if [ ! -d "backend" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 服务器信息
SERVER="root@38.146.29.35"
BACKEND_PATH="~/temp-email-system/backend"

echo "📤 上传后端文件..."

# 上传主要应用文件
echo "上传 app.js..."
scp backend/app.js $SERVER:$BACKEND_PATH/

# 上传 package.json（如果有变化）
echo "上传 package.json..."
scp backend/package.json $SERVER:$BACKEND_PATH/

# 上传源代码目录
echo "上传源代码..."
scp -r backend/src/ $SERVER:$BACKEND_PATH/

# 检查是否需要安装依赖
echo "🔍 检查依赖..."
PACKAGE_CHANGED=$(ssh $SERVER "cd $BACKEND_PATH && git diff HEAD~1 package.json" 2>/dev/null || echo "changed")

if [ -n "$PACKAGE_CHANGED" ]; then
    echo "📦 安装/更新依赖..."
    ssh $SERVER "cd $BACKEND_PATH && npm install"
else
    echo "✅ 依赖无变化，跳过安装"
fi

# 备份当前运行的版本（可选）
echo "💾 备份当前版本..."
ssh $SERVER "cd $BACKEND_PATH && cp app.js app.js.backup.$(date +%Y%m%d_%H%M%S)" || true

echo "🔄 重启后端服务..."

# 重启 PM2 进程
ssh $SERVER "pm2 restart website-backend"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "🔍 检查服务状态..."
ssh $SERVER "pm2 status | grep website-backend"

echo "✅ 验证部署..."

# 测试后端健康检查
if ssh $SERVER "curl -f -s http://localhost:3001/health" > /dev/null; then
    echo "✅ 后端健康检查正常"
else
    echo "❌ 后端健康检查失败"
    echo "📋 查看日志:"
    ssh $SERVER "pm2 logs website-backend --lines 10"
    exit 1
fi

# 测试 API 接口
if ssh $SERVER "curl -f -s https://godaug.fun/api/health" > /dev/null; then
    echo "✅ API 接口访问正常"
else
    echo "⚠️  API 接口访问异常，请检查 nginx 配置"
fi

echo ""
echo "🎉 后端部署完成！"
echo "🔗 API 地址: https://godaug.fun/api"
echo "📊 服务状态: ssh $SERVER 'pm2 status'"
echo "📝 查看日志: ssh $SERVER 'pm2 logs website-backend'"
echo "🔄 重启服务: ssh $SERVER 'pm2 restart website-backend'"
