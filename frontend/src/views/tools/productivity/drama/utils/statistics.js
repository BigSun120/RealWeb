/**
 * 短剧项目统计工具函数
 */

/**
 * 计算项目总体统计数据
 * @param {Object} project - 项目数据
 * @returns {Object} 统计数据
 */
export function calculateProjectStats(project) {
  const {
    worldview = {},
    characters = [],
    outline = {},
    episodes = [],
    episodeCount = 60
  } = project;

  // 计算完成进度
  const completedEpisodes = episodes.filter(
    e => e.status === 'completed' || e.status === 'reviewed'
  ).length;
  const progress = episodeCount > 0 
    ? Math.round((completedEpisodes / episodeCount) * 100) 
    : 0;

  // 计算总字数
  const totalWordCount = episodes.reduce((sum, ep) => sum + (ep.wordCount || 0), 0);

  // 计算平均字数
  const avgWordCount = episodes.length > 0 
    ? Math.round(totalWordCount / episodes.length) 
    : 0;

  // 计算节点数
  const plotPointsCount = outline.acts 
    ? outline.acts.reduce((sum, act) => sum + (act.plotPoints?.length || 0), 0)
    : 0;

  return {
    progress,
    completedEpisodes,
    totalEpisodes: episodeCount,
    charactersCount: characters.length,
    plotPointsCount,
    totalWordCount,
    avgWordCount,
    worldviewComplete: isWorldviewComplete(worldview)
  };
}

/**
 * 判断世界观是否完整
 */
function isWorldviewComplete(worldview) {
  if (!worldview) return false;
  const fields = ['background', 'setting', 'theme', 'conflict', 'tone'];
  return fields.every(field => worldview[field] && worldview[field].trim());
}

/**
 * 计算角色统计数据
 * @param {Array} characters - 角色列表
 * @returns {Object} 角色统计
 */
export function calculateCharacterStats(characters) {
  if (!characters || characters.length === 0) {
    return {
      total: 0,
      byRole: {},
      byGender: {},
      avgDescriptionLength: 0
    };
  }

  // 按角色类型统计
  const byRole = characters.reduce((acc, char) => {
    const role = char.role || '未分类';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  // 按性别统计
  const byGender = characters.reduce((acc, char) => {
    const gender = char.gender || '未知';
    acc[gender] = (acc[gender] || 0) + 1;
    return acc;
  }, {});

  // 计算描述平均长度
  const totalDescLength = characters.reduce(
    (sum, char) => sum + (char.description?.length || 0), 
    0
  );
  const avgDescriptionLength = Math.round(totalDescLength / characters.length);

  return {
    total: characters.length,
    byRole,
    byGender,
    avgDescriptionLength
  };
}

/**
 * 计算大纲统计数据
 * @param {Object} outline - 大纲数据
 * @param {Array} characters - 角色列表
 * @returns {Object} 大纲统计
 */
export function calculateOutlineStats(outline, characters = []) {
  if (!outline || !outline.acts) {
    return {
      totalActs: 0,
      totalPlotPoints: 0,
      plotPointsByAct: [],
      estimatedEpisodes: 0,
      characterInvolvement: {},
      emotionDistribution: {}
    };
  }

  const { acts } = outline;

  // 按幕统计节点数
  const plotPointsByAct = acts.map(act => ({
    actNumber: act.actNumber,
    actTitle: act.title,
    count: act.plotPoints?.length || 0
  }));

  // 总节点数
  const totalPlotPoints = acts.reduce(
    (sum, act) => sum + (act.plotPoints?.length || 0), 
    0
  );

  // 预估集数
  let maxEpisode = 0;
  acts.forEach(act => {
    act.plotPoints?.forEach(point => {
      if (point.episodeRange) {
        const match = point.episodeRange.match(/(\d+)/g);
        if (match) {
          const nums = match.map(Number);
          maxEpisode = Math.max(maxEpisode, ...nums);
        }
      }
    });
  });

  // 角色参与度统计
  const characterInvolvement = {};
  acts.forEach(act => {
    act.plotPoints?.forEach(point => {
      point.characters?.forEach(charName => {
        characterInvolvement[charName] = (characterInvolvement[charName] || 0) + 1;
      });
    });
  });

  // 情感分布统计
  const emotionDistribution = {};
  acts.forEach(act => {
    act.plotPoints?.forEach(point => {
      if (point.emotion) {
        emotionDistribution[point.emotion] = (emotionDistribution[point.emotion] || 0) + 1;
      }
    });
  });

  return {
    totalActs: acts.length,
    totalPlotPoints,
    plotPointsByAct,
    estimatedEpisodes: maxEpisode || '未设置',
    characterInvolvement,
    emotionDistribution
  };
}

/**
 * 计算分集统计数据
 * @param {Array} episodes - 分集列表
 * @returns {Object} 分集统计
 */
export function calculateEpisodeStats(episodes) {
  if (!episodes || episodes.length === 0) {
    return {
      total: 0,
      byStatus: {},
      totalWordCount: 0,
      avgWordCount: 0,
      longestEpisode: null,
      shortestEpisode: null,
      completionRate: 0,
      recentUpdates: []
    };
  }

  // 按状态统计
  const byStatus = episodes.reduce((acc, ep) => {
    const status = ep.status || 'draft';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // 字数统计
  const totalWordCount = episodes.reduce((sum, ep) => sum + (ep.wordCount || 0), 0);
  const avgWordCount = Math.round(totalWordCount / episodes.length);

  // 找出最长和最短的分集
  const episodesWithWords = episodes.filter(ep => ep.wordCount > 0);
  let longestEpisode = null;
  let shortestEpisode = null;

  if (episodesWithWords.length > 0) {
    longestEpisode = episodesWithWords.reduce((max, ep) => 
      ep.wordCount > (max?.wordCount || 0) ? ep : max
    );
    shortestEpisode = episodesWithWords.reduce((min, ep) => 
      ep.wordCount < (min?.wordCount || Infinity) ? ep : min
    );
  }

  // 完成率
  const completedCount = episodes.filter(
    ep => ep.status === 'completed' || ep.status === 'reviewed'
  ).length;
  const completionRate = Math.round((completedCount / episodes.length) * 100);

  // 最近更新（前5个）
  const recentUpdates = [...episodes]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
    .map(ep => ({
      number: ep.number,
      title: ep.title,
      updatedAt: ep.updatedAt
    }));

  return {
    total: episodes.length,
    byStatus,
    totalWordCount,
    avgWordCount,
    longestEpisode: longestEpisode ? {
      number: longestEpisode.number,
      title: longestEpisode.title,
      wordCount: longestEpisode.wordCount
    } : null,
    shortestEpisode: shortestEpisode ? {
      number: shortestEpisode.number,
      title: shortestEpisode.title,
      wordCount: shortestEpisode.wordCount
    } : null,
    completionRate,
    recentUpdates
  };
}

/**
 * 生成时间线数据（用于展示创作进度）
 * @param {Array} episodes - 分集列表
 * @returns {Array} 时间线数据
 */
export function generateTimeline(episodes) {
  if (!episodes || episodes.length === 0) return [];

  // 按日期分组统计
  const dailyStats = {};
  
  episodes.forEach(ep => {
    if (ep.updatedAt) {
      const date = new Date(ep.updatedAt).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          count: 0,
          wordCount: 0,
          episodes: []
        };
      }
      dailyStats[date].count++;
      dailyStats[date].wordCount += (ep.wordCount || 0);
      dailyStats[date].episodes.push(ep.number);
    }
  });

  // 转换为数组并排序
  return Object.values(dailyStats)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * 生成 ECharts 配置 - 项目进度环形图
 * @param {Object} stats - 统计数据
 * @returns {Object} ECharts 配置
 */
export function generateProgressChartOption(stats) {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '项目进度',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: [
          { 
            value: stats.completedEpisodes, 
            name: '已完成',
            itemStyle: { color: '#67C23A' }
          },
          { 
            value: stats.totalEpisodes - stats.completedEpisodes, 
            name: '未完成',
            itemStyle: { color: '#E6A23C' }
          }
        ]
      }
    ]
  };
}

/**
 * 生成 ECharts 配置 - 角色类型柱状图
 * @param {Object} characterStats - 角色统计数据
 * @returns {Object} ECharts 配置
 */
export function generateCharacterRoleChartOption(characterStats) {
  const roles = Object.keys(characterStats.byRole);
  const counts = Object.values(characterStats.byRole);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: roles,
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: '角色数量',
        type: 'bar',
        barWidth: '60%',
        data: counts,
        itemStyle: {
          color: '#409EFF',
          borderRadius: [5, 5, 0, 0]
        }
      }
    ]
  };
}

/**
 * 生成 ECharts 配置 - 分集状态饼图
 * @param {Object} episodeStats - 分集统计数据
 * @returns {Object} ECharts 配置
 */
export function generateEpisodeStatusChartOption(episodeStats) {
  const statusMap = {
    'draft': { name: '草稿', color: '#909399' },
    'in-progress': { name: '进行中', color: '#E6A23C' },
    'completed': { name: '已完成', color: '#67C23A' },
    'reviewed': { name: '已审核', color: '#409EFF' }
  };

  const data = Object.entries(episodeStats.byStatus).map(([status, count]) => ({
    value: count,
    name: statusMap[status]?.name || status,
    itemStyle: { color: statusMap[status]?.color || '#909399' }
  }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 集 ({d}%)'
    },
    legend: {
      bottom: '5%',
      left: 'center'
    },
    series: [
      {
        name: '分集状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{c}集'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data
      }
    ]
  };
}

/**
 * 生成 ECharts 配置 - 字数趋势折线图
 * @param {Array} episodes - 分集列表
 * @returns {Object} ECharts 配置
 */
export function generateWordCountTrendChartOption(episodes) {
  const sortedEpisodes = [...episodes].sort((a, b) => a.number - b.number);
  const numbers = sortedEpisodes.map(ep => `第${ep.number}集`);
  const wordCounts = sortedEpisodes.map(ep => ep.wordCount || 0);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a}: {c} 字'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: numbers,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '字数'
    },
    series: [
      {
        name: '字数',
        type: 'line',
        data: wordCounts,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: 'rgba(64, 158, 255, 0.2)'
        }
      }
    ]
  };
}

/**
 * 生成 ECharts 配置 - 大纲节点分布柱状图
 * @param {Object} outlineStats - 大纲统计数据
 * @returns {Object} ECharts 配置
 */
export function generatePlotPointsDistributionChartOption(outlineStats) {
  const actNames = outlineStats.plotPointsByAct.map(act => act.actTitle);
  const counts = outlineStats.plotPointsByAct.map(act => act.count);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: actNames
    },
    yAxis: {
      type: 'value',
      name: '节点数',
      minInterval: 1
    },
    series: [
      {
        name: '节点数',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: '#0284C7',
          borderRadius: [5, 5, 0, 0]
        }
      }
    ]
  };
}

/**
 * 生成 ECharts 配置 - 角色参与度雷达图
 * @param {Object} outlineStats - 大纲统计数据
 * @returns {Object} ECharts 配置
 */
export function generateCharacterInvolvementChartOption(outlineStats) {
  const { characterInvolvement } = outlineStats;
  
  if (!characterInvolvement || Object.keys(characterInvolvement).length === 0) {
    return null;
  }

  // 取前8个角色
  const topCharacters = Object.entries(characterInvolvement)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const indicator = topCharacters.map(([name]) => ({ name, max: 20 }));
  const values = topCharacters.map(([, count]) => count);

  return {
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator,
      shape: 'circle',
      splitNumber: 5,
      name: {
        textStyle: {
          color: '#409EFF'
        }
      },
      splitLine: {
        lineStyle: {
          color: ['#E4E7ED', '#E4E7ED', '#E4E7ED', '#E4E7ED', '#E4E7ED'].reverse()
        }
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: '#E4E7ED'
        }
      }
    },
    series: [
      {
        name: '角色参与度',
        type: 'radar',
        data: [
          {
            value: values,
            name: '出现次数',
            areaStyle: {
              color: 'rgba(64, 158, 255, 0.3)'
            },
            itemStyle: {
              color: '#409EFF'
            }
          }
        ]
      }
    ]
  };
}
