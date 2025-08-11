# YouTube Cookies 获取指南

## 为什么需要Cookies？

YouTube对视频下载有严格的反爬虫限制，需要使用浏览器cookies来模拟正常用户访问。

## 方法1：自动从浏览器获取（推荐）

系统会自动尝试从Chrome浏览器获取cookies，无需手动操作。

## 方法2：手动获取cookies文件

如果自动获取失败，可以手动创建cookies文件：

### 步骤1：登录YouTube
1. 打开Chrome浏览器
2. 访问 https://www.youtube.com
3. 登录你的YouTube账号

### 步骤2：导出cookies
使用以下命令导出cookies到文件：

```bash
python -m yt_dlp --cookies-from-browser chrome --print-cookies > temp/youtube_cookies.txt
```

### 步骤3：测试cookies
```bash
python -m yt_dlp --cookies temp/youtube_cookies.txt --print-json --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## 注意事项

1. **隐私安全**：cookies包含登录信息，请妥善保管
2. **定期更新**：cookies会过期，需要定期更新
3. **合规使用**：请遵守YouTube的使用条款
4. **备选方案**：如果YouTube限制严格，建议使用Bilibili等其他平台

## 故障排除

### 问题1：429 Too Many Requests
- **原因**：请求频率过高
- **解决**：等待一段时间后重试，或使用代理

### 问题2：Sign in to confirm you're not a bot
- **原因**：需要验证身份
- **解决**：确保cookies有效，或手动在浏览器中验证

### 问题3：Video unavailable
- **原因**：视频被删除或设为私有
- **解决**：尝试其他公开视频
