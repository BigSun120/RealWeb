<template>
  <el-card class="recent-activity" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="title">最近活动</span>
        <el-button text @click="refreshActivity">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </template>

    <div v-loading="loading" class="activity-content">
      <el-empty v-if="!loading && activities.length === 0" description="暂无活动记录" />

      <div v-else class="activity-list">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="activity-item"
        >
          <div class="activity-icon">
            <el-icon :color="getActivityColor(activity.type)" :size="20">
              <component :is="getActivityIcon(activity.type)" />
            </el-icon>
          </div>

          <div class="activity-content">
            <div class="activity-title">{{ activity.title }}</div>
            <div class="activity-description">{{ activity.description }}</div>
            <div class="activity-meta">
              <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
              <el-tag
                v-if="activity.type"
                :type="getActivityTagType(activity.type)"
                size="small"
              >
                {{ getActivityTypeText(activity.type) }}
              </el-tag>
            </div>
          </div>

          <div v-if="activity.user" class="activity-user">
            <el-avatar :src="activity.user.avatar" :size="32">
              {{ activity.user.username?.charAt(0) }}
            </el-avatar>
          </div>
        </div>
      </div>

      <div v-if="activities.length > 0" class="activity-footer">
        <el-button text @click="viewAllActivities">
          查看全部活动
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Refresh,
  ArrowRight,
  User,
  Document,
  UserFilled,
  EditPen,
  View,
  Setting
} from '@element-plus/icons-vue';
import { getRecentActivity } from '@/api/admin';

export default {
  name: 'RecentActivity',
  components: {
    Refresh,
    ArrowRight,
    User,
    Document,
    UserFilled,
    EditPen,
    View,
    Setting
  },
  setup() {
    const router = useRouter();

    const loading = ref(false);
    const activities = ref([]);

    // 获取活动图标
    const getActivityIcon = (type) => {
      const iconMap = {
        'user_register': 'UserFilled',
        'user_login': 'User',
        'article_create': 'EditPen',
        'article_publish': 'Document',
        'article_view': 'View',
        'system_setting': 'Setting'
      };
      return iconMap[type] || 'Document';
    };

    // 获取活动颜色
    const getActivityColor = (type) => {
      const colorMap = {
        'user_register': '#67c23a',
        'user_login': '#409eff',
        'article_create': '#e6a23c',
        'article_publish': '#67c23a',
        'article_view': '#909399',
        'system_setting': '#f56c6c'
      };
      return colorMap[type] || '#909399';
    };

    // 获取活动标签类型
    const getActivityTagType = (type) => {
      const tagMap = {
        'user_register': 'success',
        'user_login': 'primary',
        'article_create': 'warning',
        'article_publish': 'success',
        'article_view': 'info',
        'system_setting': 'danger'
      };
      return tagMap[type] || 'info';
    };

    // 获取活动类型文本
    const getActivityTypeText = (type) => {
      const textMap = {
        'user_register': '用户注册',
        'user_login': '用户登录',
        'article_create': '创建文章',
        'article_publish': '发布文章',
        'article_view': '浏览文章',
        'system_setting': '系统设置'
      };
      return textMap[type] || '未知活动';
    };

    // 格式化时间
    const formatTime = (dateString) => {
      if (!dateString) return '';

      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;

      // 小于1分钟
      if (diff < 60 * 1000) {
        return '刚刚';
      }

      // 小于1小时
      if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}分钟前`;
      }

      // 小于1天
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours}小时前`;
      }

      // 大于1天
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      if (days < 7) {
        return `${days}天前`;
      }

      // 显示具体日期
      return date.toLocaleDateString('zh-CN');
    };

    // 加载活动数据
    const loadActivities = async () => {
      try {
        loading.value = true;
        const response = await getRecentActivity(10);
        activities.value = response.data.data || [];
      } catch (error) {
        console.error('加载活动数据失败:', error);
        ElMessage.error('加载活动数据失败');
        // 模拟数据用于开发测试
        activities.value = [
          {
            id: 1,
            type: 'user_register',
            title: '新用户注册',
            description: '用户 "张三" 完成注册',
            createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            user: { username: '张三', avatar: '' }
          },
          {
            id: 2,
            type: 'article_publish',
            title: '文章发布',
            description: '文章 "Vue3 开发指南" 已发布',
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            user: { username: '李四', avatar: '' }
          },
          {
            id: 3,
            type: 'user_login',
            title: '用户登录',
            description: '管理员登录系统',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            user: { username: 'admin', avatar: '' }
          }
        ];
      } finally {
        loading.value = false;
      }
    };

    // 刷新活动
    const refreshActivity = () => {
      loadActivities();
    };

    // 查看全部活动
    const viewAllActivities = () => {
      router.push('/admin/activity');
    };

    onMounted(() => {
      loadActivities();
    });

    return {
      loading,
      activities,
      getActivityIcon,
      getActivityColor,
      getActivityTagType,
      getActivityTypeText,
      formatTime,
      refreshActivity,
      viewAllActivities
    };
  }
};
</script>

<style scoped>
.recent-activity {
  height: 100%;
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

.activity-content {
  min-height: 100px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.activity-item:hover {
  background-color: #f8f9fa;
}

.activity-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  border-radius: 50%;
}

.activity-content {
  flex: 1;
  min-width: 0;
  line-height: 1.4;
}

.activity-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1.3;
}

.activity-description {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  word-break: break-all;
  line-height: 1.4;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-time {
  font-size: 12px;
  color: #909399;
}

.activity-user {
  flex-shrink: 0;
}

.activity-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

@media (max-width: 768px) {
  .activity-item {
    gap: 8px;
    padding: 8px;
  }

  .activity-icon {
    width: 32px;
    height: 32px;
  }

  .activity-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
