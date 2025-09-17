<template>
  <div class="forgot-password-container" :style="containerBackgroundStyle">
    <div class="forgot-password-form-wrapper">
      <div class="forgot-password-card">
        <div class="form-header">
          <div class="logo">
            <i class="el-icon-key"></i>
          </div>
          <h2 class="form-title">忘记密码</h2>
          <p class="form-subtitle">输入您的邮箱地址，我们将发送重置链接</p>
        </div>

        <!-- 发送邮件表单 -->
        <div v-if="!emailSent">
          <el-form
            :model="form"
            :rules="rules"
            ref="formRef"
            class="forgot-password-form"
            size="large"
          >
            <el-form-item prop="email">
              <el-input
                v-model="form.email"
                placeholder="邮箱地址"
                prefix-icon="Message"
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
              >
                {{ loading ? '发送中...' : '发送重置邮件' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 邮件发送成功提示 -->
        <div v-else class="success-message">
          <div class="success-icon">
            <i class="el-icon-success"></i>
          </div>
          <h3>邮件已发送</h3>
          <p>我们已向 <strong>{{ form.email }}</strong> 发送了密码重置邮件</p>
          <p class="help-text">请检查您的邮箱（包括垃圾邮件文件夹），点击邮件中的链接重置密码</p>
          
          <div class="action-buttons">
            <el-button @click="goToLogin">返回登录</el-button>
            <el-button type="primary" @click="resendEmail" :loading="resending">
              {{ resending ? '重新发送中...' : '重新发送' }}
            </el-button>
          </div>
        </div>

        <div class="form-footer">
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
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { forgotPassword } from '@/api/auth';
import { useGlobalBackgroundManager } from '@/composables/useBackgroundManager';

export default {
  name: 'ForgotPassword',
  setup() {
    const router = useRouter();
    const formRef = ref(null);
    const loading = ref(false);
    const resending = ref(false);
    const emailSent = ref(false);

    // 背景管理
    const globalManager = useGlobalBackgroundManager();

    // 表单数据
    const form = reactive({
      email: ''
    });

    // 表单验证规则
    const rules = {
      email: [
        { required: true, message: '请输入邮箱地址', trigger: 'blur' },
        { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
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

    // 提交表单
    const handleSubmit = async () => {
      if (!formRef.value) return;

      try {
        await formRef.value.validate();
      } catch {
        return;
      }

      loading.value = true;

      try {
        await forgotPassword(form.email);
        emailSent.value = true;
        ElMessage.success('重置邮件已发送，请检查您的邮箱');
      } catch (error) {
        console.error('发送重置邮件失败:', error);
        ElMessage.error(error.response?.data?.message || '发送失败，请稍后重试');
      } finally {
        loading.value = false;
      }
    };

    // 重新发送邮件
    const resendEmail = async () => {
      resending.value = true;

      try {
        await forgotPassword(form.email);
        ElMessage.success('重置邮件已重新发送');
      } catch (error) {
        console.error('重新发送失败:', error);
        ElMessage.error(error.response?.data?.message || '发送失败，请稍后重试');
      } finally {
        resending.value = false;
      }
    };

    // 返回登录页面
    const goToLogin = () => {
      router.push('/auth/login');
    };

    // 页面生命周期
    onMounted(() => {
      // 禁用页面滚动
      document.body.style.overflow = 'hidden';
      document.body.style.paddingTop = '0';
      document.body.style.margin = '0';
      document.documentElement.style.overflow = 'hidden';
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
      loading,
      resending,
      emailSent,
      containerBackgroundStyle,
      handleSubmit,
      resendEmail,
      goToLogin
    };
  }
};
</script>

<style scoped>
.forgot-password-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  z-index: 1;
  /* 背景通过 :style 动态设置 */
}

.forgot-password-form-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.forgot-password-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
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
  margin: 0;
  line-height: 1.5;
}

.forgot-password-form {
  margin-bottom: 24px;
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

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(255, 126, 95, 0.3);
}

.success-message {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #52c41a, #73d13d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 32px;
  color: white;
  box-shadow: 0 8px 16px rgba(82, 196, 26, 0.3);
}

.success-message h3 {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
}

.success-message p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.help-text {
  font-size: 13px !important;
  color: #95a5a6 !important;
}

.action-buttons {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-buttons .el-button {
  flex: 1;
  max-width: 120px;
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
  .forgot-password-card {
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
  .forgot-password-card {
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
