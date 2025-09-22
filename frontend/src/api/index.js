import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '@/router';
import { useUserStore } from '@/stores/user';

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 添加认证token - 优先从localStorage获取，然后从sessionStorage获取
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 防止重复登出的标志
let isLoggingOut = false;

// 统一处理401未授权错误
const handleUnauthorized = (data) => {
  if (isLoggingOut) return;

  isLoggingOut = true;

  // 根据错误类型显示不同消息
  const errorMessages = {
    'TOKEN_EXPIRED': '登录已过期，请重新登录',
    'INVALID_TOKEN': '登录信息无效，请重新登录',
    'USER_NOT_FOUND': '用户不存在，请重新登录',
    'ACCOUNT_DISABLED': '账户已被禁用',
    'AUTH_ERROR': '认证失败，请重新登录'
  };

  const message = errorMessages[data?.errorType] || data?.message || '登录已过期，请重新登录';

  // 清除用户状态
  const userStore = useUserStore();
  userStore.logout();

  // 显示错误消息
  ElMessage.error(message);

  // 延迟跳转，避免并发问题
  setTimeout(() => {
    // 如果当前不在登录页，则跳转到登录页
    if (!window.location.pathname.includes('/auth/login')) {
      window.location.href = '/auth/login';
    }
    isLoggingOut = false;
  }, 100);
};

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    const { response } = error;

    if (response) {
      switch (response.status) {
        case 401: {
          // 使用统一的401处理
          const data = response.data || {};
          handleUnauthorized(data);
          break;
        }
        case 403:
          ElMessage.error('权限不足');
          break;
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
        case 500:
          ElMessage.error('服务器内部错误');
          break;
        default:
          ElMessage.error(response.data?.message || '请求失败');
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

export default api;
