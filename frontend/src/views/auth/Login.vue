<template>
  <div class="login">
    <div class="login-form">
      <h2>登录</h2>
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="identifier">
          <el-input v-model="form.identifier" placeholder="邮箱或用户名" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <p>
        还没有账号？
        <router-link to="/auth/register">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

export default {
  name: 'Login',
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const formRef = ref();
    const loading = ref(false);

    const form = ref({
      identifier: '',
      password: ''
    });

    const rules = {
      identifier: [{ required: true, message: '请输入邮箱或用户名', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
    };

    const handleLogin = async () => {
      if (!formRef.value) return;
      
      const valid = await formRef.value.validate();
      if (!valid) return;

      loading.value = true;
      const result = await userStore.login(form.value);
      loading.value = false;

      if (result.success) {
        ElMessage.success('登录成功');
        router.push('/');
      } else {
        ElMessage.error(result.message);
      }
    };

    return {
      form,
      rules,
      formRef,
      loading,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.login-form {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
