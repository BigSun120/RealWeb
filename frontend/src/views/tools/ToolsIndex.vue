<template>
  <div class="tools-index" :class="{ 'list-layout': viewMode === 'list' }">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container" v-loading="loading" element-loading-text="正在加载工具数据...">
    </div>

    <!-- 页面头部 -->
    <div v-if="!loading" class="page-header">
      <div class="header-content">
        <h1 class="page-title">实用工具箱</h1>
        <p class="page-subtitle">精选实用的在线工具，提升您的工作效率</p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ stats.totalTools }}</span>
            <span class="stat-label">个工具</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.totalCategories }}</span>
            <span class="stat-label">个分类</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.activeTools }}</span>
            <span class="stat-label">已上线</span>
          </div>
        </div>
      </div>

      <!-- 搜索和筛选 -->
      <div class="filters">
        <!-- 搜索框 -->
        <div class="search-section">
          <div class="search-box">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索工具名称、描述或标签..."
              class="search-input"
              @input="handleSearch"
            />
            <button v-if="searchKeyword" class="clear-search-btn" @click="clearSearch">✕</button>
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
      </div>
    </div>

    <!-- 主内容区域 -->
    <div v-if="!loading" class="main-content" :class="{ 'with-sidebar': viewMode === 'list' }">
      <!-- 左侧筛选栏（仅列表模式） -->
      <div class="sidebar-filters" v-if="viewMode === 'list'">
        <div class="filter-group">
          <label class="filter-label">分类</label>
          <div class="filter-options vertical">
            <button
              class="btn btn-sm"
              :class="selectedCategory === 'all' ? 'btn-primary' : 'btn-ghost'"
              @click="selectCategory('all')"
            >
              全部
            </button>
            <button
              v-for="category in allCategories"
              :key="category.id"
              class="btn btn-sm"
              :class="selectedCategory === category.id ? 'btn-primary' : 'btn-ghost'"
              @click="selectCategory(category.id)"
            >
              <span class="category-icon">{{ category.icon }}</span>
              {{ category.name }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">状态</label>
          <div class="filter-options vertical">
            <button
              class="btn btn-sm"
              :class="selectedStatus === 'all' ? 'btn-primary' : 'btn-ghost'"
              @click="selectStatus('all')"
            >
              全部
            </button>
            <button
              class="btn btn-sm"
              :class="selectedStatus === 'active' ? 'btn-primary' : 'btn-ghost'"
              @click="selectStatus('active')"
            >
              可用
            </button>
            <button
              class="btn btn-sm"
              :class="selectedStatus === 'coming-soon' ? 'btn-primary' : 'btn-ghost'"
              @click="selectStatus('coming-soon')"
            >
              即将上线
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div class="content-area">
        <!-- 推荐工具（仅网格模式且无搜索时显示） -->
        <div
          v-if="viewMode === 'grid' && !searchKeyword && selectedCategory === 'all'"
          class="tools-section"
        >
          <div class="section-header">
            <h2 class="section-title">
              <el-icon><Star /></el-icon>
              推荐工具
            </h2>
            <p class="section-description">精选的热门实用工具</p>
          </div>
          <div v-if="featuredTools.length > 0" class="tools-grid grid">
            <ToolCard
              v-for="tool in featuredTools"
              :key="tool.id"
              :tool="tool"
              @favorite-change="handleFavoriteChange"
            />
          </div>

          <!-- 推荐工具分页器 -->
          <div
            v-if="featuredTools.length > 0 && featuredTotalPages > 1"
            class="pagination-container"
          >
            <div class="pagination-wrapper">
              <button
                class="btn btn-ghost btn-sm"
                :disabled="featuredCurrentPage === 1"
                @click="handleFeaturedPageChange(featuredCurrentPage - 1)"
              >
                上一页
              </button>

              <div class="page-numbers">
                <button
                  v-for="page in getFeaturedVisiblePages()"
                  :key="page"
                  class="btn btn-sm"
                  :class="page === featuredCurrentPage ? 'btn-primary' : 'btn-ghost'"
                  @click="handleFeaturedPageChange(page)"
                >
                  {{ page }}
                </button>
              </div>

              <button
                class="btn btn-ghost btn-sm"
                :disabled="featuredCurrentPage === featuredTotalPages"
                @click="handleFeaturedPageChange(featuredCurrentPage + 1)"
              >
                下一页
              </button>
            </div>

            <div class="pagination-info">
              第 {{ featuredCurrentPage }} 页，共 {{ featuredTotalPages }} 页
            </div>
          </div>
        </div>

        <!-- 工具分类展示（仅网格模式且无搜索时显示） -->
        <div
          v-if="viewMode === 'grid' && !searchKeyword && selectedCategory === 'all'"
          class="categories-section"
        >
          <div v-for="category in categoriesWithTools" :key="category.id" class="category-section">
            <div class="section-header">
              <h2 class="section-title">
                <span class="category-icon">{{ category.icon }}</span>
                {{ category.name }}
              </h2>
              <p class="section-description">{{ category.description }}</p>
              <router-link :to="`/tools/${category.id}`" class="view-more">
                查看全部 →
              </router-link>
            </div>
            <div class="tools-grid grid">
              <ToolCard
                v-for="tool in getCategoryTools(category.id).slice(0, 4)"
                :key="tool.id"
                :tool="tool"
                @favorite-change="handleFavoriteChange"
              />
            </div>
          </div>
        </div>

        <!-- 工具网格/列表 -->
        <div
          v-if="searchKeyword || selectedCategory !== 'all' || viewMode === 'list'"
          class="tools-container"
        >
          <div class="section-header">
            <h2 class="section-title">
              <el-icon><Search /></el-icon>
              {{ getResultTitle() }}
            </h2>
            <p class="section-description">{{ getPaginationInfo() }}</p>
          </div>

          <div
            v-if="filteredTools.length > 0"
            :class="['tools-grid', viewMode === 'grid' ? 'grid' : 'list']"
          >
            <!-- 网格模式 -->
            <template v-if="viewMode === 'grid'">
              <ToolCard
                v-for="tool in filteredTools"
                :key="tool.id"
                :tool="tool"
                @favorite-change="handleFavoriteChange"
              />
            </template>

            <!-- 列表模式 -->
            <template v-else>
              <div
                class="list-item"
                v-for="tool in filteredTools"
                :key="tool.id"
                @click="goToTool(tool)"
              >
                <div class="list-content">
                  <div class="tool-icon-small">{{ tool.icon }}</div>
                  <div class="tool-info-list">
                    <h3 class="list-title">{{ tool.name }}</h3>
                    <p class="list-description">{{ tool.description }}</p>
                    <div class="list-meta">
                      <span class="category">{{ getCategoryName(tool.category) }}</span>
                      <span class="separator">·</span>
                      <span class="difficulty">{{ getDifficultyText(tool.difficulty) }}</span>
                      <span class="separator">·</span>
                      <span class="status" :class="tool.status">{{
                        getStatusText(tool.status)
                      }}</span>
                    </div>
                  </div>
                  <div class="tool-actions-list">
                    <button
                      v-if="tool.status === 'active'"
                      class="btn btn-primary btn-sm"
                      @click.stop="goToTool(tool)"
                    >
                      使用
                    </button>
                    <button v-else class="btn btn-ghost btn-sm" disabled>
                      {{ tool.status === 'coming-soon' ? '即将上线' : '暂不可用' }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div v-else class="empty-result">
            <el-empty description="没有找到相关工具">
              <el-button type="primary" @click="clearSearch"> 清除搜索条件 </el-button>
            </el-empty>
          </div>

          <!-- 分页器 -->
          <div v-if="filteredTools.length > 0" class="bottom-pagination">
            <div class="pagination-info">
              <span class="total-info">
                共 <strong>{{ allFilteredTools.length }}</strong> 个工具
                <span v-if="totalPages > 1"
                  >，第 <strong>{{ currentPage }}</strong> /
                  <strong>{{ totalPages }}</strong> 页</span
                >
              </span>
              <div class="page-size-control">
                <label for="page-size-select">每页显示</label>
                <select
                  id="page-size-select"
                  class="page-size-select"
                  v-model.number="pageSize"
                  @change="handlePageSizeChange"
                >
                  <option :value="6">6 个</option>
                  <option :value="12">12 个</option>
                  <option :value="24">24 个</option>
                  <option :value="48">48 个</option>
                </select>
              </div>
            </div>

            <!-- 完整分页器 -->
            <div class="pagination-controls">
              <!-- 首页 -->
              <button
                class="pagination-btn pagination-btn-nav"
                :disabled="currentPage === 1"
                @click="handlePageChange(1)"
                title="首页"
              >
                <span class="pagination-icon">⟪</span>
              </button>

              <!-- 上一页 -->
              <button
                class="pagination-btn pagination-btn-nav"
                :disabled="currentPage === 1"
                @click="handlePageChange(currentPage - 1)"
                title="上一页"
              >
                <span class="pagination-icon">‹</span>
              </button>

              <!-- 页码 -->
              <div class="page-numbers">
                <template v-for="page in getVisiblePages()">
                  <span v-if="page === '...'" :key="`ellipsis-${page}`" class="pagination-ellipsis"
                    >...</span
                  >
                  <button
                    v-else
                    :key="page"
                    class="pagination-btn pagination-btn-page"
                    :class="{ active: page === currentPage }"
                    @click="handlePageChange(page)"
                  >
                    {{ page }}
                  </button>
                </template>
              </div>

              <!-- 下一页 -->
              <button
                class="pagination-btn pagination-btn-nav"
                :disabled="currentPage === totalPages"
                @click="handlePageChange(currentPage + 1)"
                title="下一页"
              >
                <span class="pagination-icon">›</span>
              </button>

              <!-- 末页 -->
              <button
                class="pagination-btn pagination-btn-nav"
                :disabled="currentPage === totalPages"
                @click="handlePageChange(totalPages)"
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
                <button class="pagination-btn pagination-btn-jump" @click="handlePageJump">
                  跳转
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Star } from '@element-plus/icons-vue';
import ToolCard from '@/components/tools/ToolCard.vue';
import toolsService from '@/services/toolsService';

export default {
  name: 'ToolsIndex',
  components: {
    Search,
    Star,
    ToolCard
  },
  setup() {
    const router = useRouter();
    const searchKeyword = ref('');
    const selectedCategory = ref('all');
    const selectedStatus = ref('all');
    const loading = ref(true);

    // 从本地存储加载布局偏好
    const viewMode = ref(localStorage.getItem('tools-view-mode') || 'list');

    // 分页相关状态
    const currentPage = ref(1);
    const pageSize = ref(12); // 网格模式每页12个工具

    // 推荐工具分页状态
    const featuredCurrentPage = ref(1);
    const featuredPageSize = ref(4); // 推荐工具每页4个

    // 页面跳转状态
    const jumpPage = ref(1);

    // 计算属性 - 基于工具服务
    const allTools = computed(() => toolsService.tools);
    const allCategories = computed(() => toolsService.categories);
    // 推荐工具（所有推荐工具）
    const allFeaturedTools = computed(() => toolsService.getFeaturedTools());

    // 推荐工具（分页后）
    const featuredTools = computed(() => {
      const start = (featuredCurrentPage.value - 1) * featuredPageSize.value;
      const end = start + featuredPageSize.value;
      return allFeaturedTools.value.slice(start, end);
    });

    // 推荐工具总页数
    const featuredTotalPages = computed(() => {
      return Math.ceil(allFeaturedTools.value.length / featuredPageSize.value);
    });
    const categoriesWithTools = computed(() => toolsService.getCategoriesWithTools());

    // 统计数据
    const stats = computed(() => toolsService.getStats());

    // 根据视图模式调整每页数量
    const currentPageSize = computed(() => {
      return viewMode.value === 'list' ? 20 : pageSize.value;
    });

    // 筛选后的工具（不分页）
    const allFilteredTools = computed(() => {
      let tools = toolsService.filterTools({
        category: selectedCategory.value,
        keyword: searchKeyword.value
      });

      // 按状态筛选
      if (selectedStatus.value !== 'all') {
        tools = tools.filter(tool => tool.status === selectedStatus.value);
      }

      return tools;
    });

    // 分页后的工具
    const filteredTools = computed(() => {
      const start = (currentPage.value - 1) * currentPageSize.value;
      const end = start + currentPageSize.value;
      return allFilteredTools.value.slice(start, end);
    });

    // 总页数
    const totalPages = computed(() => {
      return Math.ceil(allFilteredTools.value.length / currentPageSize.value);
    });

    // 获取分类下的工具
    const getCategoryTools = categoryId => {
      return toolsService.getToolsByCategory(categoryId);
    };

    // 搜索处理
    const handleSearch = () => {
      // 搜索时重置分类筛选和分页
      if (searchKeyword.value) {
        selectedCategory.value = 'all';
      }
      resetPagination();
    };

    // 选择分类
    const selectCategory = categoryId => {
      selectedCategory.value = categoryId;
      // 选择分类时清除搜索
      if (categoryId !== 'all') {
        searchKeyword.value = '';
      }
      resetPagination();
    };

    // 清除搜索
    const clearSearch = () => {
      searchKeyword.value = '';
      selectedCategory.value = 'all';
      selectedStatus.value = 'all';
    };

    // 视图模式切换
    const switchViewMode = mode => {
      viewMode.value = mode;
      localStorage.setItem('tools-view-mode', mode);
      // 切换视图模式时重置到第一页
      currentPage.value = 1;
    };

    // 分页方法
    const handlePageChange = page => {
      currentPage.value = page;
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 推荐工具分页处理
    const handleFeaturedPageChange = page => {
      if (page >= 1 && page <= featuredTotalPages.value) {
        featuredCurrentPage.value = page;
        // 滚动到推荐工具区域
        const featuredSection = document.querySelector('.tools-section');
        if (featuredSection) {
          featuredSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    // 重置分页（在筛选条件改变时调用）
    const resetPagination = () => {
      currentPage.value = 1;
    };

    // 选择状态筛选
    const selectStatus = status => {
      selectedStatus.value = status;
      resetPagination();
    };

    // 获取分类名称
    const getCategoryName = categoryId => {
      const category = toolsService.getCategoryById(categoryId);
      return category ? category.name : '未知分类';
    };

    // 获取难度文本
    const getDifficultyText = difficulty => {
      const difficultyMap = {
        easy: '简单',
        medium: '中等',
        hard: '困难'
      };
      return difficultyMap[difficulty] || '未知';
    };

    // 获取状态文本
    const getStatusText = status => {
      const statusMap = {
        active: '可用',
        'coming-soon': '即将上线',
        maintenance: '维护中'
      };
      return statusMap[status] || '未知';
    };

    // 跳转到工具页面
    const goToTool = tool => {
      if (tool.status !== 'active') {
        console.info('工具状态不可用:', tool.status);
        return;
      }

      try {
        // 优先级1: 静态工具使用路由跳转
        if (tool.isStatic && tool.route) {
          router.push(tool.route);
          return;
        }

        // 优先级2: API工具使用path字段跳转（新窗口）
        if (tool.path) {
          window.open(tool.path, '_blank');
          return;
        }

        // 优先级3: 兜底方案 - 使用route字段
        if (tool.route) {
          // 判断是内部路由还是外部链接
          if (tool.route.startsWith('/')) {
            // 内部路由，使用Vue Router跳转
            router.push(tool.route);
          } else if (tool.route.startsWith('http://') || tool.route.startsWith('https://')) {
            // 外部链接，在新窗口打开
            window.open(tool.route, '_blank');
          } else {
            // 相对路径，当作内部路由处理
            router.push(tool.route);
          }
          return;
        }

        // 如果都没有，显示警告
        console.warn('工具缺少有效的跳转配置:', tool);
      } catch (error) {
        console.error('跳转工具页面失败:', error, tool);
      }
    };

    // 获取结果标题
    const getResultTitle = () => {
      if (searchKeyword.value) {
        return `搜索结果："${searchKeyword.value}"`;
      }
      if (selectedCategory.value !== 'all') {
        const category = toolsService.getCategoryById(selectedCategory.value);
        return category ? category.name : '筛选结果';
      }
      return viewMode.value === 'list' ? '全部工具' : '工具列表';
    };

    // 获取分页信息文本
    const getPaginationInfo = () => {
      const total = allFilteredTools.value.length;
      if (total === 0) return '暂无工具';

      const start = (currentPage.value - 1) * currentPageSize.value + 1;
      const end = Math.min(currentPage.value * currentPageSize.value, total);
      return `显示 ${start}-${end} 项，共 ${total} 项`;
    };

    // 获取可见的页码
    const getVisiblePages = () => {
      const total = totalPages.value;
      const current = currentPage.value;
      const pages = [];

      if (total <= 7) {
        // 总页数少于等于7页，显示所有页码
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // 总页数大于7页，显示省略号
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
    };

    // 获取推荐工具的可见页码
    const getFeaturedVisiblePages = () => {
      const total = featuredTotalPages.value;
      const current = featuredCurrentPage.value;
      const pages = [];

      if (total <= 7) {
        // 总页数少于等于7页，显示所有页码
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // 总页数大于7页，显示省略号
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
    };

    // 页面大小变更处理
    const handlePageSizeChange = () => {
      currentPage.value = 1;
      jumpPage.value = 1;
    };

    // 页面跳转处理
    const handlePageJump = () => {
      const page = jumpPage.value;
      if (page && page >= 1 && page <= totalPages.value) {
        handlePageChange(page);
      } else {
        jumpPage.value = currentPage.value;
      }
    };

    // 初始化数据
    const initializeData = async () => {
      try {
        loading.value = true;
        await toolsService.initialize();
      } catch (error) {
        console.error('初始化工具数据失败:', error);
      } finally {
        loading.value = false;
      }
    };

    // 处理收藏变化
    const handleFavoriteChange = data => {
      console.log('收藏状态变化:', data);
      // TODO: 保存到本地存储或发送到服务器
    };

    // 组件挂载时获取工具状态
    // 监听筛选条件变化，重置分页
    watch([searchKeyword, selectedCategory, selectedStatus], () => {
      resetPagination();
    });

    // 同步跳转页码与当前页码
    watch(currentPage, newPage => {
      jumpPage.value = newPage;
    });

    onMounted(() => {
      initializeData();
    });

    return {
      searchKeyword,
      selectedCategory,
      selectedStatus,
      viewMode,
      loading,
      currentPage,
      pageSize,
      allTools,
      allCategories,
      featuredTools,
      categoriesWithTools,
      filteredTools,
      allFilteredTools,
      totalPages,
      currentPageSize,
      stats,
      getCategoryTools,
      handleSearch,
      selectCategory,
      selectStatus,
      clearSearch,
      switchViewMode,
      handlePageChange,
      resetPagination,
      getCategoryName,
      getDifficultyText,
      getStatusText,
      goToTool,
      getResultTitle,
      getPaginationInfo,
      getVisiblePages,
      handleFavoriteChange,
      // 推荐工具分页相关
      featuredCurrentPage,
      featuredTotalPages,
      handleFeaturedPageChange,
      getFeaturedVisiblePages,
      // 页面跳转和大小控制
      jumpPage,
      handlePageSizeChange,
      handlePageJump
    };
  }
};
</script>

<style scoped>
.tools-index {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
}

/* 为工具箱页面覆盖父容器的背景色 - 已在App.vue中处理 */

/* 为工具箱页面添加背景，确保毛玻璃效果可见 */
.tools-index::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(168, 85, 247, 0.1) 25%,
    rgba(236, 72, 153, 0.1) 50%,
    rgba(251, 146, 60, 0.1) 75%,
    rgba(34, 197, 94, 0.1) 100%);
  z-index: -2;
  pointer-events: none;
}

/* 添加纹理背景增强毛玻璃效果 */
.tools-index::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  z-index: -1;
  pointer-events: none;
}

.loading-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 页面头部 */
.page-header {
  margin-bottom: 2rem;
}

.header-content {
  text-align: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 1rem;
  margin: 0 0 1.5rem 0;
  opacity: 1;
  color: #1e293b;
  font-weight: 500;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.stat-number {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.125rem;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 1;
  color: #334155;
  font-weight: 500;
}

/* 筛选区域 */
.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.filters:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.search-section {
  flex: 1;
  max-width: 400px;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #2c3e50;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-input::placeholder {
  color: #475569;
  font-weight: 400;
}

.search-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.3s ease;
}

.clear-search-btn:hover {
  background: rgba(255, 0, 0, 0.3);
  color: white;
  transform: translateY(-50%) scale(1.1);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.view-controls {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 0.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: #1e293b;
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  transform: translateY(-1px);
}

.btn-ghost.active {
  background: rgba(59, 130, 246, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-primary {
  background: rgba(59, 130, 246, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  background: rgba(37, 99, 235, 0.9);
  border-color: rgba(37, 99, 235, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

/* 主内容区域 */
.main-content {
  display: grid;
  gap: 2rem;
}

.main-content.with-sidebar {
  grid-template-columns: 280px 1fr;
}

/* 侧边栏筛选 */
.sidebar-filters {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.sidebar-filters:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.filter-group {
  margin-bottom: 2rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.filter-options.vertical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-options .btn {
  justify-content: flex-start;
  text-align: left;
}

.category-icon {
  margin-right: 0.5rem;
}

/* 内容区域 */
.content-area {
  min-width: 0;
}

/* 工具网格 */
.tools-grid {
  display: grid;
  gap: 1.5rem;
}

.tools-grid.grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
  /* 确保至少2列，最多4列 */
}

@media (min-width: 640px) {
  .tools-grid.grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (min-width: 1024px) {
  .tools-grid.grid {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

@media (min-width: 1280px) {
  .tools-grid.grid {
    grid-template-columns: repeat(4, 1fr) !important;
  }
}

.tools-grid.list {
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* 列表项样式 */
.list-item {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  transition: all 0.2s;
}

.list-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.list-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tool-icon-small {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  flex-shrink: 0;
}

.tool-info-list {
  flex: 1;
  min-width: 0;
}

.list-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.list-description {
  color: #334155;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
  font-weight: 400;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
  font-weight: 500;
}

.list-meta .category {
  color: #3b82f6;
  font-weight: 500;
}

.list-meta .status.active {
  color: #10b981;
}

.list-meta .status.coming-soon {
  color: #f59e0b;
}

.separator {
  color: #64748b;
  font-weight: 400;
}

.tool-actions-list {
  flex-shrink: 0;
}

/* 章节样式 */
.tools-section,
.categories-section,
.tools-container {
  margin-bottom: 3rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.15);
}

.tools-section:hover,
.categories-section:hover,
.tools-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.category-section {
  margin-bottom: 2.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
  position: relative;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #111827;
}

.section-description {
  margin: 0;
  color: #334155;
  font-size: 0.875rem;
  font-weight: 400;
}

.view-more {
  position: absolute;
  right: 0;
  top: 0;
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s;
}

.view-more:hover {
  color: #2563eb;
}

/* 空结果 */
.empty-result {
  text-align: center;
  padding: 4rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 分页器 - 博客风格 */
.bottom-pagination {
  margin-top: 3rem;
  padding: 2rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}

.pagination-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.total-info {
  font-size: 0.875rem;
  color: #334155;
  font-weight: 500;
}

.total-info strong {
  color: #1e293b;
  font-weight: 700;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #334155;
  font-weight: 500;
}

.page-size-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #2c3e50;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-size-select:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.page-size-select:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

/* 分页控件 */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  padding: 0 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: #1e293b;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.pagination-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.pagination-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #64748b;
  background: rgba(255, 255, 255, 0.05);
}

.pagination-btn.active {
  background: rgba(59, 130, 246, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.pagination-btn.active:hover {
  background: rgba(37, 99, 235, 0.9);
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.pagination-icon {
  font-size: 1rem;
  line-height: 1;
}

.pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  color: #475569;
  font-weight: 600;
  user-select: none;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
  font-size: 0.875rem;
  color: #334155;
  font-weight: 500;
}

.page-jump-input {
  width: 60px;
  height: 32px;
  padding: 0 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  text-align: center;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.page-jump-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.pagination-btn-jump {
  min-width: auto;
  padding: 0 0.75rem;
  height: 32px;
  font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .main-content.with-sidebar {
    grid-template-columns: 1fr;
  }

  .sidebar-filters {
    position: static;
    margin-bottom: 2rem;
  }

  .filter-options.vertical {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .tools-index {
    padding: 0 1rem;
  }

  .header-content {
    padding: 1.5rem 1rem;
    margin: 0 -1rem 2rem -1rem;
    border-radius: 0;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .hero-stats {
    gap: 1.5rem;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .search-section {
    max-width: none;
  }

  .toolbar {
    justify-content: center;
  }

  .tools-grid.grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .bottom-pagination {
    padding: 1.5rem 0;
  }

  .pagination-info {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    text-align: center;
  }

  .pagination-controls {
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .pagination-btn {
    min-width: 36px;
    height: 36px;
    font-size: 0.75rem;
  }

  .page-jump {
    margin-left: 0;
    margin-top: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .page-jump-input {
    width: 50px;
    height: 28px;
  }

  .list-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .tool-info-list {
    width: 100%;
  }

  .tool-actions-list {
    align-self: flex-end;
  }

  .section-header {
    text-align: center;
  }

  .view-more {
    position: static;
    display: block;
    margin-top: 0.75rem;
    text-align: center;
  }

  .sidebar-filters {
    padding: 1rem;
  }

  .filter-group {
    margin-bottom: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .list-content {
    gap: 0.75rem;
  }

  .tool-icon-small {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.5rem;
  }

  .list-title {
    font-size: 1rem;
  }

  .list-meta {
    flex-wrap: wrap;
  }

  .tools-grid.grid {
    grid-template-columns: 1fr !important;
  }

  .bottom-pagination {
    padding: 1rem 0;
    margin-top: 2rem;
  }

  .pagination-info {
    margin-bottom: 1rem;
  }

  .pagination-controls {
    gap: 0.125rem;
  }

  .pagination-btn {
    min-width: 32px;
    height: 32px;
    font-size: 0.75rem;
  }

  .page-jump {
    margin-top: 0.75rem;
  }

  .page-jump-input {
    width: 45px;
    height: 26px;
  }
}
</style>
