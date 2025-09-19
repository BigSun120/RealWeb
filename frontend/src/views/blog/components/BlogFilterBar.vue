<template>
  <div class="blog-filter-bar">
    <div class="filter-group" v-if="categories && categories.length > 1">
      <label class="filter-label">分类</label>
      <div class="filter-options horizontal">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="btn btn-sm"
          :class="selectedCategory === cat ? 'btn-primary' : 'btn-ghost'"
          @click="$emit('select-category', cat)"
        >{{ cat }}</button>
      </div>
    </div>

    <div class="filter-group" v-if="tags && tags.length > 1">
      <label class="filter-label">标签</label>
      <div class="filter-options horizontal">
        <button
          v-for="tag in tags"
          :key="tag"
          type="button"
          class="btn btn-sm"
          :class="selectedTag === tag ? 'btn-primary' : 'btn-ghost'"
          @click="$emit('select-tag', tag)"
        >{{ tag }}</button>
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
  gap: 1.5rem;
}

.filter-group {
  margin-bottom: 1rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.filter-options.horizontal {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-options .btn {
  justify-content: flex-start;
  text-align: left;
}

.clear-section {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
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
