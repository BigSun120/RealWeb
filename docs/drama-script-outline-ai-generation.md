# 大纲AI智能生成功能实现文档

## 概述
本文档记录了在剧本生成工具的大纲编辑器（OutlineEditor）中实现的AI智能生成和批量导入功能。该功能允许用户通过AI一次性生成完整的三幕式剧情大纲，大幅提升剧本创作效率。

## 实现日期
2024年

## 功能描述

### 1. AI智能生成按钮
- **位置**：OutlineEditor组件的头部操作区
- **功能**：生成用于AI工具的完整大纲提示词
- **按钮样式**：绿色success类型，带MagicStick图标
- **用户流程**：
  1. 点击"AI智能生成"按钮
  2. 系统检查世界观和角色数据（如无，提示建议先完善）
  3. 生成包含项目信息、世界观、角色的完整大纲提示词
  4. 显示提示词对话框，用户可复制到ChatGPT等AI工具

### 2. 导入大纲按钮
- **位置**：OutlineEditor组件的头部操作区
- **功能**：解析并导入AI生成的大纲结构
- **按钮样式**：橙色warning类型，带DocumentCopy图标
- **用户流程**：
  1. 点击"导入大纲"按钮
  2. 在弹出对话框中粘贴AI生成的大纲内容
  3. 点击"智能解析"，系统自动解析三幕式结构
  4. 预览解析结果（显示幕数和节点数）
  5. 确认导入，大纲自动填充到编辑器并保存

## 技术实现

### 文件修改清单

#### OutlineEditor.vue
**修改内容**：
- 新增两个操作按钮（AI智能生成、导入大纲）
- 新增状态管理：
  - `showAIPromptDialog`: 控制AI生成提示词对话框
  - `aiGeneratedPrompt`: 存储生成的AI提示词
  - `showImportDialog`: 控制导入对话框
- 新增组件导入：
  - `AIResponseParser`: 用于解析AI回复
  - `DocumentCopy`: 图标组件
  - `ElMessageBox`: 确认对话框
  - `generateCompleteOutlinePrompt`: 完整大纲提示词生成函数
- 新增方法：
  - `handleAIGenerate()`: 处理AI生成按钮点击
  - `generateAIPrompt()`: 生成AI提示词的具体逻辑
  - `handleImportOutline()`: 打开导入对话框
  - `handleOutlineParsed(parsedData)`: 处理解析后的大纲数据
  - `getTotalNodesFromParsed(parsedData)`: 计算总节点数

**关键代码逻辑**：
```javascript
// AI智能生成逻辑
const handleAIGenerate = () => {
  const hasWorldview = props.worldview && Object.keys(props.worldview).length > 0;
  const hasCharacters = props.characters && props.characters.length > 0;
  
  if (!hasWorldview || !hasCharacters) {
    // 提示用户先完善世界观和角色
    ElMessageBox.confirm(/* 提示信息 */)
      .then(() => generateAIPrompt())
  } else {
    generateAIPrompt();
  }
};

// 大纲导入逻辑
const handleOutlineParsed = (parsedData) => {
  // 将解析的数据转换为组件格式
  const convertedActs = parsedData.acts.map((act, index) => {
    const plotPoints = (act.nodes || []).map(node => ({
      id: generateId(),
      name: node.title || '',
      description: node.content || '',
      characters: node.characters || [],
      emotion: node.emotion || '',
      episodeRange: node.episodeRange || ''
    }));
    
    return {
      actNumber: index + 1,
      title: act.title,
      description: act.description,
      plotPoints
    };
  });
  
  outlineData.value.acts = convertedActs;
  emit('save', outlineData.value);
};
```

### 数据结构转换

#### AI解析格式 → 组件格式
```javascript
// AI解析返回的格式
{
  acts: [
    {
      title: "第一幕：开端",
      description: "描述",
      nodes: [
        {
          title: "节点标题",
          content: "节点内容",
          characters: ["角色1", "角色2"],
          emotion: "紧张",
          episodeRange: "1-3"
        }
      ]
    }
  ]
}

// 转换为组件使用的格式
{
  structure: "three-act",
  acts: [
    {
      actNumber: 1,
      title: "第一幕：开端",
      description: "描述",
      plotPoints: [
        {
          id: "unique_id",
          name: "节点标题",
          description: "节点内容",
          characters: ["角色1", "角色2"],
          emotion: "紧张",
          episodeRange: "1-3"
        }
      ]
    }
  ]
}
```

## 用户体验优化

### 1. 智能前置检查
- 检查世界观和角色数据是否完善
- 提供友好的提示，但允许用户选择继续

### 2. 自动保存
- 导入成功后自动触发保存
- 更新父组件的modelValue
- 确保数据持久化

### 3. 实时反馈
- 显示解析进度和结果
- 成功消息包含具体的幕数和节点数
- 清晰的错误提示

### 4. 无缝集成
- 与现有手动编辑功能完美配合
- 导入的数据可以继续编辑
- 保持统一的UI风格

## 工作流程示意

```
用户点击"AI智能生成"
    ↓
检查世界观和角色数据
    ↓
生成完整大纲提示词
    ↓
显示提示词对话框（用户复制）
    ↓
用户在ChatGPT等AI工具中生成大纲
    ↓
用户点击"导入大纲"
    ↓
粘贴AI生成的内容
    ↓
智能解析三幕式结构
    ↓
预览解析结果（X幕Y个节点）
    ↓
确认导入
    ↓
大纲填充到编辑器
    ↓
自动保存 ✅
```

## 与其他功能的集成

### 与世界观和角色的联动
- 提示词生成时自动包含世界观背景
- 提示词包含所有已创建角色的信息
- AI可以基于角色生成针对性的剧情节点

### 与集数管理的关联
- 大纲中的`episodeRange`字段预估集数范围
- 为后续的批量集数生成提供基础
- 统计显示预估总集数

### 数据流向
```
WorldviewEditor → 世界观数据
CharacterManager → 角色数据
    ↓
OutlineEditor (AI生成)
    ↓
EpisodeManager (集数生成)
```

## 已有基础设施（之前实现）

### promptTemplates.js
已实现的函数：
- `generateCompleteOutlinePrompt(options)`: 生成完整大纲提示词
  - 接收参数：项目类型、项目名称、世界观、角色列表、总集数
  - 返回：结构化的三幕式大纲生成提示词

### aiResponseParser.js
已实现的函数：
- `parseOutlineResponse(text)`: 解析大纲回复
  - 使用【第一幕】、【第二幕】、【第三幕】等标记作为分隔符
  - 提取每一幕的标题、描述、节点信息
  - 节点包含标题、内容、涉及角色、情感、集数范围
  - 返回格式：`{ acts: [...] }`

### AIResponseParser.vue
已扩展支持：
- `mode="outline"`: 大纲解析模式
- 大纲预览界面，显示三幕结构和节点
- `@parsed`事件，返回解析的大纲数据

## 测试建议

### 功能测试
1. 测试有完整世界观和角色时的AI生成
2. 测试缺少世界观或角色时的提示流程
3. 测试AI回复的各种格式解析
4. 测试导入后的数据正确性
5. 测试自动保存功能
6. 测试解析失败的错误处理

### 数据转换测试
1. 测试节点ID生成的唯一性
2. 测试不同数量幕的解析（标准为3幕）
3. 测试节点字段的完整性和可选性
4. 测试与现有手动编辑的兼容性

### 集成测试
1. 测试与世界观和角色数据的集成
2. 测试导入后继续手动编辑
3. 测试预估集数统计的准确性
4. 测试与EpisodeManager的数据传递

## 技术亮点

1. **智能前置检查**：确保生成的大纲质量，同时保留用户自主权
2. **数据格式转换**：自动将AI格式转换为组件内部格式
3. **自动保存机制**：导入即保存，减少数据丢失风险
4. **统计信息展示**：实时显示大纲统计（节点数、角色数、预估集数）
5. **可扩展架构**：为后续的集数批量生成奠定基础

## 与批量角色生成的对比

| 特性 | 批量角色生成 | 大纲AI生成 |
|------|------------|-----------|
| 数据追加 | 追加到现有角色列表 | 替换整个大纲结构 |
| 数据转换 | 简单字段映射 | 复杂的层级转换（幕→节点） |
| 自动保存 | 导入后保存 | 导入后保存 |
| 前置检查 | 检查世界观 | 检查世界观+角色 |
| 预览方式 | 角色卡片列表 | 三幕结构树 |

## 维护说明

### 关键文件位置
- `frontend/src/views/tools/productivity/drama/components/OutlineEditor.vue`
- `frontend/src/views/tools/productivity/drama/components/AIResponseParser.vue`
- `frontend/src/views/tools/productivity/drama/utils/promptTemplates.js`
- `frontend/src/views/tools/productivity/drama/utils/aiResponseParser.js`

### 依赖关系
```
OutlineEditor.vue
    ├─ AIResponseParser.vue (mode="outline")
    │   └─ aiResponseParser.js (parseOutlineResponse)
    └─ promptTemplates.js (generateCompleteOutlinePrompt)
```

### 注意事项
1. 解析函数假定AI回复使用【第X幕】格式，格式变化需要更新解析逻辑
2. 导入大纲会替换现有所有内容，建议添加确认提示（未来优化）
3. 节点ID使用时间戳+随机数生成，确保唯一性
4. episodeRange格式为字符串（如"1-3"），需要在集数生成时进一步解析

## 后续优化方向

### 1. 导入前确认
- 如果大纲已有内容，提示用户是否覆盖
- 提供"合并"选项，将AI生成的节点追加到现有幕

### 2. 增量生成
- 支持为单个幕生成节点
- 支持在现有大纲基础上扩展

### 3. 智能建议
- 根据总集数智能建议节点数量
- 根据节点复杂度建议集数分配

### 4. 导入历史
- 记录导入历史，支持回退
- 对比不同版本的大纲

## 总结

大纲AI智能生成功能是剧本创作工具的核心功能之一，它连接了前期的世界观和角色设定，为后续的集数生成提供了结构化的基础。通过智能检查、自动转换、自动保存等机制，大幅降低了用户的创作门槛，让剧本大纲的创建变得快速而高效。

该功能与批量角色生成功能共同构成了剧本创作的"快速起步"套件，为用户提供了从零到完整剧本框架的流畅体验。
