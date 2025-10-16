/**
 * 分集检查提示词生成工具
 * 用于生成外部AI诊断使用的结构化提示词
 */

import { replaceTemplateVariables } from './promptTemplates';
import { 
  getDefaultEpisodeCheckTemplate, 
  getDefaultSolutionTemplate 
} from './episodeCheckTemplates';

/**
 * 获取分集检查自定义模板
 */
export function getEpisodeCheckCustomTemplate() {
  try {
    const saved = localStorage.getItem('drama_prompt_template_episodeCheck');
    return saved || null;
  } catch (error) {
    console.error('读取自定义模板失败:', error);
    return null;
  }
}

/**
 * 获取解决方案自定义模板
 */
export function getSolutionCustomTemplate() {
  try {
    const saved = localStorage.getItem('drama_prompt_template_solution');
    return saved || null;
  } catch (error) {
    console.error('读取自定义模板失败:', error);
    return null;
  }
}

/**
 * 简单的模板变量替换函数
 * 支持 {{variableName}} 格式
 */
function simpleReplaceVariables(template, variables) {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
}

/**
 * 格式化世界观内容
 */
function formatWorldview(worldview) {
  if (!worldview || Object.keys(worldview).length === 0) {
    return '暂无世界观设定';
  }

  let text = '';
  
  if (worldview.background) {
    text += `**故事背景**：${worldview.background}\n\n`;
  }
  
  if (worldview.setting) {
    text += `**世界设定**：${worldview.setting}\n\n`;
  }
  
  if (worldview.theme) {
    text += `**核心主题**：${worldview.theme}\n\n`;
  }
  
  if (worldview.conflict) {
    text += `**主要冲突**：${worldview.conflict}\n\n`;
  }
  
  if (worldview.tone) {
    text += `**情感基调**：${worldview.tone}\n\n`;
  }

  return text || '暂无世界观设定';
}

/**
 * 格式化角色列表
 */
function formatCharacters(characters) {
  if (!characters || characters.length === 0) {
    return '暂无角色设定';
  }

  let text = '';
  
  characters.forEach((char, index) => {
    text += `${index + 1}. **${char.name}**`;
    if (char.role) {
      text += `（${char.role}）`;
    }
    text += '\n';
    
    if (char.description) {
      text += `   - 描述：${char.description}\n`;
    }
    
    if (char.personality) {
      text += `   - 性格：${char.personality}\n`;
    }
    
    if (char.background) {
      text += `   - 背景：${char.background}\n`;
    }
    
    text += '\n';
  });

  return text;
}

/**
 * 格式化剧情大纲
 */
function formatOutline(outline) {
  if (!outline || !outline.acts || outline.acts.length === 0) {
    return '暂无剧情大纲';
  }

  let text = '';
  
  outline.acts.forEach(act => {
    text += `### ${act.title || `第${act.actNumber}幕`}\n\n`;
    
    if (act.description) {
      text += `${act.description}\n\n`;
    }
    
    if (act.plotPoints && act.plotPoints.length > 0) {
      text += '**关键情节点**：\n\n';
      act.plotPoints.forEach((point, idx) => {
        text += `${idx + 1}. ${point.name}`;
        if (point.episodeRange) {
          text += ` (第${point.episodeRange}集)`;
        }
        text += '\n';
        
        if (point.description) {
          text += `   ${point.description}\n`;
        }
        
        if (point.characters && point.characters.length > 0) {
          text += `   涉及角色：${point.characters.join('、')}\n`;
        }
        
        text += '\n';
      });
    }
  });

  return text;
}

/**
 * 格式化已完成剧集摘要（用于提供前置剧情上下文）
 */
function formatCompletedEpisodesSummary(episodes, currentEpisodeNumber) {
  const completed = episodes
    .filter(ep => 
      ep.number < currentEpisodeNumber &&
      (ep.status === 'completed' || ep.status === 'reviewed')
    )
    .sort((a, b) => a.number - b.number);

  if (completed.length === 0) {
    return '暂无已完成剧集';
  }

  let text = `已完成集数：第1-${completed[completed.length - 1].number}集\n\n`;
  
  completed.forEach(ep => {
    const title = ep.title || `第${ep.number}集`;
    text += `**第${ep.number}集`;
    if (!title.startsWith('第' + ep.number + '集')) {
      text += `：${title}`;
    }
    text += '**\n';
    
    // 添加简介
    if (ep.content?.summary) {
      text += `${ep.content.summary}\n`;
    } else if (ep.content?.script) {
      // 如果没有summary，使用script前100字
      const brief = ep.content.script.length > 100
        ? ep.content.script.substring(0, 100) + '...'
        : ep.content.script;
      text += `${brief}\n`;
    }
    
    text += '\n';
  });

  return text;
}

/**
 * 格式化目标剧集完整内容
 */
function formatEpisodeContent(episode) {
  let text = `## 第${episode.number}集`;
  const title = episode.title || '未命名';
  
  if (!title.startsWith('第' + episode.number + '集')) {
    text += `：${title}`;
  }
  text += '\n\n';
  
  // 状态
  const statusText = {
    'draft': '草稿',
    'in-progress': '进行中',
    'completed': '已完成',
    'reviewed': '已审核'
  }[episode.status] || episode.status;
  text += `**状态**：${statusText}\n\n`;
  
  // 字数
  if (episode.wordCount) {
    text += `**字数**：${episode.wordCount}字\n\n`;
  }
  
  // 概要
  if (episode.content?.summary) {
    text += `### 概要\n\n${episode.content.summary}\n\n`;
  }
  
  // 场景
  if (episode.content?.scenes && episode.content.scenes.length > 0) {
    text += `### 场景列表\n\n`;
    episode.content.scenes.forEach((scene, index) => {
      text += `**场景${scene.number || index + 1}**`;
      if (scene.location) {
        text += `：${scene.location}`;
      }
      text += '\n';
      
      if (scene.time) {
        text += `- 时间：${scene.time}\n`;
      }
      
      if (scene.atmosphere) {
        text += `- 氛围：${scene.atmosphere}\n`;
      }
      
      if (scene.content) {
        text += `\n${scene.content}\n`;
      }
      
      text += '\n';
    });
  } else if (episode.content?.script) {
    text += `### 剧本内容\n\n${episode.content.script}\n\n`;
  }
  
  // 关键对白
  if (episode.content?.keyDialogues && episode.content.keyDialogues.length > 0) {
    text += `### 关键对白\n\n`;
    episode.content.keyDialogues.forEach((dialogue, index) => {
      text += `${index + 1}. ${dialogue}\n`;
    });
    text += '\n';
  }
  
  // 结尾悬念
  if (episode.content?.cliffhanger) {
    text += `### 结尾悬念\n\n${episode.content.cliffhanger}\n\n`;
  }

  return text;
}

/**
 * 生成分集检查提示词
 * @param {Object} project - 项目对象
 * @param {Number} episodeNumber - 要检查的剧集编号
 * @returns {String} 格式化的提示词
 */
export function generateEpisodeCheckPrompt(project, episodeNumber) {
  const episode = project.episodes.find(ep => ep.number === episodeNumber);
  
  if (!episode) {
    throw new Error(`未找到第${episodeNumber}集`);
  }

  // 验证剧集状态
  if (episode.status !== 'completed' && episode.status !== 'reviewed') {
    throw new Error(`第${episodeNumber}集状态为\"${episode.status}\"，只能检查已完成或已审核的剧集`);
  }
  
  // 检查是否有自定义模板
  const customTemplate = getEpisodeCheckCustomTemplate();
  const template = customTemplate || getDefaultEpisodeCheckTemplate();
  
  // 准备模板变量
  const variables = {
    projectName: project.name || '未命名',
    projectType: project.type || '未指定',
    episodeCount: project.episodeCount || project.episodes.length,
    episodeNumber: episodeNumber,
    worldview: formatWorldview(project.worldview),
    characters: formatCharacters(project.characters),
    outline: formatOutline(project.outline),
    completedEpisodes: formatCompletedEpisodesSummary(project.episodes, episodeNumber),
    episodeContent: formatEpisodeContent(episode)
  };
  
  // 使用模板替换
  return simpleReplaceVariables(template, variables);
}

/**
 * 生成分集解决方案提示词（用于生成具体的修改建议）
 * @param {Object} issue - 问题对象
 * @param {Object} project - 项目对象
 * @returns {String} 格式化的提示词
 */
export function generateEpisodeSolutionPrompt(issue, project) {
  const episodeNumber = parseInt(issue.location.field.match(/\\d+/)[0]);
  const episode = project.episodes.find(ep => ep.number === episodeNumber);
  
  if (!episode) {
    throw new Error(`未找到第${episodeNumber}集`);
  }

  // 获取原始 episode.content JSON
  const originalContentJSON = JSON.stringify(episode.content || {}, null, 2);
  
  // 检查是否有自定义模板
  const customTemplate = getSolutionCustomTemplate();
  const template = customTemplate || getDefaultSolutionTemplate();
  
  // 准备模板变量
  const variables = {
    episodeNumber: episodeNumber,
    severity: issue.severity,
    issueTitle: issue.title,
    issueDescription: issue.description,
    originalContentJSON: originalContentJSON
  };
  
  // 使用模板替换
  return simpleReplaceVariables(template, variables);
}

/**
 * 下载完整包文本文件
 * @param {String} content - 文件内容
 * @param {String} filename - 文件名
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

export default {
  generateEpisodeCheckPrompt,
  generateEpisodeSolutionPrompt,
  downloadTextFile
};
