# 环境配置指南

本项目支持开发环境和生产环境的自动切换，确保在不同环境下都能正常运行。

## 🚀 快速开始

### 开发环境设置

1. **切换到开发环境配置**
   ```bash
   npm run env:dev
   ```

2. **启动本地MongoDB（如果没有安装）**
   ```bash
   # 使用Docker启动MongoDB
   docker run -d --name mongodb-dev -p 27017:27017 mongo:latest
   
   # 或者安装本地MongoDB服务
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   - 前端: http://localhost:3000
   - 后端API: http://localhost:8000
   - 健康检查: http://localhost:8000/health

### 生产环境设置

1. **切换到生产环境配置**
   ```bash
   npm run env:prod
   ```

2. **构建项目**
   ```bash
   npm run build
   ```

3. **启动生产服务器**
   ```bash
   npm start
   # 或使用PM2
   pm2 start backend/app.js --name website
   ```

## 📁 配置文件说明

- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置
- `.env` - 当前使用的配置（由脚本自动生成）

## 🔧 环境差异

### 开发环境特点
- NODE_ENV=development
- 端口: 8000 (后端), 3000 (前端)
- 数据库: 本地MongoDB (localhost:27017)
- 热重载支持
- 详细错误日志
- 无请求限流

### 生产环境特点
- NODE_ENV=production
- 端口: 3001 (后端)
- 数据库: 生产MongoDB容器
- 启用请求限流
- 压缩日志
- 安全头设置

## 🛠️ 故障排除

### 数据库连接问题
如果遇到数据库连接失败，应用会继续运行但部分功能不可用。

**开发环境解决方案:**
```bash
# 启动本地MongoDB
docker run -d --name mongodb-dev -p 27017:27017 mongo:latest

# 或检查本地MongoDB服务状态
```

**生产环境解决方案:**
- 检查MongoDB容器是否运行
- 验证数据库连接字符串
- 确认网络连接

### 端口冲突
如果端口被占用，可以修改对应的环境配置文件中的PORT值。

### 前端无法连接后端
1. 确认后端服务正在运行: `curl http://localhost:8000/health`
2. 检查CORS配置是否正确
3. 验证前端代理配置

## 📝 手动配置

如果需要手动配置，可以直接编辑 `.env` 文件：

```bash
# 复制开发环境配置
cp .env.development .env

# 或复制生产环境配置
cp .env.production .env
```

## 🔄 配置备份

环境切换脚本会自动备份现有的 `.env` 文件，备份文件格式为 `.env.backup.{timestamp}`。
