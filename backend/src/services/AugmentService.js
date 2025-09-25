const crypto = require('crypto');
const axios = require('axios');
const { URL } = require('url');

/**
 * Augment 服务类
 * 处理OAuth认证、令牌管理和API调用
 */
class AugmentService {
  constructor() {
    // Augment OAuth 配置
    this.CLIENT_ID = 'v';
    this.AUTH_BASE_URL = 'https://auth.augmentcode.com';

    // 加密配置
    this.ENCRYPTION_KEY = process.env.AUGMENT_TOKEN_ENCRYPTION_KEY || (() => {
      throw new Error('AUGMENT_TOKEN_ENCRYPTION_KEY environment variable is required');
    })();
    this.ALGORITHM = 'aes-256-gcm';
  }

  /**
   * 生成随机字节
   */
  generateRandomBytes(length) {
    return crypto.randomBytes(length);
  }

  /**
   * Base64 URL 编码（无填充）
   */
  base64UrlEncode(data) {
    return data.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * SHA256 哈希
   */
  sha256Hash(data) {
    return crypto.createHash('sha256').update(data).digest();
  }

  /**
   * 创建 OAuth 状态
   */
  createOAuthState() {
    const codeVerifierBytes = this.generateRandomBytes(32);
    const codeVerifier = this.base64UrlEncode(codeVerifierBytes);

    const codeChallengeBytes = this.sha256Hash(codeVerifier);
    const codeChallenge = this.base64UrlEncode(codeChallengeBytes);

    const stateBytes = this.generateRandomBytes(8);
    const state = this.base64UrlEncode(stateBytes);

    const creationTime = Date.now();

    return {
      codeVerifier,
      codeChallenge,
      state,
      creationTime
    };
  }

  /**
   * 生成授权 URL
   */
  generateAuthorizeUrl(oauthState) {
    const url = new URL(`${this.AUTH_BASE_URL}/authorize`);

    url.searchParams.append('response_type', 'code');
    url.searchParams.append('code_challenge', oauthState.codeChallenge);
    url.searchParams.append('client_id', this.CLIENT_ID);
    url.searchParams.append('state', oauthState.state);
    url.searchParams.append('prompt', 'login');

    return url.toString();
  }

  /**
   * 解析授权码响应
   */
  parseAuthCode(codeInput) {
    try {
      return JSON.parse(codeInput);
    } catch (error) {
      throw new Error('Invalid authorization code format');
    }
  }

  /**
   * 获取访问令牌
   */
  async getAccessToken(tenantUrl, codeVerifier, code) {
    try {
      const tokenUrl = `${tenantUrl}token`;

      const data = {
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID,
        code_verifier: codeVerifier,
        redirect_uri: '',
        code: code
      };

      const response = await axios.post(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.access_token;
    } catch (error) {
      if (error.response) {
        throw new Error(`Token request failed: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Token request failed: Network error');
      } else {
        throw new Error(`Token request failed: ${error.message}`);
      }
    }
  }

  /**
   * 完成 OAuth 流程
   */
  async completeOAuthFlow(oauthState, codeInput) {
    try {
      const parsedCode = this.parseAuthCode(codeInput);

      const accessToken = await this.getAccessToken(
        parsedCode.tenant_url,
        oauthState.codeVerifier,
        parsedCode.code
      );

      return {
        access_token: accessToken,
        tenant_url: parsedCode.tenant_url
      };
    } catch (error) {
      throw new Error(`OAuth flow failed: ${error.message}`);
    }
  }

  /**
   * 检查账号状态（功能验证）
   * 使用chat-stream端点进行真实功能验证，参考Git项目的正确实现
   */
  async checkAccountStatus(token, tenantUrl) {
    try {
      // 确保 tenant URL 以斜杠结尾
      const baseUrl = tenantUrl.endsWith('/') ? tenantUrl : `${tenantUrl}/`;
      const apiUrl = `${baseUrl}chat-stream`;

      // 构建真实的聊天请求体（参考Git项目实现）
      const requestBody = {
        "chat_history": [{
          "response_text": "你好 Cube! 我是 Augment，很高兴为你提供帮助。",
          "request_message": "你好，我是Cube"
        }],
        "message": "我叫什么名字",
        "mode": "CHAT"
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const response = await axios.post(apiUrl, requestBody, {
        headers,
        timeout: 30000,
        validateStatus: () => true // 不抛出状态码错误
      });

      const statusCode = response.status;
      const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      // 精确的状态码判断（参考Git项目实现）
      // 只依据HTTP状态码判断，不检查响应内容
      switch (statusCode) {
        case 200:
          // 200状态码表示令牌有效，可以正常使用聊天功能
          return {
            is_banned: false,
            status: 'ACTIVE',
            error_message: null,
            response_code: statusCode
          };

        case 401:
          // 401状态码表示令牌失效或被封禁（最重要的判断）
          return {
            is_banned: true,
            status: 'UNAUTHORIZED',
            error_message: 'Token is invalid or banned',
            response_code: statusCode
          };

        case 403:
          return {
            is_banned: true,
            status: 'FORBIDDEN',
            error_message: 'Access forbidden',
            response_code: statusCode
          };

        case 429:
          return {
            is_banned: true,
            status: 'RATE_LIMITED',
            error_message: 'Rate limit exceeded',
            response_code: statusCode
          };

        default:
          // 其他状态码的处理
          const isBanned = statusCode >= 400 && statusCode < 500;
          let status = 'UNKNOWN_ERROR';
          let errorMessage = 'Unknown error';

          if (statusCode >= 500) {
            status = 'SERVER_ERROR';
            errorMessage = 'Server error - cannot determine ban status';
          } else if (statusCode >= 400) {
            status = 'CLIENT_ERROR';
            errorMessage = 'Client error';
          }

          return {
            is_banned: isBanned,
            status,
            error_message: `${errorMessage}: ${responseBody}`,
            response_code: statusCode
          };
      }
    } catch (error) {
      return {
        is_banned: false,
        status: 'SERVER_ERROR',
        error_message: `Status check failed: ${error.message}`,
        response_code: null
      };
    }
  }

  /**
   * 获取客户信息和使用统计（基础信息查询）
   * 此方法只获取Portal API信息，不维护账号状态
   */
  async getCustomerInfo(token, tenantUrl) {
    try {
      // 从Portal URL中提取token - 完全复制temp的逻辑
      let portalToken = token;
      if (tenantUrl && tenantUrl.includes('portal.withorb.com')) {
        try {
          const url = new URL(tenantUrl);
          const extractedToken = url.searchParams.get('token');
          if (extractedToken) {
            portalToken = extractedToken;
          }
        } catch (error) {
          // 如果URL解析失败，使用原始token
          portalToken = token;
        }
      }



      const url = `https://portal.withorb.com/api/v1/customer_from_link?token=${portalToken}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Charset': 'utf-8',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        timeout: 30000
      });

      const customerData = response.data;

      // 如果有客户信息，获取详细的使用统计
      if (customerData.customer && customerData.customer.ledger_pricing_units && customerData.customer.ledger_pricing_units.length > 0) {
        const customerId = customerData.customer.id;
        const pricingUnitId = customerData.customer.ledger_pricing_units[0].id;

        try {
          const ledgerData = await this.getLedgerSummary(customerId, pricingUnitId, portalToken);

          // 提取创建时间和过期时间
          let createdAt = null;
          let expiryDate = null;
          let isActive = false;

          if (ledgerData.credit_blocks && ledgerData.credit_blocks.length > 0) {
            const firstBlock = ledgerData.credit_blocks[0];
            createdAt = firstBlock.created_at;
            expiryDate = firstBlock.expiry_date;
            isActive = firstBlock.is_active;
          }

          return {
            customer_id: customerId,
            pricing_unit_id: pricingUnitId,
            credits_balance: ledgerData.credits_balance || 0,
            total_usage: ledgerData.total_usage || 0,
            is_active: isActive,
            created_at: createdAt,
            expiry_date: expiryDate,
            usage_stats: {
              credits_balance: ledgerData.credits_balance || 0,
              total_usage: ledgerData.total_usage || 0,
              last_updated: new Date()
            },
            raw_customer_data: customerData,
            raw_ledger_data: ledgerData
          };
        } catch (ledgerError) {
          // 如果获取ledger失败，返回基础客户信息
          return {
            customer_id: customerId,
            pricing_unit_id: pricingUnitId,
            credits_balance: 0,
            total_usage: 0,
            is_active: false,
            created_at: null,
            expiry_date: null,
            usage_stats: {
              credits_balance: 0,
              total_usage: 0,
              last_updated: new Date()
            },
            raw_customer_data: customerData,
            error: ledgerError.message
          };
        }
      }

      return {
        credits_balance: 0,
        total_usage: 0,
        is_active: false,
        created_at: null,
        expiry_date: null,
        usage_stats: {
          credits_balance: 0,
          total_usage: 0,
          last_updated: new Date()
        },
        raw_customer_data: customerData,
        error: 'No customer data available'
      };
    } catch (error) {
      throw new Error(`Failed to get customer info: ${error.message}`);
    }
  }

  /**
   * 获取账本摘要
   */
  async getLedgerSummary(customerId, pricingUnitId, token) {
    try {
      const url = `https://portal.withorb.com/api/v1/customers/${customerId}/ledger_summary?pricing_unit_id=${pricingUnitId}&token=${token}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Charset': 'utf-8',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ledger summary: ${error.message}`);
    }
  }

  /**
   * 加密令牌
   */
  encryptToken(token) {
    if (!token) return token;

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.ALGORITHM, this.ENCRYPTION_KEY);

      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // 返回格式：iv:authTag:encryptedData
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Token encryption failed:', error);
      return token; // 加密失败时返回原始值
    }
  }

  /**
   * 解密令牌
   */
  decryptToken(encryptedToken) {
    if (!encryptedToken) return null;

    try {
      const parts = encryptedToken.split(':');
      if (parts.length !== 3) {
        // 可能是未加密的旧数据
        return encryptedToken;
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Token decryption failed:', error);
      return null;
    }
  }

  /**
   * 验证租户 URL 格式
   */
  validateTenantUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  /**
   * 验证 Portal URL 格式
   */
  validatePortalUrl(url) {
    if (!url) return true; // 可选字段
    return this.validateTenantUrl(url);
  }
}

module.exports = new AugmentService();
