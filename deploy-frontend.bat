@echo off
REM 前端部署脚本 (Windows 版本)
REM 使用方法: deploy-frontend.bat

echo 🚀 开始部署前端到生产服务器...

REM 检查是否在项目根目录
if not exist "frontend" (
    echo ❌ 错误：请在项目根目录执行此脚本
    pause
    exit /b 1
)

REM 进入前端目录
cd frontend

REM 检查 Node.js 和 npm
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm 未安装，请先安装 npm
    pause
    exit /b 1
)

echo 📦 安装/更新依赖...
npm install

echo 🔨 构建生产版本...
npm run build

REM 检查构建是否成功
if not exist "dist" (
    echo ❌ 构建失败：dist 目录不存在
    pause
    exit /b 1
)

echo 📤 上传文件到服务器...

REM 使用 scp 上传文件
scp -r dist/* root@38.146.30.42:/var/www/html/

echo ✅ 验证部署...

REM 测试前端是否正常访问
curl -f -s -I https://godaug.fun >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ 前端页面访问正常
) else (
    echo ⚠️ 前端页面访问异常，请检查
)

echo.
echo 🎉 前端部署完成！
echo 🌐 访问地址: https://godaug.fun
echo 📝 如有问题，请检查 nginx 日志

cd ..
pause
