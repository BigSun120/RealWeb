@echo off
echo 安装爱奇艺解析器完整依赖...

echo.
echo 1. 安装Python依赖...
pip install execjs
pip install PyExecJS

echo.
echo 2. 检查Node.js环境...
node --version
if %errorlevel% neq 0 (
    echo 错误：需要安装Node.js才能使用execjs
    echo 请访问 https://nodejs.org/ 下载安装Node.js
    pause
    exit /b 1
)

echo.
echo 3. 测试execjs...
python -c "import execjs; print('execjs安装成功:', execjs.get().name)"

echo.
echo ✅ 爱奇艺解析器完整依赖安装完成！
echo 现在可以使用完整的爱奇艺解析功能了。
pause
