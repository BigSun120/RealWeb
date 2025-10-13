/**
 * 文件下载工具函数
 */

/**
 * 下载 Blob 文件
 * @param {Blob} blob - 文件 Blob 对象
 * @param {String} filename - 文件名
 */
export function downloadBlob(blob, filename) {
  // 验证 blob 是否为有效的 Blob 对象
  if (!blob || !(blob instanceof Blob)) {
    console.error('downloadBlob: Invalid blob object', blob);
    throw new Error('无效的文件数据');
  }
  
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('downloadBlob: Failed to download', error);
    throw new Error('下载文件失败: ' + error.message);
  }
}

/**
 * 生成带时间戳的文件名
 * @param {String} baseName - 基础文件名
 * @param {String} extension - 文件扩展名（不含点）
 * @returns {String} 完整文件名
 */
export function generateFilename(baseName, extension) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const safeName = baseName.replace(/[<>:"/\\|?*]/g, '_'); // 清理非法字符
  return `${safeName}_${timestamp}.${extension}`;
}

/**
 * 下载文本内容为文件
 * @param {String} content - 文本内容
 * @param {String} filename - 文件名
 * @param {String} mimeType - MIME 类型
 */
export function downloadText(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType}; charset=utf-8` });
  downloadBlob(blob, filename);
}

export default {
  downloadBlob,
  generateFilename,
  downloadText
};
