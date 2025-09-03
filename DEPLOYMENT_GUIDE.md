# 🚀 Git 部署指南

本文档详细说明了如何使用 Git 方式进行代码部署和更新。

## 📋 部署环境信息

- **服务器地址**: 38.146.29.35
- **项目路径**: `/root/temp-email-system`
- **Git 仓库**: https://github.com/BigSun120/RealWeb.git
- **主分支**: master
- **服务管理**: PM2 (进程名: website-backend)

## 🎯 快速部署

### 方法一：自动化脚本（推荐）

```bash
# 完整部署（前端 + 后端）
./deploy-git.sh

# 仅部署后端（快速）
./deploy-backend-only.sh
```

### 方法二：npm 命令

```bash
# 完整部署
npm run deploy

# 仅后端部署
npm run deploy:backend
```

## 📝 手动部署步骤

### 1. 本地代码提交

```bash
# 添加所有更改
git add .

# 提交更改
git commit -m "描述你的更改"

# 推送到 GitHub
git push origin master
```

### 2. 服务器代码同步

```bash
# SSH 连接到服务器
ssh root@38.146.29.35

# 进入项目目录
cd ~/temp-email-system

# 拉取最新代码
git pull origin master

# 如果有依赖更新，安装新依赖
npm install

# 如果有前端更改，重新构建
cd frontend && npm run build
rsync -av dist/ /var/www/html/

# 重启后端服务
pm2 restart website-backend

# 验证服务状态
curl http://localhost:3001/health
```

## 🔧 智能部署流程

### 检查更改类型

```bash
# 检查哪些文件发生了更改
git diff --name-only HEAD~1

# 根据更改类型决定部署策略：
# - 仅后端文件：只重启后端服务
# - 包含前端文件：需要重新构建前端
# - 包含 package.json：需要重新安装依赖
```

### 条件部署示例

```bash
#!/bin/bash
cd ~/temp-email-system

# 拉取最新代码
git pull origin master

# 检查是否有依赖更新
if git diff --name-only HEAD~1 | grep -E 'package.*\.json'; then
    echo "发现依赖更新，重新安装..."
    cd backend && npm install
    cd ../frontend && npm install
fi

# 检查是否有前端更改
if git diff --name-only HEAD~1 | grep -E '^frontend/'; then
    echo "发现前端更改，重新构建..."
    cd frontend && npm run build
    rsync -av dist/ /var/www/html/
fi

# 重启后端服务
pm2 restart website-backend

# 验证部署
curl -s http://localhost:3001/health
```

## 🛠️ 常用部署场景

### 场景1：仅修改后端 API

```bash
# 本地提交
git add backend/
git commit -m "Update API endpoints"
git push origin master

# 服务器更新
ssh root@38.146.29.35 "cd ~/temp-email-system && git pull origin master && pm2 restart website-backend"
```

### 场景2：修改前端界面

```bash
# 本地提交
git add frontend/
git commit -m "Update UI components"
git push origin master

# 服务器更新
ssh root@38.146.29.35 "cd ~/temp-email-system && git pull origin master && cd frontend && npm run build && rsync -av dist/ /var/www/html/"
```

### 场景3：添加新依赖

```bash
# 本地安装依赖并提交
npm install new-package
git add package*.json
git commit -m "Add new dependency: new-package"
git push origin master

# 服务器更新
ssh root@38.146.29.35 "cd ~/temp-email-system && git pull origin master && npm install && pm2 restart website-backend"
```

### 场景4：配置文件更新

```bash
# 本地提交配置更改
git add .env.production
git commit -m "Update production config"
git push origin master

# 服务器更新
ssh root@38.146.29.35 "cd ~/temp-email-system && git pull origin master && pm2 restart website-backend"
```

## 🔍 部署验证

### 健康检查

```bash
# 检查服务状态
curl -s http://localhost:3001/health

# 预期返回
{
  "status": "ok",
  "timestamp": "2025-09-02T16:30:34.216Z",
  "uptime": 18.122602084,
  "environment": "production"
}
```

### PM2 状态检查

```bash
# 查看 PM2 进程状态
pm2 list

# 查看服务日志
pm2 logs website-backend

# 查看服务详细信息
pm2 show website-backend
```

### 网站访问验证

- **前端**: https://godaug.fun
- **API**: https://godaug.fun/api/health
- **管理后台**: https://godaug.fun/admin

## ⚠️ 注意事项

### 部署前检查

- [ ] 确保本地代码已测试通过
- [ ] 检查是否有数据库迁移需求
- [ ] 确认环境变量配置正确
- [ ] 备份重要数据（如需要）

### 部署后检查

- [ ] 验证服务健康检查通过
- [ ] 检查前端页面正常加载
- [ ] 验证关键功能正常工作
- [ ] 查看错误日志确认无异常

## 🚨 故障排除

### 常见问题

1. **Git 拉取失败**
   ```bash
   # 重置本地更改
   git reset --hard HEAD
   git pull origin master
   ```

2. **依赖安装失败**
   ```bash
   # 清理缓存重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **服务启动失败**
   ```bash
   # 查看详细错误日志
   pm2 logs website-backend --lines 50
   
   # 重新启动服务
   pm2 delete website-backend
   pm2 start backend/app.js --name website-backend
   ```

4. **前端构建失败**
   ```bash
   # 清理构建缓存
   cd frontend
   rm -rf dist node_modules
   npm install
   npm run build
   ```

### 回滚操作

```bash
# 查看提交历史
git log --oneline -10

# 回滚到指定版本
git reset --hard <commit-hash>
pm2 restart website-backend

# 或者回滚到上一个版本
git reset --hard HEAD~1
pm2 restart website-backend
```

## 📞 技术支持

如遇到部署问题，请：

1. 查看服务器日志：`pm2 logs website-backend`
2. 检查 Git 状态：`git status`
3. 验证服务健康：`curl http://localhost:3001/health`
4. 记录错误信息并联系技术支持

---

**最后更新**: 2025-09-02  
**文档版本**: v1.0
