# 🚀 代码更新部署指南

本文档详细说明如何将本地修改的前后端代码部署到生产服务器。

## 📋 前置条件

- 确保本地开发环境正常
- 确保有服务器 SSH 访问权限
- 确保服务器上的服务正常运行

## 🔄 完整部署流程

### 1. 前端代码更新部署

#### 1.1 本地构建前端
```bash
# 进入前端目录
cd frontend

# 安装依赖（如果是首次部署或依赖有变化）
npm install

# 构建生产版本
npm run build
```

#### 1.2 部署到服务器
```bash
# 上传构建文件到服务器
scp -r dist/* root@38.146.29.35:/var/www/html/

# 或者使用 rsync（推荐，更高效）
rsync -avz --delete dist/ root@38.146.29.35:/var/www/html/
```

#### 1.3 验证前端部署
```bash
# 测试前端是否正常访问
curl -I https://godaug.fun

# 检查静态资源
curl -I https://godaug.fun/assets/index-*.js
```

### 2. 后端代码更新部署

#### 2.1 上传后端文件
```bash
# 上传主要应用文件
scp backend/app.js root@38.146.29.35:~/temp-email-system/backend/

# 上传路由文件（如果有修改）
scp backend/src/routes/*.js root@38.146.29.35:~/temp-email-system/backend/src/routes/

# 上传模型文件（如果有修改）
scp backend/src/models/*.js root@38.146.29.35:~/temp-email-system/backend/src/models/

# 上传中间件文件（如果有修改）
scp backend/src/middleware/*.js root@38.146.29.35:~/temp-email-system/backend/src/middleware/

# 上传控制器文件（如果有修改）
scp backend/src/controllers/*.js root@38.146.29.35:~/temp-email-system/backend/src/controllers/

# 上传配置文件（如果有修改）
scp backend/src/config/*.js root@38.146.29.35:~/temp-email-system/backend/src/config/

# 上传工具文件（如果有修改）
scp backend/src/utils/*.js root@38.146.29.35:~/temp-email-system/backend/src/utils/
```

#### 2.2 更新依赖（如果 package.json 有变化）
```bash
# 上传 package.json
scp backend/package.json root@38.146.29.35:~/temp-email-system/backend/

# SSH 到服务器安装依赖
ssh root@38.146.29.35 "cd ~/temp-email-system/backend && npm install"
```

#### 2.3 重启后端服务
```bash
# SSH 到服务器重启 PM2 进程
ssh root@38.146.29.35 "pm2 restart website-backend"

# 检查服务状态
ssh root@38.146.29.35 "pm2 status"

# 查看日志确认启动正常
ssh root@38.146.29.35 "pm2 logs website-backend --lines 20"
```

#### 2.4 验证后端部署
```bash
# 测试后端健康检查
ssh root@38.146.29.35 "curl -s http://localhost:3001/health"

# 测试 API 接口
ssh root@38.146.29.35 "curl -s https://godaug.fun/api/health"
```

## 🎯 快速部署脚本

### 前端快速部署
创建 `deploy-frontend.sh` 脚本：
```bash
#!/bin/bash
echo "🚀 开始部署前端..."

# 构建前端
cd frontend
npm run build

# 部署到服务器
echo "📤 上传文件到服务器..."
rsync -avz --delete dist/ root@38.146.29.35:/var/www/html/

# 验证部署
echo "✅ 验证部署..."
curl -I https://godaug.fun

echo "🎉 前端部署完成！"
```

### 后端快速部署
创建 `deploy-backend.sh` 脚本：
```bash
#!/bin/bash
echo "🚀 开始部署后端..."

# 上传核心文件
echo "📤 上传后端文件..."
scp backend/app.js root@38.146.29.35:~/temp-email-system/backend/
scp -r backend/src/ root@38.146.29.35:~/temp-email-system/backend/

# 重启服务
echo "🔄 重启后端服务..."
ssh root@38.146.29.35 "pm2 restart website-backend"

# 等待服务启动
sleep 5

# 验证部署
echo "✅ 验证部署..."
ssh root@38.146.29.35 "curl -s http://localhost:3001/health"

echo "🎉 后端部署完成！"
```

## 🔧 常见问题处理

### 1. 前端部署后页面空白
```bash
# 检查文件是否正确上传
ssh root@38.146.29.35 "ls -la /var/www/html/"

# 检查 nginx 配置
ssh root@38.146.29.35 "nginx -t"

# 重启 nginx
ssh root@38.146.29.35 "systemctl reload nginx"
```

### 2. 后端 API 404 错误
```bash
# 检查后端进程状态
ssh root@38.146.29.35 "pm2 status"

# 查看后端日志
ssh root@38.146.29.35 "pm2 logs website-backend"

# 重启后端
ssh root@38.146.29.35 "pm2 restart website-backend"
```

### 3. 数据库连接问题
```bash
# 检查 MongoDB 状态
ssh root@38.146.29.35 "docker ps | grep mongodb"

# 重启 MongoDB 容器
ssh root@38.146.29.35 "docker restart mongodb"
```

## 📝 部署检查清单

### 部署前检查
- [ ] 本地代码已提交到 Git
- [ ] 前端构建无错误
- [ ] 后端测试通过
- [ ] 环境变量配置正确

### 部署后验证
- [ ] 前端页面正常访问
- [ ] API 接口正常响应
- [ ] 用户登录功能正常
- [ ] 数据库连接正常
- [ ] 文件上传功能正常

## 🚨 回滚操作

如果部署出现问题，可以快速回滚：

### 前端回滚
```bash
# 恢复之前的前端文件（需要提前备份）
ssh root@38.146.29.35 "cp -r /var/www/html.backup/* /var/www/html/"
```

### 后端回滚
```bash
# 恢复之前的后端文件
ssh root@38.146.29.35 "cp ~/temp-email-system/backend/app.js.backup ~/temp-email-system/backend/app.js"
ssh root@38.146.29.35 "pm2 restart website-backend"
```

## 💡 最佳实践

1. **备份重要文件**：部署前备份关键配置文件
2. **分步部署**：先部署后端，再部署前端
3. **监控日志**：部署后及时查看日志
4. **测试验证**：每次部署后进行功能测试
5. **版本标记**：使用 Git 标签标记部署版本

## 📞 紧急联系

如果部署过程中遇到严重问题：
1. 立即停止部署操作
2. 查看错误日志
3. 执行回滚操作
4. 记录问题详情以便后续分析
