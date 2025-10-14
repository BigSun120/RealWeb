const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * AI全局配置模型
 * 用于管理后台的AI系统配置
 */
const aiConfigSchema = new mongoose.Schema(
  {
    // 配置名称（用于识别）
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: 'default'
    },

    // 配置描述
    description: {
      type: String,
      trim: true
    },

    // 是否启用
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Provider配置（支持多个，完全自定义）
    providers: [
      {
        // Provider唯一标识（用户自定义，如 'my-openai'）
        provider: {
          type: String,
          required: true,
          trim: true
        },
        
        // 显示名称（用户自定义）
        displayName: {
          type: String,
          required: true,
          trim: true
        },
        
        // Provider类型（用于图标/模板，可选）
        providerType: {
          type: String,
          enum: ['openai', 'deepseek', 'anthropic', 'google', 'custom', 'other'],
          default: 'custom'
        },

        // 是否启用该provider
        enabled: {
          type: Boolean,
          default: true
        },

        // 基础URL（可自定义代理地址）
        baseURL: {
          type: String,
          required: true
        },

        // 加密后的API密钥（支持多个密钥轮询）
        apiKeys: [
          {
            keyEncrypted: String,
            keyMask: String, // 显示用，如 sk-1234...abcd
            label: String,   // 标签，如 "主密钥"、"备用密钥"
            weight: {        // 权重（用于负载均衡）
              type: Number,
              default: 1,
              min: 0,
              max: 100
            },
            isActive: {
              type: Boolean,
              default: true
            },
            // 用量统计
            usage: {
              totalRequests: { type: Number, default: 0 },
              totalTokens: { type: Number, default: 0 },
              totalCost: { type: Number, default: 0 },
              lastUsedAt: Date
            }
          }
        ],

        // 默认模型
        defaultModel: {
          type: String,
          required: true
        },

        // 模型配置（完全自定义）
        models: {
          // 允许用户自由输入模型名称
          allowCustomModel: {
            type: Boolean,
            default: true
          },
          // 预设模型列表（可选，用户可添加任意模型）
          presets: [
            {
              model: String,        // 模型标识，如 'gpt-4o'
              displayName: String,  // 显示名称，如 'GPT-4 Omni'
              description: String,  // 描述
              maxTokens: Number,    // 最大token数
              contextWindow: Number, // 上下文窗口
              // 成本（可选）
              pricing: {
                inputPer1k: Number,   // 每1k输入tokens成本（元/美元）
                outputPer1k: Number,  // 每1k输出tokens成本
                currency: {
                  type: String,
                  enum: ['CNY', 'USD'],
                  default: 'CNY'
                }
              },
              // 能力标签
              capabilities: [{
                type: String,
                enum: ['chat', 'completion', 'vision', 'function-calling', 'json-mode', 'streaming']
              }],
              enabled: {
                type: Boolean,
                default: true
              }
            }
          ]
        },

        // 请求参数配置（完全自定义）
        requestParams: {
          // 默认参数
          defaults: {
            temperature: {
              type: Number,
              default: 0.8
            },
            maxTokens: {
              type: Number,
              default: 4000
            },
            topP: Number,
            topK: Number,
            frequencyPenalty: Number,
            presencePenalty: Number,
            // 自定义参数（key-value对）
            custom: mongoose.Schema.Types.Mixed
          },
          // 参数范围约束（可选）
          constraints: {
            temperature: {
              min: { type: Number, default: 0 },
              max: { type: Number, default: 2 }
            },
            maxTokens: {
              min: { type: Number, default: 1 },
              max: { type: Number, default: 128000 }
            }
          }
        },
        
        // API协议配置
        apiProtocol: {
          // 协议类型
          type: {
            type: String,
            enum: ['openai', 'anthropic', 'google', 'custom'],
            default: 'openai'
          },
          // 请求头自定义
          headers: {
            type: Map,
            of: String,
            default: {}
          },
          // 请求体字段映射（用于不同API格式转换）
          requestMapping: {
            messages: String,  // 消息字段名，如 'messages' 或 'prompt'
            model: String,     // 模型字段名
            temperature: String,
            maxTokens: String,
            stream: String
          },
          // 响应体字段映射
          responseMapping: {
            content: String,   // 内容路径，如 'choices[0].message.content'
            usage: String,     // 用量路径，如 'usage'
            finishReason: String
          }
        },

        // 速率限制（每分钟请求数）
        rateLimit: {
          requestsPerMinute: {
            type: Number,
            default: 60
          },
          tokensPerMinute: {
            type: Number,
            default: 100000
          }
        },

        // 超时设置（毫秒）
        timeout: {
          type: Number,
          default: 60000
        },

        // 重试配置
        retry: {
          maxRetries: {
            type: Number,
            default: 2
          },
          backoff: {
            type: String,
            enum: ['linear', 'exponential'],
            default: 'exponential'
          }
        }
      }
    ],

    // 路由策略
    routingStrategy: {
      type: String,
      enum: ['priority', 'round-robin', 'least-latency', 'cost-optimized'],
      default: 'priority',
      description: {
        'priority': '按优先级（权重）分配',
        'round-robin': '轮询',
        'least-latency': '最低延迟优先',
        'cost-optimized': '成本优化'
      }
    },

    // 降级策略
    fallbackStrategy: {
      enabled: {
        type: Boolean,
        default: true
      },
      order: [String], // provider顺序，如 ['deepseek', 'openai']
      conditions: {
        onError: Boolean,
        onTimeout: Boolean,
        onRateLimit: Boolean
      }
    },

    // 全局配额限制
    quota: {
      // 每日免费额度（tokens）
      dailyFreeQuota: {
        type: Number,
        default: 100000
      },
      
      // 每月预算上限（元）
      monthlyBudget: {
        type: Number,
        default: 1000
      },

      // 单用户每日限制
      perUserDailyLimit: {
        type: Number,
        default: 10000
      },

      // 告警阈值（百分比）
      alertThreshold: {
        type: Number,
        default: 80,
        min: 0,
        max: 100
      }
    },

    // 内容安全配置
    contentSafety: {
      enabled: {
        type: Boolean,
        default: false
      },
      // 敏感词过滤
      sensitiveWords: [String],
      // 内容分类限制
      restrictedCategories: [String]
    },

    // 功能开关
    features: {
      // 是否允许用户自带密钥（BYOK）
      allowBYOK: {
        type: Boolean,
        default: true
      },
      // 是否启用流式输出
      streamEnabled: {
        type: Boolean,
        default: true
      },
      // 是否启用函数调用
      functionCallEnabled: {
        type: Boolean,
        default: false
      },
      // 是否启用图像生成
      imageGenerationEnabled: {
        type: Boolean,
        default: false
      }
    },

    // 监控与日志
    monitoring: {
      // 是否记录详细日志
      detailedLogging: {
        type: Boolean,
        default: true
      },
      // 是否记录提示词内容
      logPrompts: {
        type: Boolean,
        default: false
      },
      // 日志保留天数
      logRetentionDays: {
        type: Number,
        default: 30
      }
    },

    // 最后修改人
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// 索引
aiConfigSchema.index({ name: 1, isActive: 1 });

// 加密API密钥
aiConfigSchema.methods.encryptApiKey = function(apiKey) {
  const algorithm = 'aes-256-cbc';
  const secretKey = process.env.ENCRYPTION_SECRET || 'default-32-char-secret-key-here!';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    keyEncrypted: iv.toString('hex') + ':' + encrypted,
    keyMask: `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
  };
};

// 解密API密钥
aiConfigSchema.methods.decryptApiKey = function(keyEncrypted) {
  const algorithm = 'aes-256-cbc';
  const secretKey = process.env.ENCRYPTION_SECRET || 'default-32-char-secret-key-here!';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  
  const parts = keyEncrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// 获取可用的API密钥（带权重轮询）
aiConfigSchema.methods.getAvailableKey = function(providerName) {
  const provider = this.providers.find(p => p.provider === providerName && p.enabled);
  if (!provider || !provider.apiKeys.length) return null;

  // 过滤出激活的密钥
  const activeKeys = provider.apiKeys.filter(k => k.isActive);
  if (!activeKeys.length) return null;

  // 根据权重随机选择
  const totalWeight = activeKeys.reduce((sum, k) => sum + k.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const key of activeKeys) {
    random -= key.weight;
    if (random <= 0) {
      return {
        keyEncrypted: key.keyEncrypted,
        label: key.label,
        _id: key._id
      };
    }
  }
  
  return activeKeys[0]; // 兜底返回第一个
};

// 更新密钥使用统计
aiConfigSchema.methods.updateKeyUsage = async function(providerName, keyId, usage) {
  const provider = this.providers.find(p => p.provider === providerName);
  if (!provider) return;

  const key = provider.apiKeys.id(keyId);
  if (!key) return;

  key.usage.totalRequests += 1;
  key.usage.totalTokens += usage.total_tokens || 0;
  key.usage.totalCost += usage.cost || 0;
  key.usage.lastUsedAt = new Date();

  await this.save();
};

// 静态方法：获取激活的配置
aiConfigSchema.statics.getActiveConfig = async function() {
  return await this.findOne({ name: 'default', isActive: true });
};

module.exports = mongoose.model('AIConfig', aiConfigSchema);
