<template>
  <div class="follow-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="back-button">
          <el-button @click="$router.back()" type="text" size="large">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
        </div>
        
        <div class="page-title">
          <h1>{{ pageTitle }}</h1>
          <p class="subtitle">{{ subtitle }}</p>
        </div>
      </div>
    </div>
    
    <!-- 标签页 -->
    <div class="tabs-container">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="关注" name="following">
          <div class="tab-content">
            <!-- 搜索框 -->
            <div class="search-section">
              <el-input
                v-model="searchQuery"
                placeholder="搜索关注的用户..."
                clearable
                @input="handleSearch"
                class="search-input"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            
            <!-- 关注列表 -->
            <div class="users-section">
              <div v-if="followingLoading" class="loading">
                <el-skeleton :rows="5" animated />
              </div>
              <div v-else-if="filteredFollowing.length === 0" class="empty">
                <el-empty :description="searchQuery ? '没有找到匹配的用户' : '暂无关注'" />
              </div>
              <div v-else class="users-list">
                <UserCard
                  v-for="user in filteredFollowing"
                  :key="user._id"
                  :user="user"
                  :compact="false"
                  :follow-source="'follow-list'"
                  @follow-change="handleFollowChange"
                  @action="handleUserAction"
                />
              </div>
              
              <!-- 分页 -->
              <div v-if="followingPagination.pages > 1" class="pagination">
                <el-pagination
                  v-model:current-page="followingPagination.page"
                  :page-size="followingPagination.limit"
                  :total="followingPagination.total"
                  layout="prev, pager, next"
                  @current-change="handleFollowingPageChange"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="粉丝" name="followers">
          <div class="tab-content">
            <!-- 搜索框 -->
            <div class="search-section">
              <el-input
                v-model="searchQuery"
                placeholder="搜索粉丝..."
                clearable
                @input="handleSearch"
                class="search-input"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            
            <!-- 粉丝列表 -->
            <div class="users-section">
              <div v-if="followersLoading" class="loading">
                <el-skeleton :rows="5" animated />
              </div>
              <div v-else-if="filteredFollowers.length === 0" class="empty">
                <el-empty :description="searchQuery ? '没有找到匹配的用户' : '暂无粉丝'" />
              </div>
              <div v-else class="users-list">
                <UserCard
                  v-for="user in filteredFollowers"
                  :key="user._id"
                  :user="user"
                  :compact="false"
                  :follow-source="'follow-list'"
                  @follow-change="handleFollowChange"
                  @action="handleUserAction"
                />
              </div>
              
              <!-- 分页 -->
              <div v-if="followersPagination.pages > 1" class="pagination">
                <el-pagination
                  v-model:current-page="followersPagination.page"
                  :page-size="followersPagination.limit"
                  :total="followersPagination.total"
                  layout="prev, pager, next"
                  @current-change="handleFollowersPageChange"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Search } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import UserCard from '@/components/social/UserCard.vue';
import { getUserFollowing, getUserFollowers } from '@/api/users';
import api from '@/api';

export default {
  name: 'FollowList',
  components: {
    UserCard,
    ArrowLeft,
    Search
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    
    // 状态
    const activeTab = ref(route.query.tab || 'following');
    const searchQuery = ref('');
    
    // 用户信息
    const targetUser = ref(null);
    const targetUserLoading = ref(true);
    
    // 关注列表
    const following = ref([]);
    const followingLoading = ref(false);
    const followingPagination = ref({
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    });
    
    // 粉丝列表
    const followers = ref([]);
    const followersLoading = ref(false);
    const followersPagination = ref({
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    });
    
    // 计算属性
    const userId = computed(() => route.params.id);
    
    const isCurrentUser = computed(() => {
      return userStore.user && userStore.user._id === userId.value;
    });
    
    const pageTitle = computed(() => {
      if (!targetUser.value) return '关注列表';
      const displayName = targetUser.value.displayName || targetUser.value.username;
      return isCurrentUser.value ? '我的关注' : `${displayName}的关注`;
    });
    
    const subtitle = computed(() => {
      if (!targetUser.value) return '';
      const followingCount = targetUser.value.followingCount || 0;
      const followersCount = targetUser.value.followersCount || 0;
      return `关注 ${followingCount} · 粉丝 ${followersCount}`;
    });
    
    // 搜索过滤
    const filteredFollowing = computed(() => {
      if (!searchQuery.value) return following.value;
      const query = searchQuery.value.toLowerCase();
      return following.value.filter(user => {
        const displayName = (user.displayName || user.username || '').toLowerCase();
        const username = (user.username || '').toLowerCase();
        const bio = (user.bio || '').toLowerCase();
        return displayName.includes(query) || username.includes(query) || bio.includes(query);
      });
    });
    
    const filteredFollowers = computed(() => {
      if (!searchQuery.value) return followers.value;
      const query = searchQuery.value.toLowerCase();
      return followers.value.filter(user => {
        const displayName = (user.displayName || user.username || '').toLowerCase();
        const username = (user.username || '').toLowerCase();
        const bio = (user.bio || '').toLowerCase();
        return displayName.includes(query) || username.includes(query) || bio.includes(query);
      });
    });
    
    // 获取目标用户信息
    const fetchTargetUser = async () => {
      targetUserLoading.value = true;
      try {
        const response = await api.get(`/users/${userId.value}/profile`);
        targetUser.value = response.data.data;
      } catch (error) {
        console.error('获取用户信息失败:', error);
        ElMessage.error('获取用户信息失败');
        router.push('/');
      } finally {
        targetUserLoading.value = false;
      }
    };
    
    // 获取关注列表
    const fetchFollowing = async (page = 1) => {
      followingLoading.value = true;
      try {
        const response = await getUserFollowing(userId.value, {
          page,
          limit: followingPagination.value.limit
        });
        
        following.value = response.data.data.following || [];
        followingPagination.value = {
          ...followingPagination.value,
          ...response.data.data.pagination
        };
      } catch (error) {
        console.error('获取关注列表失败:', error);
        ElMessage.error('获取关注列表失败');
      } finally {
        followingLoading.value = false;
      }
    };
    
    // 获取粉丝列表
    const fetchFollowers = async (page = 1) => {
      followersLoading.value = true;
      try {
        const response = await getUserFollowers(userId.value, {
          page,
          limit: followersPagination.value.limit
        });
        
        followers.value = response.data.data.followers || [];
        followersPagination.value = {
          ...followersPagination.value,
          ...response.data.data.pagination
        };
      } catch (error) {
        console.error('获取粉丝列表失败:', error);
        ElMessage.error('获取粉丝列表失败');
      } finally {
        followersLoading.value = false;
      }
    };
    
    // 处理标签页切换
    const handleTabChange = (tabName) => {
      activeTab.value = tabName;
      router.replace({ query: { ...route.query, tab: tabName } });
      
      if (tabName === 'following' && following.value.length === 0) {
        fetchFollowing();
      } else if (tabName === 'followers' && followers.value.length === 0) {
        fetchFollowers();
      }
    };
    
    // 处理搜索
    const handleSearch = () => {
      // 搜索是客户端过滤，无需额外处理
    };
    
    // 处理分页
    const handleFollowingPageChange = (page) => {
      fetchFollowing(page);
    };
    
    const handleFollowersPageChange = (page) => {
      fetchFollowers(page);
    };
    
    // 处理关注状态变化
    const handleFollowChange = (data) => {
      // 从列表中移除或更新用户
      if (data.action === 'unfollowed' && activeTab.value === 'following') {
        following.value = following.value.filter(user => user._id !== data.userId);
        followingPagination.value.total = Math.max(followingPagination.value.total - 1, 0);
      }
      
      // 更新目标用户的统计信息
      if (targetUser.value && targetUser.value._id === data.userId) {
        if (data.action === 'followed') {
          targetUser.value.followersCount = (targetUser.value.followersCount || 0) + 1;
        } else if (data.action === 'unfollowed') {
          targetUser.value.followersCount = Math.max((targetUser.value.followersCount || 0) - 1, 0);
        }
      }
    };
    
    // 处理用户操作
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
    watch(() => route.params.id, () => {
      fetchTargetUser();
      following.value = [];
      followers.value = [];
      followingPagination.value.page = 1;
      followersPagination.value.page = 1;
    });
    
    // 组件挂载
    onMounted(() => {
      fetchTargetUser();
      
      // 根据当前标签页加载数据
      if (activeTab.value === 'following') {
        fetchFollowing();
      } else if (activeTab.value === 'followers') {
        fetchFollowers();
      }
    });
    
    return {
      activeTab,
      searchQuery,
      targetUser,
      targetUserLoading,
      following,
      followingLoading,
      followingPagination,
      followers,
      followersLoading,
      followersPagination,
      pageTitle,
      subtitle,
      filteredFollowing,
      filteredFollowers,
      handleTabChange,
      handleSearch,
      handleFollowingPageChange,
      handleFollowersPageChange,
      handleFollowChange,
      handleUserAction
    };
  }
};
</script>

<style scoped>
.follow-list-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  flex-shrink: 0;
}

.page-title h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #303133;
}

.subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.tabs-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-content {
  padding-top: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.search-input {
  max-width: 400px;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading,
.empty {
  padding: 40px 20px;
  text-align: center;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .follow-list-page {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .search-input {
    max-width: 100%;
  }
}
</style>
