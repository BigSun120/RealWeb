<template>
  <div class="reset-password-container" :style="containerBackgroundStyle">
    <div class="reset-password-form-wrapper">
      <div class="reset-password-card">
        <!-- 令牌验证中 -->
        <div v-if="tokenValidating" class="loading-state">
          <div class="loading-icon">
            <i class="el-icon-loading"></i>
          </div>
          <h3>验证重置链接...</h3>
          <p>请稍候，正在验证您的重置链接</p>
        </div>

        <!-- 令牌无效 -->
        <div v-else-if="tokenInvalid" class="error-state">
          <div class="error-icon">
            <i class="el-icon-warning"></i>
          </div>
          <h3>链接无效或已过期</h3>
          <p>{{ errorMessage }}</p>
          <div class="action-buttons">
            <el-button @click="goToForgotPassword">重新获取重置链接</el-button>
            <el-button type="primary" @click="goToLogin">返回登录</el-button>
          </div>
        </div>

        <!-- 重置密码表单 -->
        <div v-else-if="tokenValid">
          <div class="form-header">
            <div class="logo">
              <i class="el-icon-key"></i>
            </div>
            <h2 class="form-title">重置密码</h2>
            <p class="form-subtitle">为您的账户设置新密码</p>
            <div class="user-info">
              <span class="email">{{ userEmail }}</span>
            </div>
          </div>

          <el-form
            :model="form"
            :rules="rules"
            ref="formRef"
            class="reset-password-form"
            size="large"
          >
            <el-form-item prop="newPassword">
              <el-input
                v-model="form.newPassword"
                type="password"
                placeholder="新密码"
                prefix-icon="Lock"
                show-password
                clearable
                @input="checkPasswordStrength"
              />
              <!-- 密码强度指示器 -->
              <div v-if="form.newPassword" class="password-strength">
                <div class="strength-bar">
                  <div 
                    class="strength-fill" 
                    :class="strengthClass"
                    :style="{ width: strengthPercentage + '%' }"
                  ></div>
                </div>
                <span class="strength-text" :class="strengthClass">
                  密码强度：{{ strengthText }}
                </span>
              </div>
            </el-form-item>

            <el-form-item prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="确认新密码"
                prefix-icon="Lock"
                show-password
                clearable
                @keyup.enter="handleSubmit"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                class="submit-btn"
                :loading="loading"
                @click="handleSubmit"
                :disabled="passwordStrength < 2"
              >
                {{ loading ? '重置中...' : '重置密码' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 重置成功 -->
        <div v-else-if="resetSuccess" class="success-state">
          <div class="success-icon">
            <i class="el-icon-success"></i>
          </div>
          <h3>密码重置成功</h3>
          <p>您的密码已成功重置，请使用新密码登录</p>
          <div class="action-buttons">
            <el-button type="primary" @click="goToLogin">立即登录</el-button>
          </div>
        </div>

        <div class="form-footer" v-if="!resetSuccess">
          <router-link to="/auth/login" class="back-link">
            <i class="el-icon-arrow-left"></i>
            返回登录
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { verifyResetToken, resetPassword } from '@/api/auth';
import { useGlobalBackgroundManager } from '@/composables/useBackgroundManager';

export default {
  name: 'ResetPassword',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const formRef = ref(null);
    
    // 状态管理
    const tokenValidating = ref(true);
    const tokenValid = ref(false);
    const tokenInvalid = ref(false);
    const loading = ref(false);
    const resetSuccess = ref(false);
    const errorMessage = ref('');
    const userEmail = ref('');
    const passwordStrength = ref(0);

    // 背景管理
    const globalManager = useGlobalBackgroundManager();

    // 表单数据
    const form = reactive({
      newPassword: '',
      confirmPassword: ''
    });

    // 表单验证规则
    const rules = {
      newPassword: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, message: '密码至少6个字符', trigger: 'blur' },
        { max: 50, message: '密码最多50个字符', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请确认新密码', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value !== form.newPassword) {
              callback(new Error('两次输入的密码不一致'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ]
    };

    // 背景样式
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
      return {
        background: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)'
      };
    });

    // 密码强度相关计算属性
    const strengthPercentage = computed(() => {
      return (passwordStrength.value / 5) * 100;
    });

    const strengthClass = computed(() => {
      if (passwordStrength.value <= 1) return 'weak';
      if (passwordStrength.value <= 3) return 'medium';
      return 'strong';
    });

    const strengthText = computed(() => {
      if (passwordStrength.value <= 1) return '弱';
      if (passwordStrength.value <= 3) return '中等';
      return '强';
    });

    // 检查密码强度
    const checkPasswordStrength = () => {
      const password = form.newPassword;
      let strength = 0;

      if (password.length >= 6) strength++;
      if (password.length >= 8) strength++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
      if (/\d/.test(password)) strength++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

      passwordStrength.value = strength;
    };

    // 验证重置令牌
    const validateToken = async () => {
      const token = route.params.token;
      
      if (!token) {
        tokenInvalid.value = true;
        errorMessage.value = '缺少重置令牌';
        tokenValidating.value = false;
        return;
      }

      try {
        const response = await verifyResetToken(token);
        tokenValid.value = true;
        userEmail.value = response.data.email;
      } catch (error) {
        console.error('令牌验证失败:', error);
        tokenInvalid.value = true;
        errorMessage.value = error.response?.data?.message || '重置链接无效或已过期';
      } finally {
        tokenValidating.value = false;
      }
    };

    // 提交重置密码
    const handleSubmit = async () => {
      if (!formRef.value) return;

      try {
        await formRef.value.validate();
      } catch {
        return;
      }

      if (passwordStrength.value < 2) {
        ElMessage.warning('密码强度太弱，请设置更安全的密码');
        return;
      }

      loading.value = true;

      try {
        await resetPassword({
          token: route.params.token,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword
        });

        resetSuccess.value = true;
        ElMessage.success('密码重置成功');
      } catch (error) {
        console.error('密码重置失败:', error);
        ElMessage.error(error.response?.data?.message || '重置失败，请稍后重试');
      } finally {
        loading.value = false;
      }
    };

    // 导航方法
    const goToLogin = () => {
      router.push('/auth/login');
    };

    const goToForgotPassword = () => {
      router.push('/auth/forgot-password');
    };

    // 页面生命周期
    onMounted(() => {
      // 禁用页面滚动
      document.body.style.overflow = 'hidden';
      document.body.style.paddingTop = '0';
      document.body.style.margin = '0';
      document.documentElement.style.overflow = 'hidden';

      // 验证令牌
      validateToken();
    });

    onUnmounted(() => {
      // 恢复页面滚动
      document.body.style.overflow = '';
      document.body.style.paddingTop = '';
      document.body.style.margin = '';
      document.documentElement.style.overflow = '';
    });

    return {
      formRef,
      form,
      rules,
      tokenValidating,
      tokenValid,
      tokenInvalid,
      loading,
      resetSuccess,
      errorMessage,
      userEmail,
      passwordStrength,
      containerBackgroundStyle,
      strengthPercentage,
      strengthClass,
      strengthText,
      checkPasswordStrength,
      handleSubmit,
      goToLogin,
      goToForgotPassword
    };
  }
};
</script>

<style scoped>
.reset-password-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
  z-index: 1;
}

.reset-password-form-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.reset-password-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 2;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 24px;
  color: white;
  box-shadow: 0 8px 16px rgba(255, 126, 95, 0.3);
}

.form-title {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.form-subtitle {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.user-info {
  background: rgba(255, 126, 95, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 12px;
}

.email {
  color: #ff7e5f;
  font-size: 14px;
  font-weight: 500;
}

.reset-password-form {
  margin-bottom: 24px;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  width: 100%;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.strength-fill.weak {
  background: #ff4757;
}

.strength-fill.medium {
  background: #ffa502;
}

.strength-fill.strong {
  background: #2ed573;
}

.strength-text {
  font-size: 12px;
  font-weight: 500;
}

.strength-text.weak {
  color: #ff4757;
}

.strength-text.medium {
  color: #ffa502;
}

.strength-text.strong {
  color: #2ed573;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(255, 126, 95, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 状态样式 */
.loading-state,
.error-state,
.success-state {
  text-align: center;
  padding: 20px 0;
}

.loading-icon,
.error-icon,
.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 32px;
  color: white;
}

.loading-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.error-icon {
  background: linear-gradient(135deg, #ff4757, #ff6b7a);
  box-shadow: 0 8px 16px rgba(255, 71, 87, 0.3);
}

.success-icon {
  background: linear-gradient(135deg, #52c41a, #73d13d);
  box-shadow: 0 8px 16px rgba(82, 196, 26, 0.3);
}

.loading-state h3,
.error-state h3,
.success-state h3 {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
}

.loading-state p,
.error-state p,
.success-state p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  flex: 1;
  min-width: 120px;
  max-width: 160px;
}

.form-footer {
  text-align: center;
  margin-top: 24px;
}

.back-link {
  color: #7f8c8d;
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.3s ease;
}

.back-link:hover {
  color: #ff7e5f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .reset-password-card {
    padding: 32px 24px;
    margin: 16px;
    max-width: none;
  }

  .form-title {
    font-size: 24px;
  }

  .logo {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .reset-password-card {
    padding: 24px 20px;
    margin: 12px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    max-width: none;
  }
}
</style>
