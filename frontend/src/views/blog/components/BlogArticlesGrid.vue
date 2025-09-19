<template>
  <div class="articles-grid">
    <article v-for="a in articles" :key="a._id" class="article-card" @click="$emit('open', a._id)">
      <!-- 标题和所有信息在一行内展示 -->
      <div class="article-single-line">
        <h3 class="article-title">{{ a.title }}</h3>
        <div class="article-meta">
          <span class="author" v-if="a.author">{{ getAuthorName(a.author) }}</span>
          <span class="separator" v-if="a.author">•</span>
          <span class="date">{{ formatDate(a.createdAt) }}</span>
          <span class="separator" v-if="a.viewCount">•</span>
          <span class="views" v-if="a.viewCount">{{ a.viewCount }} 浏览</span>
          <span class="separator" v-if="a.likeCount">•</span>
          <span class="likes" v-if="a.likeCount">{{ a.likeCount }} 赞</span>
          <span class="separator" v-if="a.tags && a.tags.length">•</span>
          <div class="tags" v-if="a.tags && a.tags.length">
            <span v-for="tag in a.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
      <p class="article-excerpt">{{ excerpt(a) }}</p>
    </article>
  </div>
</template>

<script setup>
const props = defineProps({
  articles: { type: Array, default: () => [] }
});

const excerpt = (a) => {
  // 优先使用 excerpt 字段，如果没有则使用 content
  let content = a?.excerpt || a?.content || a?.title || '';

  // 如果内容看起来像JSON数据，尝试解析
  if (typeof content === 'string' && content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      // 如果是用户对象，提取有意义的信息
      if (parsed.username || parsed.displayName) {
        content = `用户: ${parsed.displayName || parsed.username}`;
      } else if (parsed.title) {
        content = parsed.title;
      } else {
        content = '数据内容';
      }
    } catch (e) {
      // 如果解析失败，继续使用原始内容
    }
  }

  // 移除HTML标签、Markdown语法和特殊字符
  const text = String(content)
    .replace(/<[^>]*>/g, '') // 移除HTML标签
    .replace(/[#*`>\-\[\]]/g, '') // 移除Markdown语法
    .replace(/[{}"\[\]]/g, '') // 移除JSON特殊字符
    .replace(/\s+/g, ' ') // 合并多个空格
    .replace(/[^\u4e00-\u9fa5\w\s.,!?;:]/g, '') // 只保留中文、英文、数字和基本标点
    .trim();

  // 如果处理后的文本为空，返回默认文本
  if (!text) {
    return '暂无摘要';
  }

  return text.length > 80 ? text.slice(0, 80) + '...' : text;
};

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('zh-CN');
};

// 获取作者名称
const getAuthorName = (author) => {
  if (!author) return '匿名';

  // 如果author是字符串且看起来像JSON，尝试解析
  if (typeof author === 'string') {
    if (author.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(author);
        return parsed.displayName || parsed.username || '匿名';
      } catch (e) {
        // 如果解析失败，直接返回字符串
        return author;
      }
    }
    return author;
  }

  // 如果author是对象，提取displayName或username
  if (typeof author === 'object' && author !== null) {
    return author.displayName || author.username || '匿名';
  }

  return '匿名';
};
</script>

<style scoped>
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.article-card {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  height: fit-content;
}

.article-card:hover {
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.article-single-line {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.article-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
  flex: 1;
  min-width: 150px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: #64748b;
  flex-shrink: 0;
}

.tags {
  display: flex;
  gap: 0.25rem;
}

.tag {
  padding: 0.1rem 0.3rem;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
}

.author {
  color: #3b82f6;
  font-weight: 500;
}

.separator {
  color: #94a3b8;
}

.views, .likes {
  color: #64748b;
}

.article-excerpt {
  margin: 0;
  color: #475569;
  line-height: 1.5;
  font-size: 0.85rem;
}
</style>

