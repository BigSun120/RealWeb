/**
 * 分集检查和解决方案的默认模板
 */

/**
 * 默认的分集检查提示词模板
 * 支持的变量：
 * - {{projectName}} - 项目名称
 * - {{projectType}} - 剧本类型
 * - {{episodeCount}} - 总集数
 * - {{episodeNumber}} - 当前检查的集数
 * - {{worldview}} - 世界观设定（自动格式化）
 * - {{characters}} - 角色列表（自动格式化）
 * - {{outline}} - 剧情大纲（自动格式化）
 * - {{completedEpisodes}} - 已完成剧集摘要（自动格式化）
 * - {{episodeContent}} - 待检查剧集内容（自动格式化）
 */
export function getDefaultEpisodeCheckTemplate() {
  return `# 短剧分集质量检查任务

## 🎯 任务说明

你是一位专业的短剧编审专家，需要对以下短剧的第{{episodeNumber}}集进行全面质量检查。请基于项目的世界观、角色设定、剧情大纲以及前置剧集内容，诊断该集是否存在质量问题。

---

## 📋 项目信息

- **项目名称**：{{projectName}}
- **剧本类型**：{{projectType}}
- **总集数**：{{episodeCount}}集
- **检查对象**：第{{episodeNumber}}集

---

## 🌍 世界观设定

{{worldview}}

---

## 👥 角色设定

{{characters}}

---

## 📖 剧情大纲

{{outline}}

---

## 📚 前置剧集摘要

{{completedEpisodes}}

---

## 📄 待检查剧集完整内容

{{episodeContent}}

---

## 🔍 检查维度与标准

请从以下维度对第{{episodeNumber}}集进行诊断，**只报告真正存在的问题**：

### 1. 剧情逻辑性（critical）
- **前后矛盾**：与前置剧集或大纲设定有明显冲突
- **逻辑漏洞**：情节发展不合理，存在逻辑断层
- **因果关系**：事件缺乏合理的因果链

### 2. 角色一致性（critical）
- **性格突变**：角色行为与既定性格严重不符，且无铺垫
- **动机缺失**：角色重要行为缺乏动机支撑
- **人物崩塌**：角色形象与前期设定严重偏离

### 3. 情节完整度（medium）
- **节奏问题**：情节过于拖沓或过于仓促
- **冲突薄弱**：缺乏足够的戏剧冲突
- **高潮缺失**：本集缺少情感或剧情高点

### 4. 对白质量（medium）
- **台词僵硬**：对白不自然，缺乏角色特色
- **信息堆砌**：过度使用说明性对白
- **重复冗余**：对白存在明显重复或冗余

### 5. 细节合理性（low）
- **场景描述不足**：关键场景缺乏必要的氛围营造
- **细节错误**：时间、地点、道具等细节错误
- **悬念处理**：结尾悬念设置不当或缺失

---

## 📤 输出格式要求

**极其重要**：请严格按照以下JSON格式输出问题列表，不要添加任何markdown代码块标记或其他文本。

\`\`\`json
[
  {
    "severity": "critical",
    "title": "角色设定前后矛盾",
    "description": "具体描述问题...",
    "location": {
      "module": "episodes",
      "field": "第{{episodeNumber}}集"
    }
  }
]
\`\`\`

### location字段约束

- **module**：必须为 \`"episodes"\`
- **field**：必须为 \`"第{{episodeNumber}}集"\` 格式（使用阿拉伯数字）
- **禁止**：不要使用 \`"第{{episodeNumber}}集-剧本"\` 这种带子字段的格式

### severity等级说明

- **critical**：严重问题，影响剧情连贯性或角色可信度
- **medium**：中等问题，影响观看体验但不致命
- **low**：轻微问题，优化建议

### 输出要求

1. **只输出JSON数组**，不要包含任何其他文本
2. **如果没有问题**，输出空数组 \`[]\`
3. **问题要具体**：明确指出问题所在的具体情节或对白
4. **避免主观评价**：聚焦可量化、可验证的问题
5. **控制数量**：只报告最关键的问题（建议3-8个）
6. **🔴 JSON格式规范**：description/title字段中，对话内容请用单引号（'）代替双引号（"）

---

## ⚠️ 特别注意

1. **严格格式**：location.field 必须为 "第{{episodeNumber}}集"，不可添加任何后缀
2. **质量优先**：宁可少报，不可误报，确保每个问题都真实存在
3. **上下文关联**：问题诊断要结合世界观、角色设定和前置剧集
4. **保持专业**：用编审的专业视角，而非普通读者视角

现在请开始诊断第{{episodeNumber}}集，输出JSON格式的问题列表。`;
}

/**
 * 默认的解决方案生成提示词模板
 * 支持的变量：
 * - {{episodeNumber}} - 集数
 * - {{severity}} - 问题严重程度
 * - {{issueTitle}} - 问题标题
 * - {{issueDescription}} - 问题详细描述
 * - {{originalContentJSON}} - 原始episode.content的JSON格式
 */
export function getDefaultSolutionTemplate() {
  return `# 短剧分集问题修复 - 第{{episodeNumber}}集

## 🔴 问题描述

**严重程度**：{{severity}}
**问题标题**：{{issueTitle}}
**详细描述**：{{issueDescription}}

---

## 📝 原始剧集内容 (episode.content)

以下是第{{episodeNumber}}集的原始content对象（JSON格式）：

\`\`\`json
{{originalContentJSON}}
\`\`\`

**注意**：你必须返回与上述结构**完全一致**的JSON对象，包括所有字段（包括_id、id等系统字段）。

---

## 🎯 任务要求

请修复上述问题，**返回完整的 episode.content JSON 对象**。

### 输出格式

**极其重要**：请严格按照以下格式输出：

\`\`\`json
{
  "suggestedContent": {
    "summary": "修复后的简介文本",
    "script": "修复后的剧本内容（如果原有）",
    "scenes": [
      {
        "_id": "保留原有_id",
        "id": "保留原有id",
        "number": 1,
        "location": "修复后的场景地点",
        "time": "修复后的时间",
        "atmosphere": "修复后的氛围",
        "content": "修复后的场景内容"
      }
    ],
    "keyDialogues": ["修复后的关键对白1", "修复后的关键对白2"],
    "cliffhanger": "修复后的悬念内容",
    "notes": "保留原有notes字段（如果存在）"
  },
  "explanation": "修改说明：如何解决问题、主要修改点、预期效果"
}
\`\`\`

### 🚨 重要约束

1. **必须返回完整JSON**：suggestedContent 必须是一个完整的 episode.content JSON 对象
2. **保持所有原始字段**：
   - 必须保留原有的所有字段，包括summary、script、scenes、keyDialogues、cliffhanger、notes等
   - 必须保留scenes数组中每个场景的_id、id字段（如果存在）
   - 即使某个字段没有修改，也必须完整保留
3. **只修改有问题的部分**：根据问题描述修改相关内容，其他内容完全保持不变
4. **不要简写**：不要用 "...其余不变..." 等省略，必须返回完整内容
5. **解释简洁**：explanation 字段简明扼要，100-200字即可

### 📤 输出格式要求（极其重要）

**必须严格遵守以下JSON格式规范**：

1. **只输出JSON对象**，不要包含markdown代码块标记（\`\`\`json）或其他文本
2. **JSON格式规范**：
   - 对话内容中的引号请用单引号（'）代替双引号（"）
   - 示例："萧玦：'这东西，我买了。'" ✅
   - 错误："萧玦：\\"这东西，我买了。\\"" ❌
   - 错误："萧玦：『这东西，我买了。』" ❌（不要使用书名号）
3. **确保JSON可解析**：返回的JSON必须能被标准JSON解析器解析
4. **suggestedContent必须是对象**：不能是字符串，必须是完整的episode.content对象

### 修改示例

如果问题是角色设定矛盾，你应该：
- 修改 script 中相关的对白和描述
- 修改对应的 scenes[].content
- 保持 summary、keyDialogues、cliffhanger 等其他字段不变（除非也需要修改）

### ⚠️ 再次强调

**返回格式**：纯JSON对象，不要添加任何markdown标记或其他文本！
**引号规则**：对话中使用单引号（'），不要使用双引号（"）或书名号（『』）！

现在请提供修复后的完整 episode.content JSON：`;
}
