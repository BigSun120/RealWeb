/**
 * 整体检查提示词生成工具
 * 用于生成外部AI诊断使用的提示词和完整包
 */

import { getDefaultOverallCheckTemplate } from './overallCheckTemplates';

/**
 * 获取整体检查自定义模板
 */
export function getOverallCheckCustomTemplate() {
  try {
    const saved = localStorage.getItem('drama_prompt_template_overallCheck');
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
    text += `## 故事背景\n\n${worldview.background}\n\n`;
  }

  if (worldview.setting) {
    text += `## 世界设定\n\n${worldview.setting}\n\n`;
  }

  if (worldview.theme) {
    text += `## 核心主题\n\n${worldview.theme}\n\n`;
  }

  if (worldview.conflict) {
    text += `## 主要冲突\n\n${worldview.conflict}\n\n`;
  }

  if (worldview.tone) {
    text += `## 情感基调\n\n${worldview.tone}\n\n`;
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
    text += `## ${index + 1}. ${char.name}`;
    if (char.role) {
      text += `（${char.role}）`;
    }
    text += '\n\n';

    if (char.age) {
      text += `- **年龄**：${char.age}岁\n`;
    }

    if (char.gender) {
      text += `- **性别**：${char.gender}\n`;
    }

    if (char.description) {
      text += `- **描述**：${char.description}\n`;
    }

    if (char.personality) {
      text += `- **性格**：${char.personality}\n`;
    }

    if (char.background) {
      text += `- **背景**：${char.background}\n`;
    }

    if (char.motivation) {
      text += `- **动机**：${char.motivation}\n`;
    }

    if (char.relationships) {
      text += `- **关系**：${char.relationships}\n`;
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
    text += `## ${act.title || `第${act.actNumber}幕`}\n\n`;

    if (act.description) {
      text += `${act.description}\n\n`;
    }

    if (act.plotPoints && act.plotPoints.length > 0) {
      text += '**关键情节点**：\n\n';
      act.plotPoints.forEach((point, idx) => {
        text += `${idx + 1}. **${point.name || '情节点' + (idx + 1)}**`;
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

        if (point.emotion && point.emotion.length > 0) {
          const emotions = Array.isArray(point.emotion) ? point.emotion.join('、') : point.emotion;
          text += `   情感：${emotions}\n`;
        }

        text += '\n';
      });
    }

    text += '\n';
  });

  return text;
}

/**
 * 格式化单集完整内容（包含所有字段）
 */
function formatEpisodeComplete(episode) {
  const statusText = {
    'draft': '草稿',
    'in-progress': '进行中',
    'completed': '已完成',
    'reviewed': '已审核'
  }[episode.status] || episode.status;

  let text = `## 第${episode.number}集`;
  const title = episode.title || '';
  if (title && !title.startsWith('第' + episode.number + '集')) {
    text += `：${title}`;
  }
  text += `\n\n`;

  text += `**状态**：${statusText}\n`;
  if (episode.wordCount) {
    text += `**字数**：${episode.wordCount}字\n`;
  }
  text += `\n`;

  // 概要
  if (episode.content?.summary) {
    text += `### 概要\n\n${episode.content.summary}\n\n`;
  }

  // 场景（完整）
  if (episode.content?.scenes && episode.content.scenes.length > 0) {
    text += `### 场景列表\n\n`;
    episode.content.scenes.forEach((scene, index) => {
      text += `#### 场景${scene.number || index + 1}`;
      if (scene.location) {
        text += `：${scene.location}`;
      }
      text += `\n\n`;

      if (scene.time) {
        text += `- **时间**：${scene.time}\n`;
      }

      if (scene.atmosphere) {
        text += `- **氛围**：${scene.atmosphere}\n`;
      }

      text += `\n`;

      if (scene.content) {
        text += `**内容**：\n\n${scene.content}\n\n`;
      }
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
    text += `\n`;
  }

  // 结尾悬念
  if (episode.content?.cliffhanger) {
    text += `### 结尾悬念\n\n${episode.content.cliffhanger}\n\n`;
  }

  // 备注
  if (episode.content?.notes) {
    text += `### 备注\n\n${episode.content.notes}\n\n`;
  }

  return text;
}

/**
 * 生成整体检查提示词
 * @param {Object} project - 项目对象
 * @param {Object} range - 检查范围 { start, end, episodes }
 * @returns {String} 提示词内容
 */
export function generateOverallCheckPrompt(project, range) {
  // 检查是否有自定义模板
  const customTemplate = getOverallCheckCustomTemplate();
  const template = customTemplate || getDefaultOverallCheckTemplate();

  // 准备变量
  const variables = {
    projectName: project.name || '未命名',
    projectType: project.type || '未指定',
    totalEpisodes: project.episodeCount || 60,
    startEpisode: range.start,
    endEpisode: range.end,
    completedCount: range.episodes.length,
    completionRate: Math.round((range.episodes.length / (project.episodeCount || 60)) * 100),
    coreConflict: project.worldview?.conflict || '未设定',
    mainCharacters: project.characters && project.characters.length > 0
      ? project.characters.slice(0, 2).map(c => c.name).join('、')
      : '未设定'
  };

  // 替换变量
  return simpleReplaceVariables(template, variables);
}

/**
 * 生成整体检查的完整包（Markdown格式）
 * @param {Object} project - 项目对象
 * @param {Object} range - 检查范围 { start, end, episodes }
 * @returns {String} Markdown内容
 */
export function generateOverallCreationPackage(project, range) {
  const { start, end, episodes } = range;

  let content = `# 项目信息\n\n`;
  content += `- **项目名称**：${project.name || '未命名'}\n`;
  content += `- **剧本类型**：${project.type || '未指定'}\n`;
  content += `- **总集数**：${project.episodeCount || 60}集\n`;
  content += `- **检查范围**：第${start}-${end}集（已完成${episodes.length}集）\n`;
  content += `- **生成时间**：${new Date().toLocaleString('zh-CN')}\n\n`;
  content += `---\n\n`;

  // 世界观
  content += `# 世界观设定\n\n`;
  content += formatWorldview(project.worldview);
  content += `---\n\n`;

  // 角色
  content += `# 主要角色\n\n`;
  content += formatCharacters(project.characters);
  content += `---\n\n`;

  // 大纲
  content += `# 剧情大纲\n\n`;
  content += formatOutline(project.outline);
  content += `---\n\n`;

  // 已完成剧集
  content += `# 已完成剧集内容（第${start}-${end}集）\n\n`;
  episodes.forEach(ep => {
    content += formatEpisodeComplete(ep);
    content += `---\n\n`;
  });

  content += `# 结尾提示\n\n`;
  content += `以上是本项目第${start}-${end}集的完整内容，请基于这些材料进行整体诊断。\n`;

  return content;
}

/**
 * 下载完整包文本文件
 * @param {String} content - 文件内容
 * @param {String} filename - 文件名
 */
export function downloadOverallPackage(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
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
  generateOverallCheckPrompt,
  generateOverallCreationPackage,
  downloadOverallPackage,
  getOverallCheckCustomTemplate
};
