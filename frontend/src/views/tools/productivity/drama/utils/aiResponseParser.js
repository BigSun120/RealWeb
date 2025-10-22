/**
 * AI回答解析工具
 * 用于解析AI生成的内容并提取结构化字段
 */

/**
 * 通用字段提取函数
 * @param {string} text - AI回答全文
 * @param {string[]} keywords - 字段关键词列表
 * @param {number} maxLength - 最大提取长度（可选）
 * @returns {string} 提取的内容
 */
function extractField(text, keywords, maxLength = null) {
  if (!text) return '';
  
  // 常见的字段名列表，用于识别字段边界
  const fieldNames = '名称|描述|涉及角色|情感|集数|背景|主题|冲突|基调|性格|动机|关系|幕描述';
  
  // 策瑥1: 查找标记化的内容（如 【背景】、**主题**、## 冲突）
  for (const keyword of keywords) {
    // 匹配 【关键词】、**关键词**、## 关键词、关键词：
    const patterns = [
      // 【】格式，支持分行：【关键词】\n内容
      new RegExp(`【${keyword}】[\\uff1a:]*\\s*\\n?([\\s\\S]*?)(?=\\n\\s*【|$)`, 'i'),
      new RegExp(`\\*\\*${keyword}\\*\\*[\\uff1a:]*\\s*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
      new RegExp(`##\\s*${keyword}[\\uff1a:]*\\s*([\\s\\S]*?)(?=##|$)`, 'i'),
      // 关键优化：匹配到下一个字段名之前
      new RegExp(`${keyword}[\\uff1a:]+\\s*([^\\n]*?)(?=\\n(?:${fieldNames})[\\uff1a:]|\\n\\n|$)`, 'i'),
      // 单行匹配
      new RegExp(`^${keyword}[\\uff1a:]+\\s*(.+?)$`, 'im')
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let content = match[1].trim();
        // 清理多余的换行和空格
        content = content.replace(/\n{3,}/g, '\n\n').trim();
        // 不再截断，保留完整内容
        return content;
      }
    }
  }
  
  // 策瑥2: 如果没找到标记，尝试按段落匹配
  const paragraphs = text.split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    for (const keyword of keywords) {
      if (paragraph.includes(keyword)) {
        // 移除关键词本身
        let content = paragraph.replace(new RegExp(`.*?${keyword}[\uff1a:]*\\s*`, 'i'), '').trim();
        return content;
      }
    }
  }
  
  return '';
}

/**
 * 提取年龄
 * @param {string} text - AI回答全文
 * @returns {number|null} 年龄数字
 */
function extractAge(text) {
  if (!text) return null;
  
  // 先尝试使用通用字段提取（支持分行格式）
  const ageField = extractField(text, ['年龄', 'age']);
  if (ageField) {
    const ageMatch = ageField.match(/\d+/);
    if (ageMatch) {
      const age = parseInt(ageMatch[0], 10);
      if (age >= 1 && age <= 120) {
        return age;
      }
    }
  }
  
  // 备用：尝试同行格式
  const patterns = [
    /年龄[：:]*\s*(\d+)/i,
    /(\d+)\s*岁/i,
    /age[：:]*\s*(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const age = parseInt(match[1], 10);
      if (age >= 1 && age <= 120) {
        return age;
      }
    }
  }
  
  return null;
}

/**
 * 提取性别
 * @param {string} text - AI回答全文
 * @returns {string} 性别
 */
function extractGender(text) {
  if (!text) return '';
  
  // 先尝试使用通用字段提取（支持分行格式）
  const genderField = extractField(text, ['性别', 'gender']);
  if (genderField) {
    const firstLine = genderField.split('\n')[0].trim().toLowerCase();
    if (firstLine.includes('女') || firstLine === 'female') return '女';
    if (firstLine.includes('男') || firstLine === 'male') return '男';
    if (firstLine.includes('其他') || firstLine === 'other') return '其他';
  }
  
  // 备用：尝试同行格式
  const patterns = [
    /性别[：:]*\s*(男|女|其他)/i,
    /(男|女)性/i,
    /gender[：:]*\s*(male|female)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const gender = match[1].toLowerCase();
      if (gender === 'male' || gender.includes('男')) return '男';
      if (gender === 'female' || gender.includes('女')) return '女';
      return '其他';
    }
  }
  
  return '';
}

/**
 * 提取情感基调
 * 提取情感基调
 * @param {string} text - AI回答全文
 * @returns {string} 情感基调
 */
function extractTone(text) {
  if (!text) return '';
  
  // 直接提取AI回答中给出的基调描述
  const extracted = extractField(text, ['基调', '整体基调', '情感基调', '氛围', '风格', 'tone']);
  if (extracted) {
    return extracted.split('\n')[0].trim();
  }

  // 回退：匹配“基调：XXX”格式
  const toneMatch = text.match(/基调[：:]\s*([^\n]+)/i);
  if (toneMatch && toneMatch[1]) {
    return toneMatch[1].trim();
  }

  return '';
}


/**
 * 清理AI回答中的思考标签和无关内容
 * @param {string} text - 原始AI回答
 * @returns {string} 清理后的内容
 */
function cleanAIResponse(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    // 移除 <think> 和 </think> 标签及其内容
    .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    // 移除单独的 </think> 标签
    .replace(/<\/think>/gi, '')
    // 移除其他可能的 XML/HTML 标签
    .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')
    // 移除多余的空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 解析世界观AI回答
 * @param {string} text - AI回答全文
 * @returns {Object} 解析出的世界观数据
 */
export function parseWorldviewResponse(text) {
  if (!text) {
    return {
      background: '',
      setting: '',
      theme: '',
      conflict: '',
      tone: ''
    };
  }
  
  // 清理AI回答
  const cleanedText = cleanAIResponse(text);
  
  return {
    background: extractField(cleanedText, ['故事背景', '背景', '世界背景', '背景设定'], 500),
    setting: extractField(cleanedText, ['世界设定', '设定', '设定内容', '世界观设定'], 500),
    theme: extractField(cleanedText, ['核心主题', '主题', '故事主题', '主题思想'], 200),
    conflict: extractField(cleanedText, ['主要冲突', '冲突', '核心冲突', '矛盾'], 200),
    tone: extractTone(cleanedText)
  };
}

/**
 * 解析角色AI回答
 * @param {string} text - AI回答全文
 * @returns {Object} 解析出的角色数据
 */
export function parseCharacterResponse(text) {
  if (!text) {
    return {
      name: '',
      age: null,
      gender: '',
      description: '',
      personality: '',
      background: '',
      motivation: '',
      relationships: ''
    };
  }
  
  const cleanedText = cleanAIResponse(text);
  
  return {
    name: extractField(cleanedText, ['角色姓名', '姓名', '角色名', '名字', '人物']),
    age: extractAge(cleanedText),
    gender: extractGender(cleanedText),
    description: extractField(cleanedText, ['角色描述', '描述', '简介', '人物描述']),
    personality: extractField(cleanedText, ['性格特点', '性格', '个性', '性格特征']),
    background: extractField(cleanedText, ['角色背景', '背景', '身世', '经历', '背景故事']),
    motivation: extractField(cleanedText, ['行为动机', '动机', '目标', '追求']),
    relationships: extractField(cleanedText, ['人际关系', '关系', '社会关系', '人物关系'])
  };
}

/**
 * 评估解析结果的置信度
 * @param {Object} parsedData - 解析出的数据
 * @returns {Object} 包含置信度信息的结果
 */
export function evaluateParseResult(parsedData) {
  const result = {};
  
  for (const [key, value] of Object.entries(parsedData)) {
    let confidence = 'unknown';
    if (value && typeof value === 'string' && value.length > 0) {
      // 简单的置信度评估：基于内容长度
      if (value.length > 10) {
        confidence = 'high';
      } else if (value.length > 3) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }
    } else if (value && typeof value === 'number') {
      confidence = 'high';
    } else {
      confidence = 'none';
    }
    
    result[key] = {
      value,
      confidence
    };
  }
  
  return result;
}

/**
 * 计算解析成功率
 * @param {Object} evaluatedResult - 评估后的结果
 * @returns {number} 成功率（0-100）
 */
export function calculateSuccessRate(evaluatedResult) {
  const totalFields = Object.keys(evaluatedResult).length;
  let successfulFields = 0;
  
  for (const field of Object.values(evaluatedResult)) {
    if (field.confidence === 'high' || field.confidence === 'medium') {
      successfulFields++;
    }
  }
  
  return Math.round((successfulFields / totalFields) * 100);
}

/**
 * 格式化解析结果用于显示
 * @param {Object} evaluatedResult - 评估后的结果
 * @param {Object} fieldLabels - 字段标签映射
 * @returns {Array} 格式化的结果数组
 */
export function formatParseResultForDisplay(evaluatedResult, fieldLabels) {
  return Object.entries(evaluatedResult).map(([key, data]) => ({
    key,
    label: fieldLabels[key] || key,
    value: data.value || '',
    confidence: data.confidence,
    icon: data.confidence === 'high' || data.confidence === 'medium' ? '✓' : '✗',
    success: data.confidence === 'high' || data.confidence === 'medium'
  }));
}

/**
 * 解析批量角色AI回答（多个角色）
 * @param {string} text - AI回答全文
 * @returns {Object} 包含角色数组的对象
 */
export function parseBatchCharactersResponse(text) {
  if (!text) return { characters: [] };
  
  const characters = [];
  
  // 匹配【角色1】【角色2】...格式，使用正向预查
  const characterMatches = text.matchAll(/【角色(\d+)】([\s\S]*?)(?=【角色\d+】|$)/g);
  
  for (const match of characterMatches) {
    const block = match[2];
    if (!block || !block.trim()) continue;
    
    // 提取单行字段（如 "姓名：萧景玄"）
    const extractLineField = (fieldName) => {
      const pattern = new RegExp(`${fieldName}[\uff1a:]*\\s*(.+?)(?=\\n|$)`, 'i');
      const match = block.match(pattern);
      return match ? match[1].trim() : '';
    };
    
    const character = {
      name: extractLineField('姓名') || extractLineField('名字'),
      age: extractAge(block),
      gender: extractGender(block),
      role: extractLineField('角色定位') || extractLineField('定位'),
      description: extractLineField('描述') || extractLineField('简介'),
      personality: extractLineField('性格特点') || extractLineField('性格'),
      background: extractLineField('角色背景') || extractLineField('背景'),
      motivation: extractLineField('行为动机') || extractLineField('动机'),
      relationships: extractLineField('人际关系') || extractLineField('关系')
    };
    
    // 只添加有名字的角色
    if (character.name) {
      characters.push(character);
    }
  }
  
  return { characters };
}

/**
 * 解析大纲AI回答（包含多个节点）
 * @param {string} text - AI回答全文
 * @returns {Object} 解析出的大纲数据
 */
export function parseOutlineResponse(text) {
  if (!text) return { structure: 'three-act', acts: [] };
  
  const acts = [
    { actNumber: 1, title: '第一幕：开端', description: '', nodes: [] },
    { actNumber: 2, title: '第二幕：对抗', description: '', nodes: [] },
    { actNumber: 3, title: '第三幕：结局', description: '', nodes: [] }
  ];
  
  // 先提取所有【第X幕】的位置和内容
  const actPattern = /【第([^幕]+)幕[\uff1a:]*([^】]*)】/g;
  const actPositions = [];
  let actMatch;
  
  while ((actMatch = actPattern.exec(text)) !== null) {
    const actName = actMatch[1].trim();
    const actTitle = actMatch[2].trim();
    const position = actMatch.index;
    
    // 转换幕号
    const actNumberMap = { '一': 1, '二': 2, '三': 3, '1': 1, '2': 2, '3': 3 };
    const actNumber = actNumberMap[actName] || parseInt(actName) || 1;
    
    actPositions.push({
      actNumber,
      title: actTitle,
      position,
      fullMatch: actMatch[0]
    });
  }
  
  // 提取每个幕的描述和节点
  for (let i = 0; i < actPositions.length; i++) {
    const currentAct = actPositions[i];
    const nextActPosition = actPositions[i + 1]?.position || text.length;
    const actIndex = currentAct.actNumber - 1;
    
    if (actIndex < 0 || actIndex >= 3) continue;
    
    // 提取该幕的内容区域
    const actContent = text.substring(currentAct.position, nextActPosition);
    
    // 更新幕标题
    if (currentAct.title) {
      const chineseNumber = currentAct.actNumber === 1 ? '一' : currentAct.actNumber === 2 ? '二' : '三';
      acts[actIndex].title = `第${chineseNumber}幕：${currentAct.title}`;
    }
    
    // 提取幕描述
    const descMatch = actContent.match(/幕描述[\uff1a:]*([^\n【]+)/i);
    if (descMatch) {
      acts[actIndex].description = descMatch[1].trim();
    }
    
    // 提取该幕下的所有节点
    const nodePattern = /【节点(\d+)】([\s\S]*?)(?=【节点\d+】|【第|$)/g;
    let nodeMatch;
    
    while ((nodeMatch = nodePattern.exec(actContent)) !== null) {
      const nodeNumber = nodeMatch[1];
      const nodeContent = nodeMatch[2];
      
      // 提取节点信息
      let emotionText = extractField(nodeContent, ['情感', '情感变化', '情绪'], 100) || '';
      // 如果情感字段包含“集数”，截断到集数之前
      if (emotionText.includes('集数')) {
        const emotionMatch = emotionText.match(/(.+?)(?=集数)/);
        if (emotionMatch) {
          emotionText = emotionMatch[1].trim();
        }
      }
      
      const node = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2) + nodeNumber,
        title: extractField(nodeContent, ['名称', '节点名称'], 50) || `节点${nodeNumber}`,
        content: extractField(nodeContent, ['描述', '事件描述', '内容'], 500) || '',
        characters: extractCharactersList(nodeContent),
        emotion: emotionText,
        episodeRange: extractField(nodeContent, ['集数', '预估集数', '分集'], 20) || ''
      };
      
      // 只添加有有效内容的节点
      if (node.title && node.title.trim() !== '' && !node.title.includes('继续') && !node.title.includes('...')) {
        acts[actIndex].nodes.push(node);
      }
    }
  }
  
  return {
    structure: 'three-act',
    acts
  };
}

/**
 * 提取角色列表（从文本中提取用逗号分隔的角色名）
 * @param {string} text - 文本
 * @returns {Array} 角色名字数组
 */
function extractCharactersList(text) {
  let field = extractField(text, ['涉及角色', '角色', '参与角色'], 100);
  if (!field) return [];
  
  // 如果包含"情感"或"集数"，截断到这些关键词之前
  const cutoffMatch = field.match(/(.+?)(?=情感|集数|$)/);
  if (cutoffMatch) {
    field = cutoffMatch[1];
  }
  
  // 按逗号、逗号、空格、换行分隔
  return field.split(/[、,\s\n]+/)
    .map(name => name.trim())
    .filter(name => {
      // 过滤条件：
      // 1. 不为空
      // 2. 长度合理（2-20字）
      // 3. 不包含冒号和数字
      // 4. 不是"情感"、"集数"等关键词
      return name && 
             name.length >= 2 && 
             name.length <= 20 &&
             !name.match(/[\uff1a:\d]/) &&
             !name.includes('情感') &&
             !name.includes('集数');
    });
}

/**
 * 解析解决方案AI回答
 * @param {string} text - AI回答全文
 * @returns {Object} 包含建议内容和解释的对象
 */
export function parseSolutionResponse(text) {
  if (!text) {
    return {
      suggestedContent: '',
      explanation: ''
    };
  }
  
  const cleanedText = cleanAIResponse(text);
  
  try {
    // 方法1：尝试直接解析完整JSON（AI可能返回结构化对象）
    try {
      const parsed = JSON.parse(cleanedText);
      // 检查是否有suggestedContent或建议内容字段
      if (parsed.suggestedContent || parsed.suggested_content || parsed.建议内容) {
        return {
          suggestedContent: parsed.suggestedContent || parsed.suggested_content || parsed.建议内容,
          explanation: parsed.explanation || parsed.解释说明 || parsed.说明 || ''
        };
      }
      // 如果解析成功但没有特定字段，可能整个对象就是建议内容
      return {
        suggestedContent: cleanedText,
        explanation: ''
      };
    } catch (e) {
      // 不是纯JSON，继续尝试其他方法
    }
    
    // 方法2：从mardown代码块中提取
    const codeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const codeContent = codeBlockMatch[1].trim();
      try {
        // 尝试解析代码块中的JSON
        const parsed = JSON.parse(codeContent);
        // 检查是否有suggestedContent字段
        if (parsed.suggestedContent || parsed.suggested_content || parsed.建议内容) {
          return {
            suggestedContent: parsed.suggestedContent || parsed.suggested_content || parsed.建议内容,
            explanation: parsed.explanation || parsed.解释说明 || parsed.说明 || ''
          };
        }
        // 如果没有特定字段，可能整个对象就是建议内容
        return {
          suggestedContent: codeContent,
          explanation: ''
        };
      } catch (e) {
        // 代码块不是JSON，可能是纯文本内容
        return {
          suggestedContent: codeContent,
          explanation: ''
        };
      }
    }
    
    // 方法3：查找特定标记的内容
    const suggestedMatch = cleanedText.match(/【建议内容】|【修改后】|【优化后】|\*\*建议内容\*\*|\*\*修改后\*\*/i);
    if (suggestedMatch) {
      const startIndex = suggestedMatch.index + suggestedMatch[0].length;
      let suggestedContent = cleanedText.substring(startIndex).trim();
      
      // 查找解释说明
      const explanationMatch = cleanedText.match(/【解释说明】|【说明】|\*\*解释说明\*\*|\*\*说明\*\*/i);
      let explanation = '';
      
      if (explanationMatch && explanationMatch.index < suggestedMatch.index) {
        // 说明在建议内容之前
        explanation = cleanedText.substring(explanationMatch.index + explanationMatch[0].length, suggestedMatch.index).trim();
      } else if (explanationMatch && explanationMatch.index > suggestedMatch.index) {
        // 说明在建议内容之后
        suggestedContent = cleanedText.substring(startIndex, explanationMatch.index).trim();
        explanation = cleanedText.substring(explanationMatch.index + explanationMatch[0].length).trim();
      }
      
      return {
        suggestedContent,
        explanation
      };
    }
    
    // 方法4：如果没有找到特定标记，将整个内容作为建议
    console.log('⚠️ 未找到特定标记，使用完整内容作为建议');
    return {
      suggestedContent: cleanedText,
      explanation: ''
    };
  } catch (error) {
    console.error('❌ 解析解决方案失败:', error);
    return {
      suggestedContent: '',
      explanation: ''
    };
  }
}

/**
 * 解析诊断AI回答（问题列表）
 * @param {string} text - AI回答全文
 * @returns {Object} 包含问题数组的对象
 */
export function parseDiagnosisResponse(text) {
  if (!text) return { issues: [] };
  
  const cleanedText = cleanAIResponse(text);
  
  try {
    // 方法1：直接尝试解析整个JSON
    try {
      const parsed = JSON.parse(cleanedText);
      if (parsed.issues && Array.isArray(parsed.issues)) {
        console.log('✅ 直接解析成功，问题数量:', parsed.issues.length);
        return parsed;
      }
    } catch (e) {
      // 继续尝试
    }
    
    // 方法2：从markdown代码块中提取JSON
    const codeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const jsonContent = codeBlockMatch[1].trim();
        const parsed = JSON.parse(jsonContent);
        if (parsed.issues && Array.isArray(parsed.issues)) {
          console.log('✅ 从代码块解析成功，问题数量:', parsed.issues.length);
          return parsed;
        }
      } catch (e) {
        // 继续尝试
      }
    }
    
    // 方法3：使用正则提取JSON对象
    const jsonMatch = cleanedText.match(/\{[\s\S]*"issues"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[0];
        // 清理控制字符
        jsonStr = jsonStr
          .replace(/\r\n/g, '\\n')
          .replace(/\r/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t')
          .replace(/\\\\n/g, '\\n')
          .replace(/\\\\t/g, '\\t');
        
        const parsed = JSON.parse(jsonStr);
        if (parsed.issues && Array.isArray(parsed.issues)) {
          console.log('✅ 正则提取解析成功，问题数量:', parsed.issues.length);
          return parsed;
        }
      } catch (e) {
        // 继续
      }
    }
    
    console.warn('⚠️ 所有解析方法均失败');
    return { issues: [] };
  } catch (error) {
    console.error('❌ 解析诊断结果失败:', error);
    return { issues: [] };
  }
}
