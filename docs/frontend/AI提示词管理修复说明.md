# AI提示词管理工具 - Bug修复说明

## 修复日期
2025-10-15

## 修复内容概览

本次修复解决了AI提示词管理工具中的三个关键问题：
1. 插入变量时编辑器意外滚动
2. textarea选择器不够精确
3. 变量替换时条件块处理问题（`{{/if}}` 残留）

---

## 问题1: 插入变量时编辑器滚动

### 症状
在提示词编辑对话框中，点击"插入变量"按钮后：
- ✅ 变量正确插入到光标位置
- ❌ 编辑器会意外滚动到不可预期的位置

### 原因分析
与剧本模板编辑器完全相同的问题：

**文件**: `PromptEditor.vue` 第385-400行

```javascript
function insertVariable() {
  const variable = '{{变量名}}';
  const textarea = document.querySelector('textarea');  // ⚠️ 问题1
  if (textarea) {
    // ... 插入变量逻辑
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + 3);
      // ⚠️ 问题2: 没有保存和恢复滚动位置
    }, 0);
  }
}
```

**问题分析**:
1. 调用 `focus()` 和 `setSelectionRange()` 后，浏览器自动滚动光标到可视区域
2. 没有保存原始的 `scrollTop` 和 `scrollLeft`
3. 导致编辑器跳转到意外位置

---

## 问题2: textarea选择器不精确

### 症状
```javascript
const textarea = document.querySelector('textarea');
```

### 问题
- 编辑对话框中有多个textarea（标题、描述、内容）
- `querySelector` 只会选中第一个textarea
- 如果用户在描述字段输入，可能误选到描述的textarea

### 影响
- 插入变量功能可能在错误的字段中插入
- 或者完全不起作用

---

## 问题3: 变量替换时条件块残留

### 症状
用户报告：将【剧本模板】中的自定义模板复制到【AI提示词管理】工具中，预览时出现多余的 `{{/if}}`

**示例内容**:
```
{{#if previousEpisode}}
## 上集回顾（第{{previousEpisode.number}}集）
{{#if previousEpisode.title}}
- 标题：{{previousEpisode.title}}
{{/if}}
{{#if previousEpisode.summary}}
- 内容：{{previousEpisode.summary}}
{{/if}}
{{/if}}
```

**预览结果**（previousEpisode 为空时）:
```
{{/if}}  ← 残留的标记
```

### 原因分析

**文件**: `promptService.js` 第215-223行

**旧的 `renderPrompt` 方法**:
```javascript
renderPrompt(content, values = {}) {
  if (!content) return '';
  let rendered = content;
  Object.entries(values).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}(?::[^}]*)?\\}\\}`, 'g');
    rendered = rendered.replace(regex, value || '');
  });
  return rendered;
}
```

**问题**:
- 只处理简单变量替换 `{{varName}}`
- **不处理条件块** `{{#if condition}}...{{/if}}`
- 当用户复制带条件块的模板时，条件块语法会被保留
- 如果条件为假，内容被移除但 `{{/if}}` 残留

---

## 修复方案

### 修复1: 插入变量滚动问题

**文件**: `PromptEditor.vue` 第385-410行

**修复后代码**:
```javascript
function insertVariable() {
  const variable = '{{变量名}}';
  // ✅ 修复1: 使用更精确的选择器
  const textarea = document.querySelector('.content-editor textarea');
  
  if (textarea) {
    // ✅ 修复2: 保存当前滚动位置
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.content;
    form.content = text.substring(0, start) + variable + text.substring(end);

    // 设置光标位置并恢复滚动位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + 3);
      
      // ✅ 修复3: 恢复滚动位置
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    }, 10);  // ✅ 延迟从0改为10ms
  }
}
```

**改进点**:
1. ✅ 选择器精确到 `.content-editor textarea`
2. ✅ 保存滚动位置
3. ✅ 恢复滚动位置
4. ✅ 延迟时间从0改为10ms（更稳定）

---

### 修复2: 条件块处理

**文件**: `promptService.js` 第215-318行

**修复策略**: 在简单变量替换之前，先处理条件块

**新的 `renderPrompt` 方法**:
```javascript
renderPrompt(content, values = {}) {
  if (!content) return '';
  let rendered = content;
  
  // ✅ 步骤1: 先处理条件块
  rendered = this._processConditionals(rendered, values);
  
  // ✅ 步骤2: 然后进行简单变量替换
  Object.entries(values).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}(?::[^}]*)?\\}\\}`, 'g');
    rendered = rendered.replace(regex, value || '');
  });
  return rendered;
}
```

**新增 `_processConditionals` 方法** (第230-318行):

使用与剧本模板完全相同的深度计数器算法：

```javascript
_processConditionals(text, values = {}) {
  let maxIterations = 50;  // 防止无限循环
  let iteration = 0;
  
  while (iteration < maxIterations) {
    iteration++;
    
    let result = '';
    let i = 0;
    let modified = false;
    
    while (i < text.length) {
      // 1. 查找 {{#if
      const ifStart = text.indexOf('{{#if', i);
      if (ifStart === -1) {
        result += text.substring(i);
        break;
      }
      
      result += text.substring(i, ifStart);
      
      // 2. 提取条件名称
      const conditionStart = ifStart + 5;
      const conditionEnd = text.indexOf('}}', conditionStart);
      const condition = text.substring(conditionStart, conditionEnd).trim();
      
      // 3. 使用深度计数器查找匹配的 {{/if}}
      let depth = 1;
      let pos = conditionEnd + 2;
      let endifPos = -1;
      
      while (pos < text.length && depth > 0) {
        const nextIf = text.indexOf('{{#if', pos);
        const nextEndif = text.indexOf('{{/if}}', pos);
        
        if (nextEndif === -1) break;
        
        if (nextIf !== -1 && nextIf < nextEndif) {
          depth++;  // 遇到嵌套的 if
          pos = nextIf + 5;
        } else {
          depth--;  // 遇到 endif
          if (depth === 0) {
            endifPos = nextEndif;
          }
          pos = nextEndif + 7;
        }
      }
      
      // 4. 提取内容并评估条件
      const content = text.substring(conditionEnd + 2, endifPos);
      
      // 支持对象属性访问（如 previousEpisode.title）
      let value;
      if (condition.includes('.')) {
        const parts = condition.split('.');
        value = values[parts[0]];
        for (let j = 1; j < parts.length && value; j++) {
          value = value[parts[j]];
        }
      } else {
        value = values[condition];
      }
      
      // 5. 根据条件决定是否保留内容
      if (value && value !== '' && value !== 0) {
        result += content;
        modified = true;
      }
      
      i = endifPos + 7;
    }
    
    text = result;
    if (!modified) break;  // 没有更多条件块
  }
  
  return text;
}
```

**算法特点**:
- ✅ 深度计数器精确匹配嵌套的 `{{#if}}` 和 `{{/if}}`
- ✅ 支持任意层级嵌套（不限于3层）
- ✅ 支持对象属性访问 `previousEpisode.title`
- ✅ 一次性完整移除条件块，不留残留
- ✅ 防止无限循环（最多50次迭代）

---

## 测试验证

### 测试1: 插入变量滚动
**步骤**:
1. 新建提示词
2. 在内容编辑器输入大量文本（超过10行）
3. 滚动到中间位置
4. 将光标放在某一行
5. 点击"插入变量"按钮

**预期结果**:
- ✅ 变量插入到光标位置
- ✅ 编辑器保持在原滚动位置
- ✅ 光标选中"变量名"三个字

### 测试2: 条件块处理
**步骤**:
1. 创建提示词，内容为:
```
{{#if previousEpisode}}
## 上集回顾（第{{previousEpisode.number}}集）
{{#if previousEpisode.title}}
- 标题：{{previousEpisode.title}}
{{/if}}
{{#if previousEpisode.summary}}
- 内容：{{previousEpisode.summary}}
{{/if}}
{{/if}}

## 本集内容
{{content}}
```

2. 点击"使用"，不填写 `previousEpisode` 变量
3. 查看预览

**预期结果**:
```
## 本集内容
（content的值）
```

- ✅ 整个 `previousEpisode` 条件块被完整移除
- ✅ 没有残留的 `{{/if}}`
- ✅ 保留非条件块内容

### 测试3: 嵌套条件块
**步骤**:
1. 创建提示词，内容包含三层嵌套:
```
{{#if user}}
用户: {{user.name}}
{{#if user.age}}
年龄: {{user.age}}
{{#if user.adult}}
成年人
{{/if}}
{{/if}}
{{/if}}
```

2. 测试不同场景:
   - `user = null` → 全部移除
   - `user = { name: "张三" }` → 只显示"用户: 张三"
   - `user = { name: "张三", age: 20, adult: true }` → 显示全部

**预期结果**: ✅ 所有场景都正确处理，无残留标记

---

## 影响范围

### 直接影响
- ✅ `PromptEditor.vue` - 提示词编辑对话框
- ✅ `promptService.js` - 提示词渲染服务

### 间接影响
- ✅ 所有使用 `promptService.renderPrompt()` 的地方
- ✅ `PromptUsage.vue` - 简单模式渲染
- ✅ 用户复制剧本模板到提示词工具的场景

### 不影响
- ❌ 高级模式渲染（使用后端Handlebars引擎）
- ❌ 其他工具（剧本生成器等）

---

## 与剧本模板的对比

### 相同点
1. ✅ 插入变量时的滚动问题 - 完全相同的修复方案
2. ✅ 条件块处理算法 - 使用相同的深度计数器

### 不同点
1. **选择器**: 
   - 剧本模板: `.template-textarea textarea`
   - 提示词: `.content-editor textarea`

2. **变量语法扩展**:
   - 剧本模板: 只支持 `{{varName}}`
   - 提示词: 支持 `{{varName:type:options}}`

3. **渲染模式**:
   - 剧本模板: 单一模式
   - 提示词: 双模式（简单模式本地渲染 + 高级模式API渲染）

---

## 后续建议

### 1. 统一模板引擎
目前两个工具使用不同的模板处理逻辑，可以考虑：
- 提取为公共工具类 `TemplateEngine.js`
- 统一变量语法和条件块语法
- 减少代码重复

### 2. 增强错误提示
当用户输入错误的条件块语法时（如未闭合的 `{{#if}}`）：
- 应该显示友好的错误提示
- 标注错误位置
- 提供修复建议

### 3. 语法高亮
在编辑器中为条件块语法添加高亮：
- `{{#if}}` 显示为绿色
- `{{/if}}` 显示为绿色
- `{{varName}}` 显示为橙色

---

## 版本信息
- **修复版本**: v1.2.0
- **修复日期**: 2025-10-15
- **相关文件**:
  - `frontend/src/views/tools/productivity/components/PromptEditor.vue`
  - `frontend/src/services/promptService.js`

### 修复历史
- **v1.2.0** (2025-10-15): 修复插入变量滚动和条件块处理问题
- **v1.1.1** (2025-10-15): 剧本模板 - 修复插入变量滚动问题
- **v1.1.0** (2025-10-15): 剧本模板 - 修复条件块处理问题
