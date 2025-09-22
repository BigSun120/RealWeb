#!/bin/bash

# 部署修复脚本 - 修复图片上传问题并优化API
# 适用于服务器 74.48.194.227

set -e

SERVER="74.48.194.227"
SERVER_USER="root"
PROJECT_PATH="/root/RealWeb"

echo "🚀 开始部署修复..."

# 1. 上传修复脚本到服务器
echo "📤 上传修复脚本到服务器..."
scp fix-upload-issues.sh ${SERVER_USER}@${SERVER}:/tmp/
ssh ${SERVER_USER}@${SERVER} "chmod +x /tmp/fix-upload-issues.sh"

# 2. 上传优化后的代码文件
echo "📤 上传优化后的代码文件..."
scp backend/src/middleware/upload.js ${SERVER_USER}@${SERVER}:${PROJECT_PATH}/backend/src/middleware/
scp backend/src/routes/users.js ${SERVER_USER}@${SERVER}:${PROJECT_PATH}/backend/src/routes/
scp backend/src/routes/articles.js ${SERVER_USER}@${SERVER}:${PROJECT_PATH}/backend/src/routes/
scp backend/src/routes/backgrounds.js ${SERVER_USER}@${SERVER}:${PROJECT_PATH}/backend/src/routes/

# 3. 在服务器上执行修复脚本
echo "🔧 在服务器上执行修复脚本..."
ssh ${SERVER_USER}@${SERVER} "/tmp/fix-upload-issues.sh"

# 4. 验证修复结果
echo "🧪 验证修复结果..."
sleep 5

# 检查API健康状态
HEALTH_CHECK=$(ssh ${SERVER_USER}@${SERVER} "curl -s http://localhost:8000/api/health")
if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
    echo "✅ 后端API正常"
else
    echo "❌ 后端API异常"
    echo "$HEALTH_CHECK"
fi

# 检查静态文件访问
STATIC_CHECK=$(ssh ${SERVER_USER}@${SERVER} "curl -I -s https://godaug.fun/uploads/ | head -1")
if echo "$STATIC_CHECK" | grep -q "200\|403"; then
    echo "✅ 静态文件服务正常"
else
    echo "❌ 静态文件服务异常"
    echo "$STATIC_CHECK"
fi

# 5. 显示服务状态
echo ""
echo "📊 服务状态:"
ssh ${SERVER_USER}@${SERVER} "pm2 status"

echo ""
echo "🎉 部署修复完成！"
echo ""
echo "🔍 验证步骤:"
echo "1. 访问网站: https://godaug.fun"
echo "2. 登录并尝试上传头像"
echo "3. 在文章编辑器中上传图片"
echo "4. 检查图片是否正常显示"
echo ""
echo "📝 如果仍有问题，请检查:"
echo "- ssh ${SERVER_USER}@${SERVER} 'pm2 logs website-backend'"
echo "- ssh ${SERVER_USER}@${SERVER} 'sudo tail -f /var/log/nginx/error.log'"
echo "- ssh ${SERVER_USER}@${SERVER} 'ls -la /var/www/uploads/'"
