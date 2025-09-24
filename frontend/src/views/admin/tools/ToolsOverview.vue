<template>
  <div class="tools-overview">
    <section class="page-header">
      <div class="header-text">
        <h1 class="title">
          <el-icon><Tools /></el-icon>
          工具数据概览
        </h1>
        <p class="description">掌握工具活跃度、近期操作与系统状态，快速定位需要关注的能力。</p>
        <el-alert
          v-if="error"
          type="error"
          :closable="false"
          show-icon
          title="数据拉取失败，请稍后重试"
          class="error-tip"
        />
      </div>
      <div class="actions">
        <el-select v-model="selectedPeriod" class="period-select" @change="handlePeriodChange">
          <el-option label="近 7 天" value="7d" />
          <el-option label="近 30 天" value="30d" />
          <el-option label="近 90 天" value="90d" />
        </el-select>
        <el-button :loading="loading" type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="goToManagement">
          <el-icon><Setting /></el-icon>
          工具管理
        </el-button>
      </div>
    </section>

    <el-skeleton :loading="loading" animated :rows="4">
      <template #default>
        <section class="metrics">
          <el-card v-for="metric in overviewCards" :key="metric.label" class="metric-card" shadow="hover">
            <div class="metric">
              <div class="metric-icon" :class="metric.type">
                <el-icon><component :is="metric.icon" /></el-icon>
              </div>
              <div class="metric-content">
                <span class="metric-label">{{ metric.label }}</span>
                <span class="metric-value">{{ metric.value }}</span>
                <span v-if="metric.desc" class="metric-desc">{{ metric.desc }}</span>
              </div>
            </div>
          </el-card>
        </section>

        <section class="trend-section">
          <el-card class="trend-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>工具使用趋势</span>
                <div class="header-filter">
                  <el-select
                    v-model="selectedToolId"
                    placeholder="选择工具"
                    filterable
                    clearable
                    class="tool-select"
                  >
                    <el-option
                      v-for="tool in toolSelectOptions"
                      :key="tool.id"
                      :label="tool.name"
                      :value="tool.id"
                    />
                  </el-select>
                </div>
              </div>
            </template>
            <div class="chart-wrap">
              <el-empty v-if="!trendPoints.length && !trendLoading" description="暂无趋势数据" />
              <div v-else ref="usageChartRef" class="chart"></div>
              <div v-if="trendLoading" class="chart-overlay">
                <el-icon class="chart-loading"><Loading /></el-icon>
              </div>
            </div>
          </el-card>

          <el-card class="ranking-card" shadow="hover">
            <template #header>
              <span>热门工具</span>
            </template>
            <div v-if="topTools.length" class="ranking-list">
              <div
                v-for="(item, index) in topTools"
                :key="item.id"
                class="ranking-item"
                :class="{ active: item.id === selectedToolId }"
                @click="selectTool(item.id)"
              >
                <div class="rank-index" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
                <div class="rank-info">
                  <div class="rank-name">{{ item.name }}</div>
                  <div class="rank-usage">{{ formatNumber(item.usageCount) }} 次使用</div>
                </div>
                <div class="rank-progress">
                  <div
                    class="rank-progress-inner"
                    :style="{ width: computeUsageWidth(item.usageCount) }"
                  ></div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无使用数据" />
          </el-card>
        </section>

        <section class="activity-system">
          <el-card class="activity-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>最近操作</span>
                <small class="sub">仅展示最近 {{ activityCount }} 条</small>
              </div>
            </template>
            <el-empty v-if="!activities.length" description="暂无操作记录" />
            <ul v-else class="activity-list">
              <li v-for="item in activities" :key="item.id" class="activity-row">
                <div class="activity-icon" :class="item.type">
                  <el-icon><component :is="activityIcon(item.type)" /></el-icon>
                </div>
                <div>
                  <div class="activity-title">{{ item.title }}</div>
                  <div class="activity-time">{{ formatRelativeTime(item.createdAt) }}</div>
                </div>
              </li>
            </ul>
          </el-card>

          <el-card class="system-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>系统状态</span>
                <small v-if="systemStatus.checkedAt" class="sub">
                  更新于 {{ formatDatetime(systemStatus.checkedAt) }}
                </small>
              </div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="服务器">
                <el-tag :type="systemStatus.serverStatus === 'online' ? 'success' : 'danger'">
                  {{ systemStatus.serverStatus === 'online' ? '在线' : '异常' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="数据库">
                <el-tag :type="systemStatus.databaseStatus === 'online' ? 'success' : 'danger'">
                  {{ systemStatus.databaseStatus === 'online' ? '在线' : '异常' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="内存使用">
                {{ systemStatus.memoryUsage }}
              </el-descriptions-item>
              <el-descriptions-item label="CPU 占用">
                {{ systemStatus.cpuUsage }}%
              </el-descriptions-item>
              <el-descriptions-item label="磁盘占用">
                {{ systemStatus.diskUsage === null ? '—' : `${systemStatus.diskUsage}%` }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </section>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Tools,
  Refresh,
  Setting,
  Collection,
  TrendCharts,
  Trophy,
  User,
  Loading,
  StarFilled,
  InfoFilled
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import { useEcharts } from '@/composables/useEcharts';
import { useToolsOverviewAnalytics } from '@/composables/useToolsAnalytics';

const router = useRouter();

const selectedPeriod = ref('7d');
const selectedToolId = ref('');
const activityCount = 10;
const suppressToolWatch = ref(false);

const usageChartRef = ref(null);
const { setOption, dispose: disposeChart } = useEcharts(usageChartRef);

const {
  loading,
  trendLoading,
  error,
  overviewStats,
  topTools,
  toolOptions,
  activities,
  systemStatus,
  trendPoints,
  fetchOverview,
  fetchTrend
} = useToolsOverviewAnalytics();

const overviewCards = computed(() => [
  {
    icon: Tools,
    label: '总工具数',
    value: formatNumber(overviewStats.totalTools),
    type: 'primary'
  },
  {
    icon: StarFilled,
    label: '启用工具',
    value: formatNumber(overviewStats.activeTools),
    desc: overviewStats.totalTools
      ? `启用率 ${(overviewStats.activeTools / (overviewStats.totalTools || 1) * 100).toFixed(0)}%`
      : '',
    type: 'success'
  },
  {
    icon: TrendCharts,
    label: '累计使用',
    value: formatNumber(overviewStats.totalUsage),
    type: 'orange'
  },
  {
    icon: User,
    label: '活跃用户',
    value: formatNumber(overviewStats.activeUsers),
    type: 'purple'
  }
]);

const toolSelectOptions = computed(() => {
  if (!toolOptions.value.length) return topTools.value;
  return toolOptions.value;
});

const computeUsageWidth = count => {
  const max = Math.max(...topTools.value.map(item => item.usageCount || 0), 1);
  return `${Math.round((count / max) * 100)}%`;
};

const activityIcon = type => {
  const map = {
    create: Collection,
    update: TrendCharts,
    delete: Trophy,
    warning: InfoFilled
  };
  return map[type] || InfoFilled;
};

const updateChart = () => {
  if (!trendPoints.value.length) {
    setOption({
      title: { text: '' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: []
    });
    return;
  }

  setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 24, bottom: 32, top: 32 },
    xAxis: {
      type: 'category',
      data: trendPoints.value.map(item => item.date)
    },
    yAxis: {
      type: 'value',
      name: '使用次数'
    },
    series: [
      {
        name: '使用次数',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        lineStyle: { width: 2 },
        data: trendPoints.value.map(item => item.count)
      }
    ]
  });
};

const loadOverview = async () => {
  try {
    await fetchOverview({ period: selectedPeriod.value, activityLimit: activityCount, toolId: selectedToolId.value || undefined });
    if (!selectedToolId.value && topTools.value.length) {
      suppressToolWatch.value = true;
      selectedToolId.value = topTools.value[0].id;
      suppressToolWatch.value = false;
    }
    updateChart();
  } catch (err) {
    console.error('加载工具概览失败:', err);
  }
};

const handleRefresh = async () => {
  await loadOverview();
  ElMessage.success('数据已刷新');
};

const handlePeriodChange = async () => {
  await loadOverview();
};

const selectTool = id => {
  if (id === selectedToolId.value) return;
  selectedToolId.value = id;
};

watch(
  () => trendPoints.value,
  () => {
    updateChart();
  }
);

watch(
  () => selectedToolId.value,
  async (id, prev) => {
    if (suppressToolWatch.value) return;
    if (!id) {
      disposeChart();
      trendPoints.value = [];
      return;
    }
    try {
      await fetchTrend({ period: selectedPeriod.value, toolId: id });
    } catch (err) {
      console.error('加载趋势失败:', err);
    }
  }
);

onMounted(async () => {
  await loadOverview();
});

const goToManagement = () => {
  router.push('/admin/tools/management');
};

function formatNumber(value) {
  const num = Number(value) || 0;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return `${num}`;
}

function formatDatetime(date) {
  const d = coerceDate(date);
  if (!d) return '—';
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')} ${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}

function formatRelativeTime(date) {
  const d = coerceDate(date);
  if (!d) return '刚刚';
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  return formatDatetime(d);
}

function coerceDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
</script>

<style scoped>
.tools-overview {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: #f7f9fc;
  min-height: 100%;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
}

.header-text {
  max-width: 540px;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
}

.description {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.error-tip {
  margin-top: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.period-select {
  width: 140px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.metric-card {
  border-radius: 16px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.metric-icon.primary {
  background: linear-gradient(135deg, #409eff, #66b1ff);
}

.metric-icon.success {
  background: linear-gradient(135deg, #67c23a, #95d475);
}

.metric-icon.orange {
  background: linear-gradient(135deg, #e6a23c, #f3d19e);
}

.metric-icon.purple {
  background: linear-gradient(135deg, #a56de2, #c69af7);
}

.metric-content {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.metric-value {
  font-size: 26px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.1;
}

.metric-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.trend-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

@media (max-width: 1200px) {
  .trend-section {
    grid-template-columns: 1fr;
  }
}

.trend-card,
.ranking-card {
  border-radius: 18px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header .sub {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.tool-select {
  width: 220px;
}

.chart-wrap {
  position: relative;
  height: 360px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.65);
}

.chart-loading {
  font-size: 32px;
  color: var(--el-color-primary);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--el-fill-color-blank);
  cursor: pointer;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: var(--el-color-primary-light-9);
}

.ranking-item.active {
  background: var(--el-color-primary-light-8);
}

.rank-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
}

.rank-index.rank-1 {
  background: #ffb300;
}

.rank-index.rank-2 {
  background: #909399;
}

.rank-index.rank-3 {
  background: #c46f2e;
}

.rank-index:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: var(--el-color-info);
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-weight: 600;
  line-height: 1.3;
}

.rank-usage {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.rank-progress {
  width: 80px;
  height: 6px;
  border-radius: 999px;
  background: rgba(64, 158, 255, 0.15);
  overflow: hidden;
}

.rank-progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #66b1ff);
}

.activity-system {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}

@media (max-width: 1200px) {
  .activity-system {
    grid-template-columns: 1fr;
  }
}

.activity-card,
.system-card {
  border-radius: 18px;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.activity-icon.create {
  background: #67c23a;
}

.activity-icon.update {
  background: #409eff;
}

.activity-icon.delete {
  background: #f56c6c;
}

.activity-icon.warning {
  background: #e6a23c;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.system-card .el-descriptions {
  --el-descriptions-border-color: var(--el-border-color);
  border-radius: 12px;
}

@media (max-width: 768px) {
  .tools-overview {
    padding: 16px;
  }

  .actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .tool-select {
    width: 100%;
  }
}
</style>

