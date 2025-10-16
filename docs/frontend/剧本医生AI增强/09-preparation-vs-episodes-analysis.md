# 前期检查 vs 分集检查 - 功能对比分析

## 📋 概述

本文档详细对比【前期检查】和【分集检查】的实现差异，为分集检查的功能补全提供参考。

---

## 🔍 核心功能对比

### 1. 数据持久化

#### 前期检查 ✅
- **保存时机**：
  - 导入AI诊断结果后自动保存（`handleDiagnosisParsed` 第2808行）
  - 问题状态变化后自动保存（`watch(aiIssues)` 第2915-2922行，防抖1秒）
  - 生成解决方案后自动保存（隐含在 `watch` 中）
  
- **加载时机**：
  - 组件挂载时自动加载（`onMounted` 第2932行）
  - 切换阶段时自动加载（`watch(activeStage)` 第2925-2927行）

- **实现代码**：
```javascript
// 保存到服务器（第2817-2836行）
const saveAIDiagnosisToServer = async () => {
  const response = await saveAIDiagnosis(projectId, activeStage.value, aiIssues.value);
};

// 从服务器加载（第2838-2898行）
const loadAIDiagnosisFromServer = async () => {
  const response = await getAIDiagnosis(projectId, activeStage.value);
  aiIssues.value = validatedIssues;
  activeSubTab.value[activeStage.value] = 'ai-diagnosis';
};

// 监听变化自动保存（第2913-2922行）
let saveTimer = null;
watch(aiIssues, () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (aiIssues.value.length > 0) {
      saveAIDiagnosisToServer();
    }
  }, 1000); // 防抖 1 秒
}, { deep: true });

// 监听阶段切换（第2924-2927行）
watch(activeStage, () => {
  loadAIDiagnosisFromServer();
});
```

#### 分集检查 ⚠️
- **当前状态**：
  - ✅ 导入问题后保存（`handleImportEpisodeIssues` useEpisodeCheck.js 第117行）
  - ✅ 生成解决方案后保存（`handleSolutionImported` 第162行）
  - ✅ 应用修改后保存（`applyEpisodeSolution` 第234行）
  - ❌ **缺少监听变化自动保存**
  - ✅ 加载时机正确（`initEpisodeCheck` 第250行）

- **问题**：
  - 状态变化（如标记为已完成、忽略）后不会自动保存
  - 刷新页面会丢失状态变化

---

### 2. 查看方案对话框

#### 前期检查 ✅
- **触发按钮**（第406-408行）：
```vue
<el-button type="primary" size="small" @click="generateSolution(issue, false)">
  查看方案
</el-button>
```

- **对话框实现**（第640-701行）：
```vue
<el-dialog v-model="showSolution" title="解决方案" width="900px">
  <div v-if="currentSolution" class="solution-container">
    <!-- 问题标题 -->
    <el-alert :title="currentSolution.issue.title" 
              :description="currentSolution.issue.description" 
              type="warning" />

    <div class="solution-compare">
      <!-- 左侧：原文案 -->
      <div class="solution-section">
        <div class="section-header">
          <h4>📝 原文案</h4>
          <el-radio-group v-model="displayMode" @change="updateDisplayMode">
            <el-radio-button label="formatted">📄 格式化显示</el-radio-button>
            <el-radio-button label="json">🔧 JSON原始数据</el-radio-button>
          </el-radio-group>
        </div>
        <el-input v-model="currentSolution.originalContent" 
                  type="textarea" 
                  :rows="10" 
                  readonly
                  :class="{ 'json-mode': displayMode === 'json' }" />
      </div>

      <!-- 右侧：AI建议方案 -->
      <div class="solution-section">
        <div class="section-header">
          <h4>✨ AI建议方案</h4>
          <el-radio-group v-model="suggestionDisplayMode" @change="updateSuggestionDisplayMode">
            <el-radio-button label="formatted">📝 格式化显示</el-radio-button>
            <el-radio-button label="json">🔧 JSON原始数据</el-radio-button>
          </el-radio-group>
        </div>
        <el-input v-model="currentSolution.suggestedDisplayContent" 
                  type="textarea" 
                  :rows="10"
                  :class="{ 'json-mode': suggestionDisplayMode === 'json' }" />
      </div>
    </div>

    <!-- 修改说明 -->
    <div class="solution-explanation">
      <h4>💡 修改说明</h4>
      <p v-html="formatExplanation(currentSolution.explanation)"></p>
    </div>
  </div>

  <template #footer>
    <el-button @click="showSolution = false">取消</el-button>
    <el-button @click="copySolution">仅复制方案</el-button>
    <el-button type="primary" :loading="applying" @click="confirmApplySolution">
      替换原文案
    </el-button>
  </template>
</el-dialog>
```

- **显示模式切换**（第1725-1776行）：
```javascript
// 切换原文案显示模式
const updateDisplayMode = () => {
  if (displayMode.value === 'json') {
    currentSolution.value.originalContent = dataService.getFieldContent(
      currentSolution.value.issue.location, 
      { format: 'json' }
    );
  } else {
    currentSolution.value.originalContent = dataService.getFieldContent(
      currentSolution.value.issue.location, 
      { format: 'formatted' }
    );
  }
};

// 切换AI建议方案显示模式
const updateSuggestionDisplayMode = () => {
  if (suggestionDisplayMode.value === 'json') {
    currentSolution.value.suggestedDisplayContent = currentSolution.value.suggestedContent;
  } else {
    const module = currentSolution.value.issue.location.module;
    const parsed = AIService.parseModuleData(module, currentSolution.value.suggestedContent);
    currentSolution.value.suggestedDisplayContent = formatSuggestedContent(module, parsed);
  }
};
```

#### 分集检查 ❌
- **当前状态**：
  - 只有简单的预览区（第547-565行）
  - 不支持查看原文案
  - 不支持对比显示
  - 不支持JSON模式切换（已添加但未完整实现）

---

### 3. 严重程度显示

#### 前期检查 ✅
- **英文转中文映射**（第2736-2743行）：
```javascript
const getIssueSeverityText = (severity) => {
  const map = {
    'critical': '严重',
    'medium': '中等',
    'low': '轻微'
  };
  return map[severity] || '未知';
};
```

- **使用位置**（第376-378行）：
```vue
<el-tag :type="getIssueSeverityType(issue.severity)">
  {{ getIssueSeverityText(issue.severity) }}
</el-tag>
```

#### 分集检查 ❌
- **当前状态**：直接显示英文（第528行）
```vue
<el-tag>
  {{ issue.severity }}  <!-- 显示 "critical" 而非 "严重" -->
</el-tag>
```

---

### 4. 问题状态管理

#### 前期检查 ✅
- **支持的状态**：
  - `pending`：待处理
  - `ignored`：已忽略
  - `solved`：已解决
  - `completed`：已完成

- **状态操作**：
```javascript
// 忽略问题（第1529-1532行）
const ignoreIssue = (issue) => {
  issue.status = 'ignored';
  ElMessage.info('已忽略此问题');
};

// 恢复问题（第1535-1538行）
const restoreIssue = (issue) => {
  issue.status = 'pending';
  ElMessage.success('已恢复此问题');
};

// 标记为已完成（第1541-1544行）
const markAsCompleted = (issue) => {
  issue.status = 'completed';
  ElMessage.success('✅ 已标记为已完成');
};
```

- **UI展示**（第400-432行）：
```vue
<div class="ai-issue-actions">
  <!-- 已忽略状态 -->
  <template v-if="issue.status === 'ignored'">
    <el-button type="success" size="small" @click="restoreIssue(issue)">
      恢复问题
    </el-button>
  </template>
  
  <!-- 已完成状态 -->
  <template v-else-if="issue.status === 'solved' || issue.status === 'completed'">
    <el-button type="primary" size="small" @click="generateSolution(issue, false)">
      查看方案
    </el-button>
    <el-button size="small" @click="restoreIssue(issue)">
      恢复待处理
    </el-button>
  </template>
  
  <!-- 待处理状态 -->
  <template v-else>
    <el-button type="primary" size="small" @click="generateSolution(issue, false)">
      {{ issue.solution ? '查看方案' : '生成解决方案' }}
    </el-button>
    <el-button v-if="issue.solution" type="success" size="small" @click="markAsCompleted(issue)">
      ✅ 标记为已完成
    </el-button>
    <el-button size="small" @click="ignoreIssue(issue)">
      忽略此问题
    </el-button>
  </template>
</div>
```

#### 分集检查 ⚠️
- **当前状态**（第558-590行）：
  - ✅ 支持 `ignored` 状态
  - ✅ 支持 `solved` 状态
  - ❌ **不支持 `completed` 状态**
  - ❌ **缺少"恢复待处理"按钮**
  - ❌ **状态变化后不保存**

---

### 5. 自定义提示词模板

#### 前期检查 ✅
- **提示词生成位置**：`utils/diagnosisPrompts.js`
- **可编辑性**：支持通过对话框复制和修改提示词（第418-420行）

```vue
<el-button size="small" :icon="DocumentCopy" @click="showSolutionPrompt(issue)">
  复制提示词
</el-button>
```

- **提示词对话框**（第703-705行）：
```vue
<PromptDialog v-model="showPromptDialog" 
              :prompt="generatedPrompt" 
              :title="promptDialogTitle"
              :supports-paste="promptSupportsPaste" 
              :paste-mode="promptPasteMode" 
              @paste="handlePromptPaste" />
```

#### 分集检查 ❌
- **当前状态**：
  - 提示词固定在 `episodeCheckPrompts.js` 中
  - 不支持在UI中查看和编辑
  - 不支持保存自定义模板到服务器

---

### 6. UI风格一致性

#### 前期检查的卡片样式（第3358-3429行）

```scss
.ai-issue-item {
  padding: 20px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  
  &.ignored {
    opacity: 0.6;
    background: #f5f7fa;
  }
}

.ai-issue-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.ai-issue-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 8px 0;
}

.ai-issue-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
}

.ai-issue-location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.ai-issue-actions {
  display: flex;
  gap: 8px;
}
```

#### 分集检查的卡片样式（第3505-3560行）

```scss
.ai-issue-card {
  // 基本相同，但需要统一
}

.issue-header {
  // 与 ai-issue-header 类似但名称不同
}
```

**问题**：
- 类名不一致（`ai-issue-item` vs `ai-issue-card`）
- 部分样式细节不同
- 需要统一命名和风格

---

## 📊 功能缺失总结

| 功能项 | 前期检查 | 分集检查 | 优先级 |
|--------|---------|---------|--------|
| 数据持久化（监听变化） | ✅ | ❌ | 🔴 高 |
| 查看方案对话框 | ✅ | ❌ | 🔴 高 |
| 原文案对比显示 | ✅ | ❌ | 🔴 高 |
| JSON模式切换 | ✅ | ⚠️ 部分 | 🟡 中 |
| 严重程度中文显示 | ✅ | ❌ | 🟢 低 |
| 完整的状态管理 | ✅ | ⚠️ 部分 | 🟡 中 |
| 标记为已完成 | ✅ | ❌ | 🟡 中 |
| 恢复待处理 | ✅ | ⚠️ 部分 | 🟡 中 |
| 自定义提示词编辑 | ✅ | ❌ | 🟢 低 |
| 提示词保存到服务器 | ❌ | ❌ | 🟢 低 |
| UI风格统一 | ✅ | ⚠️ 部分 | 🟡 中 |

---

## 🎯 实施计划

### Phase 1: 核心功能补全（高优先级）

#### 1.1 数据持久化增强
- [ ] 在 `useEpisodeCheck.js` 中添加 `watch` 监听
- [ ] 实现防抖保存（1秒）
- [ ] 确保所有状态变化都能自动保存

#### 1.2 查看方案对话框
- [ ] 复用前期检查的对话框组件
- [ ] 获取原文案内容（从episode.content中提取）
- [ ] 支持原文案和建议方案的格式化/JSON切换
- [ ] 添加"应用修改"按钮

#### 1.3 严重程度中文化
- [ ] 在 `ScriptAnalysis.vue` 中添加映射函数
- [ ] 修改模板使用中文显示

### Phase 2: 状态管理完善（中优先级）

#### 2.1 状态操作补全
- [ ] 添加 `markAsCompleted` 方法
- [ ] 完善 `restoreIssue` 方法
- [ ] 确保状态图标和标签正确显示

#### 2.2 UI一致性
- [ ] 统一类名（使用 `ai-issue-*` 前缀）
- [ ] 统一卡片样式
- [ ] 统一按钮布局和间距

### Phase 3: 高级功能（低优先级）

#### 3.1 自定义提示词
- [ ] 创建提示词编辑对话框
- [ ] 支持保存自定义模板
- [ ] 后端API支持

#### 3.2 模板管理
- [ ] 支持多个模板预设
- [ ] 模板版本管理
- [ ] 导入导出功能

---

## 💡 技术要点

### 1. 获取分集原文案

**前期检查**使用 `DataService.getFieldContent()`：
```javascript
dataService.getFieldContent(issue.location, { format: 'formatted' })
```

**分集检查**需要特殊处理：
```javascript
// 获取整个episode对象
const episode = project.value.episodes.find(
  ep => ep.number === issue.location.episodeNumber
);

// 根据需要格式化
const originalContent = {
  title: episode.title,
  status: episode.status,
  content: episode.content,
  wordCount: episode.wordCount
};
```

### 2. 监听变化保存

**模式**：
```javascript
// 在 useEpisodeCheck.js 中添加
import { watch } from 'vue';

let saveTimer = null;
watch(() => episodeCheckState.value.issues, () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (episodeCheckState.value.issues.length > 0) {
      saveAIDiagnosis(project.value._id, 'episodes', episodeCheckState.value.issues);
    }
  }, 1000);
}, { deep: true });
```

### 3. 解决方案对话框数据结构

```javascript
currentSolution.value = {
  issue: issue,                    // 问题对象
  originalContent: '',             // 原文案（格式化）
  originalContentJSON: '',         // 原文案（JSON）
  suggestedContent: '',            // AI建议（原始）
  suggestedDisplayContent: '',     // AI建议（当前显示）
  explanation: ''                  // 说明
};
```

---

## 🔄 迁移策略

1. **不要重复造轮子**：尽可能复用前期检查的代码
2. **保持一致性**：函数命名、变量命名与前期检查对齐
3. **渐进增强**：先实现核心功能，再优化细节
4. **向后兼容**：确保旧数据能正确加载

---

**文档版本**：v1.0  
**创建日期**：2025-01-16  
**状态**：✅ 分析完成
