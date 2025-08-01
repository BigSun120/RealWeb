<template>
  <div class="blog-list">
    <h1>博客文章</h1>
    <div v-loading="loading" class="articles">
      <div v-for="article in articles" :key="article._id" class="article-card" @click="$router.push(`/blog/${article._id}`)">
        <h3>{{ article.title }}</h3>
        <p>{{ article.excerpt }}</p>
        <div class="meta">
          <span>{{ article.author?.username }}</span>
          <span>{{ formatDate(article.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '@/api';

export default {
  name: 'BlogList',
  setup() {
    const articles = ref([]);
    const loading = ref(false);

    const fetchArticles = async () => {
      loading.value = true;
      try {
        const response = await api.get('/articles');
        articles.value = response.data.data.articles;
      } catch (error) {
        console.error('获取文章失败:', error);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('zh-CN');
    };

    onMounted(() => {
      fetchArticles();
    });

    return {
      articles,
      loading,
      formatDate
    };
  }
};
</script>

<style scoped>
.blog-list {
  padding: 20px;
}

.article-card {
  background: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.meta {
  display: flex;
  gap: 20px;
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}
</style>
