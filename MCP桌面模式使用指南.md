# 🖥️ MCP桌面模式使用指南

## 📋 概述
MCP Feedback Enhanced 是一个增强版的MCP服务器，支持Web UI和桌面应用程序双界面模式。你已经成功安装了v2.6.0版本。

## 🎯 桌面模式特点
- 🖥️ **原生桌面体验** - 基于Tauri框架的跨平台应用
- 🚀 **高性能** - 原生应用性能，无浏览器依赖
- 🔧 **统一功能** - 与Web UI完全相同的功能体验
- 📱 **快捷键支持** - 支持Ctrl+Enter提交、Ctrl+V粘贴图片等

## ⚙️ 配置方法

### 1. 桌面模式配置
将以下配置添加到你的AI助手的MCP配置文件中：

```json
{
  "mcpServers": {
    "mcp-feedback-enhanced": {
      "command": "uvx",
      "args": ["mcp-feedback-enhanced@latest"],
      "timeout": 600,
      "env": {
        "MCP_DESKTOP_MODE": "true",
        "MCP_WEB_HOST": "127.0.0.1",
        "MCP_WEB_PORT": "8765",
        "MCP_DEBUG": "false",
        "MCP_LANGUAGE": "zh-CN"
      },
      "autoApprove": ["interactive_feedback"]
    }
  }
}
```

### 2. 环境变量说明
- `MCP_DESKTOP_MODE`: 设为"true"启用桌面模式
- `MCP_WEB_HOST`: Web服务主机地址
- `MCP_WEB_PORT`: Web服务端口
- `MCP_DEBUG`: 调试模式开关
- `MCP_LANGUAGE`: 界面语言（zh-CN/zh-TW/en）

## 🚀 使用步骤

### 1. 测试桌面应用
```bash
uvx mcp-feedback-enhanced@latest test --desktop
```

### 2. 测试Web界面（备用）
```bash
uvx mcp-feedback-enhanced@latest test --web
```

### 3. 在AI助手中使用
1. 配置MCP服务器（使用上面的配置）
2. 重启AI助手
3. 调用`interactive_feedback`工具
4. 桌面应用程序会自动启动

## 🎨 功能特性

### 📝 智能工作流
- **提示管理** - 常用提示的增删改查、使用统计
- **自动定时提交** - 1-86400秒灵活定时器
- **自动命令执行** - 创建会话或提交后自动执行预设命令
- **会话管理** - 本地文件存储、历史导出、实时统计

### 🖼️ 图片和媒体
- **全格式支持** - PNG、JPG、JPEG、GIF、BMP、WebP
- **便捷上传** - 拖拽文件、剪贴板粘贴（Ctrl+V）
- **无限处理** - 支持任意大小图片

### 🎯 快捷键
- `Ctrl+Enter` - 提交反馈
- `Ctrl+V` - 直接粘贴剪贴板图片
- `Ctrl+I` - 快速聚焦输入框

## 🔧 故障排除

### 常见问题
1. **桌面应用无法启动**
   - 检查是否有杀毒软件阻止
   - 确认端口8765未被占用
   - 重新运行测试命令

2. **WebSocket连接失败**
   - 刷新浏览器页面
   - 检查防火墙设置
   - 确认MCP服务正常运行

3. **内存使用率高**
   - 系统会自动清理内存
   - 可以重启桌面应用

### 日志查看
桌面模式运行时会显示详细日志，包括：
- 服务启动状态
- WebSocket连接状态
- 会话管理信息
- 内存监控信息

## 📁 配置文件位置
- **设置文件**: `~/.config/mcp-feedback-enhanced/ui_settings.json`
- **桌面应用**: 自动下载到uv缓存目录

## 🎉 成功标志
当你看到以下信息时，表示桌面模式已成功启动：
```
[SERVER] Tauri 桌面應用程式已啟動
[SERVER] 桌面應用程式已啟動，後端服務: http://127.0.0.1:8765
```

现在你可以在AI助手中配置并使用MCP桌面模式了！
