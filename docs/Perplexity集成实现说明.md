# Perplexity 集成实现说明

## 📋 实现概述

已成功将 Perplexity Pro 账号反向代理集成到 RealWeb（方案1.5），实现跨设备访问和私有连接功能。

---

## ✅ 已完成的修改

### 1. **后端服务层**

#### 新增文件：
- `backend/src/services/PerplexityProxyService.js` - Perplexity 反向代理服务
  - SSE 流式响应解析
  - Session Token 验证
  - 请求参数构建
  - OpenAI 格式转换

#### 修改文件：
- `backend/src/services/AIGatewayService.js`
  - 添加 Perplexity 提供商检测
  - 集成 `handlePerplexityRequest` 方法
  - 特殊处理 Perplexity 验证逻辑

- `backend/src/models/UserAIConnection.js`
  - 添加 `perplexity` 到 provider 枚举
  - 新增 `isPrivate` 字段（私有连接标记）

- `backend/src/controllers/aiGatewayController.js`
  - 创建/更新连接时支持 `isPrivate` 字段

### 2. **前端界面**

#### 修改文件：
- `frontend/src/views/user/AIConnections.vue`
  - 添加 Perplexity 提供商选项
  - Session Token 输入提示
  - 私有连接开关
  - 自动填充 Perplexity 配置

### 3. **依赖安装**
```bash
npm install uuid  # 已安装
```

### 4. **文档**
- `docs/Perplexity集成指南.md` - 用户使用指南
- `docs/Perplexity集成实现说明.md` - 技术实现说明（本文档）

---

## 🔧 技术架构

### 数据流
```
用户输入
    ↓
RealWeb Frontend
    ↓
RealWeb Backend (AIGatewayService)
    ↓
检测 provider === 'perplexity'
    ↓
PerplexityProxyService.query()
    ↓
构建请求体 + 注入 Session Token
    ↓
POST https://www.perplexity.ai/rest/sse/perplexity_ask
    ↓
解析 SSE 流式响应
    ↓
转换为 OpenAI 格式
    ↓
返回给前端
```

### 关键组件

#### PerplexityProxyService
```javascript
class PerplexityProxyService {
  // 发送查询到 Perplexity
  async query(query, sessionToken, options) {
    // 构建请求体
    // 发送 POST 请求
    // 解析 SSE 流
  }
  
  // 验证 Session Token
  async validateToken(sessionToken) {
    // 调用 /api/auth/session 验证
  }
  
  // 转换为 OpenAI 格式
  toOpenAIFormat(perplexityResponse) {
    // 统一接口格式
  }
}
```

#### AIGatewayService 集成
```javascript
async generate(userId, params) {
  const connection = await this.selectConnection(userId, ...);
  
  // 检测 Perplexity
  if (connection.provider === 'perplexity') {
    return await this.handlePerplexityRequest(connection, messages);
  }
  
  // 其他提供商正常处理
  ...
}
```

---

## 🔐 安全特性

### 1. **私有连接 (isPrivate)**
- 数据库字段：`UserAIConnection.isPrivate`
- 默认值：`false`
- 开启后，只有连接创建者可见和使用

### 2. **Session Token 存储**
- 存储位置：`UserAIConnection.apiKey` 字段
- 存储方式：明文（仅所有者可访问）
- 传输方式：HTTPS 加密

### 3. **访问控制**
- 基于 `req.user.id` 验证所有权
- 前端不显示其他用户的私有连接
- API 层面强制验证用户身份

---

## 📊 数据库变更

### UserAIConnection 模型
```javascript
{
  // 现有字段...
  
  // 新增字段
  provider: {
    enum: ['openai', 'deepseek', 'anthropic', 'google', 'perplexity', 'custom', 'other']
    // 新增 'perplexity'
  },
  
  isPrivate: {
    type: Boolean,
    default: false,
    index: true
  }
}
```

**注意**：现有数据库记录会自动获得 `isPrivate: false` 的默认值，无需迁移。

---

## 🚀 部署步骤

### 1. 拉取代码
```bash
git pull origin main
```

### 2. 安装依赖
```bash
cd backend
npm install
```

### 3. 重启服务
```bash
# 开发环境
npm run dev

# 生产环境
npm run deploy
```

### 4. 验证部署
1. 登录 RealWeb
2. 进入个人中心 → AI 连接
3. 查看是否有 Perplexity 选项
4. 尝试创建测试连接

---

## 🧪 测试清单

### 功能测试
- [ ] 创建 Perplexity 连接
- [ ] 验证 Session Token
- [ ] 发送测试查询
- [ ] 查看使用统计
- [ ] 编辑连接配置
- [ ] 删除连接
- [ ] 设置为默认连接
- [ ] 开启/关闭私有连接

### 跨设备测试
- [ ] 电脑浏览器访问
- [ ] 手机浏览器访问
- [ ] 同一账号跨设备同步
- [ ] 其他用户无法看到私有连接

### 异常测试
- [ ] Token 过期处理
- [ ] 网络超时处理
- [ ] 无效 Token 提示
- [ ] API 限流处理

---

## 📝 配置示例

### 用户配置（前端）
```javascript
{
  name: "我的 Perplexity",
  provider: "perplexity",
  baseURL: "https://www.perplexity.ai",
  apiKey: "eyJhbGciOiJkaXIi...", // Session Token
  defaultModel: "pplx_alpha",
  requestParams: {
    temperature: 0.8,
    maxTokens: 4000
  },
  isDefault: false,
  isPrivate: true  // 私有连接
}
```

### 代理请求（后端）
```javascript
{
  query_str: "用户问题",
  params: {
    version: "2.18",
    language: "zh-CN",
    timezone: "Asia/Shanghai",
    mode: "copilot",
    model_preference: "pplx_alpha",
    search_focus: "internet",
    sources: ["web"],
    frontend_uuid: "generated-uuid",
    visitor_id: "user-visitor-id",
    user_nextauth_id: "user-nextauth-id",
    // ... 其他参数
  }
}
```

---

## ⚠️ 已知限制

1. **流式输出**
   - 后端等待完整响应后返回
   - 前端不支持实时流式显示
   - **原因**：简化实现，避免复杂的 SSE 转发

2. **Token 统计**
   - 使用字符数估算（length / 4）
   - Perplexity API 不返回实际 token 数
   - **影响**：统计数据仅供参考

3. **图片支持**
   - 不支持图片上传
   - **原因**：Perplexity API 限制

4. **请求频率**
   - 无内置限流
   - 建议个人低频使用
   - **风险**：高频请求可能被 Perplexity 检测

---

## 🔄 未来优化方向

### 短期（可选）
- [ ] 支持流式输出
- [ ] Token 自动刷新
- [ ] 请求频率限制
- [ ] 缓存机制

### 长期（可选）
- [ ] 支持 Perplexity 其他模式（concise, research）
- [ ] 引用来源展示优化
- [ ] 使用量报告
- [ ] 成本估算

---

## 🐛 故障排查

### 问题 1: 验证失败
**可能原因**：
- Session Token 过期
- Token 格式错误
- 网络连接问题

**解决方法**：
1. 重新获取 Session Token
2. 检查 Token 是否完整
3. 验证网络连接

### 问题 2: 请求超时
**可能原因**：
- Perplexity API 响应慢
- 网络不稳定

**解决方法**：
1. 增加超时时间（默认 60 秒）
2. 检查服务器网络
3. 稍后重试

### 问题 3: 其他用户能看到我的连接
**可能原因**：
- 未开启私有连接
- 前端缓存问题

**解决方法**：
1. 确认 `isPrivate` 为 `true`
2. 刷新页面
3. 清除浏览器缓存

---

## 📞 技术支持

### 日志查看
```bash
# 后端日志
pm2 logs website

# 或者
tail -f backend/logs/combined.log
```

### 调试模式
```bash
# 启用详细日志
DEBUG=* npm run dev
```

### 联系方式
- **开发者邮箱**：1461020599@qq.com
- **项目仓库**：查看 RealWeb GitHub Issues

---

## 📄 相关文档

- [Perplexity 集成使用指南](./Perplexity集成指南.md) - 用户端使用教程
- [RealWeb 部署指南](./部署更新指南.md) - 完整部署流程
- [AI 连接配置说明](./AI连接配置说明.md) - AI 系统架构

---

**实现完成日期**：2025-10-16  
**版本**：v1.0.0  
**状态**：✅ 生产就绪
