# Phase 2.3: AI集成与剧本创作MVP - 开发计划

## 📅 开发周期
**预计时间**: 3-4天
**开始时间**: 2025-10-12

## 🎯 核心目标

Phase 2.3 的主要目标是完善AI工作流程闭环，并实现基础的剧本创作功能。

### 优先级1: AI回答集成（高优先级）⭐⭐⭐
**问题**: 目前用户生成提示词后复制给AI，但AI的回答无法方便地回填到系统中

**解决方案**: 实现"粘贴AI回答"功能
- 用户可以将AI生成的内容粘贴回工具
- 智能解析AI回答内容
- 自动或手动填充到对应字段

### 优先级2: 大纲编辑器（中优先级）⭐⭐
**目标**: 帮助用户构建完整的剧情框架
- 三幕结构编辑
- 关键剧情节点管理
- 大纲提示词生成

### 优先级3: 分集剧本管理（中优先级）⭐⭐
**目标**: 管理多集短剧的剧本
- 分集列表管理
- 场景编辑器
- 分集提示词生成

### 优先级4: 辅助功能（低优先级）⭐
- 版本历史
- 导出功能

## 📋 详细任务拆解

### 任务组1: AI回答集成（1-1.5天）

#### 1.1 创建AI回答解析器组件
**文件**: `components/AIResponseParser.vue`

**功能需求**:
- 大文本框用于粘贴AI完整回答
- 智能解析按钮
- 手动映射选项（如果智能解析失败）
- 预览解析结果
- 确认填充按钮

**解析策略**:
```javascript
// 策略1: 关键词提取
// 查找常见标记：【背景】、**主题**、## 冲突、等
// 使用正则表达式匹配

// 策略2: 段落分割
// AI回答通常按段落组织，尝试按段落匹配字段

// 策略3: 手动选择
// 如果自动解析失败，提供手动选择工具
// 用户可以高亮文本并选择对应字段
```

**UI设计**:
```
┌─────────────────────────────────────────┐
│  粘贴AI回答                              │
│  ┌─────────────────────────────────────┐│
│  │ [粘贴区域 - 大文本框]                ││
│  │                                     ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌──────────┐ ┌──────────┐             │
│  │智能解析  │ │手动填充  │             │
│  └──────────┘ └──────────┘             │
│                                          │
│  解析结果预览:                           │
│  ┌─────────────────────────────────────┐│
│  │ ✓ 故事背景: [解析出的内容...]        ││
│  │ ✓ 核心主题: [解析出的内容...]        ││
│  │ ✗ 情感基调: [未识别] → [手动选择]   ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌──────────┐ ┌──────────┐             │
│  │  取消    │ │确认填充  │             │
│  └──────────┘ └──────────┘             │
└─────────────────────────────────────────┘
```

#### 1.2 集成到WorldviewEditor
**修改文件**: `components/WorldviewEditor.vue`

**新增功能**:
- "粘贴AI回答"按钮（紧挨"生成提示词"按钮）
- 调用AIResponseParser组件
- 接收解析结果并填充表单

**工作流程**:
```
用户点击"粘贴AI回答"
  ↓
打开AIResponseParser对话框
  ↓
用户粘贴AI内容
  ↓
点击"智能解析"
  ↓
系统解析并显示结果预览
  ↓
用户调整（如需要）
  ↓
点击"确认填充"
  ↓
自动填充到WorldviewEditor表单
  ↓
用户审核并保存
```

#### 1.3 集成到CharacterManager
**修改文件**: `components/CharacterManager.vue` 和 `CharacterDialog.vue`

**新增功能**:
- 在角色编辑对话框中添加"粘贴AI回答"按钮
- 解析角色相关的AI回答
- 自动填充角色表单字段

**特殊考虑**:
- 角色字段较多（姓名、年龄、性格、背景、动机、关系等）
- 需要更精细的解析逻辑

#### 1.4 创建解析工具函数
**文件**: `utils/aiResponseParser.js`

**导出函数**:
```javascript
// 解析世界观AI回答
export function parseWorldviewResponse(text) {
  return {
    background: extractField(text, ['背景', '世界背景', '故事背景']),
    setting: extractField(text, ['设定', '世界设定', '设定内容']),
    theme: extractField(text, ['主题', '核心主题', '故事主题']),
    conflict: extractField(text, ['冲突', '核心冲突', '主要冲突']),
    tone: extractField(text, ['基调', '情感基调', '氛围'])
  };
}

// 解析角色AI回答
export function parseCharacterResponse(text) {
  return {
    name: extractField(text, ['姓名', '角色名', '名字']),
    age: extractAge(text),
    gender: extractGender(text),
    description: extractField(text, ['描述', '简介', '角色描述']),
    personality: extractField(text, ['性格', '性格特点', '个性']),
    background: extractField(text, ['背景', '角色背景', '身世']),
    motivation: extractField(text, ['动机', '行为动机', '目标']),
    relationships: extractField(text, ['关系', '人际关系', '社会关系'])
  };
}

// 通用字段提取函数
function extractField(text, keywords) {
  // 实现关键词匹配和内容提取
}

// 提取年龄
function extractAge(text) {
  // 正则匹配年龄数字
}

// 提取性别
function extractGender(text) {
  // 识别"男"、"女"等关键词
}
```

### 任务组2: 大纲编辑器（1-1.5天）

#### 2.1 创建OutlineEditor组件
**文件**: `components/OutlineEditor.vue`

**功能需求**:
- **三幕结构编辑**:
  - 第一幕：开端（Setup）
  - 第二幕：对抗（Confrontation）
  - 第三幕：结局（Resolution）
- **关键节点管理**:
  - 开场钩子（Hook）
  - 转折点1（Plot Point 1）
  - 中点（Midpoint）
  - 转折点2（Plot Point 2）
  - 高潮（Climax）
  - 结尾（Resolution）
- 每个节点包含:
  - 节点名称
  - 发生的事件描述
  - 涉及的角色
  - 情感变化
  - 预估集数/时长
- **可视化展示**:
  - 时间线视图
  - 情感曲线图（可选，后续实现）
- **提示词生成**:
  - 基于大纲生成完整的剧情提示词

**数据结构**:
```javascript
outline: {
  structure: 'three-act', // 三幕结构
  acts: [
    {
      actNumber: 1,
      title: '第一幕：开端',
      description: '建立世界观，介绍主要角色，引发核心冲突',
      plotPoints: [
        {
          id: 'hook',
          name: '开场钩子',
          description: '吸引观众的开场事件',
          characters: ['陆景琛', '苏晚晚'],
          emotion: '好奇',
          episodeRange: '1-2'
        },
        {
          id: 'pp1',
          name: '转折点1',
          description: '主角进入新世界/做出重大决定',
          characters: ['陆景琛', '苏晚晚'],
          emotion: '紧张',
          episodeRange: '3-4'
        }
      ]
    },
    // 第二幕、第三幕...
  ]
}
```

**UI布局**:
```
┌─────────────────────────────────────────┐
│  大纲编辑器                              │
│                                          │
│  [三幕结构] [自由结构] (标签切换)        │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ 第一幕：开端 (1-4集)              │  │
│  │ ┌─────────────────────────────┐  │  │
│  │ │ 开场钩子                      │  │  │
│  │ │ 描述: [文本框]                │  │  │
│  │ │ 角色: [多选]                  │  │  │
│  │ │ 情感: [下拉]                  │  │  │
│  │ └─────────────────────────────┘  │  │
│  │ ┌─────────────────────────────┐  │  │
│  │ │ 转折点1                       │  │  │
│  │ │ ...                          │  │  │
│  │ └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ 第二幕：对抗 (5-12集)             │  │
│  │ ...                              │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌──────────┐ ┌──────────┐             │
│  │生成提示词│ │  保存    │             │
│  └──────────┘ └──────────┘             │
└─────────────────────────────────────────┘
```

#### 2.2 更新promptTemplates
**修改文件**: `utils/promptTemplates.js`

**增强generateOutlinePrompt函数**:
- 接收详细的大纲结构数据
- 生成更专业的大纲提示词
- 包含三幕结构和关键节点信息

#### 2.3 集成到workbench
**修改文件**: `workbench.vue`

- 添加"剧情大纲"菜单项
- 集成OutlineEditor组件
- 实现数据绑定和保存

### 任务组3: 分集剧本管理（1天）

#### 3.1 创建EpisodeManager组件
**文件**: `components/EpisodeManager.vue`

**功能需求**:
- **分集列表**:
  - 卡片/列表视图
  - 显示集数、标题、状态、字数
  - 添加/编辑/删除分集
  - 排序和筛选
- **分集状态**:
  - 未开始、进行中、已完成、已审核
- **快速操作**:
  - 查看/编辑剧本
  - 生成提示词
  - 导出单集
- **批量操作**:
  - 批量生成提示词
  - 批量导出

**数据结构**:
```javascript
episodes: [
  {
    id: '1',
    number: 1,
    title: '第1集：契约开始',
    status: 'completed', // draft, in-progress, completed, reviewed
    content: {
      summary: '集简介',
      scenes: [
        {
          id: 's1',
          title: '场景1：高级餐厅',
          location: '米其林三星餐厅',
          time: '晚上8点',
          characters: ['陆景琛', '苏晚晚'],
          description: '场景描述...',
          dialogue: '对话内容...',
          notes: '导演备注'
        }
      ]
    },
    wordCount: 5000,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-02'
  }
]
```

#### 3.2 创建EpisodeEditor组件
**文件**: `components/EpisodeEditor.vue`

**功能需求**:
- 分集基本信息编辑
- 场景管理（添加/编辑/删除/排序）
- 富文本编辑器（可选）
- 自动保存
- 字数统计

#### 3.3 创建SceneCard组件
**文件**: `components/SceneCard.vue`

**功能需求**:
- 紧凑的场景卡片显示
- 展开/收起详情
- 快速编辑
- 拖拽排序

#### 3.4 集成到workbench
**修改文件**: `workbench.vue`

- 添加"分集管理"菜单项
- 集成EpisodeManager组件
- 实现数据同步

### 任务组4: 后端API支持（0.5天）

#### 4.1 扩展Drama模型
**修改文件**: `backend/models/Drama.js`

**新增字段**:
```javascript
{
  outline: {
    structure: String,
    acts: [{
      actNumber: Number,
      title: String,
      description: String,
      plotPoints: [/* 节点数据 */]
    }]
  },
  episodes: [{
    number: Number,
    title: String,
    status: String,
    content: {
      summary: String,
      scenes: [/* 场景数据 */]
    },
    wordCount: Number,
    createdAt: Date,
    updatedAt: Date
  }]
}
```

#### 4.2 更新Controller
**修改文件**: `backend/controllers/dramaController.js`

**新增/更新API**:
- `PUT /api/tools/drama/projects/:id/outline` - 更新大纲
- `GET/POST/PUT/DELETE /api/tools/drama/projects/:id/episodes` - 分集CRUD

### 任务组5: 测试与文档（0.5天）

#### 5.1 功能测试
- AI回答粘贴和解析测试
- 大纲编辑器完整流程测试
- 分集管理功能测试
- 数据持久化测试

#### 5.2 编写文档
- Phase 2.3功能说明
- API文档更新
- 用户使用指南
- 开发者指南

## 🎯 成功标准

### 必须完成（Must Have）
- ✅ AI回答粘贴和智能解析功能
- ✅ 世界观和角色的AI回答集成
- ✅ 大纲编辑器（三幕结构）
- ✅ 基础的分集管理功能

### 应该完成（Should Have）
- ✅ 大纲提示词生成
- ✅ 分集提示词生成
- ✅ 场景管理
- ✅ 后端API完整支持

### 可以推迟（Could Have）
- ⏳ 情感曲线可视化
- ⏳ 版本历史
- ⏳ 导出功能（PDF/Word）
- ⏳ 富文本编辑器

## 📊 风险评估

### 技术风险
1. **AI回答解析准确性**
   - 风险: AI回答格式各异，难以统一解析
   - 缓解: 提供手动映射功能作为后备方案

2. **大纲数据结构复杂性**
   - 风险: 三幕结构数据嵌套深，状态管理复杂
   - 缓解: 使用清晰的数据模型和组件封装

3. **性能问题**
   - 风险: 大量分集和场景数据可能影响性能
   - 缓解: 虚拟滚动、懒加载、分页

### 时间风险
- 如时间紧张，优先完成AI回答集成和大纲编辑器
- 分集管理可简化为基础版本

## 📝 开发顺序建议

### Day 1: AI回答集成
- 上午: 创建AIResponseParser组件
- 下午: 集成到WorldviewEditor和CharacterManager

### Day 2: 大纲编辑器
- 上午: 创建OutlineEditor组件基础结构
- 下午: 实现节点管理和提示词生成

### Day 3: 分集管理
- 上午: 创建EpisodeManager和EpisodeEditor
- 下午: 场景管理功能

### Day 4: 测试与优化
- 上午: 完整功能测试
- 下午: 修复bug、优化体验、编写文档

## 🚀 准备开始

确认是否开始Phase 2.3开发？

**开发顺序选项**:
1. ⭐ **推荐**: 按优先级开发（AI集成 → 大纲 → 分集）
2. 快速原型: 同时开发多个功能的简化版
3. 自定义: 指定你想先开发哪个功能

请确认开始开发！
