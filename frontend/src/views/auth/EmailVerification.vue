<template>
  <div class="email-verification-page">
    <div class="verification-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="verification-loading">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <h2>正在验证您的邮箱...</h2>
        <p>请稍候，我们正在处理您的验证请求。</p>
      </div>

      <!-- 验证成功 -->
      <div v-else-if="verificationStatus === 'success'" class="verification-success">
        <div class="success-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h2>🎉 邮箱验证成功！</h2>
        <p>恭喜您！您的邮箱已成功验证，现在可以享受完整的网站功能了。</p>

        <div class="success-features">
          <h3>现在您可以：</h3>
          <ul>
            <li><i class="fas fa-comment"></i> 发表评论，参与讨论</li>
            <li><i class="fas fa-edit"></i> 发布文章，分享见解</li>
            <li><i class="fas fa-tools"></i> 使用所有网站工具</li>
            <li><i class="fas fa-user-cog"></i> 完整的个人资料管理</li>
          </ul>
        </div>

        <div class="success-actions">
          <el-button type="primary" size="large" @click="goToHome">
            <i class="fas fa-home"></i>
            返回首页
          </el-button>
          <el-button type="success" size="large" @click="goToProfile">
            <i class="fas fa-user"></i>
            完善资料
          </el-button>
        </div>
      </div>

      <!-- 验证失败 -->
      <div v-else-if="verificationStatus === 'error'" class="verification-error">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h2>❌ 验证失败</h2>
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
          <el-button type="primary" size="large" @click="showResendForm">
            <i class="fas fa-envelope"></i>
            重新发送验证邮件
          </el-button>
          <el-button type="default" size="large" @click="goToLogin">
            <i class="fas fa-sign-in-alt"></i>
            返回登录
          </el-button>
        </div>
      </div>

      <!-- 重发验证邮件表单 -->
      <div v-if="showResend" class="resend-form">
        <h3>重新发送验证邮件</h3>
        <el-form :model="resendForm" :rules="resendRules" ref="resendForm">
          <el-form-item prop="email">
            <el-input
              v-model="resendForm.email"
              placeholder="请输入您的邮箱地址"
              prefix-icon="fas fa-envelope"
              size="large"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="resending"
              @click="handleResendVerification"
              style="width: 100%"
            >
              {{ resending ? '发送中...' : '发送验证邮件' }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script>
import { verifyEmail, resendVerificationEmail } from '@/api/auth';
import { useUserStore } from '@/stores/user';

export default {
  name: 'EmailVerification',
  setup() {
    const userStore = useUserStore();
    return {
      userStore
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

          // 如果用户已登录，更新用户信息
          if (this.userStore.isLoggedIn) {
            await this.userStore.fetchUserInfo();
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
.email-verification-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.verification-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  max-width: 500px;
  width: 100%;
  text-align: center;
}

/* 加载状态 */
.verification-loading {
  padding: 20px 0;
}

.loading-spinner {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 20px;
}

.verification-loading h2 {
  color: #409eff;
  margin-bottom: 10px;
}

.verification-loading p {
  color: #666;
}

/* 成功状态 */
.verification-success {
  padding: 20px 0;
}

.success-icon {
  font-size: 64px;
  color: #67c23a;
  margin-bottom: 20px;
}

.verification-success h2 {
  color: #67c23a;
  margin-bottom: 15px;
}

.verification-success > p {
  color: #666;
  margin-bottom: 30px;
  line-height: 1.6;
}

.success-features {
  text-align: left;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.success-features h3 {
  color: #67c23a;
  margin-bottom: 15px;
  text-align: center;
}

.success-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.success-features li {
  padding: 8px 0;
  color: #666;
  display: flex;
  align-items: center;
}

.success-features li i {
  color: #67c23a;
  margin-right: 10px;
  width: 16px;
}

.success-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

/* 错误状态 */
.verification-error {
  padding: 20px 0;
}

.error-icon {
  font-size: 64px;
  color: #f56c6c;
  margin-bottom: 20px;
}

.verification-error h2 {
  color: #f56c6c;
  margin-bottom: 15px;
}

.error-message {
  color: #666;
  margin-bottom: 20px;
  font-size: 16px;
}

.error-reasons {
  text-align: left;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.error-reasons h3 {
  color: #f56c6c;
  margin-bottom: 15px;
  text-align: center;
}

.error-reasons ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.error-reasons li {
  padding: 5px 0;
  color: #666;
  position: relative;
  padding-left: 20px;
}

.error-reasons li::before {
  content: '•';
  color: #f56c6c;
  position: absolute;
  left: 0;
}

.error-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

/* 重发表单 */
.resend-form {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.resend-form h3 {
  color: #409eff;
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .verification-container {
    padding: 30px 20px;
    margin: 10px;
  }

  .success-actions,
  .error-actions {
    flex-direction: column;
  }

  .success-actions .el-button,
  .error-actions .el-button {
    width: 100%;
  }
}
</style>
