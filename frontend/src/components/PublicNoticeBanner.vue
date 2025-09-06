<template>
  <div v-if="notices.length && placements.includes('banner')" class="public-notice-banner" :class="`level-${notices[0].level}`" v-show="!isDismissed(notices[0]._id)">
    <div class="container">
      <div class="banner-content">
        <div class="banner-text">
          <strong class="title">{{ notices[0].title }}</strong>
          <span class="body" v-html="renderBody(notices[0])"></span>
        </div>
        <div class="banner-actions">
          <el-button v-if="notices[0].link" size="small" type="primary" @click="openLink(notices[0].link)">
            {{ notices[0].ctaText || '查看详情' }}
          </el-button>
          <el-button size="small" type="text" @click="dismiss(notices[0]._id)">不再显示</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { getLatestPublicNotices } from '@/api/publicNotices';
import { marked } from 'marked';

export default {
  name: 'PublicNoticeBanner',
  props: {
    placements: { type: Array, default: () => ['banner','dropdown'] }
  },
  setup() {
    const notices = ref([]);
    let timer = null;

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

    const key = 'public_notice_dismissed_v1';
    const isDismissed = (id) => {
      const map = JSON.parse(localStorage.getItem(key) || '{}');
      return !!map[id];
    };
    const dismiss = (id) => {
      const map = JSON.parse(localStorage.getItem(key) || '{}');
      map[id] = Date.now();
      localStorage.setItem(key, JSON.stringify(map));
    };

    const load = async () => {
      try {
        const res = await getLatestPublicNotices(5);
        if (res.data?.success) notices.value = res.data.data || [];
      } catch (_) {}
    };

    onMounted(() => {
      load();
      timer = setInterval(load, 120 * 1000);
    });

    onUnmounted(() => {
      if (timer) clearInterval(timer);
    });

    return { notices, renderBody, openLink, dismiss, isDismissed };
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
.container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.banner-content { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; }
.title { margin-right: 8px; }
.body :deep(p) { display: inline; margin: 0; }
</style>

