# 🚀 临时邮箱系统

一个功能完整的临时邮箱系统，基于Vue 3 + Node.js + Inbucket构建，支持邮箱生成、邮件接收、管理后台等功能。

## ✨ 功能特性

### 🎯 核心功能
- **临时邮箱生成** - 支持自定义前缀或随机生成
- **多域名支持** - 可配置多个邮箱域名
- **实时邮件接收** - 基于Inbucket的SMTP服务
- **邮件管理** - 查看、删除、搜索邮件
- **响应式设计** - 完美支持桌面和移动端

### 🛠️ 管理功能
- **域名管理** - 动态添加/删除/排序邮箱域名
- **邮件统计** - 邮箱数量、邮件统计、使用分析
- **批量操作** - 批量清理邮件、邮箱管理
- **系统监控** - 服务状态监控、健康检查

### 🔒 安全特性
- **隐私保护** - 邮件临时存储，自动清理
- **访问控制** - 管理后台权限控制
- **HTTPS支持** - 全站HTTPS加密
- **防垃圾邮件** - SPF/DMARC配置支持

## 🏗️ 技术架构

### 前端技术栈
- **Vue 3** - 渐进式JavaScript框架
- **Element Plus** - Vue 3组件库
- **Vite** - 现代化构建工具
- **Vue Router** - 路由管理
- **Axios** - HTTP客户端

### 后端技术栈
- **Node.js** - JavaScript运行时
- **Express** - Web应用框架
- **Inbucket** - SMTP邮件服务器
- **Docker** - 容器化部署
- **Nginx** - 反向代理和静态文件服务

### 部署架构
```
Internet
    ↓
[Nginx] (SSL终止, 反向代理)
    ↓
[Frontend] (Vue 3 SPA)
    ↓
[Backend] (Node.js API)
    ↓
[Inbucket] (SMTP服务器)
```

## 🚀 快速开始

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/your-username/temp-email-system.git
cd temp-email-system

# 2. 启动邮件服务
npm run email:start

# 3. 启动开发环境
npm run dev

# 4. 访问应用
# 前端: http://localhost:3000/temp-email
# 后端: http://localhost:5000  
# Inbucket: http://localhost:9000
```

### 生产部署

#### 快速部署（推荐）
```bash
# 一键部署脚本
chmod +x quick-deploy.sh
./quick-deploy.sh your-domain.com
```

#### 详细部署
请查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整的部署指南。

## 📖 使用说明

### 用户功能

1. **生成临时邮箱**
   - 访问 `/temp-email`
   - 选择邮箱域名后缀
   - 输入自定义前缀或使用随机生成
   - 点击"生成新邮箱"

2. **接收邮件**
   - 使用生成的邮箱地址注册服务
   - 系统自动接收邮件
   - 在界面中查看邮件内容

3. **管理邮件**
   - 查看邮件列表
   - 阅读邮件详情
   - 删除不需要的邮件
   - 切换显示模式（当前邮箱/全部邮箱）

### 管理员功能

1. **域名管理**
   - 访问 `/admin/email-domains`
   - 添加新的邮箱域名
   - 调整域名优先级
   - 删除不需要的域名

2. **邮件管理**
   - 访问 `/admin/email-management`
   - 查看所有邮箱统计
   - 批量清理邮件
   - 监控系统状态

## 🔧 配置说明

### 环境变量

```bash
# .env.prod
NODE_ENV=production
DOMAIN=your-domain.com
SMTP_DOMAINS=domain1.com,domain2.com,domain3.com
```

### 域名DNS配置

```dns
# A记录
your-domain.com.        A     服务器IP
mail.your-domain.com.   A     服务器IP

# MX记录  
your-domain.com.        MX    10    mail.your-domain.com.

# TXT记录（可选）
your-domain.com.        TXT   "v=spf1 a mx ~all"
```

## 📊 系统要求

### 最低配置
- CPU: 1核
- 内存: 2GB
- 存储: 20GB
- 带宽: 1Mbps

### 推荐配置
- CPU: 2核
- 内存: 4GB  
- 存储: 40GB
- 带宽: 3Mbps

## 🛠️ 开发指南

### 主要API端点

```
POST /api/temp-email/generate          # 生成邮箱
GET  /api/temp-email/:email/messages   # 获取邮件列表
GET  /api/temp-email/:email/messages/:id # 获取邮件详情
DELETE /api/temp-email/:email/messages/:id # 删除邮件
POST /api/temp-email/:email/send-test  # 发送测试邮件
GET  /api/temp-email/domains           # 获取支持的域名
GET  /api/temp-email/all-emails        # 获取所有邮件
DELETE /api/temp-email/:email/clear    # 清空邮箱
DELETE /api/temp-email/clear-all       # 清空所有邮件
```

### 开发命令

```bash
# 邮件服务
npm run email:start        # 启动Inbucket
npm run email:stop         # 停止Inbucket
npm run email:send-test    # 发送测试邮件

# 开发环境
npm run dev                # 启动前后端开发服务

# 测试工具
npm run dns:check domain   # 检查域名DNS配置
```

## 💰 成本估算

### 基础配置（2核4G）
- **云服务器**: 60-100元/月
- **域名**: 50-100元/年
- **SSL证书**: 免费（Let's Encrypt）
- **总计**: 约70-110元/月

### 高性能配置（4核8G）
- **云服务器**: 150-300元/月
- **CDN加速**: 20-50元/月（可选）
- **总计**: 约170-400元/月

## 🔒 安全建议

1. **定期更新系统和依赖**
2. **配置防火墙规则**
3. **使用HTTPS加密**
4. **限制管理后台访问**
5. **定期备份数据**

## 📈 性能优化

1. **启用Gzip压缩**
2. **配置静态资源缓存**
3. **使用CDN加速**
4. **优化Docker镜像大小**
5. **配置负载均衡**（多服务器）

## 🆘 故障排除

### 常见问题

1. **邮件发送失败**
   - 检查SMTP端口2500是否开放
   - 检查Inbucket服务状态
   - 查看后端日志

2. **前端无法访问**
   - 检查Nginx配置
   - 检查SSL证书
   - 检查防火墙设置

3. **管理后台无法登录**
   - 检查用户权限配置
   - 检查后端认证服务

### 日志查看

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f inbucket

# 系统健康检查
./scripts/health-check.sh
```

## 📞 技术支持

- 📖 [详细部署文档](./DEPLOYMENT.md)
- 🐛 [问题反馈](https://github.com/your-username/temp-email-system/issues)
- 💬 [功能建议](https://github.com/your-username/temp-email-system/discussions)

## 🙏 致谢

- [Inbucket](https://github.com/inbucket/inbucket) - 优秀的SMTP测试服务器
- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Element Plus](https://element-plus.org/) - Vue 3组件库

---

**如果这个项目对你有帮助，请给个⭐️支持一下！**
