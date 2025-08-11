const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

const router = express.Router();

// Python脚本路径
const YOUTUBE_INFO_SCRIPT = path.join(__dirname, '../../../scripts/youtube_info.py');
const YOUTUBE_INFO_YTDLP_SCRIPT = path.join(__dirname, '../../../scripts/youtube_info_ytdlp.py');
const YOUTUBE_DOWNLOAD_SCRIPT = path.join(__dirname, '../../../scripts/youtube_downloader.py');
const YEWTUBE_SERVICE_SCRIPT = path.join(__dirname, '../../../scripts/yewtube_service.py');
const TEMP_DIR = path.join(__dirname, '../../../temp');
const COOKIES_PATH = path.join(__dirname, '../../../config/cookies.txt');

// 确保临时目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * 解析YouTube视频信息
 */
router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.json({
        success: false,
        error: '请提供YouTube视频链接'
      });
    }

    // 验证是否为YouTube链接
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.json({
        success: false,
        error: '请提供有效的YouTube视频链接'
      });
    }

    logger.info('开始解析YouTube视频:', url);

    // 优先使用yewtube服务（基于yt-dlp + youtube-search-python）
    let result;
    let usedMethod = '';

    try {
      usedMethod = 'yewtube service';
      result = await callPythonScript(YEWTUBE_SERVICE_SCRIPT, ['info', url]);

      // 如果yewtube服务失败，尝试备用方案
      if (!result.success) {
        if (fs.existsSync(COOKIES_PATH)) {
          usedMethod = 'yt-dlp with cookies (fallback)';
          result = await callPythonScript(YOUTUBE_INFO_YTDLP_SCRIPT, [url]);
        } else {
          usedMethod = 'pytube (fallback)';
          result = await callPythonScript(YOUTUBE_INFO_SCRIPT, [url]);
        }
      }
    } catch (error) {
      logger.error('yewtube服务执行失败，尝试备用方案:', error);

      if (fs.existsSync(COOKIES_PATH)) {
        usedMethod = 'yt-dlp with cookies (fallback)';
        result = await callPythonScript(YOUTUBE_INFO_YTDLP_SCRIPT, [url]);
      } else {
        usedMethod = 'pytube (fallback)';
        result = await callPythonScript(YOUTUBE_INFO_SCRIPT, [url]);
      }
    }

    if (result.success) {

      // 转换格式以匹配前端期望的结构
      const response = {
        success: true,
        method: usedMethod,
        result: {
          platform: 'youtube',
          title: result.title,
          thumbnail: result.thumbnail_url,
          duration: result.length,
          uploader: result.author,
          description: result.description,
          views: result.views,
          publish_date: result.publish_date,
          video_id: result.video_id,
          channel_url: result.channel_url,
          keywords: result.keywords,
          best: {
            video: result.streams.progressive[0] || result.streams.video_only[0],
            audio: result.streams.audio_only[0]
          },
          available: {
            progressive: result.streams.progressive,
            video_only: result.streams.video_only,
            audio_only: result.streams.audio_only,
            recommended: result.recommended
          }
        }
      };

      res.json(response);
    } else {

      // 根据错误类型提供友好的错误信息
      let userMessage = result.error;
      switch (result.error_type) {
        case 'unavailable':
          userMessage = '视频不可用，可能已被删除或设为私有';
          break;
        case 'age_restricted':
          userMessage = '视频有年龄限制，需要登录才能访问';
          break;
        case 'live_stream':
          userMessage = '无法下载直播流';
          break;
        case 'private':
          userMessage = '这是私有视频，无法下载';
          break;
        case 'region_blocked':
          userMessage = '视频在您的地区被屏蔽';
          break;
        case 'members_only':
          userMessage = '这是会员专享视频';
          break;
        default:
          userMessage = 'YouTube访问受限，请稍后再试或检查网络连接';
      }

      res.json({
        success: false,
        error: userMessage,
        error_type: result.error_type,
        details: result.details
      });
    }

  } catch (error) {
    logger.error('解析YouTube视频失败:', error);
    res.json({
      success: false,
      error: '服务器内部错误，请稍后重试'
    });
  }
});

/**
 * 搜索YouTube视频
 */
router.post('/search', async (req, res) => {
  try {
    const { query, maxResults = 20 } = req.body;

    if (!query) {
      return res.json({
        success: false,
        error: '请提供搜索关键词'
      });
    }

    logger.info('开始搜索YouTube视频:', query);

    // 使用yewtube服务搜索
    const result = await callPythonScript(YEWTUBE_SERVICE_SCRIPT, ['search', query, maxResults.toString()]);

    if (result.success) {
      res.json({
        success: true,
        results: result.results,
        total: result.total,
        query: query
      });
    } else {
      res.json({
        success: false,
        error: result.error || 'YouTube搜索失败',
        error_type: result.error_type
      });
    }

  } catch (error) {
    logger.error('搜索YouTube视频失败:', error);
    res.json({
      success: false,
      error: '搜索失败，请稍后重试'
    });
  }
});

/**
 * 下载YouTube视频
 */
router.post('/download', async (req, res) => {
  try {
    const { url, format, audioOnly = false } = req.body;

    if (!url || !format) {
      return res.json({
        success: false,
        error: '缺少必要参数'
      });
    }

    logger.info('开始下载YouTube视频:', { url, format, audioOnly });

    // 设置输出路径
    const outputPath = TEMP_DIR;

    // 调用Python下载脚本
    const result = await callPythonScriptWithProgress(
      YOUTUBE_DOWNLOAD_SCRIPT,
      [url, format, outputPath],
      (progress) => {
        // 这里可以通过WebSocket发送进度给前端
        logger.info('下载进度:', progress);
      }
    );

    if (result.success) {
      logger.info('YouTube视频下载成功:', result.filename);

      res.json({
        success: true,
        result: {
          fileName: result.filename,
          downloadPath: `/api/tools/youtube/file/${result.filename}`,
          title: result.title,
          filesize: result.filesize,
          download_time: result.download_time
        }
      });
    } else {
      logger.error('YouTube视频下载失败:', result.error);
      res.json({
        success: false,
        error: result.error,
        error_type: result.error_type
      });
    }

  } catch (error) {
    logger.error('下载YouTube视频失败:', error);
    res.json({
      success: false,
      error: '下载失败，请稍后重试'
    });
  }
});

/**
 * 检查cookies状态
 */
router.get('/cookies/status', (_, res) => {
  try {
    const cookiesExists = fs.existsSync(COOKIES_PATH);
    let cookiesInfo = null;

    if (cookiesExists) {
      const stats = fs.statSync(COOKIES_PATH);
      const content = fs.readFileSync(COOKIES_PATH, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      cookiesInfo = {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        cookieCount: lines.length,
        hasImportantCookies: lines.some(line =>
          line.includes('VISITOR_INFO1_LIVE') ||
          line.includes('__Secure-3PSID') ||
          line.includes('CONSENT')
        )
      };
    }

    res.json({
      success: true,
      cookies: cookiesInfo || { exists: false }
    });

  } catch (error) {
    logger.error('检查cookies状态失败:', error);
    res.json({
      success: false,
      error: '检查cookies状态失败'
    });
  }
});

/**
 * 上传cookies文件
 */
router.post('/cookies/upload', (req, res) => {
  try {
    const { cookiesContent } = req.body;

    if (!cookiesContent) {
      return res.json({
        success: false,
        error: '请提供cookies内容'
      });
    }

    // 验证cookies格式
    const lines = cookiesContent.split('\n');
    const validLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });

    if (validLines.length === 0) {
      return res.json({
        success: false,
        error: 'cookies内容无效'
      });
    }

    // 确保config目录存在
    const configDir = path.dirname(COOKIES_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // 保存cookies文件
    fs.writeFileSync(COOKIES_PATH, cookiesContent, 'utf8');

    logger.info('YouTube cookies已更新');

    res.json({
      success: true,
      message: 'Cookies已成功上传',
      cookieCount: validLines.length
    });

  } catch (error) {
    logger.error('上传cookies失败:', error);
    res.json({
      success: false,
      error: '上传cookies失败'
    });
  }
});

/**
 * 删除cookies文件
 */
router.delete('/cookies', (_, res) => {
  try {
    if (fs.existsSync(COOKIES_PATH)) {
      fs.unlinkSync(COOKIES_PATH);
      logger.info('YouTube cookies已删除');
    }

    res.json({
      success: true,
      message: 'Cookies已删除'
    });

  } catch (error) {
    logger.error('删除cookies失败:', error);
    res.json({
      success: false,
      error: '删除cookies失败'
    });
  }
});

/**
 * 提供下载文件
 */
router.get('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(TEMP_DIR, filename);

    logger.info('请求YouTube下载文件:', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 创建文件流
    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);

    // 下载完成后清理文件
    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info('清理YouTube下载文件:', filename);
          }
        } catch (error) {
          logger.error('清理文件失败:', error);
        }
      }, 5000); // 5秒后删除
    });

    fileStream.on('error', (error) => {
      logger.error('文件流错误:', error);
      res.status(500).json({
        success: false,
        error: '文件读取失败'
      });
    });

  } catch (error) {
    logger.error('提供文件失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 调用Python脚本
 */
function callPythonScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [scriptPath, ...args]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse Python script output'));
        }
      } else {
        logger.error('Python脚本执行失败:', { code, stderr: errorOutput });
        reject(new Error(`Python script failed with code ${code}`));
      }
    });

    python.on('error', (error) => {
      logger.error('Python脚本启动失败:', error);
      reject(error);
    });
  });
}

/**
 * 调用Python脚本并处理进度
 */
function callPythonScriptWithProgress(scriptPath, args, progressCallback) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [scriptPath, ...args]);

    let finalResult = null;

    python.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);

          if (parsed.type === 'progress') {
            progressCallback(parsed);
          } else if (parsed.type === 'start') {
            logger.info('开始下载:', parsed.title);
          } else if (parsed.type === 'complete' || parsed.success !== undefined) {
            finalResult = parsed;
          }
        } catch (error) {
          // 忽略非JSON行
        }
      }
    });

    python.on('close', (code) => {
      if (code === 0 && finalResult) {
        resolve(finalResult);
      } else {
        reject(new Error(`Python script failed with code ${code}`));
      }
    });

    python.on('error', (error) => {
      reject(error);
    });
  });
}

module.exports = router;
