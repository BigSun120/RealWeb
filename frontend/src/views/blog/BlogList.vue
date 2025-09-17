<template>
  <div class="blog-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">博客文章</h1>
      </div>
    </div>

    <!-- 统一的内容容器 -->
    <div class="unified-container">
      <!-- 工具栏区域 -->
      <div class="toolbar-section-wrapper">
        <!-- 第一行：搜索和功能 -->
        <div class="toolbar-row">
          <!-- 搜索区域 -->
          <div class="toolbar-section search-section">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="🔍 搜索文章..."
                class="search-input"
                @input="handleSearch"
              />
              <button v-if="searchQuery" class="clear-search-btn" @click="clearSearch">✕</button>
            </div>
          </div>

          <!-- 分隔符 -->
          <div class="toolbar-divider">|</div>

          <!-- 功能区域 -->
          <div class="toolbar-section action-section">
            <el-button
              type="primary"
              plain
              @click="goToPopularArticles"
              class="action-button"
              size="small"
            >
              热门排行
            </el-button>

            <div class="view-controls">
              <button
                class="view-btn"
                :class="{ active: viewMode === 'list' }"
                @click="switchViewMode('list')"
                title="列表视图"
              >
                📊
              </button>
              <button
                class="view-btn"
                :class="{ active: viewMode === 'grid' }"
                @click="switchViewMode('grid')"
                title="网格视图"
              >
                ⊞
              </button>
            </div>
          </div>
        </div>

        <!-- 第二行：筛选 -->
        <div class="toolbar-row filter-row">
          <div class="filter-container">
            <!-- 分类筛选 -->
            <div class="filter-line">
              <span class="filter-label">分类：</span>
              <div class="filter-items">
                <span
                  v-for="category in filterOptions.categories.slice(0, 8)"
                  :key="category"
                  class="filter-item"
                  :class="{ active: selectedCategory === category }"
                  @click="filterByCategory(category)"
                >
                  {{ category }}
                </span>
              </div>
            </div>

            <!-- 标签筛选 -->
            <div class="filter-line">
              <span class="filter-label">标签：</span>
              <div class="filter-items">
                <span
                  v-for="tag in filterOptions.tags.slice(0, 8)"
                  :key="tag"
                  class="filter-item"
                  :class="{ active: selectedTag === tag }"
                  @click="filterByTag(tag)"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 内容分隔线 -->
      <div class="content-divider"></div>

      <!-- 主内容区域 -->
      <!-- 文章列表容器 -->
      <div class="articles-container">
        <!-- 加载状态 - 根据当前布局模式显示对应的骨架屏 -->
        <div v-if="loading" class="loading-container">
          <!-- 网格模式骨架屏 -->
          <div v-if="isGridMode" class="grid grid-cols-2">
            <div v-for="i in 6" :key="i" class="card">
              <div class="skeleton skeleton-title"></div>
              <div class="skeleton skeleton-text"></div>
              <div class="skeleton skeleton-text"></div>
              <div class="card-footer">
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton skeleton-text" style="width: 100px"></div>
              </div>
            </div>
          </div>

          <!-- 列表模式骨架屏 -->
          <div v-else-if="isListMode" class="list-loading">
            <div v-for="i in 8" :key="i" class="list-skeleton">
              <div class="skeleton skeleton-list-title"></div>
              <div class="skeleton skeleton-list-meta"></div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="filteredArticles.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>{{ searchQuery ? '未找到相关文章' : '暂无文章' }}</h3>
          <p>{{ searchQuery ? '尝试使用其他关键词搜索' : '还没有发布任何文章，敬请期待...' }}</p>
          <button v-if="searchQuery" class="btn btn-primary" @click="clearSearch">清除搜索</button>
        </div>

        <!-- 文章网格模式 -->
        <div v-else-if="isGridMode" class="articles-grid grid grid-cols-2">
          <!-- 网格模式 -->
            <article
              v-for="article in filteredArticles"
              :key="article._id"
              class="article-card card"
              @click="$router.push(`/blog/${article._id}`)"
            >
              <!-- 文章封面 -->
              <div class="article-cover">
                <img
                  v-if="article.coverImage"
                  :src="getFullImageUrl(article.coverImage)"
                  :alt="article.title"
                  class="cover-image"
                  @error="handleImageError"
                />
                <div v-else class="cover-placeholder">
                  <div class="placeholder-content">
                    <i class="placeholder-icon">📄</i>
                    <span class="placeholder-text">{{ article.title.charAt(0) }}</span>
                  </div>
                </div>

                <!-- 文章标签 -->
                <div v-if="article.tags && article.tags.length > 0" class="article-tags">
                  <span
                    v-for="tag in article.tags.slice(0, 2)"
                    :key="tag"
                    class="badge badge-primary"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <!-- 文章内容 -->
              <div class="card-body">
                <h3 class="article-title">{{ article.title }}</h3>
                <p class="article-excerpt">{{ article.excerpt || getExcerpt(article.content) }}</p>
              </div>

              <!-- 文章底部信息 -->
              <div class="card-footer">
                <div class="article-author">
                  <div
                    class="avatar avatar-sm"
                    :style="getAuthorAvatarStyle(article.author && article.author.avatar)"
                  >
                    <span v-if="!article.author || !article.author.avatar" class="avatar-text">
                      {{
                        (
                          (article.author &&
                            (article.author.displayName || article.author.username)) ||
                          '匿名'
                        ).charAt(0)
                      }}
                    </span>
                  </div>
                  <div class="author-info">
                    <span class="author-name">{{
                      (article.author && (article.author.displayName || article.author.username)) ||
                      '匿名'
                    }}</span>
                    <span class="publish-date">{{ formatDate(article.createdAt) }}</span>
                  </div>
                </div>
                <div class="article-stats">
                  <span class="badge badge-gray">
                    <i class="stat-icon">👁</i>
                    {{ article.viewCount || 0 }}
                  </span>
                  <span class="badge badge-gray">
                    <i class="stat-icon">💬</i>
                    {{ article.commentCount || 0 }}
                  </span>
                </div>
              </div>
            </article>
        </div>

        <!-- 文章列表模式 -->
        <div v-else-if="isListMode" class="articles-grid list">
          <div class="table-list">
              <div
                class="table-row"
                v-for="article in filteredArticles"
                :key="article._id"
                @click="$router.push(`/blog/${article._id}`)"
              >
                <!-- 第一行：标题和热门图标 -->
                <div class="row-title">
                  <h3 class="article-title">{{ article.title }}</h3>
                  <span
                    v-if="getPopularityBadge(article.likeCount || 0)"
                    :class="['popularity-badge', getPopularityBadge(article.likeCount || 0).class]"
                  >
                    {{ getPopularityBadge(article.likeCount || 0).icon }}
                    {{ getPopularityBadge(article.likeCount || 0).text }}
                  </span>
                </div>

                <!-- 第二行：作者、时间、统计信息 -->
                <div class="row-meta">
                  <span class="meta-item author">{{
                    (article.author && (article.author.displayName || article.author.username)) ||
                    '匿名'
                  }}</span>
                  <span class="meta-separator">*</span>
                  <span class="meta-item date">{{ formatDate(article.createdAt) }}</span>
                  <span class="meta-separator">*</span>
                  <span class="meta-item stats">
                    👁 {{ article.viewCount || 0 }}
                  </span>
                  <span class="meta-separator">*</span>
                  <span class="meta-item stats">
                    💬 {{ article.commentCount || 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部分页 - 始终显示 -->
      <div class="bottom-pagination" :class="{ 'list-mode': viewMode === 'list' }">
        <div class="pagination-info">
          <span class="total-info">
            共 <strong>{{ totalCount }}</strong> 篇文章
            <span v-if="totalPages > 1"
              >，第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页</span
            >
          </span>
          <div class="page-size-control">
            <label for="page-size-select">每页显示</label>
            <select
              id="page-size-select"
              class="page-size-select"
              v-model.number="pageSizeLocal"
              @change="handlePageSizeChange"
            >
              <option :value="10">10 条</option>
              <option :value="20">20 条</option>
              <option :value="30">30 条</option>
              <option :value="50">50 条</option>
            </select>
          </div>
        </div>

        <!-- 完整分页器 -->
        <div class="pagination-controls">
          <!-- 首页 -->
          <button
            class="pagination-btn pagination-btn-nav"
            :disabled="currentPage === 1"
            @click="changePage(1)"
            title="首页"
          >
            <span class="pagination-icon">⟪</span>
          </button>

          <!-- 上一页 -->
          <button
            class="pagination-btn pagination-btn-nav"
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
            title="上一页"
          >
            <span class="pagination-icon">‹</span>
          </button>

          <!-- 页码 -->
          <div class="page-numbers">
            <template v-for="page in visiblePages">
              <span v-if="page === '...'" :key="`ellipsis-${page}`" class="pagination-ellipsis"
                >...</span
              >
              <button
                v-else
                :key="page"
                class="pagination-btn pagination-btn-page"
                :class="{ active: page === currentPage }"
                @click="changePage(page)"
              >
                {{ page }}
              </button>
            </template>
          </div>

          <!-- 下一页 -->
          <button
            class="pagination-btn pagination-btn-nav"
            :disabled="currentPage === totalPages"
            @click="changePage(currentPage + 1)"
            title="下一页"
          >
            <span class="pagination-icon">›</span>
          </button>

          <!-- 末页 -->
          <button
            class="pagination-btn pagination-btn-nav"
            :disabled="currentPage === totalPages"
            @click="changePage(totalPages)"
            title="末页"
          >
            <span class="pagination-icon">⟫</span>
          </button>

          <!-- 跳转输入 -->
          <div class="page-jump">
            <span>跳至</span>
            <input
              type="number"
              class="page-jump-input"
              :min="1"
              :max="totalPages"
              v-model.number="jumpPage"
              @keyup.enter="handlePageJump"
            />
            <span>页</span>
            <button class="pagination-btn pagination-btn-jump" @click="handlePageJump">跳转</button>
          </div>
        </div>
      </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import api from '@/api';

export default {
  name: 'BlogList',
  setup() {
    const router = useRouter();
    const settingsStore = useSettingsStore();
    const articles = ref([]);
    const loading = ref(false);
    const searchQuery = ref('');
    const selectedTag = ref('全部');
    const selectedCategory = ref('全部');
    const sortBy = ref('publishedAt');
    const sortOrder = ref('desc');
    const currentPage = ref(1);
    const totalCount = ref(0);
    const showAllTags = ref(false);
    const jumpPage = ref(1);

    // 从本地存储加载布局偏好，默认为列表布局
    // 确保viewMode在初始化时就有明确的值，避免渲染时的不确定性
    const savedViewMode = localStorage.getItem('blog-view-mode');
    const viewMode = ref(savedViewMode === 'grid' ? 'grid' : 'list');

    // 布局锁定机制，防止在数据获取过程中布局模式发生变化
    const layoutLocked = ref(false);
    const lockedViewMode = ref(viewMode.value);

    // 使用计算属性确保布局模式的稳定性
    const isGridMode = computed(() => {
      const mode = layoutLocked.value ? lockedViewMode.value : viewMode.value;
      return mode === 'grid';
    });
    const isListMode = computed(() => {
      const mode = layoutLocked.value ? lockedViewMode.value : viewMode.value;
      return mode === 'list';
    });


    const pageSizeLocal = ref(parseInt(localStorage.getItem('blog-page-size')) || 12);

    // 规范化每页数量（避免本地存了无效值导致下拉无选项、分页异常）
    const allowedPageSizes = [10, 20, 30, 50];
    if (!allowedPageSizes.includes(pageSizeLocal.value)) {
      pageSizeLocal.value = allowedPageSizes[0];
      localStorage.setItem('blog-page-size', pageSizeLocal.value.toString());
    }

    // 使用博客设置中的pageSize，如果未加载则使用默认值12
    const pageSize = computed(() => settingsStore.blogConfig?.pageSize || pageSizeLocal.value);

    // 筛选选项
    const filterOptions = ref({
      categories: ['全部'],
      tags: ['全部'],
      authors: [],
      stats: {}
    });

    // 计算属性
    const filteredArticles = computed(() => {
      return articles.value; // 现在筛选在后端进行
    });

    const hasActiveFilters = computed(() => {
      return (
        selectedCategory.value !== '全部' ||
        selectedTag.value !== '全部' ||
        searchQuery.value.trim() !== ''
      );
    });

    const totalPages = computed(() => {
      return Math.ceil(totalCount.value / pageSize.value);
    });

    // 方法
    const fetchArticles = async () => {
      // 锁定当前布局模式，防止在数据获取过程中发生变化
      layoutLocked.value = true;
      lockedViewMode.value = viewMode.value;

      loading.value = true;
      try {
        const params = {
          page: currentPage.value,
          limit: pageSize.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value
        };

        // 添加筛选参数
        if (selectedCategory.value !== '全部') {
          params.category = selectedCategory.value;
        }
        if (selectedTag.value !== '全部') {
          params.tag = selectedTag.value;
        }
        if (searchQuery.value.trim()) {
          params.search = searchQuery.value.trim();
        }

        const response = await api.get('/articles', { params });
        articles.value = response.data.data.articles || [];
        totalCount.value =
          (response.data.data.pagination && response.data.data.pagination.total) || 0;
      } catch (error) {
        console.error('获取文章失败:', error);
        articles.value = [];
      } finally {
        loading.value = false;
        // 解锁布局模式
        layoutLocked.value = false;
      }
    };

    // 获取筛选选项
    const fetchFilterOptions = async () => {
      try {
        const response = await api.get('/articles/filter-options');
        if (response.data.code === 200) {
          filterOptions.value = response.data.data;
        }
      } catch (error) {
        console.error('获取筛选选项失败:', error);
      }
    };

    const formatDate = date => {
      const now = new Date();
      const articleDate = new Date(date);
      const diffTime = Math.abs(now - articleDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return '昨天';
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)}周前`;
      } else {
        return articleDate.toLocaleDateString('zh-CN');
      }
    };

    const getExcerpt = content => {
      if (!content) return '暂无摘要...';
      const text = content.replace(/<[^>]*>/g, ''); // 移除HTML标签
      return text.length > 120 ? text.substring(0, 120) + '...' : text;
    };

    // 搜索防抖
    let searchTimeout = null;
    const handleSearch = () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      searchTimeout = setTimeout(() => {
        currentPage.value = 1;
        fetchArticles();
      }, 300); // 300ms防抖
    };

    const filterByCategory = category => {
      selectedCategory.value = category;
      currentPage.value = 1;
      fetchArticles();
    };

    const filterByTag = tag => {
      selectedTag.value = tag;
      currentPage.value = 1;
      fetchArticles();
    };

    const handleSortChange = () => {
      currentPage.value = 1;
      fetchArticles();
    };

    const toggleSortOrder = () => {
      sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
      currentPage.value = 1;
      fetchArticles();
    };

    const clearSearch = () => {
      searchQuery.value = '';
      currentPage.value = 1;
      fetchArticles();
    };

    const clearAllFilters = () => {
      searchQuery.value = '';
      selectedCategory.value = '全部';
      selectedTag.value = '全部';
      sortBy.value = 'publishedAt';
      sortOrder.value = 'desc';
      currentPage.value = 1;
      fetchArticles();
    };

    const handlePageSizeChange = () => {
      // 保存到本地存储
      localStorage.setItem('blog-page-size', pageSizeLocal.value.toString());
      currentPage.value = 1;

      // fetchArticles会自动锁定布局模式
      fetchArticles();
    };

    // 布局切换处理
    const switchViewMode = mode => {
      viewMode.value = mode;
      // 保存到本地存储
      localStorage.setItem('blog-view-mode', mode);
    };

    // 分页跳转处理
    const handlePageJump = () => {
      const page = jumpPage.value;
      if (page && page >= 1 && page <= totalPages.value) {
        changePage(page);
      } else {
        jumpPage.value = currentPage.value;
      }
    };

    // 改进的visiblePages计算，支持省略号
    const visiblePages = computed(() => {
      const total = totalPages.value;
      const current = currentPage.value;
      const pages = [];

      if (total <= 7) {
        // 总页数少于等于7页，显示所有页码
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // 总页数大于7页，使用省略号
        if (current <= 4) {
          // 当前页在前面
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        } else if (current >= total - 3) {
          // 当前页在后面
          pages.push(1);
          pages.push('...');
          for (let i = total - 4; i <= total; i++) {
            pages.push(i);
          }
        } else {
          // 当前页在中间
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        }
      }

      return pages;
    });

    const changePage = page => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
        fetchArticles();
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    // 获取完整的图片URL
    const getFullImageUrl = imageUrl => {
      if (!imageUrl) return '';

      // 如果已经是完整的URL，直接返回
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      // 如果是相对路径，添加基础URL
      return `${window.location.origin}${imageUrl}`;
    };

    // 获取作者头像样式
    const getAuthorAvatarStyle = avatarUrl => {
      if (!avatarUrl) return {};

      // 处理相对路径
      let fullUrl = avatarUrl;
      if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        fullUrl = `${window.location.origin}${avatarUrl}`;
      }

      return {
        backgroundImage: `url(${fullUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    };

    // 处理图片加载错误
    const handleImageError = event => {
      // 隐藏图片，显示占位符
      const imgElement = event.target;
      const coverDiv = imgElement.closest('.article-cover');
      const placeholderDiv = coverDiv.querySelector('.cover-placeholder');

      if (imgElement && placeholderDiv) {
        imgElement.style.display = 'none';
        placeholderDiv.style.display = 'flex';
      }
    };

    // 同步跳转页码与当前页码
    watch(currentPage, newPage => {
      jumpPage.value = newPage;
    });

    onMounted(() => {
      // 加载设置
      if (!settingsStore.isLoaded) {
        settingsStore.loadSettings();
      }

      fetchFilterOptions();
      fetchArticles();
    });

    // 跳转到热门文章页面
    const goToPopularArticles = () => {
      router.push('/blog/ranking/popular');
    };

    // 获取文章热门等级
    const getPopularityLevel = (likeCount) => {
      if (likeCount >= 100) return 'super-hot';
      if (likeCount >= 50) return 'very-hot';
      if (likeCount >= 20) return 'hot';
      if (likeCount >= 10) return 'warm';
      return 'normal';
    };

    // 获取热门标记文本和图标
    const getPopularityBadge = (likeCount) => {
      const level = getPopularityLevel(likeCount);
      switch (level) {
        case 'super-hot':
          return { text: '超热', icon: '🔥🔥🔥', class: 'super-hot' };
        case 'very-hot':
          return { text: '很热', icon: '🔥🔥', class: 'very-hot' };
        case 'hot':
          return { text: '热门', icon: '🔥', class: 'hot' };
        case 'warm':
          return { text: '温热', icon: '🌡️', class: 'warm' };
        default:
          return null;
      }
    };

    return {
      articles,
      loading,
      searchQuery,
      selectedTag,
      selectedCategory,
      sortBy,
      sortOrder,
      currentPage,
      totalCount,
      totalPages,
      visiblePages,
      showAllTags,
      filterOptions,
      filteredArticles,
      hasActiveFilters,
      isGridMode,
      isListMode,
      formatDate,
      getExcerpt,
      handleSearch,
      filterByCategory,
      filterByTag,
      handleSortChange,
      toggleSortOrder,
      clearSearch,
      clearAllFilters,
      changePage,
      getFullImageUrl,
      getAuthorAvatarStyle,
      handleImageError,
      // 新增视图/分页控制
      viewMode,
      pageSizeLocal,
      jumpPage,
      handlePageSizeChange,
      switchViewMode,
      handlePageJump,
      // 导航方法
      goToPopularArticles,
      // 热门标记方法
      getPopularityLevel,
      getPopularityBadge
    };
  }
};
</script>

<style scoped>
.blog-list-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.blog-list-page > * {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
  width: 100%;
}

.blog-list-page > .page-header {
  padding-top: var(--spacing-6);
}

.blog-list-page > .unified-container {
  flex: 1;
  margin-top: var(--spacing-6);
  margin-bottom: var(--spacing-6);
}

/* 页面头部 */
.page-header {
  margin-bottom: var(--spacing-6);
}

.header-content {
  margin-bottom: var(--spacing-4);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}

.header-actions {
  display: flex;
  gap: var(--spacing-2);
}

.nav-button {
  font-size: 0.85rem;
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
  text-align: center;
  background: linear-gradient(135deg, #ff6b9d, #c44569, #f8b500);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 统一容器样式 */
.unified-container {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  margin-bottom: var(--spacing-8); /* 增加底部间距 */
}

/* 工具栏区域 */
.toolbar-section-wrapper {
  padding: var(--spacing-4);
}

/* 内容分隔线 */
.content-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0.2) 80%,
    transparent 100%
  );
  margin: 0 var(--spacing-4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .unified-container {
    border-radius: 16px;
    margin: 0 var(--spacing-2);
  }

  .toolbar-section-wrapper {
    padding: var(--spacing-3);
  }

  .articles-container {
    padding: var(--spacing-3);
  }

  .bottom-pagination {
    padding: var(--spacing-3);
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.filter-row {
  justify-content: flex-start;
  padding-top: var(--spacing-4); /* 增加顶部间距 */
  margin-top: var(--spacing-3); /* 增加顶部外边距 */
  border-top: 1px solid rgba(255, 255, 255, 0.2); /* 使用半透明边框 */
}

.filter-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  align-items: flex-start;
  width: 100%;
}

.filter-line {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.filter-items {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.toolbar-divider {
  color: var(--color-border);
  font-size: 1.2rem;
  margin: 0 var(--spacing-2);
}

/* 搜索区域 */
.search-section {
  flex: 1;
  min-width: 300px;
}

.search-box {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  color: #2c3e50;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.search-input::placeholder {
  color: #34495e;
  font-weight: 400;
}

.search-input:focus {
  outline: none;
  border-color: rgba(52, 152, 219, 0.6);
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 20px rgba(52, 152, 219, 0.2), 0 0 0 3px rgba(52, 152, 219, 0.1);
  transform: translateY(-1px);
}

.clear-search-btn {
  position: absolute;
  right: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #34495e;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.clear-search-btn:hover {
  background: rgba(231, 76, 60, 0.9);
  border-color: rgba(231, 76, 60, 0.6);
  color: white;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

/* 筛选区域 */
.filter-label {
  font-size: 0.9rem;
  color: #2c3e50;
  font-weight: 600;
  white-space: nowrap;
  min-width: 40px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  height: 100%;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.filter-item {
  font-size: 0.85rem;
  color: #34495e;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  height: 28px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  font-weight: 500;
}

.filter-item:hover {
  color: #2c3e50;
  background: rgba(255, 255, 255, 0.9);
  border-color: #3498db;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
}

.filter-item.active {
  color: #ffffff;
  font-weight: 600;
  background: #3498db;
  border-color: #2980b9;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

/* 功能区域 */
.action-section {
  gap: var(--spacing-3);
}

.action-button {
  font-size: 0.85rem;
}

.view-controls {
  display: flex;
  gap: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.view-btn {
  padding: var(--spacing-1) var(--spacing-2);
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.7);
  color: #34495e;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  backdrop-filter: blur(10px);
  font-weight: 500;
}

.view-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  color: #2c3e50;
  border-color: #3498db;
  transform: translateY(-1px);
}

.view-btn.active {
  background: #3498db;
  color: white;
  border-color: #2980b9;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-3);
  }

  .toolbar-section {
    justify-content: center;
  }

  .toolbar-divider {
    display: none;
  }

  .search-section {
    min-width: auto;
  }

  .filter-section .filter-group {
    justify-content: center;
    flex-wrap: wrap;
  }

  .action-section {
    justify-content: space-between;
  }
}

/* 搜索和筛选 */
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
  margin-bottom: var(--spacing-8);
}

.search-section {
  display: flex;
  justify-content: center;
}

.search-box {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.search-input {
  width: 100%;
  padding: var(--spacing-4) var(--spacing-5);
  padding-right: var(--spacing-12);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-base);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-search-btn {
  position: absolute;
  right: var(--spacing-4);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
  transition:
    color var(--transition-fast),
    background-color var(--transition-fast);
}

.clear-search-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-tertiary);
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.filter-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  align-items: center;
}

.sort-select {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.sort-order-btn {
  min-width: 2rem;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.toggle-tags-btn {
  font-size: var(--font-size-xs);
  opacity: 0.8;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  align-items: center;
  padding: var(--spacing-4);
  background-color: var(--color-primary-lighter);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-primary-light);
}

.active-filters-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-dark);
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-base);
  font-size: var(--font-size-xs);
}

.filter-tag button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  margin-left: var(--spacing-1);
  opacity: 0.8;
  transition: opacity var(--transition-fast);
}

.filter-tag button:hover {
  opacity: 1;
}

/* 文章网格 */
.articles-container {
  padding: var(--spacing-4);
  padding-top: var(--spacing-6);
  min-height: 400px; /* 确保有最小高度 */
}

/* 防止初始渲染闪烁 */
.articles-grid {
  opacity: 1;
  transition: none; /* 移除可能导致闪烁的过渡效果 */
}

/* 骨架屏样式 */
.loading-container {
  padding: var(--spacing-4);
}

.skeleton {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-title {
  height: 20px;
  margin-bottom: var(--spacing-2);
}

.skeleton-text {
  height: 14px;
  margin-bottom: var(--spacing-1);
}

.skeleton-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

/* 列表模式骨架屏 */
.list-loading {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.list-skeleton {
  padding: var(--spacing-3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.skeleton-list-title {
  height: 18px;
  width: 70%;
  margin-bottom: var(--spacing-2);
}

.skeleton-list-meta {
  height: 14px;
  width: 40%;
}

.articles-grid {
  margin-bottom: var(--spacing-8);
}





.blog-list-page.list-layout .main-content.with-sidebar {
  display: block;
  width: 100%;
}

/* 左侧筛选栏 */
.sidebar-filters {
  position: sticky;
  top: var(--spacing-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  border: 1px solid var(--color-border);
}

.filter-group {
  margin-bottom: var(--spacing-4);
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-weight: 600;
  color: var(--color-text-primary);
}

.filter-options.vertical {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.filter-options.vertical .btn {
  justify-content: flex-start;
  text-align: left;
}

.sort-select {
  width: 100%;
  padding: var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  margin-bottom: var(--spacing-2);
}

.sort-order-btn {
  width: 100%;
  justify-content: center;
}

/* 活跃筛选器 */
.active-filters {
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-border);
}

.active-filters-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
  display: block;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  margin-bottom: var(--spacing-2);
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  background: var(--color-primary);
  color: white;
  padding: 2px var(--spacing-2);
  border-radius: var(--radius-base);
  font-size: var(--text-xs);
}

.filter-tag button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  margin-left: var(--spacing-1);
}

.clear-all-btn {
  width: 100%;
  justify-content: center;
}

/* 极简列表样式 */
.articles-grid.list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 表格列表样式 */
.table-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  margin: var(--spacing-4);
}

.table-row {
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: #2c3e50;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
  box-shadow: inset 4px 0 0 rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}

.row-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.article-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

.meta-item {
  white-space: nowrap;
}

.meta-separator {
  color: var(--color-border);
  font-weight: bold;
}

.author {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.date {
  color: var(--color-text-tertiary);
}

.stats {
  color: var(--color-text-tertiary);
}

.list-item:last-child {
  border-bottom: none;
}

.list-content {
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-1);
}

.list-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* 热门标记样式 */
.popularity-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.popularity-badge.super-hot {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  color: white;
}

.popularity-badge.very-hot {
  background: linear-gradient(135deg, #ff9f43, #ffb74d);
  color: white;
}

.popularity-badge.hot {
  background: linear-gradient(135deg, #ffa726, #ffcc02);
  color: white;
}

.popularity-badge.warm {
  background: linear-gradient(135deg, #66bb6a, #81c784);
  color: white;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

.list-meta .separator {
  color: var(--color-text-tertiary);
}

.list-meta .author {
  font-weight: 500;
}

.list-meta .stats {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.list-meta .stat-icon {
  font-size: 12px;
}

.list-meta .tags {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
}

.list-meta .tag {
  color: var(--color-primary);
  font-weight: 500;
}

.list-meta .more-tags {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

/* 工具条 */
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin: var(--spacing-3) 0;
}

.toolbar .view-controls {
  display: inline-flex;
  gap: var(--spacing-2);
  align-items: center;
}

/* 底部分页 */
.bottom-pagination {
  padding: var(--spacing-4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: var(--spacing-4);
  display: block !important;
  visibility: visible !important;
}

.bottom-pagination.list-mode {
  background: transparent;
}

/* 在列表布局下，分页器正常显示 */
.blog-list-page.list-layout .bottom-pagination {
  width: 100%;
}

.pagination-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
  font-size: var(--text-sm);
  color: #2c3e50;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.total-info {
  font-weight: 500;
}

.total-info strong {
  color: var(--color-text-primary);
  font-weight: 600;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.page-size-control label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.page-size-select {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  font-size: var(--text-sm);
  background: rgba(255, 255, 255, 0.9);
  color: #2c3e50;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  font-weight: 500;
}

.page-size-select:hover {
  border-color: #3498db;
  background: rgba(255, 255, 255, 0.95);
}

.page-size-select:focus {
  outline: none;
  border-color: #3498db;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
}

/* 分页控件 */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  padding: 0 var(--spacing-2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  color: #2c3e50;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.pagination-btn:hover:not(:disabled) {
  border-color: rgba(52, 152, 219, 0.6);
  color: #2c3e50;
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.2);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: #7f8c8d;
}

.pagination-btn-page.active {
  background: #3498db;
  border-color: #2980b9;
  color: white;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

.pagination-btn-page.active:hover {
  background: #2980b9;
  border-color: #21618c;
  color: white;
}

.pagination-btn-nav {
  font-weight: 600;
}

.pagination-btn-jump {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  font-weight: 500;
}

.pagination-btn-jump:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.pagination-icon {
  font-size: 16px;
  line-height: 1;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  color: var(--color-text-tertiary);
  font-weight: 600;
  user-select: none;
}

/* 页面跳转 */
.page-jump {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-left: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.page-jump-input {
  width: 60px;
  height: 32px;
  padding: 0 var(--spacing-2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  text-align: center;
  font-size: var(--text-sm);
  background: rgba(255, 255, 255, 0.15);
  color: #2c3e50;
  transition: all 0.3s ease;
  backdrop-filter: blur(20px);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.page-jump-input::placeholder {
  color: #34495e;
}

.page-jump-input:hover {
  border-color: rgba(52, 152, 219, 0.6);
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
}

.page-jump-input:focus {
  outline: none;
  border-color: rgba(52, 152, 219, 0.6);
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 16px rgba(52, 152, 219, 0.2), 0 0 0 3px rgba(52, 152, 219, 0.1);
  transform: translateY(-1px);
}

/* 响应式 */
@media (max-width: 1024px) {
  .blog-list-page.list-layout .main-content {
    display: block;
    width: 100%;
  }

  .sidebar-filters {
    position: static;
    margin-bottom: var(--spacing-4);
  }
}

@media (max-width: 768px) {
  .pagination-info {
    flex-direction: column;
    gap: var(--spacing-2);
    align-items: center;
    text-align: center;
  }

  .pagination-controls {
    flex-wrap: wrap;
    gap: var(--spacing-1);
  }

  .pagination-btn {
    min-width: 36px;
    height: 36px;
    font-size: var(--text-xs);
  }

  .page-jump {
    margin-left: 0;
    margin-top: var(--spacing-2);
    flex-wrap: wrap;
    justify-content: center;
  }

  .page-jump-input {
    width: 50px;
    height: 28px;
  }

  .list-meta {
    font-size: var(--text-xs);
  }

  .list-title {
    font-size: var(--text-base);
  }
}

.article-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.article-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

/* 文章封面 */
.article-cover {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-base);
}

.article-card:hover .cover-image {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary-lighter));
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content {
  text-align: center;
  color: var(--color-primary-dark);
}

.placeholder-icon {
  font-size: var(--font-size-4xl);
  display: block;
  margin-bottom: var(--spacing-2);
}

.placeholder-text {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

/* 文章标签 */
.article-tags {
  position: absolute;
  top: var(--spacing-3);
  left: var(--spacing-3);
  display: flex;
  gap: var(--spacing-2);
}

/* 文章内容 */
.article-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
  line-height: var(--line-height-tight);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  word-break: break-word;
}

.article-excerpt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 作者信息 */
.article-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

/* 头像样式 */
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  overflow: hidden;
  position: relative;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  font-size: var(--font-size-sm);
}

.avatar-text {
  position: relative;
  z-index: 1;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.author-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.publish-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 文章统计 */
.article-stats {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.stat-icon {
  margin-right: var(--spacing-1);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: var(--spacing-16) var(--spacing-4);
  margin: var(--spacing-4);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-4);
  opacity: 0.8;
}

.empty-state h3 {
  font-size: var(--font-size-xl);
  color: #2c3e50;
  margin-bottom: var(--spacing-3);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.empty-state p {
  color: #34495e;
  margin-bottom: var(--spacing-6);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

/* 加载状态 */
.loading-container {
  margin-bottom: var(--spacing-8);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-4);
  margin-top: var(--spacing-8);
}

.page-numbers {
  display: flex;
  gap: var(--spacing-2);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .filter-group {
    align-items: flex-start;
  }

  .filter-options {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .blog-list-page {
    padding: var(--spacing-4) var(--spacing-3);
  }

  .page-title {
    font-size: var(--font-size-3xl);
  }

  .filters {
    gap: var(--spacing-6);
  }

  .filter-section {
    gap: var(--spacing-4);
  }

  .filter-group {
    gap: var(--spacing-2);
  }

  .filter-options {
    gap: var(--spacing-1);
  }

  .search-input {
    padding: var(--spacing-3) var(--spacing-4);
    padding-right: var(--spacing-10);
  }

  .article-cover {
    height: 160px;
  }

  .article-title {
    font-size: var(--font-size-lg);
    line-height: 1.4;
    -webkit-line-clamp: 3;
  }

  .pagination {
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  .active-filters {
    padding: var(--spacing-3);
  }
}

@media (max-width: 480px) {
  .page-numbers {
    display: none;
  }

  .filter-options {
    justify-content: center;
  }

  .search-box {
    max-width: none;
  }
}
</style>
