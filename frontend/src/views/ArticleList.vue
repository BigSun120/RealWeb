<template>
  <div class="article-list">
    <div class="list-header">
      <div class="header-left">
        <h1>我的文章</h1>
        <div class="filter-tabs">
          <el-button-group>
            <el-button
              :type="activeTab === 'all' ? 'primary' : ''"
              @click="activeTab = 'all'"
            >
              全部 ({{ stats.total }})
            </el-button>
            <el-button
              :type="activeTab === 'published' ? 'primary' : ''"
              @click="activeTab = 'published'"
            >
              已发布 ({{ stats.published }})
            </el-button>
            <el-button
              :type="activeTab === 'draft' ? 'primary' : ''"
              @click="activeTab = 'draft'"
            >
              草稿 ({{ stats.draft }})
            </el-button>
          </el-button-group>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="$router.push('/articles/new')">
          <el-icon><EditPen /></el-icon>
          写文章
        </el-button>
      </div>
    </div>

    <div class="list-content">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="filteredArticles.length === 0" class="empty-container">
        <el-empty description="暂无文章">
          <el-button type="primary" @click="$router.push('/articles/new')">
            创建第一篇文章
          </el-button>
        </el-empty>
      </div>

      <div v-else class="articles-grid">
        <div
          v-for="article in filteredArticles"
          :key="article.id"
          class="article-card"
        >
          <div class="card-header">
            <h3 class="article-title" @click="editArticle(article)">
              {{ article.title || '无标题' }}
            </h3>
            <div class="article-status">
              <el-tag
                :type="article.status === 'published' ? 'success' : 'info'"
                size="small"
              >
                {{ article.status === 'published' ? '已发布' : '草稿' }}
              </el-tag>
            </div>
          </div>

          <div class="card-content">
            <p class="article-summary">
              {{ article.summary || getContentPreview(article.content) }}
            </p>

            <div class="article-meta">
              <span class="meta-item">
                <el-icon><Calendar /></el-icon>
                {{ formatDate(article.updatedAt) }}
              </span>
              <span class="meta-item">
                <el-icon><Document /></el-icon>
                {{ getWordCount(article.content) }} 字
              </span>
              <span v-if="article.category" class="meta-item">
                <el-icon><Collection /></el-icon>
                {{ getCategoryName(article.category) }}
              </span>
            </div>

            <div v-if="article.tags && article.tags.length > 0" class="article-tags">
              <el-tag
                v-for="tag in article.tags.slice(0, 3)"
                :key="tag"
                size="small"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
              <span v-if="article.tags.length > 3" class="more-tags">
                +{{ article.tags.length - 3 }}
              </span>
            </div>
          </div>

          <div class="card-actions">
            <el-button size="small" @click="editArticle(article)">
              编辑
            </el-button>
            <el-button
              v-if="article.status === 'draft'"
              size="small"
              type="primary"
              @click="publishArticle(article)"
            >
              发布
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteArticle(article)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  EditPen, Calendar, Document, Collection
} from '@element-plus/icons-vue';
import api from '@/api';

export default {
  name: 'ArticleList',
  components: {
    EditPen, Calendar, Document, Collection
  },
  setup() {
    const router = useRouter();
    const loading = ref(true);
    const activeTab = ref('all');
    const articles = ref([]);

    const categories = {
      tech: '技术分享',
      life: '生活随笔',
      study: '学习笔记',
      project: '项目经验',
      other: '其他'
    };

    // 统计信息
    const stats = computed(() => {
      const total = articles.value.length;
      const published = articles.value.filter(a => a.status === 'published').length;
      const draft = articles.value.filter(a => a.status === 'draft').length;
      return { total, published, draft };
    });

    // 过滤文章
    const filteredArticles = computed(() => {
      if (activeTab.value === 'all') return articles.value;
      return articles.value.filter(article => article.status === activeTab.value);
    });

    // 获取分类名称
    const getCategoryName = (category) => {
      return categories[category] || category;
    };

    // 获取内容预览
    const getContentPreview = (content) => {
      if (!content) return '暂无内容';
      return content.replace(/[#*`>\-\[\]]/g, '').substring(0, 100) + '...';
    };

    // 获取字数
    const getWordCount = (content) => {
      if (!content) return 0;
      return content.replace(/\s+/g, '').length;
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // 编辑文章
    const editArticle = (article) => {
      router.push(`/articles/${article.id}/edit`);
    };

    // 发布文章
    const publishArticle = async (article) => {
      try {
        await api.put(`/articles/${article.id}`, {
          ...article,
          status: 'published'
        });
        article.status = 'published';
        ElMessage.success('文章发布成功');
      } catch (error) {
        ElMessage.error('发布失败：' + (error.response?.data?.message || error.message));
      }
    };

    // 删除文章
    const deleteArticle = async (article) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除文章"${article.title || '无标题'}"吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await api.delete(`/articles/${article.id}`);
        articles.value = articles.value.filter(a => a.id !== article.id);
        ElMessage.success('文章删除成功');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败：' + (error.response?.data?.message || error.message));
        }
      }
    };

    // 加载文章列表
    const loadArticles = async () => {
      loading.value = true;
      try {
        const response = await api.get('/articles/my');
        const data = response.data.data || [];
        // 转换数据格式
        articles.value = data.map(article => ({
          id: article._id,
          title: article.title,
          summary: article.excerpt,
          content: article.content,
          category: article.category,
          tags: article.tags || [],
          status: article.status,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt
        }));
      } catch (error) {
        ElMessage.error('加载文章列表失败：' + (error.response?.data?.message || error.message));
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadArticles();
    });

    return {
      loading,
      activeTab,
      articles,
      stats,
      filteredArticles,
      getCategoryName,
      getContentPreview,
      getWordCount,
      formatDate,
      editArticle,
      publishArticle,
      deleteArticle
    };
  }
};
</script>

<style scoped>
.article-list {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.list-content {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container,
.empty-container {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.article-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.article-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  cursor: pointer;
  flex: 1;
  margin-right: 12px;
}

.article-title:hover {
  color: #667eea;
}

.card-content {
  margin-bottom: 16px;
}

.article-summary {
  margin: 0 0 12px 0;
  color: #7f8c8d;
  line-height: 1.5;
  font-size: 14px;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #95a5a6;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.more-tags {
  font-size: 12px;
  color: #95a5a6;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

@media (max-width: 768px) {
  .article-list {
    padding: 16px;
  }

  .list-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .articles-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .article-card {
    padding: 16px;
  }
}
</style>
