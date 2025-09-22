<template>
  <div class="profile">
    <div class="profile-container">
      <!-- 左侧用户信息卡片 -->
      <div class="profile-sidebar">
        <div class="user-card">
          <!-- 用户头像 -->
          <div class="user-avatar-section">
            <AvatarUpload :avatar="(userStore.user && userStore.user.avatar) || ''" :size="100"
              @upload-success="handleAvatarUpload" @delete-success="handleAvatarDelete" />
          </div>

          <!-- 用户信息 -->
          <div class="user-info-section">
            <h1 class="username">
              {{
                (userStore.user && (userStore.user.displayName || userStore.user.username)) || '用户'
              }}
            </h1>
            <p class="user-bio">
              {{ (userStore.user && userStore.user.bio) || '这个人很懒，什么都没写...' }}
            </p>

            <!-- 用户统计 -->
            <div class="user-stats">
              <div class="stat-item clickable" @click="goToFollowList('followers')">
                <strong>{{ userStore.user?.followersCount || 0 }}</strong>
                <span class="stat-label">粉丝</span>
              </div>
              <div class="stat-item clickable" @click="goToFollowList('following')">
                <strong>{{ userStore.user?.followingCount || 0 }}</strong>
                <span class="stat-label">关注</span>
              </div>
              <div class="stat-item">
                <strong>{{ userStore.user?.articleCount || 0 }}</strong>
                <span class="stat-label">文章</span>
              </div>
              <div class="stat-item clickable" @click="goToBookmarks">
                <strong>{{ bookmarkStats?.total || 0 }}</strong>
                <span class="stat-label">收藏</span>
              </div>
            </div>

            <!-- 加入时间 -->
            <div class="user-meta">
              <span class="join-date">
                <el-icon>
                  <Calendar />
                </el-icon>
                加入时间：{{ formatDate(userStore.user && userStore.user.createdAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 导航菜单 -->
        <div class="nav-menu">
          <el-menu :default-active="activeMenu" @select="handleMenuSelect" class="profile-menu">
            <el-menu-item index="profile">
              <el-icon>
                <User />
              </el-icon>
              <span>个人资料</span>
            </el-menu-item>
            <el-menu-item index="security">
              <el-icon>
                <Lock />
              </el-icon>
              <span>账户安全</span>
            </el-menu-item>
          </el-menu>
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div class="profile-content">
        <!-- 个人资料编辑 -->
        <div v-if="activeMenu === 'profile'" class="content-section">
          <div class="section-header">
            <h2>
              <el-icon>
                <User />
              </el-icon>
              个人资料
            </h2>
            <p class="section-desc">管理您的个人信息</p>
          </div>
          <div class="section-content">
            <el-form :model="form" ref="formRef" label-position="top">
              <div class="form-row">
                <el-form-item label="展示名（显示在页面上，可留空）" class="form-item">
                  <el-input v-model="form.displayName" placeholder="请输入展示名（支持中文/空格/emoji）" />
                </el-form-item>
              </div>
              <div class="form-row">
                <el-form-item label="账号名（用于登录，不可修改）" class="form-item">
                  <el-input v-model="form.username" placeholder="请输入账号名" readonly disabled />
                </el-form-item>
              </div>
              <div class="form-row">
                <el-form-item class="form-item email-form-item">
                  <template #label>
                    <div class="email-label-section">
                      <span>邮箱地址</span>
                      <el-button v-if="!userStore.user?.emailVerified || emailChanged" type="primary" size="small"
                        @click="sendVerificationEmail" :loading="verificationLoading" class="verify-btn">
                        {{ emailChanged ? '重新验证' : '验证邮箱' }}
                      </el-button>
                    </div>
                  </template>
                  <el-input v-model="form.email" placeholder="请输入邮箱地址" type="email" />
                  <div class="form-tip">
                    <span v-if="userStore.user?.emailVerified && !emailChanged" class="verified-tip">
                      <el-icon>
                        <Check />
                      </el-icon>
                      邮箱已验证
                    </span>
                    <span v-else class="unverified-tip">
                      <el-icon>⚠️</el-icon>
                      {{ emailChanged ? '邮箱已更改，请重新验证' : '邮箱未验证，验证后可使用完整功能' }}
                    </span>
                  </div>
                </el-form-item>
              </div>
              <div class="form-row">
                <el-form-item label="个人简介" class="form-item">
                  <el-input v-model="form.bio" type="textarea" :rows="4" placeholder="介绍一下自己吧..." maxlength="200"
                    show-word-limit />
                </el-form-item>
              </div>
              <div class="form-actions">
                <el-button type="primary" @click="handleUpdate" :loading="loading">
                  <el-icon>
                    <Check />
                  </el-icon>
                  保存更改
                </el-button>
              </div>
            </el-form>
          </div>
        </div>

        <!-- 账户安全 -->
        <div v-if="activeMenu === 'security'" class="content-section">
          <div class="section-header">
            <h2>账户安全</h2>
            <p class="section-desc">管理您的账户安全设置</p>
          </div>
          <div class="section-content">
            <PasswordChange @password-changed="handlePasswordChanged" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import api from '@/api';
import { getUserBookmarkStats } from '@/api/bookmarks';
import { Calendar, User, Lock, Check } from '@element-plus/icons-vue';
import AvatarUpload from '@/components/AvatarUpload.vue';
import PasswordChange from '@/components/PasswordChange.vue';

export default {
  name: 'Profile',
  components: {
    AvatarUpload,
    PasswordChange,
    Calendar,
    User,
    Lock,
    Check
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const formRef = ref();
    const loading = ref(false);

    const form = ref({
      displayName: '',
      username: '',
      email: '',
      bio: ''
    });

    // 菜单状态
    const activeMenu = ref('profile');

    // 邮箱验证相关状态
    const verificationLoading = ref(false);
    const originalEmail = ref('');

    // 收藏统计
    const bookmarkStats = ref(null);
    const emailChanged = computed(() => {
      return form.value.email !== originalEmail.value;
    });

    const handleUpdate = async () => {
      loading.value = true;

      // 创建不包含username的更新数据
      const updateData = {
        displayName: form.value.displayName,
        email: form.value.email,
        bio: form.value.bio
      };

      const result = await userStore.updateProfile(updateData);
      loading.value = false;

      if (result.success) {
        ElMessage.success('更新成功');
        // 更新原始邮箱地址
        originalEmail.value = form.value.email;
      } else {
        ElMessage.error(result.message);
      }
    };

    const handleAvatarUpload = data => {
      // 更新用户store中的头像信息
      if (data.user) {
        userStore.updateUser(data.user);
      }
    };

    const handleAvatarDelete = data => {
      // 更新用户store中的头像信息
      if (data.user) {
        userStore.updateUser(data.user);
      }
    };

    const handlePasswordChanged = () => {
      ElMessage.success('密码修改成功，请妥善保管新密码');
    };

    const formatDate = dateString => {
      if (!dateString) return '未知';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // 跳转到关注列表页面
    const goToFollowList = (tab = 'following') => {
      if (userStore.user?._id) {
        router.push(`/user/${userStore.user._id}/follow?tab=${tab}`);
      }
    };

    // 跳转到收藏页面
    const goToBookmarks = () => {
      router.push('/bookmarks');
    };

    // 处理菜单选择
    const handleMenuSelect = (index) => {
      activeMenu.value = index;
    };

    // 发送验证邮件
    const sendVerificationEmail = async () => {
      if (!form.value.email) {
        ElMessage.warning('请先输入邮箱地址');
        return;
      }

      verificationLoading.value = true;
      try {
        await api.post('/auth/resend-verification', {
          email: form.value.email
        });
        ElMessage.success('验证邮件已发送，请查收邮箱');
      } catch (error) {
        console.error('发送验证邮件失败:', error);
        ElMessage.error(error.response?.data?.message || '发送验证邮件失败');
      } finally {
        verificationLoading.value = false;
      }
    };

    // 更新表单数据
    const updateFormData = (userData) => {
      if (userData) {
        form.value.displayName = userData.displayName || '';
        form.value.username = userData.username || '';
        form.value.email = userData.email || '';
        form.value.bio = userData.bio || '';

        // 更新原始邮箱地址
        originalEmail.value = userData.email || '';
      }
    };

    // 获取用户完整统计信息
    const fetchUserStats = async () => {
      if (userStore.user?._id) {
        try {
          const response = await api.get(`/users/${userStore.user._id}/profile`);
          // 更新用户store中的统计信息
          userStore.updateUser(response.data.data);
          // 更新表单数据
          updateFormData(response.data.data);
        } catch (error) {
          console.error('获取用户统计失败:', error);
        }
      }
    };

    // 获取收藏统计
    const fetchBookmarkStats = async () => {
      try {
        const response = await getUserBookmarkStats();
        bookmarkStats.value = response.data.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // API不存在时的优雅降级
          bookmarkStats.value = { total: 0 };
          console.warn('收藏功能API暂不可用');
        } else {
          console.error('获取收藏统计失败:', error);
          bookmarkStats.value = { total: 0 };
        }
      }
    };

    // 监听userStore变化，及时更新表单数据
    watch(() => userStore.user, (newUser) => {
      if (newUser) {
        updateFormData(newUser);
      }
    }, { immediate: true, deep: true });

    onMounted(() => {
      // 添加body类用于全屏背景
      document.body.classList.add('profile-page');

      // 初始化表单数据
      if (userStore.user) {
        updateFormData(userStore.user);
      }

      // 获取最新的统计信息
      fetchUserStats();
      fetchBookmarkStats();

      // 监听邮箱验证状态变化
      const handleEmailVerificationChange = (event) => {
        const { verified, email } = event.detail;
        if (verified && email === userStore.user?.email) {
          // 邮箱验证成功，刷新用户信息
          userStore.fetchUserInfo();
        }
      };

      window.addEventListener('emailVerificationChanged', handleEmailVerificationChange);

      // 清理函数
      onUnmounted(() => {
        window.removeEventListener('emailVerificationChanged', handleEmailVerificationChange);
        document.body.classList.remove('profile-page');
      });
    });

    return {
      userStore,
      form,
      formRef,
      loading,
      activeMenu,
      verificationLoading,
      emailChanged,
      handleUpdate,
      handleAvatarUpload,
      handleAvatarDelete,
      handlePasswordChanged,
      handleMenuSelect,
      sendVerificationEmail,
      formatDate,
      goToFollowList,
      goToBookmarks,
      bookmarkStats
    };
  }
};
</script>

<style scoped>
.profile {
  min-height: 100vh;
  padding: 20px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.profile-container {
  max-width: 1200px;
  display: flex;
  gap: 24px;
  align-items: flex-start;
  width: 100%;
}

/* 侧边栏 */
.profile-sidebar {
  width: 320px;
  flex-shrink: 0;
}

.user-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-align: center;
}

.user-avatar-section {
  margin-bottom: 20px;
}

.user-info-section {
  text-align: center;
}

.nav-menu {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.profile-menu {
  border: none;
  background: transparent;
}

.profile-menu .el-menu-item {
  border-radius: 0;
  margin: 0;
  padding: 16px 20px;
  color: #666;
  transition: all 0.3s ease;
}

.profile-menu .el-menu-item:hover {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.profile-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
}

/* 内容区域 */
.profile-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.content-section {
  padding: 30px;
}

.username {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-bio {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.user-stats {
  display: flex;
  justify-content: space-around;
  gap: 16px;
  margin: 20px 0;
  padding: 16px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 60px;
}

.stat-item.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px;
  border-radius: 6px;
}

.stat-item.clickable:hover {
  background-color: rgba(76, 175, 80, 0.1);
  transform: translateY(-1px);
}

.stat-item strong {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
}

.user-meta {
  margin-top: 16px;
  padding-top: 16px;
}

.join-date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #95a5a6;
}

/* 表单样式 */
.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-item {
  flex: 1;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
}

.verified-tip {
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 4px;
}

.unverified-tip {
  color: #e6a23c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.email-label-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.email-form-item {
  .form-tip {
    margin-top: 8px;
  }
}

.verify-btn {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile {
    padding: 10px;
  }

  .profile-container {
    flex-direction: column;
    gap: 16px;
  }

  .profile-sidebar {
    width: 100%;
  }

  .user-card {
    padding: 20px;
  }

  .username {
    font-size: 20px;
  }

  .user-stats {
    gap: 12px;
  }

  .stat-item strong {
    font-size: 16px;
  }

  .content-section {
    padding: 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
