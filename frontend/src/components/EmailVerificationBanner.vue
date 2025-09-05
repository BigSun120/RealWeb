<template>
  <div v-if="shouldShow" class="email-verification-banner">
    <div class="banner-content">
      <div class="banner-icon">
        <i class="fas fa-envelope-open-text"></i>
      </div>
      <div class="banner-message">
        <h4>📧 邮箱验证提醒</h4>
        <p>
          您的邮箱 <strong>{{ userEmail }}</strong> 尚未验证。
          <span class="highlight">验证后可享受完整功能！</span>
        </p>
      </div>
      <div class="banner-actions">
        <el-button
          type="primary"
          size="small"
          :loading="isResending"
          :disabled="!canResend"
          @click="handleResendVerification"
        >
          {{ resendButtonText }}
        </el-button>
        <el-button type="text" size="small" @click="handleDismiss"> 暂时忽略 </el-button>
      </div>
    </div>
    <div class="banner-close">
      <el-button type="text" size="small" @click="handleDismiss">
        <i class="fas fa-times"></i>
      </el-button>
    </div>
  </div>
</template>

<script>
import { useUserStore } from '@/stores/user';
import { useEmailVerificationStore } from '@/stores/emailVerification';

export default {
  name: 'EmailVerificationBanner',
  setup() {
    const userStore = useUserStore();
    const emailVerificationStore = useEmailVerificationStore();

    return {
      userStore,
      emailVerificationStore
    };
  },
  data() {
    return {
      dismissed: false
    };
  },
  computed: {
    shouldShow() {
      return this.emailVerificationStore.needsVerification && !this.dismissed;
    },
    userEmail() {
      return this.userStore.user?.email || '';
    },
    canResend() {
      return this.emailVerificationStore.canResend;
    },
    resendButtonText() {
      return this.emailVerificationStore.resendButtonText;
    },
    isResending() {
      return this.emailVerificationStore.isResending;
    }
  },
  methods: {
    async handleResendVerification() {
      await this.emailVerificationStore.resendVerification(this.userEmail);
    },

    handleDismiss() {
      this.dismissed = true;
      // 保存到本地存储，避免频繁显示
      localStorage.setItem('emailVerificationBannerDismissed', Date.now().toString());
    },

    checkDismissedStatus() {
      const dismissedTime = localStorage.getItem('emailVerificationBannerDismissed');
      if (dismissedTime) {
        const timeDiff = Date.now() - parseInt(dismissedTime);
        // 如果距离上次忽略超过24小时，重新显示
        if (timeDiff < 24 * 60 * 60 * 1000) {
          this.dismissed = true;
        }
      }
    }
  },

  mounted() {
    this.checkDismissedStatus();
    // 初始化邮箱验证 store
    this.emailVerificationStore.initialize();
  }
};
</script>

<style scoped>
.email-verification-banner {
  background: linear-gradient(135deg, #e7f3ff 0%, #f0f9ff 100%);
  border: 1px solid #b3d8ff;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.banner-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.banner-icon {
  margin-right: 16px;
  color: #409eff;
  font-size: 24px;
}

.banner-message {
  flex: 1;
  margin-right: 16px;
}

.banner-message h4 {
  margin: 0 0 4px 0;
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
}

.banner-message p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.highlight {
  color: #409eff;
  font-weight: 500;
}

.banner-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.banner-close {
  margin-left: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .email-verification-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .banner-icon {
    margin-bottom: 8px;
  }

  .banner-message {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .banner-actions {
    justify-content: flex-start;
  }

  .banner-close {
    position: absolute;
    top: 8px;
    right: 8px;
    margin: 0;
  }
}
</style>
