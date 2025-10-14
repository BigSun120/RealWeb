/**
 * 剧本分析引擎
 * 提供数据统计、问题检测、优化建议等功能
 */

/**
 * 分析项目的基础统计数据
 */
export function analyzeBasicStats(project) {
  const stats = {
    // 字数统计
    totalWords: 0,
    worldviewWords: 0,
    charactersWords: 0,
    outlineWords: 0,
    episodesWords: 0,
    
    // 数量统计
    characterCount: 0,
    outlinePointCount: 0,
    episodeCount: 0,
    completedEpisodes: 0,
    
    // 角色统计
    mainCharacters: 0,
    supportingCharacters: 0,
    
    // 平均值
    avgEpisodeWords: 0,
    avgOutlinePointWords: 0
  };
  
  try {
    // 世界观字数
    if (project.worldview) {
      stats.worldviewWords = countWords(project.worldview, 'worldview');
    }
    
    // 角色统计
    if (project.characters && Array.isArray(project.characters)) {
      stats.characterCount = project.characters.length;
      stats.charactersWords = project.characters.reduce((sum, char) => {
        return sum + countWords(char, 'character');
      }, 0);
      
      // 主角和配角统计
      stats.mainCharacters = project.characters.filter(c => 
        c.role === '男主角' || c.role === '女主角'
      ).length;
      stats.supportingCharacters = stats.characterCount - stats.mainCharacters;
    }
    
    // 大纲统计
    if (project.outline && project.outline.acts) {
      // 统计节点数量
      project.outline.acts.forEach(act => {
        if (act.plotPoints && Array.isArray(act.plotPoints)) {
          stats.outlinePointCount += act.plotPoints.length;
        }
      });
      
      // 对整个 outline 对象统计一次字数（包含幕次标题、描述和所有节点）
      stats.outlineWords = countWords(project.outline, 'outline');
      
      if (stats.outlinePointCount > 0) {
        stats.avgOutlinePointWords = Math.round(stats.outlineWords / stats.outlinePointCount);
      }
    }
    
    // 分集统计
    if (project.episodes && Array.isArray(project.episodes)) {
      stats.episodeCount = project.episodes.length;
      stats.episodesWords = project.episodes.reduce((sum, ep) => {
        if (ep.status === 'completed' || ep.status === 'reviewed') {
          stats.completedEpisodes++;
        }
        return sum + countWords(ep, 'episode');
      }, 0);
      
      if (stats.episodeCount > 0) {
        stats.avgEpisodeWords = Math.round(stats.episodesWords / stats.episodeCount);
      }
    }
    
    // 总字数
    stats.totalWords = stats.worldviewWords + stats.charactersWords + 
                       stats.outlineWords + stats.episodesWords;
  } catch (error) {
    // 静默失败，返回默认值
  }
  
  return stats;
}

/**
 * 分析结构完整性
 */
export function analyzeCompleteness(project) {
  const completeness = {
    overall: 0,
    worldview: { score: 0, items: [] },
    characters: { score: 0, items: [] },
    outline: { score: 0, items: [] },
    episodes: { score: 0, items: [] }
  };
  
  try {
    // 世界观完整性
    const worldviewFields = ['background', 'setting', 'theme', 'conflict', 'tone'];
    let worldviewFilled = 0;
    worldviewFields.forEach(field => {
      const value = project.worldview?.[field];
      if (value && value.trim()) {
        worldviewFilled++;
        completeness.worldview.items.push({ field, status: 'completed' });
      } else {
        completeness.worldview.items.push({ field, status: 'missing' });
      }
    });
    completeness.worldview.score = Math.round((worldviewFilled / worldviewFields.length) * 100);
    
    // 角色完整性
    const characterCount = project.characters?.length || 0;
    const hasMainCharacter = project.characters?.some(c => 
      c.role === '男主角' || c.role === '女主角'
    );
    
    if (characterCount === 0) {
      completeness.characters.score = 0;
      completeness.characters.items.push({ field: '角色数量', status: 'missing' });
    } else if (!hasMainCharacter) {
      completeness.characters.score = 30;
      completeness.characters.items.push({ field: '主角设定', status: 'missing' });
    } else {
      const filledCharacters = project.characters.filter(c => 
        c.name && c.personality && c.background
      ).length;
      completeness.characters.score = Math.round((filledCharacters / characterCount) * 100);
      completeness.characters.items.push({ 
        field: '角色完整度', 
        status: 'completed',
        value: `${filledCharacters}/${characterCount}` 
      });
    }
    
    // 大纲完整性
    if (!project.outline || !project.outline.acts) {
      completeness.outline.score = 0;
    } else {
      const acts = project.outline.acts;
      const totalPoints = acts.reduce((sum, act) => 
        sum + (act.plotPoints?.length || 0), 0
      );
      
      if (totalPoints === 0) {
        completeness.outline.score = 0;
        completeness.outline.items.push({ field: '剧情节点', status: 'missing' });
      } else {
        // 每一幕至少3个节点算完整
        const completeActs = acts.filter(act => (act.plotPoints?.length || 0) >= 3).length;
        completeness.outline.score = Math.round((completeActs / acts.length) * 100);
        acts.forEach((act, i) => {
          const pointCount = act.plotPoints?.length || 0;
          completeness.outline.items.push({
            field: `第${i + 1}幕`,
            status: pointCount >= 3 ? 'completed' : 'partial',
            value: `${pointCount}个节点`
          });
        });
      }
    }
    
    // 分集完整性
    const targetEpisodes = project.episodeCount || 60;
    const currentEpisodes = project.episodes?.length || 0;
    const completedEpisodes = project.episodes?.filter(ep => 
      ep.status === 'completed' || ep.status === 'reviewed'
    ).length || 0;
    
    completeness.episodes.score = Math.round((currentEpisodes / targetEpisodes) * 100);
    completeness.episodes.items.push({
      field: '分集进度',
      status: currentEpisodes === targetEpisodes ? 'completed' : 'partial',
      value: `${currentEpisodes}/${targetEpisodes}`
    });
    completeness.episodes.items.push({
      field: '已完成',
      status: completedEpisodes > 0 ? 'completed' : 'missing',
      value: `${completedEpisodes}集`
    });
    
    // 总体完整性（加权平均）
    completeness.overall = Math.round(
      (completeness.worldview.score * 0.2 +
       completeness.characters.score * 0.2 +
       completeness.outline.score * 0.3 +
       completeness.episodes.score * 0.3)
    );
  } catch (error) {
    // 静默失败，返回默认值
  }
  
  return completeness;
}

/**
 * 检测常见问题
 */
export function detectIssues(project) {
  const issues = {
    critical: [], // 严重问题
    warning: [],  // 警告
    info: []      // 提示
  };
  
  try {
    // 1. 检查角色名重复或相似
    if (project.characters && project.characters.length > 1) {
      const names = project.characters.map(c => c.name).filter(Boolean);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        issues.critical.push({
          type: 'duplicate_character',
          title: '角色名重复',
          description: `发现重复的角色名：${[...new Set(duplicates)].join('、')}`,
          module: 'characters'
        });
      }
      
      // 检查角色名相似（简单判断：2字相同）
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          if (names[i] && names[j] && isSimilarName(names[i], names[j])) {
            issues.warning.push({
              type: 'similar_character',
              title: '角色名相似',
              description: `角色名"${names[i]}"和"${names[j]}"较为相似，可能造成混淆`,
              module: 'characters'
            });
          }
        }
      }
    }
    
    // 2. 检查主角设定
    const mainCharacters = project.characters?.filter(c => 
      c.role === '男主角' || c.role === '女主角'
    ) || [];
    
    if (mainCharacters.length === 0) {
      issues.critical.push({
        type: 'no_main_character',
        title: '缺少主角',
        description: '剧本中没有设定男主角或女主角',
        module: 'characters'
      });
    }
    
    // 3. 检查角色性格描述
    project.characters?.forEach(char => {
      if (char.personality && char.personality.length > 0 && char.personality.length < 30) {
        issues.warning.push({
          type: 'short_personality',
          title: '角色性格描述过短',
          description: `角色"${char.name}"的性格描述过于简短（${char.personality.length}字），建议补充到30字以上`,
          module: 'characters',
          target: char.id
        });
      }
    });
    
    // 4. 检查大纲节点数量
    if (project.outline?.acts) {
      project.outline.acts.forEach((act, index) => {
        const pointCount = act.plotPoints?.length || 0;
        if (pointCount === 0) {
          issues.warning.push({
            type: 'empty_act',
            title: '大纲幕次缺少节点',
            description: `第${index + 1}幕没有任何剧情节点`,
            module: 'outline'
          });
        } else if (pointCount < 3) {
          issues.info.push({
            type: 'few_plot_points',
            title: '剧情节点较少',
            description: `第${index + 1}幕只有${pointCount}个节点，建议增加到3-5个`,
            module: 'outline'
          });
        }
      });
    }
    
    // 5. 检查分集字数（只检查已开始编写的分集）
    project.episodes?.forEach((episode, index) => {
      const words = countWords(episode, 'episode');
      // 只检查真正有内容的分集（排除空分集或仅有结构字段的分集）
      const hasRealContent = episode.content || episode.scenes?.length > 0 || 
                             (episode.dialogue && episode.dialogue.trim().length > 0);
      
      if (hasRealContent && words > 0) {
        if (words < 400) {
          issues.warning.push({
            type: 'short_episode',
            title: '分集内容过短',
            description: `第${episode.number || index + 1}集内容过短（${words}字），短剧建议400-800字`,
            module: 'episodes',
            target: episode.id
          });
        } else if (words > 1000) {
          issues.info.push({
            type: 'long_episode',
            title: '分集内容较长',
            description: `第${episode.number || index + 1}集内容较长（${words}字），短剧建议控制在1000字以内`,
            module: 'episodes',
            target: episode.id
          });
        }
      }
    });
    
    // 6. 检查角色在大纲中的出现
    if (project.characters && project.outline?.acts) {
      const characterNames = project.characters.map(c => c.name).filter(Boolean);
      const outlineCharacters = new Set();
      
      project.outline.acts.forEach(act => {
        act.plotPoints?.forEach(point => {
          point.characters?.forEach(char => outlineCharacters.add(char));
        });
      });
      
      characterNames.forEach(name => {
        if (!outlineCharacters.has(name)) {
          issues.info.push({
            type: 'unused_character',
            title: '角色未在大纲中出现',
            description: `角色"${name}"在大纲中没有出现，考虑是否需要调整`,
            module: 'characters'
          });
        }
      });
    }
    
    // 7. 检查世界观字段
    const worldviewFields = {
      background: '故事背景',
      setting: '世界设定',
      theme: '核心主题',
      conflict: '主要冲突',
      tone: '情感基调'
    };
    
    Object.entries(worldviewFields).forEach(([key, label]) => {
      const value = project.worldview?.[key];
      
      // 情感基调特殊处理：只在为空时提醒，不限制字数
      if (key === 'tone') {
        if (!value || !value.trim()) {
          issues.warning.push({
            type: 'missing_worldview_field',
            title: '世界观字段缺失',
            description: `"${label}"尚未填写`,
            module: 'worldview'
          });
        }
        // 情感基调不检查字数长度
        return;
      }
      
      // 其他字段：检查是否为空和字数
      if (!value || !value.trim()) {
        issues.warning.push({
          type: 'missing_worldview_field',
          title: '世界观字段缺失',
          description: `"${label}"尚未填写`,
          module: 'worldview'
        });
      } else if (value.length < 30) {
        // 其他字段建议30字以上
        issues.info.push({
          type: 'short_worldview_field',
          title: '世界观描述过短',
          description: `"${label}"描述过于简短（${value.length}字），建议补充到30字以上`,
          module: 'worldview'
        });
      }
    });
    
  } catch (error) {
    // 静默失败，返回空问题列表
  }
  
  return issues;
}

/**
 * 生成优化建议
 */
export function generateSuggestions(project, stats, completeness, issues) {
  const suggestions = [];
  
  try {
    // 基于完整性的建议
    if (completeness.worldview.score < 60) {
      suggestions.push({
        priority: 'high',
        title: '完善世界观设定',
        description: '世界观完整度较低，建议补充故事背景、世界设定等内容',
        action: 'goto',
        module: 'worldview'
      });
    }
    
    if (completeness.characters.score < 50) {
      suggestions.push({
        priority: 'high',
        title: '丰富角色设定',
        description: '角色设定不够完整，建议补充角色性格、背景、动机等',
        action: 'goto',
        module: 'characters'
      });
    }
    
    if (completeness.outline.score < 40) {
      suggestions.push({
        priority: 'high',
        title: '补充剧情大纲',
        description: '大纲完整度较低，建议为每一幕添加3-5个关键剧情节点',
        action: 'goto',
        module: 'outline'
      });
    }
    
    // 基于统计数据的建议
    if (stats.characterCount === 0) {
      suggestions.push({
        priority: 'critical',
        title: '创建角色',
        description: '还没有创建任何角色，建议先创建男女主角',
        action: 'goto',
        module: 'characters'
      });
    } else if (stats.mainCharacters === 0) {
      suggestions.push({
        priority: 'critical',
        title: '设定主角',
        description: '请至少设定一个男主角或女主角',
        action: 'goto',
        module: 'characters'
      });
    }
    
    if (stats.outlinePointCount === 0) {
      suggestions.push({
        priority: 'high',
        title: '添加剧情节点',
        description: '大纲中还没有剧情节点，建议按三幕结构添加关键情节',
        action: 'goto',
        module: 'outline'
      });
    }
    
    // 基于剧本类型的建议
    const projectType = project.type;
    if (projectType === '霸道总裁') {
      if (!hasKeyword(project, ['契约', '联姻', '豪门'])) {
        suggestions.push({
          priority: 'medium',
          title: '突出类型特征',
          description: '霸道总裁类剧本建议突出"契约"、"豪门"等元素',
          action: 'info',
          module: 'worldview'
        });
      }
    }
    
    // 节奏建议
    if (stats.episodeCount > 0 && stats.avgEpisodeWords > 0) {
      if (stats.avgEpisodeWords < 400) {
        suggestions.push({
          priority: 'medium',
          title: '增加分集内容',
          description: `平均每集${stats.avgEpisodeWords}字，短剧建议400-800字以保证剧情密度`,
          action: 'info',
          module: 'episodes'
        });
      } else if (stats.avgEpisodeWords > 1000) {
        suggestions.push({
          priority: 'low',
          title: '控制分集长度',
          description: `平均每集${stats.avgEpisodeWords}字，短剧建议控制在800字左右，避免过长`,
          action: 'info',
          module: 'episodes'
        });
      }
    }
    
    // 基于问题的建议
    if (issues.critical.length > 0) {
      suggestions.push({
        priority: 'critical',
        title: '修复严重问题',
        description: `发现${issues.critical.length}个严重问题，建议优先处理`,
        action: 'scroll',
        target: 'issues'
      });
    }
    
  } catch (error) {
    // 静默失败，返回空建议列表
  }
  
  return suggestions;
}

/**
 * 工具函数：统计字数（仅统计实际内容字段）
 * @param {*} obj - 要统计的对象
 * @param {string} type - 对象类型：'worldview'/'character'/'outline'/'episode'
 * @returns {number} 字数
 */
function countWords(obj, type = null) {
  if (!obj) return 0;
  
  let text = '';
  
  // 如果是字符串，直接计算
  if (typeof obj === 'string') {
    text = obj;
  } 
  // 如果是对象，根据类型提取内容字段
  else if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      // 如果是数组，递归统计每个元素
      return obj.reduce((sum, item) => sum + countWords(item, type), 0);
    }
    
    // 根据不同类型提取内容字段
    if (type === 'episode' || obj.number !== undefined) {
      // 分集：优先使用 wordCount 字段，如果没有则统计 content 字段
      if (obj.wordCount !== undefined && obj.wordCount !== null) {
        return obj.wordCount;
      }
      // 统计 content 相关字段
      const contentFields = [];
      if (obj.content) {
        if (typeof obj.content === 'string') {
          contentFields.push(obj.content);
        } else if (typeof obj.content === 'object') {
          // content.summary, content.script, content.dialogue 等
          Object.values(obj.content).forEach(val => {
            if (typeof val === 'string') contentFields.push(val);
          });
        }
      }
      if (obj.script) contentFields.push(obj.script);
      if (obj.dialogue) contentFields.push(obj.dialogue);
      if (obj.scenes && Array.isArray(obj.scenes)) {
        obj.scenes.forEach(scene => {
          if (scene.content) contentFields.push(scene.content);
          if (scene.dialogue) contentFields.push(scene.dialogue);
        });
      }
      text = contentFields.join('');
    }
    else if (type === 'character' || obj.role !== undefined) {
      // 角色：只统计文本描述字段
      const contentFields = [];
      if (obj.name) contentFields.push(obj.name);
      if (obj.personality) contentFields.push(obj.personality);
      if (obj.background) contentFields.push(obj.background);
      if (obj.motivation) contentFields.push(obj.motivation);
      if (obj.arc) contentFields.push(obj.arc);
      if (obj.relationships) contentFields.push(obj.relationships);
      if (obj.appearance) contentFields.push(obj.appearance);
      text = contentFields.join('');
    }
    else if (type === 'outline' || obj.acts !== undefined) {
      // 大纲：统计幕次和节点内容
      const contentFields = [];
      if (obj.acts && Array.isArray(obj.acts)) {
        obj.acts.forEach(act => {
          if (act.title) contentFields.push(act.title);
          if (act.description) contentFields.push(act.description);
          if (act.plotPoints && Array.isArray(act.plotPoints)) {
            act.plotPoints.forEach(point => {
              if (typeof point === 'string') {
                contentFields.push(point);
              } else if (typeof point === 'object') {
                // 统计节点的 name、description、content 字段
                if (point.name) contentFields.push(point.name);
                if (point.description) contentFields.push(point.description);
                if (point.content) contentFields.push(point.content);
              }
            });
          }
        });
      }
      text = contentFields.join('');
    }
    else if (type === 'worldview' || obj.background !== undefined) {
      // 世界观：统计所有描述字段
      const contentFields = [];
      if (obj.background) contentFields.push(obj.background);
      if (obj.setting) contentFields.push(obj.setting);
      if (obj.theme) contentFields.push(obj.theme);
      if (obj.conflict) contentFields.push(obj.conflict);
      if (obj.tone) contentFields.push(obj.tone);
      text = contentFields.join('');
    }
    else {
      // 默认：JSON序列化（兼容旧逻辑）
      text = JSON.stringify(obj);
    }
  }
  
  // 移除HTML标签
  text = text.replace(/<[^>]+>/g, '');
  // 移除特殊字符和空白
  text = text.replace(/[\s\n\r\t]/g, '');
  
  return text.length;
}

/**
 * 工具函数：判断角色名是否相似
 */
function isSimilarName(name1, name2) {
  if (name1.length < 2 || name2.length < 2) return false;
  
  // 简单判断：有2个字相同就认为相似
  let matchCount = 0;
  for (let char of name1) {
    if (name2.includes(char)) matchCount++;
  }
  
  return matchCount >= 2;
}

/**
 * 工具函数：检查关键词
 */
function hasKeyword(project, keywords) {
  const allText = JSON.stringify(project).toLowerCase();
  return keywords.some(keyword => allText.includes(keyword));
}

export default {
  analyzeBasicStats,
  analyzeCompleteness,
  detectIssues,
  generateSuggestions
};
