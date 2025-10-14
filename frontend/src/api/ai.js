import request from '@/utils/request';

/**
 * AI生成内容（通用接口）
 * @param {Array} messages - 消息数组 [{ role: 'system'|'user'|'assistant', content: string }]
 * @param {Object} options - 可选参数
 * @param {number} options.temperature - 温度参数 0-2，默认0.8
 * @param {number} options.maxTokens - 最大Token数，默认2000
 * @param {boolean} options.requireUserKey - 是否要求使用用户密钥，默认false
 * @param {string} options.provider - 指定provider，如'openai'、'deepseek'等
 * @param {string} options.model - 指定模型，如'gpt-4'等
 * @returns {Promise}
 */
export function generateAIContent(messages, options = {}) {
  return request({
    url: '/ai/generate',
    method: 'post',
    timeout: 60000, // AI生成请求设置60秒超时
    data: {
      messages,
      temperature: options.temperature || 0.8,
      maxTokens: options.maxTokens || 2000,
      requireUserKey: options.requireUserKey || false,
      provider: options.provider || null,
      model: options.model || null
    }
  });
}

/**
 * 流式AI生成（SSE - Server-Sent Events）
 * @param {Array} messages - 消息数组
 * @param {Function} onChunk - 接收到数据块时的回调 (content: string) => void
 * @param {Function} onComplete - 完成时的回调 (data: { usage: object }) => void
 * @param {Function} onError - 错误时的回调 (error: Error) => void
 * @param {Object} options - 其他选项
 * @returns {EventSource} EventSource实例，可调用close()方法停止
 */
export function generateAIStream(messages, onChunk, onComplete, onError, options = {}) {
  const token = localStorage.getItem('token');
  
  // 构建请求体
  const requestBody = {
    messages,
    temperature: options.temperature || 0.8,
    maxTokens: options.maxTokens || 2000,
    requireUserKey: options.requireUserKey || false,
    provider: options.provider || null,
    model: options.model || null
  };

  // SSE需要通过POST请求，但浏览器EventSource只支持GET
  // 所以我们使用fetch + ReadableStream来实现
  const controller = new AbortController();
  
  fetch('/api/ai/generate/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // 读取流数据
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留不完整的行

          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr.trim()) {
                try {
                  const data = JSON.parse(dataStr);
                  
                  if (data.type === 'chunk') {
                    onChunk(data.content);
                  } else if (data.type === 'done') {
                    onComplete(data);
                  } else if (data.type === 'error') {
                    onError(new Error(data.message));
                  }
                } catch (e) {
                  console.error('解析SSE数据失败:', e);
                }
              }
            }
          });

          readStream();
        }).catch(error => {
          onError(error);
        });
      };

      readStream();
    })
    .catch(error => {
      onError(error);
    });

  // 返回一个类似EventSource的对象
  return {
    close: () => controller.abort()
  };
}

/**
 * 获取用户AI连接列表
 * @returns {Promise}
 */
export function getUserAIConnections() {
  return request({
    url: '/ai/connections',
    method: 'get'
  });
}

/**
 * 创建用户AI连接
 * @param {Object} data - 连接配置
 * @returns {Promise}
 */
export function createAIConnection(data) {
  return request({
    url: '/ai/connections',
    method: 'post',
    data
  });
}

/**
 * 更新用户AI连接
 * @param {string} id - 连接ID
 * @param {Object} data - 更新数据
 * @returns {Promise}
 */
export function updateAIConnection(id, data) {
  return request({
    url: `/ai/connections/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除用户AI连接
 * @param {string} id - 连接ID
 * @returns {Promise}
 */
export function deleteAIConnection(id) {
  return request({
    url: `/ai/connections/${id}`,
    method: 'delete'
  });
}

/**
 * 验证用户AI连接
 * @param {string} id - 连接ID
 * @returns {Promise}
 */
export function validateAIConnection(id) {
  return request({
    url: `/ai/connections/${id}/validate`,
    method: 'post'
  });
}

/**
 * 获取用户使用统计
 * @param {string} period - 统计周期 'day'|'week'|'month'
 * @returns {Promise}
 */
export function getUserAIStats(period = 'month') {
  return request({
    url: '/ai/stats/user',
    method: 'get',
    params: { period }
  });
}
