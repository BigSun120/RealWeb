<template>
  <div class="category-index">
    <!-- 头部信息 -->
    <div class="category-header">
      <h1 class="category-title">
        <span class="category-icon">{{ categoryInfo?.icon || '🧰' }}</span>
        {{ categoryInfo?.name || '工具分类' }}
      </h1>
      <p class="category-desc">{{ categoryInfo?.description || '该分类下的工具列表' }}</p>
    </div>

    <!-- 列表信息与分页提示 -->
    <div class="list-meta" v-if="total > 0">
      显示第 {{ startIndex }} - {{ endIndex }} 项，共 {{ total }} 项
    </div>

    <!-- 工具网格 -->
    <div class="tools-grid">
      <ToolCard
        v-for="tool in pagedTools"
        :key="tool.id"
        :tool="tool"
        @favorite-change="handleFavoriteChange"
      />
    </div>

    <!-- 空状态 -->
    <el-empty v-if="!loading && total === 0" description="该分类下暂无可用工具" />

    <!-- 分页器 -->
    <div class="pagination-wrap" v-if="totalPages > 1">
      <el-pagination
        background
        layout="prev, pager, next, jumper"
        :page-size="pageSize"
        :current-page="currentPage"
        :total="total"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import ToolCard from '@/components/tools/ToolCard.vue';
import toolsService from '@/services/toolsService';

export default {
  name: 'CategoryIndex',
  components: { ToolCard },
  setup() {
    const route = useRoute();

    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(12);

    // 当前分类ID取自路由元信息（推荐方案与现有面包屑一致）
    const categoryId = computed(() => route.meta?.category || route.params?.categoryId || 'all');

    // 分类信息
    const categoryInfo = computed(() => toolsService.getCategoryById(categoryId.value));

    // 原始工具列表（服务层在 initialize 中只拉取 active 状态）
    const allTools = computed(() => toolsService.filterTools({ category: categoryId.value }));

    // 统计与分页
    const total = computed(() => allTools.value.length);
    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
    const startIndex = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1));
    const endIndex = computed(() => Math.min(currentPage.value * pageSize.value, total.value));

    const pagedTools = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return allTools.value.slice(start, end);
    });

    const handlePageChange = (page) => {
      currentPage.value = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFavoriteChange = (data) => {
      // 预留：收藏状态变化处理
      // console.log('favorite-change', data);
    };

    const ensureInitialized = async () => {
      if (toolsService.tools.length === 0 || toolsService.categories.length === 0) {
        loading.value = true;
        try {
          await toolsService.initialize();
        } finally {
          loading.value = false;
        }
      }
    };

    // 当分类变化时，重置分页到第一页
    watch(categoryId, () => {
      currentPage.value = 1;
    });

    onMounted(async () => {
      await ensureInitialized();
    });

    return {
      loading,
      categoryInfo,
      pagedTools,
      total,
      totalPages,
      currentPage,
      pageSize,
      startIndex,
      endIndex,
      handlePageChange,
      handleFavoriteChange
    };
  }
};
</script>

<style scoped>
.category-index {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 24px 20px;
}

.category-header {
  margin: 12px 0 16px 0;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 6px 0;
}

.category-icon {
  font-size: 22px;
}

.category-desc {
  margin: 0;
  color: #6b7280;
}

.list-meta {
  margin: 8px 0 16px 0;
  color: #6b7280;
  font-size: 14px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .category-index {
    padding: 0 16px 20px 16px;
  }
  .category-title { font-size: 20px; }
}
</style>

