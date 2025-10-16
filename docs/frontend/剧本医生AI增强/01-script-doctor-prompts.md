# 剧本医生 - AI 提示词设计指南

## 📋 文档目的

本文档详细说明【剧本医生】功能中 AI 提示词的设计原则、结构和关键约束，确保 AI 返回的内容格式正确、可解析、可应用。

---

## 🎯 提示词设计原则

### 核心目标

1. **精确定位**：AI 必须明确知道要修改的是哪个模块的哪个字段
2. **格式规范**：AI 返回的内容必须符合预定义的 JSON Schema
3. **字段完整**：特别是大纲模块，必须保留所有必需字段（`_id`、`id`、`emotion`、`episodeRange` 等）
4. **可解析性**：返回内容必须能被 `JSON.parse()` 成功解析

---

## 📝 两类提示词

### 1. 诊断提示词 (Diagnosis Prompt)

**用途**：让 AI 分析剧本并返回问题列表

**生成方法**：`generateDiagnosisPrompt(stage, project)`

**输入**：
- `stage`: 诊断阶段（`preparation` / `episodes` / `overall`）
- `project`: 完整项目对象

**输出格式**：
```json
{
  "issues": [
    {
      "id": "unique_id",
      "title": "问题标题",
      "description": "问题描述",
      "severity": "critical|medium|low",
      "location": {
        "module": "worldview|characters|outline|episodes",
        "field": "中文字段名",
        "characterId": "角色名（可选）",
        "episodeNumber": 集数（可选）
      }
    }
  ]
}
```

### 2. 解决方案提示词 (Solution Prompt)

**用途**：让 AI 针对具体问题生成修改方案

**生成方法**：`generateSolutionPrompt(issue, project)`

**输入**：
- `issue`: 问题对象
- `project`: 完整项目对象

**输出格式**：
```json
{
  "suggestedContent": "字符串或对象（取决于模块）",
  "explanation": "修改说明"
}
```

---

## 🔑 关键约束设计

### 1. 字段名精确约束

**问题**：AI 容易创造不存在的字段名或使用抽象概念

**解决方案**：在提示词中**明确列举所有可诊断字段**

**实现**：`generateFieldConstraints(project)` 方法（ScriptAnalysis.vue 第 1573-1650 行）

**示例输出**：
```
## 📍 可诊断字段清单（必须从以下选择）

### 🌍 世界观模块 (module: "worldview")
- 故事背景
- 世界设定
- 核心主题
- 主要冲突
- 情感基调

### 👥 角色模块 (module: "characters")
**逻辑概念字段**（用于批量诊断）：
- 主要配角
- 配角
- 次要角色

**具体字段**（用于单个角色诊断，需要提供 characterId 为角色名称）：
- 角色名称
- 角色定位
- 角色描述
- 性格描述
- 性格特点
- 角色背景
- 行为动机
- 人际关系

### 📝 大纲模块 (module: "outline")
- 第一幕
- 第二幕
- 第三幕
...

⚠️ 重要约束（必须遵守）
1. location.field 必须精确使用上述中文字段名
2. 不要使用抽象概念字段；如涉及多个位置，请拆分为多个 issue
```

### 2. 大纲模块的特殊格式约束

**问题**：大纲是唯一需要返回完整对象结构的模块，AI 容易遗漏字段

**解决方案**：详细的格式示例和字段要求

**关键提示词片段**（ScriptAnalysis.vue 第 1951-2078 行）：

```markdown
## 重要注意事项

1. **suggestedContent 的格式根据模块不同**
   - **如果是世界观字段**：suggestedContent 为字符串
   - **如果是角色字段**：suggestedContent 为字符串
   - **如果是大纲幕**：suggestedContent 为 JSON 对象（不是字符串）：
     ```json
     {
       "suggestedContent": {
         "_id": "68ee5c57b89f9267f4cb8f22",  // ⚠️ 幕的_id，必须放在最前面
         "id": "68ee5c57b89f9267f4cb8f22",   // ⚠️ 幕的id
         "actNumber": 2,
         "title": "第二幕：对抗",
         "description": "幕的完整描述...",
         "plotPoints": [
           {
             "id": "mgqngt6c2jld3dlpqe5",  // ⚠️ 情节点的id
             "name": "情节点名称",
             "description": "情节点完整描述...",
             "characters": ["角色1", "角色2"],
             "emotion": ["复仇的快感", "紧张"],  // ⚠️ 必需数组
             "episodeRange": "16-19",           // ⚠️ 必需字段
             "_id": "68ee5c57b89f9267f4cb8f23"  // ⚠️ 情节点的_id
           }
         ]
       },
       "explanation": "..."
     }
     ```

## ⚠️ 特别注意 - 幕和 plotPoints 的字段完整性

修改大纲时，**必须保留**原有字段：

### 幕层级必须保留：
1. **_id** - 幕的MongoDB内部ID，**必须放在最前面**
2. **id** - 幕的ID，**必须放在最前面**
3. **actNumber, title, description, plotPoints** - 根据问题优化

### plotPoints 层级必须保留：
1. **id** - 情节点原ID（如 "mgqngt6c2jld3dlpqe5"），不要改为 "1", "2", "3"
2. **_id** - 情节点MongoDB内部ID
3. **emotion** - 保留情感标签数组，可适当调整
4. **episodeRange** - 保留集数范围（如 "16-19"），可适当调整
5. **name, description, characters** - 根据问题优化
```

### 3. 正确示例 vs 错误示例

**提示词中包含对比示例**，让 AI 直观理解正确和错误的输出：

```markdown
### 示例1：角色字段修改（✅ 正确）

**问题定位**: 角色 > 行为动机 > 夏语冰

**✅ 正确返回**：
```json
{
  "suggestedContent": "揭示昆虫世界的奥秘...",
  "explanation": "1. 保留原有的科研动机\n2. 添加接触铺垫..."
}
```

**❌ 错误返回**（跨模块修改）：
```json
{
  "suggestedContent": {
    "actNumber": 2,
    "title": "第二幕：对抗",
    "description": "...关于情感铺垫的大纲..."
  }
}
```

### 示例2：大纲幕修改（重要！）

**✅ 正确返回**（注意：必须包含所有字段）：
```json
{
  "suggestedContent": {
    "_id": "68ee5c57b89f9267f4cb8f22",  // ✅ 必需
    "id": "68ee5c57b89f9267f4cb8f22",   // ✅ 必需
    "actNumber": 2,
    "title": "第二幕：对抗",
    "description": "本幕是复仇计划全面展开的阶段...",
    "plotPoints": [...]
  }
}
```

**❌ 错误返回1**（suggestedContent 是字符串）：
```json
{
  "suggestedContent": "{\n  \"actNumber\": 2,\n  ...",
  "explanation": "..."
}
```

**❌ 错误返回2**（缺少外层包装）：
```json
{
  "actNumber": 2,
  "title": "第二幕：对抗",
  ...
}
```
```

---

## 🏗️ JSON Schema 结构化输出

### 使用 responseFormat 参数

**实现位置**：`AIService.js` 和 `api/ai.js`

**诊断请求**：
```javascript
await generateAIContent(
  [{ role: 'user', content: prompt }],
  {
    temperature: 0.7,
    maxTokens: 3000,
    jsonSchema: DIAGNOSIS_ISSUES_SCHEMA  // ⚠️ 关键
  }
);
```

**解决方案请求**：
```javascript
await generateAIContent(
  [{ role: 'user', content: prompt }],
  {
    temperature: 0.8,
    maxTokens: 2000,
    jsonSchema: ACT_MODIFICATION_SCHEMA  // ⚠️ 根据问题类型选择
  }
);
```

### Schema 定义

**文件位置**：`frontend/src/views/tools/productivity/drama/schemas/aiResponseSchemas.js`

**诊断 Schema**（DIAGNOSIS_ISSUES_SCHEMA）：
```javascript
{
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          severity: { 
            type: "string", 
            enum: ["critical", "medium", "low"] 
          },
          location: {
            type: "object",
            properties: {
              module: { 
                type: "string",
                enum: ["worldview", "characters", "outline", "episodes"]
              },
              field: { type: "string" },
              characterId: { type: "string" },
              episodeNumber: { type: "number" }
            },
            required: ["module", "field"]
          }
        },
        required: ["title", "description", "severity", "location"]
      }
    }
  },
  required: ["issues"]
}
```

**大纲修改 Schema**（ACT_MODIFICATION_SCHEMA）：
```javascript
{
  type: "object",
  properties: {
    suggestedContent: {
      oneOf: [
        { type: "string" },
        {
          type: "object",
          properties: {
            _id: { type: "string" },
            id: { type: "string" },
            actNumber: { type: "number" },
            title: { type: "string" },
            description: { type: "string" },
            plotPoints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  _id: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  characters: { type: "array", items: { type: "string" } },
                  emotion: { type: "array", items: { type: "string" } },
                  episodeRange: { type: "string" }
                }
              }
            }
          }
        }
      ]
    },
    explanation: { type: "string" }
  },
  required: ["suggestedContent", "explanation"]
}
```

---

## 🔍 提示词调试

### 生成外部 AI 提示词

**功能**：支持导出提示词到外部 AI 工具（如 ChatGPT、Claude）进行测试

**触发**：点击"生成外部AI提示词"按钮

**实现**：
```javascript
const generatePromptForExternal = () => {
  const prompt = generateDiagnosisPrompt(activeStage.value, props.project);
  generatedPrompt.value = prompt;
  showPromptDialog.value = true;
};
```

**用途**：
1. 验证提示词逻辑
2. 在外部 AI 测试返回格式
3. 调试 Schema 匹配问题

### 导入 AI 结果

**功能**：支持粘贴外部 AI 返回的 JSON 结果

**实现**：
```javascript
const handleDiagnosisParsed = (parsedData) => {
  let issues = [];
  
  if (typeof parsedData === 'string') {
    issues = parseAIIssues(parsedData);
  } else if (parsedData && parsedData.issues) {
    issues = parsedData.issues;
  }
  
  aiIssues.value = issues.map(issue => ({
    ...issue,
    generating: false,
    status: 'pending'
  }));
  
  activeSubTab.value[activeStage.value] = 'ai-diagnosis';
  ElMessage.success(`成功导入 ${aiIssues.value.length} 个问题`);
};
```

---

## ⚠️ 常见问题及解决方案

### 问题1：AI 返回的 field 不在可选列表中

**症状**：`location.field` 使用了自创的字段名，如"整体节奏设计"、"角色塑造"

**原因**：提示词中字段约束不够明确

**解决方案**：
- ✅ 使用 `generateFieldConstraints()` 动态生成可用字段列表
- ✅ 在提示词中强调"必须从以下选择"
- ✅ 添加示例说明正确和错误的字段名

### 问题2：大纲 plotPoints 遗漏必需字段

**症状**：AI 返回的 `plotPoints` 缺少 `emotion`、`episodeRange` 等字段

**原因**：提示词示例不够详细

**解决方案**：
- ✅ 在提示词中明确标注 "⚠️ 必需字段"
- ✅ 提供完整的 plotPoints 示例
- ✅ 使用 JSON Schema 约束字段

### 问题3：AI 返回的内容是 MongoDB ID

**症状**：`suggestedContent` 为 24 位十六进制字符串（如 `"68ee5c57b89f9267f4cb8f22"`）

**原因**：AI 误读了示例中的 `_id` 字段

**解决方案**：
- ✅ 加载时验证并过滤 MongoDB ID（ScriptAnalysis.vue 第 2437-2447 行）
- ✅ 保存时验证并拒绝 MongoDB ID（ScriptAnalysis.vue 第 1162-1166 行）

### 问题4：AI 返回字符串化的 JSON

**症状**：`suggestedContent` 为 `"{\"actNumber\": 2, ...}"`

**原因**：AI 理解错误，把对象序列化为字符串

**解决方案**：
- ✅ 在提示词中明确：大纲的 `suggestedContent` 为**对象**（不是字符串）
- ✅ 提供错误示例警告
- ✅ 前端解析时尝试 `JSON.parse()` 兜底（AIService.js）

---

## 📊 提示词性能优化

### 1. 控制提示词长度

**问题**：过长的提示词增加成本和延迟

**策略**：
- ✅ 大纲仅传递前 100 字预览
- ✅ 分集内容仅传递摘要
- ✅ 角色信息按需传递

**实现示例**（ScriptAnalysis.vue 第 1913 行）：
```javascript
${project.worldview?.background ? 
  `- 故事背景：${project.worldview.background.substring(0, 100)}${
    project.worldview.background.length > 100 ? '...' : ''
  }` : ''}
```

### 2. 分阶段上下文

不同阶段传递不同的项目信息：

| 阶段 | 传递内容 | 省略内容 |
|------|---------|---------|
| **前期检查** | 世界观、角色、大纲 | 分集详细剧本 |
| **分集检查** | 世界观摘要、大纲、分集 | 角色详细信息 |
| **整体检查** | 完整信息 | - |

---

## 🎯 最佳实践

### 1. 提示词分层设计

```
┌─────────────────────────┐
│   任务描述 (明确目标)    │
├─────────────────────────┤
│   约束条件 (字段、格式)  │
├─────────────────────────┤
│   上下文信息 (项目内容)  │
├─────────────────────────┤
│   输出格式 (Schema示例)  │
├─────────────────────────┤
│   正反示例 (对比学习)    │
└─────────────────────────┘
```

### 2. 使用结构化输出

- ✅ 优先使用 `jsonSchema` 参数
- ✅ Schema 定义越详细越好
- ✅ 使用 `enum` 限制枚举值

### 3. 迭代优化

1. 收集 AI 错误响应案例
2. 分析失败原因（字段名、格式、理解偏差）
3. 在提示词中增加对应约束和示例
4. 更新 Schema 定义

---

**文档版本**：v1.0  
**最后更新**：2025-01-15  
**相关文档**：[系统概述](./script-doctor-overview.md)
