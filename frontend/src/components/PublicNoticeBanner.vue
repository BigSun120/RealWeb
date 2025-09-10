<template>
  <div v-if="visibleNotices.length && placements.includes('banner')" class="public-notice-banner" :class="[`level-${visibleNotices[0].level}`, { 'is-unread': userStore && userStore.isLoggedIn && (!visibleNotices[0].readStatus || !visibleNotices[0].readStatus.isRead) }]">
    <div class="container">
      <div class="banner-content">
        <div class="banner-text">
          <div class="title-wrapper">
            <div v-if="userStore && userStore.isLoggedIn && (!visibleNotices[0].readStatus || !visibleNotices[0].readStatus.isRead)" class="unread-indicator">
              <div class="unread-dot"></div>
            </div>
            <strong class="title">{{ visibleNotices[0].title }}</strong>
          </div>
          <span class="body" v-html="renderBody(visibleNotices[0])"></span>
        </div>
        <div class="banner-actions">
          <el-button size="small" type="primary" @click="openNoticeDetail(visibleNotices[0])">
            {{ visibleNotices[0].ctaText || '查看详情' }}
          </el-button>
          <el-button v-if="visibleNotices[0].link" size="small" type="text" @click="openLink(visibleNotices[0].link)">
            外部链接
          </el-button>
          <el-button
            v-if="userStore && userStore.isLoggedIn && (!visibleNotices[0].readStatus || !visibleNotices[0].readStatus.isRead)"
            size="small"
            type="text"
            @click="markAsRead(visibleNotices[0]._id)"
            :loading="markingRead"
          >
            标记已读
          </el-button>
          <el-button size="small" type="text" @click="dismiss(visibleNotices[0]._id)">不再显示</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getLatestPublicNotices, markPublicNoticeAsDismissed, markPublicNoticeAsRead } from '@/api/publicNotices';
import { marked } from 'marked';
import { useUserStore } from '@/stores/user';

export default {
  name: 'PublicNoticeBanner',
  props: {
    placements: { type: Array, default: () => ['banner','dropdown'] }
  },
  setup() {
    const notices = ref([]);
    const markingRead = ref(false);
    let timer = null;
    const userStore = useUserStore();

    const renderBody = (n) => n.bodyHtml || marked.parse(n.bodyMarkdown || '');

    const openLink = (url) => {
      if (!url) return;
      if (/^https?:/i.test(url)) {
        window.open(url, '_blank', 'noopener');
      } else if (url.startsWith('/')) {
        // 站内路由
        try {
          const { useRouter } = require('vue-router');
          const router = useRouter();
          router.push(url);
        } catch {
          window.location.href = url;
        }
      } else {
        window.open(url, '_blank', 'noopener');
      }
    };

    // 打开公告详情弹窗
    const openNoticeDetail = async (notice) => {
      // 如果用户已登录且公告未读，自动标记为已读
      if (userStore && userStore.isLoggedIn && (!notice.readStatus || !notice.readStatus.isRead)) {
        try {
          await markPublicNoticeAsRead(notice._id);
          notice.readStatus = {
            ...notice.readStatus,
            isRead: true,
            readAt: new Date()
          };
          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('refresh-public-notices'));
        } catch (error) {
          console.error('自动标记公告为已读失败:', error);
        }
      }

      // 触发全局事件打开公告详情弹窗
      window.dispatchEvent(new CustomEvent('open-public-notice', { detail: notice }));
    };

    // 计算可见的公告（未被忽略的）
    const visibleNotices = computed(() => {
      if (!notices.value.length) return [];

      if (userStore && userStore.isLoggedIn) {
        // 已登录用户：过滤掉已忽略的公告
        return notices.value.filter(notice =>
          !notice.readStatus || !notice.readStatus.isDismissed
        );
      } else {
        // 未登录用户：使用localStorage兼容逻辑
        const dismissedMap = JSON.parse(localStorage.getItem('public_notice_dismissed_v1') || '{}');
        return notices.value.filter(notice => !dismissedMap[notice._id]);
      }
    });

    const dismiss = async (id) => {
      if (userStore && userStore.isLoggedIn) {
        try {
          await markPublicNoticeAsDismissed(id);
          // 更新本地状态
          const notice = notices.value.find(n => n._id === id);
          if (notice) {
            notice.readStatus = {
              ...notice.readStatus,
              isDismissed: true,
              isRead: true
            };
          }

          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('refresh-public-notices'));
        } catch (error) {
          console.error('标记公告为忽略失败:', error);
        }
      } else {
        // 未登录用户：使用localStorage兼容逻辑
        const key = 'public_notice_dismissed_v1';
        const dismissedMap = JSON.parse(localStorage.getItem(key) || '{}');
        dismissedMap[id] = Date.now();
        localStorage.setItem(key, JSON.stringify(dismissedMap));
      }
    };

    // 标记公告为已读
    const markAsRead = async (id) => {
      if (!userStore || !userStore.isLoggedIn) return;

      try {
        markingRead.value = true;
        await markPublicNoticeAsRead(id);

        // 更新本地状态
        const notice = notices.value.find(n => n._id === id);
        if (notice) {
          notice.readStatus = {
            ...notice.readStatus,
            isRead: true,
            readAt: new Date()
          };
        }

        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('refresh-public-notices'));
      } catch (error) {
        console.error('标记公告为已读失败:', error);
      } finally {
        markingRead.value = false;
      }
    };

    const load = async () => {
      try {
        const res = await getLatestPublicNotices(5);
        if (res.data?.success) notices.value = res.data.data || [];
      } catch (_) {}
    };

    // 全局事件监听器，用于同步其他组件的操作
    const onRefresh = () => load();

    onMounted(() => {
      load();
      timer = setInterval(load, 120 * 1000);
      window.addEventListener('refresh-public-notices', onRefresh);
    });

    onUnmounted(() => {
      if (timer) clearInterval(timer);
      window.removeEventListener('refresh-public-notices', onRefresh);
    });

    return { notices, visibleNotices, renderBody, openLink, openNoticeDetail, dismiss, markAsRead, markingRead };
  }
};
</script>

<style scoped>
.public-notice-banner {
  background: #eef5ff;
  border-bottom: 1px solid #dbeafe;
}
.public-notice-banner.level-warning { background: #fff7ed; border-color: #ffedd5; }
.public-notice-banner.level-critical { background: #fef2f2; border-color: #fee2e2; }
.public-notice-banner.is-unread { border-left: 4px solid #409eff; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.banner-content { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; min-height: 40px; max-height: 80px; }
.banner-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}
.title-wrapper { display: flex; align-items: center; gap: 8px; }
.unread-indicator { display: flex; align-items: center; }
.unread-dot { width: 8px; height: 8px; background: #409eff; border-radius: 50%; }
.title {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.public-notice-banner.is-unread .title { font-weight: 600; }
.body {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  max-height: 2.8em;
}
.body :deep(p) { display: inline; margin: 0; }
.banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}
</style>