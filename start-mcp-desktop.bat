@echo off
echo 🖥️ 启动MCP桌面模式...
echo.

REM 设置环境变量
set MCP_DESKTOP_MODE=true
set MCP_WEB_HOST=127.0.0.1
set MCP_WEB_PORT=8765
set MCP_DEBUG=false
set MCP_LANGUAGE=zh-CN

echo 📋 配置信息:
echo   - 桌面模式: %MCP_DESKTOP_MODE%
echo   - 主机地址: %MCP_WEB_HOST%
echo   - 端口: %MCP_WEB_PORT%
echo   - 语言: %MCP_LANGUAGE%
echo.

echo 🚀 正在启动桌面应用程序...
uvx mcp-feedback-enhanced@latest test --desktop

pause
