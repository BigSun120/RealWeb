# 分集检查 - AI提示词设计

## 📋 文档说明

本文档定义分集检查功能中使用的AI提示词结构和规范，包括诊断提示词和解决方案提示词的详细设计。

---

## 🎯 提示词设计原则

### 1. 上下文完整性
- ✅ 包含项目基本信息（名称、类型、总集数）
- ✅ 包含世界观、角色、大纲等基础设定
- ✅ 包含已完成的前置剧集摘要
- ✅ 包含当前检查集的完整内容

### 2. 指令明确性
- ✅ 明确检查维度和标准
- ✅ 明确返回JSON格式
- ✅ 明确字段约束（防止AI返回无效字段）
- ✅ 明确问题数量控制（优先质量不凑数）

### 3. 结构化输出
- ✅ 使用JSON Schema约束AI输出
- ✅ 便于前端解析和展示
- ✅ 减少解析失败风险

---

## 📝 诊断提示词结构

### 模板结构

```markdown
# 短剧分集质量诊断

## 项目基本信息
- **项目名称**：{{projectName}}
- **剧本类型**：{{projectType}}
- **总集数**：{{totalEpisodes}}集
- **已完成集数**：{{completedEpisodes}}集

---

## 世界观设定
{{worldviewContent}}

---

## 角色设定
{{charactersContent}}

---

## 角色关系图谱
{{relationshipGraphContent}}

---

## 剧情大纲
{{outlineContent}}

---

## 已完成剧集摘要（最近10集）
{{previousEpisodesContent}}

---

## 🎯 本次检查目标

### 检查集数
{{targetEpisodesInfo}}

### 检查维度
1. **剧情逻辑性**：情节是否合理、是否存在逻辑漏洞
2. **对白质量**：对话是否符合角色性格、是否自然流畅
3. **人物塑造**：角色行为是否一致、是否有性格变化的合理铺垫
4. **节奏把控**：故事推进是否流畅、信息密度是否合适
5. **悬念设置**：结尾是否有吸引力、是否能引发观众期待
6. **与前作衔接**：是否与前几集内容自然衔接

---

## 诊断原则

⚠️ **重要**：请严格遵守以下原则

1. **优先质量而非数量**
   - 只列出真正影响剧本质量的问题
   - 不要为了凑数而挑剔细节
   - 如果质量已达标，可以返回空数组 []

2. **问题数量控制**
   - 每集建议 2-5 个问题
   - 严重问题无论多少都要完整列出
   - 总数一般不超过 15 个

3. **定位精确**
   - 必须指明问题所在的具体集数
   - 尽量指明子字段（如"对白"、"场景描述"）
   - 便于后续修复定位

4. **描述具体可操作**
   - 每个问题要说明为什么是问题
   - 问题会造成什么影响
   - 给出明确的修改方向

---

## 字段约束（严格遵守）

⚠️ **location.field 必须使用以下格式**：

### episodes模块有效字段格式
- `第1集`、`第2集`、`第3集` ... `第N集`

### subField可选值（更细粒度定位）
- `对白` - 对话内容问题
- `场景` - 场景描述问题
- `情节` - 情节逻辑问题
- `节奏` - 节奏把控问题
- `悬念` - 结尾悬念问题
- `衔接` - 与前作衔接问题

**示例**：
```json
{
  "location": {
    "module": "episodes",
    "field": "第5集",
    "episodeNumber": 5,
    "subField": "对白"
  }
}
```

---

## 返回格式

请按以下JSON格式返回诊断结果：

```json
{
  "issues": [
    {
      "severity": "critical|medium|low",
      "title": "问题标题（10字内）",
      "description": "详细描述问题，为什么这是问题，会造成什么影响（150字内）",
      "location": {
        "module": "episodes",
        "field": "第X集",
        "episodeNumber": X,
        "subField": "对白|场景|情节|节奏|悬念|衔接"
      }
    }
  ]
}
```

---

## 评估标准

### 严重问题（critical）
- 剧情逻辑严重错误（如前后矛盾）
- 角色行为严重失真（与人设冲突）
- 对白严重不符合角色身份
- 关键情节缺失或不合理

### 中等问题（medium）
- 对白质量不够自然
- 场景描述不够生动
- 节奏稍显拖沓或仓促
- 悬念设置不够吸引人

### 轻微问题（low）
- 个别词语不够精准
- 场景细节可以更丰富
- 过渡可以更流畅

---

## 当前待检查集数完整内容

{{currentEpisodeFullContent}}

---

请基于以上所有信息，对指定集数进行专业诊断。
```

---

## 🔧 解决方案提示词结构

### 模板结构

```markdown
# 分集剧本问题修复方案

## 项目信息
- **项目名称**：{{projectName}}
- **剧本类型**：{{projectType}}
- **问题集数**：第{{episodeNumber}}集

---

## 问题描述

### 问题标题
{{issueTitle}}

### 严重程度
{{issueSeverity}}

### 问题详情
{{issueDescription}}

### 问题位置
- **模块**：分集剧本
- **集数**：第{{episodeNumber}}集
- **子字段**：{{subField}}

---

## 上下文信息

### 世界观设定（简要）
{{worldviewBrief}}

### 主要角色（简要）
{{charactersBrief}}

### 本集之前的剧情（最近5集摘要）
{{previousEpisodesBrief}}

---

## 当前集原始内容

### 第{{episodeNumber}}集：{{episodeTitle}}

**集简介**：
{{episodeSummary}}

**场景内容**：
{{episodeScenes}}

**关键对白**：
{{keyDialogues}}

**结尾悬念**：
{{cliffhanger}}

---

## 🎯 修复任务

请针对上述问题，提供具体的修改方案。

### 修改要求

1. **保持一致性**
   - 必须符合世界观设定
   - 必须符合角色性格
   - 必须与前作剧情衔接

2. **只修改问题部分**
   - 不要改动没有问题的内容
   - 保持原有的情节框架
   - 尽量保留原文风格

3. **具体可用**
   - 提供完整的修改内容（不要用省略号）
   - 可以直接替换到原文
   - 字数与原文相当（±20%）

---

## 返回格式

请按以下JSON格式返回修改方案：

```json
{
  "suggestedContent": {
    "summary": "如果是集简介问题，提供新的简介",
    "scenes": [
      {
        "number": 1,
        "location": "地点",
        "time": "时间",
        "atmosphere": "氛围",
        "content": "场景详细内容（如果是场景问题）"
      }
    ],
    "keyDialogues": ["关键对白1", "关键对白2"],
    "cliffhanger": "新的结尾悬念（如果是悬念问题）"
  },
  "explanation": "详细说明修改的理由、改动了哪些地方、为什么这样改更好（200字内）"
}
```

**注意**：
- 如果问题只涉及部分字段，只返回需要修改的字段
- 不要返回整集内容，只返回有改动的部分
- 确保返回的是标准JSON格式

---

请提供专业的修改方案。
```

---

## 📊 提示词变量映射表

### 诊断提示词变量

| 变量名 | 数据来源 | 格式化方法 |
|--------|----------|-----------|
| `projectName` | `project.name` | 直接使用 |
| `projectType` | `project.type` | 直接使用 |
| `totalEpisodes` | `project.episodeCount` | 数字 |
| `completedEpisodes` | `episodes.filter(completed).length` | 数字 |
| `worldviewContent` | `project.worldview` | `formatWorldview()` |
| `charactersContent` | `project.characters` | `formatCharacters()` |
| `relationshipGraphContent` | `project.relationshipGraph` | `formatRelationshipGraph()` |
| `outlineContent` | `project.outline` | `formatOutline()` |
| `previousEpisodesContent` | `episodes[n-10...n-1]` | `formatPreviousEpisodes()` |
| `targetEpisodesInfo` | 选中的episodes | `formatTargetEpisodes()` |
| `currentEpisodeFullContent` | `episodes[n]` | `formatEpisodeFullContent()` |

### 解决方案提示词变量

| 变量名 | 数据来源 | 格式化方法 |
|--------|----------|-----------|
| `episodeNumber` | `issue.location.episodeNumber` | 数字 |
| `issueTitle` | `issue.title` | 直接使用 |
| `issueSeverity` | `issue.severity` | 转中文 |
| `issueDescription` | `issue.description` | 直接使用 |
| `subField` | `issue.location.subField` | 直接使用 |
| `episodeTitle` | `episode.title` | 直接使用 |
| `episodeSummary` | `episode.content.summary` | 直接使用 |
| `episodeScenes` | `episode.content.scenes` | `formatScenes()` |
| `keyDialogues` | `episode.content.keyDialogues` | `formatDialogues()` |
| `cliffhanger` | `episode.content.cliffhanger` | 直接使用 |
| `worldviewBrief` | `project.worldview` | 简化版 |
| `charactersBrief` | `project.characters` | 简化版 |
| `previousEpisodesBrief` | `episodes[n-5...n-1]` | 简化版 |

---

## 🔍 格式化函数示例

### formatWorldview()
```javascript
const formatWorldview = (worldview) => {
  if (!worldview) return '暂无世界观设定';
  
  const parts = [];
  if (worldview.background) parts.push(`**故事背景**：${worldview.background}`);
  if (worldview.setting) parts.push(`**世界设定**：${worldview.setting}`);
  if (worldview.theme) parts.push(`**核心主题**：${worldview.theme}`);
  if (worldview.conflict) parts.push(`**主要冲突**：${worldview.conflict}`);
  if (worldview.tone) parts.push(`**情感基调**：${worldview.tone}`);
  
  return parts.join('\n') || '暂无世界观设定';
};
```

### formatPreviousEpisodes()
```javascript
const formatPreviousEpisodes = (episodes, currentNumber) => {
  const previous = episodes
    .filter(ep => ep.number < currentNumber && 
                  (ep.status === 'completed' || ep.status === 'reviewed'))
    .sort((a, b) => a.number - b.number)
    .slice(-10); // 最多10集
  
  if (previous.length === 0) return '暂无已完成的前置剧集';
  
  return previous.map(ep => {
    let text = `### 第${ep.number}集：${ep.title || '未命名'}\n\n`;
    if (ep.content?.summary) text += `${ep.content.summary}\n\n`;
    
    if (ep.content?.scenes && ep.content.scenes.length > 0) {
      text += `**关键场景**：\n`;
      ep.content.scenes.slice(0, 3).forEach((scene, idx) => {
        text += `- 场景${idx + 1}（${scene.location || '未知'}）\n`;
      });
      text += '\n';
    }
    
    if (ep.content?.cliffhanger) {
      text += `**结尾**：${ep.content.cliffhanger}\n\n`;
    }
    
    return text + '---\n';
  }).join('\n');
};
```

### formatEpisodeFullContent()
```javascript
const formatEpisodeFullContent = (episode) => {
  let text = `## 第${episode.number}集：${episode.title || '未命名'}\n\n`;
  
  text += `**状态**：${getStatusText(episode.status)}\n`;
  text += `**字数**：${episode.wordCount || 0}字\n\n`;
  
  if (episode.content?.summary) {
    text += `### 集简介\n${episode.content.summary}\n\n`;
  }
  
  if (episode.content?.scenes && episode.content.scenes.length > 0) {
    text += `### 场景内容\n\n`;
    episode.content.scenes.forEach((scene, idx) => {
      text += `#### 场景${scene.number || idx + 1}：${scene.location || '未知地点'}\n`;
      if (scene.time) text += `- 时间：${scene.time}\n`;
      if (scene.atmosphere) text += `- 氛围：${scene.atmosphere}\n`;
      text += `\n${scene.content || '暂无内容'}\n\n`;
    });
  } else if (episode.content?.script) {
    text += `### 剧本内容\n\n${episode.content.script}\n\n`;
  }
  
  if (episode.content?.keyDialogues && episode.content.keyDialogues.length > 0) {
    text += `### 关键对白\n\n`;
    episode.content.keyDialogues.forEach((dialogue, idx) => {
      text += `${idx + 1}. "${dialogue}"\n`;
    });
    text += '\n';
  }
  
  if (episode.content?.cliffhanger) {
    text += `### 结尾悬念\n${episode.content.cliffhanger}\n\n`;
  }
  
  if (episode.content?.notes) {
    text += `### 备注\n${episode.content.notes}\n\n`;
  }
  
  return text;
};
```

---

## ⚠️ 注意事项

### 1. Token预算控制

**诊断提示词预估**：
- 项目基础信息：~500 tokens
- 世界观+角色+大纲：~1500 tokens
- 前置剧集摘要（10集）：~2000 tokens
- 当前集完整内容：~1000 tokens
- 指令和约束：~500 tokens
- **总计**：~5500 tokens

**解决方案提示词预估**：
- 问题描述：~300 tokens
- 上下文（简化版）：~800 tokens
- 当前集内容：~1000 tokens
- 指令：~300 tokens
- **总计**：~2400 tokens

### 2. 字段约束的重要性

必须在提示词中**明确限制**可用字段，否则AI可能返回：
- ❌ `"第5集的对白"` → 应该分离为 `field: "第5集"`, `subField: "对白"`
- ❌ `"剧本内容"` → 过于宽泛，无法定位
- ❌ `"第五集"` → 应该使用数字 `"第5集"`

### 3. 完整包引用

诊断提示词中需要提示用户：
> ⚠️ 请配合"完整创作包"文档使用本提示词。完整包包含所有背景信息和已完成剧集的详细内容。

---

**文档版本**：v1.0  
**创建日期**：2025-01-16  
**最后更新**：2025-01-16
