# AI集成快速参考

## 📁 文件清单

### 新增文件
✅ `frontend/src/api/ai.js` - AI API封装模块

### 修改文件
✅ `frontend/src/views/tools/productivity/drama/components/WorldviewEditor.vue` - 添加AI自动生成功能

### 已存在可用文件
✅ `backend/src/routes/ai.js` - 后端AI路由
✅ `backend/src/controllers/aiGatewayController.js` - AI网关控制器
✅ `backend/src/services/AIGatewayService.js` - AI网关服务
✅ `frontend/src/utils/aiResponseParser.js` - AI响应解析器（已实现worldview模式）

---

## 🎯 核心功能

### 1. AI API封装 (`frontend/src/api/ai.js`)

```javascript
import { generateAIContent, generateAIStream } from '@/api/ai';

// 普通生成
const response = await generateAIContent(messages, {
  temperature: 0.8,
  maxTokens: 2000
});

// 流式生成
generateAIStream(messages, onChunk, onComplete, onError, options);
```

### 2. WorldviewEditor AI功能

**新增按钮：**
- 主按钮：`AI自动生成` - 点击自动生成并填充
- 下拉菜单：
  - `自动生成并填充` - 普通模式
  - `流式生成（实时显示）` - 流式模式
  - `生成提示词（手动）` - 保留原功能

**生成流程：**
```
用户点击 → 生成提示词 → 调用AI API → 解析响应 → 填充表单 → 显示成功提示
```

---

## 🔌 API接口

### 后端接口

#### 1. AI生成（普通）
```
POST /api/ai/generate
Content-Type: application/json
Authorization: Bearer <token> (可选)

Request:
{
  "messages": [
    { "role": "system", "content": "系统提示" },
    { "role": "user", "content": "用户输入" }
  ],
  "temperature": 0.8,
  "maxTokens": 2000,
  "requireUserKey": false
}

Response:
{
  "code": 200,
  "message": "生成成功",
  "data": {
    "content": "AI生成的内容",
    "usage": {
      "promptTokens": 100,
      "completionTokens": 200,
      "totalTokens": 300
    },
    "model": "gpt-3.5-turbo",
    "latency": 1500
  }
}
```

#### 2. AI生成（流式）
```
POST /api/ai/generate/stream
Content-Type: application/json
Authorization: Bearer <token> (可选)

Request: (同上)

Response: (Server-Sent Events)
data: {"type":"chunk","content":"AI"}
data: {"type":"chunk","content":"生成"}
data: {"type":"chunk","content":"的"}
data: {"type":"chunk","content":"内容"}
data: {"type":"done","usage":{...}}
```

---

## 🧩 核心代码片段

### 1. 调用AI生成

```javascript
// 普通生成
const performNormalGenerate = async (messages) => {
  const response = await generateAIContent(messages, {
    temperature: 0.8,
    maxTokens: 2000
  });

  if (response.code === 200 && response.data?.content) {
    const parsedData = parseWorldviewResponse(response.data.content);
    // 填充表单...
  }
};
```

### 2. 流式生成

```javascript
const performStreamGenerate = async (messages) => {
  let fullContent = '';
  
  generateAIStream(
    messages,
    (chunk) => {
      fullContent += chunk;
      streamingContent.value = fullContent; // 实时显示
    },
    (data) => {
      const parsedData = parseWorldviewResponse(fullContent);
      // 填充表单...
    },
    (error) => {
      console.error('生成失败:', error);
    }
  );
};
```

### 3. 错误处理

```javascript
try {
  await performAIGenerate();
} catch (error) {
  if (error.response?.data?.message?.includes('未找到')) {
    // 引导用户配置AI
    ElMessageBox.confirm('未找到可用的AI连接...', {
      confirmButtonText: '去配置',
      cancelButtonText: '手动模式'
    });
  } else {
    ElMessage.error('AI生成失败');
  }
}
```

---

## 🎨 UI组件

### AI生成状态提示

```vue
<el-alert
  v-if="aiGenerating"
  type="info"
  :closable="false"
>
  <template #title>
    <div class="generating-header">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>AI正在生成...</span>
    </div>
  </template>
  
  <!-- 流式显示内容 -->
  <div v-if="streamingContent" class="streaming-preview">
    {{ streamingContent }}
  </div>
  
  <!-- 进度条 -->
  <el-progress 
    v-else
    :percentage="generateProgress" 
    :indeterminate="generateProgress < 10"
  />
</el-alert>
```

---

## 🔄 数据流

```
┌─────────────┐
│ 用户点击按钮 │
└──────┬──────┘
       ↓
┌──────────────────┐
│ 生成提示词        │
│ (promptTemplates) │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 调用AI API        │
│ (generateAI...)   │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 解析AI响应        │
│ (parseWorldview)  │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 填充表单数据      │
│ (formData.value)  │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 显示成功提示      │
└──────────────────┘
```

---

## 🚨 常见错误代码

| 错误码 | 说明 | 解决方案 |
|-------|------|---------|
| 400 | 参数错误 | 检查messages格式 |
| 401 | 未授权 | 检查token |
| 500 | 服务器错误 | 查看后端日志 |
| NO_CONNECTION | 无AI连接 | 配置AI密钥 |
| QUOTA_EXCEEDED | 配额超限 | 检查配额设置 |

---

## 📝 提示词格式要求

AI生成的内容需要使用特定格式，便于解析：

```
【故事背景】
现代都市，A市经济中心...

【世界设定】
豪门世家的等级制度...

【核心主题】
爱情与自我救赎...

【主要冲突】
男女主的身份差距...

【情感基调】
浪漫甜蜜
```

解析器会识别 `【字段名】` 标记并提取内容。

---

## 🎯 扩展到其他模块

复用相同模式扩展到其他编辑器：

### 1. 角色管理器
```javascript
// 调用AI生成角色
const handleAIGenerateCharacter = async () => {
  const prompt = generateCharacterPrompt(data);
  const messages = [
    { role: 'system', content: '你是专业的角色设计师' },
    { role: 'user', content: prompt }
  ];
  const response = await generateAIContent(messages);
  const parsedData = parseCharacterResponse(response.data.content);
  // 填充角色数据...
};
```

### 2. 大纲编辑器
```javascript
// 调用AI生成大纲
const handleAIGenerateOutline = async () => {
  const prompt = generateOutlinePrompt(data);
  // ...同上
  const parsedData = parseOutlineResponse(response.data.content);
};
```

### 3. 分集管理器
```javascript
// 调用AI生成分集
const handleAIGenerateEpisode = async () => {
  const prompt = generateEpisodePrompt(data);
  // ...同上
  const parsedData = parseEpisodeResponse(response.data.content);
};
```

---

## 🔧 配置示例

### 用户AI配置（BYOK）

```javascript
// 在个人中心配置
{
  name: '我的OpenAI',
  provider: 'openai',
  baseURL: 'https://api.openai.com',
  apiKey: 'sk-xxxxxxxxxx',
  defaultModel: 'gpt-3.5-turbo',
  requestParams: {
    temperature: 0.8,
    maxTokens: 2000
  },
  isDefault: true
}
```

### 平台AI配置（管理员）

```javascript
// 在管理后台配置
{
  name: 'default',
  isActive: true,
  providers: [{
    provider: 'openai',
    enabled: true,
    baseURL: 'https://api.openai.com',
    apiKeys: [{
      label: '主密钥',
      keyEncrypted: '...',
      weight: 100
    }],
    defaultModel: 'gpt-3.5-turbo'
  }]
}
```

---

## 📚 相关文档

- [AI接入功能需求文档](./requirements/AI接入功能需求文档.md)
- [AI API集成实现文档](../../../AI_API_INTEGRATION.md)
- [世界观AI生成测试指南](./AI_WORLDVIEW_INTEGRATION_TEST.md)

---

## 💡 最佳实践

1. **提示词设计**
   - 明确输出格式要求
   - 使用【】标记字段便于解析
   - 提供示例格式

2. **错误处理**
   - 友好的错误提示
   - 提供解决方案引导
   - 支持降级到手动模式

3. **用户体验**
   - 显示生成进度
   - 流式显示增加参与感
   - 保留手动编辑能力

4. **性能优化**
   - 控制Token使用量
   - 合理设置超时时间
   - 避免重复调用

---

## 🎉 完成！

现在你可以：
1. ✅ 启动前后端服务
2. ✅ 配置AI密钥
3. ✅ 测试世界观AI生成功能
4. ✅ 根据测试结果调整
5. ✅ 扩展到其他模块

祝开发顺利！🚀
