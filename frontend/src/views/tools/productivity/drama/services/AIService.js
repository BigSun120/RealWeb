/**
 * AIService - AI交互服务层
 * 
 * 职责：
 * 1. 封装所有AI API调用
 * 2. 统一解析AI返回内容
 * 3. 统一错误处理
 * 4. 支持不同的AI提供商
 * 
 * 优点：
 * - 解耦：UI层不需要知道AI调用细节
 * - 可测试：可Mock AI响应
 * - 可扩展：易于切换AI提供商
 * - 统一：所有AI交互都在此处
 */

import { generateAIContent } from '@/api/ai';
import { ACT_MODIFICATION_SCHEMA, DIAGNOSIS_ISSUES_SCHEMA } from '../schemas/aiResponseSchemas';

export class AIService {
  /**
   * 运行AI诊断
   * @param {Object} project - 项目对象
   * @param {string} stage - 诊断阶段 (preparation/episodes/overall)
   * @param {string} prompt - 诊断提示词
   * @returns {Promise<Array>} 问题列表
   */
  static async runDiagnosis(project, stage, prompt) {
    console.log(`🤖 AIService.runDiagnosis: ${stage}`);
    
    try {
      const response = await generateAIContent(
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.7,
          maxTokens: 3000,
          jsonSchema: DIAGNOSIS_ISSUES_SCHEMA // 使用结构化输出
        }
      );

      if (response.code !== 200 || !response.data?.content) {
        throw new Error(response.message || 'AI诊断失败');
      }

      const issues = this.parseDiagnosisResult(response.data.content);
      console.log(`✅ AI诊断完成，发现 ${issues.length} 个问题`);
      
      return issues;
    } catch (error) {
      console.error('❌ AI诊断失败:', error);
      throw error;
    }
  }

  /**
   * 生成解决方案
   * @param {Object} issue - 问题对象
   * @param {Object} project - 项目对象
   * @param {string} prompt - 解决方案提示词
   * @returns {Promise<Object>} 解决方案对象 { suggestedContent, explanation }
   */
  static async generateSolution(issue, project, prompt) {
    console.log(`🤖 AIService.generateSolution: ${issue.title}`);
    
    try {
      // 根据问题类型选择适当的Schema
      const schema = this.getSchemaForIssueType(issue.type);
      
      const response = await generateAIContent(
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.8,
          maxTokens: 2000,
          jsonSchema: schema // 使用结构化输出
        }
      );

      if (response.code !== 200 || !response.data?.content) {
        throw new Error(response.message || '生成方案失败');
      }

      const solution = this.parseSolutionResult(response.data.content);
      console.log(`✅ 解决方案生成完成`);
      
      return solution;
    } catch (error) {
      console.error('❌ 生成方案失败:', error);
      throw error;
    }
  }

  /**
   * 解析AI诊断结果
   * @param {string|Object} content - AI返回的内容（字符串或对象）
   * @returns {Array} 问题列表
   */
  static parseDiagnosisResult(content) {
    console.log('📖 解析AI诊断结果...');
    
    try {
      // 方法0：如果已经是对象（结构化输出），直接使用
      if (typeof content === 'object' && content !== null) {
        if (content.issues && Array.isArray(content.issues)) {
          console.log('✅ 结构化输出，直接使用');
          return content.issues;
        }
      }
      
      // 方法1：直接JSON解析（兼容字符串格式）
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (parsed.issues && Array.isArray(parsed.issues)) {
            console.log('✅ 直接解析成功');
            return parsed.issues;
          }
        } catch (e) {
          // 继续尝试其他方法
        }
      }

      // 方法2：从代码块提取（仅字符串）
      if (typeof content === 'string') {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
        try {
          const jsonContent = codeBlockMatch[1].trim();
          const parsed = JSON.parse(jsonContent);
          if (parsed.issues && Array.isArray(parsed.issues)) {
            console.log('✅ 从代码块解析成功');
            return parsed.issues;
          }
          } catch (e) {
            console.warn('代码块解析失败:', e);
          }
        }

        // 方法3：正则提取
        const jsonMatch = content.match(/\{[\s\S]*"issues"[\s\S]*\}/);
        if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.issues && Array.isArray(parsed.issues)) {
            console.log('✅ 正则提取解析成功');
            return parsed.issues;
          }
          } catch (e) {
            console.warn('正则提取解析失败:', e);
          }
        }
      }

      console.warn('⚠️ 所有解析方法均失败，返回空数组');
      return [];
    } catch (error) {
      console.error('❌ 解析诊断结果失败:', error);
      return [];
    }
  }

  /**
   * 解析AI解决方案
   * @param {string|Object} content - AI返回的内容（字符串或对象）
   * @returns {Object} 解决方案 { suggestedContent, explanation }
   */
  static parseSolutionResult(content) {
    console.log('📖 解析AI解决方案...');
    
    try {
      // 方法0：如果已经是对象（结构化输出），直接使用
      if (typeof content === 'object' && content !== null) {
        if (content.suggestedContent !== undefined) {
          console.log('✅ 结构化输出，直接使用');
          return {
            suggestedContent: content.suggestedContent,
            explanation: content.explanation || ''
          };
        }
      }
      
      // 方法1：直接JSON解析（兼容字符串格式）
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (parsed.suggestedContent !== undefined) {
            console.log('✅ 直接解析成功');
            return {
              suggestedContent: parsed.suggestedContent,
              explanation: parsed.explanation || ''
            };
          }
        } catch (e) {
          // 继续尝试其他方法
        }
      }

      // 方法2：从代码块提取（仅字符串）
      if (typeof content === 'string') {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          try {
            const jsonContent = codeBlockMatch[1].trim();
            const parsed = JSON.parse(jsonContent);
            if (parsed.suggestedContent !== undefined) {
              console.log('✅ 从代码块解析成功');
              return {
                suggestedContent: parsed.suggestedContent,
                explanation: parsed.explanation || ''
              };
            }
          } catch (e) {
            console.warn('代码块解析失败:', e);
          }
        }

        // 方法3：正则提取
        const jsonMatch = content.match(/\{[\s\S]*"suggestedContent"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ 正则提取解析成功');
            return {
              suggestedContent: parsed.suggestedContent,
              explanation: parsed.explanation || ''
            };
          } catch (e) {
            console.warn('正则提取解析失败:', e);
          }
        }
      }

      // 方法4：无法解析为JSON，直接返回内容
      console.warn('⚠️ 无法解析为JSON，返回原始内容');
      return {
        suggestedContent: content,
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
   * 根据模块类型智能解析AI数据
   * @param {string} module - 模块名称 (characters/outline/episodes/worldview)
   * @param {string} content - AI返回的内容
   * @returns {Object|Array|string} 解析后的数据或原始字符串
   */
  static parseModuleData(module, content) {
    console.log(`📖 解析${module}模块数据...`);
    
    switch (module) {
      case 'characters':
        return this.parseCharacterData(content);
      case 'outline':
        return this.parseOutlineData(content);
      case 'episodes':
        return this.parseEpisodeData(content);
      case 'worldview':
      case 'project':
        return this.parseSimpleData(content);
      default:
        console.warn(`⚠️ 未知模块类型: ${module}`);
        return content;
    }
  }

  /**
   * 智能解析角色数据（用于批量更新）
   * @param {string|Object|Array} content - AI返回的角色内容
   * @returns {Array|string} 角色数组或原始字符串
   */
  static parseCharacterData(content) {
    console.log('📖 解析角色数据...');
    
    try {
      // 如果已经是对象/数组，直接返回
      if (typeof content === 'object' && content !== null) {
        if (Array.isArray(content)) {
          console.log(`✅ 结构化输出：角色数组 ${content.length}个`);
          return content;
        } else if (content.name) {
          console.log('✅ 结构化输出：单个角色');
          return [content];
        }
      }
      
      // 尝试JSON解析（字符串）
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          console.log(`✅ 解析为角色数组: ${parsed.length}个`);
          return parsed;
          } else if (parsed.name) {
            console.log('✅ 解析为单个角色');
            return [parsed];
          }
        } catch (e) {
          // 继续
        }

        // 从代码块提取
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          try {
            const parsed = JSON.parse(codeBlockMatch[1].trim());
            if (Array.isArray(parsed)) {
              console.log(`✅ 从代码块解析角色数组: ${parsed.length}个`);
              return parsed;
            } else if (parsed.name) {
              console.log('✅ 从代码块解析单个角色');
              return [parsed];
            }
          } catch (e) {
            // 继续
          }
        }

        // 从Markdown提取（### 角色名）
        const characterPattern = /###\s*(?:\d+\.\s*)?([^\n（(]+)[（(]?([^）)]*)[）)]?\s*\n([\s\S]*?)(?=###|$)/g;
        const characters = [];
        let match;
        
        while ((match = characterPattern.exec(content)) !== null) {
          const name = match[1].trim();
          const role = match[2].trim();
          const detailsText = match[3];
          
          const char = { name };
          if (role) char.role = role;
          
          // 提取字段
          const fieldPatterns = {
            age: /[•\-\*]?\s*\*?\*?(年龄|基本信息)[\*：:]+\s*([\s\S]*?)(?=\n|$)/i,
            gender: /[•\-\*]?\s*\*?\*?性别[\*：:]+\s*([\s\S]*?)(?=\n|$)/i,
            description: /[•\-\*]?\s*\*?\*?(身份|角色描述|简介)[\*：:]+\s*([\s\S]*?)(?=\n[•\-\*]|$)/i,
            personality: /[•\-\*]?\s*\*?\*?(性格|性格特点)[\*：:]+\s*([\s\S]*?)(?=\n[•\-\*]|$)/i,
            background: /[•\-\*]?\s*\*?\*?(背景|角色背景)[\*：:]+\s*([\s\S]*?)(?=\n[•\-\*]|$)/i,
            motivation: /[•\-\*]?\s*\*?\*?(动机|行为动机)[\*：:]+\s*([\s\S]*?)(?=\n[•\-\*]|$)/i,
            relationships: /[•\-\*]?\s*\*?\*?(关系|人际关系|与主线关联)[\*：:]+\s*([\s\S]*?)(?=\n[•\-\*]|$)/i
          };
          
          for (const [field, pattern] of Object.entries(fieldPatterns)) {
            const fieldMatch = detailsText.match(pattern);
            if (fieldMatch) {
              let value = fieldMatch[fieldMatch.length - 1].trim();
              value = value.replace(/\*\*/g, '').replace(/\n\s+/g, ' ').trim();
              if (value) {
                if (field === 'age') {
                  const ageMatch = value.match(/(\d+)/);
                  if (ageMatch) char.age = parseInt(ageMatch[1]);
                } else {
                  char[field] = value;
                }
              }
            }
          }
          
          if (Object.keys(char).length > 1) {
            characters.push(char);
          }
        }
        
        if (characters.length > 0) {
          console.log(`✅ 从Markdown提取${characters.length}个角色`);
          return characters;
        }
      }

      // 无法解析，返回原始内容
      console.warn('⚠️ 无法解析为结构化数据');
      return content;
    } catch (error) {
      console.error('❌ 解析角色数据失败:', error);
      return content;
    }
  }

  /**
   * 解析大纲数据
   * @param {string|Object} content - AI返回的大纲内容
   * @returns {Object|string} 大纲对象或原始字符串
   */
  static parseOutlineData(content) {
    console.log('📖 解析大纲数据...');
    
    try {
      // 如果已经是对象，直接返回
      if (typeof content === 'object' && content !== null) {
        if (content.actNumber !== undefined || content.title) {
          console.log('✅ 结构化输出：幕对象');
          return content;
        }
      }
      
      // 尝试JSON解析（字符串）
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (parsed.actNumber !== undefined || parsed.title) {
            console.log('✅ 解析为幕对象');
            return parsed;
          }
        } catch (e) {
          // 继续
        }

        // 从代码块提取
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          try {
            const parsed = JSON.parse(codeBlockMatch[1].trim());
            if (parsed.actNumber !== undefined || parsed.title) {
              console.log('✅ 从代码块解析幕对象');
              return parsed;
            }
          } catch (e) {
            // 继续
          }
        }
      }

      // 无法解析，返回原始内容
      console.warn('⚠️ 无法解析为结构化数据');
      return content;
    } catch (error) {
      console.error('❌ 解析大纲数据失败:', error);
      return content;
    }
  }

  /**
   * 解析分集数据
   * @param {string} content - AI返回的分集内容
   * @returns {Object|string} 分集对象或原始字符串
   */
  static parseEpisodeData(content) {
    console.log('📖 解析分集数据...');
    
    try {
      // 尝试JSON解析
      try {
        const parsed = JSON.parse(content);
        if (parsed.number !== undefined || parsed.title) {
          console.log('✅ 解析为分集对象');
          return parsed;
        }
      } catch (e) {
        // 继续
      }

      // 从代码块提取
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          const parsed = JSON.parse(codeBlockMatch[1].trim());
          if (parsed.number !== undefined || parsed.title) {
            console.log('✅ 从代码块解析分集对象');
            return parsed;
          }
        } catch (e) {
          // 继续
        }
      }

      // 无法解析，返回原始内容
      console.warn('⚠️ 无法解析为结构化数据');
      return content;
    } catch (error) {
      console.error('❌ 解析分集数据失败:', error);
      return content;
    }
  }

  /**
   * 解析简单字段数据（世界观、项目等）
   * @param {string} content - AI返回的内容
   * @returns {Object|string} 解析后的对象或原始字符串
   */
  static parseSimpleData(content) {
    console.log('📖 解析简单字段数据...');
    
    try {
      // 尝试JSON解析
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          console.log('✅ 解析为对象');
          return parsed;
        }
      } catch (e) {
        // 继续
      }

      // 从代码块提取
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          const parsed = JSON.parse(codeBlockMatch[1].trim());
          if (typeof parsed === 'object' && parsed !== null) {
            console.log('✅ 从代码块解析对象');
            return parsed;
          }
        } catch (e) {
          // 继续
        }
      }

      // 如果是纯文本，直接返回
      console.log('✅ 返回原始文本');
      return content;
    } catch (error) {
      console.error('❌ 解析简单字段数据失败:', error);
      return content;
    }
  }

  /**
   * 根据问题类型选择适当的Schema
   * @param {string} issueType - 问题类型
   * @returns {Object} JSON Schema
   */
  static getSchemaForIssueType(issueType) {
    // 如果是大纲相关的问题，使用ACT_MODIFICATION_SCHEMA
    if (issueType && issueType.toLowerCase().includes('outline')) {
      return ACT_MODIFICATION_SCHEMA;
    }
    
    // 默认返回ACT_MODIFICATION_SCHEMA，因为大多数问题都是大纲修改
    return ACT_MODIFICATION_SCHEMA;
  }
}

export default AIService;
