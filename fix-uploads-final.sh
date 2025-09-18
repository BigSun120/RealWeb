#!/bin/bash

echo "🔧 最终修复uploads配置..."

# 1. 确保服务器上的环境变量正确
echo "📝 确认环境变量配置..."
ssh 38.146.30.39 -l root "cd ~/RealWeb && grep UPLOAD_PATH .env"

# 2. 确保目录存在且权限正确
echo "📁 确保uploads目录结构正确..."
ssh 38.146.30.39 -l root "
cd ~/RealWeb
mkdir -p backend/uploads/articles
mkdir -p backend/uploads/avatars
mkdir -p backend/uploads/backgrounds
chmod -R 755 backend/uploads
chown -R root:root backend/uploads
echo '✅ 目录结构已确保'
"

# 3. 清理测试文件
echo "🧹 清理测试文件..."
ssh 38.146.30.39 -l root "rm -f /root/RealWeb/backend/uploads/articles/test.txt"

# 4. 重启服务并更新环境变量
echo "🔄 重启服务..."
ssh 38.146.30.39 -l root "cd ~/RealWeb && pm2 restart website-backend --update-env"

# 5. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 6. 测试静态文件服务
echo "🧪 测试静态文件服务..."
ssh 38.146.30.39 -l root "
echo 'test content' > /root/RealWeb/backend/uploads/articles/test-$(date +%s).txt
curl -s -o /dev/null -w '%{http_code}' https://godaug.fun/uploads/articles/test-$(date +%s).txt
"

echo "✅ 修复完成！"
echo ""
echo "📋 请现在测试："
echo "1. 在文章编辑器中上传一张图片"
echo "2. 检查图片是否能正常预览"
echo "3. 如果还有问题，请检查浏览器控制台的错误信息"
