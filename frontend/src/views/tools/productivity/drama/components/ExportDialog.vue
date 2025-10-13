<template>
  <el-dialog
    v-model="visible"
    :title="`导出项目：${projectName}`"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="checking" class="export-dialog-content">
      <!-- 项目完成情况 -->
      <div v-if="completeness" class="section">
        <div class="section-title">
          <el-icon><DataAnalysis /></el-icon>
          <span>项目完成情况</span>
        </div>
        <div class="completeness-stats">
          <div class="stat-item success">
            <el-icon><CircleCheck /></el-icon>
            <span>已完成：<strong>{{ completeness.completedCount }}</strong> 集</span>
          </div>
          <div v-if="completeness.inProgressCount > 0" class="stat-item warning">
            <el-icon><Clock /></el-icon>
            <span>进行中：<strong>{{ completeness.inProgressCount }}</strong> 集</span>
          </div>
          <div v-if="completeness.draftCount > 0" class="stat-item info">
            <el-icon><EditPen /></el-icon>
            <span>草稿：<strong>{{ completeness.draftCount }}</strong> 集</span>
          </div>
        </div>
        
        <!-- 警告信息 -->
        <el-alert
          v-if="completeness.completedCount === 0"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top: 12px"
        >
          <template #title>
            暂无已完成的剧集，建议勾选"包含未完成剧集"选项
          </template>
        </el-alert>
      </div>

      <!-- 导出设置 -->
      <el-form :model="exportForm" label-width="100px" label-position="left">
        <!-- 导出格式 -->
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio label="txt">
              <span style="display: flex; align-items: center; gap: 4px;">
                <el-icon><Document /></el-icon>
                TXT 纯文本
              </span>
            </el-radio>
            <el-radio label="markdown">
              <span style="display: flex; align-items: center; gap: 4px;">
                <el-icon><Tickets /></el-icon>
                Markdown
              </span>
            </el-radio>
          </el-radio-group>
          <div class="form-tip">
            {{ exportForm.format === 'txt' ? '通用文本格式，兼容性好' : '富文本格式，适合文档化和版本管理' }}
          </div>
        </el-form-item>

        <!-- 导出范围 -->
        <el-form-item label="导出范围">
          <el-radio-group v-model="exportForm.rangeType" @change="handleRangeTypeChange">
            <el-radio label="completed">仅已完成</el-radio>
            <el-radio label="all">包含未完成</el-radio>
            <el-radio label="custom">自定义范围</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 自定义范围 -->
        <el-form-item v-if="exportForm.rangeType === 'custom'" label="截止集数">
          <el-input-number
            v-model="exportForm.upToEpisode"
            :min="1"
            :max="maxEpisodeNumber"
            :step="1"
            style="width: 200px"
          />
          <div class="form-tip">
            导出第 1 集到第 {{ exportForm.upToEpisode }} 集
          </div>
        </el-form-item>

        <!-- 包含设定 -->
        <el-form-item label="额外内容">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <el-checkbox v-model="exportForm.includeSettings" :disabled="!hasSettings">
              包含世界观和角色设定
            </el-checkbox>
            <el-checkbox v-model="exportForm.includeMetadata">
              包含创作辅助信息
              <el-tooltip placement="top" effect="light">
                <template #content>
                  <div style="max-width: 300px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">包括：</div>
                    <ul style="margin: 0; padding-left: 20px;">
                      <li>关键对白：AI提取的重要台词</li>
                      <li>结尾悬念：连续性设计备注</li>
                      <li>备注：创作过程中的记录</li>
                    </ul>
                    <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                      • 勾选：完整工作版（适合内部协作、备份）<br>
                      • 不勾选：纯净剧本版（适合正式交付、审核）
                    </div>
                  </div>
                </template>
                <el-icon style="cursor: help; color: #909399; margin-left: 4px;">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </el-checkbox>
          </div>
          <div v-if="!hasSettings" class="form-tip warning">
            项目暂无世界观或角色设定
          </div>
        </el-form-item>
      </el-form>

      <!-- 预览信息 -->
      <div v-if="previewInfo" class="preview-info">
        <el-icon><View /></el-icon>
        <span>将导出 <strong>{{ previewInfo.episodeCount }}</strong> 集剧本</span>
        <span v-if="exportForm.includeSettings && hasSettings">，包含世界观和角色设定</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="exporting"
        :disabled="!canExport"
        @click="handleConfirm"
      >
        <el-icon v-if="!exporting"><Download /></el-icon>
        {{ exporting ? '导出中...' : '确认导出' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  DataAnalysis,
  CircleCheck,
  Clock,
  EditPen,
  Document,
  Tickets,
  View,
  Download,
  QuestionFilled
} from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: String,
    required: true
  },
  projectName: {
    type: String,
    required: true
  },
  projectData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'close']);

// 对话框可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

// 检查中
const checking = ref(false);

// 导出中
const exporting = ref(false);

// 完整性数据
const completeness = ref(null);

// 导出表单
const exportForm = ref({
  format: 'txt',
  rangeType: 'completed',
  upToEpisode: 1,
  includeSettings: true,
  includeMetadata: true // 默认包含创作辅助信息
});

// 计算完整性
const calculateCompleteness = () => {
  if (!props.projectData || !props.projectData.episodes) {
    return null;
  }

  const episodes = props.projectData.episodes;
  const completed = episodes.filter(ep => ep.status === 'completed' || ep.status === 'reviewed');
  const inProgress = episodes.filter(ep => ep.status === 'in-progress');
  const draft = episodes.filter(ep => ep.status === 'draft');

  return {
    totalCount: episodes.length,
    completedCount: completed.length,
    inProgressCount: inProgress.length,
    draftCount: draft.length,
    maxEpisodeNumber: Math.max(...episodes.map(ep => ep.number), 0)
  };
};

// 最大集数
const maxEpisodeNumber = computed(() => {
  return completeness.value?.maxEpisodeNumber || props.projectData?.episodeCount || 100;
});

// 是否有设定
const hasSettings = computed(() => {
  if (!props.projectData) return false;
  
  const hasWorldview = props.projectData.worldview && 
    (props.projectData.worldview.background || props.projectData.worldview.setting);
  const hasCharacters = props.projectData.characters && 
    props.projectData.characters.length > 0;
  
  return hasWorldview || hasCharacters;
});

// 预览信息
const previewInfo = computed(() => {
  if (!props.projectData || !props.projectData.episodes) return null;

  const episodes = props.projectData.episodes;
  let filteredEpisodes = [];

  if (exportForm.value.rangeType === 'completed') {
    filteredEpisodes = episodes.filter(ep => ep.status === 'completed' || ep.status === 'reviewed');
  } else if (exportForm.value.rangeType === 'all') {
    filteredEpisodes = episodes;
  } else if (exportForm.value.rangeType === 'custom') {
    filteredEpisodes = episodes.filter(ep => ep.number <= exportForm.value.upToEpisode);
  }

  return {
    episodeCount: filteredEpisodes.length
  };
});

// 是否可以导出
const canExport = computed(() => {
  return previewInfo.value && previewInfo.value.episodeCount > 0;
});

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // 对话框打开时初始化
    completeness.value = calculateCompleteness();
    exportForm.value.upToEpisode = maxEpisodeNumber.value;
    
    // 如果没有已完成的剧集，默认选择包含未完成
    if (completeness.value && completeness.value.completedCount === 0) {
      exportForm.value.rangeType = 'all';
    }
  }
}, { immediate: true });

// 范围类型变化
const handleRangeTypeChange = () => {
  if (exportForm.value.rangeType === 'custom') {
    exportForm.value.upToEpisode = maxEpisodeNumber.value;
  }
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
  emit('close');
};

// 确认导出
const handleConfirm = () => {
  const options = {
    format: exportForm.value.format,
    includeIncomplete: exportForm.value.rangeType !== 'completed',
    upToEpisode: exportForm.value.rangeType === 'custom' ? exportForm.value.upToEpisode : null,
    includeMetadata: exportForm.value.includeMetadata
  };

  emit('confirm', options);
};

// 设置导出状态
const setExporting = (status) => {
  exporting.value = status;
};

// 暴露方法给父组件
defineExpose({
  setExporting
});
</script>

<style scoped>
.export-dialog-content {
  min-height: 200px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.completeness-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.stat-item.success {
  color: #67c23a;
}

.stat-item.warning {
  color: #e6a23c;
}

.stat-item.info {
  color: #909399;
}

.stat-item strong {
  color: #303133;
  font-weight: 600;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.form-tip.warning {
  color: #e6a23c;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
  margin-top: 16px;
}

.preview-info strong {
  color: #409eff;
  font-weight: 600;
}

:deep(.el-radio) {
  margin-right: 20px;
  margin-bottom: 8px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
