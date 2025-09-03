# 🚀 Git 部署参考卡片

## 📝 常用部署命令

### 🎯 Git 部署（推荐）

```bash
# 完整部署（前端 + 后端）
./deploy-git.sh

# 仅部署后端（快速）
./deploy-backend-only.sh

# 手动Git部署
ssh root@38.146.29.35 "cd ~/temp-email-system && git pull && npm run build && pm2 restart website-backend"
```

### 🔧 手动部署命令

#### 标准 Git 部署流程

```bash
# 1. 本地提交代码
git add .
git commit -m "描述更改"
git push origin master

# 2. 服务器同步代码
ssh root@38.146.29.35 "cd ~/temp-email-system && git pull origin master"

# 3. 重启服务
ssh root@38.146.29.35 "pm2 restart website-backend"

# 4. 验证部署
ssh root@38.146.29.35 "curl -s http://localhost:3001/health"
```

#### 包含依赖更新的部署

```bash
# 额外执行依赖安装
ssh root@38.146.29.35 "cd ~/temp-email-system/backend && npm install"
```

#### 包含前端更新的部署

```bash
# 额外执行前端构建
ssh root@38.146.29.35 "cd ~/temp-email-system/frontend && npm run build && rsync -av dist/ /var/www/html/"
```

## 🔍 常用检查命令

### 服务状态检查

```bash
# PM2 进程状态
ssh root@38.146.29.35 "pm2 status"

# 后端日志
ssh root@38.146.29.35 "pm2 logs website-backend --lines 20"

# Nginx 状态
ssh root@38.146.29.35 "systemctl status nginx"

# 数据库状态
ssh root@38.146.29.35 "docker ps | grep mongodb"
```

### API 测试

```bash
# 健康检查
curl https://godaug.fun/api/health

# 文章接口
curl https://godaug.fun/api/articles?limit=1

# 工具接口
curl https://godaug.fun/api/tools?limit=1
```

## 🚨 故障排除

### 前端问题

```bash
# 检查文件上传
ssh root@38.146.29.35 "ls -la /var/www/html/"

# 重启 Nginx
ssh root@38.146.29.35 "systemctl reload nginx"

# 查看 Nginx 错误日志
ssh root@38.146.29.35 "tail -f /var/log/nginx/error.log"
```

### 后端问题

```bash
# 重启后端
ssh root@38.146.29.35 "pm2 restart website-backend"

# 查看详细日志
ssh root@38.146.29.35 "pm2 logs website-backend"

# 检查端口监听
ssh root@38.146.29.35 "ss -tlnp | grep :3001"
```

### 数据库问题

```bash
# 重启 MongoDB
ssh root@38.146.29.35 "docker restart mongodb"

# 检查数据库连接
ssh root@38.146.29.35 "docker exec mongodb mongosh --eval 'db.runCommand({ping:1})'"
```

## 📋 部署检查清单

### 部署前 ✅

- [ ] 代码已保存并测试
- [ ] 确认要部署的功能
- [ ] 备份重要数据（如需要）

### 部署后 ✅

- [ ] 前端页面正常加载
- [ ] 用户登录功能正常
- [ ] API 接口响应正常
- [ ] 管理后台可访问
- [ ] 数据库操作正常

## 🔄 回滚操作

### 快速回滚后端

```bash
# 恢复备份文件
ssh root@38.146.29.35 "cd ~/temp-email-system/backend && cp app.js.backup.* app.js"
ssh root@38.146.29.35 "pm2 restart website-backend"
```

### 快速回滚前端

```bash
# 重新部署之前的版本（需要本地有备份）
rsync -avz --delete frontend/dist.backup/ root@38.146.29.35:/var/www/html/
```

## 📞 重要地址

- **网站首页**: https://godaug.fun
- **管理后台**: https://godaug.fun/admin
- **API 基础地址**: https://godaug.fun/api
- **健康检查**: https://godaug.fun/api/health

## 💡 最佳实践

1. **小步快跑**: 频繁小量部署，降低风险
2. **先后端后前端**: 确保 API 稳定后再更新前端
3. **及时验证**: 每次部署后立即测试核心功能
4. **保留日志**: 部署过程中注意观察日志输出
5. **备份重要**: 重大更新前备份数据库和配置文件
