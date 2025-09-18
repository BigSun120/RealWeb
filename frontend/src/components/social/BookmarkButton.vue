<template>
  <el-button
    :type="bookmarked ? 'warning' : 'default'"
    :loading="loading"
    :disabled="disabled"
    :size="size"
    :plain="!bookmarked"
    @click="handleToggleBookmark"
    class="bookmark-button"
  >
    <el-icon class="bookmark-icon">
      <StarFilled v-if="bookmarked" />
      <Star v-else />
    </el-icon>
    <span v-if="showText" class="bookmark-text">
      {{ bookmarked ? '已收藏' : '收藏' }}
    </span>
    <span v-if="showCount && bookmarkCount > 0" class="bookmark-count">
      {{ formatCount(bookmarkCount) }}
    </span>
  </el-button>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Star, StarFilled } from '@element-plus/icons-vue';
import { toggleBookmark, getContentBookmarkStats } from '@/api/bookmarks';
import { useUserStore } from '@/stores/user';

// Props
const props = defineProps({
  // 目标类型
  targetType: {
    type: String,
    required: true,
    validator: (value) => ['article', 'comment'].includes(value)
  },
  // 目标ID
  targetId: {
    type: String,
    required: true
  },
  // 初始收藏状态
  initialBookmarked: {
    type: Boolean,
    default: false
  },
  // 初始收藏数量
  initialBookmarkCount: {
    type: Number,
    default: 0
  },
  // 按钮尺寸
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['large', 'default', 'small'].includes(value)
  },
  // 是否显示文字
  showText: {
    type: Boolean,
    default: true
  },
  // 是否显示收藏数量
  showCount: {
    type: Boolean,
    default: true
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['bookmark-changed']);

// Store
const userStore = useUserStore();

// 响应式数据
const loading = ref(false);
const bookmarked = ref(props.initialBookmarked);
const bookmarkCount = ref(props.initialBookmarkCount);

// 计算属性
const isLoggedIn = computed(() => userStore.isLoggedIn);

// 监听初始状态变化
watch(() => props.initialBookmarked, (newValue) => {
  bookmarked.value = newValue;
}, { immediate: true });

watch(() => props.initialBookmarkCount, (newValue) => {
  bookmarkCount.value = newValue;
}, { immediate: true });

// 格式化数量显示
const formatCount = (count) => {
  if (count < 1000) return count.toString();
  if (count < 10000) return (count / 1000).toFixed(1) + 'k';
  return (count / 10000).toFixed(1) + 'w';
};

// 处理收藏切换
const handleToggleBookmark = async () => {
  // 检查登录状态
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录');
    return;
  }

  // 防止重复点击
  if (loading.value) return;

  loading.value = true;
  const originalBookmarked = bookmarked.value;
  const originalCount = bookmarkCount.value;

  try {
    // 乐观更新UI
    bookmarked.value = !bookmarked.value;
    bookmarkCount.value += bookmarked.value ? 1 : -1;

    // 调用API
    const response = await toggleBookmark({
      targetType: props.targetType,
      targetId: props.targetId
    });

    // 更新实际状态
    bookmarked.value = response.data.data.bookmarked;
    bookmarkCount.value = response.data.data.bookmarkCount;

    // 触发事件
    emit('bookmark-changed', {
      bookmarked: bookmarked.value,
      bookmarkCount: bookmarkCount.value,
      targetType: props.targetType,
      targetId: props.targetId
    });

    // 显示成功消息
    ElMessage.success(response.data.message);
  } catch (error) {
    // 回滚UI状态
    bookmarked.value = originalBookmarked;
    bookmarkCount.value = originalCount;

    console.error('收藏操作失败:', error);
    ElMessage.error(error.response?.data?.message || '收藏操作失败');
  } finally {
    loading.value = false;
  }
};

// 刷新收藏统计
const refreshBookmarkStats = async () => {
  try {
    const response = await getContentBookmarkStats(props.targetType, props.targetId);
    bookmarkCount.value = response.data.data.count;
  } catch (error) {
    console.error('获取收藏统计失败:', error);
  }
};

// 暴露方法给父组件
defineExpose({
  refreshBookmarkStats,
  bookmarked: computed(() => bookmarked.value),
  bookmarkCount: computed(() => bookmarkCount.value)
});
</script>

<style scoped>
.bookmark-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

.bookmark-button:hover {
  transform: translateY(-1px);
}

.bookmark-icon {
  font-size: 16px;
}

.bookmark-text {
  font-size: 14px;
  font-weight: 500;
}

.bookmark-count {
  font-size: 12px;
  opacity: 0.8;
  margin-left: 2px;
}

.bookmark-button.el-button--default {
  border-color: #dcdfe6;
  color: #606266;
}

.bookmark-button.el-button--default:hover {
  border-color: #f39c12;
  color: #f39c12;
}

.bookmark-button.el-button--warning {
  background-color: #f39c12;
  border-color: #f39c12;
  color: #fff;
}

.bookmark-button.el-button--warning:hover {
  background-color: #e67e22;
  border-color: #e67e22;
}

/* 小尺寸样式 */
.bookmark-button.el-button--small .bookmark-icon {
  font-size: 14px;
}

.bookmark-button.el-button--small .bookmark-text {
  font-size: 12px;
}

.bookmark-button.el-button--small .bookmark-count {
  font-size: 11px;
}

/* 大尺寸样式 */
.bookmark-button.el-button--large .bookmark-icon {
  font-size: 18px;
}

.bookmark-button.el-button--large .bookmark-text {
  font-size: 16px;
}

.bookmark-button.el-button--large .bookmark-count {
  font-size: 14px;
}
</style>
