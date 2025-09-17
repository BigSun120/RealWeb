<template>
  <div class="verification-pending-container" :style="containerBackgroundStyle">
    <div class="verification-pending-wrapper">
      <div class="verification-pending-card">
        <div class="pending-header">
          <div class="pending-icon">
            <i class="el-icon-message"></i>
          </div>
          <h3>请验证您的邮箱</h3>
          <p>我们已向您的邮箱发送验证链接</p>
        </div>

        <div class="pending-content">
          <div class="email-info">
            <p>验证邮件已发送至：</p>
            <div class="email-highlight">{{ email }}</div>
            <p>请检查您的邮箱（包括垃圾邮件文件夹），并点击邮件中的验证链接来激活您的账户</p>
          </div>

          <div class="features-list">
            <div class="feature-item">
              <i class="el-icon-shield"></i>
              <span>账户安全保护</span>
            </div>
            <div class="feature-item">
              <i class="el-icon-check"></i>
              <span>快速验证流程</span>
            </div>
            <div class="feature-item">
              <i class="el-icon-message"></i>
              <span>邮件通知服务</span>
            </div>
          </div>

          <div class="verification-steps">
            <h4>验证步骤：</h4>
            <ol>
              <li>
                <i class="el-icon-folder-opened"></i>
                <span>打开您的邮箱应用或网页版邮箱</span>
              </li>
              <li>
                <i class="el-icon-search"></i>
                <span>查找来自我们的验证邮件（检查垃圾邮件文件夹）</span>
              </li>
              <li>
                <i class="el-icon-mouse"></i>
                <span>点击邮件中的"验证邮箱"按钮</span>
              </li>
              <li>
                <i class="el-icon-check"></i>
                <span>完成验证，开始使用完整功能</span>
              </li>
            </ol>
          </div>

          <div class="action-buttons">
            <el-button
              type="primary"
              :loading="resending"
              :disabled="!canResend"
              @click="handleResendVerification"
            >
              {{ resendButtonText }}
            </el-button>

            <div class="login-link">
              <span>稍后验证？</span>
              <router-link to="/auth/login" class="link">
                先登录
              </router-link>
            </div>
          </div>

          <div class="help-section">
            <el-collapse>
              <el-collapse-item title="没有收到邮件？" name="help">
                <div class="help-content">
                  <h5>请尝试以下解决方案：</h5>
                  <ul>
                    <li><strong>检查垃圾邮件文件夹</strong> - 验证邮件可能被误判为垃圾邮件</li>
                    <li><strong>检查邮箱地址</strong> - 确认注册时填写的邮箱地址正确</li>
                    <li><strong>等待几分钟</strong> - 邮件发送可能需要一些时间</li>
                    <li><strong>重新发送</strong> - 点击上方的"重新发送验证邮件"按钮</li>
                    <li><strong>联系客服</strong> - 如果问题持续存在，请联系我们的技术支持</li>
                  </ul>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div class="info-notice">
            <p>
              <i class="el-icon-info"></i>
              验证链接有效期为 24 小时，请尽快完成验证
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted } from 'vue';
import { resendVerificationEmail } from '@/api/auth';
import { useGlobalBackgroundManager } from '@/composables/useBackgroundManager';

export default {
  name: 'VerificationPending',
  setup() {
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
      containerBackgroundStyle
    };
  },
  data() {
    return {
      resending: false,
      cooldownTime: 0,
      cooldownTimer: null
    };
  },

  computed: {
    email() {
      return this.$route.query.email || '';
    },

    canResend() {
      return this.cooldownTime === 0;
    },

    resendButtonText() {
      if (this.resending) {
        return '发送中...';
      }
      if (this.cooldownTime > 0) {
        return `${this.cooldownTime}秒后可重发`;
      }
      return '重新发送验证邮件';
    }
  },

  methods: {
    async handleResendVerification() {
      if (!this.canResend || this.resending || !this.email) {
        return;
      }

      this.resending = true;

      try {
        await resendVerificationEmail(this.email);

        this.$message.success('验证邮件已重新发送，请检查您的邮箱');

        // 开始冷却倒计时（5分钟）
        this.startCooldown(300);
      } catch (error) {
        console.error('重发验证邮件失败:', error);
        this.$message.error(error.response?.data?.message || '发送失败，请稍后重试');
      } finally {
        this.resending = false;
      }
    },

    startCooldown(seconds) {
      this.cooldownTime = seconds;
      this.cooldownTimer = setInterval(() => {
        this.cooldownTime--;
        if (this.cooldownTime <= 0) {
          clearInterval(this.cooldownTimer);
          this.cooldownTimer = null;
        }
      }, 1000);
    },

    goToLogin() {
      this.$router.push('/auth/login');
    }
  },

  beforeDestroy() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  },

  mounted() {
    // 如果没有邮箱信息，跳转到注册页面
    if (!this.email) {
      this.$message.warning('请先完成注册');
      this.$router.push('/auth/register');
    }
  }
};
</script>

<style scoped>
.verification-pending-container {
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

.verification-pending-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.verification-pending-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 2;
  text-align: center;
}

/* 页面头部 */
.pending-header {
  margin-bottom: 32px;
}

.pending-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 32px;
  color: white;
  box-shadow: 0 8px 16px rgba(255, 126, 95, 0.3);
}

.pending-header h3 {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
}

.pending-header p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

/* 内容区域 */
.pending-content {
  text-align: left;
}

.email-info {
  background: rgba(255, 126, 95, 0.1);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
}

.email-info p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 8px 0;
}

.email-highlight {
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  margin: 8px 0;
  display: inline-block;
}

/* 功能列表 */
.features-list {
  margin: 24px 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: #2c3e50;
  font-size: 14px;
}

.feature-item i {
  font-size: 16px;
  color: #ff7e5f;
  width: 20px;
}

/* 验证步骤 */
.verification-steps {
  background: rgba(52, 152, 219, 0.1);
  border-radius: 8px;
  padding: 20px;
  margin: 24px 0;
}

.verification-steps h4 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  text-align: center;
}

.verification-steps ol {
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step-counter;
}

.verification-steps li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: #2c3e50;
  font-size: 14px;
  counter-increment: step-counter;
  position: relative;
}

.verification-steps li::before {
  content: counter(step-counter);
  background: linear-gradient(135deg, #3498db, #5dade2);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.verification-steps li i {
  color: #3498db;
  font-size: 16px;
  width: 20px;
}

/* 按钮和链接 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 24px 0;
}

.action-buttons .el-button {
  width: 100%;
}

.login-link {
  text-align: center;
  margin-top: 16px;
}

.login-link span {
  color: #7f8c8d;
  font-size: 14px;
  margin-right: 8px;
}

.login-link .link {
  color: #ff7e5f;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.3s ease;
}

.login-link .link:hover {
  color: #e55a4f;
}

/* 帮助部分 */
.help-section {
  margin: 24px 0;
}

.help-content h5 {
  color: #2c3e50;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.help-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-content li {
  padding: 8px 0;
  color: #7f8c8d;
  font-size: 13px;
  line-height: 1.4;
}

.help-content strong {
  color: #ff7e5f;
}

/* 信息提示 */
.info-notice {
  background: rgba(52, 152, 219, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
  text-align: center;
}

.info-notice p {
  color: #3498db;
  font-size: 13px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.info-notice i {
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .verification-pending-card {
    padding: 32px 24px;
    margin: 16px;
    max-width: none;
  }

  .pending-icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }

  .pending-header h3 {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .verification-pending-card {
    padding: 24px 20px;
    margin: 12px;
  }

  .action-buttons {
    gap: 12px;
  }

  .verification-steps {
    padding: 16px;
  }

  .verification-steps li {
    padding: 8px 0;
    font-size: 13px;
  }

  .verification-steps li::before {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
}
</style>
