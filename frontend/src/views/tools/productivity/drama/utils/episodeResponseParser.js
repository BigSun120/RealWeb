/**
 * 分集AI响应解析器
 * 解析AI生成的分集剧本内容
 */

/**
 * 提取字段内容（支持【】标记）
 * @param {String} text 文本
 * @param {String} fieldName 字段名
 * @returns {String} 字段内容
 */
function extractField(text, fieldName) {
  // 匹配【字段名】后的内容，直到遇到下一个【】或文本结束
  const pattern = new RegExp(`【${fieldName}】\\s*([\\s\\S]*?)(?=【[^】]+】|$)`, 'i');
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

/**
 * 提取场景列表
 * @param {String} text 文本
 * @returns {Array} 场景列表
 */
function extractScenes(text) {
  const scenes = [];
  const scenePattern = /【场景(\d+)】\s*([\s\S]*?)(?=【场景\d+】|【关键对白】|【结尾悬念】|$)/gi;
  
  let match;
  while ((match = scenePattern.exec(text)) !== null) {
    const sceneNumber = match[1];
    const sceneContent = match[2].trim();
    
    // 解析场景内容
    const scene = {
      number: parseInt(sceneNumber),
      location: '',
      time: '',
      atmosphere: '',
      content: ''
    };
    
    // 提取场景的各个字段
    const locationMatch = sceneContent.match(/地点[：:]\s*([^\n]+)/i);
    if (locationMatch) {
      scene.location = locationMatch[1].trim();
    }
    
    const timeMatch = sceneContent.match(/时间[：:]\s*([^\n]+)/i);
    if (timeMatch) {
      scene.time = timeMatch[1].trim();
    }
    
    const atmosphereMatch = sceneContent.match(/氛围[：:]\s*([^\n]+)/i);
    if (atmosphereMatch) {
      scene.atmosphere = atmosphereMatch[1].trim();
    }
    
    const contentMatch = sceneContent.match(/内容[：:]\s*([\s\S]+)/i);
    if (contentMatch) {
      scene.content = contentMatch[1].trim();
    } else {
      // 如果没有明确的"内容："标记，把剩余内容都当作内容
      const remainingContent = sceneContent
        .replace(/地点[：:][^\n]+/i, '')
        .replace(/时间[：:][^\n]+/i, '')
        .replace(/氛围[：:][^\n]+/i, '')
        .trim();
      if (remainingContent) {
        scene.content = remainingContent;
      }
    }
    
    scenes.push(scene);
  }
  
  return scenes;
}

/**
 * 提取关键对白
 * @param {String} text 文本
 * @returns {Array} 关键对白列表
 */
function extractKeyDialogues(text) {
  const dialogues = [];
  const keyDialogueContent = extractField(text, '关键对白');
  
  if (!keyDialogueContent) return dialogues;
  
  // 尝试按行分割，每行是一个对白
  const lines = keyDialogueContent.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    // 移除可能的数字编号、项目符号等
    const cleaned = line.replace(/^[\d\.\-\*、]+\s*/, '').trim();
    if (cleaned) {
      dialogues.push(cleaned);
    }
  });
  
  return dialogues;
}

/**
 * 解析AI生成的分集剧本
 * @param {String} aiResponse AI响应文本
 * @returns {Object} 解析后的分集数据
 */
export function parseEpisodeResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    throw new Error('无效的AI响应内容');
  }
  
  const result = {
    title: '',
    content: {
      summary: '',
      scenes: [],
      keyDialogues: [],
      cliffhanger: ''
    },
    wordCount: 0
  };
  
  try {
    // 提取集标题
    result.title = extractField(aiResponse, '集标题');
    
    // 提取内容概要
    result.content.summary = extractField(aiResponse, '内容概要');
    
    // 提取场景
    result.content.scenes = extractScenes(aiResponse);
    
    // 提取关键对白
    result.content.keyDialogues = extractKeyDialogues(aiResponse);
    
    // 提取结尾悬念
    result.content.cliffhanger = extractField(aiResponse, '结尾悬念');
    
    // 计算字数（粗略估算）
    let totalWords = 0;
    if (result.content.summary) {
      totalWords += result.content.summary.length;
    }
    result.content.scenes.forEach(scene => {
      if (scene.content) {
        totalWords += scene.content.length;
      }
    });
    result.wordCount = totalWords;
    
    // 验证解析结果
    if (!result.title && !result.content.summary && result.content.scenes.length === 0) {
      throw new Error('未能从AI响应中提取到有效内容，请确保AI输出使用了【字段名】格式');
    }
    
  } catch (error) {
    console.error('解析AI响应失败:', error);
    throw new Error(`解析失败: ${error.message}`);
  }
  
  return result;
}

/**
 * 批量解析多集剧本
 * @param {String} aiResponse AI响应文本（包含多集）
 * @returns {Array} 解析后的多集数据
 */
export function parseBatchEpisodesResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    throw new Error('无效的AI响应内容');
  }
  
  const episodes = [];
  
  // 尝试按分隔符拆分多集
  // 支持 "========== 第 X 集 ==========" 或 "### 第 X 集" 等格式
  const episodeSections = aiResponse.split(/={5,}\s*第\s*\d+\s*集\s*={5,}|#{2,}\s*第\s*\d+\s*集/);
  
  episodeSections.forEach((section, index) => {
    if (!section.trim()) return;
    
    try {
      const episodeData = parseEpisodeResponse(section);
      episodes.push(episodeData);
    } catch (error) {
      console.warn(`解析第 ${index + 1} 个分集时失败:`, error.message);
    }
  });
  
  if (episodes.length === 0) {
    // 如果没有找到分隔符，尝试作为单集解析
    try {
      episodes.push(parseEpisodeResponse(aiResponse));
    } catch (error) {
      throw new Error('未能解析任何分集内容');
    }
  }
  
  return episodes;
}

/**
 * 验证解析结果的完整性
 * @param {Object} episodeData 分集数据
 * @returns {Object} 验证结果
 */
export function validateEpisodeData(episodeData) {
  const warnings = [];
  
  if (!episodeData.title) {
    warnings.push('缺少集标题');
  }
  
  if (!episodeData.content.summary) {
    warnings.push('缺少内容概要');
  }
  
  if (!episodeData.content.scenes || episodeData.content.scenes.length === 0) {
    warnings.push('缺少场景设置');
  } else {
    episodeData.content.scenes.forEach((scene, index) => {
      if (!scene.location) {
        warnings.push(`场景${index + 1}缺少地点`);
      }
      if (!scene.content) {
        warnings.push(`场景${index + 1}缺少内容`);
      }
    });
  }
  
  if (!episodeData.content.cliffhanger) {
    warnings.push('缺少结尾悬念');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

export default {
  parseEpisodeResponse,
  parseBatchEpisodesResponse,
  validateEpisodeData
};
