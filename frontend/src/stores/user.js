import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

export const useUserStore = defineStore('user', () => {
  // 获取token的辅助函数
  const getStoredToken = () => {
    // 优先从localStorage获取（记住我的情况）
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;

    // 然后从sessionStorage获取（不记住我的情况）
    const sessionToken = sessionStorage.getItem('token');
    return sessionToken || '';
  };

  // 状态
  const user = ref(null);
  const token = ref(getStoredToken());

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => !!user.value?.isAdmin);

  // 动作
  const login = async credentials => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: newToken, user: userData, rememberMe } = response.data.data;

      token.value = newToken;
      user.value = userData;

      // 根据rememberMe决定存储位置
      if (rememberMe) {
        // 记住我：存储到localStorage（持久化）
        localStorage.setItem('token', newToken);
        // 清除sessionStorage中可能存在的token
        sessionStorage.removeItem('token');
      } else {
        // 不记住我：存储到sessionStorage（浏览器关闭后清除）
        sessionStorage.setItem('token', newToken);
        // 清除localStorage中可能存在的token
        localStorage.removeItem('token');
      }

      return { success: true, rememberMe };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '登录失败'
      };
    }
  };

  const register = async userData => {
    try {
      const response = await api.post('/auth/register', userData);
      return {
        success: true,
        message: response.data.message || '注册成功',
        data: response.data.data // 包含邮箱验证相关信息
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
    // 清除两个存储位置的token
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  };

  const fetchUserInfo = async () => {
    if (!token.value) return false;

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

  // 检查token有效性
  const checkTokenValidity = () => {
    if (!token.value) return false;

    try {
      // 解析JWT token获取过期时间
      const payload = JSON.parse(atob(token.value.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // 如果token在5分钟内过期，返回false以便刷新
      return payload.exp > currentTime + 300;
    } catch (error) {
      console.error('解析token失败:', error);
      return false;
    }
  };

  // 静默刷新用户信息
  const silentRefresh = async () => {
    if (!token.value || !checkTokenValidity()) {
      return false;
    }

    try {
      await fetchUserInfo();
      return true;
    } catch (error) {
      console.error('静默刷新失败:', error);
      return false;
    }
  };

  const updateProfile = async profileData => {
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

  const updateUser = userData => {
    if (user.value) {
      user.value = { ...user.value, ...userData };
    }
  };

  // 初始化时获取用户信息
  if (token.value) {
    fetchUserInfo();
  }

  // 定期检查token有效性（每5分钟）
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (token.value && !checkTokenValidity()) {
        console.warn('Token即将过期，建议重新登录');
        // 可以在这里实现自动刷新token的逻辑
      }
    }, 5 * 60 * 1000);
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
    updateUser,
    checkTokenValidity,
    silentRefresh
  };
});
