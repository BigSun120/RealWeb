<template>
  <div class="user-card" :class="{ 'is-compact': compact }">
    <!-- 用户头像 -->
    <div class="user-avatar">
      <el-avatar
        :size="compact ? 40 : 60"
        :src="avatarUrl"
        :alt="displayName"
        @error="handleAvatarError"
      >
        {{ displayName.charAt(0) }}
      </el-avatar>
    </div>
    
    <!-- 用户信息 -->
    <div class="user-info">
      <div class="user-name">
        <h3 class="display-name">{{ displayName }}</h3>
        <span class="username">@{{ user.username }}</span>
      </div>
      
      <p v-if="user.bio && !compact" class="user-bio">
        {{ user.bio }}
      </p>
      
      <!-- 用户统计 -->
      <div v-if="showStats" class="user-stats">
        <span class="stat-item">
          <strong>{{ user.followersCount || 0 }}</strong>
          <span class="stat-label">粉丝</span>
        </span>
        <span class="stat-item">
          <strong>{{ user.followingCount || 0 }}</strong>
          <span class="stat-label">关注</span>
        </span>
        <span v-if="user.articleCount !== undefined" class="stat-item">
          <strong>{{ user.articleCount || 0 }}</strong>
          <span class="stat-label">文章</span>
        </span>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="user-actions">
      <FollowButton
        :user-id="user._id"
        :user="user"
        :source="followSource"
        :size="compact ? 'small' : 'default'"
        @follow-change="handleFollowChange"
      />
      
      <!-- 更多操作 -->
      <el-dropdown v-if="showMoreActions" trigger="click" @command="handleCommand">
        <el-button size="small" type="text" class="more-actions">
          <el-icon><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">查看资料</el-dropdown-item>
            <el-dropdown-item command="articles">查看文章</el-dropdown-item>
            <el-dropdown-item v-if="canMessage" command="message">发私信</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { MoreFilled } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import FollowButton from './FollowButton.vue';
import { getFullAvatarUrl } from '@/utils/avatar';

export default {
  name: 'UserCard',
  components: {
    FollowButton,
    MoreFilled
  },
  props: {
    // 用户信息
    user: {
      type: Object,
      required: true
    },
    // 紧凑模式
    compact: {
      type: Boolean,
      default: false
    },
    // 显示统计信息
    showStats: {
      type: Boolean,
      default: true
    },
    // 显示更多操作
    showMoreActions: {
      type: Boolean,
      default: true
    },
    // 关注来源
    followSource: {
      type: String,
      default: 'profile'
    },
    // 是否可以发私信
    canMessage: {
      type: Boolean,
      default: false
    }
  },
  emits: ['follow-change', 'action'],
  setup(props, { emit }) {
    const userStore = useUserStore();
    
    // 计算属性
    const displayName = computed(() => {
      return props.user.displayName || props.user.username || '未知用户';
    });
    
    const avatarUrl = computed(() => {
      return getFullAvatarUrl(props.user.avatar);
    });
    
    // 处理头像加载错误
    const handleAvatarError = (e) => {
      console.log('头像加载失败:', e);
      // Element Plus的Avatar组件会自动显示fallback内容
    };
    
    // 处理关注状态变化
    const handleFollowChange = (data) => {
      emit('follow-change', data);
    };
    
    // 处理更多操作
    const handleCommand = (command) => {
      switch (command) {
        case 'profile':
          // 跳转到用户资料页面
          emit('action', { type: 'view-profile', user: props.user });
          break;
        case 'articles':
          // 跳转到用户文章列表
          emit('action', { type: 'view-articles', user: props.user });
          break;
        case 'message':
          // 发私信
          emit('action', { type: 'send-message', user: props.user });
          break;
      }
    };
    
    return {
      displayName,
      avatarUrl,
      handleAvatarError,
      handleFollowChange,
      handleCommand
    };
  }
};
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.user-card:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-card.is-compact {
  padding: 12px;
  gap: 8px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin-bottom: 4px;
}

.display-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 2px 0;
  color: #303133;
}

.is-compact .display-name {
  font-size: 14px;
}

.username {
  font-size: 12px;
  color: #909399;
}

.user-bio {
  font-size: 14px;
  color: #606266;
  margin: 8px 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.user-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
}

.stat-item strong {
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.stat-label {
  color: #909399;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.more-actions {
  padding: 4px;
  color: #909399;
}

.more-actions:hover {
  color: #409eff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-card {
    padding: 12px;
  }
  
  .user-stats {
    gap: 12px;
  }
  
  .stat-item {
    font-size: 11px;
  }
  
  .stat-item strong {
    font-size: 13px;
  }
}
</style>
