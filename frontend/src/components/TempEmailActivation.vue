<template>
  <div class="temp-email-activation">
    <div class="activation-content">
        <!-- 说明信息 -->
        <div class="info-section">
          <el-alert
            title="权限说明"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>临时邮箱功能需要激活后才能使用。请输入管理员提供的激活验证码。</p>
              <ul class="feature-list">
                <li>✅ 生成临时邮箱地址</li>
                <li>✅ 接收和查看邮件</li>
                <li>✅ 管理邮箱和邮件</li>
                <li>✅ 发送测试邮件</li>
              </ul>
            </template>
          </el-alert>
        </div>

        <!-- 激活码输入 -->
        <div class="activation-form">
          <el-form
            ref="activationFormRef"
            :model="activationForm"
            :rules="activationRules"
            label-width="120px"
            @submit.prevent="handleActivate"
          >
            <el-form-item label="激活验证码" prop="activationCode">
              <el-input
                v-model="activationForm.activationCode"
                placeholder="请输入激活验证码"
                size="large"
                :maxlength="50"
                show-word-limit
                clearable
                @keyup.enter="handleActivate"
              >
                <template #prepend>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
              <div class="input-tip">
                激活验证码由管理员提供，请确保输入正确
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="activating"
                @click="handleActivate"
                class="activate-btn"
              >
                <el-icon v-if="!activating"><Unlock /></el-icon>
                {{ activating ? '激活中...' : '激活权限' }}
              </el-button>
              <el-button
                size="large"
                @click="$emit('cancel')"
                class="cancel-btn"
              >
                取消
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 帮助信息 -->
        <div class="help-section">
          <el-collapse>
            <el-collapse-item title="❓ 如何获取激活验证码？" name="1">
              <p>激活验证码由网站管理员生成和分发。您可以通过以下方式获取：</p>
              <ul>
                <li>联系网站管理员</li>
                <li>查看相关通知或公告</li>
                <li>通过官方渠道申请</li>
              </ul>
            </el-collapse-item>
            <el-collapse-item title="🔒 激活码使用说明" name="2">
              <p>关于激活验证码的重要说明：</p>
              <ul>
                <li>每个激活码可能有使用次数限制</li>
                <li>激活码可能有有效期限制</li>
                <li>激活成功后权限可能有使用期限</li>
                <li>请妥善保管您的激活码</li>
              </ul>
            </el-collapse-item>
            <el-collapse-item title="⚠️ 常见问题" name="3">
              <p>如果遇到以下问题，请检查：</p>
              <ul>
                <li><strong>激活码无效</strong>：检查输入是否正确，是否过期</li>
                <li><strong>已达使用上限</strong>：该激活码已被使用完毕</li>
                <li><strong>网络错误</strong>：检查网络连接，稍后重试</li>
              </ul>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Unlock } from '@element-plus/icons-vue'
import { tempEmailAuthApi } from '@/api/tempEmailAuth'

// 定义事件
const emit = defineEmits(['success', 'cancel'])

// 响应式数据
const activationFormRef = ref()
const activating = ref(false)

const activationForm = reactive({
  activationCode: ''
})

const activationRules = {
  activationCode: [
    { required: true, message: '请输入激活验证码', trigger: 'blur' },
    { min: 6, message: '激活验证码至少6个字符', trigger: 'blur' },
    { max: 50, message: '激活验证码最多50个字符', trigger: 'blur' }
  ]
}

// 处理激活
const handleActivate = async () => {
  try {
    // 表单验证
    const valid = await activationFormRef.value.validate()
    if (!valid) return

    activating.value = true

    // 调用激活API
    const response = await tempEmailAuthApi.activateAccess(activationForm.activationCode)

    if (response.success) {
      ElMessage.success('临时邮箱权限激活成功！')

      // 发送成功事件
      emit('success', {
        activatedAt: response.data.activatedAt,
        expiresAt: response.data.expiresAt
      })
    } else {
      ElMessage.error(response.message || '激活失败')
    }

  } catch (error) {
    console.error('激活失败:', error)
    
    // 处理不同类型的错误
    const errorMessage = error.response?.data?.message || error.message || '激活失败'
    const errorCode = error.response?.data?.code

    switch (errorCode) {
      case 'INVALID_ACTIVATION_CODE':
        ElMessage.error('激活验证码无效或已过期，请检查后重试')
        break
      case 'ACTIVATION_CODE_EXHAUSTED':
        ElMessage.error('该激活验证码已达到使用上限')
        break
      case 'ALREADY_ACTIVATED':
        ElMessage.warning('您已经拥有临时邮箱权限')
        emit('success')
        break
      default:
        ElMessage.error(errorMessage)
    }
  } finally {
    activating.value = false
  }
}
</script>

<style scoped>
.temp-email-activation {
  width: 100%;
}

.activation-content {
  padding: 0;
}

.info-section {
  margin-bottom: 32px;
}

.feature-list {
  margin: 16px 0 0 0;
  padding-left: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.feature-list li {
  margin: 0;
  padding: 12px 16px;
  color: #48bb78;
  font-size: 14px;
  background: rgba(72, 187, 120, 0.1);
  border-radius: 8px;
  border-left: 3px solid #48bb78;
  font-weight: 500;
}

.activation-form {
  margin-bottom: 32px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.input-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.activate-btn {
  width: 140px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  border: none;
  border-radius: 12px;
  margin-right: 16px;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
  transition: all 0.3s ease;
}

.activate-btn:hover {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(72, 187, 120, 0.4);
}

.cancel-btn {
  width: 100px;
  height: 48px;
  font-size: 16px;
  border-radius: 12px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  color: #4a5568;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: #edf2f7;
  transform: translateY(-1px);
}

.help-section {
  border-top: 1px solid #ebeef5;
  padding-top: 24px;
}

.help-section :deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #2c3e50;
}

.help-section :deep(.el-collapse-item__content) {
  color: #606266;
  line-height: 1.6;
}

.help-section ul {
  margin: 8px 0;
  padding-left: 20px;
}

.help-section li {
  margin: 4px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .temp-email-activation {
    padding: 10px;
    min-height: 50vh;
  }

  .activation-card {
    max-width: 100%;
  }

  .card-header h3 {
    font-size: 18px;
  }

  .activate-btn,
  .cancel-btn {
    width: 100%;
    margin: 8px 0;
  }

  .activate-btn {
    margin-right: 0;
  }
}
</style>
