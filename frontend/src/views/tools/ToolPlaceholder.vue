<template>
  <div class="tool-placeholder">
    <div class="placeholder-content">
      <div class="placeholder-icon">
        <span v-if="toolInfo?.icon" class="tool-icon">{{ toolInfo.icon }}</span>
        <el-icon v-else size="64"><Tools /></el-icon>
      </div>
      <h2 class="placeholder-title">{{ toolName }}</h2>
      <p class="placeholder-description">{{ toolDescription }}</p>

      <!-- 工具信息 -->
      <div v-if="toolInfo" class="tool-info">
        <div class="info-item">
          <span class="label">分类：</span>
          <span class="value">{{ getCategoryName(toolInfo.category) }}</span>
        </div>
        <div class="info-item">
          <span class="label">状态：</span>
          <el-tag :type="getStatusType(toolInfo.status)">
            {{ getStatusText(toolInfo.status) }}
          </el-tag>
        </div>
        <div class="info-item">
          <span class="label">难度：</span>
          <span class="value">{{ getDifficultyText(toolInfo.difficulty) }}</span>
        </div>
        <div class="info-item">
          <span class="label">预计时间：</span>
          <span class="value">{{ toolInfo.estimatedTime }}</span>
        </div>
      </div>

      <div v-else class="placeholder-status">
        <el-tag type="warning" size="large">
          <el-icon><Clock /></el-icon>
          即将上线
        </el-tag>
      </div>
      <div class="placeholder-actions">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回工具列表
        </el-button>
        <el-button v-if="!toolInfo || toolInfo.status === 'coming-soon'" type="primary" @click="notify">
          <el-icon><Bell /></el-icon>
          通知我上线
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tools, Clock, ArrowLeft, Bell } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

export default {
  name: 'ToolPlaceholder',
  components: {
    Tools, Clock, ArrowLeft, Bell
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const toolInfo = ref(null)

    // 从路由参数获取工具ID
    const toolId = computed(() => {
      const pathParts = route.path.split('/')
      return pathParts[pathParts.length - 1]
    })

    const toolName = computed(() => {
      return toolInfo.value?.name || route.meta?.title || '工具开发中'
    })

    const toolDescription = computed(() => {
      return toolInfo.value?.description || route.meta?.description || '该工具正在开发中，敬请期待'
    })

    // 获取工具信息
    const loadToolInfo = async () => {
      try {
        const response = await axios.get('/api/tools')
        if (response.data.code === 200) {
          const tools = response.data.data.tools
          toolInfo.value = tools.find(tool => tool.id === toolId.value)
        }
      } catch (error) {
        console.warn('获取工具信息失败:', error)
      }
    }

    const getCategoryName = (categoryId) => {
      const categories = {
        'web': '网页工具',
        'text': '文本工具',
        'image': '图片工具',
        'dev': '开发工具',
        'utility': '实用工具'
      }
      return categories[categoryId] || categoryId
    }

    const getStatusText = (status) => {
      const statusMap = {
        'active': '可用',
        'coming-soon': '即将上线',
        'maintenance': '维护中',
        'inactive': '已停用'
      }
      return statusMap[status] || status
    }

    const getStatusType = (status) => {
      const typeMap = {
        'active': 'success',
        'coming-soon': 'warning',
        'maintenance': 'info',
        'inactive': 'danger'
      }
      return typeMap[status] || 'info'
    }

    const getDifficultyText = (difficulty) => {
      const difficultyMap = {
        'easy': '简单',
        'medium': '中等',
        'hard': '困难'
      }
      return difficultyMap[difficulty] || difficulty
    }

    const goBack = () => {
      router.push('/tools')
    }

    const notify = () => {
      ElMessage.success('已记录您的关注，工具上线后会通知您')
    }

    onMounted(() => {
      loadToolInfo()
    })

    return {
      toolInfo,
      toolName,
      toolDescription,
      getCategoryName,
      getStatusText,
      getStatusType,
      getDifficultyText,
      goBack,
      notify
    }
  }
}
</script>

<style scoped>
.tool-placeholder {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.placeholder-content {
  text-align: center;
  max-width: 500px;
}

.placeholder-icon {
  margin-bottom: 24px;
  color: #909399;
}

.tool-icon {
  font-size: 64px;
  display: inline-block;
}

.placeholder-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.placeholder-description {
  font-size: 16px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.placeholder-status {
  margin-bottom: 32px;
}

.tool-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 32px;
  text-align: left;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e4e7ed;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  font-weight: 500;
  color: #606266;
}

.info-item .value {
  color: #303133;
}

.placeholder-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .placeholder-actions {
    flex-direction: column;
    align-items: center;
  }

  .placeholder-actions .el-button {
    width: 200px;
  }
}
</style>
