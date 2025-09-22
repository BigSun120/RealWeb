<template>
  <div class="login-container" :style="containerBackgroundStyle">
    <div class="login-form-wrapper">
      <div class="login-card">
        <div class="form-header">
          <div class="logo">
            <i class="el-icon-user-solid"></i>
          </div>
          <h2 class="form-title">欢迎回来</h2>
          <p class="form-subtitle">请输入您的登录信息</p>
        </div>

        <el-form
          :model="form"
          :rules="rules"
          ref="formRef"
          class="login-form"
          size="large"
        >
          <el-form-item prop="identifier">
            <el-input
              v-model="form.identifier"
              placeholder="邮箱或用户名"
              prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              prefix-icon="Lock"
              show-password
              clearable
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="form-options">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            <router-link to="/auth/forgot-password" class="forgot-link">
              忘记密码？
            </router-link>
          </div>

          <el-form-item>
            <el-button
              type="primary"
              @click="handleLogin"
              :loading="loading"
              class="login-button"
              size="large"
            >
              <span v-if="!loading">登录</span>
              <span v-else>登录中...</span>
            </el-button>
          </el-form-item>
        </el-form>

        <div class="form-footer">
          <p class="register-prompt">
            还没有账号？
            <router-link to="/auth/register" class="register-link">
              立即注册
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useGlobalBackgroundManager } from '@/composables/useBackgroundManager';

export default {
  name: 'Login',
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const formRef = ref();
    const loading = ref(false);
    // 从localStorage恢复上次的"记住我"选择
    const rememberMe = ref(localStorage.getItem('rememberMePreference') === 'true');

    // 背景管理器
    const globalManager = useGlobalBackgroundManager();

    // 容器背景样式
    const containerBackgroundStyle = computed(() => {
      if (globalManager.hasBackground.value && globalManager.backgroundImage.value) {
        return {
          backgroundImage: `url(${globalManager.backgroundImage.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        };
      }
      return {};
    });

    const form = ref({
      identifier: '',
      password: ''
    });

    const rules = {
      identifier: [
        { required: true, message: '请输入邮箱或用户名', trigger: 'blur' },
        { min: 3, message: '用户名至少3个字符', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码至少6个字符', trigger: 'blur' }
      ]
    };

    const handleLogin = async () => {
      if (!formRef.value) return;

      const valid = await formRef.value.validate();
      if (!valid) return;

      loading.value = true;
      // 将rememberMe状态添加到登录凭据中
      const credentials = {
        ...form.value,
        rememberMe: rememberMe.value
      };
      const result = await userStore.login(credentials);
      loading.value = false;

      if (result.success) {
        // 保存用户的"记住我"偏好
        localStorage.setItem('rememberMePreference', rememberMe.value.toString());

        const message = result.rememberMe
          ? '登录成功，已为您保存登录状态30天'
          : '登录成功';
        ElMessage.success(message);
        router.push('/');
      } else {
        ElMessage.error(result.message);
      }
    };

    // 禁用页面滚动和padding
    onMounted(() => {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingTop = '0';
      document.body.style.margin = '0';
      document.documentElement.style.overflow = 'hidden';
    });

    onUnmounted(() => {
      document.body.style.overflow = '';
      document.body.style.paddingTop = '';
      document.body.style.margin = '';
      document.documentElement.style.overflow = '';
    });

    return {
      form,
      rules,
      formRef,
      loading,
      rememberMe,
      containerBackgroundStyle,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 1;
}

.login-form-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.logo {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 24px;
  color: white;
  box-shadow: 0 8px 24px rgba(255, 126, 95, 0.3);
}

.form-header {
  text-align: center;
  margin-bottom: 30px;
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.form-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.login-form {
  margin-bottom: 20px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: #ff7e5f;
  box-shadow: 0 4px 12px rgba(255, 126, 95, 0.15);
  background: rgba(255, 255, 255, 0.9);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: #ff7e5f;
  box-shadow: 0 4px 12px rgba(255, 126, 95, 0.2);
  background: rgba(255, 255, 255, 0.95);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.forgot-link {
  color: #ff7e5f;
  text-decoration: none;
  font-size: 13px;
  transition: color 0.3s ease;
}

.forgot-link:hover {
  color: #e55a4f;
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
  border: none;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(255, 126, 95, 0.3);
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 126, 95, 0.4);
}

.form-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.register-prompt {
  color: #666;
  margin: 0;
  font-size: 13px;
}

.register-link {
  color: #ff7e5f;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.register-link:hover {
  color: #e55a4f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-card {
    max-width: 350px;
    padding: 32px;
  }

  .form-title {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .login-form-wrapper {
    padding: 16px;
  }

  .login-card {
    max-width: 100%;
    padding: 24px;
  }

  .form-title {
    font-size: 20px;
  }

  .logo {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}
</style>
