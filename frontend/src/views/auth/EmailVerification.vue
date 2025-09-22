<template>
  <div class="email-verification-container" :style="containerBackgroundStyle">
    <div class="email-verification-wrapper">
      <div class="email-verification-card">
        <!-- 加载状态 -->
        <div v-if="loading" class="verification-loading">
          <div class="loading-icon">
            <i class="el-icon-loading"></i>
          </div>
          <h3>正在验证您的邮箱...</h3>
          <p>请稍候，我们正在处理您的验证请求</p>
        </div>

        <!-- 验证成功 -->
        <div v-else-if="verificationStatus === 'success'" class="verification-success">
          <div class="success-icon">
            <i class="el-icon-success"></i>
          </div>
          <h3>邮箱验证成功</h3>
          <p>恭喜您！您的邮箱已成功验证，现在可以享受完整的网站功能了</p>

          <div class="success-features">
            <h4>现在您可以：</h4>
            <ul>
              <li><i class="el-icon-chat-dot-round"></i> 发表评论，参与讨论</li>
              <li><i class="el-icon-edit"></i> 发布文章，分享见解</li>
              <li><i class="el-icon-setting"></i> 使用所有网站工具</li>
              <li><i class="el-icon-user"></i> 完整的个人资料管理</li>
            </ul>
          </div>

          <div class="action-buttons">
            <el-button type="primary" @click="goToHome">
              返回首页
            </el-button>
            <el-button @click="goToProfile">
              完善资料
            </el-button>
          </div>
        </div>

        <!-- 验证失败 -->
        <div v-else-if="verificationStatus === 'error'" class="verification-error">
          <div class="error-icon">
            <i class="el-icon-warning"></i>
          </div>
          <h3>验证失败</h3>
          <p class="error-message">{{ errorMessage }}</p>

          <div class="error-reasons">
            <h3>可能的原因：</h3>
            <ul>
              <li>验证链接已过期（有效期24小时）</li>
              <li>验证链接已被使用</li>
              <li>验证链接格式不正确</li>
              <li>网络连接问题</li>
            </ul>
          </div>

          <div class="error-actions">
            <el-button type="primary" @click="showResendForm">
              重新发送验证邮件
            </el-button>
            <el-button @click="goToLogin">
              返回登录
            </el-button>
          </div>
        </div>

        <!-- 重发验证邮件表单 -->
        <div v-if="showResend" class="resend-form">
          <h3>重新发送验证邮件</h3>
          <el-form :model="resendForm" :rules="resendRules" ref="resendForm">
            <el-form-item prop="email">
              <el-input v-model="resendForm.email" placeholder="请输入您的邮箱地址" prefix-icon="fas fa-envelope" size="large" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" :loading="resending" @click="handleResendVerification"
                style="width: 100%">
                {{ resending ? '发送中...' : '发送验证邮件' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { verifyEmail, resendVerificationEmail } from '@/api/auth';
import { useUserStore } from '@/stores/user';
import { useEmailVerificationStore } from '@/stores/emailVerification';
import { updateEmailVerificationStatus } from '@/utils/emailVerification';
import { useGlobalBackgroundManager } from '@/composables/useBackgroundManager';

export default {
  name: 'EmailVerification',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const userStore = useUserStore();
    const emailVerificationStore = useEmailVerificationStore();

    // 背景管理
    const globalManager = useGlobalBackgroundManager();

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
      userStore,
      emailVerificationStore,
      containerBackgroundStyle
    };
  },
  data() {
    return {
      loading: true,
      verificationStatus: null, // 'success', 'error'
      errorMessage: '',
      showResend: false,
      resending: false,
      resendForm: {
        email: ''
      },
      resendRules: {
        email: [
          { required: true, message: '请输入邮箱地址', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
        ]
      }
    };
  },

  async mounted() {
    await this.verifyEmailToken();
  },

  methods: {
    async verifyEmailToken() {
      const token = this.$route.params.token;

      if (!token) {
        this.verificationStatus = 'error';
        this.errorMessage = '验证令牌缺失';
        this.loading = false;
        return;
      }

      try {
        const response = await verifyEmail(token);

        if (response.data.code === 200) {
          this.verificationStatus = 'success';

          // 更新邮箱验证状态到本地存储（跨标签页同步）
          if (response.data.data?.user?.email) {
            updateEmailVerificationStatus(true, response.data.data.user.email);
          }

          // 如果用户已登录，更新用户信息
          if (this.userStore.isLoggedIn) {
            await this.userStore.fetchUserInfo();
            // 触发邮箱验证成功处理
            this.emailVerificationStore.handleVerificationSuccess();
          }

          this.$message.success('邮箱验证成功！');
        } else {
          throw new Error(response.data.message || '验证失败');
        }
      } catch (error) {
        console.error('邮箱验证失败:', error);
        this.verificationStatus = 'error';
        this.errorMessage = error.response?.data?.message || error.message || '验证过程中发生错误';
      } finally {
        this.loading = false;
      }
    },

    async handleResendVerification() {
      if (!this.$refs.resendForm) return;

      try {
        await this.$refs.resendForm.validate();
      } catch {
        return;
      }

      this.resending = true;

      try {
        await resendVerificationEmail(this.resendForm.email);
        this.$message.success('验证邮件已发送，请检查您的邮箱');
        this.showResend = false;
      } catch (error) {
        console.error('重发验证邮件失败:', error);
        this.$message.error(error.response?.data?.message || '发送失败，请稍后重试');
      } finally {
        this.resending = false;
      }
    },

    showResendForm() {
      this.showResend = true;
    },

    goToHome() {
      this.$router.push('/');
    },

    goToProfile() {
      this.$router.push('/profile');
    },

    goToLogin() {
      this.$router.push('/auth/login');
    }
  }
};
</script>

<style scoped>
.email-verification-container {
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
}

.email-verification-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.email-verification-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 2;
  text-align: center;
}

/* 状态样式 */
.verification-loading,
.verification-success,
.verification-error {
  padding: 20px 0;
}

.loading-icon,
.success-icon,
.error-icon {
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

.success-icon {
  background: linear-gradient(135deg, #52c41a, #73d13d);
  box-shadow: 0 8px 16px rgba(82, 196, 26, 0.3);
}

.error-icon {
  background: linear-gradient(135deg, #ff4757, #ff6b7a);
  box-shadow: 0 8px 16px rgba(255, 71, 87, 0.3);
}

.verification-loading h3,
.verification-success h3,
.verification-error h3 {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
}

.verification-loading p,
.verification-success p,
.verification-error p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

/* 成功功能列表 */
.success-features {
  background: rgba(82, 196, 26, 0.1);
  border-radius: 8px;
  padding: 20px;
  margin: 24px 0;
  text-align: left;
}

.success-features h4 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 12px 0;
  text-align: center;
}

.success-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.success-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: #52c41a;
  font-size: 14px;
}

.success-features li i {
  font-size: 16px;
  width: 20px;
}

/* 按钮样式 */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

.action-buttons .el-button {
  flex: 1;
  min-width: 120px;
  max-width: 160px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .email-verification-card {
    padding: 32px 24px;
    margin: 16px;
    max-width: none;
  }

  .loading-icon,
  .success-icon,
  .error-icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }

  .verification-loading h3,
  .verification-success h3,
  .verification-error h3 {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .email-verification-card {
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
