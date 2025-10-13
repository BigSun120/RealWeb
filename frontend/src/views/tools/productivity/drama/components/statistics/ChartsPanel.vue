<template>
  <div class="charts-panel">
    <el-row :gutter="16">
      <!-- 项目进度环形图 -->
      <el-col :xs="24" :sm="12" :md="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="header-title">项目完成进度</span>
              <el-tag :type="progressTagType" size="small">
                {{ projectStats.progress }}%
              </el-tag>
            </div>
          </template>
          <div ref="progressChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 分集状态饼图 -->
      <el-col :xs="24" :sm="12" :md="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="header-title">分集状态分布</span>
              <el-tag type="info" size="small">
                {{ episodeStats.total }} 集
              </el-tag>
            </div>
          </template>
          <div ref="episodeStatusChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 角色类型柱状图 -->
      <el-col :xs="24" :sm="12" :md="12" v-if="hasCharacters">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="header-title">角色类型分布</span>
              <el-tag type="warning" size="small">
                {{ characterStats.total }} 个角色
              </el-tag>
            </div>
          </template>
          <div ref="characterRoleChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 大纲节点分布 -->
      <el-col :xs="24" :sm="12" :md="12" v-if="hasOutline">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="header-title">大纲节点分布</span>
              <el-tag type="success" size="small">
                {{ outlineStats.totalPlotPoints }} 个节点
              </el-tag>
            </div>
          </template>
          <div ref="plotPointsChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 字数趋势折线图 -->
      <el-col :xs="24" :md="24" v-if="hasEpisodes">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="header-title">分集字数趋势</span>
              <el-tag type="primary" size="small">
                总计 {{ formatNumber(episodeStats.totalWordCount) }} 字
              </el-tag>
            </div>
          </template>
          <div ref="wordCountTrendChartRef" class="chart-container chart-wide"></div>
        </el-card>
      </el-col>

      <!-- 角色参与度雷达图 -->
      <el-col :xs="24" :md="12" v-if="hasCharacterInvolvement">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="header-title">角色参与度</span>
              <el-tag type="success" size="small">TOP 8</el-tag>
            </div>
          </template>
          <div ref="characterInvolvementChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import {
  generateProgressChartOption,
  generateEpisodeStatusChartOption,
  generateCharacterRoleChartOption,
  generatePlotPointsDistributionChartOption,
  generateWordCountTrendChartOption,
  generateCharacterInvolvementChartOption
} from '../../utils/statistics';

const props = defineProps({
  projectStats: {
    type: Object,
    required: true
  },
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
  },
  episodes: {
    type: Array,
    default: () => []
  }
});

// 图表引用
const progressChartRef = ref(null);
const episodeStatusChartRef = ref(null);
const characterRoleChartRef = ref(null);
const plotPointsChartRef = ref(null);
const wordCountTrendChartRef = ref(null);
const characterInvolvementChartRef = ref(null);

// 图表实例
let progressChart = null;
let episodeStatusChart = null;
let characterRoleChart = null;
let plotPointsChart = null;
let wordCountTrendChart = null;
let characterInvolvementChart = null;

// 计算属性
const progressTagType = computed(() => {
  const progress = props.projectStats.progress;
  if (progress >= 80) return 'success';
  if (progress >= 50) return 'warning';
  return 'info';
});

const hasCharacters = computed(() => {
  return props.characterStats.total > 0 && Object.keys(props.characterStats.byRole).length > 0;
});

const hasOutline = computed(() => {
  return props.outlineStats.totalPlotPoints > 0;
});

const hasEpisodes = computed(() => {
  return props.episodes.length > 0;
});

const hasCharacterInvolvement = computed(() => {
  return Object.keys(props.outlineStats.characterInvolvement || {}).length > 0;
});

// 格式化数字
const formatNumber = (num) => {
  if (!num) return 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 初始化图表
const initCharts = async () => {
  await nextTick();

  // 项目进度图
  if (progressChartRef.value) {
    progressChart = echarts.init(progressChartRef.value);
    const option = generateProgressChartOption(props.projectStats);
    progressChart.setOption(option);
  }

  // 分集状态图
  if (episodeStatusChartRef.value && props.episodeStats.total > 0) {
    episodeStatusChart = echarts.init(episodeStatusChartRef.value);
    const option = generateEpisodeStatusChartOption(props.episodeStats);
    episodeStatusChart.setOption(option);
  }

  // 角色类型图
  if (characterRoleChartRef.value && hasCharacters.value) {
    characterRoleChart = echarts.init(characterRoleChartRef.value);
    const option = generateCharacterRoleChartOption(props.characterStats);
    characterRoleChart.setOption(option);
  }

  // 大纲节点图
  if (plotPointsChartRef.value && hasOutline.value) {
    plotPointsChart = echarts.init(plotPointsChartRef.value);
    const option = generatePlotPointsDistributionChartOption(props.outlineStats);
    plotPointsChart.setOption(option);
  }

  // 字数趋势图
  if (wordCountTrendChartRef.value && hasEpisodes.value) {
    wordCountTrendChart = echarts.init(wordCountTrendChartRef.value);
    const option = generateWordCountTrendChartOption(props.episodes);
    wordCountTrendChart.setOption(option);
  }

  // 角色参与度图
  if (characterInvolvementChartRef.value && hasCharacterInvolvement.value) {
    characterInvolvementChart = echarts.init(characterInvolvementChartRef.value);
    const option = generateCharacterInvolvementChartOption(props.outlineStats);
    if (option) {
      characterInvolvementChart.setOption(option);
    }
  }
};

// 更新图表
const updateCharts = () => {
  if (progressChart) {
    const option = generateProgressChartOption(props.projectStats);
    progressChart.setOption(option);
  }

  if (episodeStatusChart && props.episodeStats.total > 0) {
    const option = generateEpisodeStatusChartOption(props.episodeStats);
    episodeStatusChart.setOption(option);
  }

  if (characterRoleChart && hasCharacters.value) {
    const option = generateCharacterRoleChartOption(props.characterStats);
    characterRoleChart.setOption(option);
  }

  if (plotPointsChart && hasOutline.value) {
    const option = generatePlotPointsDistributionChartOption(props.outlineStats);
    plotPointsChart.setOption(option);
  }

  if (wordCountTrendChart && hasEpisodes.value) {
    const option = generateWordCountTrendChartOption(props.episodes);
    wordCountTrendChart.setOption(option);
  }

  if (characterInvolvementChart && hasCharacterInvolvement.value) {
    const option = generateCharacterInvolvementChartOption(props.outlineStats);
    if (option) {
      characterInvolvementChart.setOption(option);
    }
  }
};

// 响应式调整
const handleResize = () => {
  progressChart?.resize();
  episodeStatusChart?.resize();
  characterRoleChart?.resize();
  plotPointsChart?.resize();
  wordCountTrendChart?.resize();
  characterInvolvementChart?.resize();
};

// 监听数据变化
watch(
  () => [props.projectStats, props.characterStats, props.outlineStats, props.episodeStats, props.episodes],
  () => {
    updateCharts();
  },
  { deep: true }
);

// 生命周期
onMounted(() => {
  initCharts();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  progressChart?.dispose();
  episodeStatusChart?.dispose();
  characterRoleChart?.dispose();
  plotPointsChart?.dispose();
  wordCountTrendChart?.dispose();
  characterInvolvementChart?.dispose();
});
</script>

<style scoped>
.charts-panel {
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 12px;
  border: none;
  margin-bottom: 16px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.chart-wide {
  height: 350px;
}

/* 响应式 */
@media (max-width: 768px) {
  .chart-container {
    height: 250px;
  }

  .chart-wide {
    height: 300px;
  }
}
</style>
