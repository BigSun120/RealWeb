/**
 * 统一的图片URL处理工具
 * 解决生产环境图片无法显示的问题
 */

/**
 * 获取API基础URL
 * 优先级：环境变量 > 当前域名 > 默认值
 */
const getApiBaseUrl = () => {
  // 1. 优先使用环境变量（构建时确定）
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '');
  }
  
  // 2. 生产环境使用当前域名
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // 3. 开发环境默认值
  return 'http://localhost:8001';
};

/**
 * 统一的图片URL生成函数
 * @param {string} url - 相对或绝对URL
 * @returns {string} 完整的图片URL
 */
export const getImageUrl = (url) => {
  if (!url) return '';
  
  // 如果已经是完整的URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 确保路径以/开头
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  
  // 获取基础URL并拼接
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${normalizedPath}`;
};

/**
 * 获取头像URL（兼容旧的函数名）
 * @param {string} avatarUrl - 头像URL
 * @returns {string} 完整的头像URL
 */
export const getFullAvatarUrl = (avatarUrl) => {
  return getImageUrl(avatarUrl);
};

/**
 * 生成头像背景样式
 * @param {string} avatarUrl - 头像URL
 * @returns {object} CSS样式对象
 */
export const getAvatarStyle = (avatarUrl) => {
  if (avatarUrl) {
    const fullUrl = getImageUrl(avatarUrl);
    return {
      backgroundImage: `url(${fullUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }
  return {};
};

/**
 * 获取用户名的首字母（用于头像占位符）
 * @param {string} username - 用户名
 * @returns {string} 首字母
 */
export const getUserInitial = (username) => {
  if (!username) return 'U';
  return username.charAt(0).toUpperCase();
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 调试信息（仅开发环境）
if (import.meta.env.DEV) {
  console.log('[ImageUrl] 配置信息:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    baseUrl: getApiBaseUrl(),
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD
  });
}
