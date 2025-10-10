# AI提示词管理工具需求文档

## 📋 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | AI提示词管理工具（PromptVault）需求文档 |
| 文档版本 | v1.0 |
| 创建日期 | 2025-10-09 |
| 最后更新 | 2025-10-09 |
| 文档状态 | 待审核 |
| 负责人 | - |
| 优先级 | P0（高优先级） |

---

## 一、项目概述

### 1.1 项目背景

随着AI技术的普及，用户在使用ChatGPT、Claude、Gemini等AI工具时，需要频繁编写和管理大量提示词（Prompt）。目前存在以下痛点：

- **分散管理**：提示词散落在笔记软件、文本文件、聊天记录中，难以系统化管理
- **重复编写**：相似场景的提示词需要反复编写，缺乏复用机制
- **缺少变量**：静态提示词无法灵活适配不同场景，需要手动修改
- **效果追踪**：无法记录哪些提示词效果好，哪些需要改进
- **分享困难**：优质提示词难以分享给团队或社区

### 1.2 项目目标

开发一个集**创建、管理、分享、统计**于一体的AI提示词管理工具，帮助用户：

1. **高效管理**：系统化组织和管理个人提示词库
2. **快速复用**：通过变量系统实现提示词模板化
3. **效果跟踪**：记录使用统计和效果反馈
4. **知识共享**：支持公开分享优质提示词

### 1.3 目标用户

| 用户类型 | 使用场景 | 核心需求 |
|---------|---------|---------|
| 开发者 | 代码生成、代码审查、技术文档 | 代码相关提示词管理 |
| 内容创作者 | 文案撰写、故事创作、营销文案 | 创意提示词库 |
| 学生/教师 | 学习辅助、作业批改、知识问答 | 教育场景提示词 |
| 产品经理 | PRD编写、用户调研、需求分析 | 产品文档提示词 |
| 普通用户 | 日常咨询、生活助手、娱乐互动 | 通用提示词模板 |

### 1.4 工具定位

- **工具名称**：PromptVault（提示词保险库）
- **工具类型**：在线工具（集成到RealWeb工具箱）
- **核心特色**：动态变量系统 + 使用追踪 + 智能推荐
- **差异化**：区别于纯静态提示词库，支持参数化和效果评估

---

## 二、功能需求

### 2.1 功能架构图

```
PromptVault
├─ 提示词管理
│  ├─ 创建提示词
│  ├─ 编辑提示词
│  ├─ 删除提示词（软删除）
│  ├─ 批量操作
│  └─ 版本历史
├─ 组织系统
│  ├─ 文件夹管理
│  ├─ 分类标签
│  ├─ AI模型分类
│  └─ 场景分类
├─ 变量系统（核心）
│  ├─ 变量定义
│  ├─ 变量配置
│  ├─ 实时预览
│  └─ 历史记录
├─ 搜索与筛选
│  ├─ 全文搜索
│  ├─ 高级筛选
│  ├─ 智能排序
│  └─ 快速定位
├─ 使用与统计
│  ├─ 一键复制
│  ├─ 使用记录
│  ├─ 效果评分
│  └─ 统计分析
└─ 社区功能（二期）
   ├─ 公开提示词库
   ├─ 提示词分享
   ├─ 用户评价
   └─ 智能推荐
```

---

## 三、核心功能详细说明

### 3.1 提示词管理

#### 3.1.1 创建提示词

**功能描述**：
- 用户可以创建新的提示词模板
- 支持Markdown格式编辑
- 支持变量占位符定义

**必填字段**：
| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| title | String | 提示词标题 | "代码审查专家" |
| content | String | 提示词内容 | "你是一位资深的{{语言}}开发专家..." |
| aiModel | String | 适用AI模型 | "chatgpt" / "claude" / "gemini" |
| category | String | 主分类 | "code" / "content" / "analysis" |

**选填字段**：
| 字段 | 类型 | 说明 |
|------|------|------|
| description | String | 简短描述（50-200字） |
| subcategories | Array | 子分类数组 |
| tags | Array | 自由标签 |
| difficulty | String | 难度等级（beginner/intermediate/advanced） |
| estimatedTokens | Number | 预估token数 |
| tips | String | 使用技巧 |
| warnings | String | 注意事项 |

**变量定义格式**：
```javascript
variables: [
  {
    name: "语言",              // 变量名
    type: "select",           // 类型：text/select/textarea
    required: true,           // 是否必填
    default: "JavaScript",    // 默认值
    options: [                // 下拉选项（type=select时）
      "JavaScript",
      "Python",
      "Java",
      "Go"
    ],
    placeholder: "请选择编程语言",
    description: "要审查的代码所使用的编程语言"
  }
]
```

**UI交互**：
1. 点击"新建提示词"按钮
2. 弹出创建对话框/跳转创建页面
3. 填写基本信息
4. 编写提示词内容（支持Markdown编辑器）
5. 定义变量（可选）
6. 预览效果
7. 保存提示词

#### 3.1.2 编辑提示词

**功能描述**：
- 支持修改提示词的所有字段
- 自动保存版本历史
- 支持恢复历史版本

**版本控制**：
```javascript
versionHistory: [
  {
    version: "1.0.0",
    content: "初始版本内容",
    changes: "创建提示词",
    createdAt: "2025-10-09T12:00:00Z"
  },
  {
    version: "1.1.0",
    content: "优化后的内容",
    changes: "优化变量定义，增加使用技巧",
    createdAt: "2025-10-10T15:30:00Z"
  }
]
```

#### 3.1.3 删除提示词

**功能描述**：
- 软删除机制，标记为已删除但不真正删除
- 提供回收站功能，支持恢复
- 30天后自动永久删除

**删除状态**：
```javascript
{
  isDeleted: true,
  deletedAt: Date,
  deletedBy: ObjectId
}
```

---

### 3.2 变量系统（核心特色）

#### 3.2.1 变量占位符语法

在提示词内容中使用双花括号定义变量：

**基础语法**：
```
{{变量名}}
```

**带类型语法**：
```
{{变量名:类型}}
```

**带选项语法**：
```
{{变量名:选项1|选项2|选项3}}
```

**带默认值语法**：
```
{{变量名:default=默认值}}
```

**复合语法**：
```
{{语言:JavaScript|Python|Java:default=JavaScript}}
```

#### 3.2.2 变量类型

| 类型 | 说明 | UI组件 | 示例 |
|------|------|--------|------|
| text | 单行文本 | el-input | 用户名、标题 |
| textarea | 多行文本 | el-input type="textarea" | 代码内容、长描述 |
| select | 下拉选择 | el-select | 编程语言、分类选择 |
| number | 数字输入 | el-input-number | 数量、版本号 |
| date | 日期选择 | el-date-picker | 截止日期 |

#### 3.2.3 变量配置界面

**弹窗式配置**（推荐）：
```
┌─────────────────────────────────────┐
│  配置变量 - 代码审查专家              │
├─────────────────────────────────────┤
│  编程语言 *                          │
│  [下拉选择: JavaScript ▼]            │
│                                      │
│  关注点                              │
│  [下拉选择: 性能 ▼]                  │
│                                      │
│  代码内容 *                          │
│  [文本框_____________________]      │
│  |                            |      │
│  |                            |      │
│                                      │
│  是否需要改进建议                     │
│  [下拉选择: 是 ▼]                    │
│                                      │
├─────────────────────────────────────┤
│  预览：                              │
│  你是一位资深的JavaScript开发专家。  │
│  请审查以下代码，重点关注性能...     │
│                                      │
├─────────────────────────────────────┤
│  [取消]  [复制提示词]                │
└─────────────────────────────────────┘
```

#### 3.2.4 变量历史记录

**功能描述**：
- 记录用户填写过的变量值
- 提供快速填充功能
- 支持搜索历史记录

**数据结构**：
```javascript
variableHistory: {
  "语言": [
    {value: "JavaScript", count: 15, lastUsed: Date},
    {value: "Python", count: 8, lastUsed: Date},
    {value: "Java", count: 3, lastUsed: Date}
  ],
  "关注点": [
    {value: "性能", count: 10, lastUsed: Date},
    {value: "安全性", count: 5, lastUsed: Date}
  ]
}
```

---

### 3.3 组织系统

#### 3.3.1 文件夹管理

**功能描述**：
- 支持创建多层级文件夹
- 支持拖拽移动提示词
- 支持文件夹重命名、删除

**文件夹属性**：
```javascript
{
  id: String,
  name: String,              // 文件夹名称
  description: String,       // 描述
  icon: String,              // 图标（emoji）
  color: String,             // 颜色标记
  parentId: String,          // 父文件夹ID
  level: Number,             // 层级深度
  path: String,              // 完整路径
  sortOrder: Number,         // 排序
  promptCount: Number,       // 提示词数量
  userId: ObjectId,
  createdAt: Date
}
```

#### 3.3.2 AI模型分类

**预设模型分类**：
```javascript
aiModels: [
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: "🤖",
    versions: ["GPT-3.5", "GPT-4", "GPT-4o"],
    provider: "OpenAI"
  },
  {
    id: "claude",
    name: "Claude",
    icon: "🧠",
    versions: ["Claude 3 Haiku", "Claude 3 Sonnet", "Claude 3.5 Sonnet", "Claude 3 Opus"],
    provider: "Anthropic"
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "✨",
    versions: ["Gemini 1.5 Flash", "Gemini 1.5 Pro"],
    provider: "Google"
  },
  {
    id: "wenxin",
    name: "文心一言",
    icon: "🎯",
    versions: ["ERNIE 4.0", "ERNIE 3.5"],
    provider: "百度"
  },
  {
    id: "tongyi",
    name: "通义千问",
    icon: "💬",
    versions: ["Qwen-Plus", "Qwen-Max"],
    provider: "阿里"
  },
  {
    id: "custom",
    name: "自定义模型",
    icon: "⚙️",
    versions: [],
    provider: "其他"
  }
]
```

#### 3.3.3 场景分类

**预设场景分类**：
```javascript
categories: [
  {
    id: "code",
    name: "代码开发",
    icon: "💻",
    subcategories: [
      "代码生成",
      "代码审查",
      "Bug修复",
      "代码重构",
      "单元测试",
      "API设计"
    ]
  },
  {
    id: "content",
    name: "内容创作",
    icon: "✍️",
    subcategories: [
      "文案撰写",
      "故事创作",
      "诗歌创作",
      "新闻报道",
      "营销文案",
      "社交媒体"
    ]
  },
  {
    id: "analysis",
    name: "数据分析",
    icon: "📊",
    subcategories: [
      "数据清洗",
      "统计分析",
      "可视化建议",
      "报告生成"
    ]
  },
  {
    id: "learning",
    name: "学习辅助",
    icon: "📚",
    subcategories: [
      "概念解释",
      "习题生成",
      "作业批改",
      "学习计划",
      "知识问答"
    ]
  },
  {
    id: "roleplay",
    name: "角色扮演",
    icon: "🎭",
    subcategories: [
      "面试官",
      "导师",
      "心理咨询",
      "技术顾问",
      "写作助手"
    ]
  },
  {
    id: "translation",
    name: "翻译润色",
    icon: "🌐",
    subcategories: [
      "中英互译",
      "学术翻译",
      "文学翻译",
      "口语化改写",
      "专业术语"
    ]
  },
  {
    id: "productivity",
    name: "工作效率",
    icon: "⚡",
    subcategories: [
      "邮件撰写",
      "报告生成",
      "会议纪要",
      "PPT大纲",
      "待办整理"
    ]
  }
]
```

#### 3.3.4 标签系统

**功能描述**：
- 支持自由标签
- 标签自动补全
- 热门标签推荐
- 标签管理（重命名、合并、删除）

**标签云展示**：
```
# 热门标签（按使用频率）
代码 (125)  创作 (89)  翻译 (67)  分析 (54)
面试 (43)   学习 (38)  营销 (32)  邮件 (28)
```

---

### 3.4 搜索与筛选

#### 3.4.1 全文搜索

**搜索范围**：
- 提示词标题
- 提示词描述
- 提示词内容
- 标签

**搜索特性**：
- 实时搜索（输入即搜）
- 关键词高亮
- 模糊匹配（使用fuse.js）
- 搜索历史记录

**UI交互**：
```
┌─────────────────────────────────────┐
│  🔍 搜索提示词...                    │
│  [搜索框_______________] [高级筛选]  │
└─────────────────────────────────────┘

搜索历史：
- 代码审查
- 文案创作
- 翻译提示词
```

#### 3.4.2 高级筛选

**筛选维度**：
```javascript
filters: {
  aiModel: [],           // AI模型（多选）
  category: [],          // 场景分类（多选）
  tags: [],              // 标签（多选）
  difficulty: "",        // 难度（单选）
  isFavorite: false,     // 仅显示收藏
  isPublic: false,       // 仅显示公开
  dateRange: [],         // 创建时间范围
  usageCountMin: 0,      // 最小使用次数
  ratingMin: 0           // 最低评分
}
```

**筛选器UI**：
```
┌─────────────────────────────────────┐
│  筛选条件                            │
├─────────────────────────────────────┤
│  AI模型                              │
│  ☑ ChatGPT  ☐ Claude  ☐ Gemini    │
│                                      │
│  场景分类                            │
│  ☑ 代码开发  ☐ 内容创作  ☐ 数据分析 │
│                                      │
│  标签                                │
│  [选择标签...]                       │
│                                      │
│  其他                                │
│  ☐ 仅显示收藏                        │
│  ☐ 仅显示公开                        │
│                                      │
│  [重置]  [应用筛选]                  │
└─────────────────────────────────────┘
```

#### 3.4.3 智能排序

**排序选项**：
| 排序方式 | 说明 |
|---------|------|
| 最近使用 | 按lastUsedAt降序 |
| 使用最多 | 按usageCount降序 |
| 评分最高 | 按rating降序 |
| 最新创建 | 按createdAt降序 |
| 字母顺序 | 按title升序 |
| 收藏优先 | 收藏的排在前面 |

---

### 3.5 使用与统计

#### 3.5.1 一键复制功能

**快速复制流程**：

**无变量提示词**：
```
用户点击"复制"按钮
  ↓
直接复制到剪贴板
  ↓
显示Toast提示："已复制到剪贴板"
  ↓
记录使用统计
```

**有变量提示词**：
```
用户点击"复制"按钮
  ↓
弹出变量配置对话框
  ↓
用户填写变量值（支持历史记录自动补全）
  ↓
实时预览生成的完整提示词
  ↓
点击"复制提示词"按钮
  ↓
复制到剪贴板
  ↓
显示Toast提示："已复制到剪贴板"
  ↓
记录使用统计（包括变量值）
```

**复制按钮状态**：
- 默认：📋 复制
- 点击后：✅ 已复制（2秒后恢复）

#### 3.5.2 使用记录

**记录内容**：
```javascript
usageRecord: {
  userId: ObjectId,
  promptId: ObjectId,

  // 使用详情
  variableValues: {           // 本次使用的变量值
    "语言": "JavaScript",
    "关注点": "性能"
  },
  generatedPrompt: String,    // 生成的完整提示词

  // 反馈信息
  rating: Number,             // 本次评分（1-5）
  feedback: String,           // 反馈内容
  isSuccessful: Boolean,      // 是否成功

  // 上下文信息
  aiModel: String,            // 使用的AI模型
  responseQuality: String,    // 响应质量

  usedAt: Date,               // 使用时间
  executionTime: Number       // 执行耗时
}
```

#### 3.5.3 效果评分

**评分维度**：
```javascript
// 快速评分（使用后立即弹出）
quickRating: {
  rating: Number,           // 1-5星
  isSuccessful: Boolean,    // 是否达到预期
  timestamp: Date
}

// 详细评分（可选）
detailedRating: {
  clarity: Number,          // 提示词清晰度 1-5
  effectiveness: Number,    // 效果满意度 1-5
  reusability: Number,      // 可复用性 1-5
  feedback: String,         // 文字反馈
  improvements: String      // 改进建议
}
```

**评分触发时机**：
1. 复制后3秒弹出轻量级评分卡片
2. 用户可选择"暂不评分"
3. 评分后自动关闭
4. 可在历史记录中补充评分

#### 3.5.4 统计分析

**个人统计面板**：
```
┌─────────────────────────────────────┐
│  我的提示词统计                      │
├─────────────────────────────────────┤
│  📊 总提示词数: 45                   │
│  ⭐ 平均评分: 4.3 / 5.0             │
│  📋 总使用次数: 287                  │
│  🔥 最常用: 代码审查专家 (52次)      │
│                                      │
│  本周使用趋势                        │
│  [折线图]                            │
│                                      │
│  热门分类                            │
│  1. 代码开发 (125次)                 │
│  2. 内容创作 (89次)                  │
│  3. 翻译润色 (67次)                  │
└─────────────────────────────────────┘
```

**单个提示词统计**：
```
使用统计
├─ 总使用次数: 52
├─ 复制次数: 52
├─ 收藏次数: 8
├─ 分享次数: 3
├─ 平均评分: 4.5/5.0 (12人评价)
├─ 成功率: 91.7%
├─ 最后使用: 2小时前
└─ 使用趋势: [小型折线图]
```

---

### 3.6 收藏与个人化

#### 3.6.1 收藏功能

**功能描述**：
- 快速访问常用提示词
- 收藏列表单独展示
- 支持取消收藏

**收藏入口**：
- 提示词卡片上的⭐图标
- 提示词详情页的收藏按钮
- 快捷键：Ctrl+F

**收藏列表**：
```
┌─────────────────────────────────────┐
│  ⭐ 我的收藏 (8)                     │
├─────────────────────────────────────┤
│  [卡片1: 代码审查专家]               │
│  [卡片2: 文案创作助手]               │
│  [卡片3: 翻译润色工具]               │
│  ...                                 │
└─────────────────────────────────────┘
```

#### 3.6.2 个人笔记

**功能描述**：
- 为每个提示词添加私人笔记
- 记录使用心得和改进想法
- 仅自己可见

**笔记数据结构**：
```javascript
personalNote: {
  content: String,         // 笔记内容
  lastUpdated: Date,       // 最后更新时间
  reminders: [String]      // 提醒事项
}
```

**笔记UI**：
```
┌─────────────────────────────────────┐
│  📝 我的笔记                         │
├─────────────────────────────────────┤
│  [文本编辑框]                        │
│  使用这个提示词时要注意：             │
│  1. 代码长度不要超过500行             │
│  2. 最好配合具体场景说明               │
│  3. Claude比GPT效果更好               │
│                                      │
│  [保存]  [清除]                      │
└─────────────────────────────────────┘
```

---

## 四、数据模型设计

### 4.1 核心数据模型

#### PromptTemplate（提示词模板）

```javascript
{
  // 基本信息
  id: String,                    // 唯一标识 (MongoDB _id.toString())
  title: String,                 // 标题（必填，3-100字符）
  description: String,           // 描述（选填，50-500字符）
  content: String,               // 提示词内容（必填，支持Markdown）

  // 分类信息
  aiModel: String,               // AI模型：chatgpt/claude/gemini等（必填）
  modelVersion: String,          // 模型版本：gpt-4/claude-3.5等（选填）
  category: String,              // 主分类：code/content/analysis等（必填）
  subcategories: [String],       // 子分类数组
  tags: [String],                // 自由标签（最多10个）

  // 变量系统
  variables: [{
    name: String,                // 变量名（唯一）
    type: String,                // text/select/textarea/number/date
    label: String,               // 显示标签
    required: Boolean,           // 是否必填
    default: String,             // 默认值
    options: [String],           // 下拉选项（type=select时）
    placeholder: String,         // 占位符文本
    description: String,         // 变量说明
    validation: {                // 验证规则
      min: Number,               // 最小值/长度
      max: Number,               // 最大值/长度
      pattern: String            // 正则表达式
    }
  }],

  // 示例与说明
  examples: [{
    title: String,               // 示例标题
    input: Object,               // 变量输入示例
    output: String,              // 期望输出示例
    note: String                 // 示例说明
  }],
  tips: String,                  // 使用技巧（Markdown）
  warnings: String,              // 注意事项（Markdown）

  // 质量与反馈
  rating: Number,                // 平均评分（1-5，保留1位小数）
  ratingCount: Number,           // 评分人数
  successRate: Number,           // 成功率（0-100）

  // 使用统计
  usageCount: Number,            // 总使用次数
  copyCount: Number,             // 复制次数
  favoriteCount: Number,         // 收藏次数
  shareCount: Number,            // 分享次数
  lastUsedAt: Date,              // 最后使用时间

  // 版本管理
  version: String,               // 版本号（语义化版本）
  versionHistory: [{
    version: String,
    content: String,
    variables: Array,
    changes: String,
    createdAt: Date,
    createdBy: ObjectId
  }],

  // 权限与共享
  visibility: String,            // private/public/unlisted
  isShared: Boolean,             // 是否可分享
  shareToken: String,            // 分享令牌（唯一）
  sharedAt: Date,                // 分享时间
  allowComments: Boolean,        // 允许评论
  allowFork: Boolean,            // 允许复制修改

  // 元数据
  language: String,              // 语言：zh-CN/en-US
  difficulty: String,            // 难度：beginner/intermediate/advanced
  estimatedTokens: Number,       // 预估token数
  estimatedTime: String,         // 预估使用时长

  // 个人化
  personalNote: {                // 个人笔记（私有）
    content: String,
    lastUpdated: Date
  },
  isFavorite: Boolean,           // 是否收藏（用户维度）

  // 关联信息
  folderId: ObjectId,            // 所属文件夹
  userId: ObjectId,              // 创建用户（required）
  forkedFrom: ObjectId,          // 复制来源（如果是fork的）

  // 状态管理
  status: String,                // active/draft/archived/deleted
  isDeleted: Boolean,            // 软删除标记
  deletedAt: Date,               // 删除时间

  // 时间戳
  createdAt: Date,               // 创建时间
  updatedAt: Date,               // 更新时间
  createdBy: ObjectId,           // 创建者
  updatedBy: ObjectId            // 最后修改者
}
```

**索引设计**：
```javascript
// 复合索引
{userId: 1, status: 1, createdAt: -1}    // 用户的提示词列表
{category: 1, visibility: 1}              // 公开分类浏览
{aiModel: 1, category: 1}                 // 模型+分类筛选
{tags: 1, visibility: 1}                  // 标签浏览
{usageCount: -1, rating: -1}              // 热门排序
{shareToken: 1}                           // 分享链接

// 全文索引
{title: "text", content: "text", tags: "text", description: "text"}
```

---

#### UserPromptUsage（用户使用记录）

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // 用户ID（required）
  promptId: ObjectId,            // 提示词ID（required）

  // 使用详情
  variableValues: Object,        // 本次使用的变量值
  generatedPrompt: String,       // 生成的完整提示词

  // 反馈信息
  rating: Number,                // 本次评分（1-5）
  feedback: String,              // 反馈内容
  isSuccessful: Boolean,         // 是否成功

  // 详细评分（可选）
  detailedRating: {
    clarity: Number,             // 清晰度 1-5
    effectiveness: Number,       // 效果 1-5
    reusability: Number,         // 复用性 1-5
    improvements: String         // 改进建议
  },

  // 上下文信息
  aiModel: String,               // 使用的AI模型
  responseQuality: String,       // 响应质量：excellent/good/fair/poor

  // 设备信息
  device: {
    type: String,                // desktop/mobile/tablet
    os: String,
    browser: String
  },

  // 统计
  usedAt: Date,                  // 使用时间（required）
  executionTime: Number,         // 执行耗时（秒）

  // 时间维度（便于统计）
  date: String,                  // YYYY-MM-DD
  hour: Number                   // 0-23
}
```

**索引设计**：
```javascript
{userId: 1, usedAt: -1}                   // 用户历史记录
{promptId: 1, usedAt: -1}                 // 提示词使用历史
{date: 1, hour: 1}                        // 时间维度统计
```

---

#### PromptFolder（文件夹）

```javascript
{
  _id: ObjectId,
  id: String,                    // 字符串ID
  name: String,                  // 文件夹名称（必填）
  description: String,           // 描述
  icon: String,                  // 图标（emoji）
  color: String,                 // 颜色（hex）

  // 层级关系
  parentId: String,              // 父文件夹ID
  level: Number,                 // 层级深度（0为根目录）
  path: String,                  // 完整路径（如：/工作/代码审查）

  // 统计
  promptCount: Number,           // 提示词数量

  // 权限
  userId: ObjectId,              // 所属用户（required）

  // 排序与显示
  sortOrder: Number,             // 排序权重
  isExpanded: Boolean,           // 是否展开（客户端状态）

  // 时间戳
  createdAt: Date,
  updatedAt: Date
}
```

---

### 4.2 辅助数据模型

#### PromptComment（评论）- 二期功能

```javascript
{
  _id: ObjectId,
  promptId: ObjectId,            // 提示词ID
  userId: ObjectId,              // 评论用户
  content: String,               // 评论内容
  rating: Number,                // 评分（1-5）
  parentId: ObjectId,            // 父评论ID（支持回复）
  likes: Number,                 // 点赞数
  createdAt: Date
}
```

#### PromptTag（标签统计）

```javascript
{
  _id: ObjectId,
  tag: String,                   // 标签名称（unique）
  usageCount: Number,            // 使用次数
  promptCount: Number,           // 关联提示词数
  category: String,              // 所属分类
  createdAt: Date,
  lastUsed: Date
}
```

---

## 五、接口设计

### 5.1 RESTful API设计

**基础路径**：`/api/tools/prompt-vault`

#### 5.1.1 提示词CRUD

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/prompts` | 获取提示词列表 | 登录 |
| GET | `/prompts/:id` | 获取提示词详情 | 登录 |
| POST | `/prompts` | 创建提示词 | 登录 |
| PUT | `/prompts/:id` | 更新提示词 | 登录+所有者 |
| DELETE | `/prompts/:id` | 删除提示词（软删除） | 登录+所有者 |
| POST | `/prompts/batch` | 批量创建 | 登录 |
| DELETE | `/prompts/batch` | 批量删除 | 登录 |

**GET /prompts** - 获取列表
```javascript
// 请求参数
{
  page: 1,                    // 页码
  limit: 20,                  // 每页数量
  category: "code",           // 分类筛选
  aiModel: "chatgpt",         // AI模型筛选
  tags: ["代码", "审查"],      // 标签筛选（数组）
  search: "关键词",           // 搜索关键词
  folderId: "xxx",            // 文件夹ID
  isFavorite: true,           // 仅收藏
  sort: "usageCount",         // 排序方式
  order: "desc"               // 排序顺序
}

// 响应数据
{
  code: 200,
  message: "success",
  data: {
    prompts: [...],
    pagination: {
      current: 1,
      total: 5,
      pageSize: 20,
      totalItems: 87
    }
  }
}
```

**POST /prompts** - 创建提示词
```javascript
// 请求体
{
  title: "代码审查专家",
  content: "你是一位资深的{{语言}}开发专家...",
  description: "用于审查代码质量...",
  aiModel: "chatgpt",
  category: "code",
  subcategories: ["代码审查"],
  tags: ["代码", "审查", "质量"],
  variables: [
    {
      name: "语言",
      type: "select",
      required: true,
      options: ["JavaScript", "Python", "Java"]
    }
  ],
  folderId: "xxx",
  visibility: "private"
}

// 响应数据
{
  code: 201,
  message: "创建成功",
  data: {
    id: "xxx",
    ...
  }
}
```

#### 5.1.2 变量处理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/prompts/:id/render` | 渲染提示词（替换变量） |
| GET | `/prompts/:id/variables/history` | 获取变量历史记录 |

**POST /prompts/:id/render** - 渲染提示词
```javascript
// 请求体
{
  variableValues: {
    "语言": "JavaScript",
    "关注点": "性能"
  }
}

// 响应数据
{
  code: 200,
  message: "success",
  data: {
    rendered: "你是一位资深的JavaScript开发专家。请审查以下代码，重点关注性能...",
    estimatedTokens: 156
  }
}
```

#### 5.1.3 使用统计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/prompts/:id/use` | 记录使用 |
| GET | `/prompts/:id/stats` | 获取统计 |
| POST | `/prompts/:id/rate` | 评分 |
| GET | `/my-stats` | 我的统计 |

**POST /prompts/:id/use** - 记录使用
```javascript
// 请求体
{
  variableValues: {...},
  generatedPrompt: "...",
  aiModel: "chatgpt"
}

// 响应数据
{
  code: 200,
  message: "已记录",
  data: {
    usageCount: 53
  }
}
```

**POST /prompts/:id/rate** - 评分
```javascript
// 请求体
{
  rating: 5,
  isSuccessful: true,
  feedback: "效果很好",
  usageId: "xxx"  // 使用记录ID（可选）
}

// 响应数据
{
  code: 200,
  message: "评分成功",
  data: {
    newRating: 4.5,
    ratingCount: 13
  }
}
```

#### 5.1.4 收藏功能

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/prompts/:id/favorite` | 收藏/取消收藏 |
| GET | `/favorites` | 获取收藏列表 |

#### 5.1.5 搜索与推荐

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/search` | 搜索提示词 |
| GET | `/recommend` | 智能推荐 |
| GET | `/trending` | 热门提示词 |

#### 5.1.6 文件夹管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/folders` | 获取文件夹列表 |
| POST | `/folders` | 创建文件夹 |
| PUT | `/folders/:id` | 更新文件夹 |
| DELETE | `/folders/:id` | 删除文件夹 |
| POST | `/folders/:id/move` | 移动提示词 |

#### 5.1.7 分类与标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/categories` | 获取分类列表 |
| GET | `/tags` | 获取标签云 |
| GET | `/tags/trending` | 热门标签 |

#### 5.1.8 导入导出

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/import` | 批量导入 |
| GET | `/export` | 批量导出 |
| POST | `/import/file` | 文件导入 |

---

## 六、UI/UX设计

### 6.1 页面布局

#### 主页面布局
```
┌─────────────────────────────────────────────────────────┐
│  顶部导航栏                                               │
│  [工具箱] > [PromptVault]   [🔍 搜索]  [+ 新建]  [👤]   │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  左侧栏   │         主内容区                              │
│ (200px)  │        (自适应宽度)                           │
│          │                                              │
│ 📁 全部   │  ┌──────┐ ┌──────┐ ┌──────┐               │
│ ⭐ 收藏   │  │卡片1  │ │卡片2  │ │卡片3  │               │
│ 📊 统计   │  │      │ │      │ │      │               │
│ 📂 文件夹 │  │[复制] │ │[复制] │ │[复制] │               │
│   工作   │  └──────┘ └──────┘ └──────┘               │
│   学习   │                                              │
│   创作   │  ┌──────┐ ┌──────┐ ┌──────┐               │
│ ─────   │  │卡片4  │ │卡片5  │ │卡片6  │               │
│ 🤖 模型   │  └──────┘ └──────┘ └──────┘               │
│  ChatGPT │                                              │
│  Claude  │  [分页: 1 2 3 4 5 ... 10]                    │
│ 📂 场景   │                                              │
│  代码    │                                              │
│  创作    │                                              │
│ 🏷️ 标签   │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 6.2 提示词卡片设计

```
┌─────────────────────────────────────────┐
│  🤖 ChatGPT-4  ⭐ 4.5  📋 125次         │
│  [⭐ 已收藏]                            │
├─────────────────────────────────────────┤
│  代码审查专家                            │
│  用于审查代码质量、发现潜在问题...        │
│                                         │
│  🏷️ 代码  ��️ 审查  🏷️ 最佳实践          │
│                                         │
│  有 3 个变量 | 最后使用: 2小时前          │
│                                         │
│  [📋 复制] [✏️ 编辑] [🔗 分享] [⋯ 更多]  │
└─────────────────────────────────────────┘
```

**卡片状态**：
- 默认状态：白色背景
- 悬停状态：淡蓝色背景，显示操作按钮
- 选中状态：蓝色边框
- 已收藏：右上角显示金色⭐

### 6.3 提示词详情页

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回列表  代码审查专家  [✏️ 编辑] [🗑️ 删除] [🔗 分享] │
├─────────────────────────────────────────────────────────┤
│  🤖 ChatGPT-4  |  📂 代码开发  |  ⭐ 4.5/5.0 (12人)     │
│  📋 使用125次  |  ⭐ 收藏18人  |  🕐 2小时前             │
├──────────────────────┬──────────────────────────────────┤
│  📝 提示词内容（左侧） │  🔧 变量配置（右侧）               │
│  ┌──────────────────┐│  编程语言 *                       │
│  │ 你是一位资深的...  ││  [下拉: JavaScript ▼]            │
│  │ {{语言}}          ││                                   │
│  │ {{关注点}}        ││  关注点                           │
│  │ {{代码内容}}      ││  [下拉: 性能 ▼]                   │
│  └──────────────────┘│                                   │
│                       │  代码内容 *                        │
│  💡 使用技巧           │  [文本框_________________]       │
│  - 代码长度建议500行内 │  |                         |       │
│  - 配合具体场景说明    │  |                         |       │
│                       │                                   │
│  ⚠️ 注意事项           │  📋 生成的提示词（预览）           │
│  - 复杂代码建议分段审查 │  ┌────────────────────┐          │
│                       │  │你是一位资深的...    │          │
│  📖 使用示例           │  └────────────────────┘          │
│  [示例1] [示例2]      │                                   │
│                       │  [📋 复制提示词]                  │
├──────────────────────┴──────────────────────────────────┤
│  [💡 使用技巧] [📖 示例] [💬 评论] [📊 统计] [📝 我的笔记] │
│                                                         │
│  （对应的标签页内容）                                    │
└─────────────────────────────────────────────────────────┘
```

### 6.4 变量配置对话框

```
┌─────────────────────────────────────────┐
│  配置变量 - 代码审查专家                  │
│                                    [✕]  │
├─────────────────────────────────────────┤
│                                         │
│  编程语言 * (必填)                       │
│  [下拉选择: JavaScript ▼]               │
│  💡 最近使用: JavaScript, Python, Java  │
│                                         │
│  关注点                                  │
│  [下拉选择: 性能 ▼]                     │
│                                         │
│  代码内容 * (必填)                       │
│  ┌─────────────────────────────────┐  │
│  │ function calculateTotal(items) { │  │
│  │   return items.reduce(...)       │  │
│  │ }                                │  │
│  └─────────────────────────────────┘  │
│                                         │
│  是否需要改进建议                        │
│  [下拉选择: 是 ▼]                       │
│                                         │
├─────────────────────────────────────────┤
│  📋 预览 (预估 256 tokens)               │
│  ┌─────────────────────────────────┐  │
│  │ 你是一位资深的JavaScript开发专家。│  │
│  │ 请审查以下代码，重点关注性能...    │  │
│  └─────────────────────────────────┘  │
│                                         │
│  [取消]  [💾 保存配置]  [📋 复制提示词]  │
└─────────────────────────────────────────┘
```

### 6.5 响应式设计

**桌面端（>1200px）**：
- 左侧栏固定200px
- 卡片网格：4列
- 详情页：左右分栏

**平板端（768px-1200px）**：
- 左侧栏可折叠
- 卡片网格：2-3列
- 详情页：上下布局

**移动端（<768px）**：
- 左侧栏抽屉式
- 卡片列表：1列
- 详情页：垂直滚动
- 底部导航栏

---

## 七、技术实现方案

### 7.1 前端技术栈

```javascript
核心框架
├─ Vue 3                    // 前端框架
├─ Vite                     // 构建工具
├─ Pinia                    // 状态管理
└─ Vue Router 4             // 路由管理

UI组件库
├─ Element Plus             // UI组件
│  ├─ el-card              // 卡片
│  ├─ el-dialog            // 对话框
│  ├─ el-form              // 表单
│  ├─ el-tree              // 树形控件
│  ├─ el-tag               // 标签
│  └─ el-rate              // 评分
├─ @element-plus/icons-vue  // 图标
└─ lucide-vue-next          // 补充图标

编辑器
├─ v-md-editor             // Markdown编辑器
├─ highlight.js            // 代码高亮
└─ marked                  // Markdown解析

功能库
├─ clipboard.js            // 剪贴板操作
├─ fuse.js                 // 模糊搜索
├─ dayjs                   // 时间处理
└─ vue-draggable-plus      // 拖拽排序
```

### 7.2 后端技术选型

```javascript
核心框架
├─ Node.js                 // 运行环境
├─ Express.js              // Web框架
└─ Mongoose                // MongoDB ODM

中间件
├─ auth.js                 // JWT认证
├─ rateLimiter.js          // API限流
├─ validation.js           // 数据验证
└─ activityLogger.js       // 操作日志

工具库
├─ joi                     // 数据验证
├─ bcryptjs                // 密码加密
├─ jsonwebtoken            // JWT生成
├─ uuid                    // UUID生成
└─ crypto                  // 加密工具
```

### 7.3 核心算法

#### 7.3.1 变量解析算法

```javascript
/**
 * 解析提示词中的变量占位符
 * @param {string} content - 提示词内容
 * @returns {Array} 变量定义数组
 */
function parseVariables(content) {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const varDef = match[1].trim();
    const parts = varDef.split(':');

    const variable = {
      name: parts[0].trim(),
      type: 'text',
      required: true,
      options: []
    };

    // 解析类型和选项
    if (parts.length > 1) {
      const options = parts[1].split('|').map(o => o.trim());
      if (options.length > 1) {
        variable.type = 'select';
        variable.options = options;
      }
    }

    // 解析默认值
    const defaultMatch = varDef.match(/default=([^|:]+)/);
    if (defaultMatch) {
      variable.default = defaultMatch[1].trim();
    }

    variables.push(variable);
  }

  return variables;
}
```

#### 7.3.2 提示词渲染算法

```javascript
/**
 * 渲染提示词（替换变量）
 * @param {string} content - 提示词模板
 * @param {Object} values - 变量值对象
 * @returns {string} 渲染后的提示词
 */
function renderPrompt(content, values) {
  let rendered = content;

  // 替换所有变量
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}[^}]*\\}\\}`, 'g');
    rendered = rendered.replace(regex, value);
  }

  return rendered;
}
```

#### 7.3.3 智能推荐算法

```javascript
/**
 * 基于协同过滤的提示词推荐
 * @param {ObjectId} userId - 用户ID
 * @param {number} limit - 推荐数量
 * @returns {Array} 推荐的提示词列表
 */
async function recommendPrompts(userId, limit = 10) {
  // 1. 获取用户最近使用的提示词
  const recentPrompts = await UserPromptUsage.find({userId})
    .sort({usedAt: -1})
    .limit(20)
    .distinct('promptId');

  // 2. 获取这些提示词的标签
  const prompts = await PromptTemplate.find({
    _id: {$in: recentPrompts}
  }).select('tags category');

  const userTags = new Set();
  const userCategories = new Set();

  prompts.forEach(p => {
    p.tags.forEach(tag => userTags.add(tag));
    userCategories.add(p.category);
  });

  // 3. 查找相似的提示词（标签匹配）
  const recommendations = await PromptTemplate.find({
    _id: {$nin: recentPrompts},  // 排除已使用的
    $or: [
      {tags: {$in: Array.from(userTags)}},
      {category: {$in: Array.from(userCategories)}}
    ],
    visibility: 'public',
    status: 'active'
  })
  .sort({rating: -1, usageCount: -1})
  .limit(limit);

  return recommendations;
}
```

### 7.4 性能优化

```javascript
性能优化策略
├─ 数据库层
│  ├─ 索引优化（复合索引、全文索引）
│  ├─ 查询优化（使用lean()、select投影）
│  └─ 分页加载（虚拟滚动）
├─ 缓存层
│  ├─ Redis缓存热门提示词
│  ├─ 前端本地存储（localStorage）
│  └─ 浏览器缓存（PWA）
├─ 前端层
│  ├─ 懒加载（路由懒加载）
│  ├─ 虚拟列表（长列表优化）
│  ├─ 防抖节流（搜索输入）
│  └─ 图片懒加载
└─ 网络层
   ├─ CDN加速（静态资源）
   ├─ Gzip压缩
   └─ HTTP/2
```

---

## 八、开发计划

### 8.1 MVP版本（v1.0）- 4周

#### 第1周：基础架构
- [x] 数据库模型设计
- [x] API接口设计
- [ ] 前端项目初始化
- [ ] 后端路由搭建
- [ ] 认证中间件集成

#### 第2周：核心CRUD
- [ ] 提示词创建功能
- [ ] 提示词编辑功能
- [ ] 提示词删除功能
- [ ] 提示词列表展示
- [ ] 基础搜索功能

#### 第3周：变量系统
- [ ] 变量解析引擎
- [ ] 变量配置UI
- [ ] 实时预览功能
- [ ] 提示词渲染
- [ ] 一键复制功能

#### 第4周：组织与测试
- [ ] 文件夹管理
- [ ] 分类标签系统
- [ ] 收藏功能
- [ ] 功能测试
- [ ] UI/UX优化

**MVP版本核心功能**：
✅ 提示词创建、编辑、删除
✅ 变量系统（基础版）
✅ 一键复制
✅ 分类和标签
✅ 基础搜索

### 8.2 增强版本（v1.1）- 2周

#### 第5周：统计与反馈
- [ ] 使用记录功能
- [ ] 评分系统
- [ ] 统计面板
- [ ] 使用历史查看

#### 第6周：优化与完善
- [ ] 变量历史记录
- [ ] 高级搜索
- [ ] 智能排序
- [ ] 性能优化

**v1.1新增功能**：
✅ 使用统计
✅ 评分系统
✅ 变量历史
✅ 高级筛选

### 8.3 社区版本（v2.0）- 4周（二期）

- [ ] 公开提示词库
- [ ] 提示词分享
- [ ] 评论系统
- [ ] 智能推荐
- [ ] 导入导出
- [ ] 提示词链（Prompt Chain）

---

## 九、测试计划

### 9.1 单元测试

**前端测试**：
- [ ] 组件测试（Vitest）
- [ ] 工具函数测试
- [ ] Store测试

**后端测试**：
- [ ] API接口测试（Jest + Supertest）
- [ ] 数据模型测试
- [ ] 中间件测试

### 9.2 集成测试

- [ ] 端到端测试（Cypress）
- [ ] 用户场景测试
- [ ] 性能测试

### 9.3 测试用例

| 功能模块 | 测试用例 | 预期结果 |
|---------|---------|---------|
| 创建提示词 | 创建无变量提示词 | 成功创建并展示 |
| 创建提示词 | 创建带变量提示词 | 变量正确解析 |
| 变量系统 | 填写变量并预览 | 实时预览正确 |
| 复制功能 | 复制无变量提示词 | 直接复制成功 |
| 复制功能 | 复制带变量提示词 | 弹窗配置后复制 |
| 搜索功能 | 关键词搜索 | 返回匹配结果 |
| 筛选功能 | 多条件筛选 | 正确筛选结果 |
| 收藏功能 | 收藏/取消收藏 | 状态正确切换 |
| 评分功能 | 提交评分 | 平均分正确计算 |
| 文件夹 | 移动提示词 | 正确移动到目标文件夹 |

---

## 十、部署方案

### 10.1 部署环境

**开发环境**：
- 前端：http://localhost:3000/tools/prompt-vault
- 后端：http://localhost:8001/api/tools/prompt-vault
- 数据库：localhost:27017/personal_website_dev

**生产环境**：
- 前端：https://godaug.fun/tools/prompt-vault
- 后端：https://godaug.fun/api/tools/prompt-vault
- 数据库：MongoDB Atlas / 自建MongoDB

### 10.2 部署步骤

```bash
# 1. 构建前端
cd frontend
npm run build

# 2. 部署到Nginx
cp -r dist/* /var/www/html/

# 3. 重启后端服务
pm2 restart backend

# 4. 数据库迁移（如需要）
npm run db:migrate
```

### 10.3 监控与维护

- [ ] 日志监控（Winston）
- [ ] 性能监控（PM2）
- [ ] 错误追踪（Sentry）
- [ ] 数据备份（每日自动备份）

---

## 十一、风险评估

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|---------|
| 变量解析复杂度高 | 高 | 中 | 从简单语法开始，逐步增强 |
| 性能问题（大量提示词）| 中 | 中 | 分页+虚拟滚动+缓存 |
| 用户数据安全 | 高 | 低 | 加密存储+权限控制 |
| 跨浏览器兼容性 | 低 | 低 | 使用成熟UI库 |
| AI模型变化 | 中 | 高 | 模型分类灵活设计 |

---

## 十二、成功指标

### 12.1 用户指标

- [ ] 注册用户数：>100（第一个月）
- [ ] 活跃用户数：>50（第一个月）
- [ ] 日均使用次数：>200
- [ ] 用户留存率：>60%（7天）

### 12.2 内容指标

- [ ] 创建提示词数：>500
- [ ] 公开提示词数：>100
- [ ] 平均评分：>4.0
- [ ] 收藏率：>20%

### 12.3 技术指标

- [ ] API响应时间：<200ms（P95）
- [ ] 页面加载时间：<2s
- [ ] 错误率：<0.1%
- [ ] 服务可用性：>99.9%

---

## 十三、后续迭代计划

### v1.2 - 协作功能
- 团队空间
- 提示词共享
- 协作编辑
- 权限管理

### v2.0 - AI集成
- 内置AI测试
- 效果对比
- A/B测试
- 自动优化建议

### v3.0 - 企业版
- 私有部署
- SSO登录
- 审计日志
- API接口开放

---

## 附录

### A. 参考资源

- [PromptBase](https://promptbase.com/) - 提示词市场平台
- [FlowGPT](https://flowgpt.com/) - 提示词社区
- [Anthropic Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering) - Claude提示词指南
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering) - GPT提示词最佳实践

### B. 术语表

| 术语 | 说明 |
|------|------|
| Prompt | 提示词，用户输入给AI的指令或问题 |
| Variable | 变量，提示词中的动态占位符 |
| Template | 模板，包含变量的可复用提示词 |
| Fork | 复制并修改他人的提示词 |
| Token | AI模型处理的文本单位 |
| Embedding | 文本向量化表示 |

### C. 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-10-09 | 初始版本，完成需求文档 |

---

## 文档审批

| 角色 | 姓名 | 日期 | 签名 |
|------|------|------|------|
| 产品经理 | - | - | - |
| 技术负责人 | - | - | - |
| UI设计师 | - | - | - |
| 项目经理 | - | - | - |

---

**文档结束**
