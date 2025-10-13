<template>
  <div class="detail-panel">
    <el-row :gutter="16">
      <!-- 分集详情 -->
      <el-col :xs="24" :md="12">
        <el-card class="detail-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Film /></el-icon>
              <span>分集详情</span>
            </div>
          </template>
          
          <div class="detail-content">
            <div v-if="episodeStats.total > 0" class="detail-list">
              <div class="detail-item">
                <span class="label">总集数：</span>
                <span class="value">{{ episodeStats.total }} 集</span>
              </div>
              <div class="detail-item">
                <span class="label">完成率：</span>
                <el-progress 
                  :percentage="episodeStats.completionRate" 
                  :color="getProgressColor(episodeStats.completionRate)"
                  :stroke-width="10"
                />
              </div>
              <div class="detail-item">
                <span class="label">平均字数：</span>
                <span class="value">{{ formatNumber(episodeStats.avgWordCount) }} 字</span>
              </div>
              <div class="detail-item" v-if="episodeStats.longestEpisode">
                <span class="label">最长分集：</span>
                <span class="value">
                  第{{ episodeStats.longestEpisode.number }}集 
                  ({{ formatNumber(episodeStats.longestEpisode.wordCount) }} 字)
                </span>
              </div>
              <div class="detail-item" v-if="episodeStats.shortestEpisode">
                <span class="label">最短分集：</span>
                <span class="value">
                  第{{ episodeStats.shortestEpisode.number }}集 
                  ({{ formatNumber(episodeStats.shortestEpisode.wordCount) }} 字)
                </span>
              </div>
            </div>
            <el-empty v-else description="暂无分集数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>

      <!-- 最近更新 -->
      <el-col :xs="24" :md="12">
        <el-card class="detail-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Clock /></el-icon>
              <span>最近更新</span>
            </div>
          </template>
          
          <div class="detail-content">
            <div v-if="episodeStats.recentUpdates && episodeStats.recentUpdates.length > 0">
              <el-timeline>
                <el-timeline-item
                  v-for="update in episodeStats.recentUpdates"
                  :key="update.number"
                  :timestamp="formatDate(update.updatedAt)"
                  placement="top"
                >
                  <div class="timeline-content">
                    <span class="episode-number">第{{ update.number }}集</span>
                    <span class="episode-title">{{ update.title || '未命名' }}</span>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
            <el-empty v-else description="暂无更新记录" :image-size="80" />
          </div>
        </el-card>
      </el-col>

      <!-- 角色统计 -->
      <el-col :xs="24" :md="12">
        <el-card class="detail-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>角色统计</span>
            </div>
          </template>
          
          <div class="detail-content">
            <div v-if="characterStats.total > 0" class="detail-list">
              <div class="detail-item">
                <span class="label">总角色数：</span>
                <span class="value">{{ characterStats.total }} 个</span>
              </div>
              <div class="detail-item">
                <span class="label">平均描述长度：</span>
                <span class="value">{{ characterStats.avgDescriptionLength }} 字</span>
              </div>
              
              <el-divider>角色类型分布</el-divider>
              
              <div class="role-distribution">
                <div 
                  v-for="(count, role) in characterStats.byRole" 
                  :key="role"
                  class="role-item"
                >
                  <span class="role-name">{{ role }}</span>
                  <el-tag type="primary" size="small">{{ count }}</el-tag>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无角色数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>

      <!-- 大纲统计 -->
      <el-col :xs="24" :md="12">
        <el-card class="detail-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><List /></el-icon>
              <span>大纲统计</span>
            </div>
          </template>
          
          <div class="detail-content">
            <div v-if="outlineStats.totalPlotPoints > 0" class="detail-list">
              <div class="detail-item">
                <span class="label">总节点数：</span>
                <span class="value">{{ outlineStats.totalPlotPoints }} 个</span>
              </div>
              <div class="detail-item">
                <span class="label">预估集数：</span>
                <span class="value">{{ outlineStats.estimatedEpisodes }}</span>
              </div>
              
              <el-divider>各幕节点分布</el-divider>
              
              <div class="act-distribution">
                <div 
                  v-for="act in outlineStats.plotPointsByAct" 
                  :key="act.actNumber"
                  class="act-item"
                >
                  <span class="act-name">{{ act.actTitle }}</span>
                  <el-progress 
                    :percentage="getActPercentage(act.count)" 
                    :format="() => `${act.count}个`"
                    :stroke-width="12"
                  />
                </div>
              </div>

              <template v-if="hasEmotionData">
                <el-divider>情感分布</el-divider>
                <div class="emotion-distribution">
                  <el-tag
                    v-for="(count, emotion) in outlineStats.emotionDistribution"
                    :key="emotion"
                    type="info"
                    size="small"
                    style="margin: 4px"
                  >
                    {{ emotion }} ({{ count }})
                  </el-tag>
                </div>
              </template>
            </div>
            <el-empty v-else description="暂无大纲数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Film, Clock, User, List } from '@element-plus/icons-vue';

const props = defineProps({
  characterStats: {
    type: Object,
    required: true
  },
  outlineStats: {
    type: Object,
    required: true
  },
  episodeStats: {
    type: Object,
    required: true
  }
});

// 计算属性
const hasEmotionData = computed(() => {
  return props.outlineStats.emotionDistribution && 
         Object.keys(props.outlineStats.emotionDistribution).length > 0;
});

// 格式化数字
const formatNumber = (num) => {
  if (!num) return 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚';
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  }
  // 小于1天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  }
  
  // 超过7天显示具体日期
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67C23A';
  if (percentage >= 50) return '#E6A23C';
  return '#F56C6C';
};

// 计算各幕节点百分比
const getActPercentage = (count) => {
  const total = props.outlineStats.totalPlotPoints;
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
};
</script>

<style scoped>
.detail-panel {
  margin-bottom: 24px;
}

.detail-card {
  border-radius: 12px;
  border: none;
  margin-bottom: 16px;
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.detail-content {
  min-height: 200px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #F0F2F5;
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.episode-number {
  font-size: 14px;
  font-weight: 600;
  color: #409EFF;
}

.episode-title {
  font-size: 13px;
  color: #606266;
}

.role-distribution,
.act-distribution,
.emotion-distribution {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #F5F7FA;
  border-radius: 6px;
}

.role-name {
  font-size: 14px;
  color: #606266;
}

.act-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.act-name {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .detail-content {
    min-height: auto;
  }
}
</style>
