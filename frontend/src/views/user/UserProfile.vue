<template>
  <div class="user-profile">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>
    
    <!-- 用户不存在 -->
    <div v-else-if="!user" class="not-found">
      <el-empty description="用户不存在">
        <el-button type="primary" @click="$router.push('/')">
          返回首页
        </el-button>
      </el-empty>
    </div>
    
    <!-- 用户资料 -->
    <div v-else class="profile-content">
      <!-- 用户头部信息 -->
      <div class="profile-header">
        <div class="header-content">
          <!-- 用户头像 -->
          <div class="user-avatar">
            <el-avatar
              :size="100"
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
              <h1 class="display-name">{{ displayName }}</h1>
              <span class="username">@{{ user.username }}</span>
            </div>
            
            <p v-if="user.bio" class="user-bio">
              {{ user.bio }}
            </p>
            
            <!-- 用户统计 -->
            <div class="user-stats">
              <div class="stat-item clickable" @click="goToFollowList('followers')">
                <strong>{{ user.followersCount || 0 }}</strong>
                <span class="stat-label">粉丝</span>
              </div>
              <div class="stat-item clickable" @click="goToFollowList('following')">
                <strong>{{ user.followingCount || 0 }}</strong>
                <span class="stat-label">关注</span>
              </div>
              <div class="stat-item">
                <strong>{{ user.articleCount || 0 }}</strong>
                <span class="stat-label">文章</span>
              </div>
            </div>
            
            <!-- 加入时间 -->
            <div class="user-meta">
              <span class="join-date">
                <el-icon><Calendar /></el-icon>
                加入时间：{{ formatDate(user.createdAt) }}
              </span>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="user-actions">
            <FollowButton
              :user-id="user._id"
              :user="user"
              source="profile"
              size="large"
              @follow-change="handleFollowChange"
            />
            
            <!-- 更多操作 -->
            <el-dropdown trigger="click" @command="handleCommand">
              <el-button size="large">
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="message">发私信</el-dropdown-item>
                  <el-dropdown-item command="share">分享用户</el-dropdown-item>
                  <el-dropdown-item command="report" divided>举报用户</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
      
      <!-- 标签页内容 -->
      <div class="profile-tabs">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <!-- 文章列表 -->
          <el-tab-pane label="文章" name="articles">
            <div class="articles-section">
              <div v-if="articlesLoading" class="loading">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="articles.length === 0" class="empty">
                <el-empty description="暂无文章" />
              </div>
              <div v-else class="articles-list">
                <div
                  v-for="article in articles"
                  :key="article._id"
                  class="article-item"
                  @click="$router.push(`/blog/${article._id}`)"
                >
                  <h3 class="article-title">{{ article.title }}</h3>
                  <p class="article-excerpt">{{ article.excerpt }}</p>
                  <div class="article-meta">
                    <span class="publish-date">{{ formatDate(article.publishedAt) }}</span>
                    <span class="view-count">{{ article.viewCount || 0 }} 次阅读</span>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 关注列表 -->
          <el-tab-pane label="关注" name="following">
            <div class="following-section">
              <div v-if="followingLoading" class="loading">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="following.length === 0" class="empty">
                <el-empty description="暂无关注" />
              </div>
              <div v-else class="users-list">
                <UserCard
                  v-for="followUser in following"
                  :key="followUser._id"
                  :user="followUser"
                  :compact="true"
                  :follow-source="'profile'"
                  @follow-change="handleFollowChange"
                  @action="handleUserAction"
                />
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 粉丝列表 -->
          <el-tab-pane label="粉丝" name="followers">
            <div class="followers-section">
              <div v-if="followersLoading" class="loading">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="followers.length === 0" class="empty">
                <el-empty description="暂无粉丝" />
              </div>
              <div v-else class="users-list">
                <UserCard
                  v-for="follower in followers"
                  :key="follower._id"
                  :user="follower"
                  :compact="true"
                  :follow-source="'profile'"
                  @follow-change="handleFollowChange"
                  @action="handleUserAction"
                />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Calendar, ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import FollowButton from '@/components/social/FollowButton.vue';
import UserCard from '@/components/social/UserCard.vue';
import api from '@/api';
import { getUserFollowing, getUserFollowers } from '@/api/users';

export default {
  name: 'UserProfile',
  components: {
    FollowButton,
    UserCard,
    Calendar,
    ArrowDown
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    
    // 状态
    const loading = ref(true);
    const user = ref(null);
    const activeTab = ref('articles');
    
    // 文章相关
    const articles = ref([]);
    const articlesLoading = ref(false);
    
    // 关注相关
    const following = ref([]);
    const followingLoading = ref(false);
    const followers = ref([]);
    const followersLoading = ref(false);
    
    // 计算属性
    const displayName = computed(() => {
      return user.value?.displayName || user.value?.username || '未知用户';
    });
    
    const avatarUrl = computed(() => {
      if (!user.value?.avatar) return '';
      
      if (user.value.avatar.startsWith('http')) {
        return user.value.avatar;
      }
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      return `${baseUrl}${user.value.avatar}`;
    });
    
    // 格式化日期
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('zh-CN');
    };
    
    // 处理头像错误
    const handleAvatarError = () => {
      console.log('头像加载失败');
    };
    
    // 获取用户信息
    const fetchUser = async (userId) => {
      loading.value = true;
      try {
        const response = await api.get(`/users/${userId}/profile`);
        user.value = response.data.data;
      } catch (error) {
        console.error('获取用户信息失败:', error);
        user.value = null;
      } finally {
        loading.value = false;
      }
    };
    
    // 获取用户文章
    const fetchArticles = async (userId) => {
      articlesLoading.value = true;
      try {
        const response = await api.get('/articles', {
          params: { author: userId, limit: 10 }
        });
        articles.value = response.data.data || [];
      } catch (error) {
        console.error('获取用户文章失败:', error);
        articles.value = [];
      } finally {
        articlesLoading.value = false;
      }
    };
    
    // 获取关注列表
    const fetchFollowing = async (userId) => {
      followingLoading.value = true;
      try {
        const response = await getUserFollowing(userId, { limit: 20 });
        following.value = response.data.data.following || [];
      } catch (error) {
        console.error('获取关注列表失败:', error);
        following.value = [];
      } finally {
        followingLoading.value = false;
      }
    };
    
    // 获取粉丝列表
    const fetchFollowers = async (userId) => {
      followersLoading.value = true;
      try {
        const response = await getUserFollowers(userId, { limit: 20 });
        followers.value = response.data.data.followers || [];
      } catch (error) {
        console.error('获取粉丝列表失败:', error);
        followers.value = [];
      } finally {
        followersLoading.value = false;
      }
    };
    
    // 处理标签页切换
    const handleTabChange = (tabName) => {
      const userId = route.params.id;
      
      switch (tabName) {
        case 'articles':
          if (articles.value.length === 0) {
            fetchArticles(userId);
          }
          break;
        case 'following':
          if (following.value.length === 0) {
            fetchFollowing(userId);
          }
          break;
        case 'followers':
          if (followers.value.length === 0) {
            fetchFollowers(userId);
          }
          break;
      }
    };
    
    // 处理关注状态变化
    const handleFollowChange = (data) => {
      // 更新用户的粉丝数
      if (user.value && user.value._id === data.userId) {
        if (data.action === 'followed') {
          user.value.followersCount = (user.value.followersCount || 0) + 1;
        } else if (data.action === 'unfollowed') {
          user.value.followersCount = Math.max((user.value.followersCount || 0) - 1, 0);
        }
      }
    };
    
    // 处理更多操作
    const handleCommand = (command) => {
      switch (command) {
        case 'message':
          ElMessage.info('私信功能开发中...');
          break;
        case 'share':
          ElMessage.info('分享功能开发中...');
          break;
        case 'report':
          ElMessage.info('举报功能开发中...');
          break;
      }
    };
    
    // 处理用户卡片操作
    const handleUserAction = (data) => {
      switch (data.type) {
        case 'view-profile':
          router.push(`/user/${data.user._id}`);
          break;
        case 'view-articles':
          router.push(`/blog?author=${data.user.username}`);
          break;
        case 'send-message':
          ElMessage.info('私信功能开发中...');
          break;
      }
    };
    
    // 监听路由变化
    watch(() => route.params.id, (newId) => {
      if (newId) {
        fetchUser(newId);
        // 重置数据
        articles.value = [];
        following.value = [];
        followers.value = [];
        activeTab.value = 'articles';
      }
    });
    
    // 跳转到关注列表页面
    const goToFollowList = (tab = 'following') => {
      router.push(`/user/${route.params.id}/follow?tab=${tab}`);
    };

    // 组件挂载
    onMounted(() => {
      const userId = route.params.id;
      if (userId) {
        fetchUser(userId);
      }
    });
    
    return {
      loading,
      user,
      activeTab,
      articles,
      articlesLoading,
      following,
      followingLoading,
      followers,
      followersLoading,
      displayName,
      avatarUrl,
      formatDate,
      handleAvatarError,
      handleTabChange,
      handleFollowChange,
      handleCommand,
      handleUserAction,
      goToFollowList
    };
  }
};
</script>

<style scoped>
.user-profile {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.loading-container,
.not-found {
  padding: 40px 20px;
  text-align: center;
}

.profile-header {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin-bottom: 12px;
}

.display-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #303133;
}

.username {
  font-size: 16px;
  color: #909399;
}

.user-bio {
  font-size: 16px;
  color: #606266;
  line-height: 1.6;
  margin: 12px 0 16px 0;
}

.user-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-item.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px;
  border-radius: 6px;
}

.stat-item.clickable:hover {
  background-color: #f5f7fa;
  transform: translateY(-1px);
}

.stat-item strong {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.user-meta {
  color: #909399;
  font-size: 14px;
}

.join-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.profile-tabs {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.articles-list,
.users-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.article-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
}

.article-excerpt {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  margin: 0 0 12px 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.loading,
.empty {
  padding: 40px 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-profile {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .user-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .user-stats {
    justify-content: center;
    gap: 16px;
  }
  
  .display-name {
    font-size: 24px;
  }
}
</style>
