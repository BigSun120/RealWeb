<template>
  <el-dialog v-model="visible" title="公告详情" width="900px" :close-on-click-modal="true">
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
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';

export default {
  name: 'PublicNoticeViewer',
  setup() {
    const visible = ref(false);
    const notice = ref(null);

    const formatTime = (t) => new Date(t).toLocaleString();
    const renderBody = (n) => n.bodyHtml || marked.parse(n.bodyMarkdown || '');

    const openLink = (url) => {
      if (!url) return;
      if (/^https?:/i.test(url)) {
        window.open(url, '_blank', 'noopener');
      } else if (url.startsWith('/')) {
        try {
          const { useRouter } = require('vue-router');
          useRouter().push(url);
        } catch {
          window.location.href = url;
        }
      } else {
        window.open(url, '_blank', 'noopener');
      }
    };

    const onOpen = (e) => {
      notice.value = e.detail;
      visible.value = true;
    };

    onMounted(() => window.addEventListener('open-public-notice', onOpen));
    onUnmounted(() => window.removeEventListener('open-public-notice', onOpen));

    return { visible, notice, renderBody, formatTime, openLink };
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
.viewer-actions{ margin-top: 12px; }
</style>

