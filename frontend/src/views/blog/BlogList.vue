<template>
  <div class="blog-list-page" :class="{ 'list-layout': viewMode === 'list' }">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">博客文章</h1>
        <p class="page-subtitle">分享技术心得，记录学习历程</p>
      </div>

      <!-- 搜索和筛选 -->
      <div class="filters">
        <!-- 搜索框 -->
        <div class="search-section">
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索文章标题、内容、标签..."
              class="search-input"
              @input="handleSearch"
            />
            <button v-if="searchQuery" class="clear-search-btn" @click="clearSearch">✕</button>
          </div>
        </div>

        <!-- 视图切换工具条 -->
        <div class="toolbar">
          <div class="view-controls">
            <button
              class="btn btn-ghost btn-sm"
              :class="viewMode === 'grid' ? 'active' : ''"
              @click="switchViewMode('grid')"
            >
              网格
            </button>
            <button
              class="btn btn-ghost btn-sm"
              :class="viewMode === 'list' ? 'active' : ''"
              @click="switchViewMode('list')"
            >
              列表
            </button>
          </div>
        </div>

        <!-- 筛选选项（网格模式时显示在顶部） -->
        <div class="filter-section" v-show="viewMode === 'grid'">
          <!-- 分类筛选 -->
          <div class="filter-group">
            <label class="filter-label">分类：</label>
            <div class="filter-options">
              <button
                v-for="category in filterOptions.categories"
                :key="category"
                class="btn btn-sm"
                :class="selectedCategory === category ? 'btn-primary' : 'btn-ghost'"
                @click="filterByCategory(category)"
              >
                {{ category }}
              </button>
            </div>
          </div>

          <!-- 标签筛选 -->
          <div class="filter-group">
            <label class="filter-label">标签：</label>
            <div class="filter-options">
              <button
                v-for="tag in filterOptions.tags.slice(
                  0,
                  showAllTags ? filterOptions.tags.length : 8
                )"
                :key="tag"
                class="btn btn-sm"
                :class="selectedTag === tag ? 'btn-primary' : 'btn-ghost'"
                @click="filterByTag(tag)"
              >
                {{ tag }}
              </button>
              <button
                v-if="filterOptions.tags.length > 8"
                class="btn btn-sm btn-ghost toggle-tags-btn"
                @click="showAllTags = !showAllTags"
              >
                {{ showAllTags ? '收起' : `更多 (${filterOptions.tags.length - 8})` }}
              </button>
            </div>
          </div>

          <!-- 排序和其他选项 -->
          <div class="filter-group">
            <label class="filter-label">排序：</label>
            <div class="filter-options">
              <select v-model="sortBy" class="sort-select" @change="handleSortChange">
                <option value="publishedAt">发布时间</option>
                <option value="viewCount">阅读量</option>
                <option value="title">标题</option>
              </select>
              <button class="btn btn-sm btn-ghost sort-order-btn" @click="toggleSortOrder">
                {{ sortOrder === 'desc' ? '↓' : '↑' }}
              </button>
            </div>
          </div>

          <!-- 活跃筛选器显示 -->
          <div v-if="hasActiveFilters" class="active-filters">
            <span class="active-filters-label">当前筛选：</span>
            <span v-if="selectedCategory !== '全部'" class="filter-tag">
              分类: {{ selectedCategory }}
              <button @click="filterByCategory('全部')">✕</button>
            </span>
            <span v-if="selectedTag !== '全部'" class="filter-tag">
              标签: {{ selectedTag }}
              <button @click="filterByTag('全部')">✕</button>
            </span>
            <span v-if="searchQuery" class="filter-tag">
              搜索: {{ searchQuery }}
              <button @click="clearSearch">✕</button>
            </span>
            <button class="btn btn-sm btn-ghost" @click="clearAllFilters">清除所有筛选</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content" :class="{ 'with-sidebar': viewMode === 'list' }">
      <!-- 左侧筛选栏（仅列表模式） -->
      <div class="sidebar-filters" v-if="viewMode === 'list'">
        <div class="filter-group">
          <label class="filter-label">分类</label>
          <div class="filter-options vertical">
            <button
              v-for="category in filterOptions.categories"
              :key="category"
              class="btn btn-sm"
              :class="selectedCategory === category ? 'btn-primary' : 'btn-ghost'"
              @click="filterByCategory(category)"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">标签</label>
          <div class="filter-options vertical">
            <button
              v-for="tag in filterOptions.tags.slice(
                0,
                showAllTags ? filterOptions.tags.length : 8
              )"
              :key="tag"
              class="btn btn-sm"
              :class="selectedTag === tag ? 'btn-primary' : 'btn-ghost'"
              @click="filterByTag(tag)"
            >
              {{ tag }}
            </button>
            <button
              v-if="filterOptions.tags.length > 8"
              class="btn btn-sm btn-ghost toggle-tags-btn"
              @click="showAllTags = !showAllTags"
            >
              {{ showAllTags ? '收起' : `更多 (${filterOptions.tags.length - 8})` }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">排序</label>
          <div class="filter-options vertical">
            <select v-model="sortBy" class="sort-select" @change="handleSortChange">
              <option value="publishedAt">发布时间</option>
              <option value="viewCount">阅读量</option>
              <option value="title">标题</option>
            </select>
            <button class="btn btn-sm btn-ghost sort-order-btn" @click="toggleSortOrder">
              {{ sortOrder === 'desc' ? '↓ 降序' : '↑ 升序' }}
            </button>
          </div>
        </div>

        <!-- 活跃筛选器显示 -->
        <div v-if="hasActiveFilters" class="active-filters">
          <span class="active-filters-label">当前筛选</span>
          <div class="filter-tags">
            <span v-if="selectedCategory !== '全部'" class="filter-tag">
              {{ selectedCategory }}
              <button @click="filterByCategory('全部')">✕</button>
            </span>
            <span v-if="selectedTag !== '全部'" class="filter-tag">
              {{ selectedTag }}
              <button @click="filterByTag('全部')">✕</button>
            </span>
            <span v-if="searchQuery" class="filter-tag">
              "{{ searchQuery }}"
              <button @click="clearSearch">✕</button>
            </span>
          </div>
          <button class="btn btn-sm btn-ghost clear-all-btn" @click="clearAllFilters">
            清除所有
          </button>
        </div>
      </div>

      <!-- 文章列表容器 -->
      <div class="articles-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <div class="grid grid-cols-2">
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
        </div>

        <!-- 空状态 -->
        <div v-else-if="filteredArticles.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>{{ searchQuery ? '未找到相关文章' : '暂无文章' }}</h3>
          <p>{{ searchQuery ? '尝试使用其他关键词搜索' : '还没有发布任何文章，敬请期待...' }}</p>
          <button v-if="searchQuery" class="btn btn-primary" @click="clearSearch">清除搜索</button>
        </div>

        <!-- 文章网格/列表 -->
        <div v-else :class="['articles-grid', viewMode === 'grid' ? 'grid grid-cols-2' : 'list']">
          <!-- 网格模式 -->
          <template v-if="viewMode === 'grid'">
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
          </template>

          <!-- 列表模式 - 极简列表 -->
          <template v-else>
            <div
              class="list-item"
              v-for="article in filteredArticles"
              :key="article._id"
              @click="$router.push(`/blog/${article._id}`)"
            >
              <div class="list-content">
                <h3 class="list-title">{{ article.title }}</h3>
                <div class="list-meta">
                  <span class="author">{{
                    (article.author && (article.author.displayName || article.author.username)) ||
                    '匿名'
                  }}</span>
                  <span class="separator">·</span>
                  <span class="date">{{ formatDate(article.createdAt) }}</span>
                  <span class="separator">·</span>
                  <span class="stats">
                    <i class="stat-icon">👁</i>{{ article.viewCount || 0 }}
                  </span>
                  <span class="stats">
                    <i class="stat-icon">💬</i>{{ article.commentCount || 0 }}
                  </span>
                  <span class="separator" v-if="article.tags && article.tags.length > 0">·</span>
                  <span class="tags" v-if="article.tags && article.tags.length > 0">
                    <span v-for="tag in article.tags.slice(0, 2)" :key="tag" class="tag"
                      >#{{ tag }}</span
                    >
                    <span v-if="article.tags.length > 2" class="more-tags"
                      >+{{ article.tags.length - 2 }}</span
                    >
                  </span>
                </div>
              </div>
            </div>
          </template>
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
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import api from '@/api';

export default {
  name: 'BlogList',
  setup() {
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

    // 从本地存储加载布局偏好
    const viewMode = ref(localStorage.getItem('blog-view-mode') || 'grid');
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

    const handleSearch = () => {
      currentPage.value = 1;
      fetchArticles();
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
      handlePageJump
    };
  }
};
</script>

<style scoped>
.blog-list-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6) var(--spacing-4);
}

/* 页面头部 */
.page-header {
  margin-bottom: var(--spacing-12);
}

.header-content {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.page-title {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-4);
}

.page-subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto;
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
  margin-bottom: var(--spacing-12);
}

.articles-grid {
  margin-bottom: var(--spacing-8);
}

/* 列表布局样式 */
.blog-list-page.list-layout .main-content {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-6);
  align-items: start;
}

.blog-list-page.list-layout .main-content.with-sidebar {
  grid-template-columns: 280px 1fr;
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
  margin-bottom: var(--spacing-2);
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

.list-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.list-item:hover {
  background-color: var(--color-bg-secondary);
}

.list-item:last-child {
  border-bottom: none;
}

.list-content {
  flex: 1;
  min-width: 0;
}

.list-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin: 0 0 var(--spacing-1) 0;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  margin-top: var(--spacing-6);
  padding: var(--spacing-4) 0;
  border-top: 1px solid var(--color-border);
  display: block !important;
  visibility: visible !important;
}

.bottom-pagination.list-mode {
  background: var(--color-bg-primary);
}

/* 在列表布局下，让分页器跨越两列显示 */
.blog-list-page.list-layout .bottom-pagination {
  grid-column: 1 / -1;
}

.pagination-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  font-size: var(--text-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.page-size-select:hover {
  border-color: var(--color-primary);
}

.page-size-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--color-text-tertiary);
}

.pagination-btn-page.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.pagination-btn-page.active:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  text-align: center;
  font-size: var(--text-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.page-jump-input:hover {
  border-color: var(--color-primary);
}

.page-jump-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

/* 响应式 */
@media (max-width: 1024px) {
  .blog-list-page.list-layout .main-content {
    grid-template-columns: 1fr;
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
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base);
  overflow: hidden;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
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
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-4);
}

.empty-state h3 {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-6);
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
