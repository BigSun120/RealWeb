/**
 * AI提示词模板生成工具
 */

/**
 * 默认的剧集提示词模板
 */
export const DEFAULT_PROMPT_TEMPLATE = `# 第{{episodeNumber}}集剧本创作任务

## 项目信息
- 剧本名称：{{projectName}}
- 剧本类型：{{projectType}}
- 总集数：{{totalEpisodes}}集
- 当前集数：第{{episodeNumber}}集
{{#if episodeTitle}}
- 集名：{{episodeTitle}}
{{/if}}

{{#if worldviewTheme}}
## 世界观设定
- 核心主题：{{worldviewTheme}}
{{/if}}
{{#if worldviewTone}}
- 情感基调：{{worldviewTone}}
{{/if}}

{{#if previousEpisode}}
## 上集回顾（第{{previousEpisode.number}}集）
{{#if previousEpisode.title}}
- 标题：{{previousEpisode.title}}
{{/if}}
{{#if previousEpisode.summary}}
- 内容：{{previousEpisode.summary}}
{{/if}}
{{/if}}

## 本集概要
{{episodeSummary}}

{{#if hasCharacters}}
## 主要角色信息
{{charactersList}}
{{/if}}

## 请你完成以下任务

创作本集完整剧本（时长2-3分钟），要求：

1. **场景设置**（3-5个场景）
   - 每个场景的地点、时间、氛围
   - 场景之间的转场方式

2. **对话内容**
   - 符合角色性格的对白
   - 包含冲突和情感爆发点
   - 有记忆点的金句或口头禅

3. **动作描述**
   - 关键的肢体动作和表情
   - 特写镜头建议

4. **情感节奏**
   - 开篇hook（前5秒抓人）
   - 中段冲突（保持紧张感）
   - 结尾悬念（吸引下一集）

## ⚠️ 重要：请严格按照以下格式输出

请使用【】标记每个字段，格式如下：

【集标题】
（本集的标题）

【内容概要】
本集的核心剧情概要（100-150字）

【场景1】
地点：XX
时间：XX
氛围：XX
内容：详细的场景描述，包括对话、动作、表情等（200-300字）

【场景2】
地点：XX
时间：XX
氛围：XX
内容：...

（继续其他场景，共3-5个场景）

【关键对白】
列出本集最重要的3-5句对话（金句）

【结尾悬念】
描述结尾留下的悬念，如何吸引观众看下一集（50-100字）

注意：
- 必须使用【字段名】的格式
- 场景编号从【场景1】开始连续编号
- 每个场景必须包含：地点、时间、氛围、内容
- 这样系统才能正确解析并自动填充到表单中
`;

/**
 * 替换模板中的变量
 * @param {String} template 模板字符串
 * @param {Object} data 数据对象
 * @returns {String} 替换后的字符串
 */
export function replaceTemplateVariables(template, data) {
  if (!template) return '';
  
  let result = template;
  
  // 准备变量数据
  const vars = {
    episodeNumber: data.episodeNumber || '',
    episodeTitle: data.episodeTitle || `第${data.episodeNumber}集`,
    episodeSummary: data.episodeSummary || '待创作',
    projectName: data.projectName || '未命名',
    projectType: data.projectType || '未指定',
    totalEpisodes: data.totalEpisodes || '未知',
    worldviewTheme: data.worldviewTheme || '',
    worldviewTone: data.worldviewTone || '',
    worldviewBackground: data.worldviewBackground || '',
    worldviewSetting: data.worldviewSetting || '',
    worldviewConflict: data.worldviewConflict || '',
    charactersList: data.charactersList || '',
    hasCharacters: !!data.charactersList,
    completedCount: data.completedCount || 0,
    previousEpisode: data.previousEpisode || null,
    // 展开 previousEpisode 的属性以支持点号访问的条件判断
    'previousEpisode.number': data.previousEpisode?.number || '',
    'previousEpisode.title': data.previousEpisode?.title || '',
    'previousEpisode.summary': data.previousEpisode?.summary || ''
  };
  
  // 修复：递归处理条件块，支持嵌套和对象属性访问
  // 处理条件块 {{#if condition}}...{{/if}}
  function processConditionals(text) {
    let hasMatch = true;
    
    // 循环处理直到没有条件块
    while (hasMatch) {
      hasMatch = false;
      
      // 从内到外处理嵌套的条件块
      // 查找最内层的 {{#if}}...{{/if}} 对（不包含嵌套的条件块）
      const pattern = /{{#if\s+([\w.]+)}}((?:(?!{{#if|{{\/if}}).)*){{\/if}}/s;
      
      text = text.replace(pattern, (match, condition, content) => {
        hasMatch = true;
        
        // 获取条件值（支持点号访问）
        let value;
        if (condition.includes('.')) {
          // 处理对象属性访问，例如 previousEpisode.title
          value = vars[condition]; // 先尝试直接访问
          if (value === undefined) {
            // 如果没有直接映射，尝试通过对象访问
            const [objName, propName] = condition.split('.');
            const obj = vars[objName];
            if (obj && typeof obj === 'object') {
              value = obj[propName];
            }
          }
        } else {
          value = vars[condition];
        }
        
        // 检查值是否为真
        if (value && value !== '' && value !== 0) {
          return content;
        }
        return '';
      });
    }
    
    return text;
  }
  
  result = processConditionals(result);
  
  // 处理嵌套的对象属性访问 {{object.property}}
  // 注：由于 vars 中已经展开了对象属性（如 'previousEpisode.title'）
  // 这里的处理主要是为了兼容性，处理未展开的对象属性
  const objectRegex = /{{(\w+)\.(\w+)}}/g;
  result = result.replace(objectRegex, (match, objName, propName) => {
    // 先尝试直接访问展开的属性
    const expandedKey = `${objName}.${propName}`;
    if (vars[expandedKey] !== undefined) {
      return vars[expandedKey];
    }
    // 如果没有展开，尝试通过对象访问
    const obj = vars[objName];
    if (obj && typeof obj === 'object' && obj[propName] !== undefined) {
      return obj[propName];
    }
    return '';
  });
  
  // 最后替换简单变量（包括已展开的对象属性）
  Object.keys(vars).forEach(key => {
    const value = vars[key];
    if (typeof value === 'string' || typeof value === 'number') {
      // 转义点号以处理展开的属性名
      const escapedKey = key.replace(/\./g, '\\.');
      const regex = new RegExp(`{{${escapedKey}}}`, 'g');
      result = result.replace(regex, value);
    }
  });
  
  return result;
}

/**
 * 生成世界观设定提示词
 * @param {Object} data 世界观数据
 * @returns {String} 生成的提示词
 */
export function generateWorldviewPrompt(data) {
  const { 
    background, 
    setting, 
    theme, 
    conflict, 
    tone, 
    projectType, 
    projectName 
  } = data;

  let prompt = `# 短剧世界观设定任务\n\n`;
  
  prompt += `## 项目信息\n`;
  prompt += `- 剧本名称：${projectName || '未命名'}\n`;
  prompt += `- 剧本类型：${projectType || '未指定'}\n`;
  prompt += `- 情感基调：${tone || '未指定'}\n\n`;

  prompt += `## 世界观设定要求\n\n`;

  if (background) {
    prompt += `### 故事背景\n${background}\n\n`;
  }

  if (setting) {
    prompt += `### 世界设定\n${setting}\n\n`;
  }

  if (theme) {
    prompt += `### 核心主题\n${theme}\n\n`;
  }

  if (conflict) {
    prompt += `### 主要冲突\n${conflict}\n\n`;
  }

  prompt += `## 请你完成以下任务\n\n`;
  prompt += `基于以上信息，请帮我完善和扩展这个短剧的世界观设定。\n\n`;
  
  prompt += `## ⚠️ 重要：请严格按照以下格式输出\n\n`;
  prompt += `请使用【】标记每个字段，格式如下：\n\n`;
  prompt += `【故事背景】\n详细描述故事发生的时代背景、社会环境（200-300字）\n\n`;
  prompt += `【世界设定】\n描述世界的特殊规则、社会结构、价值观念（200-300字）\n\n`;
  prompt += `【核心主题】\n深化和扩展故事的核心主题（100-150字）\n\n`;
  prompt += `【主要冲突】\n详细说明主要矛盾和冲突点（100-150字）\n\n`;
  prompt += `【情感基调】\n说明如何营造${tone || '合适的'}氛围（50-100字）\n\n`;
  
  prompt += `注意：请务必使用【字段名】的格式，这样系统才能正确解析并自动填充到表单中。`;

  return prompt;
}

/**
 * 生成角色设定提示词
 * @param {Object} data 角色数据
 * @returns {String} 生成的提示词
 */
export function generateCharacterPrompt(data) {
  const { 
    name, 
    role, 
    age, 
    personality, 
    background, 
    motivation, 
    relationships,
    projectType,
    projectName,
    worldview
  } = data;

  let prompt = `# 短剧角色设定任务\n\n`;
  
  prompt += `## 项目信息\n`;
  prompt += `- 剧本名称：${projectName || '未命名'}\n`;
  prompt += `- 剧本类型：${projectType || '未指定'}\n\n`;

  if (worldview && worldview.theme) {
    prompt += `- 剧本主题：${worldview.theme}\n\n`;
  }

  prompt += `## 角色基本信息\n\n`;
  prompt += `- 角色姓名：${name || '待定'}\n`;
  prompt += `- 角色定位：${role || '待定'}\n`;
  
  if (age) {
    prompt += `- 年龄：${age}\n`;
  }

  prompt += `\n`;

  if (personality) {
    prompt += `### 性格特点\n${personality}\n\n`;
  }

  if (background) {
    prompt += `### 角色背景\n${background}\n\n`;
  }

  if (motivation) {
    prompt += `### 行为动机\n${motivation}\n\n`;
  }

  if (relationships) {
    prompt += `### 人际关系\n${relationships}\n\n`;
  }

  prompt += `## 请你完成以下任务\n\n`;
  prompt += `基于以上信息，请帮我丰富和完善这个角色。\n\n`;
  
  prompt += `## ⚠️ 重要：请严格按照以下格式输出\n\n`;
  prompt += `请使用【】标记每个字段，格式如下：\n\n`;
  prompt += `【角色姓名】\n${name || '（如需修改请写出完整姓名）'}\n\n`;
  prompt += `【年龄】\n${age || '（请给出具体年龄数字）'}\n\n`;
  prompt += `【性别】\n（男/女/其他）\n\n`;
  prompt += `【角色描述】\n一句话总结这个角色（50-100字）\n\n`;
  prompt += `【性格特点】\n详细的性格刻画，包括优缺点、说话方式、行为习惯（200-300字）\n\n`;
  prompt += `【角色背景】\n成长经历、家庭背景、教育经历、重要事件（300-500字）\n\n`;
  prompt += `【行为动机】\n角色的目标、追求、内心渴望、情感弱点（150-250字）\n\n`;
  prompt += `【人际关系】\n与其他角色的关系、社会关系网络（150-250字）\n\n`;
  
  prompt += `注意：请务必使用【字段名】的格式，这样系统才能正确解析并自动填充到表单中。`;

  return prompt;
}

/**
 * 生成大纲提示词
 * @param {Object} data 大纲数据
 * @returns {String} 生成的提示词
 */
export function generateOutlinePrompt(data) {
  const { 
    projectName, 
    projectType, 
    episodeCount, 
    worldview, 
    characters,
    mainPlot
  } = data;

  let prompt = `# 短剧剧情大纲任务\n\n`;
  
  prompt += `## 项目信息\n`;
  prompt += `- 剧本名称：${projectName || '未命名'}\n`;
  prompt += `- 剧本类型：${projectType || '未指定'}\n`;
  prompt += `- 总集数：${episodeCount || 60}集\n`;
  prompt += `- 每集时长：约2-3分钟\n\n`;

  if (worldview) {
    prompt += `## 世界观设定\n`;
    if (worldview.theme) {
      prompt += `- 核心主题：${worldview.theme}\n`;
    }
    if (worldview.conflict) {
      prompt += `- 主要冲突：${worldview.conflict}\n`;
    }
    if (worldview.tone) {
      prompt += `- 情感基调：${worldview.tone}\n`;
    }
    prompt += `\n`;
  }

  if (characters && characters.length > 0) {
    prompt += `## 主要角色\n`;
    characters.forEach((char, index) => {
      prompt += `${index + 1}. ${char.name}（${char.role || '角色'}）\n`;
      if (char.description) {
        prompt += `   ${char.description}\n`;
      }
    });
    prompt += `\n`;
  }

  if (mainPlot) {
    prompt += `## 主线剧情\n${mainPlot}\n\n`;
  }

  prompt += `## 请你完成以下任务\n\n`;
  prompt += `基于以上信息，请帮我创作一个完整的剧情大纲，要求：\n\n`;
  prompt += `1. **三幕结构**：\n`;
  prompt += `   - 第一幕（开端）：约占${Math.round(episodeCount * 0.25)}集，建立人物关系和主要冲突\n`;
  prompt += `   - 第二幕（发展）：约占${Math.round(episodeCount * 0.5)}集，矛盾激化和情感升华\n`;
  prompt += `   - 第三幕（高潮）：约占${Math.round(episodeCount * 0.25)}集，冲突解决和情感归宿\n\n`;
  
  prompt += `2. **关键节点**：列出10-15个关键剧情转折点，标注出现集数\n\n`;
  
  prompt += `3. **情感曲线**：描述主角情感的起伏变化轨迹\n\n`;
  
  prompt += `4. **高潮场景**：详细描述3-5个最重要的高潮场景\n\n`;
  
  prompt += `5. **结局设计**：给出2-3种可能的结局方案\n\n`;
  
  prompt += `请确保大纲符合短剧的节奏特点：快节奏、强冲突、多反转、情感浓烈。`;

  return prompt;
}

/**
 * 生成分集剧本提示词
 * @param {Object} data 分集数据
 * @returns {String} 生成的提示词
 */
export function generateEpisodePrompt(data) {
  // 兼容新旧数据格式
  const episode = data.episode || data;
  const episodeNumber = episode.number || data.episodeNumber;
  const title = episode.title || data.title || `第${episodeNumber}集`;
  const summary = episode.content?.summary || data.summary || '待创作';
  const scenes = episode.content?.scenes || data.scenes || [];
  const emotionalTone = episode.emotionalTone || data.emotionalTone;
  const keyPoints = episode.keyPoints || data.keyPoints || [];
  
  // 项目信息
  const projectInfo = data.projectInfo || {};
  const worldview = data.worldview || {};
  const outline = data.outline || {};
  const allCharacters = data.characters || [];
  
  // 获取所有分集用于上下文
  const allEpisodes = data.allEpisodes || [];
  const currentIndex = allEpisodes.findIndex(ep => ep.number === episodeNumber);
  const previousEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;
  
  // 是否包含完整的前置剧本摘要
  const includeFullContext = data.includeFullContext || false;
  
  // 准备模板变量数据（自定义和默认模板都使用）
  const templateData = {
    episodeNumber,
    episodeTitle: title,
    episodeSummary: summary,
    projectName: projectInfo.name || '未命名',
    projectType: projectInfo.type || '未指定',
    totalEpisodes: projectInfo.totalEpisodes || allEpisodes.length || '未知',
    worldviewTheme: worldview.theme || '',
    worldviewTone: worldview.tone || '',
    worldviewBackground: worldview.background || '',
    worldviewSetting: worldview.setting || '',
    worldviewConflict: worldview.conflict || '',
    charactersList: allCharacters.map(char => 
      `- ${char.name}（${char.role || '角色'}）${char.description ? '：' + char.description : ''}`
    ).join('\n'),
    completedCount: allEpisodes.filter(ep => 
      ep.status === 'completed' || ep.status === 'reviewed'
    ).length,
    previousEpisode: previousEpisode ? {
      number: previousEpisode.number,
      title: previousEpisode.title || '',
      summary: previousEpisode.content?.summary || ''
    } : null
  };
  
  // 检查是否使用自定义模板
  const promptTemplate = data.promptTemplate || {};
  if (promptTemplate.useCustom && promptTemplate.customTemplate) {
    // 使用自定义模板
    return replaceTemplateVariables(promptTemplate.customTemplate, templateData);
  }

  // 如果需要包含完整上下文，先生成前置剧本摘要
  let contextPrefix = '';
  if (includeFullContext && allEpisodes.length > 0) {
    // 导入 scriptExporter 的 generatePreviousEpisodesSummary
    // 这里直接内联实现，避免循环引用
    const previousEpisodes = allEpisodes
      .filter(ep => 
        ep.number < episodeNumber && 
        (ep.status === 'completed' || ep.status === 'reviewed')
      )
      .sort((a, b) => a.number - b.number);
    
    if (previousEpisodes.length > 0) {
      const maxPrevious = 10; // 最多包含10集
      const episodesToInclude = previousEpisodes.slice(-maxPrevious);
      const startEp = episodesToInclude[0].number;
      const endEp = episodesToInclude[episodesToInclude.length - 1].number;
      
      contextPrefix += `# 已完成剧集回顾（第${startEp}-${endEp}集）\n\n`;
      
      if (previousEpisodes.length > maxPrevious) {
        contextPrefix += `> 注：前面还有${previousEpisodes.length - maxPrevious}集，此处仅展示最近${maxPrevious}集\n\n`;
      }
      
      episodesToInclude.forEach(ep => {
        const epTitle = ep.title || `第${ep.number}集`;
        contextPrefix += `## 第${ep.number}集：${epTitle}\n\n`;
        
        if (ep.content?.summary) {
          contextPrefix += `${ep.content.summary}\n\n`;
        }
        
        if (ep.content?.scenes && ep.content.scenes.length > 0) {
          contextPrefix += `**关键场景**：\n`;
          ep.content.scenes.forEach((scene, idx) => {
            const loc = scene.location || '未知地点';
            contextPrefix += `- 场景${idx + 1}（${loc}）`;
            if (scene.content) {
              const brief = scene.content.substring(0, 80) + (scene.content.length > 80 ? '...' : '');
              contextPrefix += `：${brief}`;
            }
            contextPrefix += '\n';
          });
          contextPrefix += '\n';
        }
        
        if (ep.content?.keyDialogues && ep.content.keyDialogues.length > 0) {
          contextPrefix += `**关键对白**：`;
          contextPrefix += ep.content.keyDialogues.slice(0, 3).map(d => `"${d}"`).join('、');
          contextPrefix += '\n\n';
        }
        
        if (ep.content?.cliffhanger) {
          contextPrefix += `**结尾**：${ep.content.cliffhanger}\n\n`;
        }
        
        contextPrefix += '---\n\n';
      });
      
      contextPrefix += '\n';
    }
  }
  
  // 使用默认模板，统一通过 replaceTemplateVariables 处理
  const defaultPrompt = replaceTemplateVariables(DEFAULT_PROMPT_TEMPLATE, templateData);
  
  // 如果有上下文前缀，添加到默认模板前面
  return contextPrefix + defaultPrompt;
}

/**
 * 生成批量分集大纲提示词
 * @param {Object} data 批量数据
 * @returns {String} 生成的提示词
 */
export function generateBatchEpisodesPrompt(data) {
  const { 
    startEpisode, 
    endEpisode, 
    totalEpisodes,
    outline,
    characters
  } = data;

  const count = endEpisode - startEpisode + 1;

  let prompt = `# 批量创作第${startEpisode}-${endEpisode}集大纲任务\n\n`;
  
  prompt += `## 创作范围\n`;
  prompt += `- 起始集数：第${startEpisode}集\n`;
  prompt += `- 结束集数：第${endEpisode}集\n`;
  prompt += `- 共计：${count}集\n`;
  prompt += `- 全剧总集数：${totalEpisodes}集\n`;
  prompt += `- 当前进度：${Math.round((endEpisode / totalEpisodes) * 100)}%\n\n`;

  if (outline) {
    prompt += `## 整体剧情大纲\n`;
    prompt += `${outline}\n\n`;
  }

  if (characters && characters.length > 0) {
    prompt += `## 主要角色\n`;
    characters.forEach(char => {
      prompt += `- ${char.name}：${char.description || ''}\n`;
    });
    prompt += `\n`;
  }

  prompt += `## 请你完成以下任务\n\n`;
  prompt += `为第${startEpisode}-${endEpisode}集创作分集大纲，每集包括：\n\n`;
  prompt += `1. **集名**：吸引人的标题\n`;
  prompt += `2. **时长**：2-3分钟\n`;
  prompt += `3. **核心冲突**：本集的主要矛盾点\n`;
  prompt += `4. **关键场景**：2-3个重要场景\n`;
  prompt += `5. **情感走向**：本集的情感变化\n`;
  prompt += `6. **悬念设置**：结尾留下的悬念\n\n`;
  
  prompt += `要求：\n`;
  prompt += `- 确保集与集之间逻辑连贯\n`;
  prompt += `- 每${Math.ceil(totalEpisodes / 10)}集左右设置一个小高潮\n`;
  prompt += `- 节奏要快，避免拖沓\n`;
  prompt += `- 每集都要有记忆点\n\n`;
  
  prompt += `请用表格形式呈现，便于查阅和调整。`;

  return prompt;
}

/**
 * 生成批量角色提示词（基于世界观智能生成所有角色）
 * @param {Object} data 项目数据
 * @returns {String} 生成的提示词
 */
export function generateBatchCharactersPrompt(data) {
  const { 
    projectName, 
    projectType, 
    worldview,
    recommendedCount = 6 // 推荐角色数量
  } = data;

  let prompt = `# 批量创建角色任务\n\n`;
  
  prompt += `## 项目信息\n`;
  prompt += `- 剧本名称：${projectName || '未命名'}\n`;
  prompt += `- 剧本类型：${projectType || '未指定'}\n`;
  prompt += `- 推荐角色数量：${recommendedCount}个\n\n`;

  if (worldview) {
    prompt += `## 世界观设定\n\n`;
    
    if (worldview.background) {
      prompt += `**故事背景**：${worldview.background}\n\n`;
    }
    
    if (worldview.setting) {
      prompt += `**世界设定**：${worldview.setting}\n\n`;
    }
    
    if (worldview.theme) {
      prompt += `**核心主题**：${worldview.theme}\n\n`;
    }
    
    if (worldview.conflict) {
      prompt += `**主要冲突**：${worldview.conflict}\n\n`;
    }
    
    if (worldview.tone) {
      prompt += `**情感基调**：${worldview.tone}\n\n`;
    }
  }

  prompt += `## 请你完成以下任务\n\n`;
  prompt += `基于以上世界观设定，请创建${recommendedCount}个角色，要求：\n\n`;
  
  prompt += `1. **角色配置**：\n`;
  prompt += `   - 男主角 1名\n`;
  prompt += `   - 女主角 1名\n`;
  prompt += `   - 主要配角 2-3名\n`;
  prompt += `   - 反派角色 1-2名\n\n`;
  
  prompt += `2. **角色设计原则**：\n`;
  prompt += `   - 角色性格要有鲜明对比\n`;
  prompt += `   - 每个角色都有独特的行为动机\n`;
  prompt += `   - 角色关系要形成冲突张力\n`;
  prompt += `   - 符合${projectType || '短剧'}的类型特点\n\n`;
  
  prompt += `## ⚠️ 重要：请严格按照以下格式输出\n\n`;
  prompt += `请为每个角色使用【角色X】标记，格式如下：\n\n`;
  
  prompt += `【角色1】\n`;
  prompt += `姓名：张晨阳\n`;
  prompt += `年龄：28\n`;
  prompt += `性别：男\n`;
  prompt += `角色定位：男主角\n`;
  prompt += `描述：冷峻霸道的集团总裁，外表冷漠内心温柔\n`;
  prompt += `性格特点：理性、果断、有责任感、控制欲强，但对真心相待的人极其温柔\n`;
  prompt += `角色背景：顶级商业集团继承人，从小接受精英教育，25岁接管公司后业绩翻倍，但因童年创伤对感情极度不信任\n`;
  prompt += `行为动机：证明自己的能力、寻找可以信任的人、保护家族企业\n`;
  prompt += `人际关系：与父亲关系紧张，有一个关系亲密的妹妹\n\n`;
  
  prompt += `【角色2】\n`;
  prompt += `姓名：林诗雨\n`;
  prompt += `年龄：24\n`;
  prompt += `性别：女\n`;
  prompt += `角色定位：女主角\n`;
  prompt += `描述：...（继续填写）\n\n`;
  
  prompt += `依此类推，创建所有${recommendedCount}个角色。\n\n`;
  
  prompt += `注意：\n`;
  prompt += `- 必须使用【角色1】【角色2】...的格式\n`;
  prompt += `- 每个字段名后面用冒号（姓名：、年龄：等）\n`;
  prompt += `- 这样系统才能正确解析并自动创建角色\n`;

  return prompt;
}

/**
 * 生成完整大纲（AI智能生成带节点的三幕结构）
 * @param {Object} data 项目数据
 * @returns {String} 生成的提示词
 */
export function generateCompleteOutlinePrompt(data) {
  const { 
    projectName, 
    projectType, 
    totalEpisodes = 60,
    worldview,
    characters
  } = data;
  
  // 使用 episodeCount 作为内部变量名，保持下面代码不变
  const episodeCount = totalEpisodes;

  let prompt = `# AI智能生成完整剧情大纲任务\n\n`;
  
  prompt += `## 项目信息\n`;
  prompt += `- 剧本名称：${projectName || '未命名'}\n`;
  prompt += `- 剧本类型：${projectType || '未指定'}\n`;
  prompt += `- 总集数：${episodeCount}集\n`;
  prompt += `- 每集时长：约2-3分钟\n\n`;

  // 世界观信息
  if (worldview) {
    prompt += `## 世界观设定\n\n`;
    
    if (worldview.background) {
      prompt += `**故事背景**：${worldview.background}\n\n`;
    }
    
    if (worldview.theme) {
      prompt += `**核心主题**：${worldview.theme}\n\n`;
    }
    
    if (worldview.conflict) {
      prompt += `**主要冲突**：${worldview.conflict}\n\n`;
    }
    
    if (worldview.tone) {
      prompt += `**情感基调**：${worldview.tone}\n\n`;
    }
  }

  // 角色信息
  if (characters && characters.length > 0) {
    prompt += `## 主要角色\n\n`;
    characters.forEach((char, index) => {
      prompt += `**${index + 1}. ${char.name}**（${char.role || '角色'}）\n`;
      if (char.description) {
        prompt += `${char.description}\n`;
      }
      if (char.personality) {
        prompt += `性格：${char.personality}\n`;
      }
      prompt += `\n`;
    });
  }

  prompt += `## 请你完成以下任务\n\n`;
  prompt += `基于以上信息，请创作一个完整的三幕剧情大纲，要求：\n\n`;
  
  prompt += `### 三幕结构分配\n`;
  prompt += `- **第一幕（开端）**：约${Math.round(episodeCount * 0.25)}集\n`;
  prompt += `  建立人物、引发冲突、埋设伏笔\n`;
  prompt += `  需要3-5个关键节点\n\n`;
  
  prompt += `- **第二幕（对抗）**：约${Math.round(episodeCount * 0.5)}集\n`;
  prompt += `  矛盾升级、情感变化、多次转折\n`;
  prompt += `  需要5-7个关键节点\n\n`;
  
  prompt += `- **第三幕（结局）**：约${Math.round(episodeCount * 0.25)}集\n`;
  prompt += `  高潮爆发、冲突解决、情感归宿\n`;
  prompt += `  需要3-5个关键节点\n\n`;
  
  prompt += `### 节点设计要求\n`;
  prompt += `每个节点必须包含：\n`;
  prompt += `1. 节点名称（简短有力）\n`;
  prompt += `2. 事件描述（详细说明发生什么）\n`;
  prompt += `3. 涉及角色（列出主要参与角色）\n`;
  prompt += `4. 情感变化（本节点的情感走向）\n`;
  prompt += `5. 预估集数（如：1-3）\n\n`;
  
  prompt += `## ⚠️ 关键：必须严格遵守输出格式\n\n`;
  prompt += `请完全按照以下格式输出，系统将自动解析您的回答：\n\n`;
  
  prompt += `### 格式模板：\n\n`;
  
  prompt += `【第一幕：开端】\n`;
  prompt += `幕描述：简要说明第一幕的整体走向（50-100字）\n\n`;
  
  prompt += `【节点1】\n`;
  prompt += `名称：初次相遇\n`;
  prompt += `描述：男女主角在公司电梯里意外相遇，因为误会产生冲突，女主不知道男主就是新上任的总裁\n`;
  prompt += `涉及角色：张晨阳、林诗雨\n`;
  prompt += `情感：好奇、紧张\n`;
  prompt += `集数：1-2\n`;
  prompt += `\n`; // 空行分隔
  
  prompt += `【节点2】\n`;
  prompt += `名称：身份揭露\n`;
  prompt += `描述：女主在会议上惊讶地发现，电梯里的陌生人竟是新总裁，而自己刚才的言行让她尴尬万分\n`;
  prompt += `涉及角色：张晨阳、林诗雨\n`;
  prompt += `情感：震惊、尴尬\n`;
  prompt += `集数：3-4\n`;
  prompt += `\n`; // 空行分隔
  
  prompt += `【节点3】\n`;
  prompt += `名称：（继续第一幕的其他节点...）\n`;
  prompt += `描述：...\n`;
  prompt += `涉及角色：...\n`;
  prompt += `情感：...\n`;
  prompt += `集数：...\n\n`;
  
  prompt += `【第二幕：对抗】\n`;
  prompt += `幕描述：简要说明第二幕的整体走向（50-100字）\n\n`;
  
  prompt += `【节点4】\n`;
  prompt += `名称：（第二幕节点标题）\n`;
  prompt += `描述：（事件详细描述，100-200字）\n`;
  prompt += `涉及角色：（角色名，用顿号分隔）\n`;
  prompt += `情感：（情感关键词）\n`;
  prompt += `集数：（预估集数范围）\n\n`;
  
  prompt += `（继续创作第二幕的其他节点...）\n\n`;
  
  prompt += `【第三幕：结局】\n`;
  prompt += `幕描述：简要说明第三幕的整体走向（50-100字）\n\n`;
  
  prompt += `【节点N】\n`;
  prompt += `名称：（第三幕节点标题）\n`;
  prompt += `描述：（事件详细描述）\n`;
  prompt += `涉及角色：（角色名）\n`;
  prompt += `情感：（情感关键词）\n`;
  prompt += `集数：（预估集数范围）\n\n`;
  
  prompt += `（继续创作第三幕的其他节点...）\n\n`;
  
  prompt += `---\n\n`;
  
  prompt += `### 格式要求（务必遵守）：\n\n`;
  prompt += `1. **幕标记**：必须使用【第一幕：XXX】、【第二幕：XXX】、【第三幕：XXX】格式\n`;
  prompt += `2. **节点标记**：必须使用【节点1】、【节点2】...【节点N】格式，从1开始连续编号\n`;
  prompt += `3. **字段格式**：每个节点内必须包含以下5个字段，每个字段单独一行：\n`;
  prompt += `   - 名称：（简短标题，5-10字）\n`;
  prompt += `   - 描述：（详细内容，100-200字）\n`;
  prompt += `   - 涉及角色：（角色名用顿号分隔，如：张三、李四）\n`;
  prompt += `   - 情感：（情感关键词用顿号分隔，如：紧张、甜蜜、愤怒）\n`;
  prompt += `   - 集数：（预估范围，如：5-8）\n`;
  prompt += `4. **重要！**“集数”必须单独一行，不要跟在“情感”后面！\n`;
  prompt += `5. **节点数量**：总共12-15个节点（第一幕3-5个，第二幕5-7个，第三幕3-5个）\n`;
  prompt += `6. **不要省略**：每个节点的5个字段都必须完整填写，不要用省略号\n`;
  prompt += `7. **每个节点之间用空行分隔**\n\n`;
  
  prompt += `请现在开始创作完整的三幕剧情大纲，确保剧情节奏紧凑、冲突不断、情感充沛。`;

  return prompt;
}

export default {
  generateWorldviewPrompt,
  generateCharacterPrompt,
  generateOutlinePrompt,
  generateEpisodePrompt,
  generateBatchEpisodesPrompt,
  generateBatchCharactersPrompt,
  generateCompleteOutlinePrompt
};
