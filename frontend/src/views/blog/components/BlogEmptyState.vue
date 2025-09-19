<template>
  <div class="empty-state" style="text-align:center;padding:40px 16px;">
    <div style="font-size:28px;">📝</div>
    <h3 style="margin:8px 0 4px;">{{ search ? '未找到相关文章' : '暂无文章' }}</h3>
    <p style="margin:0 0 12px;color:var(--color-text-secondary);">{{ search ? '尝试使用其他关键词搜索' : '敬请期待…' }}</p>
    <button v-if="search" type="button" class="btn btn-ghost" @click="$emit('clear')">清除搜索</button>
  </div>
</template>

<script setup>
const props = defineProps({
  search: { type: String, default: '' }
});
</script>

