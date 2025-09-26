<template>
  <div class="analytics-dashboard">
    <!-- 顶部标题栏 -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="dashboard-title">
            <el-icon class="title-icon"><TrendCharts /></el-icon>
            工具使用统计
          </h1>
          <p class="dashboard-subtitle">实时监控工具使用情况，深度分析用户行为数据</p>
        </div>
        <div class="header-actions">
          <el-button
            :loading="loading"
            type="primary"
            size="large"
            class="action-btn primary-btn"
            @click="handleRefresh"
          >
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
          <el-button
            size="large"
            class="action-btn secondary-btn"
            @click="handleExport"
          >
            <el-icon><Download /></el-icon>
            导出报表
          </el-button>
        </div>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        type="error"
        :closable="false"
        show-icon
        title="数据加载失败，请检查网络连接后重试"
        class="error-alert"
      />
    </div>

    <!-- 筛选控制面板 -->
    <div class="filter-panel">
      <div class="filter-content">
        <div class="filter-section">
          <label class="filter-label">时间范围</label>
          <el-select
            v-model="filters.period"
            class="period-select"
            @change="handlePeriodChange"
          >
            <el-option label="近 7 天" value="7d" />
            <el-option label="近 30 天" value="30d" />
            <el-option label="近 90 天" value="90d" />
            <el-option label="自定义区间" value="custom" />
          </el-select>
        </div>

        <div v-if="filters.period === 'custom'" class="filter-section">
          <label class="filter-label">自定义区间</label>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            unlink-panels
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :disabled-date="disabledFuture"
            class="date-picker"
            @change="handleCustomChange"
          />
        </div>

        <div class="filter-section">
          <label class="filter-label">目标工具</label>
          <el-select
            v-model="filters.toolId"
            placeholder="选择工具或查看全部"
            filterable
            class="tool-select"
            @change="handleSelectionChange"
          >
            <el-option
              label="全部工具"
              value=""
            />
            <el-option
              v-for="tool in toolSelectOptions"
              :key="tool.id"
              :label="tool.name"
              :value="tool.id"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 数据加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-skeleton animated>
        <template #template>
          <div class="skeleton-metrics">
            <div v-for="i in 4" :key="i" class="skeleton-metric">
              <el-skeleton-item variant="circle" style="width: 60px; height: 60px;" />
              <div class="skeleton-text">
                <el-skeleton-item variant="text" style="width: 80px;" />
                <el-skeleton-item variant="text" style="width: 120px;" />
              </div>
            </div>
          </div>
          <div class="skeleton-charts">
            <el-skeleton-item variant="rect" style="height: 400px; border-radius: 12px;" />
            <div class="skeleton-side">
              <el-skeleton-item variant="rect" style="height: 190px; border-radius: 12px;" />
              <el-skeleton-item variant="rect" style="height: 190px; border-radius: 12px;" />
            </div>
          </div>
        </template>
      </el-skeleton>
    </div>

    <!-- 主要内容区域 -->
    <div v-else class="dashboard-content">
      <!-- 核心指标卡片 -->
      <div class="metrics-grid">
        <div v-for="card in summaryCards" :key="card.label" class="metric-card">
          <div class="metric-content">
            <div class="metric-icon" :style="{ background: card.color }">
              <el-icon><component :is="card.icon" /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-label">{{ card.label }}</div>
              <div class="metric-value">{{ card.value }}</div>
              <div class="metric-trend" v-if="card.trend">
                <span :class="card.trend > 0 ? 'trend-up' : 'trend-down'">
                  {{ card.trend > 0 ? '↗' : '↘' }} {{ Math.abs(card.trend) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-container">
        <!-- 使用趋势分析 - 独立占据一行 -->
        <div class="trend-chart-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">
                📊 使用趋势分析
                <span v-if="filters.toolId" class="chart-subtitle">{{ currentToolName }}</span>
              </h3>
              <div class="chart-meta">
                <span class="period-info">{{ periodLabel }}</span>
              </div>
            </div>
            <div class="chart-body">
              <div v-if="!trendPoints.length" class="empty-state">
                <div class="icon">📊</div>
                <div class="text">暂无趋势数据，请选择其他时间范围</div>
              </div>
              <div v-else ref="usageChartRef" class="chart-container trend-chart"></div>
            </div>
          </div>
        </div>

        <!-- 设备分布和用户行为 - 并排显示 -->
        <div class="analytics-charts-grid">
          <!-- 设备分布 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">📱 设备分布</h3>
            </div>
            <div class="chart-body">
              <div v-if="!deviceStats.length" class="empty-state device-empty">
                <div class="icon">📱</div>
                <div class="text">暂无设备数据</div>
              </div>
              <div v-else ref="deviceChartRef" class="chart-container device-chart"></div>
            </div>
          </div>

          <!-- 用户行为 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">👤 用户行为</h3>
            </div>
            <div class="chart-body">
              <div v-if="!behaviorStats.length" class="empty-state behavior-empty">
                <div class="icon">👤</div>
                <div class="text">暂无行为数据</div>
              </div>
              <div v-else ref="behaviorChartRef" class="chart-container behavior-chart"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 热门工具排行 -->
      <div class="ranking-section">
        <div class="ranking-card">
          <div class="ranking-header">
            <h3 class="ranking-title">🏆 热门工具排行</h3>
            <span class="ranking-subtitle">基于使用次数统计</span>
          </div>
          <div class="ranking-body">
            <div v-if="topTools.length" class="ranking-list">
              <div
                v-for="(item, index) in topTools.slice(0, 8)"
                :key="item.id"
                class="ranking-item"
              >
                <div class="rank-badge" :class="`rank-${index + 1}`">
                  {{ index + 1 }}
                </div>
                <div class="rank-content">
                  <div class="rank-name">{{ item.name }}</div>
                  <div class="rank-stats">
                    <span class="usage-count">{{ formatNumber(item.usageCount) }}</span>
                    <span class="usage-label">次使用</span>
                  </div>
                </div>
                <div class="rank-progress">
                  <div
                    class="progress-bar"
                    :style="{ width: `${(item.usageCount / topTools[0].usageCount) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <el-empty description="暂无使用数据，请等待用户开始使用工具" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
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
    color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
    trend: 12.5 // 示例增长率
  },
  {
    label: '独立用户数',
    value: formatNumber(summary.uniqueUsers),
    icon: User,
    color: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
    trend: 8.2
  },
  {
    label: '平均响应时间',
    value: summary.avgResponseTime > 1000 ? `${(summary.avgResponseTime / 1000).toFixed(1)}s` : `${summary.avgResponseTime}ms`,
    icon: Timer,
    color: 'linear-gradient(135deg, #54a0ff 0%, #2e86de 100%)',
    trend: -5.1 // 负值表示响应时间减少（好事）
  },
  {
    label: '成功率',
    value: `${Math.min(Math.max(summary.successRate || 95, 0), 100).toFixed(1)}%`,
    icon: CircleCheck,
    color: 'linear-gradient(135deg, #26de81 0%, #20bf6b 100%)',
    trend: 2.3
  }
]);

const periodLabel = computed(() => {
  const periodMap = {
    '7d': '近 7 天',
    '30d': '近 30 天',
    '90d': '近 90 天',
    'custom': '自定义区间'
  };
  return periodMap[filters.period] || '近 7 天';
});

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

    // 默认保持“全部工具”的选择，不自动选择特定工具
    // 用户可以手动选择他们想要分析的具体工具

    // 延迟一下确保数据已经完全更新
    await nextTick();
    setTimeout(() => {
      updateUsageChart();
      updateDeviceChart();
      updateBehaviorChart();
    }, 100);
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

  // 使用nextTick确保DOM已准备好
  nextTick(() => {
    if (!usageChartRef.value) {
      return;
    }

    if (!trendPoints.value.length) {
      const emptyOption = {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: { color: '#999', fontSize: 14 }
        },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: []
      };
      usageChart.setOption(emptyOption, true);
      return;
    }

    const chartData = {
      dates: trendPoints.value.map(item => item.date),
      counts: trendPoints.value.map(item => item.count),
      users: trendPoints.value.map(item => item.uniqueUsers)
    };


    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['使用次数', '独立用户'],
        top: 10
      },
      grid: {
        left: 60,
        right: 60,
        top: 40,
        bottom: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.dates,
        axisPointer: { type: 'shadow' }
      },
      yAxis: [
        {
          type: 'value',
          name: '使用次数',
          position: 'left',
          axisLabel: { formatter: '{value}' }
        },
        {
          type: 'value',
          name: '独立用户',
          position: 'right',
          axisLabel: { formatter: '{value}' }
        }
      ],
      series: [
        {
          name: '使用次数',
          type: 'line',
          smooth: true,
          data: chartData.counts,
          itemStyle: { color: '#409EFF' },
          lineStyle: { width: 3 },
          emphasis: { focus: 'series' }
        },
        {
          name: '独立用户',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: chartData.users,
          itemStyle: { color: '#67C23A' },
          lineStyle: { width: 3 },
          emphasis: { focus: 'series' }
        }
      ]
    };

    usageChart.setOption(option, true);
  });
};

const updateDeviceChart = () => {

  nextTick(() => {
    if (!deviceChartRef.value) {
      return;
    }

    if (!deviceStats.value.length) {
      const emptyOption = {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: { color: '#999', fontSize: 14 }
        },
        series: []
      };
      deviceChart.setOption(emptyOption, true);
      return;
    }

    const chartData = deviceStats.value.map(item => ({
      value: item.value,
      name: item.name === 'unknown' ? '未知设备' : item.name
    }));


    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        itemGap: 20
      },
      series: [
        {
          name: '设备类型',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}: {d}%'
          },
          labelLine: {
            show: true
          },
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };

    deviceChart.setOption(option, true);
  });
};

const updateBehaviorChart = () => {

  nextTick(() => {
    if (!behaviorChartRef.value) {
      return;
    }

    if (!behaviorStats.value.length) {
      const emptyOption = {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: { color: '#999', fontSize: 14 }
        },
        series: []
      };
      behaviorChart.setOption(emptyOption, true);
      return;
    }

    const chartData = {
      actions: behaviorStats.value.map(item => {
        // 翻译行为名称
        const actionMap = {
          'view': '查看',
          'use': '使用',
          'finish_game': '完成游戏',
          'generate-email': '生成邮箱',
          'refresh-mailbox': '刷新邮箱',
          'refresh-all-mailboxes': '刷新所有邮箱'
        };
        return actionMap[item.action] || item.action;
      }),
      values: behaviorStats.value.map(item => item.value)
    };


    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          const param = params[0];
          return `${param.name}<br/>${param.seriesName}: ${param.value}次`;
        }
      },
      grid: {
        left: 60,
        right: 30,
        top: 30,
        bottom: 80,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.actions,
        axisLabel: {
          rotate: 45,
          interval: 0,
          textStyle: { fontSize: 12 }
        },
        axisTick: { alignWithLabel: true }
      },
      yAxis: {
        type: 'value',
        name: '使用次数',
        axisLabel: { formatter: '{value}' }
      },
      series: [
        {
          name: '用户行为',
          type: 'bar',
          data: chartData.values,
          itemStyle: {
            color: '#E6A23C',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: { color: '#D48806' }
          },
          label: {
            show: true,
            position: 'top',
            formatter: '{c}'
          }
        }
      ]
    };

    behaviorChart.setOption(option, true);
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
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}w`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  // 添加千分位分隔符
  return num.toLocaleString('zh-CN');
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
/* 主容器 */
.analytics-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0;
  margin: 0;
}

/* 顶部标题栏 */
.dashboard-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 32px 40px;
  margin-bottom: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: 1400px;
  margin: 0 auto;
  gap: 32px;
}

.header-info {
  flex: 1;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  font-size: 2.2rem;
  color: #3182ce;
}

.dashboard-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  margin: 0;
  font-weight: 400;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.action-btn {
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.primary-btn {
  background: linear-gradient(135deg, #26de81 0%, #20bf6b 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(38, 222, 129, 0.4);
  background: linear-gradient(135deg, #20bf6b 0%, #26de81 100%);
}

.secondary-btn {
  background: white;
  color: #54a0ff;
  border: 2px solid #54a0ff;
  border-radius: 12px;
  font-weight: 600;
}

.secondary-btn:hover {
  background: #54a0ff;
  color: white;
  border-color: #54a0ff;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(84, 160, 255, 0.3);
}

.error-alert {
  margin-top: 24px;
  border-radius: 12px;
}

/* 筛选面板 */
.filter-panel {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 24px 40px;
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
  flex-wrap: wrap;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
  margin: 0;
}

.period-select,
.tool-select {
  min-width: 180px;
  height: 40px;
}

.date-picker {
  width: 280px;
  height: 40px;
}

/* 加载状态 */
.loading-state {
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.skeleton-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.skeleton-metric {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: white;
  border-radius: 16px;
}

.skeleton-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-charts {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.skeleton-side {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 主要内容区域 */
.dashboard-content {
  padding: 32px 40px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 指标卡片网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.metric-card {
  background: white;
  border-radius: 20px;
  padding: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.metric-content {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.metric-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.metric-info {
  flex: 1;
}

.metric-label {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.metric-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 6px 0;
  line-height: 1.1;
  letter-spacing: -0.025em;
}

.metric-trend {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-up {
  color: #10b981;
}

.trend-down {
  color: #ef4444;
}

/* 新的图表容器布局 */
.charts-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 趋势分析区域 - 占据全宽 */
.trend-chart-section {
  width: 100%;
}

/* 设备和行为分析网格 */
.analytics-charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 不同图表的高度控制 */
.trend-chart {
  height: 380px;
}

.device-chart,
.behavior-chart {
  height: 300px;
}

.device-empty,
.behavior-empty {
  height: 300px;
}

.chart-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.chart-header {
  padding: 24px 24px 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.chart-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
  margin-left: 8px;
}

.chart-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.period-info {
  background: #f1f5f9;
  color: #475569;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.chart-body {
  padding: 24px;
}

.chart-container {
  width: 100%;
  position: relative;
}

.chart-container canvas {
  border-radius: 8px;
}

/* 具体图表容器高度 */
.chart-container.trend-chart {
  height: 380px;
}

.chart-container.device-chart,
.chart-container.behavior-chart {
  height: 300px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 12px;
  height: 380px; /* 默认高度 */
}

.empty-state.device-empty,
.empty-state.behavior-empty {
  height: 300px; /* 设备和行为图表的空状态高度 */
}

.empty-state .icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-state .text {
  font-size: 16px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .analytics-charts-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .chart-container.trend-chart {
    height: 300px;
  }

  .chart-container.device-chart,
  .chart-container.behavior-chart {
    height: 250px;
  }

  .empty-state {
    height: 300px;
  }

  .empty-state.device-empty,
  .empty-state.behavior-empty {
    height: 250px;
  }
}

/* 排行榜区域 */
.ranking-section {
  width: 100%;
}

.ranking-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.ranking-header {
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ranking-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
}

.ranking-subtitle {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.ranking-body {
  padding: 24px;
}

.ranking-list {
  display: grid;
  gap: 16px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.ranking-item:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.rank-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  box-shadow: 0 4px 12px rgba(156, 163, 175, 0.4);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
}

.rank-badge:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
}

.rank-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rank-name {
  font-weight: 600;
  color: #1a202c;
  font-size: 15px;
}

.rank-stats {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.usage-count {
  font-weight: 700;
  font-size: 18px;
  color: #3182ce;
}

.usage-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.rank-progress {
  width: 100px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3182ce 0%, #2c5282 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* 响应式设计 */
@media (max-width: 1280px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .skeleton-charts {
    grid-template-columns: 1fr;
  }

  .skeleton-side {
    flex-direction: row;
  }
}

@media (max-width: 768px) {
  .dashboard-header,
  .filter-panel,
  .dashboard-content {
    padding-left: 20px;
    padding-right: 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .filter-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .filter-section {
    width: 100%;
  }

  .period-select,
  .tool-select,
  .date-picker {
    width: 100%;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-title {
    font-size: 2rem;
  }

  .rank-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .rank-progress {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .action-btn {
    padding: 0 16px;
    font-size: 14px;
  }

  .metric-content {
    padding: 20px;
    gap: 16px;
  }

  .metric-icon {
    width: 56px;
    height: 56px;
    font-size: 20px;
  }

  .metric-value {
    font-size: 1.75rem;
  }
}
</style>
