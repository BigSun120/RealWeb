<template>
  <div class="admin-dashboard">
    <!-- 页面标题 -->
    <div class="dashboard-header">
      <h1>仪表板</h1>
      <p>欢迎回来，{{ userStore.user && userStore.user.username || '管理员' }}！这里是您的管理概览。</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <StatsCard
        title="总用户数"
        :value="stats.totalUsers"
        icon="User"
        type="primary"
        :trend="stats.trends && stats.trends.userGrowth"
        :description="getTrendDescription(stats.trends && stats.trends.userGrowth, '用户增长')"
        :loading="statsLoading"
      />

      <StatsCard
        title="文章总数"
        :value="stats.totalArticles"
        icon="Document"
        type="success"
        :trend="stats.trends && stats.trends.articleGrowth"
        :description="getTrendDescription(stats.trends && stats.trends.articleGrowth, '文章增长')"
        :loading="statsLoading"
      />

      <StatsCard
        title="总浏览量"
        :value="stats.totalViews"
        icon="View"
        type="warning"
        :trend="stats.trends && stats.trends.viewGrowth"
        :description="getTrendDescription(stats.trends && stats.trends.viewGrowth, '浏览量增长')"
        :loading="statsLoading"
      />

      <StatsCard
        title="活跃用户"
        :value="stats.activeUsers"
        icon="UserFilled"
        type="info"
        :trend="stats.trends && stats.trends.activeUserGrowth"
        :description="getTrendDescription(stats.trends && stats.trends.activeUserGrowth, '活跃用户')"
        :loading="statsLoading"
      />
    </div>

    <!-- 内容区域 -->
    <div class="dashboard-content">
      <el-row :gutter="24">
        <!-- 最近活动 -->
        <el-col :lg="12" :md="24" :sm="24">
          <RecentActivity />
        </el-col>

        <!-- 系统状态 -->
        <el-col :lg="12" :md="24" :sm="24">
          <SystemStatus />
        </el-col>
      </el-row>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <el-card shadow="hover">
        <template #header>
          <span class="card-title">快速操作</span>
        </template>

        <div class="actions-grid">
          <el-button
            type="primary"
            :icon="EditPen"
            @click="$router.push('/articles/new')"
          >
            写文章
          </el-button>

          <el-button
            type="success"
            :icon="User"
            @click="$router.push('/admin/users')"
          >
            用户管理
          </el-button>

          <el-button
            type="warning"
            :icon="Setting"
            @click="$router.push('/admin/settings')"
          >
            系统设置
          </el-button>

          <el-button
            type="info"
            :icon="Monitor"
            @click="$router.push('/admin/monitoring')"
          >
            系统监控
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import {
  EditPen,
  User,
  Setting,
  Monitor,
  Document,
  View as ViewIcon,
  UserFilled
} from '@element-plus/icons-vue';

// 导入组件
import StatsCard from '@/components/admin/dashboard/StatsCard.vue';
import RecentActivity from '@/components/admin/dashboard/RecentActivity.vue';
import SystemStatus from '@/components/admin/dashboard/SystemStatus.vue';

// 导入API
import { getDashboardStats } from '@/api/admin';

export default {
  name: 'AdminDashboard',
  components: {
    StatsCard,
    RecentActivity,
    SystemStatus,
    EditPen,
    User,
    Setting,
    Monitor,
    Document,
    ViewIcon,
    UserFilled
  },
  setup() {
    const userStore = useUserStore();

    const statsLoading = ref(false);
    const stats = ref({
      totalUsers: 0,
      totalArticles: 0,
      totalViews: 0,
      activeUsers: 0,
      trends: null,
      details: null
    });

    // 生成趋势描述
    const getTrendDescription = (trend, label) => {
      if (!trend) return `${label}数据`;

      const direction = trend.isPositive ? '增长' : '下降';
      const symbol = trend.isPositive ? '+' : '';
      return `${trend.period}${direction} ${symbol}${trend.value}%`;
    };

    // 加载统计数据
    const loadStats = async () => {
      try {
        statsLoading.value = true;
        const response = await getDashboardStats();
        stats.value = response.data.data;
      } catch (error) {
        console.error('加载统计数据失败:', error);
        ElMessage.error('加载统计数据失败');
      } finally {
        statsLoading.value = false;
      }
    };

    onMounted(() => {
      loadStats();
    });

    return {
      userStore,
      statsLoading,
      stats,
      getTrendDescription
    };
  }
};
</script>

<style scoped>
.admin-dashboard {
  padding: 0;
}

.dashboard-header {
  margin-bottom: 32px;
}

.dashboard-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
}

.dashboard-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.dashboard-content {
  margin-bottom: 32px;
}

.dashboard-content .el-col {
  margin-bottom: 24px;
}

.quick-actions {
  margin-bottom: 32px;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.actions-grid .el-button {
  height: 48px;
  font-size: 14px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-header h1 {
    font-size: 24px;
  }

  .dashboard-header p {
    font-size: 14px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .actions-grid .el-button {
    height: 40px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
