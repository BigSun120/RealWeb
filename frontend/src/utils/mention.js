/**
 * @用户相关工具函数
 */

/**
 * 解析文本中的@用户
 * @param {string} text - 要解析的文本
 * @returns {Array} 解析出的用户名数组
 */
export function parseMentions(text) {
  if (!text) return [];
  
  // 匹配@用户名的正则表达式
  // 用户名只能包含字母、数字和下划线，长度3-15位
  const mentionRegex = /@([a-zA-Z0-9_]{3,15})\b/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }
  
  return mentions;
}

/**
 * 渲染@用户为可点击链接
 * @param {string} text - 要渲染的文本
 * @param {Array} mentionedUsers - 被@的用户信息数组
 * @returns {string} 渲染后的HTML
 */
export function renderMentions(text, mentionedUsers = []) {
  if (!text) return '';
  
  // 创建用户名到用户信息的映射
  const userMap = {};
  mentionedUsers.forEach(user => {
    if (user && user.username) {
      userMap[user.username] = user;
    }
  });
  
  // 替换@用户名为链接
  const mentionRegex = /@([a-zA-Z0-9_]{3,15})\b/g;
  
  return text.replace(mentionRegex, (match, username) => {
    const user = userMap[username];
    if (user) {
      return `<span class="mention-user" data-user-id="${user._id}" title="@${username}">@${username}</span>`;
    }
    return match;
  });
}

/**
 * 高亮显示@用户（用于编辑器）
 * @param {string} text - 要高亮的文本
 * @returns {string} 高亮后的HTML
 */
export function highlightMentions(text) {
  if (!text) return '';
  
  const mentionRegex = /@([a-zA-Z0-9_]{3,15})\b/g;
  
  return text.replace(mentionRegex, '<span class="mention-highlight">$&</span>');
}

/**
 * 从HTML中提取纯文本（移除@用户的HTML标签）
 * @param {string} html - HTML字符串
 * @returns {string} 纯文本
 */
export function extractTextFromMentions(html) {
  if (!html) return '';
  
  // 移除mention相关的HTML标签，保留@用户名
  return html
    .replace(/<span[^>]*class="mention-user"[^>]*>(@[^<]+)<\/span>/g, '$1')
    .replace(/<span[^>]*class="mention-highlight"[^>]*>([^<]+)<\/span>/g, '$1')
    .replace(/<[^>]*>/g, ''); // 移除其他HTML标签
}

/**
 * 验证用户名格式
 * @param {string} username - 用户名
 * @returns {boolean} 是否有效
 */
export function isValidUsername(username) {
  if (!username) return false;
  
  // 用户名只能包含字母、数字和下划线，长度3-15位
  const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;
  return usernameRegex.test(username);
}

/**
 * 获取@用户的通知消息
 * @param {Object} comment - 评论对象
 * @param {Object} article - 文章对象
 * @returns {string} 通知消息
 */
export function getMentionNotificationMessage(comment, article) {
  const authorName = comment.author?.username || '某用户';
  const articleTitle = article?.title || '某篇文章';
  
  return `${authorName} 在文章《${articleTitle}》中提到了你`;
}

/**
 * 检查文本中是否包含@用户
 * @param {string} text - 要检查的文本
 * @returns {boolean} 是否包含@用户
 */
export function hasMentions(text) {
  if (!text) return false;
  
  const mentionRegex = /@([a-zA-Z0-9_]{3,15})\b/;
  return mentionRegex.test(text);
}

/**
 * 获取@用户的位置信息
 * @param {string} text - 文本内容
 * @returns {Array} 位置信息数组
 */
export function getMentionPositions(text) {
  if (!text) return [];
  
  const mentionRegex = /@([a-zA-Z0-9_]{3,15})\b/g;
  const positions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    positions.push({
      username: match[1],
      start: match.index,
      end: match.index + match[0].length,
      text: match[0]
    });
  }
  
  return positions;
}
