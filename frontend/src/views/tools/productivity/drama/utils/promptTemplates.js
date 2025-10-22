/**
 * AI提示词模板生成工具
 */

/**
 * 默认的剧集提示词模板
 */
export const DEFAULT_PROMPT_TEMPLATE = `# 第{{episodeNumber}}集剧本创作任务

## 注意：需要先细致阅读附件内容！

## 项目信息
- 剧本名称：{{projectName}}
- 剧本类型：{{projectType}}
- 总集数：{{totalEpisodes}}集
- 当前集数：第{{episodeNumber}}集
{{#if episodeTitle}}
- 集名：{{episodeTitle}}
{{/if}}

## 世界观设定
{{#if worldviewBackground}}
- 故事背景：{{worldviewBackground}}
{{/if}}
{{#if worldviewSetting}}
- 世界设定：{{worldviewSetting}}
{{/if}}
{{#if worldviewTheme}}
- 核心主题：{{worldviewTheme}}
{{/if}}
{{#if worldviewConflict}}
- 主要冲突：{{worldviewConflict}}
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
    let maxIterations = 50; // 防止无限循环
    let iteration = 0;

    // 循环处理直到没有条件块
    while (iteration < maxIterations) {
      iteration++;

      // 使用栈来匹配配对的 if/endif，处理任意层级的嵌套
      let result = '';
      let i = 0;
      let modified = false;

      while (i < text.length) {
        // 查找 {{#if
        const ifStart = text.indexOf('{{#if', i);

        if (ifStart === -1) {
          // 没有更多的 if 块，追加剩余文本
          result += text.substring(i);
          break;
        }

        // 追加 if 之前的文本
        result += text.substring(i, ifStart);

        // 查找条件名称的结束位置
        const conditionStart = ifStart + 5; // '{{#if'.length
        const conditionEnd = text.indexOf('}}', conditionStart);

        if (conditionEnd === -1) {
          // 格式错误，保留原样
          result += text.substring(ifStart);
          break;
        }

        const condition = text.substring(conditionStart, conditionEnd).trim();

        // 查找匹配的 {{/if}}，需要考虑嵌套
        let depth = 1;
        let pos = conditionEnd + 2; // '}}' 之后
        let endifPos = -1;

        while (pos < text.length && depth > 0) {
          const nextIf = text.indexOf('{{#if', pos);
          const nextEndif = text.indexOf('{{/if}}', pos);

          if (nextEndif === -1) {
            // 没有找到结束标记
            break;
          }

          if (nextIf !== -1 && nextIf < nextEndif) {
            // 遇到嵌套的 if
            depth++;
            pos = nextIf + 5;
          } else {
            // 遇到 endif
            depth--;
            if (depth === 0) {
              endifPos = nextEndif;
            }
            pos = nextEndif + 7; // '{{/if}}'.length
          }
        }

        if (endifPos === -1) {
          // 没有找到匹配的结束标记，保留原样
          result += text.substring(ifStart);
          break;
        }

        // 提取内容（不包括 {{#if condition}} 和 {{/if}}）
        const content = text.substring(conditionEnd + 2, endifPos);

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
          // 条件为真，保留内容（需要继续处理内部的条件块）
          result += content;
          modified = true;
        }
        // 条件为假，不添加内容（相当于移除整个块）

        // 移动到 {{/if}} 之后
        i = endifPos + 7;
      }

      text = result;

      // 如果没有修改，说明没有更多条件块需要处理
      if (!modified) {
        break;
      }
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
  prompt += `- 情感基调：${tone || '未指定'}\n\n（重要！）`;

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

  prompt += `注意：1. 请务必使用【字段名】的格式，这样系统才能正确解析并自动填充到表单中。
  2. 回答需要符合人类语言习惯，不要ai口吻!
  3. 世界观整体设计:注意不要太复杂！需要简单可靠，符合短剧爽点即可,世界观是为剧情、角色服务的不要本末倒置!`;

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

  // 完整显示世界观设定，让AI能根据完整背景生成更准确的角色
  if (worldview && Object.keys(worldview).some(key => worldview[key])) {
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
      prompt += `**情感基调（重要！）**：${worldview.tone}\n\n`;
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
    characters,
    relationships  // 新增：角色关系图谱
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
      prompt += `**情感基调（重要！）**：${worldview.tone}\n\n`;
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

  // 角色关系图谱（新增）
  if (relationships && relationships.length > 0) {
    prompt += `## 角色关系图谱\n\n`;
    prompt += `以下是角色之间的重要关系，请在大纲中充分考虑这些关系的发展和变化：\n\n`;

    // 按角色分组显示关系
    const relationsByChar = {};
    relationships.forEach(rel => {
      if (!relationsByChar[rel.from]) {
        relationsByChar[rel.from] = [];
      }
      relationsByChar[rel.from].push(rel);
    });

    Object.keys(relationsByChar).forEach((charName, index) => {
      prompt += `**${index + 1}. ${charName}的关系网络**\n`;
      const relations = relationsByChar[charName];
      relations.forEach(rel => {
        const direction = rel.direction === 'bidirectional' ? '↔' : '→';
        const strengthStars = '★'.repeat(rel.strength || 3);
        prompt += `  - 与 **${rel.to}**：${rel.type}${direction}（强度${strengthStars}）\n`;
        if (rel.description) {
          prompt += `    ${rel.description}\n`;
        }
      });
      prompt += `\n`;
    });

    prompt += `**💡 提示**：请在剧情设计中充分考虑这些关系的发展，比如：\n`;
    prompt += `- 暗恋关系可以设计心动的告白场景\n`;
    prompt += `- 仇恨关系需要安排对峻和冲突场面\n`;
    prompt += `- 竞争关系可以创造紧张刺激的场面\n`;
    prompt += `- 友情/亲情关系能增加情感深度\n\n`;
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

/**
 * 解析AI返回的角色数据
 * @param {String} content AI返回的文本内容
 * @returns {Object} 解析后的角色数据
 */
export function parseCharacterResponse(content) {
  if (!content || typeof content !== 'string') {
    return {};
  }

  // 清理常见的AI思考标签和无关内容
  let cleanedContent = content
    // 移除 <think> 和 </think> 标签及其内容
    .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    // 移除单独的 </think> 标签
    .replace(/<\/think>/gi, '')
    // 移除其他可能的 XML/HTML 标签
    .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')
    // 移除多余的空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const result = {};

  // 字段映射表
  const fieldMap = {
    '角色姓名': 'name',
    '姓名': 'name',
    '年龄': 'age',
    '性别': 'gender',
    '角色定位': 'role',
    '角色描述': 'description',
    '描述': 'description',
    '性格特点': 'personality',
    '性格': 'personality',
    '角色背景': 'background',
    '背景': 'background',
    '行为动机': 'motivation',
    '动机': 'motivation',
    '人际关系': 'relationships',
    '关系': 'relationships'
  };

  // 使用【】标记提取字段（支持字段名与内容分行的格式）
  const fieldRegex = /【([^】]+)】\s*([\s\S]*?)(?=\n\s*【|$)/g;
  let match;

  while ((match = fieldRegex.exec(cleanedContent)) !== null) {
    const fieldName = match[1].trim();
    const fieldKey = fieldMap[fieldName];

    if (fieldKey) {
      // 提取字段内容并清理
      let fieldContent = match[2].trim();

      // 如果内容为空，跳过
      if (!fieldContent) {
        continue;
      }

      // 特殊处理年龄字段
      if (fieldKey === 'age') {
        const ageMatch = fieldContent.match(/\d+/);
        if (ageMatch) {
          result[fieldKey] = parseInt(ageMatch[0]);
        }
      }
      // 特殊处理性别字段（只取第一行）
      else if (fieldKey === 'gender') {
        const firstLine = fieldContent.split('\n')[0].trim();
        if (firstLine.includes('女')) {
          result[fieldKey] = '女';
        } else if (firstLine.includes('男')) {
          result[fieldKey] = '男';
        } else if (firstLine.includes('其他')) {
          result[fieldKey] = '其他';
        }
      }
      // 特殊处理姓名字段（只取第一行）
      else if (fieldKey === 'name') {
        result[fieldKey] = fieldContent.split('\n')[0].trim();
      }
      // 其他文本字段
      else {
        result[fieldKey] = fieldContent;
      }
    }
  }

  // 如果没有使用【】标记，尝试其他格式
  if (Object.keys(result).length === 0) {
    // 尝试匹配 "字段名：内容" 格式
    Object.keys(fieldMap).forEach(fieldName => {
      const fieldKey = fieldMap[fieldName];
      const regex = new RegExp(`${fieldName}[:：]\\s*([\\s\\S]*?)(?=(?:${Object.keys(fieldMap).join('|')})[:：]|$)`, 'i');
      const match = cleanedContent.match(regex);

      if (match && match[1]) {
        let value = match[1].trim();

        if (fieldKey === 'age') {
          const ageMatch = value.match(/\d+/);
          if (ageMatch) {
            result[fieldKey] = parseInt(ageMatch[0]);
          }
        } else if (fieldKey === 'gender') {
          if (value.includes('女')) {
            result[fieldKey] = '女';
          } else if (value.includes('男')) {
            result[fieldKey] = '男';
          } else if (value.includes('其他')) {
            result[fieldKey] = '其他';
          }
        } else {
          result[fieldKey] = value;
        }
      }
    });
  }

  return result;
}

/**
 * 生成角色关系图谱提示词
 * @param {Object} data 项目数据
 * @returns {String} 生成的提示词
 */
export function generateRelationshipGraphPrompt(data) {
  const {
    projectName,
    projectType,
    worldview,
    characters
  } = data;

  const charCount = characters.length;

  let prompt = `# 角色关系推断任务\n\n`;

  prompt += `## 项目信息\n`;
  prompt += `- 剧本名称：${projectName || '未命名'}\n`;
  prompt += `- 剧本类型：${projectType || '未指定'}\n`;
  prompt += `- 角色数量：${charCount}个\n\n`;

  // 世界观信息
  if (worldview && Object.keys(worldview).length > 0) {
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
    prompt += `## 角色列表\n\n`;
    characters.forEach((char, index) => {
      prompt += `**${index + 1}. ${char.name}**（${char.role || '角色'}）\n`;
      if (char.age) prompt += `- 年龄：${char.age}岁\n`;
      if (char.gender) prompt += `- 性别：${char.gender}\n`;
      if (char.description) prompt += `- 描述：${char.description}\n`;
      if (char.personality) prompt += `- 性格：${char.personality}\n`;
      if (char.background) prompt += `- 背景：${char.background}\n`;
      prompt += `\n`;
    });
  }

  prompt += `## 任务要求\n\n`;
  prompt += `基于以上信息，请为这些角色设计**精简而有力**的人际关系网络。\n\n`;
  prompt += `⚠️ **核心原则：质量优于数量！只创建对剧情发展真正重要的关系。**\n\n`;

  prompt += `### 1. 关系类型指南（优先选择符合剧情需要的核心关系）\n`;
  prompt += `- **核心情感**：爱情/暗恋、亲情、友情\n`;
  prompt += `- **核心冲突**：仇恨、竞争、利用/背叛\n`;
  prompt += `- **职场关系**：上下级、合作\n`;
  prompt += `- **特殊关系**：保护/依赖、秘密\n\n`;
  prompt += `💡 **注意**：不要为了多样化而强行使用所有类型，应根据角色背景和剧情需要自然选择。同类型的关系可以合并（如"竞争"可以涵盖"商业竞争"）。\n\n`;

  prompt += `### 2. 符合剧本基调\n`;
  if (worldview.tone) {
    prompt += `- 根据「${worldview.tone}」的基调设计冲突点\n`;
  }
  prompt += `- 确保关系设定能推动剧情发展\n`;
  prompt += `- 男女主角之间应有情感张力\n\n`;

  prompt += `### 3. 逻辑合理性\n`;
  prompt += `- 根据角色的定位、年龄、背景推断\n`;
  prompt += `- 避免关系设定矛盾\n`;
  prompt += `- 预留剧情发展空间\n\n`;

  // 根据角色数量动态调整关系密度建议（P1-4修复）
  let relationshipGuidance = '';
  let totalRelationsSuggestion = '';
  let exampleRelations = '';

  if (charCount <= 3) {
    relationshipGuidance = `### 4. 关系设计指南（少量角色 - ${charCount}人）\n`;
    relationshipGuidance += `由于本剧角色较少，关系网络应当**极度精简**：\n`;
    relationshipGuidance += `- **主角**：1-2个核心关系（聚焦最重要的情感线和冲突线）\n`;
    relationshipGuidance += `- **配角/反派**：1个关系即可\n`;
    relationshipGuidance += `- **总关系数建议**：${charCount}-${charCount + 1}个（避免为了凑数创造虚假关系）\n\n`;
    relationshipGuidance += `💡 **示例**：3人短剧（男主、女主、反派）→ 男主↔女主(爱情)、男主↔反派(对抗) 即可构成完整剧情\n\n`;

    // 3人示例
    exampleRelations = `【角色：${characters[0]?.name || '陆景琛'}】（男主角）\n`;
    exampleRelations += `关系1：${characters[1]?.name || '夏晴'} | 类型：暗恋 | 方向：单向 | 强度：5 | 描述：对女主一见钟情，但因身份差异不敢表白\n`;
    if (charCount >= 3) {
      exampleRelations += `关系2：${characters[2]?.name || '宋凯'} | 类型：竞争 | 方向：双向 | 强度：4 | 描述：公司控制权的竞争对手\n\n`;
    } else {
      exampleRelations += `\n`;
    }

    exampleRelations += `【角色：${characters[1]?.name || '夏晴'}】（女主角）\n`;
    exampleRelations += `关系1：${characters[0]?.name || '陆景琛'} | 类型：上下级 | 方向：双向 | 强度：3 | 描述：老板与秘书的职场关系\n`;
    exampleRelations += `// 注意：女主可以只有1个关系，不必与所有角色建立联系\n\n`;

    if (charCount >= 3) {
      exampleRelations += `【角色：${characters[2]?.name || '宋凯'}】（反派）\n`;
      exampleRelations += `// 反派的关系已在男主的"关系2"中描述（双向关系只需从一方描述）\n`;
      exampleRelations += `// 如需补充其他关系，可在此添加\n\n`;
    }

  } else if (charCount <= 6) {
    relationshipGuidance = `### 4. 关系设计指南（中等规模 - ${charCount}人）\n`;
    relationshipGuidance += `本剧有${charCount}个角色，关系网络应该**层次分明、聚焦核心**：\n`;
    relationshipGuidance += `- **主角（男/女主）**：2-4个核心关系\n`;
    relationshipGuidance += `- **主要配角**：2-3个关系\n`;
    relationshipGuidance += `- **次要配角/龙套**：1-2个关系\n`;
    relationshipGuidance += `- **总关系数建议**：${Math.floor(charCount * 1.2)}-${Math.floor(charCount * 1.8)}个\n\n`;

    // 6人示例
    exampleRelations = `【角色：${characters[0]?.name || '张晨阳'}】（男主角）\n`;
    exampleRelations += `关系1：${characters[1]?.name || '林诗雨'} | 类型：暗恋 | 方向：单向 | 强度：5 | 描述：对女主一见钟情\n`;
    exampleRelations += `关系2：${characters[2]?.name || '宋凯'} | 类型：竞争 | 方向：双向 | 强度：4 | 描述：公司控制权争夺战\n`;
    if (charCount >= 4) {
      exampleRelations += `关系3：${characters[3]?.name || '张母'} | 类型：亲情 | 方向：双向 | 强度：4 | 描述：母子关系紧张但互相关心\n\n`;
    } else {
      exampleRelations += `\n`;
    }

    exampleRelations += `【角色：${characters[1]?.name || '林诗雨'}】（女主角）\n`;
    exampleRelations += `关系1：${characters[0]?.name || '张晨阳'} | 类型：上下级 | 方向：双向 | 强度：3 | 描述：老板与秘书\n`;
    if (charCount >= 5) {
      exampleRelations += `关系2：${characters[4]?.name || '苏婉'} | 类型：友情 | 方向：双向 | 强度：5 | 描述：大学闺蜜，互相扶持\n\n`;
    } else {
      exampleRelations += `\n`;
    }

    if (charCount >= 5) {
      exampleRelations += `【角色：${characters[4]?.name || '苏婉'}】（配角）\n`;
      exampleRelations += `关系1：${characters[1]?.name || '林诗雨'} | 类型：友情 | 方向：双向 | 强度：5 | 描述：闺蜜关系\n`;
      exampleRelations += `// 配角只有1个核心关系，不必与所有人建立联系\n\n`;
    }

    exampleRelations += `// 其他角色类似，次要角色可以只有1-2个关系\n\n`;

  } else {
    relationshipGuidance = `### 4. 关系设计指南（复杂角色群 - ${charCount}人）\n`;
    relationshipGuidance += `本剧有${charCount}个角色，需要构建**有层次的**关系网络：\n`;
    relationshipGuidance += `- **核心角色（男女主）**：3-5个关系\n`;
    relationshipGuidance += `- **重要配角**：2-4个关系\n`;
    relationshipGuidance += `- **普通角色**：1-2个关系\n`;
    relationshipGuidance += `- **总关系数建议**：${Math.floor(charCount * 1.5)}-${Math.floor(charCount * 2.2)}个\n`;
    relationshipGuidance += `- ⚠️ **重要**：不是每个角色都要与所有人建立联系，避免关系网过于密集\n\n`;

    // 多人示例（使用前几个角色）
    exampleRelations = `【角色：${characters[0]?.name || '主角A'}】（核心角色）\n`;
    exampleRelations += `关系1：${characters[1]?.name || '主角B'} | 类型：爱情 | 方向：双向 | 强度：5 | 描述：核心情感线\n`;
    exampleRelations += `关系2：${characters[2]?.name || '配角C'} | 类型：竞争 | 方向：双向 | 强度：4 | 描述：重要冲突线\n`;
    exampleRelations += `关系3：${characters[3]?.name || '配角D'} | 类型：亲情 | 方向：双向 | 强度：4 | 描述：家庭背景\n\n`;

    exampleRelations += `【角色：${characters[1]?.name || '主角B'}】（核心角色）\n`;
    exampleRelations += `关系1：${characters[0]?.name || '主角A'} | 类型：爱情 | 方向：双向 | 强度：5 | 描述：核心情感线\n`;
    exampleRelations += `关系2：${characters[4]?.name || '配角E'} | 类型：友情 | 方向：双向 | 强度：4 | 描述：重要支线\n\n`;

    exampleRelations += `// 其他配角根据重要性分配1-3个关系\n`;
    exampleRelations += `// 次要角色只需1个关系即可\n\n`;
  }

  prompt += relationshipGuidance;

  prompt += `### 5. 关系强度定义（重要！请严格遵守）\n`;
  prompt += `- **强度5**：核心情感线，推动主线剧情（如：男女主爱情、生死仇敌）\n`;
  prompt += `  ⚠️ 仅用于2-3对最关键的关系\n\n`;
  prompt += `- **强度4**：重要关系，影响剧情走向（如：主角与主要配角的冲突、重要的亲情/友情）\n`;
  prompt += `  建议3-5对关系\n\n`;
  prompt += `- **强度3**：日常关系，构成故事背景（如：同事、普通朋友、职场关系）\n`;
  prompt += `  可用于大部分关系\n\n`;
  prompt += `- **强度2**：背景关系，偶尔出现（如：远房亲戚、偶遇的熟人）\n`;
  prompt += `  用于次要角色的边缘关系\n\n`;
  prompt += `- **强度1**：几乎无关，仅在特定场景出现（如：路人、一次性角色）\n`;
  prompt += `  通常不需要记录\n\n`;
  prompt += `💡 **强度分布建议**：5(极少)、4(少量)、3(主体)、2(少量)、1(几乎不用)\n\n`;

  prompt += `## ⚠️ 重要：请严格按照以下格式输出\n\n`;
  prompt += `### 输出示例：\n\n`;
  prompt += exampleRelations;

  prompt += `---\n\n`;
  prompt += `### 格式要求：\n`;
  prompt += `- 每个角色使用【角色：XXX】标记\n`;
  prompt += `- 关系格式：关系N：目标角色 | 类型：XX | 方向：单向/双向 | 强度：1-5 | 描述：XX\n`;
  prompt += `- **方向说明**：\n`;
  prompt += `  - 单向（A→B）：关系只从A指向B（如：A暗恋B）\n`;
  prompt += `  - 双向（A↔B）：关系是相互的（如：友情、竞争）\n`;
  prompt += `- **描述要求**：简要说明关系的具体内容，20-40字\n\n`;

  prompt += `### 🚨 关键注意事项：\n`;
  prompt += `1. **双向关系只需从一方描述**：如果A→B是"友情-双向"，则不需要再写B→A的友情关系\n`;
  prompt += `2. **不要凑数**：次要角色可以只有1个关系，不是每个角色都必须连接所有人\n`;
  prompt += `3. **聚焦核心**：优先确保主角的核心关系（情感线、冲突线）清晰有力\n`;
  prompt += `4. **避免矛盾**：同一对角色之间不要同时存在逻辑矛盾的关系（如既是爱情又是仇恨）\n`;
  prompt += `5. **质量>数量**：2-3个深刻的关系 > 5-6个平庸的关系\n\n`;

  prompt += `现在请开始创作，记住：**精简、聚焦、有力**！`;

  return prompt;
}

/**
 * 解析AI返回的角色关系数据
 * @param {String} content AI返回的文本内容
 * @returns {Array} 解析后的关系数组
 */
export function parseRelationshipResponse(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // 清理AI思考标签
  let cleanedContent = content
    .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/think>/gi, '')
    .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const relationships = [];

  // 按【角色：XXX】分割，支持中英文冒号
  const characterBlocks = cleanedContent.split(/【角色[\uff1a:]([^】]+)】/);

  console.log(`解析到 ${Math.floor(characterBlocks.length / 2)} 个角色块`);

  for (let i = 1; i < characterBlocks.length; i += 2) {
    const characterName = characterBlocks[i].trim();
    const relationsText = characterBlocks[i + 1];

    if (!relationsText) continue;

    console.log(`处理角色: ${characterName}`);

    // 优化正则表达式，支持中英文冒号、空格等各种情况
    // 格式：关系N：/: 目标 | 类型：/: XX | 方向：/: XX | 强度：/: N | 描述：/: XX
    const relationPattern = /关系\d+[\uff1a:]\s*([^|\uff5c]+?)\s*[|\uff5c]\s*类型[\uff1a:]\s*([^|\uff5c]+?)\s*[|\uff5c]\s*方向[\uff1a:]\s*([^|\uff5c]+?)\s*[|\uff5c]\s*强度[\uff1a:]\s*(\d+)\s*[|\uff5c]\s*描述[\uff1a:]\s*([^\n\r]+)/g;

    let match;
    let relationCount = 0;
    while ((match = relationPattern.exec(relationsText)) !== null) {
      const targetName = match[1].trim();
      const type = match[2].trim();
      const direction = match[3].trim();
      const strength = parseInt(match[4]);
      const description = match[5].trim();

      relationCount++;
      console.log(`  - 关系${relationCount}: ${characterName} -> ${targetName} (类型: ${type})`);

      relationships.push({
        from: characterName,
        to: targetName,
        type: type,
        direction: direction.includes('双向') || direction.includes('相互') || direction.toLowerCase().includes('bidirectional') ? 'bidirectional' : 'single',
        strength: strength || 3,
        description: description
      });
    }

    console.log(`  总计解析到 ${relationCount} 条关系`);
  }

  console.log(`解析完成，原始关系数: ${relationships.length}`);

  // 去重：移除冗余的双向关系
  const deduplicated = deduplicateBidirectionalRelationships(relationships);
  console.log(`去重后关系数: ${deduplicated.length}`);

  return deduplicated;
}

/**
 * 去重双向关系（避免A→B和B→A同时存在）
 * @param {Array} relationships 原始关系数组
 * @returns {Array} 去重后的关系数组
 */
function deduplicateBidirectionalRelationships(relationships) {
  const seen = new Set();
  const deduplicated = [];
  const duplicates = []; // 记录被移除的重复关系

  for (const rel of relationships) {
    // 为双向关系创建标准化的键（按字母顺序排序角色名）
    const isBidirectional = rel.direction === 'bidirectional';

    let key;
    if (isBidirectional) {
      // 双向关系：按字母顺序排序，确保A→B和B→A生成相同的key
      const [char1, char2] = [rel.from, rel.to].sort();
      key = `${char1}↔${char2}:${rel.type}`;
    } else {
      // 单向关系：保持原方向
      key = `${rel.from}→${rel.to}:${rel.type}`;
    }

    if (seen.has(key)) {
      // 发现重复关系
      duplicates.push({
        from: rel.from,
        to: rel.to,
        type: rel.type,
        reason: isBidirectional ? '双向关系重复' : '单向关系重复'
      });
      console.log(`  ⚠️ 移除重复关系: ${rel.from} ↔ ${rel.to} (${rel.type})`);
    } else {
      seen.add(key);
      deduplicated.push(rel);
    }
  }

  if (duplicates.length > 0) {
    console.log(`📊 去重统计: 移除了 ${duplicates.length} 条重复关系`);
    duplicates.forEach(dup => {
      console.log(`   - ${dup.from} ↔ ${dup.to}: ${dup.type} (${dup.reason})`);
    });
  }

  return deduplicated;
}

/**
 * 解析AI返回的大纲数据
 * @param {String} content AI返回的文本内容
 * @returns {Object} 解析后的大纲数据 { acts: [...] }
 */
export function parseOutlineResponse(content) {
  if (!content || typeof content !== 'string') {
    return { acts: [] };
  }

  // 清理AI思考标签
  let cleanedContent = content
    .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/think>/gi, '')
    .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const acts = [];

  // 匹配幕标记：【第一幕：XXX】、【第二幕：XXX】、【第三幕：XXX】
  const actPattern = /【第([一二三])幕[：:](.*?)】/g;
  const actMatches = [];
  let match;

  while ((match = actPattern.exec(cleanedContent)) !== null) {
    actMatches.push({
      index: match.index,
      number: match[1],
      title: match[2].trim(),
      fullMatch: match[0]
    });
  }

  console.log(`解析到 ${actMatches.length} 幕`);

  if (actMatches.length === 0) {
    console.warn('未找到任何幕标记');
    return { acts: [] };
  }

  // 处理每一幕
  actMatches.forEach((actMatch, actIndex) => {
    const actNumber = actMatch.number;
    const actTitle = actMatch.title;
    const actStartIndex = actMatch.index;
    const actEndIndex = actIndex < actMatches.length - 1
      ? actMatches[actIndex + 1].index
      : cleanedContent.length;

    const actContent = cleanedContent.substring(actStartIndex, actEndIndex);

    // 提取幕描述（在【第X幕】后、第一个【节点】前的内容）
    const descPattern = /【第[一二三]幕[：:][^】]*】[\s\S]*?幕描述[：:]([^【]*)/;
    const descMatch = actContent.match(descPattern);
    const actDescription = descMatch ? descMatch[1].trim() : '';

    // 提取节点
    const nodes = [];
    const nodePattern = /【节点(\d+)】[\s\S]*?(?=【节点\d+】|【第[一二三]幕|$)/g;
    let nodeMatch;

    while ((nodeMatch = nodePattern.exec(actContent)) !== null) {
      const nodeNumber = parseInt(nodeMatch[1]);
      const nodeContent = nodeMatch[0];

      // 提取节点的各个字段
      const nameMatch = nodeContent.match(/名称[：:]\s*([^\n]*)/i);
      const descMatch = nodeContent.match(/描述[：:]\s*([\s\S]*?)(?=涉及角色|$)/i);
      const charactersMatch = nodeContent.match(/涉及角色[：:]\s*([^\n]*)/i);
      const emotionMatch = nodeContent.match(/情感[：:]\s*([^\n]*)/i);
      const episodesMatch = nodeContent.match(/集数[：:]\s*([^\n]*)/i);

      const nodeName = nameMatch ? nameMatch[1].trim() : `节点${nodeNumber}`;
      const nodeDesc = descMatch ? descMatch[1].trim() : '';
      const characters = charactersMatch ? charactersMatch[1].trim() : '';
      const emotion = emotionMatch ? emotionMatch[1].trim() : '';
      const episodes = episodesMatch ? episodesMatch[1].trim() : '';

      console.log(`  - 节点${nodeNumber}: ${nodeName}`);

      nodes.push({
        id: `act${actIndex + 1}-node${nodeNumber}`,
        title: nodeName,
        description: nodeDesc,
        characters: characters,
        emotion: emotion,
        episodes: episodes
      });
    }

    console.log(`第${actNumber}幕共解析到 ${nodes.length} 个节点`);

    // 映射中文数字到阿拉伯数字
    const actNumberMap = { '一': 1, '二': 2, '三': 3 };
    const actNum = actNumberMap[actNumber] || 1;

    acts.push({
      id: `act${actNum}`,
      number: actNum,
      title: actTitle,
      description: actDescription,
      nodes: nodes
    });
  });

  console.log(`最终解析结果: ${acts.length} 幕，共 ${acts.reduce((sum, act) => sum + act.nodes.length, 0)} 个节点`);

  return { acts };
}

export default {
  generateWorldviewPrompt,
  generateCharacterPrompt,
  generateOutlinePrompt,
  generateEpisodePrompt,
  generateBatchEpisodesPrompt,
  generateBatchCharactersPrompt,
  generateCompleteOutlinePrompt,
  parseCharacterResponse,
  generateRelationshipGraphPrompt,
  parseRelationshipResponse,
  parseOutlineResponse  // 新增
};
