<template>
  <div class="blog-filter-bar">
    <div class="filter-group" v-if="categories && categories.length > 1">
      <label class="filter-label">分类</label>
      <div class="filter-options horizontal">
        <button v-for="cat in categories" :key="cat" type="button" class="btn btn-sm"
          :class="selectedCategory === cat ? 'btn-primary' : 'btn-ghost'" @click="$emit('select-category', cat)">{{ cat
          }}</button>
      </div>
    </div>

    <div class="filter-group" v-if="tags && tags.length > 1">
      <label class="filter-label">标签</label>
      <div class="filter-options horizontal">
        <button v-for="tag in tags" :key="tag" type="button" class="btn btn-sm"
          :class="selectedTag === tag ? 'btn-primary' : 'btn-ghost'" @click="$emit('select-tag', tag)">{{ tag
          }}</button>
      </div>
    </div>

    <div class="clear-section">
      <button type="button" class="btn btn-ghost btn-sm" @click="$emit('clear-all')">清空筛选</button>
      <slot />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  categories: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  selectedCategory: { type: String, default: '全部' },
  selectedTag: { type: String, default: '全部' }
});
</script>

<style scoped>
.blog-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* 紧凑：整体垂直间距不超过10px */
}

.filter-group {
  margin-bottom: 10px;
  /* 紧凑：分组底部外边距不超过10px */
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 8px;
  /* 紧凑：标签与按钮组间距不超过10px */
  font-size: 0.875rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.filter-options.horizontal {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  /* 防止子项在纵向布局时被拉伸为全宽 */
  gap: 0.5rem;
}

.filter-options .btn {
  justify-content: flex-start;
  text-align: left;
  width: 100%;
  /* 明确为内容宽度 */
  padding: 6px 10px;
  /* 紧凑：上下内边距<=10px */
  line-height: 1.2;
  /* 紧凑：行高不过分放大 */
  margin: 0;
  /* 紧凑：按钮自身上下外边距为0 */
}

/* 小于 1024 时：分类/标签以“行内胶囊”样式并自动换行 */
@media (max-width: 1024px) {
  .filter-options.horizontal {
    flex-direction: row;
    /* 横向排列 */
    flex-wrap: wrap;
    /* 自动换行 */
    align-items: center;
    /* 垂直居中 */
    gap: 0.5rem 0.5rem;
    /* 行列间距 */
  }

  .filter-options .btn {
    width: auto;
    /* 防止按钮占满整行 */
    max-width: 100%;
  }
}

.clear-section {
  display: flex;
  gap: 8px;
  /* 紧凑：组件内间距 */
  align-items: center;
  margin-top: 10px;
  /* 紧凑：顶部外边距<=10px */
  padding-top: 8px;
  /* 紧凑：顶部内边距<=10px */
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .blog-filter-bar {
    gap: 1rem;
  }

  .filter-group {
    margin-bottom: 0.5rem;
  }
}
</style>
