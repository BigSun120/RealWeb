<template>
  <div class="prompt-statistics" v-loading="loading">
    <!-- 统计概览卡片 -->
    <div class="stats-overview">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-item">
              <el-icon class="stat-icon" color="#409EFF"><TrendCharts /></el-icon>
              <div class="stat-content">
                <div class="stat-label">总使用次数</div>
                <div class="stat-value">{{ statistics.totalUsage || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-item">
              <el-icon class="stat-icon" color="#F56C6C"><Star /></el-icon>
              <div class="stat-content">
                <div class="stat-label">平均评分</div>
                <div class="stat-value">
                  {{ statistics.averageRating ? statistics.averageRating.toFixed(1) : '0.0' }}
                  <span class="stat-unit">星</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-item">
              <el-icon class="stat-icon" color="#67C23A"><SuccessFilled /></el-icon>
              <div class="stat-content">
                <div class="stat-label">有效次数</div>
                <div class="stat-value">{{ statistics.effectiveCount || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 使用趋势图表 -->
    <el-card class="chart-card" v-if="!loading">
      <template #header>
        <div class="card-header">
          <span>使用趋势</span>
          <el-radio-group v-model="trendDays" size="small" @change="loadStatistics">
            <el-radio-button :label="7">7天</el-radio-button>
            <el-radio-button :label="30">30天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      
      <div class="chart-container" ref="chartContainer">
        <div v-if="hasNoData" class="no-data">
          <el-empty description="暂无使用数据" :image-size="120" />
        </div>
        <canvas v-else ref="chartCanvas"></canvas>
      </div>
    </el-card>

    <!-- 最近使用记录 -->
    <el-card class="logs-card">
      <template #header>
        <span>最近使用记录</span>
      </template>
      
      <div class="logs-list">
        <el-empty v-if="recentLogs.length === 0" description="暂无使用记录" :image-size="100" />
        
        <div v-else class="log-item" v-for="log in recentLogs" :key="log._id">
          <div class="log-header">
            <div class="log-time">
              <el-icon><Clock /></el-icon>
              {{ formatDate(log.usedAt) }}
            </div>
            <el-rate 
              v-if="log.feedback && log.feedback.rating" 
              :model-value="log.feedback.rating" 
              disabled 
              size="small"
            />
          </div>
          
          <div class="log-variables" v-if="log.variables && Object.keys(log.variables).length > 0">
            <el-tag 
              v-for="(value, key) in log.variables" 
              :key="key" 
              size="small" 
              effect="plain"
              class="variable-tag"
            >
              {{ key }}: {{ value }}
            </el-tag>
          </div>
          
          <div class="log-feedback" v-if="log.feedback && log.feedback.comment">
            <div class="feedback-label">
              <el-icon><ChatDotRound /></el-icon>
              反馈：
            </div>
            <div class="feedback-content">{{ log.feedback.comment }}</div>
          </div>
          
          <el-tag 
            v-if="log.feedback && log.feedback.isEffective !== null" 
            :type="log.feedback.isEffective ? 'success' : 'danger'"
            size="small"
            class="effective-tag"
          >
            {{ log.feedback.isEffective ? '有效' : '无效' }}
          </el-tag>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch, inject } from 'vue';
import { ElMessage } from 'element-plus';
import {
  TrendCharts,
  Star,
  SuccessFilled,
  Clock,
  ChatDotRound
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import Chart from 'chart.js/auto';

const promptService = inject('promptService');

const props = defineProps({
  promptId: {
    type: String,
    required: true
  }
});

const loading = ref(false);
const trendDays = ref(7);
const chartCanvas = ref(null);
const chartContainer = ref(null);
let chartInstance = null;

const statistics = reactive({
  totalUsage: 0,
  averageRating: 0,
  effectiveCount: 0,
  usageTrend: [],
  variableStats: {}
});

const recentLogs = ref([]);
const hasNoData = ref(false);

// 监听 promptId 变化
watch(() => props.promptId, (newId) => {
  if (newId) {
    loadStatistics();
  }
}, { immediate: true });

// 加载统计数据
async function loadStatistics() {
  if (!props.promptId) return;
  
  try {
    loading.value = true;
    const data = await promptService.getStatistics(props.promptId, {
      days: trendDays.value
    });
    
    // 更新统计数据
    Object.assign(statistics, {
      totalUsage: data.totalUsage || 0,
      averageRating: data.averageRating || 0,
      effectiveCount: data.effectiveCount || 0,
      usageTrend: data.usageTrend || [],
      variableStats: data.variableStats || {}
    });
    
    recentLogs.value = data.recentLogs || [];
    hasNoData.value = statistics.totalUsage === 0;
    
    // 等待 DOM 更新后渲染图表
    await nextTick();
    renderChart();
  } catch (error) {
    console.error('加载统计数据失败:', error);
    ElMessage.error('加载统计数据失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// 渲染图表
function renderChart() {
  if (!chartCanvas.value || hasNoData.value) return;
  
  // 销毁旧图表
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  
  // 准备图表数据
  const labels = [];
  const data = [];
  
  // 生成日期范围
  const today = dayjs();
  for (let i = trendDays.value - 1; i >= 0; i--) {
    const date = today.subtract(i, 'day').format('YYYY-MM-DD');
    labels.push(dayjs(date).format('MM-DD'));
    
    // 查找该日期的使用次数
    const trendItem = statistics.usageTrend.find(item => item._id === date);
    data.push(trendItem ? trendItem.count : 0);
  }
  
  // 创建图表
  const ctx = chartCanvas.value.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '使用次数',
        data,
        borderColor: '#409EFF',
        backgroundColor: 'rgba(64, 158, 255, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: (context) => {
              return `使用次数: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// 格式化日期
function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

// 组件卸载时销毁图表
onMounted(() => {
  loadStatistics();
});
</script>

<style scoped lang="scss">
.prompt-statistics {
  .stats-overview {
    margin-bottom: 20px;
    
    .stat-card {
      .stat-item {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .stat-icon {
          font-size: 40px;
          opacity: 0.8;
        }
        
        .stat-content {
          flex: 1;
          
          .stat-label {
            font-size: 14px;
            color: #909399;
            margin-bottom: 8px;
          }
          
          .stat-value {
            font-size: 28px;
            font-weight: 600;
            color: #303133;
            
            .stat-unit {
              font-size: 16px;
              font-weight: 400;
              color: #606266;
              margin-left: 4px;
            }
          }
        }
      }
    }
  }
  
  .chart-card {
    margin-bottom: 20px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .chart-container {
      height: 300px;
      position: relative;
      
      .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      canvas {
        max-height: 300px;
      }
    }
  }
  
  .logs-card {
    .logs-list {
      max-height: 400px;
      overflow-y: auto;
      
      .log-item {
        padding: 16px;
        border: 1px solid #ebeef5;
        border-radius: 8px;
        margin-bottom: 12px;
        background: #fafafa;
        transition: all 0.3s;
        
        &:hover {
          background: #f5f7fa;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          
          .log-time {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #606266;
            
            .el-icon {
              font-size: 14px;
            }
          }
        }
        
        .log-variables {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
          
          .variable-tag {
            font-size: 12px;
          }
        }
        
        .log-feedback {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          padding: 8px;
          background: #fff;
          border-radius: 4px;
          
          .feedback-label {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            color: #606266;
            white-space: nowrap;
          }
          
          .feedback-content {
            flex: 1;
            font-size: 13px;
            color: #303133;
            line-height: 1.5;
          }
        }
        
        .effective-tag {
          margin-top: 4px;
        }
      }
    }
  }
}
</style>
