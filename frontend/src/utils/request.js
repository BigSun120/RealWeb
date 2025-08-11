import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';

// 创建axios实例
const request = axios.create({
  baseURL: '/api', // 基础URL
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 添加认证token
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }

    return config;
  },
  error => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  response => {
    const { data, status } = response;

    // 如果是文件下载等特殊响应，直接返回
    if (response.config.responseType === 'blob') {
      return response;
    }

    // 统一处理响应数据
    if (data.code !== undefined) {
      if (data.code === 200 || data.code === 201) {
        return data;
      } else if (data.code === 401) {
        // 未授权，清除token并跳转到登录页
        const userStore = useUserStore();
        userStore.logout();
        ElMessage.error('登录已过期，请重新登录');
        window.location.href = '/login';
        return Promise.reject(new Error(data.message || '未授权'));
      } else if (data.code === 403) {
        ElMessage.error('没有权限访问');
        return Promise.reject(new Error(data.message || '没有权限'));
      }
    }

    // 如果没有code字段，但HTTP状态为201，也视为成功
    if (status === 201) {
      return data;
    }

    // 如果没有code字段，直接返回data
    return data;
  },
  error => {
    console.error('响应错误:', error);

    let message = '网络错误';

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message = data.message || '请求参数错误';
          break;
        case 401: {
          message = '未授权，请登录';
          const userStore = useUserStore();
          userStore.logout();
          window.location.href = '/login';
          break;
        }
        case 403:
          message = '没有权限访问';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        case 502:
          message = '网关错误';
          break;
        case 503:
          message = '服务不可用';
          break;
        case 504:
          message = '网关超时';
          break;
        default:
          message = data?.message || `请求失败 (${status})`;
      }
    } else if (error.request) {
      message = '网络连接失败';
    } else {
      message = error.message || '请求配置错误';
    }

    ElMessage.error(message);
    return Promise.reject(error);
  }
);

export default request;
