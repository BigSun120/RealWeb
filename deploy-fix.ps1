# 部署头像URL修复
$password = "X33207862q"
$server = "root@38.146.29.35"

Write-Host "🔧 部署头像URL修复..."

# 1. 推送代码
Write-Host "1. 推送代码到GitHub..."
git add .
git commit -m "Fix avatar URL hardcoding - use dynamic origin instead of localhost:8000"
git push origin master

# 2. 服务器拉取代码
Write-Host "2. 服务器拉取最新代码..."
$result1 = echo $password | ssh -o StrictHostKeyChecking=no $server "cd ~/temp-email-system && git pull origin master"
Write-Host $result1

# 3. 构建前端
Write-Host "3. 构建前端..."
$result2 = echo $password | ssh -o StrictHostKeyChecking=no $server "cd ~/temp-email-system/frontend && npm run build"
Write-Host $result2

# 4. 部署前端到nginx
Write-Host "4. 部署前端到nginx..."
$result3 = echo $password | ssh -o StrictHostKeyChecking=no $server "rsync -av ~/temp-email-system/frontend/dist/ /var/www/html/"
Write-Host $result3

# 5. 重启后端服务
Write-Host "5. 重启后端服务..."
$result4 = echo $password | ssh -o StrictHostKeyChecking=no $server "pm2 restart website-backend"
Write-Host $result4

# 6. 验证修复
Write-Host "6. 验证修复..."
$result5 = echo $password | ssh -o StrictHostKeyChecking=no $server "curl -s http://localhost:3001/health"
Write-Host $result5

Write-Host "Deploy completed!"
Write-Host "Avatar URLs should now use correct domain: https://godaug.fun/uploads/..."
