<template>
  <div class="overview-cards">
    <el-row :gutter="16">
      <!-- 项目进度 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card progress-card" shadow="hover">
          <div class="card-icon">
            <el-icon :size="32" color="#409EFF">
              <TrendCharts />
            </el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ stats.progress }}%</div>
            <div class="card-label">完成进度</div>
            <div class="card-detail">
              {{ stats.completedEpisodes }} / {{ stats.totalEpisodes }} 集
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 总字数 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card wordcount-card" shadow="hover">
          <div class="card-icon">
            <el-icon :size="32" color="#67C23A">
              <Document />
            </el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatNumber(stats.totalWordCount) }}</div>
            <div class="card-label">总字数</div>
            <div class="card-detail">
              平均 {{ formatNumber(stats.avgWordCount) }} 字/集
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 角色数量 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card characters-card" shadow="hover">
          <div class="card-icon">
            <el-icon :size="32" color="#E6A23C">
              <User />
            </el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ stats.charactersCount }}</div>
            <div class="card-label">角色数量</div>
            <div class="card-detail">
              {{ stats.worldviewComplete ? '世界观已完成' : '世界观待完善' }}
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 节点数量 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card plotpoints-card" shadow="hover">
          <div class="card-icon">
            <el-icon :size="32" color="#F56C6C">
              <Connection />
            </el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ stats.plotPointsCount }}</div>
            <div class="card-label">关键节点</div>
            <div class="card-detail">
              {{ stats.plotPointsCount > 0 ? '大纲已规划' : '待添加节点' }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { TrendCharts, Document, User, Connection } from '@element-plus/icons-vue';

defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({
      progress: 0,
      completedEpisodes: 0,
      totalEpisodes: 0,
      charactersCount: 0,
      plotPointsCount: 0,
      totalWordCount: 0,
      avgWordCount: 0,
      worldviewComplete: false
    })
  }
});

// 格式化数字（千分位）
const formatNumber = (num) => {
  if (!num) return 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
</script>

<style scoped>
.overview-cards {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  transition: all 0.3s;
  cursor: pointer;
  border: none;
  margin-bottom: 16px;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 20px;
}

.card-icon {
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0.05) 100%);
}

.progress-card .card-icon {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0.05) 100%);
}

.wordcount-card .card-icon {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.05) 100%);
}

.characters-card .card-icon {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.1) 0%, rgba(230, 162, 60, 0.05) 100%);
}

.plotpoints-card .card-icon {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.1) 0%, rgba(245, 108, 108, 0.05) 100%);
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.card-detail {
  font-size: 12px;
  color: #C0C4CC;
}

/* 响应式 */
@media (max-width: 768px) {
  .stat-card :deep(.el-card__body) {
    padding: 16px;
  }

  .card-icon {
    width: 50px;
    height: 50px;
    margin-right: 12px;
  }

  .card-value {
    font-size: 24px;
  }
}
</style>
