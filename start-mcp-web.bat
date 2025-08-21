@echo off
echo 🌐 启动MCP Web模式...
echo.

REM 设置环境变量
set MCP_DESKTOP_MODE=false
set MCP_WEB_HOST=127.0.0.1
set MCP_WEB_PORT=8765
set MCP_DEBUG=false
set MCP_LANGUAGE=zh-CN

echo 📋 配置信息:
echo   - Web模式: %MCP_DESKTOP_MODE%
echo   - 主机地址: %MCP_WEB_HOST%
echo   - 端口: %MCP_WEB_PORT%
echo   - 语言: %MCP_LANGUAGE%
echo.

echo 🚀 正在启动Web界面...
echo 浏览器将自动打开: http://%MCP_WEB_HOST%:%MCP_WEB_PORT%
uvx mcp-feedback-enhanced@latest test --web

pause
