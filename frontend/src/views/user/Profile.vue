<template>
  <div class="profile">
    <!-- 页面头部 -->
    <div class="profile-header">
      <div class="header-content">
        <div class="user-avatar">
          <AvatarUpload
            :avatar="userStore.user?.avatar || ''"
            :size="80"
            @upload-success="handleAvatarUpload"
            @delete-success="handleAvatarDelete"
          />
        </div>
        <div class="user-details">
          <h1 class="username">{{ userStore.user?.username }}</h1>
          <p class="user-bio">{{ userStore.user?.bio || '这个人很懒，什么都没写...' }}</p>
          <div class="user-meta">
            <span class="join-date">
              <el-icon><Calendar /></el-icon>
              加入时间：{{ formatDate(userStore.user?.createdAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="profile-main">
      <!-- 个人资料编辑 -->
      <div class="section">
        <div class="section-header">
          <h2>
            <el-icon><User /></el-icon>
            个人资料
          </h2>
          <p class="section-desc">管理您的个人信息</p>
        </div>
        <div class="section-content">
          <el-form :model="form" ref="formRef" label-position="top">
            <div class="form-row">
              <el-form-item label="用户名" class="form-item">
                <el-input v-model="form.username" placeholder="请输入用户名" />
              </el-form-item>
            </div>
            <div class="form-row">
              <el-form-item label="个人简介" class="form-item">
                <el-input
                  v-model="form.bio"
                  type="textarea"
                  :rows="4"
                  placeholder="介绍一下自己吧..."
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </div>
            <div class="form-actions">
              <el-button type="primary" @click="handleUpdate" :loading="loading">
                <el-icon><Check /></el-icon>
                保存更改
              </el-button>
            </div>
          </el-form>
        </div>
      </div>

      <!-- 密码修改 -->
      <div class="section">
        <div class="section-header">
          <h2>
            <el-icon><Lock /></el-icon>
            安全设置
          </h2>
          <p class="section-desc">修改密码，保护账户安全</p>
        </div>
        <div class="section-content">
          <PasswordChange @password-changed="handlePasswordChanged" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
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
    const userStore = useUserStore();
    const formRef = ref();
    const loading = ref(false);

    const form = ref({
      username: '',
      bio: ''
    });

    const handleUpdate = async () => {
      loading.value = true;
      const result = await userStore.updateProfile(form.value);
      loading.value = false;

      if (result.success) {
        ElMessage.success('更新成功');
      } else {
        ElMessage.error(result.message);
      }
    };

    const handleAvatarUpload = (data) => {
      // 更新用户store中的头像信息
      if (data.user) {
        userStore.updateUser(data.user);
      }
    };

    const handleAvatarDelete = (data) => {
      // 更新用户store中的头像信息
      if (data.user) {
        userStore.updateUser(data.user);
      }
    };

    const handlePasswordChanged = () => {
      ElMessage.success('密码修改成功，请妥善保管新密码');
    };

    const formatDate = (dateString) => {
      if (!dateString) return '未知';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    onMounted(() => {
      if (userStore.user) {
        form.value.username = userStore.user.username;
        form.value.bio = userStore.user.bio || '';
      }
    });

    return {
      userStore,
      form,
      formRef,
      loading,
      handleUpdate,
      handleAvatarUpload,
      handleAvatarDelete,
      handlePasswordChanged,
      formatDate
    };
  }
};
</script>

<style scoped>
.profile {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 页面头部 */
.profile-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 40px 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 30px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.username {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-bio {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 20px;
}

.join-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #95a5a6;
}

/* 主要内容区域 */
.profile-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 区块样式 */
.section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.section-header {
  padding: 30px 30px 0 30px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.section-header h2 .el-icon {
  font-size: 20px;
  color: #667eea;
}

.section-desc {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0 0 20px 0;
}

.section-content {
  padding: 0 30px 30px 30px;
}

/* 表单样式 */
.form-row {
  margin-bottom: 24px;
}

.form-item {
  margin-bottom: 0;
}

.form-item :deep(.el-form-item__label) {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.form-item :deep(.el-input__wrapper) {
  border-radius: 8px;
  border: 1px solid #e1e8ed;
  transition: all 0.3s ease;
}

.form-item :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
}

.form-item :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.form-item :deep(.el-textarea__inner) {
  border-radius: 8px;
  border: 1px solid #e1e8ed;
  transition: all 0.3s ease;
}

.form-item :deep(.el-textarea__inner:hover) {
  border-color: #667eea;
}

.form-item :deep(.el-textarea__inner:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.form-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.form-actions .el-button {
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  transition: all 0.3s ease;
}

.form-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-header {
    padding: 20px 0;
  }

  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .username {
    font-size: 24px;
  }

  .profile-main {
    padding: 20px 15px;
    gap: 20px;
  }

  .section-header,
  .section-content {
    padding-left: 20px;
    padding-right: 20px;
  }

  .section-header h2 {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 15px;
  }

  .username {
    font-size: 20px;
  }

  .user-bio {
    font-size: 14px;
  }

  .section-header,
  .section-content {
    padding-left: 15px;
    padding-right: 15px;
  }
}
</style>
