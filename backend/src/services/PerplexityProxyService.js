const axios = require('axios');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Perplexity 反向代理服务
 * 用于转发用户的 Perplexity Pro 账号请求
 */
class PerplexityProxyService {
  constructor() {
    this.perplexityAPI = 'https://www.perplexity.ai/rest/sse/perplexity_ask';
    this.sessionAPI = 'https://www.perplexity.ai/api/auth/session';
    
  }

  /**
   * 发送查询到 Perplexity
   * @param {String} query - 用户问题
   * @param {String} sessionToken - Perplexity session token
   * @param {Object} options - 额外选项
   * @returns {Object} 响应数据
   */
  async query(query, sessionToken, options = {}) {
    try {
      const {
        visitorId = 'ecb11be4-bed8-4627-9f4c-019054e79262', // 使用固定 ID，与你的账号匹配
        userId = 'fb3abbb1-d384-485e-8362-795f32085f34', // 使用固定 ID，与你的账号匹配
        mode = 'copilot',
        model = 'pplx_alpha',
        language = 'zh-CN',
        timezone = 'Asia/Shanghai',
        searchFocus = 'internet'
      } = options;

      // 构建请求体
      const requestBody = {
        query_str: query,
        params: {
          attachments: [],
          language,
          timezone,
          search_focus: searchFocus,
          sources: ['web'],
          search_recency_filter: null,
          frontend_uuid: uuidv4(),
          mode,
          model_preference: model,
          is_related_query: false,
          is_sponsored: false,
          visitor_id: visitorId,
          user_nextauth_id: userId,
          frontend_context_uuid: uuidv4(),
          prompt_source: 'user',
          query_source: 'home',
          is_incognito: false,
          time_from_first_type: Math.random() * 2000 + 500, // 模拟输入时间
          local_search_enabled: false,
          use_schematized_api: true,
          send_back_text_in_streaming_api: false,
          supported_block_use_cases: [
            'answer_modes',
            'media_items',
            'knowledge_cards',
            'inline_entity_cards',
            'place_widgets',
            'finance_widgets',
            'sports_widgets',
            'shopping_widgets',
            'jobs_widgets',
            'search_result_widgets',
            'clarification_responses',
            'inline_images',
            'inline_assets',
            'inline_finance_widgets',
            'placeholder_cards',
            'diff_blocks',
            'inline_knowledge_cards',
            'entity_group_v2',
            'refinement_filters',
            'canvas_mode',
            'maps_preview'
          ],
          client_coordinates: null,
          mentions: [],
          dsl_query: query, // 与 query_str 相同
          skip_search_enabled: true,
          is_nav_suggestions_disabled: false,
          always_search_override: false,
          override_no_search: false,
          comet_max_assistant_enabled: false,
          should_ask_for_mcp_tool_confirmation: true,
          version: '2.18'
        }
      };

      logger.info('📤 发送 Perplexity 请求', { query: query.substring(0, 50) });

      // 发送请求
      const response = await axios.post(this.perplexityAPI, requestBody, {
        headers: {
          'Accept': 'text/event-stream',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Content-Type': 'application/json',
          'Cookie': `__Secure-next-auth.session-token=${sessionToken}`,
          'Referer': 'https://www.perplexity.ai/',
          'Origin': 'https://www.perplexity.ai',
          'DNT': '1',
          'Sec-Ch-Ua': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'
        },
        responseType: 'stream',
        timeout: 120000 // 增加到 120 秒（Perplexity 搜索需要时间）
      });

      // 解析 SSE 流
      const result = await this.parseSSEStream(response.data);

      logger.info('✅ Perplexity 请求成功');
      return result;

    } catch (error) {
      logger.error('❌ Perplexity 请求失败:', error.message);

      if (error.response) {
        logger.error('响应状态:', error.response.status);
        logger.error('响应数据:', error.response.data);
      }

      throw new Error(`Perplexity 请求失败: ${error.message}`);
    }
  }

  /**
   * 解析 SSE 流式响应
   * @param {Stream} stream - 响应流
   * @returns {Object} 解析后的完整内容
   */
  async parseSSEStream(stream) {
    return new Promise((resolve, reject) => {
      let fullText = '';
      let citations = [];
      let buffer = '';

      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');

        // 保留最后一个不完整的行
        buffer = lines.pop();

        lines.forEach((line) => {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);

            // 跳过空数据
            if (!data || data.trim() === '') return;

            try {
              const parsed = JSON.parse(data);

              // 处理不同类型的数据块
              if (parsed.type === 'answer_chunk' && parsed.text) {
                fullText += parsed.text;
              } else if (parsed.type === 'sources' && parsed.data) {
                citations = parsed.data;
              } else if (parsed.type === 'done') {
                // 流结束标记
              }
            } catch (e) {
              // JSON 解析失败，忽略
            }
          }
        });
      });

      stream.on('end', () => {
        resolve({
          content: fullText,
          citations,
          provider: 'perplexity',
          model: 'pplx_alpha',
          usage: {
            // Perplexity 不返回 token 统计，使用估算值
            total_tokens: Math.ceil(fullText.length / 4),
            prompt_tokens: 0,
            completion_tokens: Math.ceil(fullText.length / 4)
          }
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 验证 session token 是否有效
   * @param {String} sessionToken - Session token
   * @returns {Boolean} 是否有效
   */
  async validateToken(sessionToken) {
    try {
      logger.info('🔍 开始验证 Perplexity Session Token...');
      
      const response = await axios.get(this.sessionAPI, {
        headers: {
          'Cookie': `__Secure-next-auth.session-token=${sessionToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.perplexity.ai/',
          'Origin': 'https://www.perplexity.ai'
        },
        timeout: 30000 // 增加到 30 秒
      });

      logger.info('✅ Token 验证响应:', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      // 如果返回有效的 session 数据，说明 token 有效
      const isValid = response.status === 200 && response.data !== null && typeof response.data === 'object';
      logger.info(`🎯 Token 验证结果: ${isValid ? '有效' : '无效'}`);
      
      return isValid;
    } catch (error) {
      logger.error('❌ Token 验证失败:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return false;
    }
  }

  /**
   * 转换为 OpenAI 兼容格式（用于统一接口）
   * @param {Object} perplexityResponse - Perplexity 响应
   * @returns {Object} OpenAI 格式响应
   */
  toOpenAIFormat(perplexityResponse) {
    return {
      id: `pplx-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: perplexityResponse.model || 'pplx_alpha',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: perplexityResponse.content
          },
          finish_reason: 'stop'
        }
      ],
      usage: perplexityResponse.usage
    };
  }
}

module.exports = new PerplexityProxyService();
