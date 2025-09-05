<template>
  <div class="verification-pending-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      <div class="floating-shape shape-4"></div>
    </div>

    <div class="pending-container">
      <!-- 左侧装饰区域 -->
      <div class="decoration-section">
        <div class="decoration-content">
          <div class="pending-icon">
            <i class="fas fa-envelope-open-text"></i>
          </div>
          <h2 class="decoration-title">邮箱验证</h2>
          <p class="decoration-subtitle">安全验证，保护您的账户</p>

          <div class="features-list">
            <div class="feature-item">
              <i class="fas fa-shield-alt"></i>
              <span>账户安全保护</span>
            </div>
            <div class="feature-item">
              <i class="fas fa-check-circle"></i>
              <span>快速验证流程</span>
            </div>
            <div class="feature-item">
              <i class="fas fa-envelope"></i>
              <span>邮件通知服务</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div class="content-section">
        <div class="content-container">
          <div class="content-header">
            <h2 class="content-title">请验证您的邮箱</h2>
            <p class="content-subtitle">我们已向您的邮箱发送验证链接</p>
          </div>

          <div class="pending-message">
            <p>验证邮件已发送至：</p>
            <div class="email-highlight">{{ email }}</div>
            <p>请检查您的邮箱（包括垃圾邮件文件夹），并点击邮件中的验证链接来激活您的账户。</p>
          </div>

          <div class="verification-steps">
            <h3>验证步骤：</h3>
            <ol>
              <li>
                <i class="fas fa-inbox"></i>
                <span>打开您的邮箱应用或网页版邮箱</span>
              </li>
              <li>
                <i class="fas fa-search"></i>
                <span>查找来自我们的验证邮件（检查垃圾邮件文件夹）</span>
              </li>
              <li>
                <i class="fas fa-mouse-pointer"></i>
                <span>点击邮件中的"验证邮箱"按钮</span>
              </li>
              <li>
                <i class="fas fa-check-circle"></i>
                <span>完成验证，开始使用完整功能</span>
              </li>
            </ol>
          </div>

          <div class="pending-actions">
            <el-button
              class="resend-button"
              size="large"
              :loading="resending"
              :disabled="!canResend"
              @click="handleResendVerification"
            >
              <i class="fas fa-paper-plane"></i>
              {{ resendButtonText }}
            </el-button>

            <div class="login-link">
              <span>稍后验证？</span>
              <router-link to="/auth/login" class="link">
                先登录
                <i class="fas fa-arrow-right"></i>
              </router-link>
            </div>
          </div>

          <div class="help-section">
            <el-collapse>
              <el-collapse-item title="🤔 没有收到邮件？" name="help">
                <div class="help-content">
                  <h4>请尝试以下解决方案：</h4>
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

          <div class="email-info">
            <p class="info-text">
              <i class="fas fa-info-circle"></i>
              验证链接有效期为 24 小时，请尽快完成验证。
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { resendVerificationEmail } from '@/api/auth';

export default {
  name: 'VerificationPending',
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
.verification-pending-page {
  min-height: 100vh;
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 80px;
  height: 80px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 120px;
  height: 120px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.shape-3 {
  width: 60px;
  height: 60px;
  bottom: 30%;
  left: 20%;
  animation-delay: 4s;
}

.shape-4 {
  width: 100px;
  height: 100px;
  top: 10%;
  right: 30%;
  animation-delay: 1s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.pending-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 1000px;
  width: 100%;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 左侧装饰区域 */
.decoration-section {
  flex: 1;
  background: linear-gradient(135deg, #e17055 0%, #d63031 100%);
  color: white;
  padding: 60px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.decoration-content {
  text-align: center;
  width: 100%;
}

.pending-icon {
  font-size: 64px;
  color: white;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.decoration-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
  color: white;
}

.decoration-subtitle {
  font-size: 18px;
  margin-bottom: 40px;
  opacity: 0.9;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 40px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 16px;
  opacity: 0.9;
}

.feature-item i {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

/* 右侧内容区域 */
.content-section {
  flex: 1;
  background: white;
  padding: 60px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-container {
  width: 100%;
  max-width: 480px;
  padding: 0 15px;
}

.content-header {
  text-align: center;
  margin-bottom: 40px;
}

.content-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.content-subtitle {
  color: #ffffff;
  font-size: 16px;
  margin: 0;
}

.pending-message {
  margin-bottom: 30px;
  line-height: 1.6;
  text-align: center;
}

.pending-message p {
  color: #6b7280;
  margin-bottom: 12px;
  font-size: 16px;
}

.email-highlight {
  display: inline-block;
  color: #e17055;
  background: rgba(225, 112, 85, 0.1);
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  margin: 8px 0;
  border: 2px solid rgba(225, 112, 85, 0.2);
}

.verification-steps {
  text-align: left;
  background: #f8fafb;
  border-radius: 12px;
  padding: 25px;
  margin: 30px 0;
  border: 1px solid #e5e7eb;
}

.verification-steps h3 {
  color: #1f2937;
  margin-bottom: 20px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.verification-steps ol {
  list-style: none;
  padding: 0;
  counter-reset: step-counter;
}

.verification-steps li {
  counter-increment: step-counter;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  position: relative;
  padding-left: 40px;
}

.verification-steps li::before {
  content: counter(step-counter);
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #e17055;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.verification-steps li i {
  color: #e17055;
  margin-right: 10px;
  width: 16px;
}

.verification-steps li span {
  color: #4b5563;
  font-size: 14px;
}

.pending-actions {
  margin: 30px 0;
  text-align: center;
}

.resend-button {
  width: 100%;
  height: 50px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #e17055 0%, #d63031 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(225, 112, 85, 0.3);
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.resend-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(225, 112, 85, 0.4);
}

.resend-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-link {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.login-link .link {
  color: #e17055;
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
  transition: all 0.3s ease;
}

.login-link .link:hover {
  color: #d63031;
  text-decoration: underline;
}

.help-section {
  margin: 30px 0;
  text-align: left;
}

.help-content h4 {
  color: #e17055;
  margin-bottom: 15px;
  font-size: 16px;
}

.help-content ul {
  list-style: none;
  padding: 0;
}

.help-content li {
  padding: 8px 0;
  color: #4b5563;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}

.help-content li:last-child {
  border-bottom: none;
}

.help-content strong {
  color: #e17055;
}

.email-info {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.info-text {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.info-text i {
  color: #e17055;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .verification-pending-page {
    padding: 15px;
  }

  .pending-container {
    flex-direction: column;
    margin: 0;
    border-radius: 16px;
    max-height: calc(100vh - 30px);
    overflow-y: auto;
  }

  .decoration-section {
    padding: 30px 20px;
    min-height: auto;
    flex: none;
  }

  .decoration-title {
    font-size: 28px;
  }

  .decoration-subtitle {
    font-size: 16px;
  }

  .content-section {
    padding: 30px 20px;
    flex: none;
  }

  .content-title {
    font-size: 24px;
  }

  .features-list {
    display: none;
  }

  .content-container {
    max-width: 100%;
    padding: 0;
  }

  .verification-steps {
    padding: 20px;
  }

  .verification-steps li {
    padding-left: 35px;
  }
}

@media (max-width: 480px) {
  .verification-pending-page {
    padding: 10px;
    height: 100vh;
    overflow: hidden;
  }

  .pending-container {
    margin: 0;
    border-radius: 12px;
    max-height: calc(100vh - 20px);
  }

  .decoration-section {
    padding: 25px 15px;
  }

  .content-section {
    padding: 25px 15px;
  }

  .decoration-title {
    font-size: 24px;
  }

  .content-title {
    font-size: 22px;
  }

  .verification-steps {
    padding: 15px;
  }
}
</style>
