# API接口文档

## 一、文档概述
- **版本**：1.0
- **基础URL**：`http://api.example.com/v1`
- **认证方式**：JWT Token
- **数据格式**：JSON
- **状态码说明**：
  - 200: 请求成功
  - 400: 请求参数错误
  - 401: 未授权（未登录）
  - 403: 权限不足
  - 404: 资源不存在
  - 500: 服务器错误

## 二、认证接口

### 2.1 用户注册
- **URL**: `/auth/register`
- **方法**: POST
- **权限**: 公开
- **请求体**:
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!"
  }
  ```
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "注册成功",
    "data": {
      "userId": "60d21b4667d0d8992e610c85",
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
  ```

### 2.2 用户登录
- **URL**: `/auth/login`
- **方法**: POST
- **权限**: 公开
- **请求体**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "登录成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "userId": "60d21b4667d0d8992e610c85",
        "username": "john_doe",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  }
  ```

## 三、用户接口

### 3.1 获取用户信息
- **URL**: `/users/profile`
- **方法**: GET
- **权限**: 登录用户
- **请求头**: `Authorization: Bearer {token}`
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "userId": "60d21b4667d0d8992e610c85",
      "username": "john_doe",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "Frontend developer",
      "createdAt": "2023-06-20T10:00:00Z"
    }
  }
  ```

### 3.2 更新用户信息
- **URL**: `/users/profile`
- **方法**: PUT
- **权限**: 登录用户
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "username": "john_new",
    "bio": "Fullstack developer",
    "avatar": "https://example.com/new_avatar.jpg"
  }
  ```
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "信息更新成功",
    "data": {
      "userId": "60d21b4667d0d8992e610c85",
      "username": "john_new",
      "bio": "Fullstack developer"
    }
  }
  ```

## 四、博客接口

### 4.1 获取文章列表
- **URL**: `/articles`
- **方法**: GET
- **权限**: 公开
- **查询参数**:
  - `page`: 页码(默认1)
  - `limit`: 每页条数(默认10)
  - `category`: 分类(可选)
  - `tag`: 标签(可选)
  - `search`: 搜索关键词(可选)
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "articles": [
        {
          "id": "60d21b4667d0d8992e610c86",
          "title": "Vue3 Composition API 入门",
          "author": "john_doe",
          "category": "技术",
          "tags": ["Vue3", "前端"],
          "coverImage": "https://example.com/cover.jpg",
          "viewCount": 120,
          "likeCount": 25,
          "createdAt": "2023-06-20T10:00:00Z"
        }
      ],
      "pagination": {
        "total": 45,
        "page": 1,
        "limit": 10,
        "pages": 5
      }
    }
  }
  ```

### 4.2 获取文章详情
- **URL**: `/articles/{articleId}`
- **方法**: GET
- **权限**: 公开
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": "60d21b4667d0d8992e610c86",
      "title": "Vue3 Composition API 入门",
      "content": "# Vue3 Composition API\n\n## 介绍...",
      "author": {
        "id": "60d21b4667d0d8992e610c85",
        "username": "john_doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "category": "技术",
      "tags": ["Vue3", "前端"],
      "coverImage": "https://example.com/cover.jpg",
      "viewCount": 120,
      "likeCount": 25,
      "createdAt": "2023-06-20T10:00:00Z",
      "updatedAt": "2023-06-21T15:30:00Z"
    }
  }
  ```

### 4.3 创建文章
- **URL**: `/articles`
- **方法**: POST
- **权限**: 登录用户
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "title": "React Hooks 最佳实践",
    "content": "# React Hooks 最佳实践\n\n## 1. 引言...",
    "category": "技术",
    "tags": ["React", "前端"],
    "coverImage": "https://example.com/react.jpg",
    "status": "published"
  }
  ```
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "文章创建成功",
    "data": {
      "id": "60d21b4667d0d8992e610c91",
      "title": "React Hooks 最佳实践"
    }
  }
  ```

### 4.4 添加评论
- **URL**: `/articles/{articleId}/comments`
- **方法**: POST
- **权限**: 登录用户
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "content": "很棒的文章，学到很多！",
    "parentId": null  // 回复评论时填写父评论ID
  }
  ```
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "评论成功",
    "data": {
      "id": "60d21b4667d0d8992e610c92",
      "content": "很棒的文章，学到很多！"
    }
  }
  ```

## 五、游戏接口

### 5.1 获取游戏列表
- **URL**: `/games`
- **方法**: GET
- **权限**: 公开
- **查询参数**:
  - `category`: 游戏分类(可选)
  - `page`: 页码(默认1)
  - `limit`: 每页条数(默认10)
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "games": [
        {
          "id": "60d21b4667d0d8992e610c89",
          "name": "贪吃蛇",
          "description": "经典贪吃蛇游戏",
          "category": "休闲",
          "thumbnail": "https://example.com/snake.jpg",
          "playCount": 350
        }
      ],
      "pagination": {
        "total": 12,
        "page": 1,
        "limit": 10,
        "pages": 2
      }
    }
  }
  ```

### 5.2 提交游戏分数
- **URL**: `/games/{gameId}/scores`
- **方法**: POST
- **权限**: 登录用户
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "score": 1500
  }
  ```
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "分数提交成功",
    "data": {
      "rank": 5,  // 该游戏中的排名
      "score": 1500
    }
  }
  ```

### 5.3 获取游戏排行榜
- **URL**: `/games/{gameId}/ranking`
- **方法**: GET
- **权限**: 公开
- **查询参数**:
  - `limit`: 显示条数(默认10)
- **响应示例**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "ranking": [
        {
          "rank": 1,
          "username": "top_player",
          "score": 2500,
          "avatar": "https://example.com/top.jpg"
        },
        {
          "rank": 2,
          "username": "john_doe",
          "score": 1800,
          "avatar": "https://example.com/john.jpg"
        }
      ],
      "myRank": 5,  // 当前登录用户排名(未登录则为null)
      "myScore": 1500
    }
  }
  ```

## 六、通用响应格式
### 成功响应
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体响应数据
  }
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ]
}
```

## 七、接口调用示例
### 使用Axios调用登录接口
```javascript
import axios from 'axios';

const login = async () => {
  try {
    const response = await axios.post('http://api.example.com/v1/auth/login', {
      email: 'john@example.com',
      password: 'Password123!'
    });
    
    // 保存token
    localStorage.setItem('token', response.data.data.token);
    console.log('登录成功');
  } catch (error) {
    console.error('登录失败:', error.response.data.message);
  }
};
```

### 使用认证token调用接口
```javascript
// 创建axios实例
const api = axios.create({
  baseURL: 'http://api.example.com/v1'
});

// 添加请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```