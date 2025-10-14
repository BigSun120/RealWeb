# 前端AI功能测试指南

## 已完成的功能

### 1. 用户AI连接管理界面 ✅
**路径**: `/ai-connections`
**文件**: `frontend/src/views/user/AIConnections.vue`

#### 功能特性:
- ✅ 显示用户所有AI连接
- ✅ 创建新的AI连接(BYOK)
- ✅ 编辑现有连接
- ✅ 删除连接
- ✅ 验证API密钥
- ✅ 查看使用统计
- ✅ 设置默认连接

#### 测试步骤:

1. **访问页面**
   ```
   登录后访问: http://localhost:3000/ai-connections
   ```

2. **创建连接**
   - 点击"添加连接"按钮
   - 选择提供商(OpenAI/DeepSeek/Anthropic/Google/自定义)
   - 填写必填信息:
     - 连接名称
     - 基础URL(会自动填充)
     - API密钥
     - 默认模型(会自动填充)
   - 调整可选参数(温度、最大Tokens)
   - 点击"创建"

3. **验证连接**
   - 在连接卡片中点击"验证"按钮
   - 系统会调用API测试密钥有效性
   - 显示验证结果

4. **查看统计**
   - 页面顶部显示总体统计
   - 每个连接卡片显示独立统计

5. **编辑/删除**
   - 点击"编辑"修改连接配置
   - 点击"删除"移除连接

## 待完成的功能

### 2. 管理员AI配置管理界面 (TODO)
**预期路径**: `/admin/ai-config`

功能需求:
- 平台AI服务配置
- 多Provider管理
- 多密钥管理和负载均衡
- 全局配额设置
- 使用监控

### 3. 分集管理AI生成集成 (TODO)
**预期位置**: 剧本工具的分集管理页面

功能需求:
- "AI生成"按钮
- 生成对话框
- 提示词模板
- 自动填充剧本内容
- 生成历史

## API测试

### 测试AI生成API

使用浏览器开发者工具或Postman测试:

#### 1. 测试基础生成(使用平台密钥)
```javascript
// 需要先配置平台AIConfig

fetch('http://localhost:8001/api/ai/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: '你是一个编剧助手' },
      { role: 'user', content: '请生成一个都市爱情短剧的开头' }
    ],
    temperature: 0.8,
    maxTokens: 500
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

#### 2. 测试用户密钥生成
```javascript
// 需要先创建用户AI连接

fetch('http://localhost:8001/api/ai/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## 集成步骤

### 在其他页面使用AI生成功能

```vue
<template>
  <el-button @click="generateWithAI">AI生成</el-button>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import axios from '@/utils/axios';

const generateWithAI = async () => {
  try {
    const { data } = await axios.post('/api/ai/generate', {
      messages: [
        { role: 'system', content: '你是编剧助手' },
        { role: 'user', content: '生成第1集剧本大纲' }
      ],
      temperature: 0.8,
      maxTokens: 2000
    });
    
    if (data.code === 200) {
      // 使用生成的内容
      console.log(data.data.content);
      ElMessage.success('生成成功');
    }
  } catch (error) {
    ElMessage.error('生成失败');
  }
};
</script>
```

## 常见问题

### 1. "平台AI服务未配置"错误
**原因**: 后端没有配置AIConfig
**解决**: 
- 需要管理员在后台配置平台AI服务
- 或者用户配置自己的BYOK连接

### 2. "API密钥验证失败"
**原因**: 
- 密钥格式错误
- 密钥已失效
- 网络问题

**解决**:
- 检查密钥格式
- 确认密钥有效性
- 检查baseURL是否正确

### 3. Token用完了怎么办
**对于用户BYOK**: 
- 自行充值API账户
- 或切换到其他连接

**对于平台服务**:
- 联系管理员增加配额
- 或配置自己的BYOK

## 下一步开发建议

### 优先级1: 基础功能完善
1. 完成管理员AI配置管理界面
2. 在个人中心添加"AI连接"入口
3. 测试完整的BYOK流程

### 优先级2: 集成到现有功能
1. 在剧本工具中集成AI生成
2. 添加AI生成历史记录
3. 支持重新生成和调整参数

### 优先级3: 高级功能
1. 流式输出支持
2. 多轮对话支持
3. 提示词模板库
4. 生成内容评分和优化建议

## 性能优化建议

1. **请求去重**: 防止用户重复点击
2. **错误重试**: 网络错误自动重试
3. **缓存策略**: 缓存常用的生成结果
4. **流式输出**: 对于长文本使用流式传输

## 安全注意事项

1. ✅ API密钥加密存储
2. ✅ 前端不显示完整密钥
3. ✅ 请求需要登录认证
4. ✅ 用户只能访问自己的连接
5. ⚠️ 需要添加请求频率限制(前端层面)
6. ⚠️ 需要添加敏感内容过滤
