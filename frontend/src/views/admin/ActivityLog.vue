<template>
  <div class="activity-log">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>活动日志</h1>
      <p>查看系统中的所有用户活动和操作记录</p>
    </div>

    <!-- 筛选和搜索 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item label="活动类型">
          <el-select
            v-model="filterForm.type"
            placeholder="选择活动类型"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option label="用户注册" value="user_register" />
            <el-option label="用户登录" value="user_login" />
            <el-option label="文章发布" value="article_publish" />
            <el-option label="文章编辑" value="article_edit" />
            <el-option label="管理操作" value="admin_action" />
            <el-option label="系统事件" value="system_event" />
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 350px"
          />
        </el-form-item>

        <el-form-item label="用户搜索">
          <el-input
            v-model="filterForm.username"
            placeholder="输入用户名"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleFilter">
            <el-icon><Search /></el-icon>
            筛选
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出日志
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 活动统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="今日活动" :value="stats.todayCount" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="本周活动" :value="stats.weekCount" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="活跃用户" :value="stats.activeUsers" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="总活动数" :value="stats.totalCount" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 活动列表 -->
    <el-card class="activity-list-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">活动记录</span>
          <div class="header-actions">
            <el-button-group>
              <el-button
                :type="viewMode === 'list' ? 'primary' : ''"
                @click="viewMode = 'list'"
              >
                <el-icon><List /></el-icon>
                列表视图
              </el-button>
              <el-button
                :type="viewMode === 'timeline' ? 'primary' : ''"
                @click="viewMode = 'timeline'"
              >
                <el-icon><Clock /></el-icon>
                时间线视图
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" v-loading="loading">
        <el-table :data="activityList" stripe>
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              <div class="time-info">
                <div class="date">{{ formatDate(row.createdAt) }}</div>
                <div class="time">{{ formatTime(row.createdAt) }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getActivityTypeColor(row.type)" size="small">
                {{ getActivityTypeName(row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="用户" width="150">
            <template #default="{ row }">
              <div class="user-info">
                <el-avatar :src="row.user?.avatar" :size="24">
                  {{ row.user?.username?.charAt(0) }}
                </el-avatar>
                <span class="username">{{ row.user?.username || '系统' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="活动描述" min-width="300">
            <template #default="{ row }">
              <div class="activity-description">
                <div class="title">{{ row.title }}</div>
                <div class="description">{{ row.description }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="IP地址" width="120">
            <template #default="{ row }">
              {{ row.ipAddress || '--' }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="primary" size="small" text @click="viewDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            :current-page="pagination.page"
            :page-size="pagination.limit"
            :page-sizes="[20, 50, 100, 200]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>

      <!-- 时间线视图 -->
      <div v-if="viewMode === 'timeline'" v-loading="loading" class="timeline-view">
        <el-timeline>
          <el-timeline-item
            v-for="activity in activityList"
            :key="activity.id"
            :timestamp="formatDateTime(activity.createdAt)"
            placement="top"
          >
            <div class="timeline-activity">
              <div class="activity-header">
                <div class="activity-type">
                  <el-tag :type="getActivityTypeColor(activity.type)" size="small">
                    {{ getActivityTypeName(activity.type) }}
                  </el-tag>
                </div>
                <div class="activity-user">
                  <el-avatar :src="activity.user?.avatar" :size="20">
                    {{ activity.user?.username?.charAt(0) }}
                  </el-avatar>
                  <span>{{ activity.user?.username || '系统' }}</span>
                </div>
              </div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-desc">{{ activity.description }}</div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>

        <!-- 加载更多 -->
        <div class="load-more">
          <el-button
            v-if="hasMore"
            @click="loadMore"
            :loading="loadingMore"
          >
            加载更多
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 活动详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="活动详情"
      width="600px"
    >
      <div v-if="selectedActivity" class="activity-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="活动ID">
            {{ selectedActivity.id }}
          </el-descriptions-item>
          <el-descriptions-item label="活动类型">
            <el-tag :type="getActivityTypeColor(selectedActivity.type)">
              {{ getActivityTypeName(selectedActivity.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户">
            {{ selectedActivity.user?.username || '系统' }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ selectedActivity.ipAddress || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ formatDateTime(selectedActivity.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="用户代理">
            {{ selectedActivity.userAgent || '--' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="activity-content-detail">
          <h4>活动内容</h4>
          <div class="content-title">{{ selectedActivity.title }}</div>
          <div class="content-description">{{ selectedActivity.description }}</div>
        </div>

        <div v-if="selectedActivity.metadata" class="activity-metadata">
          <h4>附加信息</h4>
          <pre>{{ JSON.stringify(selectedActivity.metadata, null, 2) }}</pre>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Search,
  Refresh,
  Download,
  List,
  Clock
} from '@element-plus/icons-vue';
import { getActivityLog } from '@/api/admin';

export default {
  name: 'ActivityLog',
  components: {
    Search,
    Refresh,
    Download,
    List,
    Clock
  },
  setup() {
    const loading = ref(false);
    const loadingMore = ref(false);
    const viewMode = ref('list');
    const showDetailDialog = ref(false);
    const selectedActivity = ref(null);
    const hasMore = ref(true);

    // 筛选表单
    const filterForm = reactive({
      type: '',
      dateRange: [],
      username: ''
    });

    // 分页信息
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    });

    // 统计数据
    const stats = ref({
      todayCount: 0,
      weekCount: 0,
      activeUsers: 0,
      totalCount: 0
    });

    // 活动列表
    const activityList = ref([]);

    // 活动类型映射
    const activityTypes = {
      user_register: { name: '用户注册', color: 'success' },
      user_login: { name: '用户登录', color: 'primary' },
      article_publish: { name: '文章发布', color: 'warning' },
      article_edit: { name: '文章编辑', color: 'info' },
      admin_action: { name: '管理操作', color: 'danger' },
      system_event: { name: '系统事件', color: '' }
    };

    // 获取活动类型名称
    const getActivityTypeName = (type) => {
      return activityTypes[type]?.name || '未知类型';
    };

    // 获取活动类型颜色
    const getActivityTypeColor = (type) => {
      return activityTypes[type]?.color || '';
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '--';
      return new Date(dateString).toLocaleDateString('zh-CN');
    };

    // 格式化时间
    const formatTime = (dateString) => {
      if (!dateString) return '--';
      return new Date(dateString).toLocaleTimeString('zh-CN');
    };

    // 格式化日期时间
    const formatDateTime = (dateString) => {
      if (!dateString) return '--';
      return new Date(dateString).toLocaleString('zh-CN');
    };

    // 加载活动日志
    const loadActivityLog = async () => {
      try {
        loading.value = true;

        // 构建查询参数
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          type: filterForm.type,
          username: filterForm.username
        };

        if (filterForm.dateRange && filterForm.dateRange.length === 2) {
          params.startTime = filterForm.dateRange[0];
          params.endTime = filterForm.dateRange[1];
        }

        // 调用API获取活动日志
        const response = await getActivityLog(params);
        const data = response.data.data;

        activityList.value = data.activities;
        pagination.total = data.pagination.total;
        stats.value = data.stats;

      } catch (error) {
        console.error('加载活动日志失败:', error);
        ElMessage.error('加载活动日志失败');
      } finally {
        loading.value = false;
      }
    };





    // 筛选处理
    const handleFilter = () => {
      pagination.page = 1;
      loadActivityLog();
    };

    // 重置筛选
    const handleReset = () => {
      Object.assign(filterForm, {
        type: '',
        dateRange: [],
        username: ''
      });
      pagination.page = 1;
      loadActivityLog();
    };

    // 导出日志
    const handleExport = () => {
      ElMessage.info('导出功能开发中...');
    };

    // 分页处理
    const handleSizeChange = (size) => {
      pagination.limit = size;
      pagination.page = 1;
      loadActivityLog();
    };

    const handleCurrentChange = (page) => {
      pagination.page = page;
      loadActivityLog();
    };

    // 加载更多（时间线视图）
    const loadMore = () => {
      loadingMore.value = true;
      // 模拟加载更多数据
      setTimeout(() => {
        loadingMore.value = false;
        hasMore.value = false;
      }, 1000);
    };

    // 查看详情
    const viewDetail = (activity) => {
      selectedActivity.value = activity;
      showDetailDialog.value = true;
    };



    onMounted(() => {
      loadActivityLog();
    });

    return {
      loading,
      loadingMore,
      viewMode,
      showDetailDialog,
      selectedActivity,
      hasMore,
      filterForm,
      pagination,
      stats,
      activityList,
      getActivityTypeName,
      getActivityTypeColor,
      formatDate,
      formatTime,
      formatDateTime,
      handleFilter,
      handleReset,
      handleExport,
      handleSizeChange,
      handleCurrentChange,
      loadMore,
      viewDetail
    };
  }
};
</script>

<style scoped>
.activity-log {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.page-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.filter-card {
  margin-bottom: 16px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
}

.activity-list-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.time-info .date {
  font-weight: 500;
  color: #303133;
}

.time-info .time {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-size: 14px;
  color: #303133;
}

.activity-description .title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.activity-description .description {
  font-size: 12px;
  color: #606266;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.timeline-view {
  max-height: 600px;
  overflow-y: auto;
}

.timeline-activity {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.activity-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.activity-content .activity-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.activity-content .activity-desc {
  font-size: 12px;
  color: #606266;
}

.load-more {
  text-align: center;
  margin-top: 20px;
}

.activity-detail {
  padding: 16px 0;
}

.activity-content-detail {
  margin-top: 20px;
}

.activity-content-detail h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.content-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.content-description {
  color: #606266;
  line-height: 1.5;
}

.activity-metadata {
  margin-top: 20px;
}

.activity-metadata h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.activity-metadata pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .stats-row .el-col {
    margin-bottom: 12px;
  }

  .timeline-activity {
    padding: 8px;
  }

  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
