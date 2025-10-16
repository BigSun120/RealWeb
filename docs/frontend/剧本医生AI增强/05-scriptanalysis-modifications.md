# ScriptAnalysis.vue 分集检查功能扩展指南

## 📝 修改概述

需要在 `ScriptAnalysis.vue` 中添加分集检查（episodes）相关的功能，包括：
1. 添加 'episodes' 阶段选项
2. 创建剧集选择器
3. 集成 ExternalAIWorkflowDialog 组件
4. 实现分集检查状态管理和数据流
5. 问题列表按集数分组显示

---

## 🔧 具体修改步骤

### Step 1: 导入新组件和工具函数

**位置**：`<script setup>` 顶部的 import 区域

```javascript
// 添加到现有 import 之后
import ExternalAIWorkflowDialog from './ExternalAIWorkflowDialog.vue';
import { generateEpisodeSolutionPrompt } from '../utils/episodeCheckPrompts';
```

---

### Step 2: 扩展 activeStage 选项

**位置**：查找 `const activeStage = ref('preparation')` 附近

**原代码**（约第610行）：
```javascript
const activeStage = ref('preparation'); // 默认显示前期检查
```

**修改后**：
```javascript
const activeStage = ref('preparation'); // 可选：'preparation' | 'episodes' | 'overall'
```

---

### Step 3: 添加分集检查状态管理

**位置**：在 `activeStage` 定义之后，添加新的响应式状态

```javascript
// ========================================
// 🎬 分集检查状态管理
// ========================================
const episodeCheckState = reactive({
  selectedEpisode: null,        // 当前选择的剧集编号
  issues: [],                   // 分集检查问题列表
  loading: false,               // 加载状态
  externalWorkflowVisible: false // 外部AI工作流对话框显示状态
});

// 计算可检查的剧集列表（只显示completed/reviewed状态）
const availableEpisodes = computed(() => {
  if (!props.project || !props.project.episodes) return [];
  
  return props.project.episodes
    .filter(ep => ep.status === 'completed' || ep.status === 'reviewed')
    .sort((a, b) => a.number - b.number);
});

// 按集数分组的问题
const issuesByEpisode = computed(() => {
  const grouped = {};
  
  episodeCheckState.issues.forEach(issue => {
    const episodeNum = issue.location?.episodeNumber || 0;
    if (!grouped[episodeNum]) {
      grouped[episodeNum] = [];
    }
    grouped[episodeNum].push(issue);
  });
  
  return grouped;
});
```

---

### Step 4: 添加加载分集问题的方法

**位置**：在 methods 区域添加

```javascript
// ========================================
// 🎬 分集检查相关方法
// ========================================

/**
 * 加载已保存的分集检查问题
 */
const loadEpisodesIssues = async () => {
  if (!props.project?._id) return;
  
  try {
    episodeCheckState.loading = true;
    
    const data = await getAIDiagnosis(props.project._id, 'episodes');
    
    if (data.issues && Array.isArray(data.issues)) {
      episodeCheckState.issues = data.issues.map(issue => ({
        ...issue,
        // 确保每个issue都有episodeNumber字段
        location: {
          ...issue.location,
          episodeNumber: issue.location.episodeNumber || 
            parseInt((issue.location.field || '').match(/\d+/)?.[0] || 0)
        }
      }));
      
      console.log(`✅ 已加载 ${episodeCheckState.issues.length} 个分集检查问题`);
    }
  } catch (error) {
    console.error('加载分集问题失败:', error);
    ElMessage.error('加载分集问题失败');
  } finally {
    episodeCheckState.loading = false;
  }
};

/**
 * 打开外部AI工作流对话框
 */
const openExternalAIWorkflow = () => {
  if (!episodeCheckState.selectedEpisode) {
    ElMessage.warning('请先选择要检查的剧集');
    return;
  }
  
  episodeCheckState.externalWorkflowVisible = true;
};

/**
 * 处理导入的分集问题
 */
const handleImportEpisodeIssues = async (importedIssues) => {
  try {
    // 合并新导入的问题到现有问题列表
    // 如果是同一集的诊断，替换该集的问题；否则追加
    const newIssueEpisodes = new Set(
      importedIssues.map(issue => issue.location.episodeNumber)
    );
    
    // 过滤掉被替换集数的旧问题
    const filteredOldIssues = episodeCheckState.issues.filter(
      issue => !newIssueEpisodes.has(issue.location.episodeNumber)
    );
    
    // 合并问题列表
    const mergedIssues = [...filteredOldIssues, ...importedIssues];
    
    // 保存到后端
    await saveAIDiagnosis(props.project._id, 'episodes', mergedIssues);
    
    // 更新本地状态
    episodeCheckState.issues = mergedIssues;
    
    ElMessage.success(`成功导入 ${importedIssues.length} 个问题`);
    
    // 刷新父组件项目数据
    emit('project-updated');
  } catch (error) {
    console.error('保存分集问题失败:', error);
    ElMessage.error('保存失败：' + error.message);
  }
};

/**
 * 生成分集问题的解决方案（复用现有AI生成逻辑）
 */
const generateEpisodeSolution = async (issue) => {
  // 验证issue状态
  if (issue.generating) {
    ElMessage.warning('正在生成中，请稍候');
    return;
  }

  // 标记为生成中
  issue.generating = true;
  issue.status = 'generating';

  try {
    // 生成分集解决方案提示词
    const prompt = generateEpisodeSolutionPrompt(issue, props.project);

    // 调用AI API
    const response = await generateAIContent(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 60000
      }
    );

    if (response.code === 200 && response.data?.content) {
      // 解析返回的solution JSON
      let solution = null;
      
      try {
        // 尝试直接解析
        solution = JSON.parse(response.data.content);
      } catch {
        // 尝试从代码块提取
        const match = response.data.content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (match) {
          solution = JSON.parse(match[1].trim());
        } else {
          throw new Error('无法解析AI返回的solution');
        }
      }

      // 更新issue
      issue.solution = {
        suggestedContent: solution.suggestedContent || '',
        explanation: solution.explanation || '',
        generatedAt: new Date()
      };
      issue.status = 'solution_ready';

      // 保存到后端
      await saveAIDiagnosis(props.project._id, 'episodes', episodeCheckState.issues);

      ElMessage.success('解决方案生成成功');
    } else {
      throw new Error(response.message || 'AI生成失败');
    }
  } catch (error) {
    console.error('生成解决方案失败:', error);
    ElMessage.error('生成失败：' + error.message);
    issue.status = 'pending';
  } finally {
    issue.generating = false;
  }
};

/**
 * 应用分集问题的解决方案
 */
const applyEpisodeSolution = async (issue) => {
  if (!issue.solution?.suggestedContent) {
    ElMessage.warning('没有可应用的解决方案');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认将AI生成的解决方案应用到"${issue.location.field}"吗？此操作将覆盖现有内容。`,
      '确认应用',
      {
        confirmButtonText: '应用',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 使用 UpdateStrategyFactory 应用修改
    const episodeNumber = issue.location.episodeNumber;
    const message = await UpdateStrategyFactory.apply(
      props.project,
      'episodes',
      issue.location.field,
      issue.solution.suggestedContent,
      null,
      episodeNumber
    );

    // 标记问题为已解决
    issue.status = 'solved';
    await saveAIDiagnosis(props.project._id, 'episodes', episodeCheckState.issues);

    ElMessage.success(message || '修改已应用');
    emit('project-updated');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('应用解决方案失败:', error);
      ElMessage.error('应用失败：' + error.message);
    }
  }
};
```

---

### Step 5: 在阶段切换时加载数据

**位置**：查找 `handleStageChange` 方法（约第698行）

**修改后**：
```javascript
const handleStageChange = (stage) => {
  console.log('切换到阶段:', stage);
  
  // 切换到episodes阶段时，加载分集问题
  if (stage === 'episodes') {
    loadEpisodesIssues();
    
    // 默认选择第一个可用剧集
    if (!episodeCheckState.selectedEpisode && availableEpisodes.value.length > 0) {
      episodeCheckState.selectedEpisode = availableEpisodes.value[0].number;
    }
  }
};
```

---

### Step 6: 添加组件初始化逻辑

**位置**：在 `onMounted` 钩子中添加

```javascript
onMounted(() => {
  // 现有初始化逻辑...
  
  // 如果当前阶段是episodes，加载数据
  if (activeStage.value === 'episodes') {
    loadEpisodesIssues();
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

### Step 7: 扩展模板 - 添加episodes阶段Tab

**位置**：在 `<el-tabs>` 中添加新的 `<el-tab-pane>`

**查找**：
```vue
<el-tabs v-model="activeStage" @tab-change="handleStageChange">
  <el-tab-pane label="前期检查" name="preparation">
    <!-- 现有内容 -->
  </el-tab-pane>
  
  <!-- ⭐ 在这里添加新的Tab -->
</el-tabs>
```

**添加**：
```vue
<el-tab-pane label="分集检查" name="episodes">
  <div class="stage-container">
    <!-- 顶部工具栏 -->
    <div class="stage-header">
      <div class="header-left">
        <h3>📺 分集检查</h3>
        <p class="header-desc">对已完成的剧集进行逐集质量诊断</p>
      </div>
      <div class="header-right">
        <!-- 剧集选择器 -->
        <el-select
          v-model="episodeCheckState.selectedEpisode"
          placeholder="选择要检查的剧集"
          style="width: 200px"
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
          :icon="VideoCameraFilled"
          :disabled="!episodeCheckState.selectedEpisode"
          @click="openExternalAIWorkflow"
        >
          启动分集诊断
        </el-button>
      </div>
    </div>

    <!-- 空状态提示 -->
    <el-empty
      v-if="availableEpisodes.length === 0"
      description="暂无可检查的剧集"
    >
      <template #description>
        <p>只有状态为"已完成"或"已审核"的剧集才能进行诊断</p>
        <p class="mt-2">请先在【剧集管理】中完成剧集创作并标记为已完成</p>
      </template>
    </el-empty>

    <!-- 问题列表（按集数分组） -->
    <div v-else-if="episodeCheckState.issues.length > 0" class="issues-section">
      <el-tabs type="border-card">
        <el-tab-pane
          v-for="(issues, episodeNum) in issuesByEpisode"
          :key="episodeNum"
          :label="`第${episodeNum}集（${issues.length}）`"
        >
          <div class="episode-issues-container">
            <!-- 复用现有的问题卡片组件 -->
            <div
              v-for="(issue, index) in issues"
              :key="index"
              class="issue-card"
            >
              <div class="issue-header">
                <el-tag
                  :type="issue.severity === 'critical' ? 'danger' : issue.severity === 'medium' ? 'warning' : 'info'"
                  size="large"
                >
                  {{ issue.severity }}
                </el-tag>
                <h4 class="issue-title">{{ issue.title }}</h4>
                <div class="issue-actions">
                  <el-button
                    v-if="!issue.solution"
                    type="primary"
                    size="small"
                    :loading="issue.generating"
                    @click="generateEpisodeSolution(issue)"
                  >
                    生成解决方案
                  </el-button>
                  <el-button
                    v-if="issue.solution"
                    type="success"
                    size="small"
                    @click="applyEpisodeSolution(issue)"
                  >
                    应用修改
                  </el-button>
                  <el-dropdown trigger="click">
                    <el-button size="small" :icon="More" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="issue.status = 'ignored'">
                          忽略此问题
                        </el-dropdown-item>
                        <el-dropdown-item @click="issue.status = 'solved'">
                          标记为已解决
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>

              <div class="issue-body">
                <p class="issue-description">{{ issue.description }}</p>
                
                <!-- 解决方案区域 -->
                <div v-if="issue.solution" class="solution-section">
                  <h5>💡 AI建议的解决方案</h5>
                  <div class="solution-content">
                    <p><strong>修改内容：</strong></p>
                    <pre>{{ issue.solution.suggestedContent }}</pre>
                    <p class="mt-2"><strong>说明：</strong></p>
                    <p>{{ issue.solution.explanation }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

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
</el-tab-pane>
```

---

### Step 8: 添加必要的Icon导入

**位置**：`<script setup>` 中的 Icons 导入区域

```javascript
import {
  // 现有icons...
  VideoCameraFilled, // ⭐ 新增
  More              // ⭐ 新增（如果没有的话）
} from '@element-plus/icons-vue';
```

---

### Step 9: 添加样式（可选）

**位置**：`<style scoped>` 区域末尾

```scss
// ========================================
// 🎬 分集检查样式
// ========================================
.episode-issues-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.issue-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--el-bg-color);
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
}

.issue-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .issue-title {
    flex: 1;
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  .issue-actions {
    display: flex;
    gap: 8px;
  }
}

.issue-body {
  .issue-description {
    color: var(--el-text-color-regular);
    line-height: 1.6;
    margin-bottom: 16px;
  }
}

.solution-section {
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
    }
  }
}

.header-desc {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
```

---

## ✅ 修改检查清单

完成以上修改后，请确认：

- [ ] ExternalAIWorkflowDialog 组件已正确导入
- [ ] episodeCheckState 响应式状态已添加
- [ ] availableEpisodes 和 issuesByEpisode 计算属性已添加
- [ ] loadEpisodesIssues、handleImportEpisodeIssues 等方法已添加
- [ ] handleStageChange 已扩展支持 episodes 阶段
- [ ] onMounted 和 watch 已添加初始化逻辑
- [ ] 模板中已添加 episodes Tab 和相关UI
- [ ] VideoCameraFilled、More 等Icon已导入
- [ ] 样式已添加（可选）

---

## 🧪 测试要点

1. **剧集筛选**：只显示 completed/reviewed 状态的剧集
2. **提示词生成**：点击"启动分集诊断"能正确打开对话框并生成提示词
3. **完整包下载**：下载的文件包含完整的上下文信息
4. **JSON解析**：能正确解析AI返回的各种格式（纯JSON、代码块、带文本）
5. **问题验证**：自动过滤格式错误的问题
6. **问题分组**：按集数正确分组显示
7. **解决方案生成**：能调用AI生成解决方案
8. **应用修改**：能正确调用 UpdateStrategyFactory 更新剧集内容
9. **数据持久化**：刷新页面后问题列表能正确加载
10. **状态同步**：问题状态变更后能正确保存到后端

---

## 📊 预期效果

完成修改后，用户可以：
1. 在【分集检查】Tab中看到所有已完成的剧集列表
2. 选择一个剧集，点击"启动分集诊断"
3. 在三步向导中复制提示词、下载完整包
4. 到外部AI平台（Claude/GPT）执行诊断
5. 导入AI返回的JSON问题列表
6. 系统自动解析、验证并保存问题
7. 问题按集数分组显示
8. 可以生成AI解决方案并一键应用
9. 刷新页面后所有数据正确恢复

---

**文档版本**：v1.0  
**创建日期**：2025-01-16  
**状态**：✅ 待实施
