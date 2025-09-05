@echo off
REM 后端部署脚本 (Windows 版本)
REM 使用方法: deploy-backend.bat

echo 🚀 开始部署后端到生产服务器...

REM 检查是否在项目根目录
if not exist "backend" (
    echo ❌ 错误：请在项目根目录执行此脚本
    pause
    exit /b 1
)

REM 服务器信息
set SERVER=root@38.146.30.42
set BACKEND_PATH=~/temp-email-system/backend

echo 📤 上传后端文件...

REM 上传主要应用文件
echo 上传 app.js...
scp backend/app.js %SERVER%:%BACKEND_PATH%/

REM 上传 package.json
echo 上传 package.json...
scp backend/package.json %SERVER%:%BACKEND_PATH%/

REM 上传源代码目录
echo 上传源代码...
scp -r backend/src/ %SERVER%:%BACKEND_PATH%/

echo 📦 安装/更新依赖...
ssh %SERVER% "cd %BACKEND_PATH% && npm install"

echo 🔄 重启后端服务...

REM 重启 PM2 进程
ssh %SERVER% "pm2 restart website-backend"

REM 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo 🔍 检查服务状态...
ssh %SERVER% "pm2 status | grep website-backend"

echo ✅ 验证部署...

REM 测试后端健康检查
ssh %SERVER% "curl -f -s http://localhost:3001/health" >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ 后端健康检查正常
) else (
    echo ❌ 后端健康检查失败
    echo 📋 查看日志:
    ssh %SERVER% "pm2 logs website-backend --lines 10"
    pause
    exit /b 1
)

REM 测试 API 接口
ssh %SERVER% "curl -f -s https://godaug.fun/api/health" >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ API 接口访问正常
) else (
    echo ⚠️ API 接口访问异常，请检查 nginx 配置
)

echo.
echo 🎉 后端部署完成！
echo 🔗 API 地址: https://godaug.fun/api
echo 📊 服务状态: ssh %SERVER% "pm2 status"
echo 📝 查看日志: ssh %SERVER% "pm2 logs website-backend"
echo 🔄 重启服务: ssh %SERVER% "pm2 restart website-backend"

pause
