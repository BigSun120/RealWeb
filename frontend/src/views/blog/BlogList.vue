<template>
  <div class="blog-list-page">
    <!-- 完全铺满页面的背景 -->
    <div class="page-background"></div>
    <PageHeader title="博客文章" :show-stats="false" :show-filters="true" :search-value="searchQuery"
      search-placeholder="🔍 搜索文章..." :view-mode="viewMode" :view-modes="[
        { value: 'list', label: '📊' },
        { value: 'grid', label: '⊞' }
      ]" @search="handleSearch" @clear-search="clearSearch" @view-mode-change="switchViewMode">
      <template #toolbar>
        <el-button type="primary" plain @click="goToPopularArticles" class="action-button" size="small">
          热门排行
        </el-button>
      </template>
    </PageHeader>

    <!-- 主内容区域 - 左右布局 -->
    <div class="container">
      <div class="main-layout">
        <!-- 左侧筛选卡片 -->
        <div class="sidebar-card">
          <BlogFilterBar :categories="filterOptions.categories" :tags="filterOptions.tags"
            :selected-category="selectedCategory" :selected-tag="selectedTag" @select-category="filterByCategory"
            @select-tag="filterByTag" @clear-all="clearAllFilters" />
        </div>

        <!-- 右侧内容卡片 -->
        <div class="content-card">
          <!-- 博客列表区域 -->
          <div class="articles-section">
            <BlogSkeletons v-if="loading" :mode="viewMode" />
            <BlogEmptyState v-else-if="!loading && filteredArticles.length === 0" :search="searchQuery"
              @clear="clearSearch" />

            <BlogArticlesGrid v-else-if="!loading && isGridMode" :articles="filteredArticles"
              @open="id => $router.push(`/blog/${id}`)" />
            <BlogArticlesList v-else-if="!loading" :articles="filteredArticles"
              @open="id => $router.push(`/blog/${id}`)" />
          </div>

          <!-- 分页区域 -->
          <div class="pagination-section">
            <BlogPagination :current-page="currentPage" :total-pages="totalPages" :total="totalCount"
              :page-size="pageSizeLocal" :visible-pages="visiblePages" :jump-page="jumpPage" @change-page="changePage"
              @change-size="(s) => { pageSizeLocal = s; handlePageSizeChange(); }"
              @update:jump-page="(v) => { jumpPage = v; }" @page-jump="handlePageJump" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* 页面背景 */
.blog-list-page {
  min-height: 100vh;
  position: relative;
}

.page-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.1) 0%,
      rgba(168, 85, 247, 0.1) 25%,
      rgba(236, 72, 153, 0.1) 50%,
      rgba(245, 158, 11, 0.1) 75%,
      rgba(34, 197, 94, 0.1) 100%);
  z-index: -2;
}

.page-background::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  z-index: -1;
}

/* 容器样式 */
.container {
  max-width: 1200px;
  margin: 0.5rem 0;
  padding: 0rem;
}

/* 主布局 - 左右分栏 */
.main-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0.7rem;
  align-items: start;
}

/* 左侧筛选卡片 */
.sidebar-card {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 1rem;
  color: #1a202c;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 2rem;
  height: fit-content;
}

/* 右侧内容卡片 */
.content-card {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 0.5rem;
  color: #1a202c;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 区域分割 */
.articles-section {
  margin-bottom: 2rem;
}

.pagination-section {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

/* Header 玻璃质感 */
.glass-header {
  position: relative;
  z-index: 10;
}

.glass-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  z-index: -1;
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .sidebar-card {
    position: static;
    order: -1;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }

  .sidebar-card,
  .content-card {
    padding: 1rem;
  }

  .main-layout {
    gap: 1rem;
  }
}
</style>



<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import PageHeader from '@/components/common/PageHeader.vue';
import { useArticlesApi } from '@/composables/useArticlesApi';
import { useArticlesQuery } from '@/composables/useArticlesQuery';
import BlogFilterBar from './components/BlogFilterBar.vue';
import BlogArticlesGrid from './components/BlogArticlesGrid.vue';
import BlogArticlesList from './components/BlogArticlesList.vue';
import BlogPagination from './components/BlogPagination.vue';
import BlogEmptyState from './components/BlogEmptyState.vue';
import BlogSkeletons from './components/BlogSkeletons.vue';

export default {
  name: 'BlogList',
  components: {
    PageHeader,
    BlogFilterBar,
    BlogArticlesGrid,
    BlogArticlesList,
    BlogPagination,
    BlogEmptyState,
    BlogSkeletons
  },
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


    const { getArticles, getFilterOptions } = useArticlesApi();

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


    // 路由同步状态（仅用于生成可分享的URL；本地仍以现有refs为主）
    const qs = useArticlesQuery({
      q: searchQuery.value,
      tag: selectedTag.value,
      cat: selectedCategory.value,
      page: currentPage.value,
      size: pageSizeLocal.value,
      view: viewMode.value
    });

    // 将本地交互变化同步到URL（查询参数）
    watch(
      [searchQuery, selectedTag, selectedCategory, currentPage, pageSizeLocal, viewMode],
      ([q, tag, cat, page, size, view]) => {
        qs.q = q;
        qs.tag = tag;
        qs.cat = cat;
        qs.page = page;
        qs.size = size;
        qs.view = view;
      }
    );

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

        const response = await getArticles(params);
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
        const response = await getFilterOptions();
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
    const handleSearch = (value) => {
      if (typeof value === 'string') {
        searchQuery.value = value;
      }
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

    // 使用统一的图片URL处理函数
    const getFullImageUrl = (imageUrl) => {
      const { getImageUrl } = require('@/utils/imageUrl');
      return getImageUrl(imageUrl);
    };

    // 获取作者头像样式 - 使用统一的头像处理函数
    const getAuthorAvatarStyle = avatarUrl => {
      const { getAvatarStyle } = require('@/utils/imageUrl');
      return getAvatarStyle(avatarUrl);
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


      // 从URL初始化本地状态（若URL有值）
      if (qs.q) searchQuery.value = qs.q;
      if (qs.tag) selectedTag.value = qs.tag;
      if (qs.cat) selectedCategory.value = qs.cat;
      if (qs.page) currentPage.value = Number(qs.page);
      if (qs.size) {
        const s = Number(qs.size);
        pageSizeLocal.value = Number.isFinite(s) && [10, 20, 30, 50].includes(s) ? s : pageSizeLocal.value;
        localStorage.setItem('blog-page-size', pageSizeLocal.value.toString());
      }
      if (qs.view) {
        viewMode.value = qs.view === 'grid' ? 'grid' : 'list';
        localStorage.setItem('blog-view-mode', viewMode.value);
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

    // 页面头部统计数据
    const headerStats = computed(() => [
      { value: totalCount.value, label: '篇文章' },
      { value: filterOptions.value.categories.length - 1, label: '个分类' },
      { value: filterOptions.value.tags.length - 1, label: '个标签' }
    ]);

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
      getPopularityBadge,
      // 页面头部数据
      headerStats
    };
  }
};
</script>
