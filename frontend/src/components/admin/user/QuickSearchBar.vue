<template>
  <div class="quick-search-bar">
    <div class="search-input-wrapper">
      <el-input
        v-model="searchKeyword"
        placeholder="快速搜索用户..."
        clearable
        @input="handleSearch"
        @keyup.enter="handleEnterSearch"
        @clear="handleClear"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
        <template #suffix>
          <el-button 
            v-if="searchKeyword"
            text 
            size="small"
            @click="handleAdvancedSearch"
          >
            高级
          </el-button>
        </template>
      </el-input>
    </div>

    <!-- 搜索建议 -->
    <div v-if="showSuggestions && suggestions.length > 0" class="search-suggestions">
      <div class="suggestions-header">
        <span>搜索建议</span>
        <el-button text size="small" @click="closeSuggestions">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="suggestions-list">
        <div
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          class="suggestion-item"
          @click="selectSuggestion(suggestion)"
        >
          <el-avatar :src="suggestion.avatar" :size="24">
            {{ suggestion.username && suggestion.username.charAt(0) || 'U' }}
          </el-avatar>
          <div class="suggestion-info">
            <div class="suggestion-name">{{ suggestion.username }}</div>
            <div class="suggestion-email">{{ suggestion.email }}</div>
          </div>
          <el-tag 
            :type="suggestion.isAdmin ? 'danger' : 'primary'" 
            size="small"
          >
            {{ suggestion.isAdmin ? '管理员' : '用户' }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 快速筛选标签 -->
    <div class="quick-filters">
      <el-tag
        v-for="filter in quickFilters"
        :key="filter.key"
        :type="filter.active ? 'primary' : ''"
        :effect="filter.active ? 'dark' : 'plain'"
        class="filter-tag"
        @click="toggleFilter(filter)"
      >
        {{ filter.label }}
        <span v-if="filter.count !== undefined" class="filter-count">
          ({{ filter.count }})
        </span>
      </el-tag>
    </div>

    <!-- 最近搜索 -->
    <div v-if="recentSearches.length > 0" class="recent-searches">
      <div class="recent-header">
        <span>最近搜索</span>
        <el-button text size="small" @click="clearRecentSearches">
          清空
        </el-button>
      </div>
      <div class="recent-list">
        <el-tag
          v-for="search in recentSearches"
          :key="search.id"
          class="recent-tag"
          closable
          @click="applyRecentSearch(search)"
          @close="removeRecentSearch(search.id)"
        >
          {{ search.keyword }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import { Search, Close } from '@element-plus/icons-vue';
import { debounce } from 'lodash-es';

export default {
  name: 'QuickSearchBar',
  components: {
    Search,
    Close
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    filters: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue', 'search', 'filter-change', 'advanced-search'],
  setup(props, { emit }) {
    const searchKeyword = ref('');
    const showSuggestions = ref(false);
    const suggestions = ref([]);
    const recentSearches = ref([]);

    // 快速筛选选项
    const quickFilters = ref([
      { key: 'all', label: '全部', active: true, count: 0 },
      { key: 'admin', label: '管理员', active: false, count: 0 },
      { key: 'user', label: '普通用户', active: false, count: 0 },
      { key: 'active', label: '正常状态', active: false, count: 0 },
      { key: 'inactive', label: '禁用状态', active: false, count: 0 },
      { key: 'recent', label: '最近注册', active: false, count: 0 }
    ]);

    // 监听外部值变化
    watch(() => props.modelValue, (newVal) => {
      searchKeyword.value = newVal;
    });

    // 防抖搜索
    const debouncedSearch = debounce((keyword) => {
      if (keyword.length >= 2) {
        fetchSuggestions(keyword);
        showSuggestions.value = true;
      } else {
        showSuggestions.value = false;
      }
    }, 300);

    // 搜索处理
    const handleSearch = (value) => {
      emit('update:modelValue', value);
      debouncedSearch(value);
    };

    // 回车搜索
    const handleEnterSearch = () => {
      if (searchKeyword.value.trim()) {
        addToRecentSearches(searchKeyword.value);
        emit('search', searchKeyword.value);
        showSuggestions.value = false;
      }
    };

    // 清空搜索
    const handleClear = () => {
      emit('update:modelValue', '');
      emit('search', '');
      showSuggestions.value = false;
    };

    // 高级搜索
    const handleAdvancedSearch = () => {
      emit('advanced-search');
    };

    // 获取搜索建议
    const fetchSuggestions = async (keyword) => {
      try {
        // 这里应该调用API获取搜索建议
        // 暂时使用模拟数据
        suggestions.value = [
          {
            id: 1,
            username: 'admin666',
            email: 'admin@example.com',
            avatar: '',
            isAdmin: true
          },
          {
            id: 2,
            username: 'user001',
            email: 'user001@example.com',
            avatar: '',
            isAdmin: false
          }
        ].filter(user => 
          user.username.toLowerCase().includes(keyword.toLowerCase()) ||
          user.email.toLowerCase().includes(keyword.toLowerCase())
        );
      } catch (error) {
        console.error('获取搜索建议失败:', error);
      }
    };

    // 选择搜索建议
    const selectSuggestion = (suggestion) => {
      searchKeyword.value = suggestion.username;
      emit('update:modelValue', suggestion.username);
      emit('search', suggestion.username);
      addToRecentSearches(suggestion.username);
      showSuggestions.value = false;
    };

    // 关闭建议
    const closeSuggestions = () => {
      showSuggestions.value = false;
    };

    // 切换筛选器
    const toggleFilter = (filter) => {
      // 如果点击的是"全部"，取消其他所有筛选
      if (filter.key === 'all') {
        quickFilters.value.forEach(f => {
          f.active = f.key === 'all';
        });
      } else {
        // 取消"全部"选择
        const allFilter = quickFilters.value.find(f => f.key === 'all');
        if (allFilter) allFilter.active = false;
        
        // 切换当前筛选器
        filter.active = !filter.active;
        
        // 如果没有任何筛选器被选中，自动选中"全部"
        const hasActiveFilter = quickFilters.value.some(f => f.active && f.key !== 'all');
        if (!hasActiveFilter && allFilter) {
          allFilter.active = true;
        }
      }

      // 构建筛选条件
      const activeFilters = quickFilters.value
        .filter(f => f.active && f.key !== 'all')
        .map(f => f.key);

      emit('filter-change', activeFilters);
    };

    // 添加到最近搜索
    const addToRecentSearches = (keyword) => {
      if (!keyword.trim()) return;

      // 移除重复项
      recentSearches.value = recentSearches.value.filter(
        search => search.keyword !== keyword
      );

      // 添加到开头
      recentSearches.value.unshift({
        id: Date.now(),
        keyword,
        timestamp: new Date()
      });

      // 限制数量
      if (recentSearches.value.length > 5) {
        recentSearches.value = recentSearches.value.slice(0, 5);
      }

      // 保存到本地存储
      localStorage.setItem('userRecentSearches', JSON.stringify(recentSearches.value));
    };

    // 应用最近搜索
    const applyRecentSearch = (search) => {
      searchKeyword.value = search.keyword;
      emit('update:modelValue', search.keyword);
      emit('search', search.keyword);
    };

    // 移除最近搜索
    const removeRecentSearch = (searchId) => {
      recentSearches.value = recentSearches.value.filter(
        search => search.id !== searchId
      );
      localStorage.setItem('userRecentSearches', JSON.stringify(recentSearches.value));
    };

    // 清空最近搜索
    const clearRecentSearches = () => {
      recentSearches.value = [];
      localStorage.removeItem('userRecentSearches');
    };

    // 加载最近搜索
    const loadRecentSearches = () => {
      try {
        const saved = localStorage.getItem('userRecentSearches');
        if (saved) {
          recentSearches.value = JSON.parse(saved);
        }
      } catch (error) {
        console.error('加载最近搜索失败:', error);
      }
    };

    onMounted(() => {
      loadRecentSearches();
    });

    return {
      searchKeyword,
      showSuggestions,
      suggestions,
      quickFilters,
      recentSearches,
      handleSearch,
      handleEnterSearch,
      handleClear,
      handleAdvancedSearch,
      selectSuggestion,
      closeSuggestions,
      toggleFilter,
      applyRecentSearch,
      removeRecentSearch,
      clearRecentSearches
    };
  }
};
</script>

<style scoped>
.quick-search-bar {
  position: relative;
}

.search-input-wrapper {
  margin-bottom: 16px;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  color: #909399;
}

.suggestions-list {
  padding: 4px 0;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f7fa;
}

.suggestion-info {
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.suggestion-email {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.quick-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag:hover {
  transform: translateY(-1px);
}

.filter-count {
  margin-left: 4px;
  opacity: 0.7;
}

.recent-searches {
  margin-top: 16px;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.recent-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.recent-tag:hover {
  transform: translateY(-1px);
}
</style>
