# 剧本医生 - 整体检查功能实现文档

## 📋 功能概述

整体检查是剧本医生的第三个阶段，用于从**全局视角**检查已完成剧集的整体质量，包括主线一致性、角色弧光、节奏把控、情感曲线、伏笔回收和大纲一致性。

## ✨ 核心特性

### 1. 灵活的检查范围

- **全部已完成剧集**：自动检查所有状态为"已完成"或"已审核"的剧集
- **指定范围**：用户可自定义检查第X-Y集
- **支持部分检查**：不强制要求全部剧集完成（建议至少3集）

### 2. 外部AI工作流

- **完整包下载**：生成包含所有剧集完整内容的Markdown文件
- **提示词生成**：自动生成结构化的诊断提示词
- **支持自定义模板**：用户可自定义整体检查提示词模板

### 3. 六大诊断维度

| 维度 | 检查点 | 严重性 |
|------|--------|-------|
| 主线一致性 | 核心冲突是否贯穿、是否有剧集偏离主题 | critical |
| 角色弧光完整性 | 角色成长轨迹、行为一致性、关系发展 | critical |
| 节奏把控 | 三幕节奏分布、高潮点分布 | medium |
| 情感曲线 | 情感强度递进、甜虐节奏 | medium |
| 伏笔回收 | 关键情节点是否出现、伏笔呼应 | low |
| 大纲一致性 | 剧集与大纲的一致性、关键节点偏差 | critical |

## 🏗️ 技术架构

### 文件结构

```
frontend/src/views/tools/productivity/drama/
├─ components/
│  ├─ OverallCheck.vue                    (新建 - 整体检查主组件)
│  ├─ ScriptAnalysis.vue                  (修改 - 集成整体检查)
│  ├─ PromptTemplateManager.vue           (修改 - 新增整体检查模板Tab)
│  └─ ExternalAIWorkflowDialog.vue        (复用)
│
└─ utils/
   ├─ overallCheckTemplates.js            (新建 - 默认提示词模板)
   └─ overallCheckPrompts.js              (新建 - 提示词生成工具)
```

### 核心组件

#### 1. OverallCheck.vue（新建）

**职责**：
- 检查范围选择（全部/自定义）
- 调用外部AI工作流对话框
- 显示问题列表（按维度分组）
- 问题状态管理（pending/ignored/completed）

**Props**:
```javascript
{
  project: Object  // 项目对象
}
```

**Emits**:
```javascript
{
  'update:issues': (issues) => {},           // 问题列表更新
  'open-template-manager': () => {},         // 打开模板管理器
  'generate-solution': (issue) => {},        // 生成解决方案
  'view-solution': (issue) => {}             // 查看解决方案
}
```

**核心方法**:
- `openOverallAIWorkflow()`: 生成提示词和完整包，打开外部AI工作流
- `handleDiagnosisImport()`: 导入AI返回的JSON问题列表
- `markAsCompleted()`: 标记问题为已完成
- `ignoreIssue()`: 忽略问题
- `restoreIssue()`: 恢复问题

#### 2. overallCheckPrompts.js（新建）

**核心函数**:

```javascript
// 生成整体检查提示词
export function generateOverallCheckPrompt(project, range)

// 生成完整包（Markdown格式）
export function generateOverallCreationPackage(project, range)

// 下载完整包
export function downloadOverallPackage(content, filename)

// 获取自定义模板
export function getOverallCheckCustomTemplate()
```

**完整包结构**:
```markdown
# 项目信息
- 项目名称、类型、总集数、检查范围、生成时间

# 世界观设定
- 故事背景、世界设定、核心主题、主要冲突、情感基调

# 主要角色
- 每个角色的完整信息（姓名、年龄、性格、背景、动机、关系）

# 剧情大纲
- 三幕结构、关键情节点

# 已完成剧集内容（第X-Y集）
- 每集的完整内容（概要、场景、对白、悬念）
```

#### 3. overallCheckTemplates.js（新建）

**默认模板变量**:
```javascript
{
  projectName,       // 项目名称
  projectType,       // 剧本类型
  totalEpisodes,     // 总集数
  startEpisode,      // 检查起始集数
  endEpisode,        // 检查结束集数
  completedCount,    // 已完成集数
  completionRate,    // 完成度百分比
  coreConflict,      // 核心冲突
  mainCharacters     // 主要角色
}
```

## 🔄 工作流程

### 用户操作流程

```
1. 选择检查范围
   ├─ 全部已完成剧集（推荐）
   └─ 指定范围（第X-Y集）
   ↓
2. 点击「启动整体诊断」
   ├─ 生成提示词（显示在对话框左侧）
   └─ 生成完整包（可下载）
   ↓
3. 外部AI诊断
   ├─ 复制提示词到Claude/ChatGPT
   ├─ 上传完整包作为附件（可选）
   └─ 获取JSON格式的问题列表
   ↓
4. 导入AI回答
   ├─ 粘贴JSON到对话框右侧
   ├─ 系统解析并验证
   └─ 保存到数据库
   ↓
5. 查看问题列表
   ├─ 按维度分组显示
   ├─ 生成解决方案（可选）
   └─ 标记问题状态（忽略/已完成）
```

### 数据流

```
OverallCheck.vue
   ↓ 生成材料
overallCheckPrompts.js
   ↓ 生成提示词 + 完整包
ExternalAIWorkflowDialog.vue
   ↓ 用户手动操作
外部AI（Claude/ChatGPT）
   ↓ 返回JSON
OverallCheck.vue → handleDiagnosisImport()
   ↓ 保存
Backend API: saveDramaAIDiagnosis()
   ↓ 存储
MongoDB: project.aiDiagnosis.overall
```

## 📝 数据格式

### 问题对象结构

```javascript
{
  severity: "critical" | "medium" | "low",
  title: String,
  description: String,  // 必须包含具体集数和情节支撑
  location: {
    module: "episodes" | "outline" | "characters" | "worldview",
    field: String  // 如"第25-32集"、"第一幕"
  },
  dimension: "主线一致性" | "角色弧光完整性" | "节奏把控" | "情感曲线" | "伏笔回收" | "大纲一致性",
  status: "pending" | "ignored" | "completed",
  solution: {  // 可选
    suggestedContent: String | Object,
    explanation: String,
    generatedAt: Date
  }
}
```

### 示例JSON输出

```json
[
  {
    "severity": "critical",
    "title": "主线断裂：第25-32集偏离核心冲突",
    "description": "这8集主要聚焦次要角色的感情线，核心冲突「男主的控制欲vs女主的独立性」几乎未推进，观众可能失去耐心。具体：第25-28集全是配角戏份，第29-32集虽回归主线但缺乏承接。",
    "location": {
      "module": "episodes",
      "field": "第25-32集"
    },
    "dimension": "主线一致性"
  }
]
```

## 🎯 与前两阶段的对比

| 维度 | 前期检查 | 分集检查 | **整体检查** |
|------|---------|---------|------------|
| **检查对象** | 单模块（世界观/角色/大纲） | 单集剧本 | **已完成的所有剧集** |
| **触发条件** | 任意时刻 | 单集完成后 | **至少3集完成** |
| **检查维度** | 完整性、合理性 | 剧情连贯、人物塑造 | **节奏分布、主线一致性、角色弧光** |
| **实现方式** | 快速检查 + 内置AI | 外部AI工作流（单集） | **外部AI工作流（全局）** |
| **完整包内容** | - | 单集完整内容 | **所有已完成剧集完整内容** |

## 🔧 自定义模板

### localStorage存储

```javascript
// 保存自定义模板
localStorage.setItem('drama_prompt_template_overallCheck', customTemplate);

// 读取自定义模板
const customTemplate = localStorage.getItem('drama_prompt_template_overallCheck');
```

### 模板管理器

在 `PromptTemplateManager.vue` 中新增「整体检查提示词」Tab：
- 显示可用变量列表
- 编辑模板文本框
- 保存/恢复默认按钮

## 📊 完整包大小估算

| 剧集数 | 单集字数 | 总字数 | Markdown大小 | 估算Token |
|--------|---------|--------|-------------|----------|
| 10集 | 1200字 | 12,000字 | ~20KB | ~15K tokens |
| 30集 | 1200字 | 36,000字 | ~60KB | ~45K tokens |
| 60集 | 1200字 | 72,000字 | ~120KB | ~90K tokens |

**推荐AI平台**:
- ✅ Claude 3.5 Sonnet（支持200K tokens）
- ✅ GPT-4o（需注意token限制）
- ✅ DeepSeek V3（性价比高）

## ⚠️ 注意事项

### 1. 检查范围验证

```javascript
// 最小集数要求
if (completedCount < 3) {
  ElMessage.warning('建议至少完成3集后再进行整体检查');
  return;
}

// 范围内剧集验证
if (range.episodes.length === 0) {
  ElMessage.warning('所选范围内没有已完成的剧集');
  return;
}
```

### 2. 问题状态管理

- **pending**: 待处理
- **ignored**: 已忽略（用户可恢复）
- **completed**: 已完成

### 3. 解决方案生成

整体问题的解决方案可能涉及**多集修改**，当前版本暂时使用简单提示，后续可扩展为：
```javascript
solution: {
  episodesToModify: [30, 31, 32, 33, 34, 35],
  modifications: [
    {
      episode: 30,
      field: "summary",
      suggestion: "在第30集加入男主发现关键线索的情节..."
    },
    ...
  ],
  explanation: "通过在这6集中穿插主线推进场景..."
}
```

## 🚀 后续扩展方向

### 1. 本地快速检查（可选）

可新增本地分析引擎，提供：
- 完成度统计
- 角色出场分析
- 情感曲线可视化
- 字数分布分析

### 2. 整体问题解决方案生成

实现跨集修改建议：
- 批量修改提示词
- 修改预览（对比视图）
- 一键应用所有建议

### 3. 报告导出

导出整体诊断报告（PDF/Word）：
- 问题列表
- 可视化图表
- 优化建议

## 📚 相关文档

- [剧本医生整体架构](./README.md)
- [前期检查实现](./01-script-doctor-overview.md)
- [分集检查实现](./02-episodes-check-overview.md)
- [外部AI工作流](./08-integration-complete.md)

## ✅ 完成清单

- [x] 创建overallCheckTemplates.js（默认模板）
- [x] 创建overallCheckPrompts.js（工具函数）
- [x] 创建OverallCheck.vue（主组件）
- [x] 集成到ScriptAnalysis.vue
- [x] 扩展PromptTemplateManager.vue（新增整体检查Tab）
- [x] 编写功能文档

---

## 📝 开发者备注

**开发时间**: 2025-10-21
**版本**: v1.0.0
**开发人员**: Claude
**代码行数**: ~1500行（3个新文件 + 2个修改文件）
**开发周期**: 4小时（Phase 1-4）

**技术亮点**:
1. 模块化设计：单独组件，避免污染ScriptAnalysis主组件
2. 代码复用：最大化复用ExternalAIWorkflowDialog和现有工具函数
3. 灵活范围：支持全部/自定义范围检查
4. 可扩展性：预留解决方案生成和本地分析接口
