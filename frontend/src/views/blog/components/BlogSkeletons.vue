<template>
  <div v-if="mode==='grid'" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
    <div v-for="i in 6" :key="i" style="height:100px;border-radius:12px;background:var(--color-bg-tertiary);"></div>
  </div>
  <div v-else style="display:flex;flex-direction:column;gap:8px;">
    <div v-for="i in 8" :key="i" style="height:22px;border-radius:6px;background:var(--color-bg-tertiary);"></div>
  </div>
</template>

<script setup>
const props = defineProps({ mode: { type: String, default: 'grid' } });
</script>

