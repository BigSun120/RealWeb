<template>
  <div class="blog-detail">
    <div v-loading="loading">
      <div v-if="article" class="article">
        <h1>{{ article.title }}</h1>
        <div class="meta">
          <span>作者：{{ article.author?.username }}</span>
          <span>发布时间：{{ formatDate(article.publishedAt) }}</span>
          <span>阅读量：{{ article.viewCount }}</span>
        </div>
        <div class="content markdown-content" v-html="renderedContent"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import api from '@/api';

export default {
  name: 'BlogDetail',
  setup() {
    const route = useRoute();
    const article = ref(null);
    const loading = ref(false);

    // 配置marked
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Highlight error:', err);
          }
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true
    });

    // 渲染Markdown内容
    const renderedContent = computed(() => {
      if (!article.value?.content) return '';
      try {
        return marked(article.value.content);
      } catch (error) {
        console.error('Markdown parsing error:', error);
        return '<p>内容解析错误</p>';
      }
    });

    const fetchArticle = async () => {
      loading.value = true;
      try {
        const response = await api.get(`/articles/${route.params.id}`);
        article.value = response.data.data;
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
      fetchArticle();
    });

    return {
      article,
      loading,
      renderedContent,
      formatDate
    };
  }
};
</script>

<style scoped>
.blog-detail {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.article {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.meta {
  display: flex;
  gap: 20px;
  color: #666;
  font-size: 14px;
  margin: 20px 0;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.content {
  line-height: 1.8;
}

/* Markdown内容样式 */
.markdown-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #2c3e50;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 24px 0 16px 0;
  font-weight: 600;
  line-height: 1.25;
  color: #1a202c;
}

.markdown-content :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid #e1e8ed;
  padding-bottom: 8px;
}

.markdown-content :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #e1e8ed;
  padding-bottom: 6px;
}

.markdown-content :deep(h3) {
  font-size: 1.25em;
}

.markdown-content :deep(p) {
  margin: 16px 0;
  line-height: 1.7;
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: block;
}

.markdown-content :deep(code) {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9em;
  color: #e83e8c;
}

.markdown-content :deep(pre) {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
  border-radius: 0;
  color: inherit;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #667eea;
  margin: 16px 0;
  padding: 0 16px;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 0 8px 8px 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.markdown-content :deep(li) {
  margin: 8px 0;
  line-height: 1.6;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  overflow: hidden;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e1e8ed;
}

.markdown-content :deep(th) {
  background: #f8f9fa;
  font-weight: 600;
}

.markdown-content :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #e1e8ed;
  margin: 24px 0;
}
</style>
