@echo off
chcp 65001 >nul
title 个人网站开发环境启动

echo.
echo ========================================
echo    个人网站开发环境启动脚本
echo ========================================
echo.

:: 检查Docker是否安装
echo 🔍 检查Docker环境...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker未安装，请先安装Docker Desktop
    echo 💡 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo ✅ Docker已安装

:: 检查Inbucket是否已运行
echo 🔍 检查邮箱服务状态...
docker ps | findstr "inbucket-dev" >nul 2>&1
if %errorlevel% equ 0 (
    echo ℹ️  Inbucket邮箱服务已在运行
) else (
    echo 🚀 启动Inbucket邮箱服务...
    docker run -d --name inbucket-dev ^
        -p 9000:9000 ^
        -p 2500:2500 ^
        -p 1100:1100 ^
        -e INBUCKET_SMTP_DOMAIN=localhost,test.local,dev.local,example.com,tempmail.dev ^
        -e INBUCKET_WEB_CORSORIGIN=http://localhost:3000,http://localhost:5173 ^
        inbucket/inbucket:latest
    
    if %errorlevel% equ 0 (
        echo ✅ Inbucket邮箱服务启动成功
    ) else (
        echo ❌ Inbucket启动失败
        pause
        exit /b 1
    )
)

:: 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 3 /nobreak >nul

echo.
echo 🎉 邮箱服务启动完成！
echo.
echo 📧 邮箱Web界面: http://localhost:9000
echo 📨 SMTP服务器: localhost:2500
echo 📥 POP3服务器: localhost:1100
echo.
echo 💡 现在可以运行 npm run dev 启动前后端服务
echo 💡 使用 npm run email:stop 停止邮箱服务
echo.
pause
