<template>
  <div class="profile">
    <div class="profile-container">
      <!-- 左侧用户信息卡片 -->
      <UserInfoCard :active-menu="activeMenu" @menu-select="handleMenuSelect" @avatar-upload="handleAvatarUpload"
        @avatar-delete="handleAvatarDelete" @stat-click="handleStatClick" />

      <!-- 右侧内容区域 -->
      <div class="profile-content">
        <!-- 个人资料编辑 -->
        <ProfileForm v-if="activeMenu === 'profile'" :user="user" @update-success="handleUpdateSuccess"
          @update-error="handleUpdateError" @password-required="handlePasswordRequired" />

        <!-- 账户安全 -->
        <div v-if="activeMenu === 'security'" class="content-section">
          <div class="section-header">
            <h2>
              <el-icon>
                <Lock />
              </el-icon>
              账户安全
            </h2>
            <p class="section-desc">管理您的账户安全设置</p>
          </div>
          <div class="section-content">
            <PasswordChange @password-changed="handlePasswordChanged" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 密码验证对话框 -->
  <el-dialog v-model="showPasswordDialog" title="验证当前密码" width="400px" :close-on-click-modal="false" append-to-body>
    <div class="password-verify-content">
      <p class="verify-tip">
        <el-icon>
          <Lock />
        </el-icon>
        更改已验证的邮箱地址需要验证当前密码
      </p>
      <el-form @submit.prevent="handlePasswordConfirm">
        <el-form-item label="当前密码">
          <el-input v-model="passwordForm.password" type="password" placeholder="请输入当前密码" show-password
            @keyup.enter="handlePasswordConfirm" />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handlePasswordCancel">取消</el-button>
        <el-button type="primary" :loading="passwordLoading" @click="handlePasswordConfirm">
          确认更改
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Lock } from '@element-plus/icons-vue';
import { useProfile } from '@/composables/useProfile';
import { useUserStore } from '@/stores/user';
import UserInfoCard from '@/components/profile/UserInfoCard.vue';
import ProfileForm from '@/components/profile/ProfileForm.vue';
import PasswordChange from '@/components/PasswordChange.vue';

export default {
  name: 'Profile',
  components: {
    UserInfoCard,
    ProfileForm,
    PasswordChange,
    Lock
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();

    // 使用Profile状态管理
    const {
      loading,
      activeMenu,
      user,
      userStats,
      isLoggedIn,
      fetchUserProfile,
      updateUserProfile,
      handleMenuSelect: profileMenuSelect,
      initialize,
      cleanup
    } = useProfile();

    // 密码验证相关状态
    const showPasswordDialog = ref(false);
    const passwordForm = ref({ password: '' });
    const passwordLoading = ref(false);
    const pendingEmailData = ref(null);

    // 处理菜单选择
    const handleMenuSelect = (menuIndex) => {
      // 如果选择AI连接，跳转到对应页面
      if (menuIndex === 'ai-connections') {
        router.push('/ai-connections');
        return;
      }
      profileMenuSelect(menuIndex);
    };

    // 处理头像上传成功
    const handleAvatarUpload = (data) => {
      ElMessage.success('头像上传成功');
    };

    // 处理头像删除成功
    const handleAvatarDelete = (data) => {
      ElMessage.success('头像删除成功');
    };

    // 处理统计项点击
    const handleStatClick = (type) => {
      console.log('统计项点击:', type);
    };

    // 处理表单更新成功
    const handleUpdateSuccess = (result) => {
      ElMessage.success('个人资料更新成功');
    };

    // 处理表单更新错误
    const handleUpdateError = (error) => {
      ElMessage.error(error.message || '更新失败');
    };

    // 处理密码修改成功
    const handlePasswordChanged = () => {
      ElMessage.success('密码修改成功，请妥善保管新密码');
    };

    // 处理密码验证需求
    const handlePasswordRequired = (data) => {
      pendingEmailData.value = data;
      showPasswordDialog.value = true;
    };

    // 处理密码验证确认
    const handlePasswordConfirm = async () => {
      if (!passwordForm.value.password) {
        ElMessage.warning('请输入当前密码');
        return;
      }

      passwordLoading.value = true;
      try {
        // 执行带密码的更新操作
        const result = await userStore.updateProfile({
          email: pendingEmailData.value.email,
          currentPassword: passwordForm.value.password
        });

        if (result.success) {
          ElMessage.success('邮箱更新成功');
          showPasswordDialog.value = false;
          passwordForm.value.password = '';
          pendingEmailData.value = null;
        } else {
          ElMessage.error(result.message);
        }
      } catch (error) {
        console.error('密码验证失败:', error);
        ElMessage.error('密码验证失败，请重试');
      } finally {
        passwordLoading.value = false;
      }
    };

    // 取消密码验证
    const handlePasswordCancel = () => {
      showPasswordDialog.value = false;
      passwordForm.value.password = '';
      pendingEmailData.value = null;
    };

    onMounted(async () => {
      await initialize();
    });

    onUnmounted(() => {
      cleanup();
    });

    return {
      // 状态
      activeMenu,
      user,
      loading,
      showPasswordDialog,
      passwordForm,
      passwordLoading,

      // 方法
      handleMenuSelect,
      handleAvatarUpload,
      handleAvatarDelete,
      handleStatClick,
      handleUpdateSuccess,
      handleUpdateError,
      handlePasswordChanged,
      handlePasswordRequired,
      handlePasswordConfirm,
      handlePasswordCancel
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
  max-width: 1400px;
  display: flex;
  gap: 24px;
  align-items: flex-start;
  width: 100%;
}

.content-section {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
  padding: 30px;
}

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
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-desc {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
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

  .content-section {
    padding: 20px;
  }
}

/* 密码验证对话框样式 */
.password-verify-content {
  padding: 20px 0;
}

.verify-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.verify-tip .el-icon {
  color: #e6a23c;
  font-size: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.profile-content {
  width: 100%;
}
</style>
