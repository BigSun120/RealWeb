#!/bin/bash

# ⚡ 快速后端部署脚本
# 仅更新后端代码，跳过前端构建

set -e

SERVER="root@38.146.30.42"
PROJECT_PATH="~/temp-email-system"
PASSWORD="X33207862q"

echo "⚡ 开始快速后端部署..."

# 1. 推送代码到GitHub
echo "📤 推送代码到GitHub..."
git add .
git commit -m "Backend update: $(date '+%Y-%m-%d %H:%M:%S')" || echo "没有新的更改需要提交"
git push origin main

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git pull origin main"

# 3. 检查后端依赖更新
if sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git diff HEAD~1 --name-only | grep -E 'backend/package.*\.json'" 2>/dev/null; then
    echo "🔄 发现后端依赖更新，重新安装..."
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH/backend && npm install"
fi

# 4. 重启后端服务
echo "🔄 重启后端服务..."
sshpass -p "$PASSWORD" ssh $SERVER "pm2 restart website-backend"

# 5. 验证部署
echo "✅ 验证部署..."
sleep 3
HEALTH_CHECK=$(sshpass -p "$PASSWORD" ssh $SERVER "curl -s http://localhost:3001/health")

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
    echo "🎉 后端部署成功！"
else
    echo "❌ 部署验证失败"
    exit 1
fi

echo "⚡ 快速后端部署完成！"
