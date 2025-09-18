<template>
  <div class="temp-email-status-bar">
    <div class="status-info">
      <!-- 权限状态图标 -->
      <el-icon class="status-icon" :class="statusIconClass">
        <component :is="statusIcon" />
      </el-icon>
      
      <!-- 基本信息 -->
      <div class="status-text">
        <span class="status-title">{{ statusTitle }}</span>
        <span class="status-detail" v-if="statusDetail">{{ statusDetail }}</span>
      </div>
      
      <!-- 状态标签 -->
      <el-tag :type="statusTagType" size="small" class="status-tag">
        {{ statusText }}
      </el-tag>


    </div>

    <!-- 激活按钮 - 始终显示，已激活用户可以激活更多激活码 -->
    <div class="activation-action">
      <el-button
        type="primary"
        size="small"
        @click="$emit('show-activation')"
        :icon="Key"
      >
        {{ accessStatus.hasAccess ? '激活更多' : '激活权限' }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  CircleCheck,
  CircleClose,
  Key
} from '@element-plus/icons-vue'

// 定义props
const props = defineProps({
  accessStatus: {
    type: Object,
    required: true
  }
})

// 定义事件
defineEmits(['show-activation'])

// 计算属性：状态图标
const statusIcon = computed(() => {
  if (props.accessStatus.hasAccess) {
    return CircleCheck
  } else {
    return CircleClose
  }
})

// 计算属性：状态图标样式
const statusIconClass = computed(() => {
  if (props.accessStatus.hasAccess) {
    return 'status-success'
  } else {
    return 'status-warning'
  }
})

// 计算属性：状态标题
const statusTitle = computed(() => {
  if (props.accessStatus.hasAccess) {
    return props.accessStatus.isAdmin ? '管理员权限' : '权限已激活'
  } else {
    return '需要激活'
  }
})

// 计算属性：状态详情
const statusDetail = computed(() => {
  if (!props.accessStatus.hasAccess) {
    return null
  }
  
  if (props.accessStatus.isAdmin) {
    return '无限制使用'
  }
  
  if (props.accessStatus.tempEmailAccess?.expiresAt) {
    const expiresAt = new Date(props.accessStatus.tempEmailAccess.expiresAt)
    const now = new Date()
    const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    
    if (diffDays > 0) {
      return `剩余 ${diffDays} 天`
    } else {
      return '已过期'
    }
  }
  
  return '永久有效'
})

// 计算属性：状态文本
const statusText = computed(() => {
  if (props.accessStatus.hasAccess) {
    return '已激活'
  } else {
    return '未激活'
  }
})

// 计算属性：标签类型
const statusTagType = computed(() => {
  if (props.accessStatus.hasAccess) {
    return 'success'
  } else {
    return 'warning'
  }
})
</script>

<style scoped>
.temp-email-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.status-icon {
  font-size: 20px;
}

.status-icon.status-success {
  color: #67c23a;
}

.status-icon.status-warning {
  color: #e6a23c;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-title {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.status-detail {
  font-size: 12px;
  color: #909399;
}

.status-tag {
  margin-left: auto;
  margin-right: 12px;
}

.activation-action {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .temp-email-status-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .status-info {
    justify-content: center;
  }
  
  .status-tag {
    margin: 0;
    align-self: center;
  }
}
</style>
