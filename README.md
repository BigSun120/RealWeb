# 🌟 个人博客与小游戏平台

一个现代化的全栈个人网站项目，集成博客系统、小游戏平台和完整的用户管理功能。

## ✨ 项目特色

- 🎨 **现代化UI设计** - 基于Element Plus的精美界面，支持响应式布局
- 📝 **完整博客系统** - 支持Markdown编辑、语法高亮、文章管理
- 🎮 **小游戏平台** - 游戏展示和管理功能
- 👥 **用户权限系统** - 完整的注册登录、权限控制和用户管理
- 📊 **管理后台** - 功能完善的管理员面板
- 📧 **临时邮箱服务** - 集成Inbucket，支持多域名临时邮箱
- 🛡️ **安全防护** - JWT认证、密码加密、API限流等安全措施

## 🚀 技术栈

### 前端
- **Vue 3** + **Vite** - 现代化前端开发
- **Element Plus** - Vue 3 UI组件库
- **Pinia** - 状态管理
- **Vue Router 4** - 路由管理
- **AOS/Animate.css/GSAP** - 动画效果

### 后端
- **Node.js** + **Express.js** - 后端服务
- **MongoDB** + **Mongoose** - 数据库
- **JWT** - 身份认证
- **Winston** - 日志管理
- **node-cache** - 内存缓存

## 📁 项目结构

```
personal-website/
├── frontend/                 # Vue3前端项目
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   ├── views/           # 页面组件
│   │   ├── stores/          # Pinia状态管理
│   │   ├── router/          # 路由配置
│   │   └── api/             # API请求封装
│   └── package.json
├── backend/                  # Node.js后端项目
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由定义
│   │   ├── middleware/      # 中间件
│   │   └── config/          # 配置文件
│   ├── uploads/             # 文件上传目录
│   └── package.json
├── .env.example             # 环境变量示例
├── deploy.sh                # 部署脚本
└── README.md
```

## 🛠️ 快速开始

### 环境要求
- Node.js 16+
- MongoDB 4.4+
- npm 8+
- Docker (用于邮箱服务)

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

3. **安装依赖并启动**
```bash
# 一键安装所有依赖
npm run setup

# 启动开发环境（前端+后端+邮箱服务）
npm run dev

# 或者分步启动
npm run email:setup    # 首次运行：设置邮箱服务
npm run dev           # 启动所有服务
```

### 访问地址
- 前端应用: http://localhost:3000
- 后端API: http://localhost:8000
- 管理后台: http://localhost:3000/admin
- 邮箱服务: http://localhost:9000

### 邮箱服务管理
```bash
# 邮箱服务相关命令
npm run email:start    # 启动邮箱服务
npm run email:stop     # 停止邮箱服务
npm run email:logs     # 查看邮箱服务日志
npm run email:status   # 查看邮箱服务状态
npm run email:clean    # 清理邮箱服务容器
```

## 🔧 环境配置

### 环境变量说明

```bash
# 应用配置
NODE_ENV=development
PORT=8000

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/personal_website_dev

# JWT配置
JWT_SECRET=your_jwt_secret_key_here

# 文件上传
UPLOAD_PATH=./uploads

# 前端URL
FRONTEND_URL=http://localhost:3000
```

## 📝 主要功能

### 博客系统
- ✅ Markdown编辑器，支持实时预览
- ✅ 文章管理（创建、编辑、删除）
- ✅ 文章搜索和分类
- ✅ 阅读量统计

### 用户系统
- ✅ 用户注册/登录
- ✅ 个人资料管理
- ✅ 权限控制

### 管理后台
- ✅ 用户管理
- ✅ 文章管理
- ✅ 系统设置
- ✅ 活动日志

### 小游戏
- ✅ 游戏列表展示
- ✅ 游戏管理

## 🚀 部署

### 生产环境部署

```bash
# 构建项目
npm run build

# 启动服务
npm start

# 或使用PM2（推荐）
npm install -g pm2
npm run deploy:pm2
```

## 🧪 测试

```bash
# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 📄 许可证

本项目采用 MIT 许可证

## 📞 联系方式

- 邮箱：1461020599@qq.com

## 🙏 致谢

感谢以下开源项目：
- Vue.js
- Node.js
- MongoDB
- Element Plus

## � 项目截图

### 🏠 首页展示
- 现代化的首页设计，展示最新文章和项目亮点
- 响应式布局，完美适配各种设备

### 📝 博客系统
- Markdown编辑器，支持实时预览
- 文章列表页面，支持搜索和筛选
- 文章详情页面，支持语法高亮

### 👑 管理后台
- 功能完善的管理员仪表板
- 用户管理、文章管理、系统设置
- 数据统计和活动监控

## �️ 项目规范

### 📋 代码规范
- **ESLint** - JavaScript/Vue代码检查
- **Prettier** - 代码格式化
- **Git Hooks** - 提交前自动检查
- **命名规范** - 统一的文件和变量命名

### 📁 目录规范
- **组件化开发** - 可复用的Vue组件
- **模块化设计** - 清晰的代码结构
- **API分层** - 控制器、服务、模型分离

## 🤝 贡献指南

### 🔧 开发流程
1. **Fork项目** - 点击右上角Fork按钮
2. **克隆代码** - `git clone your-fork-url`
3. **创建分支** - `git checkout -b feature/your-feature`
4. **开发功能** - 编写代码并测试
5. **提交代码** - `git commit -m "feat: add your feature"`
6. **推送分支** - `git push origin feature/your-feature`
7. **创建PR** - 在GitHub上创建Pull Request

### � 提交规范
```bash
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

### 🐛 问题反馈
- 使用GitHub Issues报告bug
- 详细描述问题复现步骤
- 提供错误日志和环境信息

## �📄 许可证

本项目采用 **MIT许可证** - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 📧 **邮箱**: 1461020599@qq.com
- 🐙 **GitHub**: [项目地址](https://github.com/yourusername/personal-website)
- 📝 **博客**: [个人博客](https://yourdomain.com)

## 🙏 致谢

感谢以下开源项目和社区的支持：

### 🎯 核心技术
- **Vue.js** - 渐进式JavaScript框架
- **Node.js** - JavaScript运行环境
- **MongoDB** - 文档型数据库
- **Express.js** - Web应用框架

### 🎨 UI与动画
- **Element Plus** - Vue 3组件库
- **AOS** - 滚动动画库
- **GSAP** - 高性能动画库
- **Animate.css** - CSS动画库

### 🛠️ 开发工具
- **Vite** - 现代化构建工具
- **Pinia** - Vue状态管理
- **Axios** - HTTP客户端
- **Winston** - 日志管理

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！
