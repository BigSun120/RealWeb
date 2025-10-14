/**
 * AI Provider 配置模板
 * 提供常用平台的快速配置模板，用户也可以完全自定义
 */

module.exports = {
  // OpenAI 官方
  openai: {
    provider: 'openai-official',
    displayName: 'OpenAI 官方',
    providerType: 'openai',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: {
      allowCustomModel: true,
      presets: [
        {
          model: 'gpt-4o',
          displayName: 'GPT-4 Omni',
          description: '最强大的多模态模型',
          maxTokens: 16384,
          contextWindow: 128000,
          pricing: {
            inputPer1k: 0.035,   // $5/1M tokens = ¥0.035/1k
            outputPer1k: 0.105,  // $15/1M tokens = ¥0.105/1k
            currency: 'CNY'
          },
          capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
          enabled: true
        },
        {
          model: 'gpt-4o-mini',
          displayName: 'GPT-4o Mini',
          description: '性价比极高的小模型',
          maxTokens: 16384,
          contextWindow: 128000,
          pricing: {
            inputPer1k: 0.001,
            outputPer1k: 0.004,
            currency: 'CNY'
          },
          capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
          enabled: true
        },
        {
          model: 'gpt-3.5-turbo',
          displayName: 'GPT-3.5 Turbo',
          description: '经典快速模型',
          maxTokens: 4096,
          contextWindow: 16385,
          pricing: {
            inputPer1k: 0.003,
            outputPer1k: 0.006,
            currency: 'CNY'
          },
          capabilities: ['chat', 'function-calling', 'streaming'],
          enabled: true
        }
      ]
    },
    requestParams: {
      defaults: {
        temperature: 0.8,
        maxTokens: 4000
      },
      constraints: {
        temperature: { min: 0, max: 2 },
        maxTokens: { min: 1, max: 128000 }
      }
    },
    apiProtocol: {
      type: 'openai',
      headers: {},
      requestMapping: {
        messages: 'messages',
        model: 'model',
        temperature: 'temperature',
        maxTokens: 'max_tokens',
        stream: 'stream'
      },
      responseMapping: {
        content: 'choices[0].message.content',
        usage: 'usage',
        finishReason: 'choices[0].finish_reason'
      }
    }
  },

  // DeepSeek
  deepseek: {
    provider: 'deepseek',
    displayName: 'DeepSeek',
    providerType: 'deepseek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: {
      allowCustomModel: true,
      presets: [
        {
          model: 'deepseek-chat',
          displayName: 'DeepSeek Chat',
          description: '高性价比中文模型',
          maxTokens: 8192,
          contextWindow: 64000,
          pricing: {
            inputPer1k: 0.001,   // ¥1/1M tokens
            outputPer1k: 0.002,  // ¥2/1M tokens
            currency: 'CNY'
          },
          capabilities: ['chat', 'function-calling', 'streaming'],
          enabled: true
        },
        {
          model: 'deepseek-coder',
          displayName: 'DeepSeek Coder',
          description: '专业代码模型',
          maxTokens: 8192,
          contextWindow: 64000,
          pricing: {
            inputPer1k: 0.001,
            outputPer1k: 0.002,
            currency: 'CNY'
          },
          capabilities: ['chat', 'completion', 'streaming'],
          enabled: true
        }
      ]
    },
    requestParams: {
      defaults: {
        temperature: 0.8,
        maxTokens: 4000
      },
      constraints: {
        temperature: { min: 0, max: 2 },
        maxTokens: { min: 1, max: 64000 }
      }
    },
    apiProtocol: {
      type: 'openai',  // DeepSeek兼容OpenAI协议
      headers: {},
      requestMapping: {
        messages: 'messages',
        model: 'model',
        temperature: 'temperature',
        maxTokens: 'max_tokens',
        stream: 'stream'
      },
      responseMapping: {
        content: 'choices[0].message.content',
        usage: 'usage',
        finishReason: 'choices[0].finish_reason'
      }
    }
  },

  // 智谱AI
  glm: {
    provider: 'zhipu-glm',
    displayName: '智谱AI (GLM)',
    providerType: 'custom',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    models: {
      allowCustomModel: true,
      presets: [
        {
          model: 'glm-4-plus',
          displayName: 'GLM-4 Plus',
          description: '高性能中文大模型',
          maxTokens: 8192,
          contextWindow: 128000,
          pricing: {
            inputPer1k: 0.05,
            outputPer1k: 0.05,
            currency: 'CNY'
          },
          capabilities: ['chat', 'function-calling', 'streaming'],
          enabled: true
        },
        {
          model: 'glm-4-flash',
          displayName: 'GLM-4 Flash',
          description: '极速响应模型',
          maxTokens: 8192,
          contextWindow: 128000,
          pricing: {
            inputPer1k: 0.001,
            outputPer1k: 0.001,
            currency: 'CNY'
          },
          capabilities: ['chat', 'streaming'],
          enabled: true
        }
      ]
    },
    requestParams: {
      defaults: {
        temperature: 0.8,
        maxTokens: 4000
      },
      constraints: {
        temperature: { min: 0, max: 1 },
        maxTokens: { min: 1, max: 8192 }
      }
    },
    apiProtocol: {
      type: 'openai',  // 智谱兼容OpenAI协议
      headers: {},
      requestMapping: {
        messages: 'messages',
        model: 'model',
        temperature: 'temperature',
        maxTokens: 'max_tokens',
        stream: 'stream'
      },
      responseMapping: {
        content: 'choices[0].message.content',
        usage: 'usage',
        finishReason: 'choices[0].finish_reason'
      }
    }
  },

  // Claude (Anthropic)
  claude: {
    provider: 'anthropic-claude',
    displayName: 'Anthropic Claude',
    providerType: 'anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: {
      allowCustomModel: true,
      presets: [
        {
          model: 'claude-3-5-sonnet-20241022',
          displayName: 'Claude 3.5 Sonnet',
          description: '最新最强Claude模型',
          maxTokens: 8192,
          contextWindow: 200000,
          pricing: {
            inputPer1k: 0.021,   // $3/1M tokens
            outputPer1k: 0.105,  // $15/1M tokens
            currency: 'CNY'
          },
          capabilities: ['chat', 'vision', 'function-calling', 'streaming'],
          enabled: true
        },
        {
          model: 'claude-3-haiku-20240307',
          displayName: 'Claude 3 Haiku',
          description: '快速经济的小模型',
          maxTokens: 4096,
          contextWindow: 200000,
          pricing: {
            inputPer1k: 0.0018,
            outputPer1k: 0.009,
            currency: 'CNY'
          },
          capabilities: ['chat', 'vision', 'streaming'],
          enabled: true
        }
      ]
    },
    requestParams: {
      defaults: {
        temperature: 0.8,
        maxTokens: 4000
      },
      constraints: {
        temperature: { min: 0, max: 1 },
        maxTokens: { min: 1, max: 8192 }
      }
    },
    apiProtocol: {
      type: 'anthropic',  // Claude有自己的协议格式
      headers: {
        'anthropic-version': '2023-06-01'
      },
      requestMapping: {
        messages: 'messages',
        model: 'model',
        temperature: 'temperature',
        maxTokens: 'max_tokens',
        stream: 'stream'
      },
      responseMapping: {
        content: 'content[0].text',
        usage: 'usage',
        finishReason: 'stop_reason'
      }
    }
  },

  // 通义千问
  qwen: {
    provider: 'aliyun-qwen',
    displayName: '通义千问',
    providerType: 'custom',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: {
      allowCustomModel: true,
      presets: [
        {
          model: 'qwen-plus',
          displayName: '通义千问 Plus',
          description: '高性能大模型',
          maxTokens: 8192,
          contextWindow: 32000,
          pricing: {
            inputPer1k: 0.004,
            outputPer1k: 0.012,
            currency: 'CNY'
          },
          capabilities: ['chat', 'function-calling', 'streaming'],
          enabled: true
        },
        {
          model: 'qwen-turbo',
          displayName: '通义千问 Turbo',
          description: '快速响应模型',
          maxTokens: 8192,
          contextWindow: 8000,
          pricing: {
            inputPer1k: 0.002,
            outputPer1k: 0.006,
            currency: 'CNY'
          },
          capabilities: ['chat', 'streaming'],
          enabled: true
        }
      ]
    },
    requestParams: {
      defaults: {
        temperature: 0.8,
        maxTokens: 4000
      },
      constraints: {
        temperature: { min: 0, max: 2 },
        maxTokens: { min: 1, max: 8192 }
      }
    },
    apiProtocol: {
      type: 'openai',  // 通义兼容OpenAI协议
      headers: {},
      requestMapping: {
        messages: 'messages',
        model: 'model',
        temperature: 'temperature',
        maxTokens: 'max_tokens',
        stream: 'stream'
      },
      responseMapping: {
        content: 'choices[0].message.content',
        usage: 'usage',
        finishReason: 'choices[0].finish_reason'
      }
    }
  },

  // 自定义模板（空白模板，用户完全自定义）
  custom: {
    provider: 'custom-provider',
    displayName: '自定义API',
    providerType: 'custom',
    baseURL: 'https://your-api-endpoint.com/v1',
    defaultModel: 'your-model',
    models: {
      allowCustomModel: true,
      presets: []
    },
    requestParams: {
      defaults: {
        temperature: 0.8,
        maxTokens: 4000
      },
      constraints: {
        temperature: { min: 0, max: 2 },
        maxTokens: { min: 1, max: 128000 }
      }
    },
    apiProtocol: {
      type: 'openai',
      headers: {},
      requestMapping: {
        messages: 'messages',
        model: 'model',
        temperature: 'temperature',
        maxTokens: 'max_tokens',
        stream: 'stream'
      },
      responseMapping: {
        content: 'choices[0].message.content',
        usage: 'usage',
        finishReason: 'choices[0].finish_reason'
      }
    }
  }
};

/**
 * 获取所有可用模板
 */
function getAllTemplates() {
  return Object.keys(module.exports).filter(key => key !== 'getAllTemplates' && key !== 'getTemplate');
}

/**
 * 获取指定模板
 */
function getTemplate(templateName) {
  return module.exports[templateName] || module.exports.custom;
}

module.exports.getAllTemplates = getAllTemplates;
module.exports.getTemplate = getTemplate;
