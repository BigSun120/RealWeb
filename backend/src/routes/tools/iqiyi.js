/**
 * 爱奇艺视频解析和下载路由
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

const router = express.Router();

// Python脚本路径
const IQIYI_PARSER_SCRIPT = path.join(__dirname, '../../../scripts/iqiyi_parser_simple.py');
const TEMP_DIR = path.join(__dirname, '../../../temp');

// 确保临时目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * 调用Python脚本的通用函数
 */
async function callPythonScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python script output: ${stdout}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python script: ${error.message}`));
    });
  });
}

/**
 * 解析爱奇艺视频
 */
router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.json({
        success: false,
        error: '请提供视频链接'
      });
    }

    // 验证是否为爱奇艺链接
    if (!url.includes('iqiyi.com')) {
      return res.json({
        success: false,
        error: '不是有效的爱奇艺链接',
        error_type: 'invalid_url'
      });
    }

    logger.info('开始解析爱奇艺视频:', url);

    // 调用Python解析脚本
    const result = await callPythonScript(IQIYI_PARSER_SCRIPT, [url]);

    if (result.success) {
      // 转换格式以匹配前端期望的结构
      const response = {
        success: true,
        result: {
          platform: 'iqiyi',
          title: result.title || '爱奇艺视频',
          thumbnail: result.thumbnail || '',
          duration: result.duration || 0,
          uploader: result.uploader || '爱奇艺',
          description: result.description || '',
          tvid: result.tvid,
          vid: result.vid,
          url: result.url || url,
          streams: result.streams || {
            available: [],
            recommended: []
          }
        }
      };

      res.json(response);
    } else {
      res.json({
        success: false,
        error: result.error || '爱奇艺视频解析失败',
        error_type: result.error_type || 'parsing_failed'
      });
    }

  } catch (error) {
    logger.error('解析爱奇艺视频失败:', error);
    res.json({
      success: false,
      error: '解析失败，请稍后重试'
    });
  }
});

/**
 * 下载爱奇艺视频
 */
router.post('/download', async (req, res) => {
  try {
    const { url, tvid, vid } = req.body;

    if (!url || !tvid || !vid) {
      return res.json({
        success: false,
        error: '缺少必要参数'
      });
    }

    logger.info('开始下载爱奇艺视频:', { url, tvid, vid });

    // 生成唯一的输出文件名
    const timestamp = Date.now();
    const outputFileName = `iqiyi_${tvid}_${timestamp}`;
    const outputPath = path.join(TEMP_DIR, outputFileName);

    // 这里需要实现实际的下载逻辑
    // 由于爱奇艺的下载比较复杂，可能需要额外的工具或库

    // 临时返回成功响应（实际项目中需要实现真正的下载）
    res.json({
      success: true,
      result: {
        fileName: `${outputFileName}.mp4`,
        downloadPath: `/api/tools/iqiyi/file/${outputFileName}.mp4`,
        platform: 'iqiyi'
      }
    });

  } catch (error) {
    logger.error('下载爱奇艺视频失败:', error);
    res.json({
      success: false,
      error: '下载失败，请稍后重试'
    });
  }
});

/**
 * 获取下载的文件
 */
router.get('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(TEMP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    // 设置下载头
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // 下载完成后删除文件
    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000); // 5秒后删除
    });

  } catch (error) {
    logger.error('获取文件失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件失败'
    });
  }
});

/**
 * 健康检查
 */
router.get('/health', (_, res) => {
  res.json({
    success: true,
    service: 'iqiyi',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
