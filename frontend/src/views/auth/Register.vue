<template>
  <div class="register-page">
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
      <div class="decoration-circle circle-4"></div>
      <div class="decoration-circle circle-5"></div>

      <!-- 几何图形装饰 -->
      <div class="geometric-shape shape-1"></div>
      <div class="geometric-shape shape-2"></div>
      <div class="geometric-shape shape-3"></div>

      <!-- 渐变光斑 -->
      <div class="gradient-blob blob-1"></div>
      <div class="gradient-blob blob-2"></div>
    </div>

    <div class="register-container">
      <!-- 左侧欢迎区域 -->
      <div class="welcome-section">
        <div class="welcome-content">
          <div class="welcome-icon">
            <i class="fas fa-user-plus"></i>
          </div>
          <h1 class="welcome-title">加入我们</h1>
          <p class="welcome-subtitle">创建您的账户，开始精彩的旅程</p>

          <div class="features-list">
            <div class="feature-item">
              <i class="fas fa-check-circle"></i>
              <span>发表文章，分享见解</span>
            </div>
            <div class="feature-item">
              <i class="fas fa-check-circle"></i>
              <span>参与讨论，互动交流</span>
            </div>
            <div class="feature-item">
              <i class="fas fa-check-circle"></i>
              <span>使用实用工具</span>
            </div>
            <div class="feature-item">
              <i class="fas fa-check-circle"></i>
              <span>个性化定制体验</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧注册表单 -->
      <div class="form-section">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">创建账户</h2>
            <p class="form-subtitle">填写以下信息完成注册</p>
          </div>

          <el-form :model="form" :rules="rules" ref="formRef" class="register-form" size="large">
            <el-form-item prop="username" class="form-item">
              <div class="input-wrapper">
                <div class="input-icon">
                  <i class="fas fa-user"></i>
                </div>
                <el-input v-model="form.username" placeholder="用户名" class="custom-input" />
              </div>
              <div class="input-hint">
                <i class="fas fa-info-circle"></i>
                用于登录，仅支持字母、数字、下划线
              </div>
            </el-form-item>

            <el-form-item prop="displayName" class="form-item">
              <div class="input-wrapper">
                <div class="input-icon">
                  <i class="fas fa-id-card"></i>
                </div>
                <el-input
                  v-model="form.displayName"
                  placeholder="显示名称（可选）"
                  class="custom-input"
                />
              </div>
              <div class="input-hint">
                <i class="fas fa-info-circle"></i>
                支持中文、空格、emoji，用于展示
              </div>
            </el-form-item>

            <el-form-item prop="email" class="form-item">
              <div class="input-wrapper">
                <div class="input-icon">
                  <i class="fas fa-envelope"></i>
                </div>
                <el-input v-model="form.email" placeholder="邮箱地址" class="custom-input" />
              </div>
              <div class="input-hint">
                <i class="fas fa-info-circle"></i>
                用于接收验证邮件和重要通知
              </div>
            </el-form-item>

            <el-form-item prop="password" class="form-item">
              <div class="input-wrapper">
                <div class="input-icon">
                  <i class="fas fa-lock"></i>
                </div>
                <el-input
                  v-model="form.password"
                  type="password"
                  placeholder="密码"
                  class="custom-input"
                  show-password
                />
              </div>
              <div class="input-hint">
                <i class="fas fa-info-circle"></i>
                建议使用8位以上包含字母数字的密码
              </div>
            </el-form-item>

            <el-form-item class="form-item submit-item">
              <el-button
                type="primary"
                @click="handleRegister"
                :loading="loading"
                class="register-button"
                size="large"
              >
                <i class="fas fa-user-plus" v-if="!loading"></i>
                {{ loading ? '注册中...' : '创建账户' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="form-footer">
            <div class="login-link">
              <span>已有账号？</span>
              <router-link to="/auth/login" class="link">
                立即登录
                <i class="fas fa-arrow-right"></i>
              </router-link>
            </div>

            <div class="terms-notice">
              <p>
                <i class="fas fa-shield-alt"></i>
                注册即表示您同意我们的服务条款和隐私政策
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

export default {
  name: 'Register',
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const formRef = ref();
    const loading = ref(false);

    const form = ref({
      username: '',
      displayName: '',
      email: '',
      password: ''
    });

    const rules = {
      username: [{ required: true, message: '请输入账号名', trigger: 'blur' }],
      // displayName 可选，不强制
      email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
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

    return {
      form,
      rules,
      formRef,
      loading,
      handleRegister
    };
  }
};
</script>

<style scoped>
.register-page {
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
.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 8s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -10%;
  left: -5%;
  background: rgba(255, 182, 193, 0.2);
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  top: 20%;
  right: -5%;
  background: rgba(255, 218, 185, 0.2);
  animation-delay: 2s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: 10%;
  left: 15%;
  background: rgba(255, 192, 203, 0.2);
  animation-delay: 4s;
}

.circle-4 {
  width: 120px;
  height: 120px;
  top: 70%;
  right: 20%;
  background: rgba(255, 160, 122, 0.15);
  animation-delay: 1s;
}

.circle-5 {
  width: 80px;
  height: 80px;
  top: 40%;
  left: 5%;
  background: rgba(255, 228, 225, 0.3);
  animation-delay: 3s;
}

/* 几何图形装饰 */
.geometric-shape {
  position: absolute;
  animation: rotate 12s linear infinite;
}

.shape-1 {
  width: 60px;
  height: 60px;
  background: rgba(255, 107, 107, 0.1);
  transform: rotate(45deg);
  top: 15%;
  right: 25%;
  animation-delay: 0s;
}

.shape-2 {
  width: 40px;
  height: 40px;
  background: rgba(238, 90, 36, 0.1);
  border-radius: 20% 80% 20% 80%;
  bottom: 30%;
  right: 10%;
  animation-delay: 4s;
}

.shape-3 {
  width: 50px;
  height: 50px;
  background: rgba(255, 182, 193, 0.15);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  top: 80%;
  left: 30%;
  animation-delay: 2s;
}

/* 渐变光斑 */
.gradient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  animation: pulse 6s ease-in-out infinite;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 107, 107, 0.3) 0%, transparent 70%);
  top: -20%;
  right: -20%;
  animation-delay: 0s;
}

.blob-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 182, 193, 0.2) 0%, transparent 70%);
  bottom: -15%;
  left: -15%;
  animation-delay: 3s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(180deg);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.5;
  }
}

/* 主容器 */
.register-container {
  display: flex;
  max-width: 1200px;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  position: relative;
  z-index: 2;
  min-height: 600px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 左侧欢迎区域 */
.welcome-section {
  flex: 1;
  background: linear-gradient(135deg, #e17055 0%, #d63031 100%);
  color: white;
  padding: 60px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.welcome-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.welcome-content {
  text-align: center;
  position: relative;
  z-index: 1;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.9;
}

.welcome-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.welcome-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 40px;
  line-height: 1.6;
}

.features-list {
  text-align: left;
  max-width: 300px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  opacity: 0.9;
}

.feature-item i {
  color: #ffeaa7;
  margin-right: 12px;
  font-size: 18px;
}

/* 右侧表单区域 */
.form-section {
  flex: 1;
  padding: 60px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-container {
  width: 100%;
  max-width: 480px;
  padding: 0 15px;
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.form-subtitle {
  color: #fcfcfc;
  font-size: 16px;
  margin: 0;
}

/* 表单样式 */
.register-form {
  margin-bottom: 30px;
}

.form-item {
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  z-index: 10;
  color: #6b7280;
  font-size: 16px;
}

.custom-input :deep(.el-input__wrapper) {
  padding-left: 48px;
  padding-right: 16px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  box-shadow: none;
  transition: all 0.3s ease;
  background: #f9fafb;
  min-height: 48px;
  min-width: 450px;
}

.custom-input :deep(.el-input__wrapper:hover) {
  border-color: #e17055;
  background: white;
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  border-color: #e17055;
  background: white;
  box-shadow: 0 0 0 3px rgba(225, 112, 85, 0.1);
}

.custom-input :deep(.el-input__inner) {
  font-size: 16px;
  color: #1f2937;
}

.custom-input :deep(.el-input__inner::placeholder) {
  color: #9ca3af;
}

.input-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-hint i {
  font-size: 10px;
}

.submit-item {
  margin-top: 32px;
  margin-bottom: 0;
}

.register-button {
  width: 100%;
  height: 50px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #e17055 0%, #d63031 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(225, 112, 85, 0.3);
  transition: all 0.3s ease;
}

.register-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(225, 112, 85, 0.4);
}

.register-button:active {
  transform: translateY(0);
}

.register-button i {
  margin-right: 8px;
}

/* 表单底部 */
.form-footer {
  text-align: center;
}

.login-link {
  margin-bottom: 20px;
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

.login-link .link i {
  margin-left: 4px;
  font-size: 12px;
  transition: transform 0.3s ease;
}

.login-link .link:hover i {
  transform: translateX(2px);
}

.terms-notice {
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.terms-notice p {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.terms-notice i {
  color: #00b894;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .register-page {
    padding: 15px;
  }

  .register-container {
    flex-direction: column;
    margin: 0;
    border-radius: 16px;
    max-height: calc(100vh - 30px);
    overflow-y: auto;
  }

  .welcome-section {
    padding: 30px 20px;
    min-height: auto;
    flex: none;
  }

  .welcome-title {
    font-size: 28px;
  }

  .welcome-subtitle {
    font-size: 16px;
  }

  .form-section {
    padding: 30px 20px;
    flex: none;
  }

  .form-title {
    font-size: 24px;
  }

  .features-list {
    display: none;
  }

  .form-container {
    max-width: 100%;
    padding: 0;
  }
}

@media (max-width: 480px) {
  .register-page {
    padding: 10px;
    height: 100vh;
    overflow: hidden;
  }

  .register-container {
    margin: 0;
    border-radius: 12px;
    max-height: calc(100vh - 20px);
  }

  .welcome-section {
    padding: 25px 15px;
  }

  .form-section {
    padding: 25px 15px;
  }

  .custom-input :deep(.el-input__wrapper) {
    padding-left: 44px;
  }

  .input-icon {
    left: 14px;
  }

  .welcome-title {
    font-size: 24px;
  }

  .form-title {
    font-size: 22px;
  }
}
</style>
