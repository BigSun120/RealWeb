<template>
  <el-button
    type="default"
    :loading="loading"
    :disabled="disabled"
    :size="size"
    plain
    @click="handleToggleLike"
    class="article-like-button"
    :class="{ 'is-liked': liked }"
  >
    <span class="like-icon">👍</span>
    <span v-if="showText" class="like-text">
      {{ liked ? '已点赞' : '点赞' }}
    </span>
    <span v-if="showCount && likeCount > 0" class="like-count">
      {{ formatCount(likeCount) }}
    </span>
  </el-button>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
// 使用emoji图标，不需要导入
import { useUserStore } from '@/stores/user';
import { toggleArticleLike, getArticleLikeStats } from '@/api/articles';

export default {
  name: 'ArticleLikeButton',
  components: {
    // 使用emoji，不需要注册组件
  },
  props: {
    // 文章ID
    articleId: {
      type: String,
      required: true
    },
    // 初始点赞状态
    initialLiked: {
      type: Boolean,
      default: false
    },
    // 初始点赞数量
    initialLikeCount: {
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
    // 是否显示数量
    showCount: {
      type: Boolean,
      default: true
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['like-changed'],
  setup(props, { emit }) {
    // Store
    const userStore = useUserStore();

    // 响应式数据
    const loading = ref(false);
    const liked = ref(props.initialLiked);
    const likeCount = ref(props.initialLikeCount);

    // 计算属性
    const isLoggedIn = computed(() => userStore.isLoggedIn);

    // 监听初始状态变化
    watch(() => props.initialLiked, (newValue) => {
      liked.value = newValue;
    });

    watch(() => props.initialLikeCount, (newValue) => {
      likeCount.value = newValue;
    });

    // 格式化数量显示
    const formatCount = (count) => {
      if (count < 1000) return count.toString();
      if (count < 10000) return (count / 1000).toFixed(1) + 'k';
      return (count / 10000).toFixed(1) + 'w';
    };

    // 处理点赞切换
    const handleToggleLike = async () => {
      // 检查登录状态
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        return;
      }

      // 防止重复点击
      if (loading.value) return;

      loading.value = true;
      const originalLiked = liked.value;
      const originalCount = likeCount.value;

      try {
        // 乐观更新UI
        liked.value = !liked.value;
        likeCount.value += liked.value ? 1 : -1;

        // 调用API
        const response = await toggleArticleLike(props.articleId);

        // 更新实际状态
        liked.value = response.data.data.isLiked;
        likeCount.value = response.data.data.likeCount;

        // 触发事件
        emit('like-changed', {
          liked: liked.value,
          likeCount: likeCount.value,
          action: response.data.data.action,
          articleId: props.articleId
        });

        // 显示成功消息
        ElMessage.success(response.data.message);
      } catch (error) {
        // 回滚UI状态
        liked.value = originalLiked;
        likeCount.value = originalCount;

        console.error('点赞操作失败:', error);
        ElMessage.error(error.response?.data?.message || '点赞操作失败');
      } finally {
        loading.value = false;
      }
    };

    // 刷新点赞统计
    const refreshLikeStats = async () => {
      try {
        const response = await getArticleLikeStats(props.articleId);
        likeCount.value = response.data.data.count;
      } catch (error) {
        console.error('获取点赞统计失败:', error);
      }
    };

    // 暴露方法给父组件（在return中返回即可）

    return {
      loading,
      liked,
      likeCount,
      isLoggedIn,
      formatCount,
      handleToggleLike,
      refreshLikeStats
    };
  }
};
</script>

<style scoped>
.article-like-button {
  transition: all 0.3s ease;
}

.article-like-button.is-liked {
  color: #409eff;
  border-color: #409eff;
}

.article-like-button.is-liked:hover {
  background-color: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
}

.like-icon {
  margin-right: 4px;
}

.like-text {
  margin-right: 4px;
}

.like-count {
  font-weight: 500;
}

/* 点赞动画效果 */
.article-like-button.is-liked .like-icon {
  animation: heartBeat 0.6s ease-in-out;
}

@keyframes heartBeat {
  0% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.3);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.3);
  }
  70% {
    transform: scale(1);
  }
}

/* 不同尺寸的样式 */
.article-like-button.el-button--small .like-icon {
  font-size: 14px;
}

.article-like-button.el-button--large .like-icon {
  font-size: 18px;
}
</style>
