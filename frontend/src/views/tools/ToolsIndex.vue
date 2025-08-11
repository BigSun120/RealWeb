<template>
  <div class="tools-index">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-loading-directive v-loading="loading" text="正在加载工具数据..." />
    </div>
    <!-- 工具箱介绍 -->
    <div v-if="!loading" class="tools-hero">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="hero-icon">🧰</span>
          实用工具箱
        </h1>
        <p class="hero-description">
          精选实用的在线工具，提升您的工作效率。所有工具均在浏览器本地运行，保护您的隐私安全。
        </p>
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
    </div>

    <!-- 搜索和筛选 -->
    <div v-if="!loading" class="tools-search">
      <div class="search-container">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索工具名称、描述或标签..."
          size="large"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <div class="filter-tabs">
          <el-button
            v-for="category in allCategories"
            :key="category.id"
            :type="selectedCategory === category.id ? 'primary' : 'default'"
            size="small"
            @click="selectCategory(category.id)"
          >
            <span class="category-icon">{{ category.icon }}</span>
            {{ category.name }}
          </el-button>
          <el-button
            :type="selectedCategory === 'all' ? 'primary' : 'default'"
            size="small"
            @click="selectCategory('all')"
          >
            全部
          </el-button>
        </div>
      </div>
    </div>

    <!-- 推荐工具 -->
    <div v-if="!loading && !searchKeyword && selectedCategory === 'all'" class="tools-section">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><Star /></el-icon>
          推荐工具
        </h2>
        <p class="section-description">精选的热门实用工具</p>
      </div>
      <div v-if="featuredTools.length > 0" class="tools-grid">
        <ToolCard
          v-for="tool in featuredTools"
          :key="tool.id"
          :tool="tool"
          @favorite-change="handleFavoriteChange"
        />
      </div>
      <div v-else class="no-tools">
        <p>暂无推荐工具</p>
      </div>
    </div>

    <!-- 工具分类展示 -->
    <div v-if="!loading && !searchKeyword && selectedCategory === 'all'" class="categories-section">
      <div v-for="category in categoriesWithTools" :key="category.id" class="category-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="category-icon">{{ category.icon }}</span>
            {{ category.name }}
          </h2>
          <p class="section-description">{{ category.description }}</p>
          <router-link :to="`/tools/${category.id}`" class="view-more"> 查看全部 → </router-link>
        </div>
        <div class="tools-grid">
          <ToolCard
            v-for="tool in getCategoryTools(category.id).slice(0, 4)"
            :key="tool.id"
            :tool="tool"
            @favorite-change="handleFavoriteChange"
          />
        </div>
      </div>
    </div>

    <!-- 搜索结果或分类筛选结果 -->
    <div v-if="searchKeyword || selectedCategory !== 'all'" class="search-results">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><Search /></el-icon>
          {{ getResultTitle() }}
        </h2>
        <p class="section-description">找到 {{ filteredTools.length }} 个工具</p>
      </div>

      <div v-if="filteredTools.length > 0" class="tools-grid">
        <ToolCard
          v-for="tool in filteredTools"
          :key="tool.id"
          :tool="tool"
          @favorite-change="handleFavoriteChange"
        />
      </div>

      <div v-else class="empty-result">
        <el-empty description="没有找到相关工具">
          <el-button type="primary" @click="clearSearch"> 清除搜索条件 </el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
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
    const searchKeyword = ref('');
    const selectedCategory = ref('all');
    const loading = ref(true);

    // 计算属性 - 基于工具服务
    const allTools = computed(() => toolsService.tools);
    const allCategories = computed(() => toolsService.categories);
    const featuredTools = computed(() => toolsService.getFeaturedTools());
    const categoriesWithTools = computed(() => toolsService.getCategoriesWithTools());

    // 统计数据
    const stats = computed(() => toolsService.getStats());

    // 筛选后的工具
    const filteredTools = computed(() => {
      return toolsService.filterTools({
        category: selectedCategory.value,
        keyword: searchKeyword.value
      });
    });

    // 获取分类下的工具
    const getCategoryTools = categoryId => {
      return toolsService.getToolsByCategory(categoryId);
    };

    // 搜索处理
    const handleSearch = () => {
      // 搜索时重置分类筛选
      if (searchKeyword.value) {
        selectedCategory.value = 'all';
      }
    };

    // 选择分类
    const selectCategory = categoryId => {
      selectedCategory.value = categoryId;
      // 选择分类时清除搜索
      if (categoryId !== 'all') {
        searchKeyword.value = '';
      }
    };

    // 清除搜索
    const clearSearch = () => {
      searchKeyword.value = '';
      selectedCategory.value = 'all';
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
      return '筛选结果';
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
    onMounted(() => {
      initializeData();
    });

    return {
      searchKeyword,
      selectedCategory,
      loading,
      allTools,
      allCategories,
      featuredTools,
      categoriesWithTools,
      filteredTools,
      stats,
      getCategoryTools,
      handleSearch,
      selectCategory,
      clearSearch,
      getResultTitle,
      handleFavoriteChange
    };
  }
};
</script>

<style scoped>
.tools-index {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 工具箱介绍 */
.tools-hero {
  text-align: center;
  padding: 40px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 40px;
  color: white;
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.hero-icon {
  font-size: 40px;
}

.hero-description {
  font-size: 18px;
  margin: 0 0 30px 0;
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  color: #f5f7fa;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

/* 搜索和筛选 */
.tools-search {
  margin-bottom: 40px;
}

.search-container {
  max-width: 800px;
  margin: 0 auto;
}

.filter-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.category-icon {
  margin-right: 5px;
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

/* 章节样式 */
.tools-section,
.categories-section,
.search-results {
  margin-bottom: 50px;
}

.category-section {
  margin-bottom: 40px;
}

.section-header {
  margin-bottom: 20px;
  position: relative;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #303133;
}

.section-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.view-more {
  position: absolute;
  right: 0;
  top: 0;
  color: #409eff;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.view-more:hover {
  color: #66b1ff;
}

/* 空结果 */
.empty-result {
  text-align: center;
  padding: 60px 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tools-hero {
    padding: 30px 20px;
    margin: 0 -20px 30px -20px;
    border-radius: 0;
  }

  .hero-title {
    font-size: 28px;
    flex-direction: column;
    gap: 10px;
  }

  .hero-description {
    font-size: 16px;
  }

  .hero-stats {
    gap: 20px;
  }

  .tools-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .filter-tabs {
    gap: 8px;
  }

  .section-header {
    text-align: center;
  }

  .view-more {
    position: static;
    display: block;
    margin-top: 10px;
  }
}
</style>
