#!/bin/bash

# 🚀 Git部署脚本 - 方案B
# 基于Git仓库的标准化部署流程

set -e

SERVER="root@38.146.30.39"
PROJECT_PATH="~/RealWeb"
# 注意：请使用SSH密钥认证，避免明文密码

echo "🚀 开始Git部署..."

# 1. 推送代码到GitHub
echo "📤 推送代码到GitHub..."
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "没有新的更改需要提交"
git push origin master

# 2. 在服务器上初始化Git仓库（仅首次需要）
echo "🔧 检查服务器Git仓库状态..."
if ! ssh $SERVER "cd $PROJECT_PATH && git status" 2>/dev/null; then
    echo "📦 初始化服务器Git仓库..."
    ssh $SERVER "cd $PROJECT_PATH && git init"
    ssh $SERVER "cd $PROJECT_PATH && git remote add origin https://github.com/BigSun120/RealWeb.git"
    ssh $SERVER "cd $PROJECT_PATH && git fetch origin"
    ssh $SERVER "cd $PROJECT_PATH && git reset --hard origin/master"
fi

# 3. 拉取最新代码
echo "📥 拉取最新代码..."
ssh $SERVER "cd $PROJECT_PATH && git pull origin master"

# 4. 检查是否有依赖更新
echo "📦 检查依赖更新..."
if ssh $SERVER "cd $PROJECT_PATH && git diff HEAD~1 --name-only | grep -E 'package.*\.json'" 2>/dev/null; then
    echo "🔄 发现依赖更新，重新安装..."
    ssh $SERVER "cd $PROJECT_PATH/backend && npm install"
fi

# 5. 前端构建在本地完成，这里跳过服务器构建
echo "ℹ️  前端构建请在本地完成并使用 scp 上传"

# 6. 重启后端服务
echo "🔄 重启后端服务..."
ssh $SERVER "pm2 restart website-backend"

# 7. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 8. 验证部署
echo "✅ 验证部署..."
HEALTH_CHECK=$(ssh $SERVER "curl -s http://localhost:8000/health")
echo "健康检查结果: $HEALTH_CHECK"

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
    echo "🎉 Git部署成功！"
    echo ""
    echo "🔍 验证地址:"
    echo "- 网站首页: http://godaug.fun"
    echo "- 健康检查: http://godaug.fun/api/health"
    echo "- 管理后台: http://godaug.fun/admin"
else
    echo "❌ 部署验证失败，请检查日志"
    ssh $SERVER "pm2 logs website-backend --lines 10"
    exit 1
fi

echo ""
echo "🚀 Git部署完成！"
