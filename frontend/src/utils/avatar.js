/**
 * 头像处理工具函数
 */

/**
 * 获取完整的头像URL
 * @param {string} avatarUrl - 头像URL（可能是相对路径或绝对路径）
 * @returns {string} 完整的头像URL
 */
export const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return '';
  
  // 如果已经是完整的URL，直接返回
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // 如果是相对路径，添加基础URL
  return `${window.location.origin}${avatarUrl}`;
};

/**
 * 生成头像背景样式
 * @param {string} avatarUrl - 头像URL
 * @returns {object} CSS样式对象
 */
export const getAvatarStyle = (avatarUrl) => {
  if (avatarUrl) {
    const fullUrl = getFullAvatarUrl(avatarUrl);
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
 * 生成头像占位符颜色
 * @param {string} username - 用户名
 * @returns {string} 颜色值
 */
export const getAvatarPlaceholderColor = (username) => {
  if (!username) return '#6B7280';
  
  // 基于用户名生成一致的颜色
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
  ];
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * 检查头像URL是否有效
 * @param {string} avatarUrl - 头像URL
 * @returns {Promise<boolean>} 是否有效
 */
export const isValidAvatarUrl = (avatarUrl) => {
  return new Promise((resolve) => {
    if (!avatarUrl) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = getFullAvatarUrl(avatarUrl);
  });
};
