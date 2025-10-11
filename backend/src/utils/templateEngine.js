/**
 * 高级模板引擎
 * 支持变量替换、条件判断、循环、辅助函数
 */
class TemplateEngine {
  constructor() {
    // 辅助函数映射
    this.helpers = {
      uppercase: (text) => String(text).toUpperCase(),
      lowercase: (text) => String(text).toLowerCase(),
      length: (arr) => Array.isArray(arr) ? arr.length : 0,
      format: (date, formatStr = 'YYYY-MM-DD') => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        // 简单的日期格式化
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return formatStr
          .replace('YYYY', year)
          .replace('MM', month)
          .replace('DD', day)
          .replace('HH', hours)
          .replace('mm', minutes)
          .replace('ss', seconds);
      },
      capitalize: (text) => {
        const str = String(text);
        return str.charAt(0).toUpperCase() + str.slice(1);
      },
      trim: (text) => String(text).trim(),
      default: (value, defaultValue) => value || defaultValue,
      json: (obj) => JSON.stringify(obj, null, 2),
      join: (arr, separator = ', ') => Array.isArray(arr) ? arr.join(separator) : String(arr)
    };
  }

  /**
   * 渲染模板
   * @param {string} template - 模板字符串
   * @param {object} variables - 变量对象
   * @returns {string} 渲染后的字符串
   */
  render(template, variables = {}) {
    if (!template) return '';
    
    try {
      let result = template;
      
      // 1. 处理条件判断 {{#if condition}}...{{else}}...{{/if}}
      result = this._processConditionals(result, variables);
      
      // 2. 处理循环 {{#each array}}...{{/each}}
      result = this._processLoops(result, variables);
      
      // 3. 处理辅助函数 {{helper arg1 arg2}}
      result = this._processHelpers(result, variables);
      
      // 4. 处理简单变量替换 {{variable}}
      result = this._processVariables(result, variables);
      
      return result;
    } catch (error) {
      throw new Error(`模板渲染失败: ${error.message}`);
    }
  }

  /**
   * 从模板中提取变量
   * @param {string} template - 模板字符串
   * @returns {Array} 变量列表
   */
  extractVariables(template) {
    if (!template) return [];
    
    const variables = new Set();
    
    // 匹配所有 {{...}} 模式
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      const content = match[1].trim();
      
      // 跳过控制结构和辅助函数
      if (content.startsWith('#') || content.startsWith('/') || 
          content === 'this' || content === 'else') {
        continue;
      }
      
      // 跳过已知的辅助函数
      const firstWord = content.split(' ')[0];
      if (this.helpers[firstWord]) {
        // 提取辅助函数的参数变量
        const args = content.split(' ').slice(1);
        args.forEach(arg => {
          if (!arg.match(/^['"].*['"]$/)) { // 不是字符串字面量
            variables.add(arg);
          }
        });
        continue;
      }
      
      // 提取变量名
      variables.add(content);
    }
    
    return Array.from(variables).map(name => ({
      name,
      type: 'text',
      required: true,
      default: ''
    }));
  }

  /**
   * 处理条件判断
   * @private
   */
  _processConditionals(template, variables) {
    // 使用非贪婪匹配,并且递归处理嵌套条件
    const regex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/;
    
    let result = template;
    let prevResult = '';
    
    // 持续处理直到没有更多条件
    while (result !== prevResult && regex.test(result)) {
      prevResult = result;
      result = result.replace(regex, (match, condition, trueBlock, falseBlock = '') => {
        try {
          const conditionValue = this._evaluateCondition(condition, variables);
          return conditionValue ? trueBlock : falseBlock;
        } catch (error) {
          return `[条件判断错误: ${error.message}]`;
        }
      });
    }
    
    return result;
  }

  /**
   * 评估条件表达式
   * @private
   */
  _evaluateCondition(condition, variables) {
    const trimmed = condition.trim();
    
    // 处理 NOT 操作符
    if (trimmed.startsWith('!')) {
      return !this._evaluateCondition(trimmed.substring(1), variables);
    }
    
    // 处理比较操作符
    if (trimmed.includes('===')) {
      const [left, right] = trimmed.split('===').map(s => s.trim());
      return this._getValue(left, variables) === this._getValue(right, variables);
    }
    if (trimmed.includes('!==')) {
      const [left, right] = trimmed.split('!==').map(s => s.trim());
      return this._getValue(left, variables) !== this._getValue(right, variables);
    }
    if (trimmed.includes('==')) {
      const [left, right] = trimmed.split('==').map(s => s.trim());
      return this._getValue(left, variables) == this._getValue(right, variables);
    }
    if (trimmed.includes('!=')) {
      const [left, right] = trimmed.split('!=').map(s => s.trim());
      return this._getValue(left, variables) != this._getValue(right, variables);
    }
    if (trimmed.includes('>=')) {
      const [left, right] = trimmed.split('>=').map(s => s.trim());
      return this._getValue(left, variables) >= this._getValue(right, variables);
    }
    if (trimmed.includes('<=')) {
      const [left, right] = trimmed.split('<=').map(s => s.trim());
      return this._getValue(left, variables) <= this._getValue(right, variables);
    }
    if (trimmed.includes('>')) {
      const [left, right] = trimmed.split('>').map(s => s.trim());
      return this._getValue(left, variables) > this._getValue(right, variables);
    }
    if (trimmed.includes('<')) {
      const [left, right] = trimmed.split('<').map(s => s.trim());
      return this._getValue(left, variables) < this._getValue(right, variables);
    }
    
    // 简单的真值判断
    const value = this._getValue(trimmed, variables);
    return !!value;
  }

  /**
   * 处理循环
   * @private
   */
  _processLoops(template, variables) {
    const regex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(regex, (match, arrayName, loopBody) => {
      try {
        const array = this._getValue(arrayName.trim(), variables);
        
        if (!Array.isArray(array)) {
          return `[循环错误: ${arrayName} 不是数组]`;
        }
        
        return array.map((item, index) => {
          // 为每个循环项创建新的变量上下文
          const loopVariables = {
            ...variables,
            this: item,
            '@index': index,
            '@first': index === 0,
            '@last': index === array.length - 1
          };
          
          // 递归处理循环体
          let result = loopBody;
          result = this._processConditionals(result, loopVariables);
          result = this._processHelpers(result, loopVariables);
          result = this._processVariables(result, loopVariables);
          
          return result;
        }).join('');
      } catch (error) {
        return `[循环错误: ${error.message}]`;
      }
    });
  }

  /**
   * 处理辅助函数
   * @private
   */
  _processHelpers(template, variables) {
    const regex = /\{\{(\w+)\s+([^}]+)\}\}/g;
    
    return template.replace(regex, (match, helperName, args) => {
      if (!this.helpers[helperName]) {
        return match; // 不是辅助函数，保持原样
      }
      
      try {
        // 解析参数
        const parsedArgs = this._parseArgs(args, variables);
        const result = this.helpers[helperName](...parsedArgs);
        return result !== undefined ? result : '';
      } catch (error) {
        return `[辅助函数错误: ${error.message}]`;
      }
    });
  }

  /**
   * 处理简单变量替换
   * @private
   */
  _processVariables(template, variables) {
    const regex = /\{\{([^#/][^}]*)\}\}/g;
    
    return template.replace(regex, (match, varName) => {
      const trimmed = varName.trim();
      
      // 跳过已处理的控制结构
      if (trimmed === 'else' || trimmed.startsWith('#') || trimmed.startsWith('/')) {
        return match;
      }
      
      try {
        const value = this._getValue(trimmed, variables);
        return value !== undefined && value !== null ? String(value) : '';
      } catch (error) {
        return `[变量错误: ${error.message}]`;
      }
    });
  }

  /**
   * 获取变量值，支持点号访问
   * @private
   */
  _getValue(path, variables) {
    // 处理字符串字面量
    if (path.match(/^['"].*['"]$/)) {
      return path.slice(1, -1);
    }
    
    // 处理数字字面量
    if (!isNaN(path)) {
      return Number(path);
    }
    
    // 处理布尔字面量
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    
    // 处理对象路径访问 (e.g., user.name)
    const parts = path.split('.');
    let value = variables;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  /**
   * 解析辅助函数参数
   * @private
   */
  _parseArgs(argsString, variables) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];
      
      if ((char === '"' || char === "'") && (i === 0 || argsString[i-1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          // 字符串字面量直接使用
          args.push(current);
          current = '';
          continue;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          // 非字符串字面量,尝试获取变量值
          args.push(this._getValue(current, variables));
          current = '';
        }
        continue;
      }
      
      if (!(char === '"' || char === "'") || inQuotes) {
        current += char;
      }
    }
    
    if (current) {
      // 处理最后一个参数
      if (inQuotes) {
        args.push(current); // 字符串
      } else {
        args.push(this._getValue(current, variables)); // 变量
      }
    }
    
    return args;
  }

  /**
   * 注册自定义辅助函数
   * @param {string} name - 函数名
   * @param {Function} fn - 函数实现
   */
  registerHelper(name, fn) {
    this.helpers[name] = fn;
  }
}

// 导出单例
module.exports = new TemplateEngine();
