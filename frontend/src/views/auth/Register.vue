<template>
  <div class="register-container" :style="containerBackgroundStyle">
    <div class="register-form-wrapper">
      <div class="register-card">
        <div class="form-header">
          <div class="logo">
            <i class="el-icon-user-plus"></i>
          </div>
          <h2 class="form-title">创建账户</h2>
          <p class="form-subtitle">填写以下信息完成注册</p>
        </div>

        <el-form
          :model="form"
          :rules="rules"
          ref="formRef"
          class="register-form"
          size="large"
        >
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              prefix-icon="User"
              clearable
            />
            <div class="input-hint">
              用于登录，仅支持字母、数字、下划线
            </div>
          </el-form-item>

          <el-form-item prop="displayName">
            <el-input
              v-model="form.displayName"
              placeholder="显示名称（可选）"
              prefix-icon="UserFilled"
              clearable
            />
            <div class="input-hint">
              支持中文、空格、emoji，用于展示
            </div>
          </el-form-item>

          <el-form-item prop="email">
            <el-input
              v-model="form.email"
              placeholder="邮箱地址"
              prefix-icon="Message"
              clearable
            />
            <div class="input-hint">
              用于接收验证邮件和重要通知
            </div>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              prefix-icon="Lock"
              show-password
              clearable
              @keyup.enter="handleRegister"
            />
            <div class="input-hint">
              建议使用8位以上包含字母数字的密码
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              @click="handleRegister"
              :loading="loading"
              class="register-button"
              size="large"
            >
              <span v-if="!loading">创建账户</span>
              <span v-else>注册中...</span>
            </el-button>
          </el-form-item>
        </el-form>

        <div class="form-footer">
          <p class="login-prompt">
            已有账号？
            <router-link to="/auth/login" class="login-link">
              立即登录
            </router-link>
          </p>

          <div class="terms-notice">
            <p>
              <i class="el-icon-shield"></i>
              注册即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
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
  name: 'Register',
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const formRef = ref();
    const loading = ref(false);

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
      username: '',
      displayName: '',
      email: '',
      password: ''
    });

    const rules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, message: '用户名至少3个字符', trigger: 'blur' },
        { max: 20, message: '用户名最多20个字符', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字、下划线', trigger: 'blur' }
      ],
      // displayName 可选，不强制
      displayName: [
        { max: 50, message: '显示名称最多50个字符', trigger: 'blur' }
      ],
      email: [
        { required: true, message: '请输入邮箱地址', trigger: 'blur' },
        { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码至少6个字符', trigger: 'blur' },
        { max: 50, message: '密码最多50个字符', trigger: 'blur' }
      ]
    };

    const handleRegister = async () => {
      if (!formRef.value) return;

      const valid = await formRef.value.validate();
      if (!valid) return;

      loading.value = true;
      const result = await userStore.register(form.value);
      loading.value = false;

      if (result.success) {
        // 检查是否需要邮箱验证
        if (result.data && result.data.needsEmailVerification) {
          ElMessage.success({
            message: result.message || '注册成功！请检查您的邮箱并点击验证链接以激活账户。',
            duration: 6000
          });
          // 跳转到验证提示页面，传递邮箱信息
          router.push({
            name: 'VerificationPending',
            query: { email: result.data.email }
          });
        } else {
          ElMessage.success('注册成功，请登录');
          router.push('/auth/login');
        }
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
      containerBackgroundStyle,
      handleRegister
    };
  }
};
</script>

<style scoped>
.register-container {
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

.register-form-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.register-card {
  width: 100%;
  max-width: 450px;
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

.register-form {
  margin-bottom: 20px;
}

.register-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.register-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
}

.register-form :deep(.el-input__wrapper:hover) {
  border-color: #ff7e5f;
  box-shadow: 0 4px 12px rgba(255, 126, 95, 0.15);
  background: rgba(255, 255, 255, 0.9);
}

.register-form :deep(.el-input__wrapper.is-focus) {
  border-color: #ff7e5f;
  box-shadow: 0 4px 12px rgba(255, 126, 95, 0.2);
  background: rgba(255, 255, 255, 0.95);
}

.input-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  opacity: 0.8;
}

.register-button {
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

.register-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 126, 95, 0.4);
}

.form-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.login-prompt {
  color: #666;
  margin: 0 0 16px 0;
  font-size: 13px;
}

.login-link {
  color: #ff7e5f;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.login-link:hover {
  color: #e55a4f;
}

.terms-notice {
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.terms-notice p {
  font-size: 11px;
  color: #999;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0.8;
}

.terms-notice i {
  color: #ff7e5f;
  font-size: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .register-card {
    max-width: 400px;
    padding: 32px;
  }

  .form-title {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .register-form-wrapper {
    padding: 16px;
  }

  .register-card {
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
