# 分集检查 - 技术设计思路

## 📋 文档说明

本文档阐述分集检查功能的技术设计思路和关键决策点，帮助理解整体架构而非具体实现细节。

---

## 🏗️ 架构设计思路

### 核心理念：复用现有基础设施

```
分集检查功能设计 = 前期检查模式 + 外部AI工作流 + 分集数据结构
```

**设计原则**：
1. ✅ **最大化复用**：利用前期检查的诊断流程、问题管理、解决方案生成机制
2. ✅ **最小化侵入**：在`ScriptAnalysis.vue`中扩展，不重构现有代码
3. ✅ **模块化扩展**：新增功能独立封装，便于测试和维护
4. ✅ **用户友好**：外部AI工作流提供清晰的操作引导

---

## 📐 组件职责划分

### 1. ScriptAnalysis.vue（主组件扩展）

**职责**：
- 管理分集检查的整体流程
- 提供剧集选择器UI
- 协调各子组件工作
- 管理问题列表状态

**新增状态**：
```
episodeCheckState {
  - 选中的剧集列表
  - 当前检查的剧集
  - 工作流步骤
  - 生成的提示词
  - AI回答文本
}
```

**新增计算属性**：
- `completedEpisodes` - 过滤出已完成的剧集
- `episodeIssuesByNumber` - 按集数分组的问题

---

### 2. ExternalAIWorkflowDialog（新组件）

**职责**：
- 引导用户完成外部AI交互流程
- 分步骤展示操作指引
- 提供完整包下载链接
- 接收并解析AI回答

**三步工作流**：
```
Step 1: 准备材料
  - 展示提示词（可复制）
  - 提供完整包下载按钮（调用全局工具）
  
Step 2: 提交外部AI
  - 显示操作指引
  - 推荐使用的AI工具
  
Step 3: 导入结果
  - 提供文本框粘贴AI回答
  - 实时解析并展示解析状态
  - 成功后返回问题列表
```

---

### 3. 工具模块设计

#### episodeCheckPrompts.js（提示词生成）

**核心函数**：
```javascript
generateEpisodeCheckPrompt(data) {
  // 1. 格式化项目基础信息
  // 2. 格式化世界观、角色、大纲
  // 3. 格式化前置剧集摘要（最近10集）
  // 4. 格式化当前检查集的完整内容
  // 5. 添加检查维度和标准
  // 6. 添加字段约束（严格限制返回格式）
  // 7. 返回完整提示词文本
}
```

**设计要点**：
- 参考前期检查的`generateDiagnosisPrompt()`模式
- 使用与前期检查相同的格式化函数（复用）
- 特别强调"配合完整包使用"的提示
- 明确`location.field`格式为`"第X集"`

---

#### episodeCheckParser.js（问题解析）

**核心函数**：
```javascript
parseEpisodeCheckIssues(aiResponse) {
  // 1. 尝试直接JSON解析
  // 2. 从代码块提取JSON
  // 3. 正则匹配JSON对象
  // 4. 验证问题结构
  // 5. 自动补充episodeNumber字段
  // 6. 返回标准化的问题数组
}
```

**设计要点**：
- 完全复用`parseAIIssues()`的解析逻辑
- 针对episodes模块做特殊处理：
  - 自动从`field`提取集数（"第5集" → 5）
  - 验证`episodeNumber`存在
  - 确保`module`固定为`"episodes"`

---

## 🔄 数据流设计

### 诊断流程数据流

```
用户选择剧集
  ↓
[前端] 生成提示词（episodeCheckPrompts.js）
  ↓
[前端] 显示外部AI工作流对话框
  ↓
[用户] 去外部AI提交 → 获得回答
  ↓
[用户] 粘贴AI回答到系统
  ↓
[前端] 解析AI回答（episodeCheckParser.js）
  ↓
[前端] 验证问题位置（validateIssueLocation）
  ↓
[前端] 过滤无效问题，保留有效问题
  ↓
[前端] 添加到aiIssues数组
  ↓
[前端] 按集数分组展示
  ↓
[后端] 保存到服务器（saveAIDiagnosis）
```

---

### 解决方案流程数据流

```
用户点击"生成解决方案"
  ↓
[前端] 生成方案提示词
  ↓
[前端] 再次显示外部AI工作流
  ↓
[用户] 提交外部AI → 获得方案
  ↓
[用户] 粘贴方案到系统
  ↓
[前端] 解析方案（parseAISolution）
  ↓
[前端] 显示对比对话框（原内容 vs AI建议）
  ↓
[用户] 确认应用
  ↓
[前端] UpdateStrategyFactory.apply()
  ↓
[后端] 更新episode内容（patchDramaEpisodes）
  ↓
[前端] 刷新project数据
  ↓
[前端] 标记问题为已解决
```

---

## 🔑 关键技术决策

### 决策1：为什么用外部AI模式？

**背景**：
- 前期检查可以直接调用内部AI（Token可控，~3000）
- 分集检查需要大量上下文（完整包可能10000+ tokens）

**决策**：使用外部AI模式

**理由**：
1. **成本控制**：避免高额Token消耗
2. **上下文完整**：完整包作为附件，不会被截断
3. **用户灵活**：可选择不同AI工具
4. **现有基础**：完整包下载功能已存在

**权衡**：
- ✅ 优点：成本低、上下文完整、灵活
- ❌ 缺点：用户需要手动操作（但工作流引导可以降低难度）

---

### 决策2：问题数据存储在哪？

**选项A**：单独存储在episode对象中
```javascript
episode.aiCheckIssues = [...]
```

**选项B**：统一存储在aiIssues数组（✅ 采用）
```javascript
aiIssues = [
  { stage: 'preparation', ... },
  { stage: 'episodes', episodeNumber: 5, ... }  // 分集问题
]
```

**决策**：选项B

**理由**：
1. **统一管理**：利用现有问题管理基础设施
2. **状态同步**：不需要处理episode数据与问题数据的同步
3. **复用UI**：利用现有问题展示、解决方案生成UI
4. **持久化简单**：通过`saveAIDiagnosis` API统一保存

---

### 决策3：如何关联完整包？

**选项A**：在提示词中直接包含完整包内容
- ❌ Token消耗巨大
- ❌ 超过模型上下文限制

**选项B**：提示用户手动下载完整包（✅ 采用）
- ✅ 利用全局工具的完整包下载功能
- ✅ 在工作流中提供下载按钮
- ✅ 明确提示用户需要配合使用

**实现方式**：
```javascript
// Step 1: 准备材料
<el-button @click="downloadCompletePackage(episode)">
  下载 第{{episode.number}}集 完整包
</el-button>

// 调用全局工具（分集剧本模块已有）
const downloadCompletePackage = (episode) => {
  const content = generateCompleteCreationPackage({
    episode,
    projectInfo,
    worldview,
    characters,
    outline,
    allEpisodes,
    prompt: episodeCheckPrompt,
    relationshipGraph
  });
  
  downloadTextFile(content, filename);
};
```

---

### 决策4：单集 vs 批量诊断？

**设计**：支持两种模式

**单集模式**（推荐）：
- 用户选择1集
- 显示工作流对话框
- 逐步引导完成诊断

**批量模式**：
- 用户选择多集
- 批量生成提示词文件
- 提示用户分别下载完整包
- 用户可多次导入AI回答

**权衡**：
- 单集模式：体验好、准确性高
- 批量模式：效率高、适合全面检查

---

## 🎨 UI/UX设计思路

### 剧集选择器设计

**核心思想**：类似文件管理器的多选列表

**关键元素**：
- ✅ 全选checkbox
- ✅ 每集显示状态、字数、更新时间
- ✅ 已有问题的剧集高亮（红色边框）
- ✅ 草稿状态不可选（灰色）
- ✅ 快速操作按钮（查看、问题）

**交互反馈**：
- 选中时背景变蓝
- hover时显示边框
- 显示选中数量

---

### 问题列表设计

**核心思想**：按集数折叠展示

**设计理由**：
- 分集检查可能产生大量问题（5集×3问题=15个）
- 按集数分组便于用户定位
- 折叠面板节省空间

**信息层级**：
```
第X集（折叠标题）
  - 显示集标题
  - 显示问题数量badge
  
问题卡片（折叠内容）
  - 严重程度tag
  - 子字段tag（如"对白"）
  - 问题标题和描述
  - 操作按钮组
```

---

### 外部AI工作流设计

**核心思想**：分步骤向导，降低用户认知负担

**设计模式**：Wizard（向导）

**每步内容**：
- 明确的步骤编号（1/3, 2/3, 3/3）
- 清晰的操作说明
- 大按钮引导下一步
- 支持返回上一步

**视觉反馈**：
- 步骤条显示进度
- 当前步骤高亮
- 完成步骤打勾

---

## 🔍 关键验证点

### 字段验证加强

**分集检查特有验证**：
```javascript
// 1. 验证field格式
if (!/^第\d+集$/.test(field)) {
  return { valid: false, reason: '字段格式错误' };
}

// 2. 验证episodeNumber存在
if (!location.episodeNumber) {
  return { valid: false, reason: '缺少集数编号' };
}

// 3. 验证episode存在
const episode = project.episodes.find(ep => ep.number === episodeNumber);
if (!episode) {
  return { valid: false, reason: '剧集不存在' };
}

// 4. 验证episode已完成
if (episode.status !== 'completed' && episode.status !== 'reviewed') {
  return { valid: false, reason: '剧集未完成' };
}
```

---

### 内容更新策略

**使用`EpisodeUpdateStrategy`**：
```javascript
// UpdateStrategyFactory已有
apply(project, field, newContent, characterId = null) {
  const strategy = this.getStrategy('episodes');
  return strategy.update(project, field, newContent);
}
```

**关键点**：
- `field`格式：`"第5集"`
- 从field中提取集数：`parseInt(field.match(/\d+/)[0])`
- 定位episode：`project.episodes.find(ep => ep.number === episodeNumber)`
- 智能合并：保留`_id`、`id`、`createdAt`等系统字段
- 部分更新：只更新AI建议的字段（如只更新`keyDialogues`）

---

## 📊 扩展性考虑

### 未来可能的增强

**Phase 2功能预留**：
1. **批量导入优化**：
   - 支持拖拽上传多个AI回答文件
   - 自动识别集数并匹配

2. **问题统计图表**：
   - 各集问题分布柱状图
   - 严重程度饼图

3. **质量评分**：
   - 根据问题数量和严重程度计算每集得分
   - 显示雷达图

4. **诊断历史**：
   - 记录每次诊断的时间和结果
   - 支持对比不同版本的诊断结果

**架构预留**：
- 问题结构支持`diagnosisId`字段（关联诊断批次）
- 问题结构支持`version`字段（追踪版本）
- API支持`?history=true`参数获取历史记录

---

## ⚠️ 重要注意事项

### 1. 与前期检查的一致性

**必须保持**：
- 问题数据结构一致
- 解决方案流程一致
- 字段映射逻辑一致
- 验证规则一致

**差异点**：
- `location.module`固定为`"episodes"`
- `location.field`格式为`"第X集"`
- 新增`location.episodeNumber`和`location.subField`
- 新增`context`字段（集标题、状态、字数）

---

### 2. 完整包依赖

**必须确保**：
- 完整包下载功能正常工作
- 用户能理解完整包的作用
- 工作流中明确提示需要下载完整包
- 提供直接的下载按钮（调用全局工具）

---

### 3. 外部AI兼容性

**需要考虑**：
- 不同AI的返回格式可能略有差异
- 解析器需要足够健壮（多层回退）
- 提供"解析失败"时的友好提示
- 支持手动调整后重新解析

---

### 4. 性能优化

**潜在瓶颈**：
- 大量剧集时的渲染性能（建议虚拟滚动）
- 问题列表过多时的展示（已通过折叠面板优化）
- 提示词生成时的字符串拼接（建议使用模板字符串）

**优化建议**：
- 剧集选择器考虑分页或虚拟滚动（>50集时）
- 问题列表默认只展开第一个折叠面板
- 提示词生成使用缓存（相同剧集不重复生成）

---

## 🎯 实现优先级建议

### P0（MVP必须）
- ✅ 剧集选择器UI
- ✅ 单集诊断工作流
- ✅ 提示词生成
- ✅ AI回答解析
- ✅ 问题列表展示
- ✅ 解决方案生成和应用

### P1（重要）
- ✅ 批量生成提示词
- ✅ 问题按集数分组
- ✅ 完整包下载集成

### P2（优化）
- ⭐ 批量导入AI回答
- ⭐ 问题统计图表
- ⭐ 诊断历史记录

---

**文档版本**：v1.0  
**创建日期**：2025-01-16  
**最后更新**：2025-01-16
