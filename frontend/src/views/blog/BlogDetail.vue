<template>
  <div class="blog-detail-page">
    <div v-loading="loading" class="page-container">
      <div v-if="article" class="blog-detail-layout">
        <!-- 主要内容容器 -->
        <div class="main-container">
          <div class="unified-container">
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
                    @click="goToUserProfile"
                  >
                    <span class="avatar-fallback">
                      {{
                        (
                          (article.author &&
                            (article.author.displayName || article.author.username)) ||
                          '匿名'
                        ).charAt(0)
                      }}
                    </span>
                  </div>
                  <div class="author-details">
                    <span class="author-name" @click="goToUserProfile">{{
                      (article.author && (article.author.displayName || article.author.username)) ||
                      '匿名'
                    }}</span>
                    <div class="meta-info">
                      <span class="publish-date">{{
                        formatDate(article.publishedAt || article.createdAt)
                      }}</span>
                      <span class="divider"></span>
                      <span class="read-time">约 {{ readTime }} 分钟阅读</span>
                    </div>
                  </div>

                  <!-- 关注按钮 -->
                  <div v-if="article.author && article.author._id" class="author-actions">
                    <FollowButton
                      :user-id="article.author._id"
                      :user="article.author"
                      source="article"
                      size="small"
                      @follow-change="handleFollowChange"
                    />
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

                  <!-- 点赞按钮 -->
                  <div class="like-action">
                    <ArticleLikeButton
                      v-if="article._id"
                      :article-id="article._id"
                      :initial-liked="article.isLiked || false"
                      :initial-like-count="article.likeCount || 0"
                      size="small"
                      :show-text="false"
                      @like-changed="handleLikeChange"
                    />
                  </div>

                  <!-- 收藏按钮 -->
                  <div class="bookmark-action">
                    <BookmarkButton
                      v-if="article._id"
                      target-type="article"
                      :target-id="article._id"
                      :initial-bookmarked="initialBookmarked"
                      :initial-bookmark-count="initialBookmarkCount"
                      size="small"
                      :show-text="false"
                      @bookmark-changed="handleBookmarkChange"
                    />
                  </div>
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
            v-if="settingsStore?.blogConfig?.enableComments !== false"
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
          </div>
        </div>

        <!-- 浮动侧边栏 -->
        <aside class="floating-sidebar" :class="{ 'sidebar-hidden': sidebarHidden }">
          <!-- 侧边栏切换按钮 -->
          <button class="sidebar-toggle" @click="toggleSidebar" :title="sidebarHidden ? '显示侧边栏' : '隐藏侧边栏'">
            <span v-if="sidebarHidden">📖</span>
            <span v-else>✕</span>
          </button>

          <!-- 侧边栏内容 -->
          <div class="sidebar-content">
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
          </div>
        </aside>
      </div>

      <!-- 确保页面有足够高度显示Footer -->
      <div style="height: 100px;"></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import api from '@/api';
import CommentList from '@/components/CommentList.vue';
import FollowButton from '@/components/social/FollowButton.vue';
import BookmarkButton from '@/components/social/BookmarkButton.vue';
import ArticleLikeButton from '@/components/social/ArticleLikeButton.vue';
import { useSettingsStore } from '@/stores/settings';
import { useUserStore } from '@/stores/user';
import { getAvatarStyle } from '@/utils/avatar';
import { checkBookmarkStatus, getContentBookmarkStats } from '@/api/bookmarks';

export default {
  name: 'BlogDetail',
  components: {
    CommentList,
    FollowButton,
    BookmarkButton,
    ArticleLikeButton
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const settingsStore = useSettingsStore();
    const article = ref(null);
    const loading = ref(false);
    const highlightCommentId = ref(null);
    const pendingHighlight = ref(null);
    const targetPage = ref(1);
    const tableOfContents = ref([]);
    const relatedArticles = ref([]);
    const sidebarHidden = ref(false);

    // 收藏初始状态（用于刷新后保持状态）
    const initialBookmarked = ref(false);
    const initialBookmarkCount = ref(0);

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

        // 刷新收藏状态与数量（并行获取）
        if (article.value && article.value._id) {
          await refreshBookmarkState(article.value._id);
        } else {
          initialBookmarked.value = false;
          initialBookmarkCount.value = 0;
        }
      } catch (error) {
        console.error('获取文章失败:', error);
      } finally {
        loading.value = false;
      }
    };


    // 刷新收藏初始状态与数量（用于页面加载和路由切换后）
    const refreshBookmarkState = async (id) => {
      try {
        // 只有登录用户才检查收藏状态
        const userStore = useUserStore();
        if (!userStore.isLoggedIn) {
          initialBookmarked.value = false;
          initialBookmarkCount.value = 0;
          return;
        }

        const [countRes, statusRes] = await Promise.allSettled([
          getContentBookmarkStats('article', id),
          checkBookmarkStatus([{ type: 'article', id }])
        ]);

        if (countRes.status === 'fulfilled') {
          initialBookmarkCount.value = countRes.value?.data?.data?.count || 0;
        } else {
          initialBookmarkCount.value = 0;
        }

        if (statusRes.status === 'fulfilled') {
          const key = `article_${id}`;
          initialBookmarked.value = !!statusRes.value?.data?.data?.[key];
        } else {
          initialBookmarked.value = false;
        }
      } catch (e) {
        console.error('获取收藏状态失败:', e);
        initialBookmarked.value = false;
        initialBookmarkCount.value = 0;
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

    // 窗口大小变化时重新调整布局
    const handleResize = () => {
      const unifiedContainer = document.querySelector('.unified-container');
      if (unifiedContainer && window.innerWidth > 1200) {
        if (sidebarHidden.value) {
          unifiedContainer.style.setProperty('--js-margin-right', '0px');
          unifiedContainer.style.setProperty('--js-max-width', '1000px');
          unifiedContainer.classList.add('js-layout-controlled');
        } else {
          // 动态计算边距：侧边栏宽度 + 间距
          const sidebarWidth = window.innerWidth > 1600 ? 280 : 240; // 提高阈值，更多情况下使用较小宽度
          const spacing = 15; // 进一步减少间距：侧边栏右侧15px
          const marginRight = sidebarWidth + spacing;

          // 基于视窗宽度的直接计算方法
          const viewportWidth = window.innerWidth;
          // page-container的左右padding: var(--spacing-4) = 16px
          const pageContainerPadding = 16;

          // 方法1：基于页面容器实际宽度
          const pageContainer = document.querySelector('.page-container');
          const containerWidth = pageContainer ? pageContainer.offsetWidth : Math.min(viewportWidth - pageContainerPadding * 2, 1200);

          // 方法2：基于视窗宽度直接计算（更准确）
          const maxContainerWidth = 1200; // page-container的max-width
          const effectiveContainerWidth = Math.min(viewportWidth - pageContainerPadding * 2, maxContainerWidth);

          // 使用更准确的容器宽度
          const finalContainerWidth = Math.max(containerWidth, effectiveContainerWidth);
          const availableContentWidth = finalContainerWidth - marginRight;

          // 最激进的空间利用策略：
          // 1. 使用可用宽度的95%（最大化利用空间，留少量边距）
          // 2. 在超宽屏时适当限制，但允许更宽的内容
          // 3. 最小600px（保证可读性）
          let maxWidth;
          if (availableContentWidth > 1600) {
            // 超超宽屏（>1600px可用宽度）：使用94%利用率
            maxWidth = availableContentWidth * 0.94;
          } else if (availableContentWidth > 1400) {
            // 超宽屏（1400-1600px可用宽度）：使用92%利用率
            maxWidth = availableContentWidth * 0.92;
          } else {
            // 普通宽屏：使用95%的可用宽度
            maxWidth = availableContentWidth * 0.95;
          }
          maxWidth = Math.max(maxWidth, 600);

          // 特殊处理：如果剩余空白超过120px，进一步增加内容宽度
          const rightSpace = availableContentWidth - maxWidth;
          if (rightSpace > 120) {
            maxWidth = availableContentWidth - 100; // 只留100px空白
          }



          // 使用CSS变量 + CSS类的方式来强制应用样式
          unifiedContainer.style.setProperty('--js-margin-right', `${marginRight}px`);
          unifiedContainer.style.setProperty('--js-max-width', `${maxWidth}px`);

          // 添加CSS类来强制应用样式
          unifiedContainer.classList.add('js-layout-controlled');

          // 确保父容器没有限制
          const mainContainer = unifiedContainer.parentElement;
          if (mainContainer && mainContainer.classList.contains('main-container')) {
            mainContainer.style.setProperty('max-width', 'none', 'important');
            mainContainer.style.setProperty('width', '100%', 'important');
          }

          // 强制重新计算布局
          unifiedContainer.offsetHeight; // 触发重排
        }
      } else if (unifiedContainer && window.innerWidth <= 1200) {
        // 小屏幕时重置样式
        unifiedContainer.classList.remove('js-layout-controlled');
        unifiedContainer.style.removeProperty('--js-margin-right');
        unifiedContainer.style.removeProperty('--js-max-width');
      }
    };

    onMounted(() => {
      fetchArticle();

      // 加载设置
      if (!settingsStore.isLoaded) {
        settingsStore.loadSettings();
      }

      nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        // 初始化布局（延迟一点确保DOM完全渲染）
        setTimeout(handleResize, 100);
      });

      // 添加滚动监听器
      window.addEventListener('scroll', updateActiveHeading);
      window.addEventListener('resize', handleResize);
      // 初始化激活状态
      updateActiveHeading();
    });



    onUnmounted(() => {
      // 清理滚动监听器
      window.removeEventListener('scroll', updateActiveHeading);
      window.removeEventListener('resize', handleResize);
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

    // 跳转到用户资料页面
    const goToUserProfile = () => {
      if (article.value?.author?._id) {
        router.push(`/user/${article.value.author._id}`);
      }
    };

    // 切换侧边栏显示/隐藏
    const toggleSidebar = () => {
      sidebarHidden.value = !sidebarHidden.value;

      // 动态调整主内容宽度
      nextTick(() => {
        handleResize();
      });
    };



    // 处理关注状态变化
    const handleFollowChange = (data) => {
      console.log('关注状态变化:', data);
      // 这里可以添加一些UI反馈或者更新作者信息
    };

    // 处理点赞状态变化
    const handleLikeChange = (data) => {
      console.log('点赞状态变化:', data);
      // 更新文章的点赞数据
      if (article.value) {
        article.value.isLiked = data.liked;
        article.value.likeCount = data.likeCount;
      }
    };

    // 处理收藏状态变化
    const handleBookmarkChange = (data) => {
      // 同步父组件中用于初始渲染的值，保证刷新/路由切换后一致
      initialBookmarked.value = !!data.bookmarked;
      if (typeof data.bookmarkCount === 'number') {
        initialBookmarkCount.value = data.bookmarkCount;
      }
    };

    return {
      settingsStore,
      article,
      initialBookmarked,
      initialBookmarkCount,
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
      activeHeadingId,
      goToUserProfile,
      handleFollowChange,
      handleLikeChange,
      handleBookmarkChange,
      sidebarHidden,
      toggleSidebar
    };
  }
};
</script>

<style scoped>
.blog-detail-page {
  min-height: 100vh;
  position: relative;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6) var(--spacing-4);
}

/* 统一容器样式 */
.unified-container {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  padding: var(--spacing-6);
}

/* JavaScript控制的布局样式 */
.unified-container.js-layout-controlled {
  margin: 0 !important;
  margin-right: var(--js-margin-right, 295px) !important;
  max-width: var(--js-max-width, 1489px) !important;
  width: auto !important;
  box-sizing: border-box !important;
}

/* 布局 */
.blog-detail-layout {
  position: relative;
  width: 100%;
}

.main-container {
  width: 100%;
  max-width: 100%;
}

.main-content {
  min-width: 0;
}

/* 浮动侧边栏 */
.floating-sidebar {
  position: fixed;
  top: 120px;
  right: 20px;
  width: 280px;
  max-height: calc(100vh - 140px);
  overflow: visible; /* 改为visible，让按钮可以显示在容器外 */
  z-index: 100;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: var(--spacing-4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

/* 侧边栏内容区域，单独处理滚动 */
.floating-sidebar .sidebar-content {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 10px; /* 增加内边距，确保边框不被裁剪 */
  box-sizing: border-box;
}

/* 确保主内容不被侧边栏遮挡，同时优化阅读宽度 */
@media (min-width: 1201px) {
  .unified-container {
    /* 宽度和边距由JavaScript动态控制 */
    transition: margin-right 0.3s ease, max-width 0.3s ease;
  }

  /* 当屏幕很宽时，内容居中显示 */
  .main-container {
    display: flex;
    justify-content: center;
  }
}

/* 面包屑 */
.breadcrumb {
  margin-bottom: var(--spacing-6);
}

.breadcrumb .btn {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.8);
  color: #2c3e50;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb .btn:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: #3498db;
  color: #2c3e50;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
}

/* 文章头部 */
.article-header {
  margin-bottom: var(--spacing-6);
}

.article-title {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: #2c3e50;
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-6);
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-6);
  padding-bottom: var(--spacing-6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.author-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  justify-content: space-between;
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
  cursor: pointer;
  transition: transform 0.2s ease;
}

.author-avatar:hover {
  transform: scale(1.05);
}

.avatar-fallback {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  flex: 1;
}

.author-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: #2c3e50;
  cursor: pointer;
  transition: color 0.2s ease;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.author-name:hover {
  color: #3498db;
}

.author-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.meta-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: #34495e;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.divider {
  color: #7f8c8d;
}

.article-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.bookmark-action {
  margin-left: auto;
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
  margin-bottom: var(--spacing-4);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: var(--spacing-3);
  backdrop-filter: blur(10px);
}

.floating-sidebar .toc-card {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: var(--spacing-4);
}

.table-of-contents {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  max-height: 400px;
  overflow-y: auto;
  padding-right: var(--spacing-2);
  padding-left: var(--spacing-2);
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
  color: #34495e;
  text-decoration: none;
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  transition: all var(--transition-fast);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.toc-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: #2c3e50;
}

.toc-link.active {
  background-color: #3498db;
  color: white;
  font-weight: var(--font-weight-medium);
  border: 2px solid #2980b9; /* 选中时额外蓝色边框，使用更深的蓝色 */
  box-shadow: 0 0 0 1px #3498db; /* 外层阴影模拟边框，确保可见 */
}

/* 防止目录项高亮或聚焦描边被裁剪 */
.toc-link {
  border-radius: 8px;
  outline-offset: 2px;
  margin: 4px 2px; /* 增加上下外边距，为边框和阴影留出更多空间 */
  box-sizing: border-box;
  position: relative; /* 为阴影定位 */
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
  margin-bottom: var(--spacing-4);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: var(--spacing-3);
  backdrop-filter: blur(10px);
}

.floating-sidebar .related-articles {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 0;
}

/* 浮动侧边栏标题 */
.floating-sidebar .card-header h4 {
  color: #2c3e50;
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: var(--spacing-3);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: var(--spacing-2);
}

/* 浮动侧边栏滚动条美化 */
.floating-sidebar .sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.floating-sidebar .sidebar-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.floating-sidebar .sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.floating-sidebar .sidebar-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 侧边栏切换按钮 */
.sidebar-toggle {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: #2c3e50;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 101;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 侧边栏隐藏状态 */
.floating-sidebar.sidebar-hidden {
  transform: translateX(calc(100% - 32px)); /* 只隐藏内容，保留按钮可见 */
}

.floating-sidebar.sidebar-hidden .sidebar-content {
  opacity: 0;
  pointer-events: none;
}

/* 隐藏状态下的切换按钮 */
.floating-sidebar.sidebar-hidden .sidebar-toggle {
  background: rgba(52, 152, 219, 0.9);
  color: white;
  border-color: rgba(52, 152, 219, 0.8);
  transform: scale(1.1);
}

.floating-sidebar.sidebar-hidden .sidebar-toggle:hover {
  background: rgba(52, 152, 219, 1);
  transform: scale(1.2);
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
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.related-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.related-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: #2c3e50;
  margin-bottom: var(--spacing-1);
  line-height: var(--line-height-tight);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  word-break: break-word;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.related-date {
  font-size: var(--font-size-xs);
  color: #7f8c8d;
  font-weight: 500;
}

/* 响应式设计 */
@media (min-width: 1201px) and (max-width: 1600px) {
  .floating-sidebar {
    width: 240px;
    right: 10px;
  }

  /* 宽度和边距由JavaScript动态控制 */
}

@media (max-width: 1200px) {
  .unified-container {
    margin-right: 0; /* 移除右边距 */
  }

  .floating-sidebar {
    position: static;
    width: 100%;
    max-width: none;
    max-height: none;
    margin-top: var(--spacing-6);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .floating-sidebar .toc-card,
  .floating-sidebar .related-articles {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .article-title {
    font-size: var(--font-size-3xl);
  }

  .unified-container {
    border-radius: 16px;
    padding: var(--spacing-4);
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: var(--spacing-4) var(--spacing-3);
  }

  .unified-container {
    border-radius: 12px;
    padding: var(--spacing-3);
    margin-left: var(--spacing-2);
    margin-right: var(--spacing-2);
  }

  .floating-sidebar {
    border-radius: 12px;
    padding: var(--spacing-3);
    margin: var(--spacing-4) var(--spacing-2) 0;
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

  .markdown-content {
    padding: var(--spacing-4);
  }
}

/* Markdown内容样式 */
.markdown-content {
  line-height: var(--line-height-relaxed);
  color: #2c3e50;
  background: rgba(255, 255, 255, 0.05);
  padding: var(--spacing-6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: var(--spacing-6);
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
