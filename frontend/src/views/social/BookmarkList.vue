<template>
  <div class="bookmark-list-page">
    <div class="page-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">我的收藏</h1>
          <p class="page-description">管理您收藏的文章和评论</p>
        </div>
        
        <!-- 统计信息 -->
        <div v-if="stats" class="stats-cards">
          <div class="stat-card">
            <div class="stat-number">{{ stats.total }}</div>
            <div class="stat-label">总收藏</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ stats.byType.article || 0 }}</div>
            <div class="stat-label">文章</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ stats.byType.comment || 0 }}</div>
            <div class="stat-label">评论</div>
          </div>
        </div>
      </div>

      <!-- 筛选和排序 -->
      <div class="filters-section">
        <div class="filter-tabs">
          <el-radio-group v-model="activeFilter" @change="handleFilterChange">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="article">文章</el-radio-button>
            <el-radio-button label="comment">评论</el-radio-button>
          </el-radio-group>
        </div>
        
        <div class="sort-controls">
          <el-select v-model="sortBy" @change="handleSortChange" placeholder="排序方式">
            <el-option label="收藏时间" value="createdAt" />
            <el-option label="内容创建时间" value="target.createdAt" />
          </el-select>
          <el-select v-model="sortOrder" @change="handleSortChange" placeholder="排序顺序">
            <el-option label="最新在前" value="desc" />
            <el-option label="最旧在前" value="asc" />
          </el-select>
        </div>
      </div>

      <!-- 收藏列表 -->
      <div class="bookmarks-section">
        <div v-loading="loading" class="bookmarks-container">
          <div v-if="bookmarks.length === 0 && !loading" class="empty-state">
            <el-empty description="暂无收藏内容">
              <el-button type="primary" @click="$router.push('/blog')">
                去发现好文章
              </el-button>
            </el-empty>
          </div>
          
          <div v-else class="bookmarks-grid">
            <div
              v-for="bookmark in bookmarks"
              :key="bookmark._id"
              class="bookmark-item"
            >
              <!-- 文章收藏 -->
              <div v-if="bookmark.targetType === 'article'" class="article-bookmark">
                <div class="bookmark-header">
                  <span class="bookmark-type">文章</span>
                  <span class="bookmark-date">{{ formatDate(bookmark.createdAt) }}</span>
                  <el-button
                    type="text"
                    size="small"
                    @click="removeBookmark(bookmark)"
                    class="remove-btn"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                
                <div class="bookmark-content" @click="goToArticle(bookmark.target)">
                  <h3 class="content-title">{{ bookmark.target?.title || '文章已删除' }}</h3>
                  <p class="content-excerpt">{{ getExcerpt(bookmark.target?.content) }}</p>
                  
                  <div v-if="bookmark.target" class="content-meta">
                    <span class="author">{{ bookmark.target.author?.displayName || bookmark.target.author?.username }}</span>
                    <span class="divider">·</span>
                    <span class="publish-date">{{ formatDate(bookmark.target.publishedAt) }}</span>
                  </div>
                </div>
                
                <!-- 收藏备注 -->
                <div v-if="bookmark.note" class="bookmark-note">
                  <el-icon><EditPen /></el-icon>
                  <span>{{ bookmark.note }}</span>
                </div>
              </div>
              
              <!-- 评论收藏 -->
              <div v-else-if="bookmark.targetType === 'comment'" class="comment-bookmark">
                <div class="bookmark-header">
                  <span class="bookmark-type">评论</span>
                  <span class="bookmark-date">{{ formatDate(bookmark.createdAt) }}</span>
                  <el-button
                    type="text"
                    size="small"
                    @click="removeBookmark(bookmark)"
                    class="remove-btn"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                
                <div class="bookmark-content" @click="goToComment(bookmark.target)">
                  <div class="comment-content">{{ bookmark.target?.content || '评论已删除' }}</div>
                  
                  <div v-if="bookmark.target" class="content-meta">
                    <span class="author">{{ bookmark.target.author?.displayName || bookmark.target.author?.username }}</span>
                    <span class="divider">·</span>
                    <span class="comment-date">{{ formatDate(bookmark.target.createdAt) }}</span>
                  </div>
                </div>
                
                <!-- 收藏备注 -->
                <div v-if="bookmark.note" class="bookmark-note">
                  <el-icon><EditPen /></el-icon>
                  <span>{{ bookmark.note }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.total > 0" class="pagination-section">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :total="pagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, EditPen } from '@element-plus/icons-vue';
import { getUserBookmarks, getUserBookmarkStats, deleteBookmark } from '@/api/bookmarks';
import { useUserStore } from '@/stores/user';

// Router
const router = useRouter();

// Store
const userStore = useUserStore();

// 响应式数据
const loading = ref(false);
const bookmarks = ref([]);
const stats = ref(null);
const activeFilter = ref('');
const sortBy = ref('createdAt');
const sortOrder = ref('desc');

// 分页信息
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
});

// 计算属性
const isLoggedIn = computed(() => userStore.isLoggedIn);

// 格式化日期
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// 获取文章摘要
const getExcerpt = (content) => {
  if (!content) return '';
  const plainText = content.replace(/<[^>]*>/g, '');
  return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
};

// 获取收藏列表
const fetchBookmarks = async () => {
  if (!isLoggedIn.value) {
    router.push('/auth/login');
    return;
  }

  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    };
    
    if (activeFilter.value) {
      params.targetType = activeFilter.value;
    }

    const response = await getUserBookmarks(params);
    bookmarks.value = response.data.data.bookmarks;
    pagination.value = response.data.data.pagination;
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    ElMessage.error('获取收藏列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取收藏统计
const fetchStats = async () => {
  if (!isLoggedIn.value) return;

  try {
    const response = await getUserBookmarkStats();
    stats.value = response.data.data;
  } catch (error) {
    console.error('获取收藏统计失败:', error);
  }
};

// 处理筛选变化
const handleFilterChange = () => {
  pagination.value.page = 1;
  fetchBookmarks();
};

// 处理排序变化
const handleSortChange = () => {
  pagination.value.page = 1;
  fetchBookmarks();
};

// 处理分页变化
const handlePageChange = (page) => {
  pagination.value.page = page;
  fetchBookmarks();
};

// 处理页面大小变化
const handlePageSizeChange = (size) => {
  pagination.value.limit = size;
  pagination.value.page = 1;
  fetchBookmarks();
};

// 删除收藏
const removeBookmark = async (bookmark) => {
  try {
    await ElMessageBox.confirm(
      '确定要取消收藏这个内容吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await deleteBookmark(bookmark._id);
    ElMessage.success('已取消收藏');
    
    // 重新获取数据
    fetchBookmarks();
    fetchStats();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除收藏失败:', error);
      ElMessage.error('删除收藏失败');
    }
  }
};

// 跳转到文章
const goToArticle = (article) => {
  if (article?._id) {
    router.push(`/blog/${article._id}`);
  }
};

// 跳转到评论
const goToComment = (comment) => {
  if (comment?.articleId) {
    router.push(`/blog/${comment.articleId}#comment-${comment._id}`);
  }
};

// 组件挂载
onMounted(() => {
  fetchBookmarks();
  fetchStats();
});

// 监听登录状态变化
watch(isLoggedIn, (newValue) => {
  if (newValue) {
    fetchBookmarks();
    fetchStats();
  } else {
    router.push('/auth/login');
  }
});
</script>

<style scoped>
.bookmark-list-page {
  background-color: var(--color-bg-secondary);
  min-height: 100vh;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6) var(--spacing-4);
}

/* 页面头部 */
.page-header {
  margin-bottom: var(--spacing-8);
}

.header-content {
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.page-description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

/* 统计卡片 */
.stats-cards {
  display: flex;
  justify-content: center;
  gap: var(--spacing-6);
}

.stat-card {
  text-align: center;
  padding: var(--spacing-4);
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.stat-number {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: var(--spacing-1);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 筛选和排序 */
.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-4);
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.sort-controls {
  display: flex;
  gap: var(--spacing-3);
}

/* 收藏列表 */
.bookmarks-grid {
  display: grid;
  gap: var(--spacing-4);
}

.bookmark-item {
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all 0.3s ease;
}

.bookmark-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.bookmark-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.bookmark-type {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary);
}

.bookmark-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.remove-btn {
  color: var(--color-danger);
}

.bookmark-content {
  padding: var(--spacing-4);
  cursor: pointer;
}

.content-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
  line-height: 1.4;
}

.content-excerpt {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--spacing-3);
}

.comment-content {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  line-height: 1.6;
  margin-bottom: var(--spacing-3);
}

.content-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.divider {
  color: var(--color-text-tertiary);
}

.bookmark-note {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-bg-tertiary);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 分页 */
.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .filters-section {
    flex-direction: column;
    gap: var(--spacing-4);
  }
  
  .stats-cards {
    flex-direction: column;
    align-items: center;
  }
  
  .sort-controls {
    width: 100%;
  }
}
</style>
