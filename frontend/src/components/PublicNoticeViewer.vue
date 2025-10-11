<template>
  <el-dialog v-model="visible" width="900px" :close-on-click-modal="true">
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">公告详情</span>
        <div v-if="userStore && userStore.isLoggedIn" class="status-indicators">
          <el-tag v-if="notice && notice.readStatus && notice.readStatus.isRead" type="success" size="small">已读</el-tag>
          <el-tag v-else-if="notice" type="info" size="small">未读</el-tag>
          <el-tag v-if="notice && notice.readStatus && notice.readStatus.isDismissed" type="warning" size="small">已忽略</el-tag>
        </div>
      </div>
    </template>
    <div v-if="notice" class="viewer-body min-height">
      <h2 class="viewer-title">{{ notice.title }}</h2>
      <div class="viewer-meta">
        <el-tag :type="notice.level==='critical'?'danger':(notice.level==='warning'?'warning':'info')">
          {{ notice.level }}
        </el-tag>
        <span class="viewer-time">{{ formatTime(notice.startsAt || notice.createdAt) }}</span>
      </div>
      <div class="viewer-content" v-html="renderBody(notice)"></div>
      <div class="viewer-actions">
        <el-button v-if="notice.link" type="primary" size="small" @click="openLink(notice.link)">
          {{ notice.ctaText || '查看详情' }}
        </el-button>
        <el-button
          v-if="userStore && userStore.isLoggedIn && (!notice.readStatus || !notice.readStatus.isRead)"
          type="success"
          size="small"
          @click="markAsRead"
          :loading="markingRead"
        >
          标记已读
        </el-button>
        <el-button
          v-if="userStore && userStore.isLoggedIn && (!notice.readStatus || !notice.readStatus.isDismissed)"
          type="warning"
          size="small"
          @click="markAsDismissed"
          :loading="markingDismissed"
        >
          不再显示
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import { markPublicNoticeAsRead, markPublicNoticeAsDismissed } from '@/api/publicNotices';
import { useUserStore } from '@/stores/user';

export default {
  name: 'PublicNoticeViewer',
  setup() {
    const router = useRouter();
    const visible = ref(false);
    const notice = ref(null);
    const markingRead = ref(false);
    const markingDismissed = ref(false);
    const userStore = useUserStore();

    const formatTime = (t) => new Date(t).toLocaleString();
    const renderBody = (n) => {
      // 优先使用后端生成的 HTML；否则对 Markdown 渲染，并允许图片直接显示
      const html = n.bodyHtml || marked.parse(n.bodyMarkdown || '');
      return html;
    };

    const openLink = (url) => {
      if (!url) return;
      if (/^https?:/i.test(url)) {
        window.open(url, '_blank', 'noopener');
      } else if (url.startsWith('/')) {
        try {
          router.push(url);
        } catch {
          window.location.href = url;
        }
      } else {
        window.open(url, '_blank', 'noopener');
      }
    };

    // 标记公告为已读
    const markAsRead = async () => {
      if (!userStore || !userStore.isLoggedIn || !notice.value) return;

      try {
        markingRead.value = true;
        await markPublicNoticeAsRead(notice.value._id);

        // 更新本地状态
        notice.value.readStatus = {
          ...notice.value.readStatus,
          isRead: true,
          readAt: new Date()
        };

        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('refresh-public-notices'));
      } catch (error) {
        console.error('标记公告为已读失败:', error);
      } finally {
        markingRead.value = false;
      }
    };

    // 标记公告为不再显示
    const markAsDismissed = async () => {
      if (!userStore || !userStore.isLoggedIn || !notice.value) return;

      try {
        markingDismissed.value = true;
        await markPublicNoticeAsDismissed(notice.value._id);

        // 更新本地状态
        notice.value.readStatus = {
          ...notice.value.readStatus,
          isDismissed: true,
          isRead: true
        };

        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('refresh-public-notices'));

        // 关闭弹窗
        visible.value = false;
      } catch (error) {
        console.error('标记公告为忽略失败:', error);
      } finally {
        markingDismissed.value = false;
      }
    };

    const onOpen = async (e) => {
      notice.value = e.detail;
      visible.value = true;

      // 如果用户已登录且公告未读，自动标记为已读
      if (userStore && userStore.isLoggedIn && notice.value && (!notice.value.readStatus || !notice.value.readStatus.isRead)) {
        try {
          await markPublicNoticeAsRead(notice.value._id);
          notice.value.readStatus = {
            ...notice.value.readStatus,
            isRead: true,
            readAt: new Date()
          };
          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('refresh-public-notices'));
        } catch (error) {
          console.error('自动标记公告为已读失败:', error);
        }
      }
    };

    onMounted(() => window.addEventListener('open-public-notice', onOpen));
    onUnmounted(() => window.removeEventListener('open-public-notice', onOpen));

    return {
      visible,
      notice,
      renderBody,
      formatTime,
      openLink,
      markAsRead,
      markAsDismissed,
      markingRead,
      markingDismissed,
      userStore
    };
  }
};
</script>

<style scoped>
.viewer-body{ max-height: 70vh; overflow-y: auto; }
.viewer-body.min-height{ min-height: 40vh; }
.viewer-title{ margin: 0 0 8px; }
.viewer-meta{ display:flex; align-items:center; gap:12px; color:#909399; margin-bottom:8px; }
.viewer-content :deep(img){ max-width:100%; height:auto; }
.viewer-content :deep(pre){ background:#f6f8fa; padding:12px; overflow:auto; }
.viewer-actions{ margin-top: 12px; display: flex; gap: 8px; }
.dialog-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.dialog-title { font-size: 18px; font-weight: 600; }
.status-indicators { display: flex; gap: 8px; }
</style>

