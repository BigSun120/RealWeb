<template>
  <div 
    class="tool-card" 
    :class="{ 
      'is-featured': tool.featured,
      'is-disabled': tool.status !== 'active',
      'is-coming-soon': tool.status === 'coming-soon'
    }"
    @click="handleClick"
  >
    <!-- 工具图标 -->
    <div class="tool-icon">
      <span class="icon-emoji">{{ tool.icon }}</span>
    </div>

    <!-- 工具信息 -->
    <div class="tool-info">
      <div class="tool-header">
        <h3 class="tool-name">{{ tool.name }}</h3>
        <div class="tool-badges">
          <el-tag 
            v-if="tool.featured" 
            type="warning" 
            size="small"
            effect="plain"
          >
            推荐
          </el-tag>
          <el-tag 
            v-if="tool.status === 'coming-soon'" 
            type="info" 
            size="small"
            effect="plain"
          >
            即将上线
          </el-tag>
          <el-tag 
            v-if="tool.status === 'maintenance'" 
            type="danger" 
            size="small"
            effect="plain"
          >
            维护中
          </el-tag>
        </div>
      </div>
      
      <p class="tool-description">{{ tool.description }}</p>
      
      <div class="tool-meta">
        <div class="tool-difficulty">
          <el-icon><Timer /></el-icon>
          <span>{{ tool.estimatedTime }}</span>
        </div>
        <div class="tool-difficulty">
          <el-icon><Star /></el-icon>
          <span>{{ getDifficultyText(tool.difficulty) }}</span>
        </div>
      </div>

      <!-- 工具标签 -->
      <div class="tool-tags">
        <el-tag 
          v-for="tag in tool.tags.slice(0, 3)" 
          :key="tag"
          size="small"
          effect="plain"
          type="info"
        >
          {{ tag }}
        </el-tag>
        <span v-if="tool.tags.length > 3" class="more-tags">
          +{{ tool.tags.length - 3 }}
        </span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="tool-actions">
      <el-button 
        v-if="tool.status === 'active'"
        type="primary" 
        size="small"
        @click.stop="goToTool"
      >
        使用工具
      </el-button>
      <el-button 
        v-else-if="tool.status === 'coming-soon'"
        type="info" 
        size="small"
        disabled
      >
        即将上线
      </el-button>
      <el-button 
        v-else
        type="danger" 
        size="small"
        disabled
      >
        暂不可用
      </el-button>
      
      <el-button 
        type="text" 
        size="small"
        @click.stop="toggleFavorite"
        :class="{ 'is-favorited': isFavorited }"
      >
        <el-icon><Star /></el-icon>
      </el-button>
    </div>

    <!-- 推荐标识 -->
    <div v-if="tool.featured" class="featured-badge">
      <el-icon><Star /></el-icon>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Timer, Star } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'ToolCard',
  components: {
    Timer,
    Star
  },
  props: {
    tool: {
      type: Object,
      required: true
    }
  },
  emits: ['favorite-change'],
  setup(props, { emit }) {
    const router = useRouter()
    const isFavorited = ref(false) // TODO: 从本地存储或用户数据获取

    // 难度等级文本
    const getDifficultyText = (difficulty) => {
      const difficultyMap = {
        easy: '简单',
        medium: '中等',
        hard: '困难'
      }
      return difficultyMap[difficulty] || '未知'
    }

    // 点击卡片
    const handleClick = () => {
      if (props.tool.status === 'active') {
        goToTool()
      } else {
        ElMessage.info('该工具暂不可用')
      }
    }

    // 跳转到工具页面
    const goToTool = () => {
      if (props.tool.status === 'active') {
        router.push(props.tool.route)
      } else {
        ElMessage.info('该工具即将上线，敬请期待！')
      }
    }

    // 切换收藏状态
    const toggleFavorite = () => {
      isFavorited.value = !isFavorited.value
      emit('favorite-change', {
        toolId: props.tool.id,
        isFavorited: isFavorited.value
      })
      
      ElMessage.success(
        isFavorited.value ? '已添加到收藏' : '已取消收藏'
      )
    }

    return {
      isFavorited,
      getDifficultyText,
      handleClick,
      goToTool,
      toggleFavorite
    }
  }
}
</script>

<style scoped>
.tool-card {
  position: relative;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.tool-card.is-featured {
  border-color: #e6a23c;
}

.tool-card.is-featured:hover {
  border-color: #e6a23c;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.15);
}

.tool-card.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tool-card.is-coming-soon {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

/* 工具图标 */
.tool-icon {
  text-align: center;
  margin-bottom: 15px;
}

.icon-emoji {
  font-size: 32px;
  display: inline-block;
}

/* 工具信息 */
.tool-info {
  flex: 1;
}

.tool-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.tool-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.tool-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 10px;
}

.tool-description {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.tool-meta {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  font-size: 12px;
  color: #909399;
}

.tool-difficulty {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
}

.more-tags {
  font-size: 12px;
  color: #909399;
  align-self: center;
}

/* 操作按钮 */
.tool-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.tool-actions .el-button.is-favorited {
  color: #e6a23c;
}

/* 推荐标识 */
.featured-badge {
  position: absolute;
  top: -1px;
  right: -1px;
  background: #e6a23c;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 0 8px 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tool-card {
    padding: 15px;
  }
  
  .tool-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .tool-badges {
    margin-left: 0;
  }
  
  .tool-meta {
    gap: 10px;
  }
  
  .tool-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
