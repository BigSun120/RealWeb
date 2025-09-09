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
    this.ENCRYPTION_KEY = process.env.AUGMENT_TOKEN_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
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
   * 检查账号状态
   */
  async checkAccountStatus(token, tenantUrl) {
    try {
      // 确保 tenant URL 以斜杠结尾
      const baseUrl = tenantUrl.endsWith('/') ? tenantUrl : `${tenantUrl}/`;
      const apiUrl = `${baseUrl}find-missing`;

      const requestBody = {};
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

      // 分析响应确定账号状态
      if (responseBody.toLowerCase().includes('suspended')) {
        return {
          is_banned: true,
          status: 'SUSPENDED',
          error_message: 'Account is suspended based on response content',
          response_code: statusCode
        };
      } else if (statusCode >= 200 && statusCode < 300) {
        return {
          is_banned: false,
          status: 'ACTIVE',
          error_message: null,
          response_code: statusCode
        };
      } else {
        // 处理不同的错误状态码
        let status, errorMessage, isBanned;

        switch (statusCode) {
          case 401:
            status = 'UNAUTHORIZED';
            errorMessage = 'Token is invalid or account is banned';
            isBanned = true;
            break;
          case 403:
            status = 'FORBIDDEN';
            errorMessage = 'Access forbidden - account may be banned';
            isBanned = true;
            break;
          case 429:
            status = 'RATE_LIMITED';
            errorMessage = 'Rate limited - account is active but throttled';
            isBanned = false;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            status = 'SERVER_ERROR';
            errorMessage = 'Server error - cannot determine ban status';
            isBanned = false;
            break;
          default:
            status = 'UNKNOWN_ERROR';
            errorMessage = 'Unknown error - possible ban';
            isBanned = true;
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
   * 获取客户信息和使用统计
   */
  async getCustomerInfo(token, tenantUrl) {
    try {
      // 从Portal URL中提取token
      let portalToken = token;
      if (tenantUrl && tenantUrl.includes('portal.withorb.com')) {
        const urlParams = new URLSearchParams(tenantUrl.split('?')[1]);
        portalToken = urlParams.get('token') || token;
      }

      const url = `https://portal.withorb.com/api/v1/customer_from_link?token=${portalToken}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9'
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

          return {
            customer_id: customerId,
            pricing_unit_id: pricingUnitId,
            credits_balance: ledgerData.credits_balance || 0,
            total_usage: ledgerData.total_usage || 0,
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9'
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
