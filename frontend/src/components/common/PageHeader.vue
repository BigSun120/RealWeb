<template>
  <div class="page-header">
    <div class="header-content">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      
      <!-- 统计数据 -->
      <div v-if="showStats && stats && stats.length > 0" class="hero-stats">
        <div 
          v-for="stat in stats" 
          :key="stat.label" 
          class="stat-item"
        >
          <span class="stat-number">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <div v-if="showFilters" class="filters">
      <!-- 搜索框 -->
      <div class="search-section">
        <div class="search-box">
          <input
            :value="searchValue"
            type="text"
            :placeholder="searchPlaceholder"
            class="search-input"
            @input="$emit('search', $event.target.value)"
          />
          <button 
            v-if="searchValue" 
            class="clear-search-btn" 
            @click="$emit('clear-search')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="view-controls">
          <button
            v-for="mode in viewModes"
            :key="mode.value"
            class="btn btn-ghost btn-sm"
            :class="{ active: viewMode === mode.value }"
            @click="$emit('view-mode-change', mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
        
        <!-- 额外的工具栏按钮 -->
        <div v-if="$slots.toolbar" class="extra-toolbar">
          <slot name="toolbar"></slot>
        </div>
      </div>
    </div>

    <!-- 自定义内容插槽 -->
    <div v-if="$slots.default" class="header-extra">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  stats: {
    type: Array,
    default: () => []
  },
  showStats: {
    type: Boolean,
    default: true
  },
  showFilters: {
    type: Boolean,
    default: false
  },
  searchValue: {
    type: String,
    default: ''
  },
  searchPlaceholder: {
    type: String,
    default: '搜索...'
  },
  viewMode: {
    type: String,
    default: 'grid'
  },
  viewModes: {
    type: Array,
    default: () => [
      { value: 'grid', label: '网格' },
      { value: 'list', label: '列表' }
    ]
  }
})

defineEmits(['search', 'clear-search', 'view-mode-change'])
</script>

<style scoped>
/* 页面头部 */
.page-header {
  margin-bottom: 0rem;
}

.header-content {
  text-align: center;
  padding: 1.2rem 1.5rem;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 0.9rem;
  margin: 0.25rem 0 0 0;
  opacity: 1;
  color: #1e293b;
  font-weight: 500;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.stat-item {
  text-align: center;
  transition: transform 0.3s ease;
}

.stat-item:hover {
  transform: scale(1.05);
}

.stat-number {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  color: #3b82f6;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

/* 筛选区域 */
.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 10px;
  margin-top: 0.25rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  min-height: auto;
}

.search-section {
  flex: 1;
  max-width: 400px;
}

.search-box {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  padding-right: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: #2c3e50;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  outline: none;
}

.search-input::placeholder {
  color: #64748b;
}

.search-input:focus {
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.view-controls {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: #2c3e50;
}

.btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.extra-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-extra {
  margin-top: 1rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 1.5rem 1rem;
    margin: 0 -1rem 2rem -1rem;
    border-radius: 0;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .hero-stats {
    gap: 1.5rem;
  }

  .filters {
    flex-direction: column;
    gap: 1rem;
  }

  .search-section {
    max-width: none;
  }

  .toolbar {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .hero-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }
}
</style>
