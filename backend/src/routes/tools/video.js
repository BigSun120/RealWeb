/**
 * 视频下载工具API路由
 * 简化实现 - 基础但可用的版本
 */

const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { optionalAuth } = require('../../middleware/auth');
const ToolsPermission = require('../../middleware/toolsPermission');
const ActivityLogger = require('../../middleware/activityLogger');
const logger = require('../../utils/logger');

const router = express.Router();

// 应用工具箱权限中间件
router.use(ToolsPermission.checkToolboxEnabled);
router.use(ToolsPermission.checkRateLimit);

// 临时文件目录
const tempDir = path.join(process.cwd(), 'temp', 'videos');

// 确保临时目录存在
function ensureTempDir() {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

/**
 * 检查yt-dlp是否可用
 */
function checkYtDlp() {
  try {
    // 尝试直接命令
    execSync('yt-dlp --version', { stdio: 'ignore' });
    return 'yt-dlp';
  } catch (error) {
    try {
      // 尝试python模块方式
      execSync('python -m yt_dlp --version', { stdio: 'ignore' });
      return 'python -m yt_dlp';
    } catch (error2) {
      logger.error('yt-dlp不可用:', error2.message);
      return false;
    }
  }
}

/**
 * Bilibili平台检测
 */
function detectPlatform(url) {
  if (url.includes('bilibili.com') || url.includes('b23.tv')) {
    return 'bilibili';
  }
  return null;
}

/**
 * 解析视频信息 - 简化版本
 * POST /api/tools/video/parse
 */
router.post('/parse', optionalAuth, (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.json({
        success: false,
        error: '请提供视频链接'
      });
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return res.json({
        success: false,
        error: '仅支持Bilibili视频链接，请使用 https://www.bilibili.com/ 的视频链接'
      });
    }

    // 检查yt-dlp
    const ytdlpCmd = checkYtDlp();
    if (!ytdlpCmd) {
      return res.json({
        success: false,
        error: 'yt-dlp工具不可用，请确保已正确安装'
      });
    }

    ensureTempDir();

    console.log('开始解析视频:', url);

    // 使用yt-dlp解析视频信息，针对YouTube添加特殊处理
    let output;
    let parseSuccess = false;
    let lastError = null; // 移到外层作用域

    // Bilibili视频解析
    try {
      const cmd = `${ytdlpCmd} --print-json --skip-download "${url}"`;
      output = execSync(cmd, {
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10
      });
      parseSuccess = true;
    } catch (error) {
      lastError = error;
      parseSuccess = false;
    }

    if (parseSuccess) {
      try {
        const videoInfo = JSON.parse(output);
        console.log('解析成功:', videoInfo.title);

      // 改进的格式解析
      const audios = [];
      const videos = [];

      videoInfo.formats.forEach(format => {
        const filesize = format.filesize || format.filesize_approx || 0;
        const sizeInMB = (filesize / 1024 / 1024).toFixed(2);

        if (format.audio_ext !== 'none' && format.video_ext === 'none') {
          // 纯音频格式
          audios.push({
            id: format.format_id,
            format: format.ext,
            rate: format.abr || 0,
            info: format.format_note || '',
            size: sizeInMB,
            quality: format.abr || 0
          });
        } else if (format.video_ext !== 'none') {
          // 视频格式 - 优先MP4
          const isMP4 = format.ext === 'mp4' || format.video_ext === 'mp4';
          videos.push({
            id: format.format_id,
            format: format.ext,
            scale: format.resolution || 'unknown',
            frame: format.height || 0,
            rate: format.vbr || 0,
            info: format.format_note || '',
            size: sizeInMB,
            isMP4: isMP4,
            quality: format.height || 0
          });
        }
      });

      // 排序：MP4格式优先，然后按质量排序
      audios.sort((a, b) => (b.quality || 0) - (a.quality || 0));
      videos.sort((a, b) => {
        // MP4格式优先
        if (a.isMP4 && !b.isMP4) return -1;
        if (!a.isMP4 && b.isMP4) return 1;
        // 然后按分辨率排序
        return (b.quality || 0) - (a.quality || 0);
      });

      // 选择最佳格式
      const bestAudio = audios[0] || {};
      const bestVideo = videos[0] || {};



      // 记录工具使用
      if (req.user) {
        ActivityLogger.logToolUsage(
          req.user._id,
          'video-downloader',
          'parse',
          { url, platform }
        ).catch(err => logger.error('记录工具使用失败:', err));
      }

      res.json({
        success: true,
        result: {
          platform,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          duration: videoInfo.duration,
          uploader: videoInfo.uploader,
          best: {
            audio: bestAudio,
            video: bestVideo
          },
          available: {
            audios,
            videos
          }
        }
      });

      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        res.json({
          success: false,
          error: '视频信息解析失败'
        });
        return;
      }
    } else {
      // 解析失败
      console.error('Bilibili视频解析失败');

      let errorMessage = 'Bilibili视频解析失败，请检查视频链接是否有效';

      // 针对常见错误提供具体建议
      if (lastError) {
        if (lastError.message.includes('Private video')) {
          errorMessage = '这是私有视频，无法下载';
        } else if (lastError.message.includes('Video unavailable')) {
          errorMessage = '视频不可用，可能已被删除或设为私有';
        } else if (lastError.message.includes('network')) {
          errorMessage = '网络连接问题，请检查网络后重试';
        }
      }

      res.json({
        success: false,
        error: errorMessage
      });
    }

  } catch (error) {
    logger.error('解析视频失败:', error);
    res.json({
      success: false,
      error: '服务器内部错误'
    });
  }
});



/**
 * 下载视频 - 简化版本
 * POST /api/tools/video/download
 */
router.post('/download', optionalAuth, (req, res) => {
  try {
    const { url, format, audioOnly = false } = req.body;

    if (!url || !format) {
      return res.json({
        success: false,
        error: '请提供视频链接和格式'
      });
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return res.json({
        success: false,
        error: '不支持的视频链接'
      });
    }

    const ytdlpCmd = checkYtDlp();
    if (!ytdlpCmd) {
      return res.json({
        success: false,
        error: 'yt-dlp工具不可用'
      });
    }

    ensureTempDir();

    console.log('开始下载视频:', url, 'format:', format);

    const timestamp = Date.now();
    const outputTemplate = path.join(tempDir, `${platform}_${timestamp}_%(title)s.%(ext)s`);

    // 构建yt-dlp命令
    let cmd;

    if (audioOnly) {
      // 音频下载：强制转换为MP3
      cmd = `${ytdlpCmd} -f "${format}" --extract-audio --audio-format mp3 -o "${outputTemplate}" "${url}"`;
    } else {
      // 视频下载：强制转换为MP4，并合并音视频
      if (format.includes('+')) {
        // 合并格式（如：137+140）
        cmd = `${ytdlpCmd} -f "${format}" --merge-output-format mp4 -o "${outputTemplate}" "${url}"`;
      } else {
        // 单一格式，尝试获取最佳MP4格式
        cmd = `${ytdlpCmd} -f "${format}[ext=mp4]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputTemplate}" "${url}"`;
      }
    }



    try {
      execSync(cmd, {
        encoding: 'utf8',
        timeout: 300000, // 5分钟超时
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });



      // 查找下载的文件
      const files = fs.readdirSync(tempDir);
      const downloadedFile = files.find(file => file.includes(timestamp.toString()));

      if (downloadedFile) {
        const filePath = path.join(tempDir, downloadedFile);
        const fileSize = fs.statSync(filePath).size;

        // 记录工具使用
        if (req.user) {
          ActivityLogger.logToolUsage(
            req.user._id,
            'video-downloader',
            'download',
            { url, platform, format, audioOnly }
          ).catch(err => logger.error('记录工具使用失败:', err));
        }

        res.json({
          success: true,
          result: {
            fileName: downloadedFile,
            fileSize,
            downloadPath: `/api/tools/video/file/${downloadedFile}`,
            platform
          }
        });
      } else {
        res.json({
          success: false,
          error: '下载完成但找不到文件'
        });
      }

    } catch (error) {
      console.error('下载失败:', error.message);
      res.json({
        success: false,
        error: '下载失败: ' + error.message
      });
    }
  } catch (error) {
    logger.error('下载视频失败:', error);
    res.json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 文件下载服务 - 简化版本
 * GET /api/tools/video/file/:filename
 */
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(tempDir, filename);

    console.log('请求下载文件:', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在或已过期'
      });
    }

    // 设置下载头
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
            console.log('清理下载文件:', filename);
          }
        } catch (error) {
          logger.error('清理文件失败:', error.message);
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
    logger.error('文件下载失败:', error);
    res.status(500).json({
      success: false,
      error: '文件下载失败'
    });
  }
});

module.exports = router;
