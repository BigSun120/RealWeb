# 剧本医生 AI 增强功能 - 系统概述

## 📋 文档目的

本文档系列旨在帮助 AI 助手快速理解"剧本医生"功能的整体架构、核心逻辑和关键注意事项，便于在新对话中快速上手维护和优化该功能。

---

## 🎯 功能简介

**剧本医生（Script Doctor）** 是 AI 短剧脚本生成器中的智能诊断和优化功能，用于分析剧本项目的质量问题并提供 AI 驱动的解决方案。

### 核心价值

- ✅ **自动诊断**：多维度分析剧本质量（世界观、角色、大纲、分集）
- ✅ **AI 辅助**：利用 AI 生成具体可用的修改方案
- ✅ **精准定位**：准确标注问题所在的模块、字段和具体位置
- ✅ **智能替换**：一键应用 AI 建议，自动合并保留系统字段

---

## 🏗️ 系统架构

### 三层分阶段诊断架构

```
┌─────────────────────────────────────────┐
│          剧本医生主界面                  │
│        (ScriptAnalysis.vue)             │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┐
    │                     │              │
┌───▼────┐          ┌────▼─────┐   ┌───▼────┐
│前期检查 │          │分集检查   │   │整体检查 │
│Stage 1 │          │Stage 2   │   │Stage 3 │
└────────┘          └──────────┘   └────────┘
    │                     │              │
    └──────────┬──────────┴──────────────┘
               │
        ┌──────▼─────────┐
        │  每个阶段包含   │
        ├────────────────┤
        │ - 快速检查 Tab  │
        │ - AI诊断 Tab    │
        └────────────────┘
```

### 分阶段诊断逻辑

| 阶段 | 英文标识 | 检查内容 | 关键模块 |
|------|---------|---------|---------|
| **前期检查** | `preparation` | 世界观、角色、大纲结构 | `worldview`, `characters`, `outline` |
| **分集检查** | `episodes` | 各集剧本内容、完整性 | `episodes` |
| **整体检查** | `overall` | 全局一致性、节奏把控 | 跨模块检查 |

---

## 🔧 核心组件结构

### 文件组织

```
frontend/src/views/tools/productivity/drama/
├── components/
│   └── ScriptAnalysis.vue          # 主组件（~3800行）
├── services/
│   ├── AIService.js                # AI交互服务层
│   ├── DataService.js              # 数据访问服务层
│   └── UpdateStrategyFactory.js    # 更新策略工厂
├── mappers/
│   └── FieldMapper.js              # 字段映射器
└── schemas/
    └── aiResponseSchemas.js        # AI响应结构定义
```

### 组件职责划分

| 组件 | 职责 | 关键方法 |
|------|------|---------|
| **ScriptAnalysis.vue** | UI逻辑、用户交互、状态管理 | `runQuickAnalysis`, `runAIDiagnosis`, `generateSolution`, `applySolution` |
| **AIService** | AI API调用、响应解析 | `runDiagnosis`, `generateSolution`, `parseModuleData` |
| **DataService** | 数据读取、格式化 | `getFieldContent` |
| **UpdateStrategyFactory** | 数据更新、智能合并 | `apply`, `_mergeActContent`, `_mergePlotPoints` |
| **FieldMapper** | 中英文字段映射 | `getEnglishField`, `getChineseField` |

---

## 🔄 核心工作流程

### 1. 快速检查流程

```
用户切换到某个阶段
    ↓
自动触发 runQuickAnalysis()
    ↓
执行基础规则检查（纯前端）
    ↓
生成问题列表（basicIssues）
    ↓
显示在"快速检查"Tab
```

**特点**：
- ✅ 无需调用 AI
- ✅ 快速响应
- ✅ 检查字段完整性、必填项等

### 2. AI 深度诊断流程

```
用户点击"AI深度诊断"
    ↓
generateDiagnosisPrompt() 生成提示词
    ↓
AIService.runDiagnosis() 调用AI
    ↓
parseAIIssues() 解析AI返回的问题
    ↓
aiIssues = [...问题列表]
    ↓
切换到"AI诊断"Tab
    ↓
保存到服务器 (saveAIDiagnosisToServer)
```

**特点**：
- ✅ AI 多维度分析
- ✅ 发现深层问题
- ✅ 持久化存储

### 3. 生成解决方案流程

```
用户点击某个问题的"生成方案"
    ↓
generateSolutionPrompt(issue) 生成提示词
    ↓
AIService.generateSolution() 调用AI
    ↓
parseAISolution() 解析方案
    ↓
issue.solution = { suggestedContent, explanation }
    ↓
显示【原文案】vs【AI建议方案】对比弹窗
```

**特点**：
- ✅ 针对具体问题生成方案
- ✅ 支持 JSON / Formatted 双模式显示
- ✅ 可编辑、保存、恢复

### 4. 应用方案流程

```
用户点击"替换原文案"
    ↓
applySolution() 准备内容
    ↓
UpdateStrategyFactory.apply()
    ↓
根据 module 选择策略：
  - worldview → WorldviewUpdateStrategy
  - characters → CharacterUpdateStrategy
  - outline → OutlineUpdateStrategy ⚠️
  - episodes → EpisodeUpdateStrategy
    ↓
智能合并内容（保留系统字段）
    ↓
调用后端 API (patchDramaXxx)
    ↓
更新成功 → 刷新页面数据
```

**特点**：
- ✅ 智能合并而非简单替换
- ✅ 保留 `_id`、`id` 等系统字段
- ✅ 支持复杂对象的字段级更新

---

## 📊 数据模型

### Issue 对象结构

```javascript
{
  id: string,                    // 唯一标识
  title: string,                 // 问题标题
  description: string,           // 问题描述
  severity: 'critical' | 'medium' | 'low',  // 严重程度
  location: {                    // 定位信息 ⚠️ 关键
    module: string,              // 模块：worldview/characters/outline/episodes
    field: string,               // 字段：中文名称（如"故事背景"、"第二幕"）
    characterId?: string,        // 角色ID（可选）
    episodeNumber?: number       // 集数（可选）
  },
  status: 'pending' | 'solution_ready' | 'solved' | 'ignored',  // 状态
  solution?: {                   // 解决方案（可选）
    suggestedContent: string | object,  // AI建议内容 ⚠️
    explanation: string,         // 修改说明
    generatedAt: string          // 生成时间
  },
  generating: boolean            // 是否正在生成方案
}
```

### Location 字段说明

`location` 是问题定位的核心，必须精确：

- **module**：必须是 `worldview` / `characters` / `outline` / `episodes` 之一
- **field**：必须使用**中文字段名**，如：
  - 世界观：`故事背景`、`世界设定`、`核心主题`、`主要冲突`、`情感基调`
  - 角色：`角色名称`、`性格描述`、`角色背景`、`行为动机`、`人际关系`
  - 大纲：`第一幕`、`第二幕`、`第三幕`...
  - 分集：`第1集`、`第2集`...

---

## 🔑 关键技术点

### 1. AI 响应格式验证（已修复）

**问题**：刷新页面后 AI 建议内容变成 MongoDB ID 字符串

**解决方案**：
- ✅ 加载时验证 `suggestedContent` 是否为 24 位十六进制（MongoDB ID）
- ✅ 如果是，清除该 solution 并重置状态为 `pending`
- ✅ 保存时验证内容不是 MongoDB ID

**代码位置**：`ScriptAnalysis.vue` 第 2372-2470 行

### 2. 大纲更新的智能合并（已修复）

**问题**：AI 返回完整幕对象时，整个对象被当作字符串塞进 `description`

**解决方案**：
- ✅ `OutlineUpdateStrategy._mergeActContent()` 智能判断内容类型
- ✅ 保留原始 `_id`、`id` 系统字段
- ✅ `_mergePlotPoints()` 按 ID 匹配并合并情节点
- ✅ 新增情节点生成唯一 ID

**代码位置**：`UpdateStrategyFactory.js` 第 158-291 行

### 3. 显示模式切换

支持两种显示模式：
- **JSON 模式**：显示原始 JSON 结构
- **Formatted 模式**：格式化为易读的 Markdown

**切换逻辑**：
- 原文案：`displayMode` → 通过 `DataService.getFieldContent()`
- AI 建议：`suggestionDisplayMode` → 通过 `formatSuggestedContent()`

---

## ⚠️ 重要注意事项

### 1. 字段映射必须一致

- AI 提示词使用**中文字段名**（`field`）
- 后端 API 使用**英文字段名**（通过 `FieldMapper` 转换）
- 必须保持一致性，否则会导致更新失败

### 2. 大纲模块的特殊性

大纲是唯一返回**完整对象**的模块：
```javascript
{
  suggestedContent: {
    _id: "xxx",
    actNumber: 2,
    title: "第二幕：对抗",
    description: "...",
    plotPoints: [...]
  }
}
```

其他模块通常返回字符串或简单对象。

### 3. 状态持久化

- AI 诊断结果保存到后端：`/api/tools/drama/projects/:id/ai-diagnosis`
- 刷新页面会自动加载：`loadAIDiagnosisFromServer()`
- 包括问题列表和已生成的 solution

### 4. 忽略问题的处理

- ✅ 不删除问题
- ✅ 标记为 `ignored` 状态
- ✅ 显示删除线样式
- ✅ 提供"恢复"按钮

---

## 📚 相关文档

1. **[详细架构文档](./script-doctor-architecture.md)** - 深入了解各层架构
2. **[数据流文档](./script-doctor-data-flow.md)** - 追踪数据在系统中的流动
3. **[AI 提示词指南](./script-doctor-prompts.md)** - AI 交互的最佳实践
4. **[故障排查指南](./script-doctor-troubleshooting.md)** - 常见问题及解决方案

---

## 🚀 快速开始指南

### 查看核心代码

```bash
# 主组件
frontend/src/views/tools/productivity/drama/components/ScriptAnalysis.vue

# 关键服务
frontend/src/views/tools/productivity/drama/services/AIService.js
frontend/src/views/tools/productivity/drama/services/UpdateStrategyFactory.js
```

### 关键方法速查

| 功能 | 方法名 | 行号参考 |
|------|--------|---------|
| 快速检查 | `runQuickAnalysis()` | ~500-800 |
| AI 诊断 | `runAIDiagnosis()` | ~770-830 |
| 生成方案 | `generateSolution()` | ~1079-1206 |
| 应用方案 | `applySolution()` | ~1423-1502 |
| 大纲合并 | `_mergeActContent()` | UpdateStrategyFactory.js ~164-227 |

---

**文档版本**：v1.0  
**最后更新**：2025-01-15  
**维护者**：AI 开发团队
