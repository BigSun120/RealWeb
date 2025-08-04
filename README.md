# 个人博客与小游戏平台

一个基于 Vue3 + Node.js + MongoDB 的个人网站项目，包含博客系统和小游戏功能。

## 🚀 技术栈

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Vite** - 现代化构建工具
- **Element Plus** - Vue 3 UI组件库
- **Pinia** - Vue 3状态管理
- **Vue Router 4** - 路由管理
- **Axios** - HTTP客户端
- **SCSS** - CSS预处理器

### 后端
- **Node.js** - JavaScript运行环境
- **Express.js** - Web应用框架
- **MongoDB** - NoSQL数据库
- **Mongoose** - MongoDB对象建模
- **JWT** - 身份认证
- **node-cache** - 内存缓存
- **Winston** - 日志管理

## 📁 项目结构

```
personal-website/
├── frontend/                 # Vue3前端项目
│   ├── src/
│   │   ├── components/       # 公共组件
│   │   ├── views/           # 页面组件
│   │   ├── stores/          # Pinia状态管理
│   │   ├── router/          # 路由配置
│   │   ├── api/             # API请求封装
│   │   └── styles/          # 样式文件
│   └── package.json
├── backend/                  # Node.js后端项目
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由定义
│   │   ├── middleware/      # 中间件
│   │   ├── config/          # 配置文件
│   │   └── utils/           # 工具函数
│   ├── uploads/             # 文件上传目录
│   ├── logs/                # 日志目录
│   └── package.json
├── .augment/                # 配置文件和规范
├── .env.example             # 环境变量示例
├── deploy.sh                # 部署脚本
└── README.md
```

## 🛠️ 快速开始

### 环境要求
- Node.js 16+
- MongoDB 4.4+
- npm 8+

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repository-url>
cd personal-website
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等参数
```

3. **一键部署**
```bash
chmod +x deploy.sh
./deploy.sh
```

### 手动安装

1. **安装依赖**
```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend && npm install && cd ..

# 安装后端依赖
cd backend && npm install && cd ..
```

2. **启动开发环境**
```bash
# 同时启动前后端开发服务器
npm run dev

# 或分别启动
npm run dev:frontend  # 前端开发服务器 (http://localhost:3000)
npm run dev:backend   # 后端API服务器 (http://localhost:8000)
```

3. **构建生产版本**
```bash
npm run build
npm start
```

## 🔧 环境配置

### 环境变量说明

```bash
# 应用配置
NODE_ENV=development          # 运行环境
PORT=8000                    # 后端端口

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/personal_website_dev

# JWT配置
JWT_SECRET=your_jwt_secret_key_here

# 文件上传
UPLOAD_PATH=./uploads

# 前端URL
FRONTEND_URL=http://localhost:3000
```

### MongoDB 配置

1. **本地安装MongoDB**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb-community

# Windows
# 下载并安装 MongoDB Community Server
```

2. **或使用MongoDB Atlas云服务**
- 注册 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- 创建集群并获取连接字符串
- 更新 `.env` 文件中的 `MONGODB_URI`

## 📝 API文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 用户接口
- `GET /api/users/profile` - 获取用户资料
- `PUT /api/users/profile` - 更新用户资料

### 文章接口
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取文章详情
- `POST /api/articles` - 创建文章

### 游戏接口
- `GET /api/games` - 获取游戏列表
- `GET /api/games/:id` - 获取游戏详情

## 🚀 部署

### 使用PM2部署（推荐）

```bash
# 安装PM2
npm install -g pm2

# 构建项目
npm run build

# 启动服务
pm2 start backend/app.js --name website

# 设置开机自启
pm2 startup
pm2 save

# 管理服务
pm2 status          # 查看状态
pm2 logs website    # 查看日志
pm2 restart website # 重启服务
pm2 stop website    # 停止服务
```

### 直接部署

```bash
# 构建项目
npm run build

# 启动服务
npm start
```

## 🧪 测试

```bash
# 运行后端测试
npm run test

# 前端代码检查
npm run lint

# 代码格式化
npm run format
```

## 📊 功能特性

### 博客系统
- ✅ 文章发布与管理
- ✅ 分类和标签
- ✅ 文章搜索
- ✅ 评论系统（开发中）
- ✅ 点赞功能（开发中）

### 用户系统
- ✅ 用户注册/登录
- ✅ 个人资料管理
- ✅ JWT身份认证
- ✅ 权限控制

### 小游戏
- ✅ 游戏列表展示
- ⏳ 游戏嵌入播放
- ⏳ 游戏分数记录

### 系统功能
- ✅ 响应式设计
- ✅ 文件上传
- ✅ 日志记录
- ✅ 错误处理
- ✅ API限流

## 🔒 安全特性

- JWT身份认证
- 密码bcrypt加密
- API请求限流
- 输入验证和过滤
- CORS跨域配置
- 安全头设置

## 📈 性能优化

- 前端代码分割
- 图片懒加载
- API响应缓存
- 数据库索引优化
- Gzip压缩

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 邮箱：1461020599@qq.com


## 🙏 致谢

感谢所有开源项目的贡献者，特别是：
- Vue.js 团队
- Express.js 团队
- MongoDB 团队
- Element Plus 团队
