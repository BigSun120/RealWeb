<template>
  <div class="tools-analytics">
    <section class="page-header">
      <div class="header-text">
        <h1 class="title">
          <el-icon><TrendCharts /></el-icon>
          工具使用统计
        </h1>
        <p class="description">按周期查看工具使用趋势、用户行为及设备分布，洞察产品运营情况。</p>
        <el-alert
          v-if="error"
          type="error"
          :closable="false"
          show-icon
          title="加载数据失败，请稍后再试"
          class="error-tip"
        />
      </div>
      <div class="actions">
        <el-button :loading="loading" type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出报表
        </el-button>
      </div>
    </section>

    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" inline label-width="72px">
        <el-form-item label="时间范围">
          <el-select v-model="filters.period" style="width: 140px" @change="handlePeriodChange">
            <el-option label="近 7 天" value="7d" />
            <el-option label="近 30 天" value="30d" />
            <el-option label="近 90 天" value="90d" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="filters.period === 'custom'" label="自定义区间">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            unlink-panels
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :disabled-date="disabledFuture"
            @change="handleCustomChange"
          />
        </el-form-item>
        <el-form-item label="目标工具">
          <el-select
            v-model="filters.toolId"
            placeholder="全部工具"
            clearable
            filterable
            style="width: 220px"
            @change="handleSelectionChange"
          >
            <el-option
              v-for="tool in toolSelectOptions"
              :key="tool.id"
              :label="tool.name"
              :value="tool.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-skeleton :loading="loading" animated :rows="4">
      <template #default>
        <section class="metrics">
          <el-card v-for="card in summaryCards" :key="card.label" class="metric-card" shadow="hover">
            <div class="metric">
              <div class="metric-icon" :class="card.type">
                <el-icon><component :is="card.icon" /></el-icon>
              </div>
              <div>
                <div class="metric-label">{{ card.label }}</div>
                <div class="metric-value">{{ card.value }}</div>
              </div>
            </div>
          </el-card>
        </section>

        <section class="charts">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>使用趋势</span>
                <small class="sub" v-if="filters.toolId">{{ currentToolName }}</small>
              </div>
            </template>
            <div class="chart-container">
              <el-empty v-if="!trendPoints.length" description="暂无趋势数据" />
              <div v-else ref="usageChartRef" class="chart"></div>
            </div>
          </el-card>

          <div class="side-charts">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <span>设备分布</span>
              </template>
              <div class="chart-container">
                <el-empty v-if="!deviceStats.length" description="暂无数据" />
                <div v-else ref="deviceChartRef" class="chart"></div>
              </div>
            </el-card>

            <el-card class="chart-card" shadow="hover">
              <template #header>
                <span>用户行为</span>
              </template>
              <div class="chart-container">
                <el-empty v-if="!behaviorStats.length" description="暂无数据" />
                <div v-else ref="behaviorChartRef" class="chart"></div>
              </div>
            </el-card>
          </div>
        </section>

        <section class="detail">
          <el-card class="ranking-card" shadow="hover">
            <template #header>
              <span>热门工具</span>
            </template>
            <div v-if="topTools.length" class="ranking-list">
              <div v-for="(item, index) in topTools" :key="item.id" class="ranking-item">
                <div class="rank-index" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
                <div class="rank-info">
                  <div class="rank-name">{{ item.name }}</div>
                  <div class="rank-usage">{{ formatNumber(item.usageCount) }} 次使用</div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无排行数据" />
          </el-card>
        </section>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  TrendCharts,
  Refresh,
  Download,
  DataAnalysis,
  User,
  Timer,
  CircleCheck
} from '@element-plus/icons-vue';

import { analyticsAPI } from '@/api/admin/tools';
import { useEcharts } from '@/composables/useEcharts';
import { useToolsUsageAnalytics } from '@/composables/useToolsAnalytics';

const filters = reactive({
  period: '7d',
  dateRange: [],
  toolId: ''
});

const usageChartRef = ref(null);
const deviceChartRef = ref(null);
const behaviorChartRef = ref(null);

const usageChart = useEcharts(usageChartRef);
const deviceChart = useEcharts(deviceChartRef);
const behaviorChart = useEcharts(behaviorChartRef);

const {
  loading,
  error,
  summary,
  toolOptions,
  topTools,
  trendPoints,
  deviceStats,
  behaviorStats,
  fetchUsage
} = useToolsUsageAnalytics();

const summaryCards = computed(() => [
  {
    label: '总使用次数',
    value: formatNumber(summary.totalUsage),
    icon: DataAnalysis,
    type: 'primary'
  },
  {
    label: '独立用户数',
    value: formatNumber(summary.uniqueUsers),
    icon: User,
    type: 'success'
  },
  {
    label: '平均响应 (ms)',
    value: summary.avgResponseTime,
    icon: Timer,
    type: 'warning'
  },
  {
    label: '成功率',
    value: `${Math.min(Math.max(summary.successRate, 0), 100).toFixed(1)}%`,
    icon: CircleCheck,
    type: 'danger'
  }
]);

const toolSelectOptions = computed(() => toolOptions.value);

const currentToolName = computed(() => {
  if (!filters.toolId) return '全部工具';
  return toolOptions.value.find(item => item.id === filters.toolId)?.name || filters.toolId;
});

const disabledFuture = date => date.getTime() > Date.now();

const loadAnalytics = async ({ allowAutoSelect = true } = {}) => {
  try {
    await fetchUsage({
      period: filters.period,
      toolId: filters.toolId,
      dateRange: filters.period === 'custom' ? filters.dateRange : undefined
    });

    if (allowAutoSelect && !filters.toolId) {
      const firstToolId = topTools.value[0]?.id || toolOptions.value[0]?.id;
      if (firstToolId) {
        filters.toolId = firstToolId;
        await loadAnalytics({ allowAutoSelect: false });
        return;
      }
    }

    updateUsageChart();
    updateDeviceChart();
    updateBehaviorChart();
  } catch (err) {
    console.error('加载分析数据失败:', err);
  }
};

const handleRefresh = async () => {
  await loadAnalytics();
  ElMessage.success('数据已刷新');
};

const handlePeriodChange = () => {
  if (filters.period !== 'custom') {
    filters.dateRange = [];
    loadAnalytics();
  }
};

const handleCustomChange = () => {
  if (filters.period === 'custom') {
    loadAnalytics();
  }
};

const handleSelectionChange = () => {
  loadAnalytics();
};

const handleExport = async () => {
  try {
    const params = {
      period: filters.period,
      toolId: filters.toolId || undefined
    };
    if (filters.period === 'custom' && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0];
      params.endDate = filters.dateRange[1];
    }
    const res = await analyticsAPI.exportReport(params);
    downloadBlob(res.data, 'tools-analytics-report.xlsx');
    ElMessage.success('报表已导出');
  } catch (err) {
    console.error('导出失败:', err);
    ElMessage.error('导出失败，请稍后重试');
  }
};

const updateUsageChart = () => {
  if (!trendPoints.value.length) {
    usageChart.setOption({
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: []
    });
    return;
  }
  usageChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['使用次数', '独立用户'] },
    grid: { left: 40, right: 24, top: 32, bottom: 32 },
    xAxis: {
      type: 'category',
      data: trendPoints.value.map(item => item.date)
    },
    yAxis: [
      { type: 'value', name: '使用次数' },
      { type: 'value', name: '独立用户', position: 'right' }
    ],
    series: [
      {
        name: '使用次数',
        type: 'line',
        smooth: true,
        data: trendPoints.value.map(item => item.count),
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '独立用户',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: trendPoints.value.map(item => item.uniqueUsers),
        itemStyle: { color: '#67C23A' }
      }
    ]
  });
};

const updateDeviceChart = () => {
  if (!deviceStats.value.length) {
    deviceChart.setOption({ series: [] });
    return;
  }
  deviceChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: '70%',
        data: deviceStats.value.map(item => ({
          value: item.value,
          name: item.name
        })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' }
        }
      }
    ]
  });
};

const updateBehaviorChart = () => {
  if (!behaviorStats.value.length) {
    behaviorChart.setOption({ series: [] });
    return;
  }
  behaviorChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 24, top: 24, bottom: 48 },
    xAxis: {
      type: 'category',
      axisLabel: { rotate: 18 },
      data: behaviorStats.value.map(item => item.action)
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: behaviorStats.value.map(item => item.value),
        itemStyle: { color: '#E6A23C' }
      }
    ]
  });
};

watch(
  () => trendPoints.value,
  () => {
    updateUsageChart();
  }
);

watch(
  () => deviceStats.value,
  () => {
    updateDeviceChart();
  }
);

watch(
  () => behaviorStats.value,
  () => {
    updateBehaviorChart();
  }
);

onMounted(async () => {
  await loadAnalytics();
});

function formatNumber(value) {
  const num = Number(value) || 0;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return `${num}`;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
</script>

<style scoped>
.tools-analytics {
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

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-tip {
  margin-top: 12px;
}

.filter-card {
  border-radius: 16px;
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

.metric-icon.warning {
  background: linear-gradient(135deg, #e6a23c, #f3d19e);
}

.metric-icon.danger {
  background: linear-gradient(135deg, #f56c6c, #f89898);
}

.metric-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.metric-value {
  font-size: 26px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.charts {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

@media (max-width: 1280px) {
  .charts {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  border-radius: 18px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.chart-container {
  height: 320px;
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
}

.side-charts {
  display: grid;
  gap: 20px;
}

.detail {
  display: grid;
}

.ranking-card {
  border-radius: 18px;
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
}

.rank-usage {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .tools-analytics {
    padding: 16px;
  }

  .actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
