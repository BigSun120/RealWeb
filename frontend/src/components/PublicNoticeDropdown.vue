<template>
  <el-dropdown v-if="placements.includes('dropdown')" trigger="click" placement="bottom-end">
    <el-button type="text" class="notification-trigger">
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-icon :size="20"><Bell /></el-icon>
      </el-badge>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu class="notification-dropdown">
        <div class="notification-header">
          <span class="title">公告</span>
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
            <div v-for="n in notices" :key="n._id" class="notification-item">
              <div class="notification-body">
                <div class="notification-title">{{ n.title }}</div>
                <div class="notification-content-text" v-html="renderBody(n)"></div>
                <div class="notification-time">{{ formatTime(n.startsAt || n.createdAt) }}</div>
              </div>
              <div class="notification-actions">
                <el-button type="text" size="small" @click.stop="openNotice(n)">{{ n.ctaText || '查看' }}</el-button>
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
import { getLatestPublicNotices } from '@/api/publicNotices';

export default {
  name: 'PublicNoticeDropdown',
  components: { Bell, Loading },
  props: {
    placements: { type: Array, default: () => ['banner','dropdown'] }
  },
  setup() {
    const notices = ref([]);
    const loading = ref(false);
    const unreadSet = ref(new Set());
    let timer = null;
    const router = useRouter();

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
          // 初始化未读集合（仅当首次或新公告出现时）
          const stored = JSON.parse(localStorage.getItem('public_notice_read_v1') || '{}');
          unreadSet.value = new Set(arr.filter(x => !stored[x._id]).map(x => x._id));
        }
      } finally {
        loading.value = false;
      }
    };

    const formatTime = (time) => new Date(time).toLocaleString();

    const openNotice = (n) => {
      // 打开大弹窗预览
      const event = new CustomEvent('open-public-notice', { detail: n });
      window.dispatchEvent(event);
      // 标记为已读，仅减少红点，不移除列表项
      const map = JSON.parse(localStorage.getItem('public_notice_read_v1') || '{}');
      map[n._id] = Date.now();
      localStorage.setItem('public_notice_read_v1', JSON.stringify(map));
      unreadSet.value.delete(n._id);
    };

    const unreadCount = computed(() => unreadSet.value.size);
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

    return { notices, loading, renderBody, openLink, formatTime, openNotice, unreadCount };

  }
};
</script>

<style scoped>
.notification-trigger { padding: 8px; color: #fff; }
.notification-dropdown { width: 360px; max-height: 480px; padding: 0; }
.notification-header { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #ebeef5; background:#fafafa; }
.notification-content { max-height: 400px; overflow-y:auto; }
.loading-container, .empty-container { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; color:#909399; }
.notification-list { padding: 8px 0; }
.notification-item { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; border-left:3px solid transparent; }
.notification-item:hover { background:#f5f7fa; }
.notification-body { flex:1; min-width:0; }
.notification-title { font-weight:500; margin-bottom:4px; font-size:14px; }
.notification-content-text { color:#606266; font-size:13px; line-height:1.4; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.notification-time { color:#909399; font-size:12px; }
</style>

