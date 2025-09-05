#!/bin/bash

# 🚀 Git部署脚本 - 方案B
# 基于Git仓库的标准化部署流程

set -e

SERVER="root@38.146.30.42"
PROJECT_PATH="~/temp-email-system"
PASSWORD="X33207862q"

echo "🚀 开始Git部署..."

# 1. 推送代码到GitHub
echo "📤 推送代码到GitHub..."
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "没有新的更改需要提交"
git push origin main

# 2. 在服务器上初始化Git仓库（仅首次需要）
echo "🔧 检查服务器Git仓库状态..."
if ! sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git status" 2>/dev/null; then
    echo "📦 初始化服务器Git仓库..."
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git init"
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git remote add origin https://github.com/BigSun120/RealWeb.git"
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git fetch origin"
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git reset --hard origin/main"
fi

# 3. 拉取最新代码
echo "📥 拉取最新代码..."
sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git pull origin main"

# 4. 检查是否有依赖更新
echo "📦 检查依赖更新..."
if sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git diff HEAD~1 --name-only | grep -E 'package.*\.json'" 2>/dev/null; then
    echo "🔄 发现依赖更新，重新安装..."
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH/backend && npm install"
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH/frontend && npm install"
fi

# 5. 检查是否需要构建前端
if sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH && git diff HEAD~1 --name-only | grep -E '^frontend/'" 2>/dev/null; then
    echo "🔨 检测到前端更改，重新构建..."
    sshpass -p "$PASSWORD" ssh $SERVER "cd $PROJECT_PATH/frontend && npm run build"
    sshpass -p "$PASSWORD" ssh $SERVER "rsync -av $PROJECT_PATH/frontend/dist/ /var/www/html/"
else
    echo "ℹ️  前端无更改，跳过构建"
fi

# 6. 重启后端服务
echo "🔄 重启后端服务..."
sshpass -p "$PASSWORD" ssh $SERVER "pm2 restart website-backend"

# 7. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 8. 验证部署
echo "✅ 验证部署..."
HEALTH_CHECK=$(sshpass -p "$PASSWORD" ssh $SERVER "curl -s http://localhost:3001/health")
echo "健康检查结果: $HEALTH_CHECK"

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
    echo "🎉 Git部署成功！"
    echo ""
    echo "🔍 验证地址:"
    echo "- 网站首页: https://godaug.fun"
    echo "- 健康检查: https://godaug.fun/api/health"
    echo "- 管理后台: https://godaug.fun/admin"
else
    echo "❌ 部署验证失败，请检查日志"
    sshpass -p "$PASSWORD" ssh $SERVER "pm2 logs website-backend --lines 10"
    exit 1
fi

echo ""
echo "🚀 Git部署完成！"
