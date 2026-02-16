<template>
  <div class="profile-page">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人中心</span>
          <el-button type="primary" plain @click="goToAIConnections">AI 连接</el-button>
        </div>
      </template>

      <div v-if="loading" class="loading-wrap">
        <el-skeleton :rows="4" animated />
      </div>

      <el-form v-else label-width="90px" class="profile-form">
        <el-form-item label="用户名">
          <el-input :model-value="user?.username || ''" disabled />
        </el-form-item>

        <el-form-item label="展示名">
          <el-input v-model="form.displayName" maxlength="30" />
        </el-form-item>

        <el-form-item label="个人简介">
          <el-input v-model="form.bio" type="textarea" :rows="4" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="security-card">
      <template #header>
        <div class="card-header">
          <span>账户安全</span>
        </div>
      </template>
      <PasswordChange @password-changed="onPasswordChanged" />
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import PasswordChange from '@/components/PasswordChange.vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);

const user = userStore.user;
const form = reactive({
  displayName: user?.displayName || '',
  bio: user?.bio || ''
});

const goToAIConnections = () => {
  router.push('/ai-connections');
};

const onPasswordChanged = () => {
  ElMessage.success('密码修改成功');
};

const saveProfile = async () => {
  saving.value = true;
  try {
    const result = await userStore.updateProfile({
      displayName: form.displayName,
      bio: form.bio
    });

    if (!result.success) {
      ElMessage.error(result.message || '保存失败');
      return;
    }

    ElMessage.success('资料已保存');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.profile-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  gap: 16px;
}

.profile-card,
.security-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-form {
  max-width: 720px;
}

.loading-wrap {
  padding: 8px 0;
}
</style>
