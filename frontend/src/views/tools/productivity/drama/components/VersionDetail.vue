<template>
  <div class="version-detail">
    <!-- 基本信息 -->
    <div class="detail-section">
      <h4 class="section-title">
        📋 基本信息
        <el-tag v-if="version.isImportant" type="danger" size="small" class="important-tag">
          <el-icon><Star /></el-icon>
          重要版本
        </el-tag>
      </h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">模块类型：</span>
          <span class="info-value">
            {{ getModuleIcon(version.moduleType) }}
            {{ formatModuleType(version.moduleType) }}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">保存时间：</span>
          <span class="info-value">{{ formatDateTime(version.createdAt) }}</span>
        </div>
        <div class="info-item" v-if="moduleName">
          <span class="info-label">模块名称：</span>
          <span class="info-value">{{ moduleName }}</span>
        </div>
      </div>
      
      <!-- 版本注释 -->
      <div v-if="version.comment" class="version-comment-section">
        <div class="comment-label">📝 版本备注：</div>
        <div class="comment-content">{{ version.comment }}</div>
      </div>
      
      <!-- 版本标签 -->
      <div v-if="version.tags?.length > 0" class="version-tags-section">
        <div class="tags-label">🏷️ 版本标签：</div>
        <div class="tags-list">
          <el-tag
            v-for="tag in version.tags"
            :key="tag"
            type="info"
            size="small"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 内容预览 -->
    <div class="detail-section">
      <h4 class="section-title">📝 内容预览</h4>
      <div class="content-preview">
        <!-- 世界观 -->
        <div v-if="version.moduleType === 'worldview'" class="preview-content">
          <div v-for="(value, key) in displayContent" :key="key" class="preview-field">
            <div class="field-label">{{ formatFieldLabel(key) }}：</div>
            <div class="field-value">{{ value || '(空)' }}</div>
          </div>
        </div>

        <!-- 角色 -->
        <div v-else-if="version.moduleType === 'character'" class="preview-content">
          <div v-for="(value, key) in displayContent" :key="key" class="preview-field">
            <div class="field-label">{{ formatFieldLabel(key) }}：</div>
            <div class="field-value">{{ formatFieldValue(value) }}</div>
          </div>
        </div>

        <!-- 大纲 -->
        <div v-else-if="version.moduleType === 'outline'" class="preview-content">
          <div class="outline-structure">
            <div v-if="version.content.acts" class="acts-list">
              <div v-for="(act, index) in version.content.acts" :key="index" class="act-item">
                <div class="act-header">
                  <strong>{{ act.title || `第${act.actNumber}幕` }}</strong>
                </div>
                <div class="act-description">{{ act.description }}</div>
                <div v-if="act.plotPoints && act.plotPoints.length > 0" class="plot-points">
                  <div class="plot-points-label">关键节点：</div>
                  <ul>
                    <li v-for="(point, idx) in act.plotPoints" :key="idx">
                      {{ point.name }} <span v-if="point.episodeRange">(第{{ point.episodeRange }}集)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分集 -->
        <div v-else-if="version.moduleType === 'episode'" class="preview-content">
          <div v-for="(value, key) in displayContent" :key="key" class="preview-field">
            <div class="field-label">{{ formatFieldLabel(key) }}：</div>
            <div class="field-value">{{ formatFieldValue(value) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="detail-actions">
      <el-button @click="$emit('close')">关闭</el-button>
      <el-button type="primary" @click="handleRestore">
        <el-icon><RefreshLeft /></el-icon>
        恢复到这个版本
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RefreshLeft, Star } from '@element-plus/icons-vue';
import { formatModuleType, getModuleIcon } from '../utils/versionManager';

const props = defineProps({
  version: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['restore', 'close']);

// 模块名称
const moduleName = computed(() => {
  if (props.version.moduleType === 'character') {
    return props.version.content?.name || '未命名角色';
  } else if (props.version.moduleType === 'episode') {
    const number = props.version.content?.number;
    const title = props.version.content?.title;
    return title ? `第${number}集：${title}` : `第${number}集`;
  }
  return '';
});

// 显示内容（过滤一些不需要显示的字段）
const displayContent = computed(() => {
  const content = { ...props.version.content };
  
  // 过滤掉一些元数据字段
  const excludeKeys = ['id', '_id', 'createdAt', 'updatedAt', 'projectId'];
  excludeKeys.forEach(key => delete content[key]);
  
  // 对于大纲，单独处理
  if (props.version.moduleType === 'outline') {
    return content;
  }
  
  return content;
});

// 格式化字段标签
const formatFieldLabel = (key) => {
  const labelMap = {
    // 世界观
    'background': '故事背景',
    'setting': '世界设定',
    'theme': '核心主题',
    'conflict': '主要冲突',
    'tone': '情感基调',
    
    // 角色
    'name': '姓名',
    'role': '角色定位',
    'age': '年龄',
    'gender': '性别',
    'description': '角色描述',
    'personality': '性格特点',
    'background': '角色背景',
    'motivation': '行为动机',
    'relationships': '人际关系',
    
    // 分集
    'number': '集数',
    'title': '标题',
    'summary': '概要',
    'coreEvents': '核心事件',
    'emotionChange': '情感变化',
    'conflictPoint': '冲突点',
    'cliffhanger': '结尾钩子',
    'content': '剧本内容',
    'status': '状态',
    'wordCount': '字数'
  };
  
  return labelMap[key] || key;
};

// 格式化字段值
const formatFieldValue = (value) => {
  if (value === null || value === undefined) {
    return '(空)';
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join('、') : '(空)';
    }
    return JSON.stringify(value, null, 2);
  }
  
  if (typeof value === 'string' && value.length > 200) {
    return value.substring(0, 200) + '...';
  }
  
  return value;
};

// 格式化日期时间
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 恢复版本
const handleRestore = () => {
  emit('restore', props.version);
};
</script>

<style scoped>
.version-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  background: #F5F7FA;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
}

.important-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-label {
  font-weight: 500;
  color: #606266;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
}

/* 版本注释 */
.version-comment-section {
  margin-top: 16px;
  padding: 12px;
  background: #FFF7E6;
  border-left: 3px solid #E6A23C;
  border-radius: 4px;
}

.comment-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.comment-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
  font-style: italic;
}

/* 版本标签 */
.version-tags-section {
  margin-top: 12px;
}

.tags-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.content-preview {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-field {
  background: white;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #E4E7ED;
}

.field-label {
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.field-value {
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 大纲特殊样式 */
.outline-structure {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #E4E7ED;
}

.acts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.act-item {
  padding: 12px;
  background: #F5F7FA;
  border-radius: 6px;
  border-left: 3px solid #409EFF;
}

.act-header {
  font-size: 15px;
  margin-bottom: 8px;
  color: #303133;
}

.act-description {
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.6;
}

.plot-points {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E4E7ED;
}

.plot-points-label {
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.plot-points ul {
  margin: 0;
  padding-left: 20px;
}

.plot-points li {
  color: #303133;
  margin: 4px 0;
  line-height: 1.6;
}

.plot-points li span {
  color: #909399;
  font-size: 13px;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #E4E7ED;
}

/* 响应式 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .content-preview {
    max-height: 300px;
  }
  
  .detail-actions {
    flex-direction: column-reverse;
  }
  
  .detail-actions .el-button {
    width: 100%;
  }
}
</style>
