<template>
  <el-card class="project-card" shadow="hover" @click="handleOpen">
    <div class="card-header">
      <div class="project-icon">{{ getTypeIcon(project.type) }}</div>
      <div class="project-info">
        <h3 class="project-name" :title="project.name">{{ project.name }}</h3>
        <div class="project-meta">
          <el-tag size="small" :type="getStatusType(project.status)">
            {{ project.status }}
          </el-tag>
          <span class="meta-text">{{ project.episodeCount }}集</span>
          <span class="meta-text">{{ project.type }}</span>
        </div>
      </div>
    </div>

    <div class="card-body">
      <div class="progress-section">
        <div class="progress-label">
          <span>进度</span>
          <span class="progress-value">{{ project.progress }}%</span>
        </div>
        <el-progress 
          :percentage="project.progress" 
          :stroke-width="6"
          :show-text="false"
        />
      </div>

      <div class="card-footer">
        <span class="update-time">{{ formatTime(project.updatedAt) }}</span>
        <div class="card-actions" @click.stop>
          <el-button 
            type="primary" 
            size="small" 
            link
            @click="handleOpen"
          >
            打开
          </el-button>
          <el-dropdown @command="handleAction">
            <el-button size="small" link>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-dropdown-item>
                <el-dropdown-item command="export">
                  <el-icon><Download /></el-icon>
                  导出
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <el-icon><Delete /></el-icon>
                  <span style="color: var(--el-color-danger)">删除</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { MoreFilled, Edit, Download, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['open', 'edit', 'delete', 'export']);

// 获取类型图标
const getTypeIcon = (type) => {
  const icons = {
    '霸道总裁': '👔',
    '悬疑推理': '🔍',
    '甜宠日常': '💕',
    '复仇爽剧': '⚔️',
    '古装穿越': '🏯',
    '职场励志': '💼'
  };
  return icons[type] || '🎬';
};

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    '设定中': 'info',
    '大纲中': 'warning',
    '剧本中': 'primary',
    '已完成': 'success'
  };
  return types[status] || 'info';
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < 7 * day) {
    return Math.floor(diff / day) + '天前';
  } else {
    return date.toLocaleDateString('zh-CN');
  }
};

// 打开项目
const handleOpen = () => {
  emit('open', props.project);
};

// 处理操作
const handleAction = (command) => {
  switch (command) {
    case 'edit':
      emit('edit', props.project);
      break;
    case 'export':
      emit('export', props.project);
      break;
    case 'delete':
      ElMessageBox.confirm(
        `确定要删除项目「${props.project.name}」吗？此操作不可恢复。`,
        '删除确认',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )
        .then(() => {
          emit('delete', props.project);
        })
        .catch(() => {
          // 取消删除
        });
      break;
  }
};
</script>

<style scoped>
.project-card {
  cursor: pointer;
  transition: all 0.3s;
  height: 100%;
}

.project-card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.project-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-text {
  font-size: 12px;
  color: #909399;
}

.card-body {
  margin-top: 12px;
}

.progress-section {
  margin-bottom: 12px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}

.progress-value {
  font-weight: 600;
  color: #FF6B6B;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #EBEEF5;
}

.update-time {
  font-size: 12px;
  color: #909399;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .project-name {
    font-size: 14px;
  }
  
  .project-icon {
    font-size: 28px;
  }
}
</style>
