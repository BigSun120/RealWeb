/**
 * 剧本导出工具
 * 支持导出已完成的剧本，检查完整性，多种格式输出
 */

/**
 * 检查剧本完整性
 * @param {Array} episodes 所有分集
 * @param {Number} upToEpisode 截止到哪一集（可选，默认全部）
 * @returns {Object} 检查结果
 */
export function checkScriptCompleteness(episodes, upToEpisode = null) {
  const result = {
    isComplete: true,
    warnings: [],
    completedEpisodes: [],
    incompleteEpisodes: [],
    missingEpisodes: []
  };

  // 过滤已完成的剧集
  const completed = episodes.filter(ep => 
    ep.status === 'completed' || ep.status === 'reviewed'
  );
  
  result.completedEpisodes = completed.map(ep => ep.number).sort((a, b) => a - b);
  
  // 如果指定了截止集数，只检查到该集数
  const maxEpisode = upToEpisode || Math.max(...episodes.map(ep => ep.number));
  
  // 检查1到maxEpisode之间是否有未完成或缺失的集数
  for (let i = 1; i <= maxEpisode; i++) {
    const episode = episodes.find(ep => ep.number === i);
    
    if (!episode) {
      result.missingEpisodes.push(i);
      result.isComplete = false;
      result.warnings.push(`第${i}集：剧集不存在`);
    } else if (episode.status !== 'completed' && episode.status !== 'reviewed') {
      result.incompleteEpisodes.push({
        number: i,
        status: episode.status,
        title: episode.title
      });
      result.isComplete = false;
      
      const statusText = {
        'draft': '草稿',
        'in-progress': '进行中'
      }[episode.status] || episode.status;
      
      result.warnings.push(`第${i}集：${episode.title || '未命名'} (${statusText})`);
    }
  }
  
  return result;
}

/**
 * 格式化场景内容
 * @param {Object} scene 场景对象
 * @param {Number} index 场景索引
 * @returns {String} 格式化后的场景文本
 */
function formatScene(scene, index) {
  let text = `### 场景${scene.number || index + 1}`;
  
  if (scene.location) {
    text += `：${scene.location}`;
  }
  text += '\n';
  
  if (scene.time) {
    text += `**时间**：${scene.time}\n`;
  }
  
  if (scene.atmosphere) {
    text += `**氛围**：${scene.atmosphere}\n`;
  }
  
  if (scene.content) {
    text += `\n${scene.content}\n`;
  }
  
  return text;
}

/**
 * 生成单集剧本文本
 * @param {Object} episode 分集对象
 * @param {String} format 格式 (markdown/txt)
 * @returns {String} 剧本文本
 */
export function generateEpisodeScript(episode, format = 'markdown') {
  const isMd = format === 'markdown';
  let text = '';
  
  // 标题
  const title = episode.title || `第${episode.number}集`;
  // 检查标题是否已经包含集数前缀
  const hasEpisodePrefix = /^第\d+集/.test(title);
  
  if (isMd) {
    if (hasEpisodePrefix) {
      text += `## ${title}\n\n`;
    } else {
      text += `## 第${episode.number}集：${title}\n\n`;
    }
  } else {
    text += `========== 第 ${episode.number} 集 ==========\n`;
    text += `标题：${title}\n`;
  }
  
  // 状态
  const statusText = {
    'draft': '草稿',
    'in-progress': '进行中',
    'completed': '已完成',
    'reviewed': '已审核'
  }[episode.status] || episode.status;
  
  if (isMd) {
    text += `**状态**：${statusText}\n\n`;
  } else {
    text += `状态：${statusText}\n`;
  }
  
  // 概要
  if (episode.content?.summary) {
    if (isMd) {
      text += `**概要**：${episode.content.summary}\n\n`;
    } else {
      text += `概要：${episode.content.summary}\n\n`;
    }
  }
  
  // 场景
  if (episode.content?.scenes && episode.content.scenes.length > 0) {
    episode.content.scenes.forEach((scene, index) => {
      if (isMd) {
        text += formatScene(scene, index) + '\n';
      } else {
        text += `\n--- 场景${scene.number || index + 1}`;
        if (scene.location) text += ` | ${scene.location}`;
        text += ' ---\n';
        
        if (scene.time) text += `时间：${scene.time}\n`;
        if (scene.atmosphere) text += `氛围：${scene.atmosphere}\n`;
        if (scene.content) text += `\n${scene.content}\n`;
      }
    });
  } else if (episode.content?.script) {
    // 如果没有结构化场景，使用脚本字段
    if (isMd) {
      text += `### 剧本内容\n\n${episode.content.script}\n\n`;
    } else {
      text += `\n${episode.content.script}\n\n`;
    }
  }
  
  // 关键对白
  if (episode.content?.keyDialogues && episode.content.keyDialogues.length > 0) {
    if (isMd) {
      text += `\n**关键对白**：\n`;
      episode.content.keyDialogues.forEach((dialogue, index) => {
        text += `${index + 1}. ${dialogue}\n`;
      });
      text += '\n';
    } else {
      text += `\n关键对白：\n`;
      episode.content.keyDialogues.forEach((dialogue, index) => {
        text += `  ${index + 1}. ${dialogue}\n`;
      });
      text += '\n';
    }
  }
  
  // 结尾悬念
  if (episode.content?.cliffhanger) {
    if (isMd) {
      text += `**结尾悬念**：${episode.content.cliffhanger}\n\n`;
    } else {
      text += `结尾悬念：${episode.content.cliffhanger}\n\n`;
    }
  }
  
  // 备注
  if (episode.content?.notes) {
    if (isMd) {
      text += `*备注*：${episode.content.notes}\n\n`;
    } else {
      text += `备注：${episode.content.notes}\n\n`;
    }
  }
  
  // 分隔线
  if (!isMd) {
    text += '\n' + '='.repeat(50) + '\n\n';
  } else {
    text += '---\n\n';
  }
  
  return text;
}

/**
 * 生成完整剧本文档
 * @param {Object} options 导出选项
 * @returns {String} 完整剧本文本
 */
export function generateFullScript(options) {
  const {
    projectInfo = {},
    worldview = {},
    characters = [],
    episodes = [],
    format = 'markdown',
    includeIncomplete = false,
    upToEpisode = null
  } = options;
  
  const isMd = format === 'markdown';
  let text = '';
  
  // 标题
  const projectName = projectInfo.name || '未命名剧本';
  if (isMd) {
    text += `# ${projectName} - 完整剧本\n\n`;
  } else {
    text += `${projectName} - 完整剧本\n`;
    text += '='.repeat(projectName.length + 10) + '\n\n';
  }
  
  // 项目信息
  if (isMd) {
    text += `## 项目信息\n\n`;
  } else {
    text += `项目信息\n${'='.repeat(20)}\n`;
  }
  
  text += `- 剧本名称：${projectName}\n`;
  if (projectInfo.type) {
    text += `- 剧本类型：${projectInfo.type}\n`;
  }
  if (projectInfo.totalEpisodes) {
    text += `- 总集数：${projectInfo.totalEpisodes}集\n`;
  }
  
  // 统计信息
  const completed = episodes.filter(ep => 
    ep.status === 'completed' || ep.status === 'reviewed'
  );
  text += `- 已完成：${completed.length}集\n`;
  if (upToEpisode) {
    text += `- 导出范围：第1-${upToEpisode}集\n`;
  }
  
  const now = new Date();
  text += `- 导出时间：${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}\n\n`;
  
  // 世界观设定
  if (worldview && Object.keys(worldview).length > 0) {
    if (isMd) {
      text += `## 世界观设定\n\n`;
    } else {
      text += `\n世界观设定\n${'='.repeat(20)}\n`;
    }
    
    if (worldview.background) {
      text += `**故事背景**：${worldview.background}\n\n`;
    }
    if (worldview.theme) {
      text += `**核心主题**：${worldview.theme}\n\n`;
    }
    if (worldview.tone) {
      text += `**情感基调**：${worldview.tone}\n\n`;
    }
  }
  
  // 主要角色
  if (characters && characters.length > 0) {
    if (isMd) {
      text += `## 主要角色\n\n`;
    } else {
      text += `\n主要角色\n${'='.repeat(20)}\n`;
    }
    
    characters.forEach((char, index) => {
      text += `${index + 1}. **${char.name}**`;
      if (char.role) {
        text += `（${char.role}）`;
      }
      text += '\n';
      
      if (char.description) {
        text += `   ${char.description}\n`;
      }
      if (char.personality) {
        text += `   性格：${char.personality}\n`;
      }
      text += '\n';
    });
  }
  
  // 分隔符
  if (isMd) {
    text += `---\n\n# 剧本正文\n\n`;
  } else {
    text += `\n${'='.repeat(50)}\n`;
    text += `剧本正文\n`;
    text += `${'='.repeat(50)}\n\n`;
  }
  
  // 过滤和排序分集
  let episodesToExport = episodes.slice().sort((a, b) => a.number - b.number);
  
  if (upToEpisode) {
    episodesToExport = episodesToExport.filter(ep => ep.number <= upToEpisode);
  }
  
  if (!includeIncomplete) {
    episodesToExport = episodesToExport.filter(ep => 
      ep.status === 'completed' || ep.status === 'reviewed'
    );
  }
  
  // 生成每一集的剧本
  episodesToExport.forEach(episode => {
    text += generateEpisodeScript(episode, format);
  });
  
  return text;
}

/**
 * 生成前置剧本摘要（用于提示词上下文）
 * @param {Array} episodes 所有分集
 * @param {Number} currentEpisode 当前集数
 * @param {Number} maxPreviousEpisodes 最多包含多少前置集（默认10集）
 * @returns {String} 前置剧本摘要
 */
export function generatePreviousEpisodesSummary(episodes, currentEpisode, maxPreviousEpisodes = 10) {
  let text = '';
  
  // 获取当前集之前的已完成剧集
  const previousEpisodes = episodes
    .filter(ep => 
      ep.number < currentEpisode && 
      (ep.status === 'completed' || ep.status === 'reviewed')
    )
    .sort((a, b) => a.number - b.number);
  
  if (previousEpisodes.length === 0) {
    return '';
  }
  
  // 限制数量
  const episodesToInclude = previousEpisodes.slice(-maxPreviousEpisodes);
  const startEpisode = episodesToInclude[0].number;
  const endEpisode = episodesToInclude[episodesToInclude.length - 1].number;
  
  text += `# 已完成剧集回顾（第${startEpisode}-${endEpisode}集）\n\n`;
  
  if (previousEpisodes.length > maxPreviousEpisodes) {
    text += `> 注：前面还有${previousEpisodes.length - maxPreviousEpisodes}集，此处仅展示最近${maxPreviousEpisodes}集\n\n`;
  }
  
  episodesToInclude.forEach(episode => {
    const title = episode.title || `第${episode.number}集`;
    // 检查标题是否已经包含集数前缀
    const hasEpisodePrefix = /^第\d+集/.test(title);
    
    if (hasEpisodePrefix) {
      text += `## ${title}\n\n`;
    } else {
      text += `## 第${episode.number}集：${title}\n\n`;
    }
    
    // 概要
    if (episode.content?.summary) {
      text += `${episode.content.summary}\n\n`;
    }
    
    // 关键场景（简化）
    if (episode.content?.scenes && episode.content.scenes.length > 0) {
      text += `**关键场景**：\n`;
      episode.content.scenes.forEach((scene, index) => {
        const location = scene.location || '未知地点';
        text += `- 场景${index + 1}（${location}）`;
        if (scene.content) {
          // 只取前80字
          const brief = scene.content.substring(0, 80) + (scene.content.length > 80 ? '...' : '');
          text += `：${brief}`;
        }
        text += '\n';
      });
      text += '\n';
    }
    
    // 关键对白
    if (episode.content?.keyDialogues && episode.content.keyDialogues.length > 0) {
      text += `**关键对白**：`;
      text += episode.content.keyDialogues.slice(0, 3).map(d => `"${d}"`).join('、');
      text += '\n\n';
    }
    
    // 结尾悬念
    if (episode.content?.cliffhanger) {
      text += `**结尾**：${episode.content.cliffhanger}\n\n`;
    }
    
    text += '---\n\n';
  });
  
  return text;
}

/**
 * 下载文本文件
 * @param {String} content 文件内容
 * @param {String} filename 文件名
 */
export function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 生成完整创作包（包含所有上下文+提示词）
 * @param {Object} options 选项
 * @returns {String} 完整创作包文本
 */
export function generateCompleteCreationPackage(options) {
  const {
    episode,
    projectInfo = {},
    worldview = {},
    characters = [],
    outline = {},
    allEpisodes = [],
    prompt = ''
  } = options;
  
  const episodeNumber = episode.number;
  const episodeTitle = episode.title || `第${episodeNumber}集`;
  
  let text = '';
  
  // 标题
  // 检查标题是否已经包含集数前缀
  const hasEpisodePrefix = /^第\d+集/.test(episodeTitle);
  if (hasEpisodePrefix) {
    text += `# ${episodeTitle}完整创作包\n\n`;
  } else {
    text += `# 第${episodeNumber}集完整创作包：${episodeTitle}\n\n`;
  }
  
  const now = new Date();
  text += `创建时间：${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}\n\n`;
  
  text += `---\n\n`;
  
  // 项目信息
  text += `## 📋 项目信息\n\n`;
  text += `- **剧本名称**：${projectInfo.name || '未命名'}\n`;
  text += `- **剧本类型**：${projectInfo.type || '未指定'}\n`;
  text += `- **总集数**：${projectInfo.totalEpisodes || allEpisodes.length || '未知'}集\n`;
  text += `- **当前集数**：第${episodeNumber}集\n\n`;
  
  // 世界观设定
  if (worldview && Object.keys(worldview).length > 0) {
    text += `## 🌍 世界观设定\n\n`;
    
    if (worldview.background) {
      text += `### 故事背景\n${worldview.background}\n\n`;
    }
    
    if (worldview.setting) {
      text += `### 世界设定\n${worldview.setting}\n\n`;
    }
    
    if (worldview.theme) {
      text += `### 核心主题\n${worldview.theme}\n\n`;
    }
    
    if (worldview.conflict) {
      text += `### 主要冲突\n${worldview.conflict}\n\n`;
    }
    
    if (worldview.tone) {
      text += `### 情感基调\n${worldview.tone}\n\n`;
    }
  }
  
  // 主要角色
  if (characters && characters.length > 0) {
    text += `## 👥 主要角色\n\n`;
    
    characters.forEach((char, index) => {
      text += `### ${index + 1}. ${char.name}`;
      if (char.role) {
        text += `（${char.role}）`;
      }
      text += `\n\n`;
      
      if (char.description) {
        text += `**角色描述**：${char.description}\n\n`;
      }
      
      if (char.personality) {
        text += `**性格特点**：${char.personality}\n\n`;
      }
      
      if (char.background) {
        text += `**角色背景**：${char.background}\n\n`;
      }
      
      if (char.motivation) {
        text += `**行为动机**：${char.motivation}\n\n`;
      }
    });
  }
  
  // 剧情大纲
  if (outline && outline.acts && outline.acts.length > 0) {
    text += `## 📖 剧情大纲\n\n`;
    
    outline.acts.forEach(act => {
      text += `### ${act.title || `第${act.actNumber}幕`}\n\n`;
      
      if (act.description) {
        text += `${act.description}\n\n`;
      }
      
      if (act.plotPoints && act.plotPoints.length > 0) {
        text += `**关键节点**：\n\n`;
        act.plotPoints.forEach((point, idx) => {
          text += `${idx + 1}. **${point.name}**`;
          if (point.episodeRange) {
            text += ` (第${point.episodeRange}集)`;
          }
          text += `\n`;
          if (point.description) {
            text += `   ${point.description}\n`;
          }
          // 添加涉及角色信息
          if (point.characters && point.characters.length > 0) {
            text += `   涉及角色：${point.characters.join('、')}\n`;
          }
          // 添加情感变化信息
          if (point.emotion && point.emotion.length > 0) {
            text += `   情感变化：${point.emotion.join('、')}\n`;
          }
          text += `\n`;
        });
      }
    });
  }
  
  // 已完成剧集
  const completedEpisodes = allEpisodes
    .filter(ep => 
      ep.number < episodeNumber && 
      (ep.status === 'completed' || ep.status === 'reviewed')
    )
    .sort((a, b) => a.number - b.number);
  
  if (completedEpisodes.length > 0) {
    text += `## 📖 已完成剧集（第1-${completedEpisodes[completedEpisodes.length - 1].number}集）\n\n`;
    
    completedEpisodes.forEach(ep => {
      // 如果标题已经包含集数前缀，就不再重复添加
      let epTitle = ep.title || `第${ep.number}集`;
      // 检查标题是否以 "第X集" 开头
      const hasEpisodePrefix = /^第\d+集/.test(epTitle);
      
      if (hasEpisodePrefix) {
        // 已经有集数前缀，直接使用标题
        text += `### ${epTitle}\n\n`;
      } else {
        // 没有集数前缀，添加
        text += `### 第${ep.number}集：${epTitle}\n\n`;
      }
      
      // 概要
      if (ep.content?.summary) {
        text += `**概要**：${ep.content.summary}\n\n`;
      }
      
      // 场景
      if (ep.content?.scenes && ep.content.scenes.length > 0) {
        text += `**场景**：\n\n`;
        ep.content.scenes.forEach((scene, idx) => {
          text += `**场景${scene.number || idx + 1}**`;
          if (scene.location) {
            text += `：${scene.location}`;
          }
          text += `\n`;
          
          if (scene.content) {
            // 取前150字作为摘要
            const brief = scene.content.length > 150 
              ? scene.content.substring(0, 150) + '...' 
              : scene.content;
            text += `${brief}\n\n`;
          }
        });
      } else if (ep.content?.script) {
        // 如果没有结构化场景，使用script字段
        const brief = ep.content.script.length > 200 
          ? ep.content.script.substring(0, 200) + '...' 
          : ep.content.script;
        text += `${brief}\n\n`;
      }
      
      // 关键对白
      if (ep.content?.keyDialogues && ep.content.keyDialogues.length > 0) {
        text += `**关键对白**：${ep.content.keyDialogues.slice(0, 3).map(d => `“${d}”`).join('、')}\n\n`;
      }
      
      // 结尾悬念
      if (ep.content?.cliffhanger) {
        text += `**结尾**：${ep.content.cliffhanger}\n\n`;
      }
      
      text += `---\n\n`;
    });
  }
  
  // 分隔线
  text += `\n${'='.repeat(60)}\n\n`;
  
  // 当前集创作任务
  text += `## 🎬 第${episodeNumber}集创作任务\n\n`;
  
  // 添加AI阅读指引
  text += `> **⚠️ 重要提示**：请仔细阅读本文档的**全部内容**，包括：\n`;
  text += `> - 项目信息和世界观设定\n`;
  text += `> - 所有主要角色的详细信息\n`;
  text += `> - 完整的剧情大纲和结构\n`;
  if (completedEpisodes.length > 0) {
    text += `> - 前${completedEpisodes.length}集已完成剧集的剧情回顾\n`;
  }
  text += `> \n`;
  text += `> 只有充分理解以上所有背景信息后，才能确保创作的剧本符合整体设定，保持剧情连贯性和角色一致性。\n\n`;
  
  text += `---\n\n`;
  
  if (prompt) {
    text += prompt;
  } else {
    text += `### 创作要求\n\n`;
    text += `请基于以上完整的背景信息和已完成剧集，创作第${episodeNumber}集的完整剧本。\n\n`;
    text += `**创作重点**：\n`;
    text += `1. 确保剧情与前作衔接自然\n`;
    text += `2. 保持角色性格和行为的一致性\n`;
    text += `3. 符合整体世界观设定\n`;
    text += `4. 推动主线剧情发展\n`;
    text += `5. 在结尾设置适当的悬念或转折\n`;
  }
  
  return text;
}

export default {
  checkScriptCompleteness,
  generateEpisodeScript,
  generateFullScript,
  generatePreviousEpisodesSummary,
  generateCompleteCreationPackage,
  downloadTextFile
};
