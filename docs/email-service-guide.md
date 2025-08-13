# 📧 临时邮箱服务使用指南

## 🎯 概述

本项目集成了Inbucket临时邮箱服务，提供完整的邮箱测试和开发功能。

## 🚀 快速启动

### 方法1: 一键启动（推荐）
```bash
# 启动所有服务（前端+后端+邮箱）
npm run dev
```

### 方法2: 分步启动
```bash
# 1. 首次运行需要设置邮箱服务
npm run email:setup

# 2. 启动邮箱服务
npm run email:start

# 3. 启动前后端
npm run dev:frontend
npm run dev:backend
```

### 方法3: Docker Compose
```bash
# 使用Docker Compose启动
npm run dev:compose
```

## 📱 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:3000 | Vue.js应用 |
| 后端API | http://localhost:8000 | Express.js API |
| 邮箱Web界面 | http://localhost:9000 | Inbucket Web UI |
| SMTP服务器 | localhost:2500 | 邮件发送服务器 |
| POP3服务器 | localhost:1100 | 邮件接收服务器 |

## 🔧 邮箱服务配置

### 支持的域名
- localhost
- test.local
- dev.local
- example.com
- tempmail.dev

### 邮箱地址示例
```
user123@localhost
test456@test.local
random789@dev.local
demo@example.com
temp@tempmail.dev
```

## 💻 API使用示例

### 1. 生成临时邮箱
```javascript
// 前端代码示例
const generateTempEmail = () => {
  const domains = ['localhost', 'test.local', 'dev.local'];
  const randomUser = Math.random().toString(36).substring(7);
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${randomUser}@${randomDomain}`;
};

const tempEmail = generateTempEmail();
console.log('临时邮箱:', tempEmail);
```

### 2. 获取邮件列表
```javascript
// 获取指定邮箱的邮件
const getEmails = async (email) => {
  const response = await fetch(`http://localhost:9000/api/v1/mailbox/${email}`);
  const data = await response.json();
  return data;
};

// 使用示例
const emails = await getEmails('test123@localhost');
console.log('邮件列表:', emails);
```

### 3. 读取邮件内容
```javascript
// 获取邮件详情
const getEmailContent = async (email, messageId) => {
  const response = await fetch(`http://localhost:9000/api/v1/mailbox/${email}/${messageId}`);
  const data = await response.json();
  return data;
};
```

## 🛠️ 管理命令

```bash
# 查看邮箱服务状态
npm run email:status

# 查看邮箱服务日志
npm run email:logs

# 停止邮箱服务
npm run email:stop

# 重启邮箱服务
npm run email:stop && npm run email:start

# 清理邮箱服务容器
npm run email:clean
```

## 🔍 故障排除

### 1. Docker未安装
```bash
# 错误信息
❌ Docker未安装，请先安装Docker

# 解决方案
# Windows: 下载Docker Desktop
# https://www.docker.com/products/docker-desktop

# macOS: 使用Homebrew
brew install --cask docker

# Linux: 使用包管理器
sudo apt-get install docker.io
```

### 2. 端口被占用
```bash
# 检查端口占用
netstat -ano | findstr :9000
netstat -ano | findstr :2500

# 停止占用端口的进程
taskkill /PID <进程ID> /F
```

### 3. 邮箱服务无法访问
```bash
# 检查容器状态
docker ps | grep inbucket

# 查看容器日志
docker logs inbucket-dev

# 重启容器
docker restart inbucket-dev
```

## 📚 进阶配置

### 自定义域名
编辑 `email-config.env` 文件：
```env
INBUCKET_SMTP_DOMAIN=yourdomain.com,anotherdomain.com
```

### 修改端口
```env
INBUCKET_WEB_ADDR=0.0.0.0:9001
INBUCKET_SMTP_ADDR=0.0.0.0:2501
```

### 存储配置
```env
# 使用文件存储（持久化）
INBUCKET_STORAGE_TYPE=file
INBUCKET_STORAGE_PARAMS=/tmp/inbucket

# 使用内存存储（重启后清空）
INBUCKET_STORAGE_TYPE=memory
```

## 🎯 集成到项目

### 1. 后端集成
```javascript
// backend/src/services/emailService.js
const axios = require('axios');

class EmailService {
  constructor() {
    this.inbucketUrl = 'http://localhost:9000/api/v1';
  }
  
  async getMailbox(email) {
    const response = await axios.get(`${this.inbucketUrl}/mailbox/${email}`);
    return response.data;
  }
  
  async getMessage(email, messageId) {
    const response = await axios.get(`${this.inbucketUrl}/mailbox/${email}/${messageId}`);
    return response.data;
  }
}

module.exports = new EmailService();
```

### 2. 前端集成
```javascript
// frontend/src/api/email.js
import axios from 'axios';

const emailApi = {
  // 获取邮箱列表
  getMailbox: (email) => 
    axios.get(`http://localhost:9000/api/v1/mailbox/${email}`),
  
  // 获取邮件详情
  getMessage: (email, messageId) => 
    axios.get(`http://localhost:9000/api/v1/mailbox/${email}/${messageId}`),
  
  // 删除邮件
  deleteMessage: (email, messageId) => 
    axios.delete(`http://localhost:9000/api/v1/mailbox/${email}/${messageId}`)
};

export default emailApi;
```

## 🎉 完成！

现在你可以在开发环境中使用完整的临时邮箱功能了！
