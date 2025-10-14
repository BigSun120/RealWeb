# AI API集成实现文档

## 概述

本项目已成功集成了AI API功能,支持**平台级AI服务**和**用户自带密钥(BYOK)**两种模式,实现了智能路由、自动降级、配额控制等高级功能。

## 架构设计

### 双轨制设计

1. **平台AI服务** (Platform Service)
   - 由管理员统一配置和管理
   - 所有用户共享平台配额
   - 支持多provider、多密钥、负载均衡
   - 提供免费额度供新用户使用

2. **用户自带密钥** (BYOK - Bring Your Own Key)
   - 用户个人配置和管理自己的API密钥
   - 独立的配额和成本控制
   - 更高的调用优先级
   - 适合高频使用或企业用户

### 智能路由策略

```
调用AI API
    ↓
检查用户BYOK
    ↓ (有)        ↓ (无/失败)
使用用户密钥 → 回退到平台服务
    ↓                 ↓
成功/失败        成功/失败
```

## 后端实现

### 1. 数据模型

#### AIConfig (平台配置)
文件: `backend/src/models/AIConfig.js`

主要字段:
- `providers[]` - 多个AI服务提供商配置
  - `provider` - 提供商标识
  - `baseURL` - API基础URL
  - `apiKeys[]` - 支持多密钥轮询
  - `models` - 支持的模型列表
  - `requestParams` - 默认请求参数
  - `rateLimit` - 速率限制
- `routingStrategy` - 路由策略(priority/round-robin/least-latency/cost-optimized)
- `fallbackStrategy` - 降级策略
- `quota` - 全局配额控制
- `features` - 功能开关

#### UserAIConnection (用户连接)
文件: `backend/src/models/UserAIConnection.js`

主要字段:
- `user` - 所属用户
- `provider` - 提供商类型
- `baseURL` - API地址
- `apiKeyEncrypted` - 加密的API密钥
- `apiKeyMask` - 掩码显示
- `defaultModel` - 默认模型
- `requestParams` - 请求参数配置
- `usage` - 使用统计
- `validation` - 验证状态
- `quotaSettings` - 配额设置

### 2. 服务层

#### AIService (AI服务核心)
文件: `backend/src/services/AIService.js`

功能:
- 统一的AI API调用接口
- 支持多平台: OpenAI, DeepSeek, Anthropic, Google, Custom
- 请求构建和响应解析
- 流式和非流式输出
- 错误处理和分类
- 成本估算

主要方法:
```javascript
// 生成完成
await AIService.generateCompletion(params)

// 流式生成
await AIService.generateStreamCompletion(params, onChunk, onComplete, onError)

// 验证API密钥
await AIService.validateApiKey(provider, baseURL, apiKey, model)

// 估算成本
AIService.estimateCost(provider, model, usage)
```

#### AIGatewayService (AI网关)
文件: `backend/src/services/AIGatewayService.js`

功能:
- 智能连接选择(BYOK优先)
- 自动降级策略
- 配额检查
- 使用统计更新
- 连接验证

主要方法:
```javascript
// 选择最佳连接
await AIGatewayService.selectConnection(userId, options)

// AI生成
await AIGatewayService.generate(userId, params)

// 流式生成
await AIGatewayService.generateStream(userId, params, onChunk, onComplete, onError)

// 验证连接
await AIGatewayService.validateConnection(userId, connectionId, isUserConnection)

// 获取使用统计
await AIGatewayService.getUserUsageStats(userId, period)
await AIGatewayService.getPlatformUsageStats()
```

### 3. API接口

#### 控制器
文件: `backend/src/controllers/aiGatewayController.js`

#### 路由
文件: `backend/src/routes/ai.js`

API端点:

**AI生成相关**
- `POST /api/ai/generate` - AI生成(支持未登录用户)
- `POST /api/ai/generate/stream` - AI流式生成

**用户连接管理**(需登录)
- `GET /api/ai/connections` - 获取用户连接列表
- `POST /api/ai/connections` - 创建连接
- `PUT /api/ai/connections/:id` - 更新连接
- `DELETE /api/ai/connections/:id` - 删除连接
- `POST /api/ai/connections/:id/validate` - 验证连接
- `GET /api/ai/stats/user` - 获取用户统计

**平台统计**(仅管理员)
- `GET /api/ai/stats/platform` - 获取平台统计

## API使用示例

### 1. AI生成(使用平台或用户密钥)

```javascript
// 前端调用
const response = await axios.post('/api/ai/generate', {
  messages: [
    { role: 'system', content: '你是一个专业的编剧助手' },
    { role: 'user', content: '请帮我生成一个都市爱情短剧第1集的剧本大纲' }
  ],
  temperature: 0.8,
  maxTokens: 2000
}, {
  headers: {
    Authorization: `Bearer ${token}` // 可选,如果提供则优先使用用户密钥
  }
});

console.log(response.data.data.content); // AI生成的内容
console.log(response.data.data.usage); // token使用统计
```

### 2. 创建用户AI连接

```javascript
const response = await axios.post('/api/ai/connections', {
  name: '我的OpenAI',
  provider: 'openai',
  baseURL: 'https://api.openai.com',
  apiKey: 'sk-xxxxxxxxxxxxx',
  defaultModel: 'gpt-4',
  requestParams: {
    temperature: 0.8,
    maxTokens: 4000
  },
  isDefault: true
}, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### 3. 验证连接

```javascript
const response = await axios.post(`/api/ai/connections/${connectionId}/validate`, {}, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(response.data.data.valid); // true/false
console.log(response.data.data.error); // 错误信息(如果有)
```

### 4. 获取使用统计

```javascript
const response = await axios.get('/api/ai/stats/user', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(response.data.data.totalRequests); // 总请求数
console.log(response.data.data.totalTokens); // 总token数
console.log(response.data.data.estimatedCost); // 估算成本
```

## 安全性

### 1. API密钥加密
- 使用AES-256-CBC加密算法
- 基于环境变量`ENCRYPTION_SECRET`生成密钥
- 密钥掩码显示(如: `sk-1234...abcd`)

### 2. 访问控制
- 用户只能访问自己的连接配置
- 平台配置仅管理员可访问
- API调用支持速率限制

### 3. 配额控制
- 平台级每月预算上限
- 用户级每日token限制
- 告警阈值设置

## 支持的AI平台

### 1. OpenAI
- 基础URL: `https://api.openai.com`
- 模型: GPT-4, GPT-3.5-turbo等
- 协议: OpenAI Chat Completions API

### 2. DeepSeek
- 基础URL: `https://api.deepseek.com`  
- 模型: deepseek-chat, deepseek-coder
- 协议: OpenAI兼容

### 3. Anthropic (Claude)
- 基础URL: `https://api.anthropic.com`
- 模型: Claude 3系列
- 协议: Anthropic Messages API

### 4. Google (Gemini)
- 基础URL: Google AI API
- 模型: Gemini Pro等
- 协议: Google AI API

### 5. Custom/Other
- 支持任何OpenAI兼容的API
- 可自定义baseURL和headers

## 下一步工作

### 前端实现
1. **管理员AI配置管理界面**
   - Provider配置管理
   - 密钥管理
   - 使用监控和统计
   - 配额设置

2. **用户AI连接设置界面**
   - BYOK配置表单
   - 连接测试
   - 使用统计查看
   - 配额告警

3. **集成到分集管理页面**
   - AI生成按钮
   - 自动填充剧本内容
   - 生成历史记录
   - 重新生成功能

### 测试计划
1. 单元测试
   - 模型方法测试
   - 服务层逻辑测试
   - 路由测试

2. 集成测试
   - 平台密钥调用
   - 用户BYOK调用
   - 降级策略测试
   - 错误处理测试

3. 性能测试
   - 并发调用
   - 速率限制
   - 流式输出

## 配置示例

### 环境变量 (.env)
```env
# AI服务加密密钥(32字符)
ENCRYPTION_SECRET=your-32-char-secret-key-here!

# 其他已有配置...
```

### 初始化平台配置 (可选)
管理员可以通过后台管理界面配置,或使用MongoDB直接插入:

```javascript
// 示例: 创建默认平台配置
const AIConfig = require('./src/models/AIConfig');

const defaultConfig = new AIConfig({
  name: 'default',
  description: '默认AI配置',
  isActive: true,
  providers: [
    {
      provider: 'openai',
      displayName: 'OpenAI',
      providerType: 'openai',
      enabled: true,
      baseURL: 'https://api.openai.com',
      apiKeys: [
        {
          label: '主密钥',
          weight: 100,
          isActive: true
        }
      ],
      defaultModel: 'gpt-3.5-turbo',
      models: {
        allowCustomModel: true,
        presets: [
          {
            model: 'gpt-3.5-turbo',
            displayName: 'GPT-3.5 Turbo',
            maxTokens: 4096,
            enabled: true
          },
          {
            model: 'gpt-4',
            displayName: 'GPT-4',
            maxTokens: 8192,
            enabled: true
          }
        ]
      },
      requestParams: {
        defaults: {
          temperature: 0.8,
          maxTokens: 4000
        }
      }
    }
  ],
  quota: {
    dailyFreeQuota: 100000,
    monthlyBudget: 1000,
    perUserDailyLimit: 10000
  }
});

// 设置API密钥并保存
defaultConfig.providers[0].apiKeys[0].keyEncrypted = defaultConfig.encryptApiKey('sk-your-api-key-here').keyEncrypted;
defaultConfig.providers[0].apiKeys[0].keyMask = defaultConfig.encryptApiKey('sk-your-api-key-here').keyMask;

await defaultConfig.save();
```

## 故障排查

### 常见问题

1. **"平台AI服务未配置"**
   - 检查AIConfig是否存在且isActive=true
   - 确认至少有一个provider配置

2. **"API密钥验证失败"**
   - 检查密钥格式是否正确
   - 确认baseURL是否正确
   - 检查网络连接

3. **"超出配额限制"**
   - 检查配额设置
   - 查看使用统计
   - 调整配额或清理旧数据

4. **"加密错误"**
   - 确认ENCRYPTION_SECRET环境变量已设置
   - 检查密钥长度是否足够

## 贡献者

- 主要开发: AI Assistant
- 项目集成: [Your Name]

## 许可证

MIT License
