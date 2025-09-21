/**
 * 头像处理工具函数
 * 注意：核心函数已迁移至 @/utils/imageUrl 统一管理
 */

// 重新导出统一的图片URL处理函数
export {
  getImageUrl as getFullAvatarUrl,
  getAvatarStyle,
  getUserInitial
} from '@/utils/imageUrl';

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
