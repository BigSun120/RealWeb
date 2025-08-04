const mongoose = require('mongoose');
const Article = require('../src/models/Article');
const User = require('../src/models/User');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personal_website_dev');

const seedArticles = async () => {
  try {
    console.log('开始创建测试文章...');

    // 查找管理员用户
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      // 如果没有管理员，查找任意用户
      admin = await User.findOne();
      if (!admin) {
        console.log('没有找到用户，请先创建用户');
        return;
      }
    }
    console.log('找到用户:', admin.username);

    // 检查是否已有文章
    const existingArticles = await Article.countDocuments();
    if (existingArticles > 0) {
      console.log(`数据库中已有 ${existingArticles} 篇文章，跳过创建`);
      return;
    }

    // 创建测试文章
    const articles = [
      {
        title: 'Vue 3 Composition API 深度解析',
        content: `# Vue 3 Composition API 深度解析

Vue 3 引入了 Composition API，这是一个全新的 API 设计，为组件逻辑提供了更好的组织方式。

## 什么是 Composition API？

Composition API 是一套基于函数的 API，允许我们更灵活地组织组件逻辑。

\`\`\`javascript
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const doubleCount = computed(() => count.value * 2)

    const increment = () => {
      count.value++
    }

    onMounted(() => {
      console.log('组件已挂载')
    })

    return {
      count,
      doubleCount,
      increment
    }
  }
}
\`\`\`

## 优势

1. **更好的逻辑复用**
2. **更好的类型推导**
3. **更灵活的组织方式**

这使得我们可以更好地组织和复用组件逻辑。`,
        excerpt: 'Vue 3 Composition API 为组件逻辑提供了更好的组织方式，本文深度解析其使用方法和优势。',
        author: admin._id,
        category: '前端开发',
        tags: ['Vue', 'JavaScript', 'Composition API'],
        status: 'published',
        publishedAt: new Date(),
        viewCount: 156,
        coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop'
      },
      {
        title: 'Node.js 性能优化实践指南',
        content: `# Node.js 性能优化实践指南

Node.js 应用的性能优化是一个系统性工程，需要从多个维度进行考虑。

## 内存优化

### 避免内存泄漏

\`\`\`javascript
// 错误示例
const cache = {}
app.get('/api/data/:id', (req, res) => {
  cache[req.params.id] = fetchData(req.params.id)
  res.json(cache[req.params.id])
})

// 正确示例
const LRU = require('lru-cache')
const cache = new LRU({ max: 1000, ttl: 1000 * 60 * 10 })
\`\`\`

## CPU 优化

1. **使用 Worker Threads**
2. **避免阻塞事件循环**
3. **合理使用缓存**

## 数据库优化

- 索引优化
- 查询优化
- 连接池管理

通过这些优化手段，可以显著提升 Node.js 应用的性能。`,
        excerpt: '从内存、CPU、数据库等多个维度详细介绍 Node.js 应用的性能优化实践方法。',
        author: admin._id,
        category: '后端开发',
        tags: ['Node.js', '性能优化', '后端'],
        status: 'published',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
        viewCount: 89,
        coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop'
      },
      {
        title: 'MongoDB 数据建模最佳实践',
        content: `# MongoDB 数据建模最佳实践

MongoDB 作为文档数据库，其数据建模方式与关系型数据库有很大不同。

## 嵌入 vs 引用

### 嵌入文档
适用于一对一或一对少的关系：

\`\`\`javascript
{
  _id: ObjectId("..."),
  name: "张三",
  address: {
    street: "中山路123号",
    city: "北京",
    zipCode: "100000"
  }
}
\`\`\`

### 引用文档
适用于一对多或多对多的关系：

\`\`\`javascript
// 用户文档
{
  _id: ObjectId("..."),
  name: "张三",
  posts: [ObjectId("..."), ObjectId("...")]
}

// 文章文档
{
  _id: ObjectId("..."),
  title: "文章标题",
  author: ObjectId("...")
}
\`\`\`

## 设计原则

1. **根据查询模式设计**
2. **考虑数据增长**
3. **平衡读写性能**

合理的数据建模是 MongoDB 应用成功的关键。`,
        excerpt: '详细介绍 MongoDB 数据建模的最佳实践，包括嵌入与引用的选择、设计原则等。',
        author: admin._id,
        category: '数据库',
        tags: ['MongoDB', '数据建模', '数据库设计'],
        status: 'published',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
        viewCount: 234,
        coverImage: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&h=400&fit=crop'
      },
      {
        title: 'CSS Grid 布局完全指南',
        content: `# CSS Grid 布局完全指南

CSS Grid 是现代 CSS 中最强大的布局系统，它提供了二维布局能力。

## 基础概念

### Grid Container 和 Grid Item

\`\`\`css
.container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 100px 100px;
  gap: 10px;
}

.item {
  background: #f0f0f0;
  padding: 20px;
}
\`\`\`

## 常用属性

### 容器属性
- \`grid-template-columns\`
- \`grid-template-rows\`
- \`gap\`
- \`justify-items\`
- \`align-items\`

### 项目属性
- \`grid-column\`
- \`grid-row\`
- \`justify-self\`
- \`align-self\`

## 实际应用

Grid 特别适合创建复杂的网页布局，如卡片网格、仪表板等。

\`\`\`css
.dashboard {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
  grid-template-rows: 60px 1fr 40px;
  grid-template-columns: 200px 1fr 1fr;
  height: 100vh;
}
\`\`\`

掌握 CSS Grid 可以让你的布局能力提升一个层次。`,
        excerpt: '全面介绍 CSS Grid 布局系统，从基础概念到实际应用，助你掌握现代 CSS 布局。',
        author: admin._id,
        category: '前端开发',
        tags: ['CSS', 'Grid', '布局', '前端'],
        status: 'published',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        viewCount: 178,
        coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
      },
      {
        title: 'Docker 容器化部署实战',
        content: `# Docker 容器化部署实战

Docker 已经成为现代应用部署的标准工具，本文介绍如何使用 Docker 部署 Web 应用。

## Dockerfile 编写

### Node.js 应用示例

\`\`\`dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]
\`\`\`

## 多阶段构建

\`\`\`dockerfile
# 构建阶段
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
\`\`\`

## Docker Compose

\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: mongo:5
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

volumes:
  mongo_data:
\`\`\`

## 最佳实践

1. **使用多阶段构建减小镜像大小**
2. **合理使用缓存层**
3. **安全配置**
4. **健康检查**

Docker 让应用部署变得简单可靠。`,
        excerpt: '从 Dockerfile 编写到 Docker Compose 使用，全面介绍 Docker 容器化部署的实战技巧。',
        author: admin._id,
        category: 'DevOps',
        tags: ['Docker', '容器化', '部署', 'DevOps'],
        status: 'published',
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4天前
        viewCount: 145,
        coverImage: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800&h=400&fit=crop'
      },
      {
        title: 'TypeScript 高级类型系统详解',
        content: `# TypeScript 高级类型系统详解

TypeScript 的类型系统非常强大，掌握高级类型可以让你写出更安全、更优雅的代码。

## 泛型约束

\`\`\`typescript
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}
\`\`\`

## 条件类型

\`\`\`typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type ApiResponse<T> = T extends string
  ? { message: T }
  : { data: T };
\`\`\`

## 映射类型

\`\`\`typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Required<T> = {
  [P in keyof T]-?: T[P];
};
\`\`\`

## 模板字面量类型

\`\`\`typescript
type EventName<T extends string> = \`on\${Capitalize<T>}\`;

type ButtonEvents = EventName<'click' | 'hover'>;
// 'onClick' | 'onHover'
\`\`\`

## 实用工具类型

- \`Pick<T, K>\`
- \`Omit<T, K>\`
- \`Record<K, T>\`
- \`Exclude<T, U>\`
- \`Extract<T, U>\`

掌握这些高级类型，可以让你的 TypeScript 代码更加类型安全。`,
        excerpt: '深入探讨 TypeScript 的高级类型系统，包括泛型约束、条件类型、映射类型等核心概念。',
        author: admin._id,
        category: '前端开发',
        tags: ['TypeScript', '类型系统', 'JavaScript'],
        status: 'published',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
        viewCount: 267,
        coverImage: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=400&fit=crop'
      }
    ];

    // 批量插入文章
    await Article.insertMany(articles);
    console.log(`成功创建 ${articles.length} 篇测试文章`);

  } catch (error) {
    console.error('创建测试文章失败:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedArticles();
