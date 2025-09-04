<template>
  <div class="tools-analytics">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><TrendCharts /></el-icon>
          使用分析
        </h1>
        <p class="page-description">工具使用数据分析和用户行为洞察</p>
      </div>
      <div class="header-actions">
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="exportData">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 时间范围选择 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="时间范围">
          <el-select v-model="filterForm.period" @change="handlePeriodChange">
            <el-option label="最近7天" value="7d" />
            <el-option label="最近30天" value="30d" />
            <el-option label="最近90天" value="90d" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="filterForm.period === 'custom'" label="自定义时间">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateRangeChange"
          />
        </el-form-item>
        <el-form-item label="工具">
          <el-select v-model="filterForm.toolId" placeholder="选择工具" clearable>
            <el-option v-for="tool in tools" :key="tool.id" :label="tool.name" :value="tool.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ formatNumber(analytics.totalUsage) }}</div>
                <div class="stat-label">总使用次数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon users">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ analytics.uniqueUsers }}</div>
                <div class="stat-label">独立用户</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon time">
                <el-icon><Timer /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ analytics.avgResponseTime }}ms</div>
                <div class="stat-label">平均响应时间</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon success">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ analytics.successRate }}%</div>
                <div class="stat-label">成功率</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 使用趋势图 -->
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <span>使用趋势</span>
          </template>
          <div ref="usageTrendRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 热门工具排行 -->
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span>热门工具排行</span>
          </template>
          <div class="ranking-list">
            <div v-for="(tool, index) in topTools" :key="tool.toolIdentifier" class="ranking-item">
              <div class="rank-number" :class="`rank-${index + 1}`">
                {{ index + 1 }}
              </div>
              <div class="tool-info">
                <div class="tool-name">{{ tool.name || tool.toolIdentifier }}</div>
                <div class="tool-usage">{{ tool.usageCount }} 次使用</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细分析 -->
    <el-row :gutter="20" class="detail-section">
      <!-- 设备分析 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>设备类型分析</span>
          </template>
          <div ref="deviceChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 用户行为分析 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>用户行为分析</span>
          </template>
          <div ref="behaviorChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue';
import {
  TrendCharts,
  Refresh,
  Download,
  DataAnalysis,
  User,
  Timer,
  CircleCheck
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import { analyticsAPI, toolsAPI } from '@/api/admin/tools';

export default {
  name: 'ToolsAnalytics',
  components: {
    TrendCharts,
    Refresh,
    Download,
    DataAnalysis,
    User,
    Timer,
    CircleCheck
  },
  setup() {
    const usageTrendRef = ref(null);
    const deviceChartRef = ref(null);
    const behaviorChartRef = ref(null);

    // 筛选表单
    const filterForm = reactive({
      period: '7d',
      dateRange: null,
      toolId: ''
    });

    // 分析数据
    const analytics = reactive({
      totalUsage: 0,
      uniqueUsers: 0,
      avgResponseTime: 0,
      successRate: 0
    });

    // 设备与行为真实数据
    const deviceStats = ref([]);
    const behaviorStats = ref([]);

    const tools = ref([]);
    const topTools = ref([]);

    // 格式化数字
    const formatNumber = num => {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
      }
      return num.toString();
    };

    // 处理时间范围变化
    const handlePeriodChange = () => {
      if (filterForm.period !== 'custom') {
        filterForm.dateRange = null;
      }
      loadAnalyticsData();
    };

    // 处理自定义日期范围变化
    const handleDateRangeChange = () => {
      loadAnalyticsData();
    };

    // 加载分析数据
    const loadAnalyticsData = async () => {
      try {
        if (filterForm.toolId) {
          const res = await analyticsAPI.getToolUsageStats({
            period: filterForm.period,
            toolId: filterForm.toolId
          });
          const stats = res.data?.data?.stats || {};
          analytics.totalUsage = stats.totalUsage || 0;
          analytics.uniqueUsers = stats.uniqueUsers || 0;
          analytics.avgResponseTime = stats.avgResponseTime || 0;
          analytics.successRate = stats.successRate || 0;
        } else {
          const res = await analyticsAPI.getOverviewStats();
          const data = res.data || {};
          analytics.totalUsage = data.totalUsage || data.weekUsage || data.todayUsage || 0;
          analytics.uniqueUsers = 0;
          analytics.avgResponseTime = 0;
          analytics.successRate = 0;
        }

        const popularRes = await analyticsAPI.getToolUsageStats({ period: filterForm.period });
        topTools.value = (popularRes.data?.data?.popularTools || []).map(t => ({
          toolIdentifier: t.toolIdentifier || t.id || t._id,
          name: t.name,
          usageCount: t.usageCount || t.count || 0
        }));

        const toolsRes = await toolsAPI.getTools({ page: 1, limit: 1000, status: 'active' });
        const list =
          toolsRes.data?.tools || toolsRes.data?.data?.tools || toolsRes.data?.data?.items || [];
        tools.value = list.map(t => ({ id: t.id || t._id || t.identifier, name: t.name }));

        initCharts();
        ElMessage.success('数据已更新');
      } catch (error) {
        ElMessage.error('加载数据失败');
      }
    };

    // 刷新数据
    const refreshData = () => {
      loadAnalyticsData();
    };

    // 导出数据
    const exportData = () => {
      ElMessage.info('导出功能开发中...');
    };

    // 初始化图表
    const initCharts = () => {
      initUsageTrendChart();
      initDeviceChart();
      initBehaviorChart();
    };

    // 使用趋势图
    const initUsageTrendChart = async () => {
      if (!usageTrendRef.value) return;

      const chart = echarts.init(usageTrendRef.value);

      const dates = [];
      const usageData = [];
      const userData = [];

      try {
        if (filterForm.toolId) {
          const res = await analyticsAPI.getToolUsageStats({
            period: filterForm.period,
            toolId: filterForm.toolId
          });
          const trend = res.data?.data?.trend || [];
          trend.forEach(p => {
            dates.push(p.date);
            usageData.push(p.count);
            userData.push(p.uniqueUsers ?? 0);
          });
        } else {
          const popularRes = await analyticsAPI.getToolUsageStats({ period: filterForm.period });
          const top = (popularRes.data?.data?.popularTools || [])[0];
          if (top) {
            const trendRes = await analyticsAPI.getToolUsageStats({
              period: filterForm.period,
              toolId: top.toolIdentifier
            });
            const trend = trendRes.data?.data?.trend || [];
            trend.forEach(p => {
              dates.push(p.date);
              usageData.push(p.count);
              userData.push(p.uniqueUsers ?? 0);
            });
          }
        }
      } catch (e) {}

      if (dates.length === 0) {
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date.toLocaleDateString());
          usageData.push(0);
          userData.push(0);
        }
      }

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['使用次数', '用户数']
        },
        xAxis: {
          type: 'category',
          data: dates
        },
        yAxis: [
          {
            type: 'value',
            name: '使用次数',
            position: 'left'
          },
          {
            type: 'value',
            name: '用户数',
            position: 'right'
          }
        ],
        series: [
          {
            name: '使用次数',
            type: 'line',
            data: usageData,
            smooth: true,
            itemStyle: { color: '#409EFF' }
          },
          {
            name: '用户数',
            type: 'line',
            yAxisIndex: 1,
            data: userData,
            smooth: true,
            itemStyle: { color: '#67C23A' }
          }
        ]
      };

      chart.setOption(option);
    };

    // 设备类型图
    const initDeviceChart = async () => {
      if (!deviceChartRef.value) return;

      const chart = echarts.init(deviceChartRef.value);

      try {
        const overall = await analyticsAPI.getOverallStats({ period: filterForm.period });
        const list = overall?.data?.data?.deviceStats || [];
        const data = list.map(i => ({ value: i.count, name: i.type || '未知' }));

        const option = {
          tooltip: { trigger: 'item' },
          series: [
            {
              type: 'pie',
              radius: '70%',
              data,
              emphasis: {
                itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' }
              }
            }
          ]
        };
        chart.setOption(option);
      } catch (e) {
        chart.setOption({ series: [{ type: 'pie', data: [] }] });
      }
    };

    // 用户行为图（真实数据）
    const initBehaviorChart = async () => {
      if (!behaviorChartRef.value) return;

      const chart = echarts.init(behaviorChartRef.value);

      try {
        const overall = await analyticsAPI.getOverallStats({ period: filterForm.period });
        const list = overall?.data?.data?.behaviorStats || [];
        const labels = list.map(i => i.action || '未知');
        const values = list.map(i => i.count || 0);

        const option = {
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: labels },
          yAxis: { type: 'value' },
          series: [{ data: values, type: 'bar', itemStyle: { color: '#E6A23C' } }]
        };
        chart.setOption(option);
      } catch (e) {
        chart.setOption({
          xAxis: { type: 'category', data: [] },
          series: [{ type: 'bar', data: [] }]
        });
      }
    };

    onMounted(() => {
      loadAnalyticsData();
    });

    return {
      usageTrendRef,
      deviceChartRef,
      behaviorChartRef,
      filterForm,
      analytics,
      tools,
      topTools,
      formatNumber,
      handlePeriodChange,
      handleDateRangeChange,
      refreshData,
      exportData
    };
  }
};
</script>

<style scoped>
.tools-analytics {
  padding: 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
}

/* 统计概览 */
.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stat-icon.total {
  background: #409eff;
}
.stat-icon.users {
  background: #67c23a;
}
.stat-icon.time {
  background: #e6a23c;
}
.stat-icon.success {
  background: #f56c6c;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

/* 图表区域 */
.charts-section,
.detail-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 320px;
}

/* 排行榜 */
.ranking-list {
  max-height: 320px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  margin-right: 12px;
}

.rank-number.rank-1 {
  background: #ffd700;
}
.rank-number.rank-2 {
  background: #c0c0c0;
}
.rank-number.rank-3 {
  background: #cd7f32;
}
.rank-number:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: #909399;
}

.tool-name {
  font-weight: 500;
  color: #303133;
}

.tool-usage {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .stats-overview .el-col {
    margin-bottom: 16px;
  }

  .charts-section .el-col,
  .detail-section .el-col {
    margin-bottom: 16px;
  }
}
</style>
