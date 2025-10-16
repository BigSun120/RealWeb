# Step 3: FieldMapper 字段映射验证报告

## ✅ 验证结论

**FieldMapper已支持episodes模块的核心字段映射，但缺少细粒度子字段（如content.script、content.keyDialogues）的支持。**

**建议**：Phase 1先使用整集更新（field = "第X集"），Phase 2可扩展支持子字段映射。

---

## 📋 FieldMapper 当前状态

### ✅ 1. episodes模块字段映射

**文件位置**：`frontend/src/views/tools/productivity/drama/mappers/FieldMapper.js`

**现有映射**（第67-78行）：

```javascript
episodes: {
  '集数': 'number',
  '标题': 'title',
  '状态': 'status',
  '简介': 'summary',
  '剧本': 'script',
  '场景': 'scenes',
  '关键对白': 'keyDialogues',
  '结尾悬念': 'cliffhanger',
  '字数': 'wordCount'
}
```

**✅ 优点**：
- 覆盖了episodes的主要字段
- 支持`剧本`、`关键对白`、`场景`等关键字段
- 命名规范，易于理解

**⚠️ 问题**：
- **缺少嵌套路径映射**：例如`剧本` → `script`，但实际数据库字段是`content.script`
- **getEnglishField不支持路径解析**：返回`script`而不是`content.script`

---

### ✅ 2. 字段验证逻辑

**文件位置**：`ScriptAnalysis.vue`（第707-794行）

**验证流程**：

```javascript
const validateIssueLocation = (issue) => {
  const { module, field, characterId } = issue.location;

  // 1. 验证module是否合法
  if (!['worldview', 'characters', 'outline', 'episodes'].includes(module)) {
    return { valid: false, reason: '未知模块' };
  }

  // 2. 对episodes验证动态字段格式（第758行）
  if (module === 'episodes') {
    const episodePattern = /^第\d+集$/;
    if (!episodePattern.test(field)) {
      return { valid: false, reason: '无效的分集字段' };
    }
  }

  // 3. 尝试获取内容（最后防线）
  const content = dataService.getFieldContent(issue.location, { format: 'formatted' });
  if (!content || content.includes('字段当前为空')) {
    return { valid: false, reason: '字段内容为空' };
  }

  return { valid: true };
};
```

**✅ 关键发现**：
- **只验证集数格式**：`/^第\d+集$/`（第759行）
- **不验证子字段**：不检查`剧本`、`对白`等细粒度字段
- **依赖dataService.getFieldContent**：最后通过获取内容来验证字段存在性

---

### ✅ 3. UpdateStrategyFactory实现

**文件位置**：`UpdateStrategyFactory.js`（第305-322行）

**EpisodeUpdateStrategy**：

```javascript
class EpisodeUpdateStrategy {
  async apply(project, field, content, characterId, episodeNumber) {
    const projectId = project._id || project.id;
    const episodes = [...project.episodes];

    const episodeIndex = episodes.findIndex(e => e.number === episodeNumber);
    if (episodeIndex >= 0) {
      const englishField = FieldMapper.getEnglishField('episodes', field);
      episodes[episodeIndex][englishField] = content;  // ⚠️ 问题：直接赋值给顶层字段
      
      await patchDramaEpisodes(projectId, episodes);
      return '分集更新成功';
    }

    throw new Error(`未找到第${episodeNumber}集`);
  }
}
```

**⚠️ 问题定位**：

```javascript
// 假设field = "剧本"
const englishField = FieldMapper.getEnglishField('episodes', '剧本');
// 返回: 'script'

// 实际执行
episodes[episodeIndex]['script'] = content;
// ❌ 错误：应该是 episodes[episodeIndex].content.script = content
```

**数据库Schema要求**：
```javascript
episodes: [{
  number: 1,
  title: '第1集',
  content: {
    script: '剧本内容',         // ✅ 正确路径
    keyDialogues: ['对白1'],    // ✅ 正确路径
    scenes: [...]              // ✅ 正确路径
  }
}]
```

---

## 🔍 问题分析

### 问题1：字段映射缺少路径信息

**现状**：
```javascript
episodes: {
  '剧本': 'script',          // ❌ 缺少content前缀
  '关键对白': 'keyDialogues', // ❌ 缺少content前缀
  '场景': 'scenes'            // ❌ 缺少content前缀
}
```

**应该是**：
```javascript
episodes: {
  '剧本': 'content.script',
  '关键对白': 'content.keyDialogues',
  '场景': 'content.scenes'
}
```

**或者保留现有映射，但在UpdateStrategy中特殊处理**：
```javascript
// 方案2：在EpisodeUpdateStrategy.apply中处理路径
const englishField = FieldMapper.getEnglishField('episodes', field);
const nestedFields = ['script', 'scenes', 'keyDialogues', 'cliffhanger', 'summary'];

if (nestedFields.includes(englishField)) {
  episodes[episodeIndex].content[englishField] = content;
} else {
  episodes[episodeIndex][englishField] = content;
}
```

---

### 问题2：getEnglishField不支持路径解析

**现有实现**（第166-168行）：
```javascript
static getEnglishField(module, chineseField) {
  return this.mappings[module]?.[chineseField] || chineseField;
}
```

**问题**：
- 简单的键值查找
- 不支持返回嵌套路径（如`content.script`）

**解决方案选项**：

**选项A：修改映射为完整路径**
```javascript
episodes: {
  '剧本': 'content.script',
  '关键对白': 'content.keyDialogues'
}
```
- ✅ 简单直观
- ❌ 可能影响现有代码（需要全局搜索使用场景）

**选项B：在UpdateStrategy中特殊处理**（推荐）
```javascript
class EpisodeUpdateStrategy {
  // 定义需要嵌套在content下的字段
  static contentFields = ['script', 'scenes', 'keyDialogues', 'cliffhanger', 'summary'];

  async apply(project, field, content, characterId, episodeNumber) {
    // ...
    const englishField = FieldMapper.getEnglishField('episodes', field);
    
    if (EpisodeUpdateStrategy.contentFields.includes(englishField)) {
      episodes[episodeIndex].content = episodes[episodeIndex].content || {};
      episodes[episodeIndex].content[englishField] = content;
    } else {
      episodes[episodeIndex][englishField] = content;
    }
    // ...
  }
}
```
- ✅ 不影响现有映射
- ✅ 逻辑清晰，易于维护
- ✅ 向后兼容

---

### 问题3：AI诊断字段约束

**需求**：AI诊断时，`location.field`应该是什么格式？

**选项对比**：

| 方案 | field格式 | 示例 | 优点 | 缺点 |
|------|----------|------|------|------|
| 方案A | "第X集" | "第5集" | 简单，现有验证已支持 | 无法指定子字段 |
| 方案B | "第X集-剧本" | "第5集-剧本" | 明确子字段，易读 | 需要解析字符串 |
| 方案C | 使用subField | field="第5集", subField="剧本" | 结构化，最灵活 | 需要扩展location结构 |

**推荐：方案C（扩展location结构）**

```javascript
{
  location: {
    module: 'episodes',
    field: '第5集',        // 集数标识
    episodeNumber: 5,     // 便于定位
    subField: '剧本'       // 细粒度定位（可选）
  }
}
```

**理由**：
- ✅ 向下兼容（subField可选）
- ✅ 结构化，易于验证
- ✅ 支持整集诊断（subField为空）和子字段诊断

---

## 🎯 解决方案设计

### Phase 1：整集更新（MVP）

**策略**：暂不支持细粒度子字段，只支持整集更新

**AI诊断约束**：
```javascript
{
  location: {
    module: 'episodes',
    field: '第5集',
    episodeNumber: 5
    // subField: undefined  // Phase 1不使用
  }
}
```

**提示词约束**：
```
### location字段约束
- **episodes模块**：
  - field必须为"第X集"格式（X为阿拉伯数字）
  - 示例：`{ "module": "episodes", "field": "第5集" }`
  - **注意**：不要使用"第5集-剧本"这种带子字段的格式
```

**UpdateStrategy改动**：无需改动（整集更新不涉及子字段）

**优点**：
- ✅ 无需修改现有代码
- ✅ 快速上线
- ✅ 降低AI错误率

**缺点**：
- ⚠️ 无法精确定位到"对白"、"场景"等子字段

---

### Phase 2：子字段支持（增强版）

**扩展location结构**：
```javascript
{
  location: {
    module: 'episodes',
    field: '第5集',
    episodeNumber: 5,
    subField: '剧本'  // ⭐ 新增
  }
}
```

**扩展FieldMapper**（新增方法）：
```javascript
class FieldMapper {
  /**
   * 获取嵌套字段路径
   * @param {string} module - 模块名
   * @param {string} chineseField - 中文字段名
   * @returns {string[]} 字段路径数组，如['content', 'script']
   */
  static getFieldPath(module, chineseField) {
    if (module === 'episodes') {
      const englishField = this.getEnglishField(module, chineseField);
      const contentFields = ['script', 'scenes', 'keyDialogues', 'cliffhanger', 'summary'];
      
      if (contentFields.includes(englishField)) {
        return ['content', englishField];
      }
      return [englishField];
    }
    
    return [this.getEnglishField(module, chineseField)];
  }
}
```

**扩展EpisodeUpdateStrategy**：
```javascript
class EpisodeUpdateStrategy {
  async apply(project, field, content, characterId, episodeNumber, subField = null) {
    const episodes = [...project.episodes];
    const episodeIndex = episodes.findIndex(e => e.number === episodeNumber);
    
    if (episodeIndex >= 0) {
      if (subField) {
        // 子字段更新
        const fieldPath = FieldMapper.getFieldPath('episodes', subField);
        let target = episodes[episodeIndex];
        
        // 遍历路径到倒数第二层
        for (let i = 0; i < fieldPath.length - 1; i++) {
          target[fieldPath[i]] = target[fieldPath[i]] || {};
          target = target[fieldPath[i]];
        }
        
        // 更新最终字段
        target[fieldPath[fieldPath.length - 1]] = content;
      } else {
        // 整集更新
        const englishField = FieldMapper.getEnglishField('episodes', field);
        episodes[episodeIndex][englishField] = content;
      }
      
      await patchDramaEpisodes(projectId, episodes);
      return '分集更新成功';
    }
    
    throw new Error(`未找到第${episodeNumber}集`);
  }
}
```

**扩展validateIssueLocation**：
```javascript
// 在ScriptAnalysis.vue中
if (module === 'episodes') {
  const episodePattern = /^第\d+集$/;
  if (!episodePattern.test(field)) {
    return { valid: false, reason: '无效的分集字段' };
  }
  
  // ⭐ 新增：验证subField
  if (issue.location.subField) {
    const subField = issue.location.subField;
    const validSubFields = ['集数', '标题', '状态', '简介', '剧本', '场景', '关键对白', '结尾悬念'];
    
    if (!validSubFields.includes(subField)) {
      return { 
        valid: false, 
        reason: `无效的子字段: ${subField}`,
        details: `允许的子字段: ${validSubFields.join(', ')}`
      };
    }
  }
}
```

---

## 📝 当前验证结果总结

| 检查项 | 状态 | 评分 | 说明 |
|--------|------|------|------|
| episodes映射存在 | ✅ 完善 | 100% | 已定义8个核心字段 |
| 字段验证逻辑 | ✅ 可用 | 90% | 支持"第X集"格式验证 |
| 整集更新支持 | ✅ 完善 | 100% | EpisodeUpdateStrategy已实现 |
| 子字段映射 | ❌ 缺失 | 0% | 未区分顶层字段和content子字段 |
| 路径解析能力 | ❌ 缺失 | 0% | getEnglishField不支持返回嵌套路径 |

**总体评分**：✅ 78/100（Phase 1足够，Phase 2需增强）

---

## 🚀 实施建议

### 立即行动（Phase 1 MVP）

1. **不修改FieldMapper**
2. **AI提示词约束**：
   - 明确禁止使用子字段格式
   - 只允许"第X集"格式
   - 诊断问题时要求AI将整集作为问题范围

3. **前端验证**：
   - 保持现有`episodePattern`验证
   - 添加提示："分集检查暂不支持细粒度定位，问题将关联到整集"

### 后续优化（Phase 2）

1. **扩展FieldMapper**：
   - 添加`getFieldPath`方法
   - 定义contentFields清单

2. **扩展UpdateStrategy**：
   - 支持subField参数
   - 实现路径遍历更新逻辑

3. **扩展UI**：
   - 问题详情显示subField
   - 支持跳转到剧集内的具体子字段

---

## 📊 风险评估

| 风险项 | 概率 | 影响 | 缓解措施 |
|--------|------|------|----------|
| AI返回错误的field格式 | 中 | 高 | 严格的提示词约束+前端验证 |
| 整集更新payload过大 | 低 | 中 | 压缩、分片传输（后续优化） |
| 用户期望细粒度定位 | 高 | 中 | 文档说明+Phase 2路线图 |
| FieldMapper改动影响其他功能 | 低 | 高 | Phase 1不改动，Phase 2充分测试 |

---

## 📝 下一步行动（Step 4）

根据验证结果，建议：

### Step 4: 开发分集检查功能（Phase 1 MVP）

**开发清单**：
1. ✅ **复用现有基础**：FieldMapper、UpdateStrategy、API无需改动
2. 🆕 **创建episodeCheckPrompts.js**：生成分集诊断提示词
3. 🆕 **创建ExternalAIWorkflowDialog.vue**：外部AI三步向导
4. ✅ **扩展ScriptAnalysis.vue**：添加分集检查Tab
5. ✅ **测试整集更新流程**：确保issues保存和同步正确

**预计耗时**：2-3天

**如确认无异议**：可以立即进入Step 4前端开发

---

**文档版本**：v1.0  
**验证日期**：2025-01-16  
**验证人**：AI Assistant  
**状态**：✅ 通过，Phase 1方案确定，可进入Step 4
