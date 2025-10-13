/**
 * 短剧剧本导出工具
 * 支持TXT和Markdown格式导出
 */

/**
 * 检查剧本完整性
 * @param {Array} episodes 所有分集
 * @param {Number} upToEpisode 截止到哪一集（可选）
 * @returns {Object} 检查结果
 */
function checkScriptCompleteness(episodes, upToEpisode = null) {
  const result = {
    isComplete: true,
    warnings: [],
    completedEpisodes: [],
    incompleteEpisodes: [],
    missingEpisodes: []
  };

  if (!episodes || episodes.length === 0) {
    result.isComplete = false;
    result.warnings.push('项目暂无分集内容');
    return result;
  }

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
 * @param {Boolean} isMarkdown 是否为Markdown格式
 * @returns {String} 格式化后的场景文本
 */
function formatScene(scene, index, isMarkdown) {
  let text = '';
  
  if (isMarkdown) {
    text = `### 场景${scene.number || index + 1}`;
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
  } else {
    text = `\n--- 场景${scene.number || index + 1}`;
    if (scene.location) text += ` | ${scene.location}`;
    text += ' ---\n';
    
    if (scene.time) text += `时间：${scene.time}\n`;
    if (scene.atmosphere) text += `氛围：${scene.atmosphere}\n`;
    if (scene.content) text += `\n${scene.content}\n`;
  }
  
  return text;
}

/**
 * 生成单集剧本文本
 * @param {Object} episode 分集对象
 * @param {String} format 格式 (markdown/txt)
 * @param {Boolean} includeMetadata 是否包含创作辅助信息（关键对白、结尾悬念、备注）
 * @returns {String} 剧本文本
 */
function generateEpisodeScript(episode, format = 'txt', includeMetadata = true) {
  const isMarkdown = format === 'markdown';
  let text = '';
  
  // 标题
  const title = episode.title || `第${episode.number}集`;
  const hasEpisodePrefix = /^第\d+集/.test(title);
  
  if (isMarkdown) {
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
  
  if (isMarkdown) {
    text += `**状态**：${statusText}\n\n`;
  } else {
    text += `状态：${statusText}\n`;
  }
  
  // 概要
  if (episode.content?.summary) {
    if (isMarkdown) {
      text += `**概要**：${episode.content.summary}\n\n`;
    } else {
      text += `概要：${episode.content.summary}\n\n`;
    }
  }
  
  // 场景
  if (episode.content?.scenes && episode.content.scenes.length > 0) {
    episode.content.scenes.forEach((scene, index) => {
      text += formatScene(scene, index, isMarkdown) + '\n';
    });
  } else if (episode.content?.script) {
    // 如果没有结构化场景，使用脚本字段
    if (isMarkdown) {
      text += `### 剧本内容\n\n${episode.content.script}\n\n`;
    } else {
      text += `\n${episode.content.script}\n\n`;
    }
  }
  
  // 创作辅助信息（可选）
  if (includeMetadata) {
    // 关键对白
    if (episode.content?.keyDialogues && episode.content.keyDialogues.length > 0) {
      if (isMarkdown) {
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
      if (isMarkdown) {
        text += `**结尾悬念**：${episode.content.cliffhanger}\n\n`;
      } else {
        text += `结尾悬念：${episode.content.cliffhanger}\n\n`;
      }
    }
    
    // 备注
    if (episode.content?.notes) {
      if (isMarkdown) {
        text += `*备注*：${episode.content.notes}\n\n`;
      } else {
        text += `备注：${episode.content.notes}\n\n`;
      }
    }
  }
  
  // 分隔线
  if (!isMarkdown) {
    text += '\n' + '='.repeat(50) + '\n\n';
  } else {
    text += '---\n\n';
  }
  
  return text;
}

/**
 * 生成完整剧本文档
 * @param {Object} project 项目对象
 * @param {Object} options 选项
 * @returns {Object} 导出结果
 */
function exportScript(project, options = {}) {
  const {
    format = 'txt',
    includeIncomplete = false,
    upToEpisode = null,
    includeMetadata = true // 默认包含创作辅助信息
  } = options;

  const result = {
    success: false,
    content: '',
    warnings: [],
    message: ''
  };

  // 检查完整性
  const completeness = checkScriptCompleteness(project.episodes || [], upToEpisode);
  result.warnings = completeness.warnings;

  // 如果没有完成的剧集且不包含未完成的，返回错误
  if (completeness.completedEpisodes.length === 0 && !includeIncomplete) {
    result.message = '暂无已完成的剧集可导出，请先完成至少一集剧本';
    return result;
  }

  const isMarkdown = format === 'markdown';
  let content = '';

  // 文档头部
  if (isMarkdown) {
    content += `# ${project.name}\n\n`;
  } else {
    content += `${'='.repeat(60)}\n`;
    content += `项目名称：${project.name}\n`;
    content += `${'='.repeat(60)}\n\n`;
  }

  // 项目基本信息
  if (isMarkdown) {
    content += `## 项目信息\n\n`;
    content += `- **类型**：${project.type}\n`;
    content += `- **总集数**：${project.episodeCount}\n`;
    content += `- **状态**：${project.status}\n`;
    content += `- **进度**：${project.progress}%\n`;
    if (project.description) {
      content += `- **简介**：${project.description}\n`;
    }
    content += `\n---\n\n`;
  } else {
    content += `类型：${project.type}\n`;
    content += `总集数：${project.episodeCount}\n`;
    content += `状态：${project.status}\n`;
    content += `进度：${project.progress}%\n`;
    if (project.description) {
      content += `简介：${project.description}\n`;
    }
    content += `\n${'-'.repeat(60)}\n\n`;
  }

  // 世界观设定（如果有）
  if (project.worldview && (project.worldview.background || project.worldview.setting)) {
    if (isMarkdown) {
      content += `## 世界观设定\n\n`;
      if (project.worldview.background) {
        content += `**背景**：${project.worldview.background}\n\n`;
      }
      if (project.worldview.setting) {
        content += `**设定**：${project.worldview.setting}\n\n`;
      }
      content += `---\n\n`;
    } else {
      content += `世界观设定\n`;
      content += `${'-'.repeat(60)}\n`;
      if (project.worldview.background) {
        content += `背景：${project.worldview.background}\n\n`;
      }
      if (project.worldview.setting) {
        content += `设定：${project.worldview.setting}\n\n`;
      }
    }
  }

  // 主要角色（如果有）
  if (project.characters && project.characters.length > 0) {
    if (isMarkdown) {
      content += `## 主要角色\n\n`;
      project.characters.forEach(char => {
        content += `### ${char.name}`;
        if (char.role) content += ` (${char.role})`;
        content += `\n\n`;
        if (char.description) {
          content += `${char.description}\n\n`;
        }
      });
      content += `---\n\n`;
    } else {
      content += `主要角色\n`;
      content += `${'-'.repeat(60)}\n`;
      project.characters.forEach(char => {
        content += `${char.name}`;
        if (char.role) content += ` (${char.role})`;
        content += `\n`;
        if (char.description) {
          content += `${char.description}\n`;
        }
        content += `\n`;
      });
    }
  }

  // 分集剧本
  const episodes = project.episodes || [];
  const maxEpisode = upToEpisode || Math.max(...episodes.map(ep => ep.number), 0);
  
  // 筛选要导出的剧集
  let episodesToExport = episodes
    .filter(ep => ep.number <= maxEpisode)
    .sort((a, b) => a.number - b.number);

  if (!includeIncomplete) {
    episodesToExport = episodesToExport.filter(ep => 
      ep.status === 'completed' || ep.status === 'reviewed'
    );
  }

  if (episodesToExport.length === 0) {
    result.message = '没有符合条件的剧集可以导出';
    return result;
  }

  if (isMarkdown) {
    content += `## 分集剧本\n\n`;
  } else {
    content += `分集剧本\n`;
    content += `${'='.repeat(60)}\n\n`;
  }

  // 生成各集剧本
  episodesToExport.forEach(episode => {
    content += generateEpisodeScript(episode, format, includeMetadata);
  });

  // 文档尾部
  const exportDate = new Date().toLocaleString('zh-CN');
  if (isMarkdown) {
    content += `\n---\n\n*导出时间：${exportDate}*\n`;
    content += `*导出范围：第1-${maxEpisode}集，共${episodesToExport.length}集*\n`;
  } else {
    content += `\n${'='.repeat(60)}\n`;
    content += `导出时间：${exportDate}\n`;
    content += `导出范围：第1-${maxEpisode}集，共${episodesToExport.length}集\n`;
    content += `${'='.repeat(60)}\n`;
  }

  result.success = true;
  result.content = content;
  result.message = '导出成功';

  return result;
}

module.exports = {
  checkScriptCompleteness,
  generateEpisodeScript,
  exportScript
};
