<template>
  <div class="articles-list">
    <div v-for="a in articles" :key="a._id" class="list-item" @click="$emit('open', a._id)">
      <div class="list-content">
        <!-- 标题、所有信息和摘要都在一行内展示 -->
        <div class="list-single-line">
          <h3 class="list-title">{{ a.title }}</h3>
          <div class="list-meta">
            <span class="author" v-if="a.author">{{ getAuthorName(a.author) }}</span>
            <span class="separator" v-if="a.author">·</span>
            <span class="date">{{ formatDate(a.createdAt) }}</span>
            <span class="separator" v-if="a.viewCount">·</span>
            <span class="views" v-if="a.viewCount">{{ a.viewCount }} 浏览</span>
            <span class="separator" v-if="a.likeCount">·</span>
            <span class="likes" v-if="a.likeCount">{{ a.likeCount }} 赞</span>
            <span class="separator" v-if="a.tags && a.tags.length">·</span>
            <div class="tags" v-if="a.tags && a.tags.length">
              <span v-for="tag in a.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <span class="separator">·</span>
            <span class="list-description">{{ excerpt(a) }}</span>
          </div>
        </div>
      </div>
    </div>
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

  return text.length > 60 ? text.slice(0, 60) + '...' : text;
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
.articles-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 紧凑列表项样式 - 参考 tools 页面 */
.list-item {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.list-item:hover {
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.list-content {
  flex: 1;
  min-width: 0;
}

.list-single-line {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: nowrap;
  overflow: hidden;
}

.list-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
  flex-shrink: 0;
  min-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: nowrap;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
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

.list-description {
  margin: 0;
  color: #64748b;
  line-height: 1.4;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  max-width: 300px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .list-single-line {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .list-title {
    min-width: auto;
    max-width: 150px;
  }

  .list-meta {
    flex-wrap: wrap;
  }

  .list-description {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
  }
}
</style>

