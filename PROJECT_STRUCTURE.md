# 项目结构说明

## 📁 目录结构

```
web/
├── backend/                 # 后端服务
│   ├── src/                # 源代码
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由定义
│   │   └── utils/          # 工具函数
│   ├── app.js              # 应用入口
│   ├── package.json        # 依赖配置
│   └── Dockerfile          # Docker 配置
├── frontend/               # 前端应用
│   ├── src/                # 源代码
│   │   ├── components/     # Vue 组件
│   │   ├── views/          # 页面视图
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # 状态管理
│   │   └── utils/          # 工具函数
│   ├── dist/               # 构建输出
│   ├── package.json        # 依赖配置
│   ├── vite.config.js      # Vite 配置
│   └── Dockerfile.prod     # 生产环境 Docker 配置
├── docs/                   # 项目文档
├── docx/                   # 详细文档
├── scripts/                # 脚本文件
├── .env.example            # 环境变量示例
├── .gitignore              # Git 忽略文件
├── docker-compose.dev.yml  # 开发环境 Docker Compose
├── docker-compose.prod.yml # 生产环境 Docker Compose
├── deploy.sh               # 部署脚本
├── deploy-pm2.sh           # PM2 部署脚本
└── README.md               # 项目说明
```

## 🚀 快速开始

### 开发环境
```bash
# 安装依赖
npm run setup

# 启动开发服务
npm run dev
```

### 生产环境
```bash
# 使用 Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 或使用 PM2 部署
./deploy-pm2.sh
```

## 📝 主要文件说明

### 配置文件
- `.env` - 环境变量配置
- `docker-compose.*.yml` - Docker 编排配置
- `vite.config.js` - 前端构建配置

### 部署文件
- `deploy.sh` - 主要部署脚本
- `deploy-pm2.sh` - PM2 部署脚本
- `Dockerfile.prod` - 生产环境镜像

### 文档文件
- `README.md` - 项目概述
- `DEPLOYMENT.md` - 部署指南
- `docs/` - 技术文档
- `docx/` - 详细设计文档

## 🔧 开发工具

### 脚本命令
- `npm run setup` - 安装所有依赖
- `npm run dev` - 启动开发环境
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果

### 健康检查
- `scripts/health-check.sh` - 服务健康检查
- `backend/healthcheck.js` - 后端健康检查

## 📋 注意事项

1. **环境变量**: 复制 `.env.example` 为 `.env` 并配置实际值
2. **数据库**: 确保 MongoDB 服务正常运行
3. **端口**: 默认前端 3000，后端 3001
4. **SSL**: 生产环境建议配置 HTTPS
5. **备份**: 定期备份数据库和上传文件

## 🛠️ 维护

### 日志查看
```bash
# PM2 日志
pm2 logs website-backend

# Docker 日志
docker-compose logs -f
```

### 更新部署
```bash
# 拉取最新代码
git pull

# 重新部署
./deploy-pm2.sh
```
