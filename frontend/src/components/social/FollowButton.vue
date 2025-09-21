<template>
  <el-button
    :type="isFollowing ? 'default' : 'primary'"
    :size="size"
    :loading="loading"
    :disabled="disabled || isSelf"
    @click="handleFollow"
    class="follow-button"
    :class="{
      'is-following': isFollowing,
      'is-self': isSelf
    }"
  >
    <template v-if="!loading">
      <el-icon v-if="!isFollowing"><Plus /></el-icon>
      <el-icon v-else><Check /></el-icon>
    </template>
    
    <span class="button-text">
      {{ buttonText }}
    </span>
  </el-button>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Check } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { toggleFollow, getFollowStatus } from '@/api/users';

export default {
  name: 'FollowButton',
  components: {
    Plus,
    Check
  },
  props: {
    // 目标用户ID
    userId: {
      type: String,
      required: true
    },
    // 目标用户信息（可选，用于显示优化）
    user: {
      type: Object,
      default: () => ({})
    },
    // 按钮大小
    size: {
      type: String,
      default: 'default',
      validator: (value) => ['large', 'default', 'small'].includes(value)
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    // 关注来源（用于统计）
    source: {
      type: String,
      default: 'profile',
      validator: (value) => ['profile', 'article', 'comment', 'recommendation'].includes(value)
    },
    // 初始关注状态（可选，避免重复请求）
    initialFollowStatus: {
      type: Boolean,
      default: null
    }
  },
  emits: ['follow-change'],
  setup(props, { emit }) {
    const userStore = useUserStore();
    
    // 状态
    const loading = ref(false);
    const isFollowing = ref(props.initialFollowStatus);
    const statusLoaded = ref(props.initialFollowStatus !== null);
    
    // 计算属性
    const isSelf = computed(() => {
      return userStore.user && userStore.user._id === props.userId;
    });
    
    const buttonText = computed(() => {
      if (isSelf.value) {
        return '自己';
      }
      if (loading.value) {
        return isFollowing.value ? '取消中...' : '关注中...';
      }
      return isFollowing.value ? '已关注' : '关注';
    });
    
    // 检查登录状态
    const checkLoginStatus = () => {
      if (!userStore.isLoggedIn) {
        ElMessage.warning('请先登录');
        return false;
      }
      return true;
    };
    
    // 获取关注状态
    const fetchFollowStatus = async () => {
      if (!userStore.isLoggedIn || isSelf.value || statusLoaded.value) {
        return;
      }
      
      try {
        const response = await getFollowStatus(props.userId);
        isFollowing.value = response.data.data.isFollowing;
        statusLoaded.value = true;
      } catch (error) {
        console.error('获取关注状态失败:', error);
        // 静默失败，不影响用户体验
      }
    };
    
    // 处理关注/取消关注
    const handleFollow = async () => {
      if (!checkLoginStatus()) {
        return;
      }
      
      if (isSelf.value) {
        ElMessage.warning('不能关注自己');
        return;
      }
      
      loading.value = true;
      
      try {
        const response = await toggleFollow(props.userId, props.source);
        const { action, isFollowing: newStatus } = response.data.data;
        
        // 更新状态
        isFollowing.value = newStatus;
        
        // 显示成功消息
        const message = action === 'followed' ? '关注成功' : '已取消关注';
        ElMessage.success(message);
        
        // 发出事件
        emit('follow-change', {
          userId: props.userId,
          action,
          isFollowing: newStatus,
          user: props.user
        });
        
      } catch (error) {
        console.error('关注操作失败:', error);
        const message = error.response?.data?.message || '操作失败，请重试';
        ElMessage.error(message);
      } finally {
        loading.value = false;
      }
    };
    
    // 监听用户ID变化
    watch(() => props.userId, () => {
      statusLoaded.value = props.initialFollowStatus !== null;
      isFollowing.value = props.initialFollowStatus;
      if (userStore.isLoggedIn && !isSelf.value) {
        fetchFollowStatus();
      }
    });
    
    // 监听登录状态变化
    watch(() => userStore.isLoggedIn, (newVal) => {
      if (newVal && !isSelf.value && !statusLoaded.value) {
        fetchFollowStatus();
      }
    });
    
    // 组件挂载时获取关注状态
    onMounted(() => {
      if (userStore.isLoggedIn && !isSelf.value && !statusLoaded.value) {
        fetchFollowStatus();
      }
    });
    
    return {
      loading,
      isFollowing,
      isSelf,
      buttonText,
      handleFollow
    };
  }
};
</script>

<style scoped>
.follow-button {
  transition: all 0.3s ease;
  min-width: 80px;
}

.follow-button.is-following {
  border-color: #67c23a;
  color: #67c23a;
}

.follow-button.is-following:hover {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: white;
}

.follow-button.is-following:hover .button-text::after {
  content: '取消关注';
  position: absolute;
  left: 0;
  right: 0;
}

.follow-button.is-following:hover .button-text {
  opacity: 0;
}

.follow-button.is-self {
  cursor: not-allowed;
  opacity: 0.6;
}

.button-text {
  position: relative;
  transition: opacity 0.2s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .follow-button {
    min-width: 70px;
    font-size: 12px;
  }
}
</style>
