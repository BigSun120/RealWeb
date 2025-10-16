# ScriptAnalysis.vue 最终集成指南

## 📝 概述

已完成的文件：
1. ✅ `episodeCheckPrompts.js` - 提示词生成工具
2. ✅ `ExternalAIWorkflowDialog.vue` - 外部AI工作流组件
3. ✅ `useEpisodeCheck.js` - 分集检查 Composable（新创建）

现在只需要在 `ScriptAnalysis.vue` 中进行简单的集成即可。

---

## 🔧 集成步骤

### Step 1: 导入useEpisodeCheck Composable

**位置**：在 `<script setup>` 中，已有的import区域之后

**代码**（在第597行之后添加）：
```javascript
import { useEpisodeCheck } from '../composables/useEpisodeCheck';
```

---

### Step 2: 删除之前添加的临时episodeCheckState代码

**位置**：第646-679行（之前我们添加的临时代码）

**操作**：删除以下代码块：
```javascript
// ========================================
// 🎬 分集检查状态管理
// ========================================
const episodeCheckState = ref({
  selectedEpisode: null,
  issues: [],
  loading: false,
  externalWorkflowVisible: false
});

// 计算可检查的剧集列表
const availableEpisodes = computed(() => {
  ...
});

// 按集数分组的问题
const issuesByEpisode = computed(() => {
  ...
});
```

**替换为**：
```javascript
// ========================================
// 🎬 分集检查功能（使用Composable）
// ========================================
const {
  episodeCheckState,
  availableEpisodes,
  issuesByEpisode,
  loadEpisodesIssues,
  openExternalAIWorkflow,
  handleImportEpisodeIssues,
  generateEpisodeSolution,
  applyEpisodeSolution,
  initEpisodeCheck
} = useEpisodeCheck(computed(() => props.project), emit);
```

---

### Step 3: 修改handleStageChange方法

**位置**：第700行左右

**原代码**：
```javascript
const handleStageChange = (stage) => {
  console.log('切换到阶段:', stage);
  // 注意：不清空结果，保留用户之前的分析结果
  // 如果需要重新分析，用户可以手动点击"快速检查"按钮
};
```

**修改为**：
```javascript
const handleStageChange = (stage) => {
  console.log('切换到阶段:', stage);
  
  // 切换到episodes阶段时，初始化分集检查
  if (stage === 'episodes') {
    initEpisodeCheck();
  }
};
```

---

### Step 4: 添加onMounted和watch初始化逻辑

**位置**：在文件末尾，最后一个方法之后

**代码**：
```javascript
// ========================================
// 🎬 生命周期钩子
// ========================================
onMounted(() => {
  // 如果当前阶段是episodes，加载数据
  if (activeStage.value === 'episodes') {
    initEpisodeCheck();
  }
});

// 监听project变化，重新加载问题
watch(() => props.project, (newProject) => {
  if (newProject && activeStage.value === 'episodes') {
    loadEpisodesIssues();
  }
}, { deep: true });
```

---

### Step 5: 替换episodes空实现模板

**位置**：第446-448行

**原代码**：
```vue
<!-- 分集检查内容 -->
<div v-else-if="activeStage === 'episodes'" class="stage-content">
  <el-empty description="分集检查功能开发中..." :image-size="120" />
</div>
```

**替换为**：
```vue
<!-- 分集检查内容 -->
<div v-else-if="activeStage === 'episodes'" class="stage-content">
  <!-- 顶部工具栏 -->
  <div class="action-bar">
    <!-- 剧集选择器 -->
    <el-select
      v-model="episodeCheckState.selectedEpisode"
      placeholder="选择要检查的剧集"
      style="width: 250px"
      :disabled="episodeCheckState.loading"
    >
      <el-option
        v-for="episode in availableEpisodes"
        :key="episode.number"
        :label="`第${episode.number}集${episode.title ? '：' + episode.title : ''}`"
        :value="episode.number"
      >
        <span>第{{ episode.number }}集</span>
        <span v-if="episode.title" style="color: var(--el-text-color-secondary); margin-left: 8px">
          {{ episode.title }}
        </span>
      </el-option>
    </el-select>

    <!-- 启动诊断按钮 -->
    <el-button
      type="primary"
      :icon="MagicStick"
      :disabled="!episodeCheckState.selectedEpisode"
      @click="openExternalAIWorkflow"
    >
      启动分集诊断
    </el-button>

    <div style="flex: 1"></div>

    <el-alert
      type="info"
      :closable="false"
      style="flex: 1; max-width: 500px"
    >
      <template #title>
        <span style="font-size: 13px">
          共 {{ availableEpisodes.length }} 个已完成剧集可检查
        </span>
      </template>
    </el-alert>
  </div>

  <!-- 空状态提示 -->
  <el-empty
    v-if="availableEpisodes.length === 0"
    description="暂无可检查的剧集"
    :image-size="120"
  >
    <template #description>
      <p>只有状态为"已完成"或"已审核"的剧集才能进行诊断</p>
      <p style="margin-top: 8px; color: var(--el-text-color-secondary)">
        请先在【剧集管理】中完成剧集创作并标记为已完成
      </p>
    </template>
  </el-empty>

  <!-- 问题列表（按集数分组） -->
  <el-card v-else-if="Object.keys(issuesByEpisode).length > 0" class="sub-tabs-card" shadow="never">
    <el-tabs type="border-card">
      <el-tab-pane
        v-for="(issues, episodeNum) in issuesByEpisode"
        :key="episodeNum"
        :label="`第${episodeNum}集（${issues.length}）`"
      >
        <div class="episode-issues-container">
          <!-- 问题卡片列表 -->
          <div
            v-for="(issue, index) in issues"
            :key="index"
            class="ai-issue-card"
          >
            <div class="issue-header">
              <el-tag
                :type="issue.severity === 'critical' ? 'danger' : issue.severity === 'medium' ? 'warning' : 'info'"
                size="large"
              >
                {{ issue.severity }}
              </el-tag>
              <h4>{{ issue.title }}</h4>
              <el-tag v-if="issue.status === 'solved'" type="success" size="small">
                ✅ 已解决
              </el-tag>
              <el-tag v-else-if="issue.status === 'ignored'" type="info" size="small">
                已忽略
              </el-tag>
            </div>

            <p class="issue-description">{{ issue.description }}</p>

            <div class="issue-location">
              <el-icon><Location /></el-icon>
              <span>位置：{{ issue.location.field }}</span>
            </div>

            <!-- 解决方案区域 -->
            <div v-if="issue.solution" class="solution-preview">
              <h5>💡 AI建议的解决方案</h5>
              <div class="solution-content">
                <p><strong>修改内容：</strong></p>
                <pre>{{ issue.solution.suggestedContent }}</pre>
                <p style="margin-top: 12px"><strong>说明：</strong></p>
                <p>{{ issue.solution.explanation }}</p>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="ai-issue-actions">
              <template v-if="issue.status === 'ignored'">
                <el-button type="success" size="small" @click="issue.status = 'pending'">
                  恢复问题
                </el-button>
              </template>
              <template v-else-if="issue.status === 'solved'">
                <el-button type="primary" size="small" @click="issue.status = 'pending'">
                  恢复待处理
                </el-button>
              </template>
              <template v-else>
                <el-button
                  type="primary"
                  size="small"
                  :loading="issue.generating"
                  @click="generateEpisodeSolution(issue)"
                >
                  {{ issue.generating ? '生成中...' : (issue.solution ? '重新生成' : '生成解决方案') }}
                </el-button>
                <el-button
                  v-if="issue.solution"
                  type="success"
                  size="small"
                  @click="applyEpisodeSolution(issue)"
                >
                  应用修改
                </el-button>
                <el-button size="small" @click="issue.status = 'ignored'">
                  忽略此问题
                </el-button>
              </template>
            </div>

            <el-divider v-if="index < issues.length - 1" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>

  <!-- 未诊断状态 -->
  <el-empty
    v-else
    description="暂无诊断结果"
    :image-size="120"
  >
    <template #description>
      <p>选择一个已完成的剧集，然后点击"启动分集诊断"开始检查</p>
    </template>
    <el-button
      type="primary"
      :disabled="!episodeCheckState.selectedEpisode"
      @click="openExternalAIWorkflow"
    >
      立即开始诊断
    </el-button>
  </el-empty>

  <!-- 外部AI工作流对话框 -->
  <ExternalAIWorkflowDialog
    v-model:visible="episodeCheckState.externalWorkflowVisible"
    :project="project"
    :episode-number="episodeCheckState.selectedEpisode"
    @issues-imported="handleImportEpisodeIssues"
  />
</div>
```

---

### Step 6: 添加必要的样式（可选）

**位置**：在 `<style scoped>` 区域末尾

```scss
// ========================================
// 🎬 分集检查样式
// ========================================
.episode-issues-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.solution-preview {
  background: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 12px;
  margin-top: 12px;

  h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--el-color-success);
  }

  .solution-content {
    pre {
      background: white;
      border: 1px solid var(--el-border-color);
      border-radius: 4px;
      padding: 12px;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.5;
      margin: 8px 0;
    }
  }
}
```

---

## ✅ 集成检查清单

完成以上步骤后，请确认：

- [ ] `useEpisodeCheck` Composable 已正确导入
- [ ] 临时的episodeCheckState代码已删除并替换为useEpisodeCheck
- [ ] handleStageChange 已添加initEpisodeCheck()调用
- [ ] onMounted 和 watch 已添加
- [ ] episodes 模板已替换为完整实现
- [ ] 样式已添加（可选）

---

## 🎯 功能完整性

完成集成后，分集检查功能将具备：

✅ **基础功能**
- 剧集筛选（只显示completed/reviewed状态）
- 剧集选择器
- 启动诊断按钮

✅ **外部AI工作流**
- 三步向导界面
- 提示词生成和复制
- 完整包下载
- JSON解析和验证

✅ **问题管理**
- 按集数分组显示
- 问题状态管理（pending/solved/ignored）
- 生成AI解决方案
- 应用修改到剧集
- 数据持久化

✅ **用户体验**
- Loading状态
- 错误处理
- 空状态提示
- 响应式计算属性

---

## 🧪 测试建议

1. **基础功能测试**
   - 切换到episodes Tab查看是否正常加载
   - 验证剧集筛选逻辑（只显示completed/reviewed）
   - 测试剧集选择器

2. **诊断流程测试**
   - 点击"启动分集诊断"打开对话框
   - 复制提示词
   - 下载完整包
   - 模拟AI返回并导入

3. **问题处理测试**
   - 生成解决方案
   - 应用修改
   - 问题状态切换（忽略/恢复）

4. **数据持久化测试**
   - 刷新页面验证数据恢复
   - 切换Tab验证数据保留

---

## 📊 预期效果截图描述

**episodes Tab界面**：
```
┌─────────────────────────────────────────────────────────────┐
│  [选择剧集 ▼] [🔮 启动分集诊断]     共 5 个已完成剧集可检查  │
├─────────────────────────────────────────────────────────────┤
│  ┌─ 第1集（3） ┬─ 第2集（2） ┬─ 第3集（1） ─┐              │
│  │                                                          │
│  │  🔴 critical   人物性格前后矛盾          ✅ 已解决      │
│  │  详细描述...                                            │
│  │  📍 位置：第1集                                         │
│  │  [生成解决方案] [应用修改] [忽略]                      │
│  │  ─────────────────────────────────────                 │
│  │  ⚠️ medium     情节节奏过快                            │
│  │  ...                                                    │
│  └──────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

---

**文档版本**：v1.0  
**创建日期**：2025-01-16  
**状态**：✅ 准备就绪
