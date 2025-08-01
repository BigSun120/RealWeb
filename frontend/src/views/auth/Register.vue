<template>
  <div class="register">
    <div class="register-form">
      <h2>注册</h2>
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleRegister" :loading="loading" style="width: 100%">
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <p>
        已有账号？
        <router-link to="/auth/login">立即登录</router-link>
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
  name: 'Register',
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const formRef = ref();
    const loading = ref(false);

    const form = ref({
      username: '',
      email: '',
      password: ''
    });

    const rules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
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
        ElMessage.success('注册成功，请登录');
        router.push('/auth/login');
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
.register {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.register-form {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
