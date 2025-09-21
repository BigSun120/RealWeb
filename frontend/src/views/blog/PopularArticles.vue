<template>
  <div class="popular-articles-page">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title animated-title">
          <span class="title-text">热门文章排行榜</span>
        </h1>
      </div>

      <!-- 时间范围选择 -->
      <div class="time-range-selector">
        <el-radio-group v-model="timeRange" @change="handleTimeRangeChange">
          <el-radio-button label="day">今日</el-radio-button>
          <el-radio-button label="week">本周</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 文章列表 -->
      <div class="articles-list" v-loading="loading">
        <div v-if="articles.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无热门文章" />
        </div>

        <div v-else class="article-cards">
          <div
            v-for="(article, index) in articles"
            :key="article._id"
            class="article-card"
            @click="goToArticle(article._id)"
          >
            <!-- 排名标识 -->
            <div class="rank-badge" :class="getRankClass(index + 1)">
              {{ index + 1 }}
            </div>

            <!-- 文章封面 -->
            <div class="article-cover" v-if="article.coverImage">
              <img :src="article.coverImage" :alt="article.title" />
            </div>

            <!-- 文章信息 -->
            <div class="article-info">
              <h3 class="article-title">{{ article.title }}</h3>
              <p class="article-excerpt" v-if="article.excerpt">
                {{ article.excerpt }}
              </p>

              <!-- 作者信息 -->
              <div class="article-meta">
                <div class="author-info">
                  <img
                    :src="getAuthorAvatar(article.author)"
                    :alt="article.author.displayName || article.author.username"
                    class="author-avatar"
                  />
                  <span class="author-name">
                    {{ article.author.displayName || article.author.username }}
                  </span>
                </div>

                <div class="article-stats">
                  <span class="stat-item">
                    <el-icon><Star /></el-icon>
                    {{ article.likeCount }}
                  </span>
                  <span class="stat-item">
                    <el-icon><View /></el-icon>
                    {{ article.viewCount || 0 }}
                  </span>
                  <span class="stat-item">
                    <el-icon><Clock /></el-icon>
                    {{ formatDate(article.publishedAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="articles.length > 0 && articles.length >= limit">
        <el-button @click="loadMore" :loading="loadingMore">
          加载更多
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Star, View, Clock } from '@element-plus/icons-vue';
import { getPopularArticles } from '@/api/articles';
import { getFullAvatarUrl } from '@/utils/avatar';

export default {
  name: 'PopularArticles',
  components: {
    Star,
    View,
    Clock
  },
  setup() {
    const router = useRouter();

    // 响应式数据
    const loading = ref(false);
    const loadingMore = ref(false);
    const articles = ref([]);
    const timeRange = ref('all');
    const limit = ref(10);

    // 获取热门文章
    const fetchPopularArticles = async (isLoadMore = false) => {
      if (isLoadMore) {
        loadingMore.value = true;
      } else {
        loading.value = true;
        articles.value = [];
      }

      try {
        const response = await getPopularArticles({
          timeRange: timeRange.value,
          limit: isLoadMore ? limit.value + 10 : limit.value
        });

        if (isLoadMore) {
          articles.value = response.data.data.articles;
          limit.value += 10;
        } else {
          articles.value = response.data.data.articles;
        }
      } catch (error) {
        console.error('获取热门文章失败:', error);
        ElMessage.error('获取热门文章失败');
      } finally {
        loading.value = false;
        loadingMore.value = false;
      }
    };

    // 时间范围变化处理
    const handleTimeRangeChange = () => {
      limit.value = 10;
      fetchPopularArticles();
    };

    // 加载更多
    const loadMore = () => {
      fetchPopularArticles(true);
    };

    // 跳转到文章详情
    const goToArticle = (articleId) => {
      router.push(`/blog/${articleId}`);
    };

    // 获取排名样式类
    const getRankClass = (rank) => {
      if (rank === 1) return 'rank-first';
      if (rank === 2) return 'rank-second';
      if (rank === 3) return 'rank-third';
      return 'rank-normal';
    };

    // 获取作者头像
    const getAuthorAvatar = (author) => {
      return getFullAvatarUrl(author.avatar);
    };

    // 格式化日期
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const now = new Date();
      const diff = now - d;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) return '今天';
      if (days === 1) return '昨天';
      if (days < 7) return `${days}天前`;
      if (days < 30) return `${Math.floor(days / 7)}周前`;
      if (days < 365) return `${Math.floor(days / 30)}个月前`;
      return `${Math.floor(days / 365)}年前`;
    };

    // 组件挂载时获取数据
    onMounted(() => {
      fetchPopularArticles();
    });

    return {
      loading,
      loadingMore,
      articles,
      timeRange,
      limit,
      handleTimeRangeChange,
      loadMore,
      goToArticle,
      getRankClass,
      getAuthorAvatar,
      formatDate
    };
  }
};
</script>

<style scoped>
.popular-articles-page {
  min-height: 100vh;
  background-color: var(--color-bg-soft);
  padding: var(--spacing-6) 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.animated-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  position: relative;
}

.title-text {
  background: linear-gradient(135deg, #ff6b9d, #c44569, #f8b500);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease-in-out infinite;
}

.title-decoration {
  font-size: 2rem;
  animation: fireFlicker 2s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(255, 165, 0, 0.5));
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes fireFlicker {
  0%, 100% {
    transform: scale(1) rotate(0deg);
    filter: drop-shadow(0 0 10px rgba(255, 165, 0, 0.5));
  }
  25% {
    transform: scale(1.1) rotate(-2deg);
    filter: drop-shadow(0 0 15px rgba(255, 69, 0, 0.7));
  }
  50% {
    transform: scale(1.05) rotate(1deg);
    filter: drop-shadow(0 0 20px rgba(255, 140, 0, 0.6));
  }
  75% {
    transform: scale(1.08) rotate(-1deg);
    filter: drop-shadow(0 0 12px rgba(255, 99, 71, 0.8));
  }
}

/* 移除页面描述样式 */

.time-range-selector {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-6);
}

.articles-list {
  min-height: 400px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.article-cards {
  display: grid;
  gap: var(--spacing-4);
}

.article-card {
  display: flex;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-4);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.article-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.rank-badge {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: white;
  z-index: 1;
}

.rank-first {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #8b5a00;
}

.rank-second {
  background: linear-gradient(135deg, #c0c0c0, #e5e5e5);
  color: #666;
}

.rank-third {
  background: linear-gradient(135deg, #cd7f32, #daa520);
  color: white;
}

.rank-normal {
  background: var(--color-primary);
}

.article-cover {
  width: 120px;
  height: 80px;
  border-radius: var(--border-radius);
  overflow: hidden;
  margin-right: var(--spacing-4);
  flex-shrink: 0;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.article-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
  line-height: 1.4;
}

.article-excerpt {
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-3) 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.author-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.article-stats {
  display: flex;
  gap: var(--spacing-3);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-6);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .article-card {
    flex-direction: column;
  }

  .article-cover {
    width: 100%;
    height: 160px;
    margin-right: 0;
    margin-bottom: var(--spacing-3);
  }

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }
}
</style>
