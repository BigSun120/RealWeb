<template>
  <el-dialog
    v-model="visible"
    title="用户详情"
    width="600px"
    :before-close="handleClose"
  >
    <div v-loading="loading" class="user-detail">
      <div v-if="userDetail" class="detail-content">
        <!-- 用户基本信息 -->
        <div class="user-header">
          <el-avatar :src="userDetail.avatar" :size="80">
            {{ userDetail.username && userDetail.username.charAt(0) || 'U' }}
          </el-avatar>
          <div class="user-info">
            <h3>{{ userDetail.username }}</h3>
            <p>{{ userDetail.email }}</p>
            <div class="user-tags">
              <el-tag :type="userDetail.isAdmin ? 'danger' : 'primary'" size="small">
                {{ userDetail.isAdmin ? '管理员' : '普通用户' }}
              </el-tag>
              <el-tag
                :type="userDetail.isActive ? 'success' : 'danger'"
                size="small"
                style="margin-left: 8px;"
              >
                {{ userDetail.isActive ? '正常' : '禁用' }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 详细信息 -->
        <el-descriptions :column="2" border class="detail-descriptions">
          <el-descriptions-item label="用户ID">
            {{ userDetail._id }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ userDetail.username }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ userDetail.email }}
          </el-descriptions-item>
          <el-descriptions-item label="个人简介">
            {{ userDetail.bio || '暂无' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatDate(userDetail.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后登录">
            {{ formatDate(userDetail.lastLoginAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatDate(userDetail.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="登录次数">
            {{ userDetail.loginCount || 0 }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 统计信息 -->
        <div v-if="userStats" class="user-stats">
          <h4>统计信息</h4>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-statistic title="发布文章" :value="userStats.published" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="草稿文章" :value="userStats.draft" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="总文章数" :value="userStats.total" />
            </el-col>
          </el-row>
        </div>

        <!-- 最近活动 -->
        <div v-if="recentActivities.length > 0" class="recent-activities">
          <h4>最近活动</h4>
          <el-timeline>
            <el-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :timestamp="formatDate(activity.createdAt)"
              placement="top"
            >
              <div class="activity-item">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-description">{{ activity.description }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleEdit">编辑用户</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getUserDetail } from '@/api/admin';

export default {
  name: 'UserDetailDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    userId: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'edit'],
  setup(props, { emit }) {
    const visible = ref(false);
    const loading = ref(false);
    const userDetail = ref(null);
    const userStats = ref(null);
    const recentActivities = ref([]);

    // 监听显示状态
    watch(() => props.modelValue, (newVal) => {
      visible.value = newVal;
      if (newVal && props.userId) {
        loadUserDetail();
      }
    });

    // 监听visible变化
    watch(visible, (newVal) => {
      emit('update:modelValue', newVal);
    });

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '--';
      return new Date(dateString).toLocaleString('zh-CN');
    };

    // 加载用户详情
    const loadUserDetail = async () => {
      try {
        loading.value = true;
        const response = await getUserDetail(props.userId);
        const data = response.data.data;

        userDetail.value = data.user;
        userStats.value = data.stats;

        // 模拟最近活动数据
        recentActivities.value = [
          {
            id: 1,
            title: '登录系统',
            description: '用户登录了系统',
            createdAt: userDetail.value.lastLoginAt
          },
          {
            id: 2,
            title: '更新资料',
            description: '用户更新了个人资料',
            createdAt: userDetail.value.updatedAt
          }
        ].filter(item => item.createdAt);

      } catch (error) {
        console.error('加载用户详情失败:', error);
        ElMessage.error('加载用户详情失败');
      } finally {
        loading.value = false;
      }
    };

    // 关闭对话框
    const handleClose = () => {
      visible.value = false;
      userDetail.value = null;
      userStats.value = null;
      recentActivities.value = [];
    };

    // 编辑用户
    const handleEdit = () => {
      emit('edit', userDetail.value);
      handleClose();
    };

    return {
      visible,
      loading,
      userDetail,
      userStats,
      recentActivities,
      formatDate,
      handleClose,
      handleEdit
    };
  }
};
</script>

<style scoped>
.user-detail {
  min-height: 200px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.user-info h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
}

.user-info p {
  margin: 0 0 12px 0;
  color: #606266;
}

.user-tags {
  display: flex;
  align-items: center;
}

.detail-descriptions {
  margin-bottom: 24px;
}

.user-stats {
  margin-bottom: 24px;
}

.user-stats h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.recent-activities h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.activity-item {
  padding: 8px 0;
}

.activity-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.activity-description {
  font-size: 14px;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .user-header {
    flex-direction: column;
    text-align: center;
  }

  .detail-descriptions :deep(.el-descriptions__body .el-descriptions__table .el-descriptions__cell) {
    padding: 8px;
  }
}
</style>
