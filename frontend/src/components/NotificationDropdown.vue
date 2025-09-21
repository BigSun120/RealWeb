<template>
  <el-dropdown
    trigger="click"
    @visible-change="handleDropdownVisibleChange"
    placement="bottom-end"
  >
    <el-button type="text" class="notification-trigger">
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-icon :size="20">
          <Bell />
        </el-icon>
      </el-badge>
    </el-button>

    <template #dropdown>
      <el-dropdown-menu class="notification-dropdown">
        <div class="notification-header">
          <span class="title">通知</span>
          <div class="actions">
            <el-button
              type="text"
              size="small"
              @click="markAllAsRead"
              :disabled="unreadCount === 0"
            >
              全部已读
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="clearAll"
              :disabled="notifications.length === 0"
            >
              清空
            </el-button>
          </div>
        </div>

        <div class="notification-content">
          <div v-if="loading" class="loading-container">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>加载中...</span>
          </div>

          <div v-else-if="notifications.length === 0" class="empty-container">
            <el-icon :size="48" color="#c0c4cc">
              <Bell />
            </el-icon>
            <p>暂无通知</p>
          </div>

          <div v-else class="notification-list">
            <div
              v-for="notification in notifications"
              :key="notification._id"
              class="notification-item"
              :class="{ 'is-unread': !notification.isRead }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-avatar">
                <el-avatar
                  :size="32"
                  :src="notification.relatedData?.fromUserId?.avatar"
                  v-if="notification.relatedData?.fromUserId"
                >
                  {{ notification.relatedData.fromUserId.username?.charAt(0).toUpperCase() }}
                </el-avatar>
                <el-icon v-else :size="32" color="#409eff">
                  <Bell />
                </el-icon>
              </div>

              <div class="notification-body">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-content-text">{{ notification.content }}</div>
                <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
              </div>

              <div class="notification-actions">
                <el-button
                  type="text"
                  size="small"
                  @click.stop="deleteNotification(notification._id)"
                  class="delete-btn"
                >
                  <el-icon>
                    <Close />
                  </el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="hasMore" class="load-more">
            <el-button
              type="text"
              size="small"
              @click="loadMore"
              :loading="loadingMore"
            >
              加载更多
            </el-button>
          </div>
        </div>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Bell, Loading, Close } from '@element-plus/icons-vue';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationApi,
  clearAllNotifications
} from '@/api/notifications';
import commentApi from '@/api/comments';

export default {
  name: 'NotificationDropdown',
  components: {
    Bell,
    Loading,
    Close
  },
  setup() {
    const router = useRouter();

    const notifications = ref([]);
    const unreadCount = ref(0);
    const loading = ref(false);
    const loadingMore = ref(false);
    const hasMore = ref(false);
    const currentPage = ref(1);

    // 加载通知列表
    const loadNotifications = async (page = 1, append = false) => {
      try {
        if (page === 1) {
          loading.value = true;
        } else {
          loadingMore.value = true;
        }

        const response = await getNotifications({
          page,
          limit: 10
        });

        if (response.data.success) {
          const notificationData = response.data.data || [];
          if (append) {
            notifications.value.push(...notificationData);
          } else {
            notifications.value = notificationData;
          }

          hasMore.value = response.data.pagination?.page < response.data.pagination?.pages;
          currentPage.value = page;
        }
      } catch (error) {
        console.error('加载通知失败:', error);
      } finally {
        loading.value = false;
        loadingMore.value = false;
      }
    };

    // 加载未读数量
    const loadUnreadCount = async () => {
      try {
        const response = await getUnreadCount();
        if (response.data.success) {
          unreadCount.value = response.data.data.count;
        }
      } catch (error) {
        console.error('加载未读数量失败:', error);
      }
    };

    // 加载更多
    const loadMore = () => {
      loadNotifications(currentPage.value + 1, true);
    };

    // 处理下拉框显示/隐藏
    const handleDropdownVisibleChange = (visible) => {
      if (visible) {
        loadNotifications();
        loadUnreadCount();
      }
    };

    // 处理通知点击
    const handleNotificationClick = async (notification) => {
      try {
        // 标记为已读
        if (!notification.isRead) {
          await markNotificationAsRead(notification._id);
          notification.isRead = true;
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }

        // 跳转到相关页面
        const articleId = notification.relatedData?.articleId;
        const commentId = notification.relatedData?.commentId;

        if (articleId && commentId) {
          // 统一跳转到第1级评论
          try {
            const pageResponse = await commentApi.findCommentPage(commentId, 10);

            if (pageResponse.data.success) {
              const { page, commentId: topLevelCommentId } = pageResponse.data.data;

              const targetRoute = `/blog/${articleId}`;
              const currentRoute = router.currentRoute.value.path;

              // 统一跳转到第1级评论
              const queryParams = new URLSearchParams({
                highlight: topLevelCommentId
              });

              if (page > 1) {
                queryParams.set('page', page.toString());
              }

              queryParams.set('t', Date.now().toString());
              const targetUrl = `${targetRoute}?${queryParams.toString()}`;

              if (currentRoute === targetRoute) {
                await router.replace(targetUrl);
              } else {
                await router.push(targetUrl);
              }
            } else {
              // 查找失败，使用基本跳转
              await basicJump(articleId, commentId);
            }
          } catch (error) {
            await basicJump(articleId, commentId);
          }
        } else if (articleId) {
          // 只跳转到文章
          await router.push(`/blog/${articleId}`);
        }
      } catch (error) {
        console.error('处理通知点击失败:', error);
      }
    };

    // 基本跳转逻辑
    const basicJump = async (articleId, commentId) => {
      const targetRoute = `/blog/${articleId}`;
      const currentRoute = router.currentRoute.value.path;

      if (currentRoute === targetRoute) {
        await router.replace(`${targetRoute}?highlight=${commentId}&t=${Date.now()}`);
      } else {
        await router.push(`${targetRoute}?highlight=${commentId}`);
      }
    };

    // 全部标记为已读
    const markAllAsRead = async () => {
      try {
        await markAllNotificationsAsRead();
        notifications.value.forEach(n => n.isRead = true);
        unreadCount.value = 0;
        ElMessage.success('已标记全部通知为已读');
      } catch (error) {
        console.error('标记全部已读失败:', error);
        ElMessage.error('操作失败');
      }
    };

    // 清空所有通知
    const clearAll = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要清空所有通知吗？此操作不可恢复。',
          '确认清空',
          {
            confirmButtonText: '清空',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await clearAllNotifications();
        notifications.value = [];
        unreadCount.value = 0;
        ElMessage.success('已清空所有通知');
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清空通知失败:', error);
          ElMessage.error('操作失败');
        }
      }
    };

    // 删除单个通知
    const deleteNotification = async (notificationId) => {
      try {
        await deleteNotificationApi(notificationId);
        const index = notifications.value.findIndex(n => n._id === notificationId);
        if (index > -1) {
          const notification = notifications.value[index];
          if (!notification.isRead) {
            unreadCount.value = Math.max(0, unreadCount.value - 1);
          }
          notifications.value.splice(index, 1);
        }
        ElMessage.success('通知已删除');
      } catch (error) {
        console.error('删除通知失败:', error);
        ElMessage.error('删除失败');
      }
    };

    // 格式化时间
    const formatTime = (time) => {
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) { // 1分钟内
        return '刚刚';
      } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`;
      } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`;
      } else if (diff < 2592000000) { // 30天内
        return `${Math.floor(diff / 86400000)}天前`;
      } else {
        return date.toLocaleDateString();
      }
    };

    // 初始化
    onMounted(() => {
      loadUnreadCount();
    });

    return {
      notifications,
      unreadCount,
      loading,
      loadingMore,
      hasMore,
      loadMore,
      handleDropdownVisibleChange,
      handleNotificationClick,
      markAllAsRead,
      clearAll,
      deleteNotification,
      formatTime
    };
  }
};
</script>

<style scoped>
.notification-trigger {
  padding: 8px;
  color: #606266;
}

.notification-trigger:hover {
  color: #409eff;
}

.notification-dropdown {
  width: 360px;
  max-height: 480px;
  padding: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.notification-header .title {
  font-weight: 600;
  color: #303133;
}

.notification-header .actions {
  display: flex;
  gap: 8px;
}

.notification-content {
  max-height: 400px;
  overflow-y: auto;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
}

.loading-container span {
  margin-top: 8px;
}

.empty-container p {
  margin: 12px 0 0 0;
}

.notification-list {
  padding: 8px 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.is-unread {
  background-color: #ecf5ff;
  border-left-color: #409eff;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  font-size: 14px;
}

.notification-content-text {
  color: #606266;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-time {
  color: #909399;
  font-size: 12px;
}

.notification-actions {
  display: flex;
  align-items: center;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}

.load-more {
  text-align: center;
  padding: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
