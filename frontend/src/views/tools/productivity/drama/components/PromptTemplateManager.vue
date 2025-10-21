<template>
  <el-dialog
    v-model="dialogVisible"
    title="自定义提示词模板"
    width="1000px"
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab">
      <!-- 分集检查模板 -->
      <el-tab-pane label="分集检查提示词" name="episodeCheck">
        <el-alert type="info" :closable="false" class="mb-4">
          <template #default>
            <p><strong>可用变量</strong>：</p>
            <ul class="variable-list">
              <li><code>{{projectName}}</code> - 项目名称</li>
              <li><code>{{projectType}}</code> - 剧本类型</li>
              <li><code>{{episodeCount}}</code> - 总集数</li>
              <li><code>{{episodeNumber}}</code> - 当前检查的集数</li>
              <li><code>{{worldview}}</code> - 世界观设定（自动格式化）</li>
              <li><code>{{characters}}</code> - 角色列表（自动格式化）</li>
              <li><code>{{outline}}</code> - 剧情大纲（自动格式化）</li>
              <li><code>{{completedEpisodes}}</code> - 已完成剧集摘要（自动格式化）</li>
              <li><code>{{episodeContent}}</code> - 待检查剧集内容（自动格式化）</li>
            </ul>
          </template>
        </el-alert>

        <div class="template-editor">
          <div class="editor-header">
            <span>编辑模板</span>
            <div class="header-actions">
              <el-button size="small" @click="resetEpisodeCheckTemplate">恢复默认</el-button>
              <el-button size="small" type="primary" @click="saveEpisodeCheckTemplate">保存模板</el-button>
            </div>
          </div>
          
          <el-input
            v-model="episodeCheckTemplate"
            type="textarea"
            :rows="20"
            placeholder="输入提示词模板..."
            class="template-textarea"
          />
        </div>
      </el-tab-pane>

      <!-- 解决方案生成模板 -->
      <el-tab-pane label="解决方案提示词" name="solutionGeneration">
        <el-alert type="info" :closable="false" class="mb-4">
          <template #default>
            <p><strong>可用变量</strong>：</p>
            <ul class="variable-list">
              <li><code>{{episodeNumber}}</code> - 集数</li>
              <li><code>{{severity}}</code> - 问题严重程度</li>
              <li><code>{{issueTitle}}</code> - 问题标题</li>
              <li><code>{{issueDescription}}</code> - 问题详细描述</li>
              <li><code>{{originalContentJSON}}</code> - 原始episode.content的JSON格式</li>
            </ul>
          </template>
        </el-alert>

        <div class="template-editor">
          <div class="editor-header">
            <span>编辑模板</span>
            <div class="header-actions">
              <el-button size="small" @click="resetSolutionTemplate">恢复默认</el-button>
              <el-button size="small" type="primary" @click="saveSolutionTemplate">保存模板</el-button>
            </div>
          </div>

          <el-input
            v-model="solutionTemplate"
            type="textarea"
            :rows="20"
            placeholder="输入提示词模板..."
            class="template-textarea"
          />
        </div>
      </el-tab-pane>

      <!-- 整体检查模板 -->
      <el-tab-pane label="整体检查提示词" name="overallCheck">
        <el-alert type="info" :closable="false" class="mb-4">
          <template #default>
            <p><strong>可用变量</strong>：</p>
            <ul class="variable-list">
              <li><code>{{projectName}}</code> - 项目名称</li>
              <li><code>{{projectType}}</code> - 剧本类型</li>
              <li><code>{{totalEpisodes}}</code> - 总集数</li>
              <li><code>{{startEpisode}}</code> - 检查起始集数</li>
              <li><code>{{endEpisode}}</code> - 检查结束集数</li>
              <li><code>{{completedCount}}</code> - 已完成集数</li>
              <li><code>{{completionRate}}</code> - 完成度百分比</li>
              <li><code>{{coreConflict}}</code> - 核心冲突</li>
              <li><code>{{mainCharacters}}</code> - 主要角色</li>
            </ul>
          </template>
        </el-alert>

        <div class="template-editor">
          <div class="editor-header">
            <span>编辑模板</span>
            <div class="header-actions">
              <el-button size="small" @click="resetOverallCheckTemplate">恢复默认</el-button>
              <el-button size="small" type="primary" @click="saveOverallCheckTemplate">保存模板</el-button>
            </div>
          </div>

          <el-input
            v-model="overallCheckTemplate"
            type="textarea"
            :rows="20"
            placeholder="输入提示词模板..."
            class="template-textarea"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getDefaultEpisodeCheckTemplate,
  getDefaultSolutionTemplate
} from '../utils/episodeCheckTemplates';
import { getDefaultOverallCheckTemplate } from '../utils/overallCheckTemplates';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:visible', 'templates-updated']);

// 响应式状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const activeTab = ref('episodeCheck');
const episodeCheckTemplate = ref('');
const solutionTemplate = ref('');
const overallCheckTemplate = ref('');

// 从localStorage加载模板
const loadTemplates = () => {
  const savedEpisodeCheck = localStorage.getItem('drama_prompt_template_episodeCheck');
  const savedSolution = localStorage.getItem('drama_prompt_template_solution');
  const savedOverallCheck = localStorage.getItem('drama_prompt_template_overallCheck');

  episodeCheckTemplate.value = savedEpisodeCheck || getDefaultEpisodeCheckTemplate();
  solutionTemplate.value = savedSolution || getDefaultSolutionTemplate();
  overallCheckTemplate.value = savedOverallCheck || getDefaultOverallCheckTemplate();
};

// 初始化
watch(() => props.visible, (visible) => {
  if (visible) {
    loadTemplates();
  }
}, { immediate: true });

// 保存分集检查模板
const saveEpisodeCheckTemplate = () => {
  try {
    localStorage.setItem('drama_prompt_template_episodeCheck', episodeCheckTemplate.value);
    ElMessage.success('分集检查模板已保存');
    emit('templates-updated');
  } catch (error) {
    console.error('保存模板失败:', error);
    ElMessage.error('保存失败：' + error.message);
  }
};

// 保存解决方案模板
const saveSolutionTemplate = () => {
  try {
    localStorage.setItem('drama_prompt_template_solution', solutionTemplate.value);
    ElMessage.success('解决方案模板已保存');
    emit('templates-updated');
  } catch (error) {
    console.error('保存模板失败:', error);
    ElMessage.error('保存失败：' + error.message);
  }
};

// 保存整体检查模板
const saveOverallCheckTemplate = () => {
  try {
    localStorage.setItem('drama_prompt_template_overallCheck', overallCheckTemplate.value);
    ElMessage.success('整体检查模板已保存');
    emit('templates-updated');
  } catch (error) {
    console.error('保存模板失败:', error);
    ElMessage.error('保存失败：' + error.message);
  }
};

// 恢复默认模板
const resetEpisodeCheckTemplate = () => {
  episodeCheckTemplate.value = getDefaultEpisodeCheckTemplate();
  ElMessage.info('已恢复为默认模板');
};

const resetSolutionTemplate = () => {
  solutionTemplate.value = getDefaultSolutionTemplate();
  ElMessage.info('已恢复为默认模板');
};

const resetOverallCheckTemplate = () => {
  overallCheckTemplate.value = getDefaultOverallCheckTemplate();
  ElMessage.info('已恢复为默认模板');
};

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false;
};
</script>

<style scoped lang="scss">
.variable-list {
  margin: 8px 0;
  padding-left: 24px;
  line-height: 1.8;
  
  li {
    margin-bottom: 4px;
    
    code {
      background: #f5f7fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      color: #409eff;
    }
  }
}

.template-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  
  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color);
    
    span {
      font-weight: 500;
      font-size: 14px;
    }
    
    .header-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .template-textarea {
    :deep(.el-textarea__inner) {
      border: none;
      border-radius: 0;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
  }
}
</style>
