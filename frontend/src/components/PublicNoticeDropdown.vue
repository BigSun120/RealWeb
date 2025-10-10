<template>
  <el-dropdown v-show="placements.includes('dropdown')" trigger="click" placement="bottom-end">
    <el-button type="text" class="notification-trigger">
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-icon :size="20"><Bell /></el-icon>
      </el-badge>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu class="notification-dropdown">
        <div class="notification-header">
          <span class="title">公告</span>
          <div class="header-actions">
            <el-button
              v-if="userStore && userStore.isLoggedIn && unreadCount > 0"
              type="text"
              size="small"
              @click="markAllAsRead"
              :loading="markingAllRead"
            >
              全部已读
            </el-button>

          </div>
        </div>
        <div class="notification-content">
          <div v-if="loading" class="loading-container">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载中...</span>
          </div>
          <div v-else-if="notices.length === 0" class="empty-container">
            <el-icon :size="48" color="#c0c4cc"><Bell /></el-icon>
            <p>暂无公告</p>
          </div>
          <div v-else class="notification-list">
            <div v-for="n in notices" :key="n._id" class="notification-item" :class="{ 'is-unread': isNoticeUnread(n) }">
              <div class="notification-indicator" v-if="isNoticeUnread(n)">
                <div class="unread-dot"></div>
              </div>
              <div class="notification-body">
                <div class="notification-title">{{ n.title }}</div>
                <div class="notification-content-text" v-html="renderBody(n)"></div>
                <div class="notification-time">{{ formatTime(n.startsAt || n.createdAt) }}</div>
              </div>
              <div class="notification-actions">
                <el-button type="text" size="small" @click.stop="openNotice(n)">{{ n.ctaText || '查看' }}</el-button>
                <template v-if="userStore && userStore.isLoggedIn">
                  <el-button
                    v-if="isNoticeUnread(n)"
                    type="text"
                    size="small"
                    @click.stop="markSingleAsRead(n)"
                    :loading="markingSingle[n._id]"
                  >
                    已读
                  </el-button>
                  <el-button
                    v-if="!n.readStatus || !n.readStatus.isDismissed"
                    type="text"
                    size="small"
                    @click.stop="markSingleAsDismissed(n)"
                    :loading="dismissingSingle[n._id]"
                  >
                    忽略
                  </el-button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, Loading } from '@element-plus/icons-vue';
import { marked } from 'marked';
import {
  getLatestPublicNotices,
  markPublicNoticeAsRead,
  markPublicNoticeAsDismissed,
  markMultiplePublicNoticesAsRead,
  getUnreadPublicNoticeCount
} from '@/api/publicNotices';
import { useUserStore } from '@/stores/user';

export default {
  name: 'PublicNoticeDropdown',
  components: { Bell, Loading },
  props: {
    placements: { type: Array, default: () => ['banner','dropdown'] }
  },
  setup() {
    const notices = ref([]);
    const loading = ref(false);
    const unreadCount = ref(0);
    const markingAllRead = ref(false);
    const markingSingle = ref({});
    const dismissingSingle = ref({});
    let timer = null;
    const router = useRouter();
    const userStore = useUserStore();

    const renderBody = (n) => n.bodyHtml || marked.parse(n.bodyMarkdown || '');
    const openLink = (url) => {
      if (!url) return;
      if (/^https?:/i.test(url)) {
        window.open(url, '_blank', 'noopener');
      } else if (url.startsWith('/')) {
        router.push(url);
      } else {
        window.open(url, '_blank', 'noopener');
      }
    };

    const load = async () => {
      try {
        loading.value = true;
        const res = await getLatestPublicNotices(5);
        if (res.data?.success) {
          const arr = res.data.data || [];
          notices.value = arr;

          // 如果用户已登录，从API响应中获取阅读状态
          if (userStore && userStore.isLoggedIn) {
            // 计算未读数量
            const unreadNotices = arr.filter(notice =>
              !notice.readStatus || !notice.readStatus.isRead
            );
            unreadCount.value = unreadNotices.length;
          } else {
            // 未登录用户，使用localStorage兼容逻辑
            const stored = JSON.parse(localStorage.getItem('public_notice_read_v1') || '{}');
            const unreadNotices = arr.filter(x => !stored[x._id]);
            unreadCount.value = unreadNotices.length;
          }
        }
      } finally {
        loading.value = false;
      }
    };

    const formatTime = (time) => new Date(time).toLocaleString();

    // 判断公告是否未读
    const isNoticeUnread = (notice) => {
      if (!userStore || !userStore.isLoggedIn) return false;
      return !notice.readStatus || !notice.readStatus.isRead;
    };

    const openNotice = async (n) => {
      // 打开大弹窗预览
      const event = new CustomEvent('open-public-notice', { detail: n });
      window.dispatchEvent(event);

      // 标记为已读
      if (userStore && userStore.isLoggedIn) {
        try {
          // 如果尚未读过，调用API标记为已读
          if (!n.readStatus || !n.readStatus.isRead) {
            await markPublicNoticeAsRead(n._id);
            // 更新本地状态
            n.readStatus = { isRead: true, isDismissed: false };
            unreadCount.value = Math.max(0, unreadCount.value - 1);
          }
        } catch (error) {
          console.error('标记公告为已读失败:', error);
        }
      } else {
        // 未登录用户，使用localStorage兼容逻辑
        const map = JSON.parse(localStorage.getItem('public_notice_read_v1') || '{}');
        if (!map[n._id]) {
          map[n._id] = Date.now();
          localStorage.setItem('public_notice_read_v1', JSON.stringify(map));
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
      }
    };

    // 一键标记所有公告为已读
    const markAllAsRead = async () => {
      if (!userStore || !userStore.isLoggedIn || unreadCount.value === 0) return;

      try {
        markingAllRead.value = true;

        // 获取所有未读公告的ID
        const unreadNoticeIds = notices.value
          .filter(notice => !notice.readStatus || !notice.readStatus.isRead)
          .map(notice => notice._id);

        if (unreadNoticeIds.length > 0) {
          await markMultiplePublicNoticesAsRead(unreadNoticeIds);

          // 更新本地状态
          notices.value.forEach(notice => {
            if (unreadNoticeIds.includes(notice._id)) {
              notice.readStatus = {
                ...notice.readStatus,
                isRead: true,
                readAt: new Date()
              };
            }
          });

          unreadCount.value = 0;

          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('refresh-public-notices'));
        }
      } catch (error) {
        console.error('批量标记已读失败:', error);
      } finally {
        markingAllRead.value = false;
      }
    };

    // 单个公告标记为已读
    const markSingleAsRead = async (notice) => {
      if (!userStore || !userStore.isLoggedIn) return;

      try {
        markingSingle.value = { ...markingSingle.value, [notice._id]: true };
        await markPublicNoticeAsRead(notice._id);

        // 更新本地状态
        notice.readStatus = {
          ...notice.readStatus,
          isRead: true,
          readAt: new Date()
        };

        unreadCount.value = Math.max(0, unreadCount.value - 1);

        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('refresh-public-notices'));
      } catch (error) {
        console.error('标记公告为已读失败:', error);
      } finally {
        markingSingle.value = { ...markingSingle.value, [notice._id]: false };
      }
    };

    // 单个公告标记为忽略
    const markSingleAsDismissed = async (notice) => {
      if (!userStore || !userStore.isLoggedIn) return;

      try {
        dismissingSingle.value = { ...dismissingSingle.value, [notice._id]: true };
        await markPublicNoticeAsDismissed(notice._id);

        // 更新本地状态
        notice.readStatus = {
          ...notice.readStatus,
          isDismissed: true,
          isRead: true
        };

        unreadCount.value = Math.max(0, unreadCount.value - 1);

        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('refresh-public-notices'));
      } catch (error) {
        console.error('标记公告为忽略失败:', error);
      } finally {
        dismissingSingle.value = { ...dismissingSingle.value, [notice._id]: false };
      }
    };

    // 管理端操作成功后立即刷新（跨页全局事件）
    const onRefresh = () => load();
    window.addEventListener('refresh-public-notices', onRefresh);

    onMounted(() => {
      load();
      timer = setInterval(load, 120 * 1000);
    });

    onUnmounted(() => {
      if (timer) clearInterval(timer);
      window.removeEventListener('refresh-public-notices', onRefresh);
    });

    return {
      notices,
      loading,
      renderBody,
      openLink,
      formatTime,
      openNotice,
      unreadCount,
      markAllAsRead,
      markingAllRead,
      markSingleAsRead,
      markSingleAsDismissed,
      markingSingle,
      dismissingSingle,
      userStore,
      isNoticeUnread
    };

  }
};
</script>

<style scoped>
.notification-trigger { padding: 8px; color: #fff; }
.notification-dropdown { width: 360px; max-height: 480px; padding: 0; }
.notification-header { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #ebeef5; background:#fafafa; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.notification-content { max-height: 400px; overflow-y:auto; }
.loading-container, .empty-container { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; color:#909399; }
.notification-list { padding: 8px 0; }
.notification-item { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; border-left:3px solid transparent; position: relative; }
.notification-item:hover { background:#f5f7fa; }
.notification-item.is-unread { border-left-color: #409eff; background: #f0f9ff; }
.notification-indicator { display: flex; align-items: center; justify-content: center; width: 8px; }
.unread-dot { width: 6px; height: 6px; background: #409eff; border-radius: 50%; }
.notification-body { flex:1; min-width:0; }
.notification-title { font-weight:500; margin-bottom:4px; font-size:14px; }
.notification-item.is-unread .notification-title { font-weight: 600; color: #303133; }
.notification-content-text { color:#606266; font-size:13px; line-height:1.4; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.notification-time { color:#909399; font-size:12px; }
.notification-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.notification-actions .el-button { padding: 2px 6px; font-size: 12px; }
</style>

