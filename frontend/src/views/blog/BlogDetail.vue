<template>
  <div class="blog-detail-page">
    <div v-loading="loading" class="page-container">
      <div v-if="article" class="blog-layout">
        <!-- 主要内容 -->
        <main class="main-content">
          <!-- 文章头部 -->
          <header class="article-header card">
            <div class="card-body">
              <!-- 返回按钮 -->
              <div class="breadcrumb">
                <button class="btn btn-ghost btn-sm" @click="$router.go(-1)">← 返回</button>
              </div>

              <!-- 文章标题 -->
              <h1 class="article-title">{{ article.title }}</h1>

              <!-- 文章元信息 -->
              <div class="article-meta">
                <div class="author-section">
                  <div
                    class="author-avatar"
                    :style="getAuthorAvatarStyle(article.author && article.author.avatar)"
                  >
                    <span class="avatar-fallback">
                      {{ ((article.author && article.author.username) || '匿名').charAt(0) }}
                    </span>
                  </div>
                  <div class="author-details">
                    <span class="author-name">{{
                      (article.author && article.author.username) || '匿名'
                    }}</span>
                    <div class="meta-info">
                      <span class="publish-date">{{
                        formatDate(article.publishedAt || article.createdAt)
                      }}</span>
                      <span class="divider"></span>
                      <span class="read-time">约 {{ readTime }} 分钟阅读</span>
                    </div>
                  </div>
                </div>

                <div class="article-stats">
                  <span class="badge badge-gray">
                    <i class="stat-icon">👁</i>
                    {{ article.viewCount || 0 }} 阅读
                  </span>
                  <span class="badge badge-gray">
                    <i class="stat-icon">💬</i>
                    {{ article.commentCount || 0 }} 评论
                  </span>
                </div>
              </div>

              <!-- 文章标签 -->
              <div v-if="article.tags && article.tags.length > 0" class="article-tags">
                <span v-for="tag in article.tags" :key="tag" class="badge badge-primary">
                  {{ tag }}
                </span>
              </div>
            </div>
          </header>

          <!-- 文章内容 -->
          <article class="article-content card">
            <div class="card-body">
              <div class="markdown-content" v-html="renderedContent"></div>
            </div>
          </article>

          <!-- 评论区域 -->
          <section
            v-if="settingsStore.blogConfig?.enableComments !== false"
            class="comments-section card"
          >
            <div class="card-header">
              <h3>评论区</h3>
            </div>
            <CommentList
              v-if="article"
              :article-id="article._id"
              :highlight-comment-id="highlightCommentId"
              :target-page="targetPage"
              @comments-loaded="handleCommentsLoaded"
            />
          </section>
        </main>

        <!-- 侧边栏 -->
        <aside class="sidebar">
          <!-- 目录 -->
          <div v-if="tableOfContents.length > 0" class="toc-card card">
            <div class="card-header">
              <h4>目录</h4>
            </div>
            <div class="card-body">
              <nav class="table-of-contents">
                <a
                  v-for="heading in tableOfContents"
                  :key="heading.id"
                  :href="`#${heading.id}`"
                  :class="[
                    'toc-link',
                    `toc-level-${heading.level}`,
                    { active: activeHeadingId === heading.id }
                  ]"
                  @click.prevent="scrollToHeading(heading.id)"
                >
                  {{ heading.text }}
                </a>
              </nav>
            </div>
          </div>

          <!-- 相关文章 -->
          <div v-if="relatedArticles.length > 0" class="related-articles card">
            <div class="card-header">
              <h4>相关文章</h4>
            </div>
            <div class="card-body">
              <div class="related-list">
                <a
                  v-for="related in relatedArticles"
                  :key="related._id"
                  :href="`/blog/${related._id}`"
                  class="related-item"
                  @click.prevent="$router.push(`/blog/${related._id}`)"
                >
                  <h5 class="related-title">{{ related.title }}</h5>
                  <span class="related-date">{{ formatDate(related.createdAt) }}</span>
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import api from '@/api';
import CommentList from '@/components/CommentList.vue';
import { useSettingsStore } from '@/stores/settings';
import { getAvatarStyle } from '@/utils/avatar';

export default {
  name: 'BlogDetail',
  components: {
    CommentList
  },
  setup() {
    const route = useRoute();
    const settingsStore = useSettingsStore();
    const article = ref(null);
    const loading = ref(false);
    const highlightCommentId = ref(null);
    const pendingHighlight = ref(null);
    const targetPage = ref(1);
    const tableOfContents = ref([]);
    const relatedArticles = ref([]);

    // 配置marked
    const renderer = new marked.Renderer();

    // 自定义图片渲染，处理相对路径
    renderer.image = function (href, title, text) {
      // 处理新版marked.js可能传递token对象的情况
      let actualHref = href;
      let actualTitle = title;
      let actualText = text;

      // 如果href是对象（token），提取实际的href值
      if (typeof href === 'object' && href !== null) {
        actualHref = href.href || href.src || '';
        actualTitle = href.title || title || '';
        actualText = href.text || href.alt || text || '';
      }

      // 确保actualHref是字符串
      actualHref = String(actualHref || '');
      actualTitle = String(actualTitle || '');
      actualText = String(actualText || '');

      let fullHref = actualHref;
      if (actualHref && !actualHref.startsWith('http://') && !actualHref.startsWith('https://')) {
        // 规范化相对路径，确保以斜杠开头
        const normalized = actualHref.startsWith('/') ? actualHref : `/${actualHref}`;
        fullHref = `${window.location.origin}${normalized}`;
      }

      const titleAttr = actualTitle ? ` title="${actualTitle}"` : '';
      return `<img src="${fullHref}" alt="${actualText}"${titleAttr} style="max-width: 100%; height: auto;" />`;
    };

    marked.setOptions({
      renderer: renderer,
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Highlight error:', err);
          }
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true
    });

    // 计算阅读时间
    const readTime = computed(() => {
      if (!article.value?.content) return 0;
      const wordsPerMinute = 200; // 假设每分钟阅读200字
      const wordCount = article.value.content.replace(/<[^>]*>/g, '').length;
      return Math.ceil(wordCount / wordsPerMinute);
    });

    // 渲染Markdown内容
    const renderedContent = computed(() => {
      if (!article.value?.content) return '';
      try {
        let html = marked(article.value.content);

        // 生成目录并为标题添加ID
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

        const toc = [];
        headings.forEach((heading, index) => {
          const id = `heading-${index}`;
          heading.id = id;
          toc.push({
            id,
            text: heading.textContent,
            level: parseInt(heading.tagName.charAt(1))
          });
        });

        tableOfContents.value = toc;

        // 返回修改后的HTML
        return tempDiv.innerHTML;
      } catch (error) {
        console.error('Markdown parsing error:', error);
        return '<p>内容解析错误</p>';
      }
    });

    // 当前激活的目录项
    const activeHeadingId = ref('');

    // 滚动到指定标题
    const scrollToHeading = id => {
      // 使用nextTick确保DOM已更新
      nextTick(() => {
        const element = document.getElementById(id);

        if (element) {
          const headerHeight = 70;
          const extraOffset = 20; // 额外间距，确保标题不被遮挡

          // 先滚动到元素位置
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });

          // 然后调整位置以避免被header遮挡
          setTimeout(() => {
            const currentElementTop = element.getBoundingClientRect().top;
            const adjustmentNeeded = currentElementTop - (headerHeight + extraOffset);

            if (Math.abs(adjustmentNeeded) > 5) {
              const newScrollTop = Math.max(0, window.pageYOffset + adjustmentNeeded);
              window.scrollTo({
                top: newScrollTop,
                behavior: 'smooth'
              });
            }
          }, 100);

          // 更新激活状态
          activeHeadingId.value = id;
        }
      });
    };

    // 监听滚动，更新激活的目录项
    const updateActiveHeading = () => {
      const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');

      const headerHeight = 70;
      const offset = headerHeight + 50;

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        const rect = heading.getBoundingClientRect();

        if (rect.top <= offset) {
          activeHeadingId.value = heading.id;
          break;
        }
      }
    };

    const fetchArticle = async () => {
      loading.value = true;
      try {
        const response = await api.get(`/articles/${route.params.id}`);
        article.value = response.data.data;
      } catch (error) {
        console.error('获取文章失败:', error);
      } finally {
        loading.value = false;
      }
    };

    const getAuthorAvatarStyle = avatarUrl => {
      return getAvatarStyle(avatarUrl);
    };

    const formatDate = date => {
      return new Date(date).toLocaleDateString('zh-CN');
    };

    // 滚动到指定评论
    const scrollToComment = async commentId => {
      await nextTick();

      // 重试机制，最多尝试5次
      let attempts = 0;
      const maxAttempts = 5;

      const tryScroll = () => {
        attempts++;
        const element = document.getElementById(`comment-${commentId}`);

        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          if (pendingHighlight.value === commentId) {
            pendingHighlight.value = null;
          }
          return true;
        } else if (attempts < maxAttempts) {
          setTimeout(tryScroll, 500);
        }
        return false;
      };

      if (!tryScroll()) {
        setTimeout(tryScroll, 1000);
      }
    };

    // 处理评论加载完成
    const handleCommentsLoaded = () => {
      if (pendingHighlight.value) {
        scrollToComment(pendingHighlight.value);
      }
    };

    // 监听路由查询参数变化
    watch(
      () => route.query,
      (newQuery, oldQuery) => {
        const newHighlight = newQuery.highlight;
        const newPage = parseInt(newQuery.page) || 1;
        const timestamp = newQuery.t;

        // 重置状态
        if (timestamp && timestamp !== oldQuery?.t) {
          pendingHighlight.value = null;
          highlightCommentId.value = null;
          targetPage.value = 1;
        }

        // 处理目标页面
        if (newPage !== (oldQuery?.page ? parseInt(oldQuery.page) : 1)) {
          targetPage.value = newPage;
        }

        // 处理高亮评论
        if (newHighlight && newHighlight !== oldQuery?.highlight) {
          highlightCommentId.value = newHighlight;
          pendingHighlight.value = newHighlight;

          setTimeout(() => {
            scrollToComment(newHighlight);
          }, 100);

          // 3秒后清除高亮
          setTimeout(() => {
            highlightCommentId.value = null;
          }, 3000);
        }
      },
      { immediate: true, deep: true }
    );

    onMounted(() => {
      fetchArticle();

      // 加载设置
      if (!settingsStore.isLoaded) {
        settingsStore.loadSettings();
      }

      nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      });

      // 添加滚动监听器
      window.addEventListener('scroll', updateActiveHeading);
      // 初始化激活状态
      updateActiveHeading();
    });

    onUnmounted(() => {
      // 清理滚动监听器
      window.removeEventListener('scroll', updateActiveHeading);
    });

    // 当路由文章ID变化时，重新获取并滚动到顶部
    watch(
      () => route.params.id,
      async () => {
        await fetchArticle();
        nextTick(() => {
          window.scrollTo({ top: 0, behavior: 'auto' });
        });
      }
    );

    return {
      settingsStore,
      article,
      loading,
      highlightCommentId,
      targetPage,
      tableOfContents,
      relatedArticles,
      readTime,
      renderedContent,
      formatDate,
      handleCommentsLoaded,
      scrollToHeading,
      getAuthorAvatarStyle,
      activeHeadingId
    };
  }
};
</script>

<style scoped>
.blog-detail-page {
  background-color: var(--color-bg-secondary);
  min-height: 100vh;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6) var(--spacing-4);
}

/* 布局 */
.blog-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--spacing-8);
}

.main-content {
  min-width: 0;
}

.sidebar {
  position: sticky;
  top: calc(var(--header-height) + var(--spacing-6)); /* 导航栏高度 + 间距 */
  height: fit-content;
  max-height: calc(100vh - var(--header-height) - var(--spacing-12)); /* 限制最大高度 */
  overflow-y: auto; /* 内容过多时可滚动 */
}

/* 面包屑 */
.breadcrumb {
  margin-bottom: var(--spacing-6);
}

/* 文章头部 */
.article-header {
  margin-bottom: var(--spacing-6);
}

.article-title {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-6);
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-6);
  padding-bottom: var(--spacing-6);
  border-bottom: 1px solid var(--color-border);
}

.author-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-fallback {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.author-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.meta-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.divider {
  color: var(--color-text-tertiary);
}

.article-stats {
  display: flex;
  gap: var(--spacing-2);
}

.stat-icon {
  margin-right: var(--spacing-1);
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

/* 文章内容 */
.article-content {
  margin-bottom: var(--spacing-8);
}

/* 评论区域 */
.comments-section {
  margin-bottom: var(--spacing-8);
}

/* 目录 */
.toc-card {
  margin-bottom: var(--spacing-6);
}

.table-of-contents {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  max-height: 400px;
  overflow-y: auto;
  padding-right: var(--spacing-2);
}

/* 目录滚动条样式 */
.table-of-contents::-webkit-scrollbar {
  width: 4px;
}

.table-of-contents::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
}

.table-of-contents::-webkit-scrollbar-thumb {
  background: var(--color-border-dark);
  border-radius: var(--radius-full);
}

.table-of-contents::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.toc-link {
  display: block;
  padding: var(--spacing-2) var(--spacing-3);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  transition: all var(--transition-fast);
}

.toc-link:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.toc-link.active {
  background-color: var(--color-primary);
  color: white;
  font-weight: var(--font-weight-medium);
}

.toc-level-1 {
  padding-left: var(--spacing-3);
}
.toc-level-2 {
  padding-left: var(--spacing-5);
}
.toc-level-3 {
  padding-left: var(--spacing-6);
}
.toc-level-4 {
  padding-left: var(--spacing-8);
}

/* 相关文章 */
.related-articles {
  margin-bottom: var(--spacing-6);
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.related-item {
  display: block;
  padding: var(--spacing-3);
  border-radius: var(--radius-base);
  text-decoration: none;
  transition: background-color var(--transition-fast);
}

.related-item:hover {
  background-color: var(--color-bg-tertiary);
}

.related-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
  line-height: var(--line-height-tight);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  word-break: break-word;
}

.related-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .blog-layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-6);
  }

  .sidebar {
    position: static;
    order: -1;
  }

  .article-title {
    font-size: var(--font-size-3xl);
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: var(--spacing-4) var(--spacing-3);
  }

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-4);
  }

  .article-title {
    font-size: var(--font-size-2xl);
    line-height: 1.3;
    margin-bottom: var(--spacing-4);
  }
}

/* Markdown内容样式 */
.markdown-content {
  line-height: var(--line-height-relaxed);
  color: var(--color-text-secondary);
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
  margin: var(--spacing-8) 0 var(--spacing-4) 0;
  line-height: var(--line-height-tight);
}

.markdown-content h1 {
  font-size: var(--font-size-3xl);
}
.markdown-content h2 {
  font-size: var(--font-size-2xl);
}
.markdown-content h3 {
  font-size: var(--font-size-xl);
}
.markdown-content h4 {
  font-size: var(--font-size-lg);
}

.markdown-content p {
  margin-bottom: var(--spacing-4);
}

.markdown-content ul,
.markdown-content ol {
  margin-bottom: var(--spacing-4);
  padding-left: var(--spacing-6);
}

.markdown-content li {
  margin-bottom: var(--spacing-2);
}

.markdown-content blockquote {
  margin: var(--spacing-6) 0;
  padding: var(--spacing-4) var(--spacing-6);
  border-left: 4px solid var(--color-primary);
  background-color: var(--color-primary-lighter);
  border-radius: 0 var(--radius-base) var(--radius-base) 0;
}

.markdown-content blockquote p {
  margin: 0;
  font-style: italic;
  color: var(--color-text-primary);
}

.markdown-content pre {
  background-color: var(--color-bg-tertiary);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  margin: var(--spacing-6) 0;
  border: 1px solid var(--color-border);
}

.markdown-content code {
  font-family: var(--font-family-mono);
  font-size: 0.875em;
}

.markdown-content p code {
  background-color: var(--color-bg-tertiary);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
}

.markdown-content img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-base);
  margin: var(--spacing-6) 0;
  box-shadow: var(--shadow-sm);
}

.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-6) 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  overflow: hidden;
}

.markdown-content th,
.markdown-content td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.markdown-content th {
  background-color: var(--color-bg-tertiary);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.markdown-content a {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition-fast);
}

.markdown-content a:hover {
  border-bottom-color: var(--color-primary);
}

.content {
  line-height: 1.8;
}

/* Markdown内容样式 */
.markdown-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #2c3e50;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 24px 0 16px 0;
  font-weight: 600;
  line-height: 1.25;
  color: #1a202c;
}

.markdown-content :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid #e1e8ed;
  padding-bottom: 8px;
}

.markdown-content :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #e1e8ed;
  padding-bottom: 6px;
}

.markdown-content :deep(h3) {
  font-size: 1.25em;
}

.markdown-content :deep(p) {
  margin: 16px 0;
  line-height: 1.7;
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: block;
}

.markdown-content :deep(code) {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9em;
  color: #e83e8c;
}

.markdown-content :deep(pre) {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
  border-radius: 0;
  color: inherit;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #667eea;
  margin: 16px 0;
  padding: 0 16px;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 0 8px 8px 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.markdown-content :deep(li) {
  margin: 8px 0;
  line-height: 1.6;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  overflow: hidden;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e1e8ed;
}

.markdown-content :deep(th) {
  background: #f8f9fa;
  font-weight: 600;
}

.markdown-content :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #e1e8ed;
  margin: 24px 0;
}
</style>
