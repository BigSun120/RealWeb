/**
 * UpdateStrategyFactory - 更新策略工厂
 * 
 * 职责：
 * 1. 为不同模块提供专门的更新策略
 * 2. 处理批量更新、单字段更新等不同场景
 * 3. 自动解析AI返回的内容格式
 * 
 * 优点：
 * - 策略模式：每个模块的逻辑独立
 * - 易扩展：新增模块只需实现新策略
 * - 易测试：每个策略可独立测试
 */

import { AIService } from './AIService';
import { FieldMapper } from '../mappers/FieldMapper';
import { 
  patchDramaWorldview, 
  patchDramaCharacters, 
  patchDramaOutline, 
  patchDramaEpisodes 
} from '@/api/drama';

/**
 * 角色更新策略
 */
class CharacterUpdateStrategy {
  async apply(project, field, content, characterId) {
    const projectId = project._id || project.id;
    const characters = [...project.characters];

    // 尝试解析为结构化数据
    const parsed = AIService.parseCharacterData(content);

    if (Array.isArray(parsed) && parsed.length > 0) {
      // 批量更新/新增角色
      return this._batchUpdate(projectId, characters, parsed);
    } else if (characterId) {
      // 单字段更新
      return this._updateSingleField(projectId, characters, characterId, field, content);
    } else {
      throw new Error('无法确定要更新的角色');
    }
  }

  async _batchUpdate(projectId, characters, newCharacters) {
    let updatedCount = 0;
    let createdCount = 0;

    for (const newCharData of newCharacters) {
      if (!newCharData.name) continue;

      const existingIndex = characters.findIndex(c => c.name === newCharData.name);

      if (existingIndex >= 0) {
        // 更新现有角色（保留未提及的字段）
        characters[existingIndex] = {
          ...characters[existingIndex],
          ...newCharData
        };
        console.log(`  ✅ 更新角色: ${newCharData.name}`);
        updatedCount++;
      } else {
        // 新增角色
        characters.push({
          id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...newCharData
        });
        console.log(`  ➕ 新增角色: ${newCharData.name}`);
        createdCount++;
      }
    }

    await patchDramaCharacters(projectId, characters);
    console.log(`✅ 角色批量处理完成: 更新${updatedCount}个, 新增${createdCount}个`);

    const msg = [];
    if (updatedCount > 0) msg.push(`更新${updatedCount}个角色`);
    if (createdCount > 0) msg.push(`新增${createdCount}个角色`);
    return msg.join('，') || '完成';
  }

  async _updateSingleField(projectId, characters, characterId, field, content) {
    let characterIndex = characters.findIndex(c => c.id === characterId);
    if (characterIndex < 0) {
      characterIndex = characters.findIndex(c => c.name === characterId);
    }

    if (characterIndex < 0) {
      throw new Error(`未找到角色: ${characterId}`);
    }

    const englishField = FieldMapper.getEnglishField('characters', field);
    characters[characterIndex][englishField] = content;

    await patchDramaCharacters(projectId, characters);
    console.log(`✅ 角色"${characters[characterIndex].name}"的"${field}"已更新`);
    
    return '角色字段更新成功';
  }
}

/**
 * 世界观更新策略
 */
class WorldviewUpdateStrategy {
  async apply(project, field, content) {
    const projectId = project._id || project.id;
    const worldview = { ...project.worldview };

    const englishField = FieldMapper.getEnglishField('worldview', field);
    worldview[englishField] = content;

    await patchDramaWorldview(projectId, worldview);
    console.log(`✅ 世界观"${field}"已更新`);
    
    return '世界观更新成功';
  }
}

/**
 * 大纲更新策略
 */
class OutlineUpdateStrategy {
  async apply(project, field, content) {
    const projectId = project._id || project.id;
    const outline = JSON.parse(JSON.stringify(project.outline || { acts: [] }));

    // 检查是否是worldview映射字段
    const config = FieldMapper.getLogicalFieldConfig('outline', field);
    if (config && config.type === 'worldview-mapping') {
      const worldview = { ...project.worldview };
      worldview[config.targetField] = content;
      await patchDramaWorldview(projectId, worldview);
      console.log(`✅ 大纲字段"${field}"（映射到世界观）已更新`);
      return '大纲更新成功（映射到世界观）';
    }

    // 处理具体幕的更新
    const actMatch = field.match(/第(一|二|三|四|五|六|七|八|九|十)?幕/);
    if (actMatch) {
      const actIndex = this._parseActNumber(actMatch[1]);
      
      if (outline.acts && outline.acts[actIndex]) {
        // ✅ 智能判断content类型并合并
        const updatedAct = this._mergeActContent(outline.acts[actIndex], content);
        outline.acts[actIndex] = updatedAct;
        
        await patchDramaOutline(projectId, outline);
        console.log(`✅ ${field}已更新`);
        return '大纲更新成功';
      }
    }

    throw new Error(`无法更新大纲字段: ${field}`);
  }

  /**
   * 智能合并幕内容
   * @param {Object} originalAct - 原始幕对象
   * @param {string|Object} content - AI返回的内容（可能是字符串或完整幕对象）
   * @returns {Object} 合并后的幕对象
   */
  _mergeActContent(originalAct, content) {
    console.log('🔄 开始智能合并幕内容...');
    console.log('原始幕:', JSON.stringify(originalAct).substring(0, 200));
    console.log('AI内容类型:', typeof content);
    
    // 1. 尝试解析content为对象
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
        console.log('✅ 成功将字符串解析为对象');
      } catch (e) {
        // 无法解析为JSON，当作纯文本处理
        console.log('ℹ️ 内容为纯文本，仅更新description');
        return {
          ...originalAct,
          description: content
        };
      }
    }
    
    // 2. 检查是否为完整的幕对象（包含actNumber、title、description等）
    const isCompleteActObject = parsedContent && typeof parsedContent === 'object' && 
                                (parsedContent.actNumber !== undefined || 
                                 parsedContent.title || 
                                 parsedContent.description || 
                                 parsedContent.plotPoints);
    
    if (isCompleteActObject) {
      console.log('✅ 检测到完整幕对象，执行智能合并...');
      
      // 3. 智能合并：保留系统字段，更新内容字段
      const mergedAct = {
        // 保留原始系统字段（MongoDB ID等）
        _id: originalAct._id,
        id: originalAct.id || originalAct._id,
        
        // 更新或保留actNumber
        actNumber: parsedContent.actNumber !== undefined ? parsedContent.actNumber : originalAct.actNumber,
        
        // 更新或保留title
        title: parsedContent.title || originalAct.title,
        
        // 更新description
        description: parsedContent.description || originalAct.description,
        
        // 智能合并plotPoints
        plotPoints: this._mergePlotPoints(
          originalAct.plotPoints || [], 
          parsedContent.plotPoints || []
        )
      };
      
      console.log('✅ 合并完成，plotPoints数量:', mergedAct.plotPoints.length);
      return mergedAct;
    } else {
      // 4. 如果不是完整对象，仅更新description
      console.log('ℹ️ 非完整幕对象，仅更新description字段');
      return {
        ...originalAct,
        description: typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent)
      };
    }
  }

  /**
   * 智能合并情节点数组
   * @param {Array} originalPoints - 原始情节点数组
   * @param {Array} newPoints - 新的情节点数组
   * @returns {Array} 合并后的情节点数组
   */
  _mergePlotPoints(originalPoints, newPoints) {
    if (!newPoints || newPoints.length === 0) {
      // 如果AI没有返回plotPoints，保留原有的
      console.log('ℹ️ AI未返回plotPoints，保留原有', originalPoints.length, '个情节点');
      return originalPoints;
    }
    
    console.log(`🔄 合并plotPoints: 原有${originalPoints.length}个，AI返回${newPoints.length}个`);
    
    // 创建原始情节点的ID映射
    const originalPointsMap = new Map();
    originalPoints.forEach(point => {
      if (point.id) originalPointsMap.set(point.id, point);
      if (point._id) originalPointsMap.set(point._id, point);
    });
    
    // 合并情节点
    const mergedPoints = newPoints.map((newPoint, index) => {
      // 尝试通过id或_id匹配原始情节点
      let originalPoint = null;
      if (newPoint.id) originalPoint = originalPointsMap.get(newPoint.id);
      if (!originalPoint && newPoint._id) originalPoint = originalPointsMap.get(newPoint._id);
      
      if (originalPoint) {
        // 找到匹配的原始情节点，合并内容但保留系统字段
        console.log(`  ✅ 情节点匹配成功: ${newPoint.name || newPoint.id}`);
        return {
          _id: originalPoint._id,
          id: originalPoint.id || originalPoint._id,
          name: newPoint.name || originalPoint.name,
          description: newPoint.description || originalPoint.description,
          characters: newPoint.characters || originalPoint.characters || [],
          emotion: newPoint.emotion || originalPoint.emotion || [],
          episodeRange: newPoint.episodeRange || originalPoint.episodeRange || '',
          startEpisode: newPoint.startEpisode || originalPoint.startEpisode,
          endEpisode: newPoint.endEpisode || originalPoint.endEpisode
        };
      } else {
        // 新增的情节点，生成新ID
        console.log(`  ➕ 新增情节点: ${newPoint.name || '未命名'}`);
        return {
          id: newPoint.id || `plot_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          _id: newPoint._id,
          name: newPoint.name || '未命名情节点',
          description: newPoint.description || '',
          characters: newPoint.characters || [],
          emotion: Array.isArray(newPoint.emotion) ? newPoint.emotion : [],
          episodeRange: newPoint.episodeRange || '',
          startEpisode: newPoint.startEpisode,
          endEpisode: newPoint.endEpisode
        };
      }
    });
    
    console.log(`✅ plotPoints合并完成，最终${mergedPoints.length}个情节点`);
    return mergedPoints;
  }

  _parseActNumber(chineseNumber) {
    const map = {
      '一': 0, '二': 1, '三': 2, '四': 3, '五': 4,
      '六': 5, '七': 6, '八': 7, '九': 8, '十': 9
    };
    return chineseNumber ? (map[chineseNumber] || 0) : 0;
  }
}

/**
 * 分集更新策略
 */
class EpisodeUpdateStrategy {
  async apply(project, field, content, characterId, episodeNumber) {
    const projectId = project._id || project.id;
    const episodes = [...project.episodes];

    const episodeIndex = episodes.findIndex(e => e.number === episodeNumber);
    if (episodeIndex >= 0) {
      const englishField = FieldMapper.getEnglishField('episodes', field);
      episodes[episodeIndex][englishField] = content;
      
      await patchDramaEpisodes(projectId, episodes);
      console.log(`✅ 第${episodeNumber}集的"${field}"已更新`);
      return '分集更新成功';
    }

    throw new Error(`未找到第${episodeNumber}集`);
  }
}

/**
 * 项目级别更新策略（如剧本类型）
 */
class ProjectUpdateStrategy {
  async apply(project, field, content) {
    // 项目级别字段通常不允许通过AI直接修改
    // 这里可以添加特殊处理或抛出错误
    console.warn(`⚠️ 项目级别字段"${field}"不支持AI直接修改`);
    throw new Error('项目级别字段不支持直接修改');
  }
}

/**
 * 更新策略工厂
 */
export class UpdateStrategyFactory {
  static strategies = {
    project: new ProjectUpdateStrategy(),
    worldview: new WorldviewUpdateStrategy(),
    characters: new CharacterUpdateStrategy(),
    outline: new OutlineUpdateStrategy(),
    episodes: new EpisodeUpdateStrategy()
  };

  /**
   * 创建策略实例
   * @param {string} module - 模块名
   * @returns {Object} 策略实例
   */
  static create(module) {
    const strategy = this.strategies[module];
    if (!strategy) {
      throw new Error(`不支持的模块: ${module}`);
    }
    return strategy;
  }

  /**
   * 应用更新
   * @param {Object} project - 项目对象
   * @param {string} module - 模块名
   * @param {string} field - 字段名
   * @param {string} content - 内容
   * @param {string} characterId - 角色ID（可选）
   * @param {number} episodeNumber - 集数（可选）
   * @returns {Promise<string>} 成功消息
   */
  static async apply(project, module, field, content, characterId = null, episodeNumber = null) {
    const strategy = this.create(module);
    return await strategy.apply(project, field, content, characterId, episodeNumber);
  }
}

export default UpdateStrategyFactory;
