<template>
  <div class="blog-pagination">
    <div class="pagination-info">
      共 <span class="highlight">{{ total }}</span> 篇
      <span v-if="totalPages > 1">，第 <span class="highlight">{{ currentPage }}</span> / <span class="highlight">{{ totalPages }}</span> 页</span>
    </div>

    <div class="pagination-main">
      <div class="pagination-controls">
        <button class="page-btn nav-btn" :disabled="currentPage===1" @click="$emit('change-page', 1)">
          <span>⟪</span>
        </button>
        <button class="page-btn nav-btn" :disabled="currentPage===1" @click="$emit('change-page', currentPage-1)">
          <span>‹</span>
        </button>

        <template v-for="p in visiblePages" :key="`p-${p}`">
          <span v-if="p==='...'" class="pagination-ellipsis">...</span>
          <button v-else class="page-btn" :class="{ active: p===currentPage }" @click="onClickPage(p)">
            {{ p }}
          </button>
        </template>

        <button class="page-btn nav-btn" :disabled="currentPage===totalPages" @click="$emit('change-page', currentPage+1)">
          <span>›</span>
        </button>
        <button class="page-btn nav-btn" :disabled="currentPage===totalPages" @click="$emit('change-page', totalPages)">
          <span>⟫</span>
        </button>
      </div>

      <div class="pagination-actions">
        <div class="page-size-selector">
          <span class="label">每页</span>
          <select :value="pageSize" @change="onChangeSize" class="size-select">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
          </select>
          <span class="label">条</span>
        </div>

        <div class="page-jump">
          <span class="label">跳至</span>
          <input type="number" :min="1" :max="totalPages" :value="jumpPage" @input="onInputJump" @keyup.enter="$emit('page-jump')" class="jump-input" />
          <span class="label">页</span>
          <button class="jump-btn" @click="$emit('page-jump')">跳转</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
defineProps<{
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  visiblePages: Array<number|"...">;
  jumpPage: number;
}>();

// Emits
type Emits = {
  (e: 'change-page', p: number): void
  (e: 'change-size', size: number): void
  (e: 'update:jump-page', v: number): void
  (e: 'page-jump'): void
}
const emit = defineEmits<Emits>();

// Handlers
const onChangeSize = (e: Event) => {
  const target = e.target as HTMLSelectElement | null;
  const val = target?.value ? Number(target.value) : 10;
  emit('change-size', val);
};

const onClickPage = (p: number | string) => {
  if (p === '...') return;
  emit('change-page', Number(p));
};

const onInputJump = (e: Event) => {
  const target = e.target as HTMLInputElement | null;
  const val = target?.value ? Number(target.value) : 1;
  emit('update:jump-page', val);
};
</script>
<style scoped>
.blog-pagination {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pagination-info {
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.highlight {
  color: #3b82f6;
  font-weight: 600;
}

.pagination-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: #475569;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.page-btn.active {
  background: rgba(59, 130, 246, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.05);
}

.pagination-ellipsis {
  padding: 0.5rem;
  color: #94a3b8;
  font-weight: 500;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-size-selector,
.page-jump {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 500;
}

.size-select,
.jump-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: #475569;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.size-select:focus,
.jump-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.jump-input {
  width: 60px;
  text-align: center;
}

.jump-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.1);
  backdrop-filter: blur(10px);
  color: #3b82f6;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.jump-btn:hover {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .pagination-main {
    flex-direction: column;
    gap: 0.75rem;
  }

  .pagination-actions {
    justify-content: center;
  }
}
</style>

