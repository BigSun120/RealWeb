import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null);
  const token = ref(localStorage.getItem('token') || '');

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => !!user.value?.isAdmin);

  // 动作
  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: newToken, user: userData } = response.data.data;

      token.value = newToken;
      user.value = userData;

      localStorage.setItem('token', newToken);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '登录失败'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return {
        success: true,
        message: response.data.message || '注册成功'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '注册失败'
      };
    }
  };

  const logout = () => {
    user.value = null;
    token.value = '';
    localStorage.removeItem('token');
  };

  const fetchUserInfo = async () => {
    if (!token.value) return;

    try {
      const response = await api.get('/users/profile');
      user.value = response.data.data;
      return true;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 如果是401错误，说明token无效，需要清除
      if (error.response?.status === 401) {
        logout();
      }
      return false;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      user.value = { ...user.value, ...response.data.data };
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '更新失败'
      };
    }
  };

  const updateUser = (userData) => {
    if (user.value) {
      user.value = { ...user.value, ...userData };
    }
  };

  // 初始化时获取用户信息
  if (token.value) {
    fetchUserInfo();
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    fetchUserInfo,
    updateProfile,
    updateUser
  };
});
