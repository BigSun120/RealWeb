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
            <el-option
              v-for="tool in tools"
              :key="tool.id"
              :label="tool.name"
              :value="tool.id"
            />
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
            <div 
              v-for="(tool, index) in topTools" 
              :key="tool.toolIdentifier"
              class="ranking-item"
            >
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
import { ref, reactive, onMounted } from 'vue'
import { 
  TrendCharts, Refresh, Download, DataAnalysis, User, Timer, CircleCheck
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

export default {
  name: 'ToolsAnalytics',
  components: {
    TrendCharts, Refresh, Download, DataAnalysis, User, Timer, CircleCheck
  },
  setup() {
    const usageTrendRef = ref(null)
    const deviceChartRef = ref(null)
    const behaviorChartRef = ref(null)

    // 筛选表单
    const filterForm = reactive({
      period: '7d',
      dateRange: null,
      toolId: ''
    })

    // 分析数据
    const analytics = reactive({
      totalUsage: 15420,
      uniqueUsers: 1234,
      avgResponseTime: 245,
      successRate: 99.2
    })

    const tools = ref([])
    const topTools = ref([
      { toolIdentifier: 'json-formatter', name: 'JSON格式化', usageCount: 3420 },
      { toolIdentifier: 'image-compressor', name: '图片压缩', usageCount: 2890 },
      { toolIdentifier: 'color-picker', name: '颜色选择器', usageCount: 2156 },
      { toolIdentifier: 'qr-generator', name: '二维码生成', usageCount: 1876 },
      { toolIdentifier: 'timestamp-converter', name: '时间戳转换', usageCount: 1234 }
    ])

    // 格式化数字
    const formatNumber = (num) => {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w'
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k'
      }
      return num.toString()
    }

    // 处理时间范围变化
    const handlePeriodChange = () => {
      if (filterForm.period !== 'custom') {
        filterForm.dateRange = null
      }
      loadAnalyticsData()
    }

    // 处理自定义日期范围变化
    const handleDateRangeChange = () => {
      loadAnalyticsData()
    }

    // 加载分析数据
    const loadAnalyticsData = async () => {
      try {
        // TODO: 调用API获取真实数据
        ElMessage.success('数据已更新')
        initCharts()
      } catch (error) {
        ElMessage.error('加载数据失败')
      }
    }

    // 刷新数据
    const refreshData = () => {
      loadAnalyticsData()
    }

    // 导出数据
    const exportData = () => {
      ElMessage.info('导出功能开发中...')
    }

    // 初始化图表
    const initCharts = () => {
      initUsageTrendChart()
      initDeviceChart()
      initBehaviorChart()
    }

    // 使用趋势图
    const initUsageTrendChart = () => {
      if (!usageTrendRef.value) return

      const chart = echarts.init(usageTrendRef.value)
      
      const dates = []
      const usageData = []
      const userData = []
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toLocaleDateString())
        usageData.push(Math.floor(Math.random() * 1000) + 500)
        userData.push(Math.floor(Math.random() * 200) + 100)
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
      }

      chart.setOption(option)
    }

    // 设备类型图
    const initDeviceChart = () => {
      if (!deviceChartRef.value) return

      const chart = echarts.init(deviceChartRef.value)
      
      const option = {
        tooltip: {
          trigger: 'item'
        },
        series: [
          {
            type: 'pie',
            radius: '70%',
            data: [
              { value: 1048, name: '桌面端' },
              { value: 735, name: '移动端' },
              { value: 580, name: '平板端' },
              { value: 484, name: '其他' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }

      chart.setOption(option)
    }

    // 用户行为图
    const initBehaviorChart = () => {
      if (!behaviorChartRef.value) return

      const chart = echarts.init(behaviorChartRef.value)
      
      const option = {
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: ['查看', '使用', '收藏', '分享', '下载']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: [820, 932, 301, 234, 290],
            type: 'bar',
            itemStyle: {
              color: '#E6A23C'
            }
          }
        ]
      }

      chart.setOption(option)
    }

    onMounted(() => {
      loadAnalyticsData()
    })

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
    }
  }
}
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

.stat-icon.total { background: #409EFF; }
.stat-icon.users { background: #67C23A; }
.stat-icon.time { background: #E6A23C; }
.stat-icon.success { background: #F56C6C; }

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

.rank-number.rank-1 { background: #FFD700; }
.rank-number.rank-2 { background: #C0C0C0; }
.rank-number.rank-3 { background: #CD7F32; }
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
