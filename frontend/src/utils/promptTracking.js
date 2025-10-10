import request from '@/utils/request';

/**
 * 提示词事件埋点工具
 * 用于追踪用户在AI提示词工具中的各种行为
 */

// 生成或获取会话ID
let sessionId = null;
function getSessionId() {
  if (sessionId) return sessionId;

  // 尝试从 sessionStorage 获取
  sessionId = sessionStorage.getItem('prompt_session_id');
  if (!sessionId) {
    // 生成新的会话ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('prompt_session_id', sessionId);
  }
  return sessionId;
}

// 获取设备信息
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';

  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  return {
    type: deviceType,
    screen: {
      width: window.screen.width,
      height: window.screen.height
    }
  };
}

/**
 * 通用埋点方法
 * @param {string} event - 事件类型 (view/search/copy/edit/share/export/impression)
 * @param {string} promptId - 提示词ID（可选）
 * @param {object} metadata - 事件元数据
 */
async function trackEvent(event, promptId = null, metadata = {}) {
  try {
    // 准备埋点数据
    const trackingData = {
      event,
      promptId,
      metadata: {
        ...metadata,
        device: getDeviceInfo(),
        referrer: document.referrer,
        previousPage: sessionStorage.getItem('previous_page') || ''
      }
    };

    // 发送埋点请求（使用 sendBeacon 或 fetch）
    if (navigator.sendBeacon) {
      // 使用 sendBeacon 确保页面卸载时也能发送
      const blob = new Blob([JSON.stringify(trackingData)], { type: 'application/json' });
      navigator.sendBeacon('/api/tools/prompt-vault/track', blob);
    } else {
      // 降级使用 fetch
      await request({
        url: '/tools/prompt-vault/track',
        method: 'post',
        data: trackingData,
        headers: {
          'X-Session-ID': getSessionId()
        }
      });
    }

  } catch (error) {
    // 埋点失败不影响业务，仅打印日志
    console.warn('[PromptTracking] 埋点失败:', error);
  }
}

/**
 * 记录提示词浏览事件
 * @param {string} promptId - 提示词ID
 * @param {object} options - 选项
 */
export function trackView(promptId, options = {}) {
  const { source = 'list', prompt = {} } = options;

  return trackEvent('view', promptId, {
    viewSource: source,
    promptCategory: prompt.category,
    promptAiModel: prompt.aiModel,
    promptTags: prompt.tags || []
  });
}

/**
 * 记录搜索事件
 * @param {object} searchParams - 搜索参数
 */
export function trackSearch(searchParams = {}) {
  const {
    keyword = '',
    category = '',
    aiModel = '',
    resultCount = 0,
    duration = 0
  } = searchParams;

  return trackEvent('search', null, {
    searchKeyword: keyword,
    searchCategory: category,
    searchAiModel: aiModel,
    searchResultCount: resultCount,
    searchDuration: duration
  });
}

/**
 * 记录复制事件
 * @param {string} promptId - 提示词ID
 * @param {object} options - 选项
 */
export function trackCopy(promptId, options = {}) {
  const {
    source = 'usage',
    variablesFilled = false,
    variableCount = 0,
    prompt = {}
  } = options;

  return trackEvent('copy', promptId, {
    copySource: source,
    variablesFilled,
    variableCount,
    promptCategory: prompt.category,
    promptAiModel: prompt.aiModel
  });
}

/**
 * 记录编辑事件
 * @param {string} promptId - 提示词ID（新建时为null）
 * @param {object} options - 选项
 */
export function trackEdit(promptId = null, options = {}) {
  const {
    isNew = false,
    fieldsChanged = [],
    prompt = {}
  } = options;

  return trackEvent('edit', promptId, {
    isNewPrompt: isNew,
    fieldsChanged,
    promptCategory: prompt.category,
    promptAiModel: prompt.aiModel
  });
}

/**
 * 记录分享事件
 * @param {string} promptId - 提示词ID
 * @param {object} options - 选项
 */
export function trackShare(promptId, options = {}) {
  const { prompt = {} } = options;

  return trackEvent('share', promptId, {
    promptCategory: prompt.category,
    promptAiModel: prompt.aiModel
  });
}

/**
 * 记录曝光事件（列表中的提示词被展示）
 * @param {array} promptIds - 被曝光的提示词ID数组
 */
export function trackImpressions(promptIds = []) {
  // 批量记录曝光，避免请求过多
  if (!Array.isArray(promptIds) || promptIds.length === 0) return;

  // 可以选择只记录前N个，或采样
  const sampled = promptIds.slice(0, 10);

  sampled.forEach(promptId => {
    trackEvent('impression', promptId, {
      batchSize: promptIds.length
    });
  });
}

/**
 * 记录导出事件
 * @param {string} promptId - 提示词ID
 * @param {object} options - 选项
 */
export function trackExport(promptId, options = {}) {
  const { format = 'unknown', prompt = {} } = options;

  return trackEvent('export', promptId, {
    exportFormat: format,
    promptCategory: prompt.category
  });
}

/**
 * 保存当前页面路径（用于追踪用户路径）
 */
export function saveCurrentPage() {
  const currentPath = window.location.pathname + window.location.search;
  sessionStorage.setItem('previous_page', currentPath);
}

// 页面加载时保存前一页
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    saveCurrentPage();
  });
}

export default {
  trackView,
  trackSearch,
  trackCopy,
  trackEdit,
  trackShare,
  trackImpressions,
  trackExport,
  saveCurrentPage
};
