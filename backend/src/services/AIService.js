const axios = require('axios');
const logger = require('../utils/logger');

/**
 * AI服务核心类
 * 统一处理多个AI平台的API调用
 */
class AIService {
  constructor() {
    this.requestCache = new Map();
    this.rateLimiters = new Map();
  }

  /**
   * 通用AI调用方法
   * @param {Object} params - 调用参数
   * @param {String} params.provider - Provider类型
   * @param {String} params.baseURL - 基础URL
   * @param {String} params.apiKey - API密钥
   * @param {String} params.model - 模型名称
   * @param {Array} params.messages - 消息数组
   * @param {Object} params.options - 其他参数（temperature等）
   * @param {Boolean} params.stream - 是否流式输出
   * @param {Number} params.timeout - 超时时间
   * @returns {Promise} API响应
   */
  async generateCompletion(params) {
    const {
      provider,
      baseURL,
      apiKey,
      model,
      messages,
      options = {},
      stream = false,
      timeout = 60000
    } = params;

    try {
      // 检查速率限制
      if (!this.checkRateLimit(provider, apiKey)) {
        throw new Error('超出速率限制，请稍后再试');
      }

      // 根据provider类型构建请求
      const requestConfig = this.buildRequest(
        provider,
        baseURL,
        apiKey,
        model,
        messages,
        options,
        stream,
        timeout
      );

      // 发送请求
      const startTime = Date.now();
      const response = await axios(requestConfig);
      const latency = Date.now() - startTime;

      // 解析响应
      const result = this.parseResponse(provider, response.data);

      // 记录请求成功
      this.recordRequest(provider, apiKey, latency, true);

      return {
        success: true,
        content: result.content,
        usage: result.usage,
        finishReason: result.finishReason,
        model: result.model,
        latency
      };

    } catch (error) {
      // 记录请求失败
      this.recordRequest(provider, apiKey, 0, false);

      logger.error('AI API调用失败:', {
        provider,
        model,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: this.formatError(error),
        errorType: this.categorizeError(error)
      };
    }
  }

  /**
   * 流式调用方法
   * @param {Object} params - 调用参数
   * @param {Function} onChunk - 接收到数据块时的回调
   * @param {Function} onComplete - 完成时的回调
   * @param {Function} onError - 错误时的回调
   */
  async generateStreamCompletion(params, onChunk, onComplete, onError) {
    const {
      provider,
      baseURL,
      apiKey,
      model,
      messages,
      options = {},
      timeout = 60000
    } = params;

    try {
      const requestConfig = this.buildRequest(
        provider,
        baseURL,
        apiKey,
        model,
        messages,
        options,
        true,
        timeout
      );

      // 使用流式响应
      requestConfig.responseType = 'stream';

      const response = await axios(requestConfig);
      const stream = response.data;

      let buffer = '';
      let fullContent = '';
      let usage = null;

      stream.on('data', (chunk) => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 保留不完整的行

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.trim() === 'data: [DONE]') continue;

            const data = this.parseStreamChunk(provider, line);
            if (data.content) {
              fullContent += data.content;
              onChunk(data.content, data);
            }
            if (data.usage) {
              usage = data.usage;
            }
          }
        } catch (error) {
          logger.error('流式数据解析错误:', error);
        }
      });

      stream.on('end', () => {
        onComplete({
          content: fullContent,
          usage: usage || { total_tokens: 0 }
        });
      });

      stream.on('error', (error) => {
        onError(this.formatError(error));
      });

    } catch (error) {
      onError(this.formatError(error));
    }
  }

  /**
   * 构建API请求配置
   */
  buildRequest(provider, baseURL, apiKey, model, messages, options, stream, timeout) {
    const config = {
      method: 'POST',
      timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    switch (provider) {
      case 'openai':
        config.url = `${baseURL}/v1/chat/completions`;
        config.headers['Authorization'] = `Bearer ${apiKey}`;
        config.data = {
          model,
          messages,
          stream,
          temperature: options.temperature || 0.8,
          max_tokens: options.maxTokens || 4000,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
          ...options.custom
        };
        break;

      case 'deepseek':
        config.url = `${baseURL}/v1/chat/completions`;
        config.headers['Authorization'] = `Bearer ${apiKey}`;
        config.data = {
          model,
          messages,
          stream,
          temperature: options.temperature || 0.8,
          max_tokens: options.maxTokens || 4000,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty
        };
        break;

      case 'anthropic':
        config.url = `${baseURL}/v1/messages`;
        config.headers['x-api-key'] = apiKey;
        config.headers['anthropic-version'] = '2023-06-01';
        // 转换消息格式
        const anthropicMessages = messages.filter(m => m.role !== 'system');
        const systemMessage = messages.find(m => m.role === 'system');
        config.data = {
          model,
          messages: anthropicMessages,
          system: systemMessage?.content || '',
          stream,
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.8,
          top_p: options.topP,
          top_k: options.topK
        };
        break;

      case 'google':
        config.url = `${baseURL}/v1/models/${model}:generateContent`;
        config.headers['Authorization'] = `Bearer ${apiKey}`;
        // Google的消息格式需要转换
        config.data = {
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: {
            temperature: options.temperature || 0.8,
            maxOutputTokens: options.maxTokens || 4000,
            topP: options.topP,
            topK: options.topK
          }
        };
        break;

      case 'custom':
      case 'other':
        // 自定义provider，支持完整URL和相对URL
        // 如果baseURL已经包含chat/completions，则直接使用
        // 否则拼接/v1/chat/completions
        if (baseURL.includes('/chat/completions')) {
          config.url = baseURL;
        } else if (baseURL.endsWith('/v1') || baseURL.endsWith('/api/v3')) {
          config.url = `${baseURL}/chat/completions`;
        } else {
          config.url = `${baseURL}/v1/chat/completions`;
        }
        config.headers['Authorization'] = `Bearer ${apiKey}`;
        config.data = {
          model,
          messages,
          stream,
          temperature: options.temperature || 0.8,
          max_tokens: options.maxTokens || 4000,
          ...options.custom
        };
        break;

      default:
        throw new Error(`不支持的provider类型: ${provider}`);
    }

    // 移除undefined的字段
    if (config.data) {
      Object.keys(config.data).forEach(key => {
        if (config.data[key] === undefined) {
          delete config.data[key];
        }
      });
    }

    return config;
  }

  /**
   * 解析API响应
   */
  parseResponse(provider, data) {
    try {
      switch (provider) {
        case 'openai':
        case 'deepseek':
        case 'custom':
        case 'other':
          return {
            content: data.choices[0]?.message?.content || '',
            usage: {
              prompt_tokens: data.usage?.prompt_tokens || 0,
              completion_tokens: data.usage?.completion_tokens || 0,
              total_tokens: data.usage?.total_tokens || 0
            },
            finishReason: data.choices[0]?.finish_reason,
            model: data.model
          };

        case 'anthropic':
          return {
            content: data.content[0]?.text || '',
            usage: {
              prompt_tokens: data.usage?.input_tokens || 0,
              completion_tokens: data.usage?.output_tokens || 0,
              total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
            },
            finishReason: data.stop_reason,
            model: data.model
          };

        case 'google':
          return {
            content: data.candidates[0]?.content?.parts[0]?.text || '',
            usage: {
              prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
              completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
              total_tokens: data.usageMetadata?.totalTokenCount || 0
            },
            finishReason: data.candidates[0]?.finishReason,
            model: data.modelVersion
          };

        default:
          throw new Error(`不支持的provider类型: ${provider}`);
      }
    } catch (error) {
      logger.error('响应解析失败:', error);
      throw new Error('API响应格式错误');
    }
  }

  /**
   * 解析流式数据块
   */
  parseStreamChunk(provider, line) {
    try {
      const dataPrefix = 'data: ';
      if (!line.startsWith(dataPrefix)) return {};

      const jsonStr = line.slice(dataPrefix.length);
      if (jsonStr === '[DONE]') return {};

      const data = JSON.parse(jsonStr);

      switch (provider) {
        case 'openai':
        case 'deepseek':
        case 'custom':
        case 'other':
          return {
            content: data.choices[0]?.delta?.content || '',
            usage: data.usage,
            finishReason: data.choices[0]?.finish_reason
          };

        case 'anthropic':
          return {
            content: data.delta?.text || '',
            usage: data.usage,
            finishReason: data.delta?.stop_reason
          };

        case 'google':
          return {
            content: data.candidates[0]?.content?.parts[0]?.text || '',
            finishReason: data.candidates[0]?.finishReason
          };

        default:
          return {};
      }
    } catch (error) {
      return {};
    }
  }

  /**
   * 检查速率限制
   */
  checkRateLimit(provider, apiKey) {
    const key = `${provider}:${apiKey}`;
    const limiter = this.rateLimiters.get(key);

    if (!limiter) {
      this.rateLimiters.set(key, {
        requests: 1,
        resetTime: Date.now() + 60000 // 1分钟后重置
      });
      return true;
    }

    if (Date.now() > limiter.resetTime) {
      limiter.requests = 1;
      limiter.resetTime = Date.now() + 60000;
      return true;
    }

    if (limiter.requests >= 60) { // 每分钟60次请求
      return false;
    }

    limiter.requests++;
    return true;
  }

  /**
   * 记录请求统计
   */
  recordRequest(provider, apiKey, latency, success) {
    // 这里可以添加更详细的统计逻辑
    logger.info('AI请求统计', {
      provider,
      latency,
      success,
      timestamp: new Date()
    });
  }

  /**
   * 格式化错误信息
   */
  formatError(error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.error?.message || error.response.statusText,
        code: error.response.data?.error?.code
      };
    } else if (error.request) {
      return {
        message: '网络请求失败',
        details: error.message
      };
    } else {
      return {
        message: error.message
      };
    }
  }

  /**
   * 错误分类
   */
  categorizeError(error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) return 'AUTH_ERROR';
      if (status === 429) return 'RATE_LIMIT';
      if (status === 400) return 'INVALID_REQUEST';
      if (status >= 500) return 'SERVER_ERROR';
    }
    if (error.code === 'ECONNABORTED') return 'TIMEOUT';
    if (error.code === 'ENOTFOUND') return 'NETWORK_ERROR';
    return 'UNKNOWN_ERROR';
  }

  /**
   * 验证API密钥是否有效
   */
  async validateApiKey(provider, baseURL, apiKey, model) {
    try {
      const result = await this.generateCompletion({
        provider,
        baseURL,
        apiKey,
        model,
        messages: [{ role: 'user', content: 'Hello' }],
        options: { maxTokens: 10 },
        stream: false,
        timeout: 10000
      });

      return {
        valid: result.success,
        error: result.error?.message
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * 估算成本（基于token数量）
   */
  estimateCost(provider, model, usage) {
    // 这里可以根据不同provider和model的定价来计算
    // 以下是示例价格（需要根据实际情况调整）
    const pricingTable = {
      'openai': {
        'gpt-4': { input: 0.03, output: 0.06 },  // 美元/1k tokens
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
      },
      'deepseek': {
        'deepseek-chat': { input: 0.001, output: 0.002 },
        'deepseek-coder': { input: 0.001, output: 0.002 }
      },
      'anthropic': {
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 }
      }
    };

    const pricing = pricingTable[provider]?.[model];
    if (!pricing) {
      return 0; // 未知模型，无法估算
    }

    const inputCost = (usage.prompt_tokens / 1000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * pricing.output;
    
    return (inputCost + outputCost) * 7; // 转换为人民币（假设汇率1:7）
  }
}

// 导出单例
module.exports = new AIService();
