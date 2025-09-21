<template>
  <div class="password-change">
    <div class="security-level-info" v-if="securityConfig">
      <div class="level-badge" :class="`level-${securityConfig.level}`">
        {{ securityConfig.name }}
      </div>
      <p class="level-desc">{{ securityConfig.description }}</p>
    </div>

      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="120px"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="form.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
            clearable
            @input="checkPasswordStrength"
          />
          <div class="password-strength" v-if="form.newPassword">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="strengthClass"
                :style="{ width: strengthWidth }"
              ></div>
            </div>
            <span class="strength-text" :class="strengthClass">
              {{ strengthText }}
            </span>
          </div>
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            @click="handleSubmit"
            :loading="loading"
            style="width: 100%"
          >
            <el-icon><Check /></el-icon>
            修改密码
          </el-button>
        </el-form-item>
      </el-form>

    <div class="password-tips" v-if="securityConfig">
      <h4>当前安全要求：</h4>
      <ul>
        <li>密码长度至少{{ securityConfig.rules.minLength }}位</li>
        <li v-if="securityConfig.rules.requireUppercase">必须包含大写字母</li>
        <li v-if="securityConfig.rules.requireLowercase">必须包含小写字母</li>
        <li v-if="securityConfig.rules.requireNumbers">必须包含数字</li>
        <li v-if="securityConfig.rules.requireSymbols">必须包含特殊字符</li>
        <li v-if="securityConfig.rules.forbidCommon">不能使用常见密码</li>
        <li v-if="securityConfig.rules.forbidPersonalInfo">不能包含个人信息</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Lock, Check } from '@element-plus/icons-vue';
import api from '@/api';

export default {
  name: 'PasswordChange',
  components: {
    Lock,
    Check
  },
  emits: ['password-changed'],
  setup(_, { emit }) {
    const formRef = ref();
    const loading = ref(false);
    const passwordStrength = ref(0);
    const securityConfig = ref(null);

    const form = ref({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    // 表单验证规则
    const rules = {
      currentPassword: [
        { required: true, message: '请输入当前密码', trigger: 'blur' }
      ],
      newPassword: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, message: '密码长度至少为6位', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value && value === form.value.currentPassword) {
              callback(new Error('新密码不能与当前密码相同'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ],
      confirmPassword: [
        { required: true, message: '请确认新密码', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value && value !== form.value.newPassword) {
              callback(new Error('两次输入的密码不一致'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ]
    };

    // 检查密码强度
    const checkPasswordStrength = () => {
      const password = form.value.newPassword;
      let strength = 0;

      if (password.length >= 6) strength += 1;
      if (password.length >= 8) strength += 1;
      if (/[a-z]/.test(password)) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^A-Za-z0-9]/.test(password)) strength += 1;

      passwordStrength.value = strength;
    };

    // 密码强度样式
    const strengthClass = computed(() => {
      if (passwordStrength.value <= 2) return 'weak';
      if (passwordStrength.value <= 4) return 'medium';
      return 'strong';
    });

    const strengthWidth = computed(() => {
      return `${(passwordStrength.value / 6) * 100}%`;
    });

    const strengthText = computed(() => {
      if (passwordStrength.value <= 2) return '弱';
      if (passwordStrength.value <= 4) return '中等';
      return '强';
    });

    // 提交表单
    const handleSubmit = async () => {
      if (!formRef.value) return;

      const valid = await formRef.value.validate();
      if (!valid) return;

      loading.value = true;

      try {
        await api.put('/users/password', form.value);

        ElMessage.success('密码修改成功');
        emit('password-changed');

        // 清空表单
        form.value = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        passwordStrength.value = 0;

        // 重置表单验证状态
        formRef.value.resetFields();

      } catch (error) {
        console.error('密码修改失败:', error);
        ElMessage.error(error.response?.data?.message || '密码修改失败');
      } finally {
        loading.value = false;
      }
    };

    // 获取安全配置
    const fetchSecurityConfig = async () => {
      try {
        const response = await api.get('/security/config');
        securityConfig.value = response.data.data;

        // 更新验证规则
        updateValidationRules();
      } catch (error) {
        console.error('获取安全配置失败:', error);
      }
    };

    // 更新验证规则
    const updateValidationRules = () => {
      if (!securityConfig.value) return;

      const config = securityConfig.value;
      rules.newPassword[1].min = config.rules.minLength;
      rules.newPassword[1].message = `密码长度至少为${config.rules.minLength}位`;
    };

    // 组件挂载时获取配置
    onMounted(() => {
      fetchSecurityConfig();
    });

    return {
      form,
      rules,
      formRef,
      loading,
      securityConfig,
      strengthClass,
      strengthWidth,
      strengthText,
      checkPasswordStrength,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.password-change {
  width: 100%;
}

.security-level-info {
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 8px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.level-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.level-badge.level-low {
  background: #e8f5e8;
  color: #52c41a;
}

.level-badge.level-medium {
  background: #fff7e6;
  color: #fa8c16;
}

.level-badge.level-high {
  background: #fff1f0;
  color: #f5222d;
}

.level-desc {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  width: 100%;
  height: 4px;
  background-color: #f0f0f0;
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
  background-color: #f56c6c;
}

.strength-fill.medium {
  background-color: #e6a23c;
}

.strength-fill.strong {
  background-color: #67c23a;
}

.strength-text {
  font-size: 12px;
  font-weight: 500;
}

.strength-text.weak {
  color: #f56c6c;
}

.strength-text.medium {
  color: #e6a23c;
}

.strength-text.strong {
  color: #67c23a;
}

.password-tips {
  margin-top: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.password-tips h4 {
  margin: 0 0 12px 0;
  color: #409eff;
  font-size: 14px;
}

.password-tips ul {
  margin: 0;
  padding-left: 20px;
}

.password-tips li {
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}
</style>
