<template>
  <div class="version-compare">
    <!-- 对比头部 -->
    <div class="compare-header">
      <div class="version-selector">
        <div class="version-card left">
          <span class="version-label">版本 A</span>
          <div class="version-info">
            <div class="version-icon">{{ getModuleIcon(versionA.moduleType) }}</div>
            <div class="version-meta">
              <div class="version-title">{{ formatModuleType(versionA.moduleType) }}</div>
              <div class="version-time">{{ formatDateTime(versionA.createdAt) }}</div>
              <div v-if="versionA.comment" class="version-comment">{{ versionA.comment }}</div>
            </div>
          </div>
        </div>
        
        <div class="vs-divider">
          <el-icon><DArrowLeft /></el-icon>
          <span>VS</span>
          <el-icon><DArrowRight /></el-icon>
        </div>
        
        <div class="version-card right">
          <span class="version-label">版本 B</span>
          <div class="version-info">
            <div class="version-icon">{{ getModuleIcon(versionB.moduleType) }}</div>
            <div class="version-meta">
              <div class="version-title">{{ formatModuleType(versionB.moduleType) }}</div>
              <div class="version-time">{{ formatDateTime(versionB.createdAt) }}</div>
              <div v-if="versionB.comment" class="version-comment">{{ versionB.comment }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 差异统计 -->
      <div class="diff-stats">
        <el-tag type="success" size="small">
          <el-icon><Plus /></el-icon>
          新增 {{ diffStats.added }}
        </el-tag>
        <el-tag type="warning" size="small">
          <el-icon><Edit /></el-icon>
          修改 {{ diffStats.modified }}
        </el-tag>
        <el-tag type="danger" size="small">
          <el-icon><Minus /></el-icon>
          删除 {{ diffStats.removed }}
        </el-tag>
      </div>
    </div>

    <!-- 对比内容 -->
    <div class="compare-content">
      <el-scrollbar height="500px">
        <div v-if="differences.length === 0" class="no-diff">
          <el-icon :size="60" color="#67C23A"><CircleCheck /></el-icon>
          <p>两个版本内容完全相同</p>
        </div>
        
        <div v-else class="diff-list">
          <div 
            v-for="(diff, index) in differences" 
            :key="index"
            class="diff-item"
            :class="`diff-${diff.type}`"
          >
            <div class="diff-header">
              <span class="diff-icon">
                <el-icon v-if="diff.type === 'added'" color="#67C23A"><Plus /></el-icon>
                <el-icon v-else-if="diff.type === 'removed'" color="#F56C6C"><Minus /></el-icon>
                <el-icon v-else color="#E6A23C"><Edit /></el-icon>
              </span>
              <span class="diff-field">{{ formatFieldLabel(diff.field) }}</span>
              <el-tag :type="diffTypeTag(diff.type)" size="small">
                {{ diffTypeText(diff.type) }}
              </el-tag>
            </div>
            
            <div class="diff-body">
              <!-- 删除的内容 -->
              <div v-if="diff.type !== 'added'" class="diff-value old-value">
                <div class="value-label">旧值：</div>
                <div class="value-content">{{ formatValue(diff.oldValue) }}</div>
              </div>
              
              <!-- 新增的内容 -->
              <div v-if="diff.type !== 'removed'" class="diff-value new-value">
                <div class="value-label">新值：</div>
                <div class="value-content">{{ formatValue(diff.newValue) }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 操作按钮 -->
    <div class="compare-actions">
      <el-button @click="$emit('close')">关闭</el-button>
      <el-button type="primary" @click="handleRestoreA">
        <el-icon><RefreshLeft /></el-icon>
        恢复到版本 A
      </el-button>
      <el-button type="primary" @click="handleRestoreB">
        <el-icon><RefreshLeft /></el-icon>
        恢复到版本 B
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  DArrowLeft, 
  DArrowRight, 
  Plus, 
  Minus, 
  Edit, 
  CircleCheck,
  RefreshLeft
} from '@element-plus/icons-vue';
import { compareVersions, formatModuleType, getModuleIcon } from '../utils/versionManager';

const props = defineProps({
  versionA: {
    type: Object,
    required: true
  },
  versionB: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'restore']);

// 计算差异
const differences = computed(() => {
  return compareVersions(props.versionA.content, props.versionB.content);
});

// 差异统计
const diffStats = computed(() => {
  const stats = {
    added: 0,
    modified: 0,
    removed: 0
  };
  
  differences.value.forEach(diff => {
    stats[diff.type]++;
  });
  
  return stats;
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

// 格式化值
const formatValue = (value) => {
  if (value === null || value === undefined) {
    return '(空)';
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join('、') : '(空)';
    }
    return JSON.stringify(value, null, 2);
  }
  
  if (typeof value === 'string' && value.length > 500) {
    return value.substring(0, 500) + '...';
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
    minute: '2-digit'
  });
};

// 差异类型标签
const diffTypeTag = (type) => {
  const typeMap = {
    'added': 'success',
    'removed': 'danger',
    'modified': 'warning'
  };
  return typeMap[type] || 'info';
};

// 差异类型文本
const diffTypeText = (type) => {
  const textMap = {
    'added': '新增',
    'removed': '删除',
    'modified': '修改'
  };
  return textMap[type] || type;
};

// 恢复到版本 A
const handleRestoreA = () => {
  emit('restore', props.versionA);
};

// 恢复到版本 B
const handleRestoreB = () => {
  emit('restore', props.versionB);
};
</script>

<style scoped>
.version-compare {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 对比头部 */
.compare-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-selector {
  display: flex;
  align-items: center;
  gap: 20px;
}

.version-card {
  flex: 1;
  background: #F5F7FA;
  border-radius: 8px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.version-card.left {
  border-color: #409EFF;
}

.version-card.right {
  border-color: #67C23A;
}

.version-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  margin-bottom: 8px;
}

.version-info {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.version-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.version-meta {
  flex: 1;
  min-width: 0;
}

.version-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.version-time {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.version-comment {
  font-size: 13px;
  color: #606266;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vs-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #909399;
  flex-shrink: 0;
}

/* 差异统计 */
.diff-stats {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #F5F7FA;
  border-radius: 6px;
}

.diff-stats .el-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 对比内容 */
.compare-content {
  background: #F5F7FA;
  border-radius: 8px;
  padding: 16px;
}

.no-diff {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #67C23A;
}

.no-diff p {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
}

/* 差异列表 */
.diff-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diff-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #DCDFE6;
}

.diff-item.diff-added {
  border-left-color: #67C23A;
  background: #f0f9ff;
}

.diff-item.diff-removed {
  border-left-color: #F56C6C;
  background: #fef0f0;
}

.diff-item.diff-modified {
  border-left-color: #E6A23C;
  background: #fdf6ec;
}

.diff-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.diff-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 18px;
}

.diff-field {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.diff-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diff-value {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #E4E7ED;
}

.diff-value.old-value {
  background: #FEF0F0;
  border-color: #F56C6C;
}

.diff-value.new-value {
  background: #F0F9FF;
  border-color: #67C23A;
}

.value-label {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.value-content {
  font-size: 14px;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 操作按钮 */
.compare-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #E4E7ED;
}

/* 响应式 */
@media (max-width: 768px) {
  .version-selector {
    flex-direction: column;
  }
  
  .vs-divider {
    transform: rotate(90deg);
  }
  
  .compare-actions {
    flex-direction: column;
  }
  
  .compare-actions .el-button {
    width: 100%;
  }
}
</style>
