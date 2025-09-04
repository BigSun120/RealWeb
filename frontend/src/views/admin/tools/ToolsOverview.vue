<template>
  <div class="tools-overview">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><Tools /></el-icon>
          工具管理概览
        </h1>
        <p class="page-description">工具箱使用统计和管理概览</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="goToManagement">
          <el-icon><Setting /></el-icon>
          工具管理
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><Tools /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ overviewStats.totalTools }}</div>
                <div class="stat-label">总工具数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon active">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ overviewStats.activeTools }}</div>
                <div class="stat-label">已上线</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon usage">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ formatNumber(overviewStats.totalUsage) }}</div>
                <div class="stat-label">总使用次数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6" :md="6" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon users">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ overviewStats.activeUsers }}</div>
                <div class="stat-label">活跃用户</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表和数据 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 使用趋势图 -->
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>使用趋势</span>
              <el-select v-model="usagePeriod" size="small" @change="loadUsageChart">
                <el-option label="最近7天" value="7d" />
                <el-option label="最近30天" value="30d" />
                <el-option label="最近90天" value="90d" />
              </el-select>
            </div>
          </template>
          <div class="chart-container" ref="usageChartRef"></div>
        </el-card>
      </el-col>

      <!-- 工具排行榜 -->
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <span>热门工具排行</span>
          </template>
          <div class="tool-ranking">
            <div v-for="(tool, index) in topTools" :key="tool.id" class="ranking-item">
              <div class="rank-number" :class="`rank-${index + 1}`">
                {{ index + 1 }}
              </div>
              <div class="tool-info">
                <div class="tool-name">{{ tool.name }}</div>
                <div class="tool-usage">{{ formatNumber(tool.usageCount) }} 次使用</div>
              </div>
              <div class="usage-bar">
                <div
                  class="usage-progress"
                  :style="{ width: `${(tool.usageCount / topTools[0].usageCount) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近活动和系统状态 -->
    <el-row :gutter="20" class="activity-section">
      <!-- 最近活动 -->
      <el-col :xs="24" :lg="14">
        <el-card class="activity-card">
          <template #header>
            <span>最近活动</span>
          </template>
          <div class="activity-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon" :class="activity.type">
                <el-icon>
                  <component :is="getActivityIcon(activity.type)" />
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-time">{{ formatTime(activity.createdAt) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 系统状态 -->
      <el-col :xs="24" :lg="10">
        <el-card class="system-status-card">
          <template #header>
            <span>系统状态</span>
          </template>
          <div class="status-list">
            <div class="status-item">
              <div class="status-label">服务器状态</div>
              <el-tag :type="systemStatus.serverStatus === 'online' ? 'success' : 'danger'">
                {{ systemStatus.serverStatus === 'online' ? '在线' : '离线' }}
              </el-tag>
            </div>
            <div class="status-item">
              <div class="status-label">数据库连接</div>
              <el-tag :type="systemStatus.databaseStatus === 'online' ? 'success' : 'danger'">
                {{ systemStatus.databaseStatus === 'online' ? '正常' : '异常' }}
              </el-tag>
            </div>
            <div class="status-item">
              <div class="status-label">内存使用</div>
              <span class="status-value">{{ systemStatus.memoryUsage }}</span>
            </div>
            <div class="status-item">
              <div class="status-label">CPU 使用率</div>
              <span class="status-value">{{ systemStatus.cpuUsage }}%</span>
            </div>
            <div class="status-item">
              <div class="status-label">磁盘使用率</div>
              <span class="status-value"
                >{{ systemStatus.diskUsage === null ? '--' : systemStatus.diskUsage + '%' }}
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  Tools,
  Refresh,
  Setting,
  CircleCheck,
  TrendCharts,
  User,
  Plus,
  Edit,
  Delete,
  Warning
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';

export default {
  name: 'ToolsOverview',
  components: {
    Tools,
    Refresh,
    Setting,
    CircleCheck,
    TrendCharts,
    User,
    Plus,
    Edit,
    Delete,
    Warning
  },
  setup() {
    const router = useRouter();
    const usageChartRef = ref(null);
    const usagePeriod = ref('7d');

    // 概览统计数据
    const overviewStats = reactive({
      totalTools: 0,
      activeTools: 0,
      totalUsage: 0,
      activeUsers: 0
    });

    // 热门工具排行
    const topTools = ref([]);

    // 最近活动
    const recentActivities = ref([]);

    // 系统状态
    const systemStatus = reactive({
      serverStatus: 'online',
      databaseStatus: 'online',
      memoryUsage: '--',
      cpuUsage: 0,
      diskUsage: null
    });

    // 格式化数字
    const formatNumber = num => {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
      }
      return num.toString();
    };

    // 格式化时间
    const formatTime = date => {
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);

      if (minutes < 60) {
        return `${minutes}分钟前`;
      } else if (hours < 24) {
        return `${hours}小时前`;
      } else {
        return date.toLocaleDateString();
      }
    };

    // 获取活动图标
    const getActivityIcon = type => {
      const iconMap = {
        create: 'Plus',
        update: 'Edit',
        delete: 'Delete',
        warning: 'Warning'
      };
      return iconMap[type] || 'Plus';
    };

    // 拉取真实数据并绑定
    const fetchRealData = async () => {
      try {
        const { analyticsAPI, toolsAPI } = await import('@/api/admin/tools');
        const { getSystemStatus, getRecentActivity } = await import('@/api/admin');

        // 概览统计
        const overviewRes = await analyticsAPI.getOverviewStats();
        const overview = overviewRes.data?.data || {};
        overviewStats.totalTools = overview.totalTools || 0;
        overviewStats.activeTools = overview.activeTools || 0;
        // 暂用近7天使用次数作为总使用次数展示
        overviewStats.totalUsage = overview.weekUsage ?? overview.todayUsage ?? 0;
        overviewStats.activeUsers = overview.activeUsers || 0;

        // 热门工具（用于排行榜与趋势图Top1）
        const popularRes = await analyticsAPI.getToolUsageStats({ period: usagePeriod.value });
        const popularTools = popularRes.data?.data?.popularTools || [];

        // 构建工具名称映射，尽量显示名称
        let nameMap = {};
        try {
          const toolsRes = await toolsAPI.getTools({ page: 1, pageSize: 1000 });
          const list =
            toolsRes.data?.data?.items ||
            toolsRes.data?.data?.list ||
            toolsRes.data?.data?.docs ||
            [];
          list.forEach(t => {
            const id = t._id || t.id || t.identifier;
            if (id) nameMap[id] = t.name || t.title || t.identifier || t.slug || '';
          });
        } catch (e) {
          // 忽略
        }

        topTools.value = popularTools.map(t => {
          const id = t.toolIdentifier || t.id || t._id;
          const name = t.name || nameMap[id] || (id ? String(id) : '未知工具');
          const count = t.count || t.usageCount || t.total || 0;
          return { id, name, usageCount: count };
        });

        // 最近活动
        const actRes = await getRecentActivity(10);
        recentActivities.value = actRes.data?.data?.activities || [];

        // 系统状态
        const sysRes = await getSystemStatus();
        const sys = sysRes.data?.data || {};
        const used = sys.memory?.used || 0;
        const total = sys.memory?.total || 0;
        const percent = total ? Math.round((used / total) * 100) : 0;
        systemStatus.serverStatus = sys.serverStatus || 'online';
        systemStatus.databaseStatus = sys.databaseStatus || 'online';
        systemStatus.memoryUsage = total
          ? `${(used / 1024 / 1024).toFixed(0)}MB / ${(total / 1024 / 1024).toFixed(0)}MB (${percent}%)`
          : '--';
        systemStatus.cpuUsage = sys.cpuUsage ?? 0;
        systemStatus.diskUsage = sys.diskUsage ?? null;
      } catch (err) {
        console.error('获取工具概览数据失败:', err);
      }
    };
    // 加载使用趋势图表
    const loadUsageChart = async () => {
      await nextTick();
      if (!usageChartRef.value) return;

      const chart = echarts.init(usageChartRef.value);

      // 使用真实数据：选取热门工具Top1的趋势数据
      let dates = [];
      let usageData = [];
      try {
        if (topTools.value.length > 0) {
          const { analyticsAPI } = await import('@/api/admin/tools');
          const res = await analyticsAPI.getToolUsageStats({
            period: usagePeriod.value,
            toolId: topTools.value[0].id
          });
          const trend = res.data?.data?.trend || [];
          dates = trend.map(i => i.date);
          usageData = trend.map(i => i.count);
        }
      } catch (e) {
        dates = [];
        usageData = [];
      }

      const option = {
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: dates
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: usageData,
            type: 'line',
            smooth: true,
            areaStyle: {
              opacity: 0.3
            }
          }
        ]
      };

      chart.setOption(option);
    };

    // 刷新数据
    const refreshData = async () => {
      try {
        await fetchRealData();
        await loadUsageChart();
        ElMessage.success('数据已刷新');
      } catch (e) {
        console.error('刷新失败:', e);
        ElMessage.error('刷新失败');
      }
    };

    // 跳转到工具管理
    const goToManagement = () => {
      router.push('/admin/tools/management');
    };

    onMounted(async () => {
      await fetchRealData();
      await loadUsageChart();
    });

    return {
      usageChartRef,
      usagePeriod,
      overviewStats,
      topTools,
      recentActivities,
      systemStatus,
      formatNumber,
      formatTime,
      getActivityIcon,
      loadUsageChart,
      refreshData,
      goToManagement
    };
  }
};
</script>

<style scoped>
.tools-overview {
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
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 统计卡片 */
.stats-cards {
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
  font-size: 24px;
  color: white;
  margin-right: 15px;
}

.stat-icon.total {
  background: #409eff;
}
.stat-icon.active {
  background: #67c23a;
}
.stat-icon.usage {
  background: #e6a23c;
}
.stat-icon.users {
  background: #f56c6c;
}

.stat-number {
  font-size: 24px;
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
.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
}

/* 工具排行榜 */
.tool-ranking {
  height: 320px;
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

.tool-info {
  flex: 1;
  margin-right: 12px;
}

.tool-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.tool-usage {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.usage-bar {
  width: 60px;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.usage-progress {
  height: 100%;
  background: #409eff;
  transition: width 0.3s;
}

/* 活动区域 */
.activity-section {
  margin-bottom: 20px;
}

.activity-card,
.system-status-card {
  height: 300px;
}

.activity-list {
  height: 240px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
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
  color: #303133;
}

.activity-time {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* 系统状态 */
.status-list {
  padding: 20px 0;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-size: 14px;
  color: #606266;
}

.status-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .chart-card {
    height: 300px;
  }

  .chart-container {
    height: 220px;
  }

  .activity-card,
  .system-status-card {
    height: auto;
    margin-bottom: 20px;
  }

  .activity-list {
    height: auto;
    max-height: 200px;
  }
}
</style>
