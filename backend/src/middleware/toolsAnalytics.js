const ToolUsage = require('../models/ToolUsage');
const logger = require('../utils/logger');
const UAParser = require('ua-parser-js');

/**
 * 工具使用统计中间件
 */
class ToolsAnalytics {
  /**
   * 记录工具使用统计
   */
  static recordUsage = async (req, res, next) => {
    try {
      const toolId = req.params.id || req.params.toolId;
      if (!toolId) {
        return next();
      }

      // 解析用户代理
      const parser = new UAParser(req.get('User-Agent'));
      const uaResult = parser.getResult();

      // 获取设备信息
      const deviceInfo = {
        type: this.getDeviceType(uaResult),
        os: uaResult.os.name || 'unknown',
        browser: uaResult.browser.name || 'unknown',
        screen: {
          width: parseInt(req.get('Screen-Width')) || 0,
          height: parseInt(req.get('Screen-Height')) || 0
        }
      };

      // 获取地理位置信息（可选，需要IP地理位置服务）
      const locationInfo = await this.getLocationInfo(req.ip);

      // 确定来源
      const source = this.determineSource(req.get('Referer'));

      // 记录使用数据
      const usageData = {
        toolIdentifier: toolId,
        userId: req.user ? req.user._id : null,
        sessionId: req.sessionID || this.generateSessionId(req),
        userAgent: req.get('User-Agent'),
        ipAddress: this.getClientIP(req),
        action: this.determineAction(req),
        device: deviceInfo,
        location: locationInfo,
        referrer: req.get('Referer'),
        source: source,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
          timestamp: new Date().toISOString()
        }
      };

      // 异步记录，不阻塞请求
      setImmediate(async () => {
        try {
          await ToolUsage.recordUsage(usageData);
        } catch (error) {
          logger.error('记录工具使用统计失败:', error);
        }
      });

    } catch (error) {
      logger.error('工具统计中间件错误:', error);
    }

    next();
  };

  /**
   * 记录工具使用完成（带性能数据）
   */
  static recordCompletion = (startTime) => {
    return async (req, res, next) => {
      try {
        const toolId = req.params.id || req.params.toolId;
        if (!toolId) {
          return next();
        }

        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const success = res.statusCode < 400;

        // 获取输入输出大小
        const inputSize = this.getRequestSize(req);
        const outputSize = this.getResponseSize(res);

        // 更新使用记录
        const updateData = {
          responseTime,
          success,
          inputSize,
          outputSize,
          duration: Math.floor(responseTime / 1000), // 转换为秒
          errorMessage: success ? null : res.statusMessage
        };

        // 异步更新
        setImmediate(async () => {
          try {
            // 查找最近的使用记录并更新
            await ToolUsage.findOneAndUpdate(
              {
                toolIdentifier: toolId,
                userId: req.user ? req.user._id : null,
                createdAt: { $gte: new Date(startTime - 5000) } // 5秒内的记录
              },
              updateData,
              { sort: { createdAt: -1 } }
            );
          } catch (error) {
            logger.error('更新工具使用统计失败:', error);
          }
        });

      } catch (error) {
        logger.error('工具完成统计中间件错误:', error);
      }

      next();
    };
  };

  /**
   * 获取设备类型
   */
  static getDeviceType(uaResult) {
    if (uaResult.device.type === 'mobile') return 'mobile';
    if (uaResult.device.type === 'tablet') return 'tablet';
    if (uaResult.device.type === 'smarttv') return 'tv';
    if (uaResult.device.type === 'wearable') return 'wearable';
    return 'desktop';
  }

  /**
   * 获取客户端真实IP
   */
  static getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
  }

  /**
   * 生成会话ID
   */
  static generateSessionId(req) {
    const ip = this.getClientIP(req);
    const ua = req.get('User-Agent') || '';
    const timestamp = Date.now();
    return require('crypto')
      .createHash('md5')
      .update(`${ip}-${ua}-${timestamp}`)
      .digest('hex');
  }

  /**
   * 确定用户操作类型
   */
  static determineAction(req) {
    const method = req.method.toLowerCase();
    const path = req.path.toLowerCase();

    if (method === 'get') {
      return 'view';
    } else if (method === 'post') {
      if (path.includes('usage')) return 'use';
      if (path.includes('favorite')) return 'favorite';
      if (path.includes('share')) return 'share';
      if (path.includes('download')) return 'download';
      return 'use';
    }

    return 'use';
  }

  /**
   * 确定访问来源
   */
  static determineSource(referer) {
    if (!referer) return 'direct';

    const refererLower = referer.toLowerCase();
    
    if (refererLower.includes('google.com') || 
        refererLower.includes('bing.com') || 
        refererLower.includes('baidu.com')) {
      return 'search';
    }
    
    if (refererLower.includes('facebook.com') || 
        refererLower.includes('twitter.com') || 
        refererLower.includes('weibo.com')) {
      return 'social';
    }
    
    if (refererLower.includes('mail.') || 
        refererLower.includes('gmail.com')) {
      return 'email';
    }

    // 检查是否为同域名
    try {
      const refererUrl = new URL(referer);
      const currentDomain = process.env.DOMAIN || 'localhost';
      if (refererUrl.hostname.includes(currentDomain)) {
        return 'internal';
      }
    } catch (error) {
      // URL解析失败
    }

    return 'referral';
  }

  /**
   * 获取地理位置信息（需要IP地理位置服务）
   */
  static async getLocationInfo(ip) {
    try {
      // 这里可以集成IP地理位置服务，如：
      // - MaxMind GeoIP
      // - IP-API
      // - ipinfo.io
      
      // 示例：使用免费的ip-api服务
      if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.')) {
        // 在生产环境中实现真实的地理位置查询
        // const response = await fetch(`http://ip-api.com/json/${ip}`);
        // const data = await response.json();
        // return {
        //   country: data.country,
        //   region: data.regionName,
        //   city: data.city,
        //   timezone: data.timezone
        // };
      }

      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown'
      };
    } catch (error) {
      logger.error('获取地理位置信息失败:', error);
      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown'
      };
    }
  }

  /**
   * 获取请求大小
   */
  static getRequestSize(req) {
    try {
      const contentLength = req.get('Content-Length');
      if (contentLength) {
        return parseInt(contentLength);
      }

      // 估算请求大小
      let size = 0;
      if (req.body) {
        size += JSON.stringify(req.body).length;
      }
      if (req.query) {
        size += JSON.stringify(req.query).length;
      }
      return size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取响应大小
   */
  static getResponseSize(res) {
    try {
      const contentLength = res.get('Content-Length');
      if (contentLength) {
        return parseInt(contentLength);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 创建统计中间件
   */
  static createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // 记录开始使用
      this.recordUsage(req, res, () => {});
      
      // 监听响应结束
      res.on('finish', () => {
        this.recordCompletion(startTime)(req, res, () => {});
      });
      
      next();
    };
  }
}

module.exports = ToolsAnalytics;
