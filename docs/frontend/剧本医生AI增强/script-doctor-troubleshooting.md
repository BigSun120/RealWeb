# 剧本医生 - 故障排查指南

## 📋 文档目的

本文档汇总【剧本医生】功能开发和维护过程中遇到的常见问题、诊断方法和解决方案，帮助快速定位和修复bug。

---

## 🔍 问题分类索引

| 问题类别 | 快速跳转 |
|---------|---------|
| **数据显示问题** | [#1 原文案显示为空](#问题1原文案显示为空) |
| **AI响应问题** | [#2 AI返回MongoDB ID](#问题2ai返回的内容变成mongodb-id) |
| **替换失败问题** | [#3 替换原文案无效](#问题3替换原文案没有生效) |
| **大纲更新问题** | [#4 大纲plotPoints丢失](#问题4大纲plotpoints更新后丢失) |
| **状态持久化问题** | [#5 刷新页面问题丢失](#问题5刷新页面后ai诊断问题丢失) |
| **字段映射问题** | [#6 字段更新失败](#问题6字段更新提示找不到字段) |

---

## 问题1：原文案显示为空

### 症状
- 点击"生成方案"后，解决方案对话框的【原文案】部分显示为空
- 或显示 `(无原文案)`

### 可能原因

#### 原因A：`getOriginalContent` 未处理该模块/字段

**诊断**：
```javascript
// 检查控制台日志
console.log('获取原文案:', issue.location);
// 如果没有对应的处理逻辑，会返回空
```

**解决方案**：
- 使用 `DataService.getFieldContent()` 替代旧的 `getOriginalContent`
- 确保 `FieldMapper` 中有该字段的映射

**代码位置**：
- `DataService.js` 第 40-200 行
- `ScriptAnalysis.vue` 第 1080-1115 行（`generateSolution` 方法）

#### 原因B：字段名映射错误

**诊断**：
```javascript
// 检查字段映射
console.log('中文字段:', field);
console.log('英文字段:', FieldMapper.getEnglishField(module, field));
```

**解决方案**：
- 在 `FieldMapper.js` 中添加缺失的字段映射
- 确保 AI 提示词中的字段名与 `FieldMapper` 一致

**代码位置**：
- `FieldMapper.js` 第 20-150 行

---

## 问题2：AI返回的内容变成MongoDB ID

### 症状
- 刷新页面后，AI建议方案显示为 `"68ee5c57b89f9267f4cb8f22"` 这样的24位十六进制字符串
- 点击"替换原文案"提示内容无效

### 根本原因
AI 误解了示例中的 `_id` 字段，把它当作内容返回

### 已修复（v1.0）

**修复内容**：
1. **加载时验证**（ScriptAnalysis.vue 第 2437-2447 行）
   ```javascript
   if (typeof content === 'string' && /^[a-f0-9]{24}$/i.test(content.trim())) {
     console.warn(`问题"${issue.title}"的solution是无效ID，已清除`);
     issue.solution = null;
     issue.status = 'pending';
   }
   ```

2. **保存时验证**（ScriptAnalysis.vue 第 1162-1166 行）
   ```javascript
   if (typeof contentToSave === 'string' && /^[a-f0-9]{24}$/i.test(contentToSave.trim())) {
     throw new Error('AI返回的内容格式错误，请重新生成');
   }
   ```

3. **应用时验证**（ScriptAnalysis.vue 第 1461-1463 行）
   ```javascript
   if (!contentToApply || /^[a-f0-9]{24}$/i.test(contentToApply.trim())) {
     throw new Error('建议方案内容无效或为空，请重新生成方案');
   }
   ```

### 预防措施
- ✅ 提示词中强调：不要返回 `_id` 作为内容
- ✅ 使用 JSON Schema 约束返回格式

---

## 问题3：替换原文案没有生效

### 症状
- 点击"替换原文案"后提示成功
- 但原文案内容实际未改变

### 可能原因

#### 原因A：module 选择错误策略

**诊断**：
```javascript
// 检查控制台日志
console.log('📤 准备应用的内容类型:', typeof contentToApply);
console.log('模块:', module);
```

**解决方案**：
- 确保 `UpdateStrategyFactory` 中有对应模块的策略
- 检查策略的 `apply` 方法是否正确实现

**代码位置**：
- `UpdateStrategyFactory.js` 第 202-237 行

#### 原因B：字段映射失败

**诊断**：
```javascript
// 检查字段映射
const englishField = FieldMapper.getEnglishField(module, field);
console.log('英文字段:', englishField);
// 如果返回 undefined，说明映射失败
```

**解决方案**：
- 在 `FieldMapper.js` 中添加缺失的映射
- 确保映射表覆盖所有可能的字段

#### 原因C：后端API调用失败

**诊断**：
```javascript
// 检查网络请求
// 在 DevTools -> Network 中查看 PATCH 请求
// 查看响应状态码和错误信息
```

**解决方案**：
- 检查请求payload是否正确
- 检查后端Schema验证规则
- 确保必需字段都已提供

---

## 问题4：大纲plotPoints更新后丢失

### 症状
- 应用大纲修改方案后
- 原有的情节点（plotPoints）消失或被替换为空数组

### 根本原因
旧的 `OutlineUpdateStrategy` 只更新 `description`，忽略了其他字段

### 已修复（v1.0）

**修复内容**：
- 新增 `_mergeActContent()` 方法智能合并幕内容
- 新增 `_mergePlotPoints()` 方法智能合并情节点

**关键逻辑**（UpdateStrategyFactory.js 第 164-291 行）：

```javascript
_mergeActContent(originalAct, content) {
  // 1. 解析content
  let parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
  
  // 2. 检查是否为完整幕对象
  const isCompleteActObject = parsedContent.actNumber !== undefined || 
                               parsedContent.title || 
                               parsedContent.plotPoints;
  
  if (isCompleteActObject) {
    // 3. 智能合并
    return {
      _id: originalAct._id,              // ✅ 保留
      id: originalAct.id,                // ✅ 保留
      actNumber: parsedContent.actNumber || originalAct.actNumber,
      title: parsedContent.title || originalAct.title,
      description: parsedContent.description || originalAct.description,
      plotPoints: this._mergePlotPoints(
        originalAct.plotPoints || [],
        parsedContent.plotPoints || []
      )
    };
  }
}

_mergePlotPoints(originalPoints, newPoints) {
  // 按ID匹配并合并
  return newPoints.map(newPoint => {
    const originalPoint = originalPoints.find(p => 
      p.id === newPoint.id || p._id === newPoint._id
    );
    
    if (originalPoint) {
      // ✅ 保留系统字段，更新内容字段
      return {
        _id: originalPoint._id,
        id: originalPoint.id,
        name: newPoint.name || originalPoint.name,
        description: newPoint.description || originalPoint.description,
        characters: newPoint.characters || originalPoint.characters,
        emotion: newPoint.emotion || originalPoint.emotion,
        episodeRange: newPoint.episodeRange || originalPoint.episodeRange
      };
    } else {
      // ✅ 新增情节点，生成ID
      return {
        id: newPoint.id || `plot_${Date.now()}_${Math.random()}`,
        ...newPoint
      };
    }
  });
}
```

### 验证方法
```javascript
// 应用方案前
console.log('原始plotPoints:', originalAct.plotPoints.length);

// 应用方案后
console.log('合并后plotPoints:', mergedAct.plotPoints.length);
console.log('✅ 情节点匹配成功:', matchCount);
console.log('➕ 新增情节点:', newCount);
```

---

## 问题5：刷新页面后AI诊断问题丢失

### 症状
- 运行AI深度诊断后
- 刷新页面，问题列表消失

### 可能原因

#### 原因A：未保存到服务器

**诊断**：
```javascript
// 检查是否调用了保存方法
console.log('是否保存:', await saveAIDiagnosisToServer());
```

**解决方案**：
- 确保在 AI 诊断成功后调用 `saveAIDiagnosisToServer()`
- 检查服务器响应状态

**代码位置**：
- `ScriptAnalysis.vue` 第 770-830 行（`runAIDiagnosis` 方法）
- `ScriptAnalysis.vue` 第 2350-2369 行（`saveAIDiagnosisToServer` 方法）

#### 原因B：加载失败

**诊断**：
```javascript
// 检查加载逻辑
const loaded = await loadAIDiagnosisFromServer();
console.log('加载结果:', loaded);
```

**解决方案**：
- 确保在组件 `onMounted` 时调用加载方法
- 检查 API 请求是否成功

**代码位置**：
- `ScriptAnalysis.vue` 第 2372-2410 行（`loadAIDiagnosisFromServer` 方法）

---

## 问题6：字段更新提示找不到字段

### 症状
- 应用方案时报错：`未找到角色` 或 `无法更新大纲字段`

### 可能原因

#### 原因A：characterId 不匹配

**诊断**：
```javascript
// 检查角色ID
console.log('目标characterId:', characterId);
console.log('项目中的角色:', project.characters.map(c => c.id));
```

**解决方案**：
- AI 诊断时使用**角色名称**作为 `characterId`
- `CharacterUpdateStrategy` 支持按名称查找：
  ```javascript
  let characterIndex = characters.findIndex(c => c.id === characterId);
  if (characterIndex < 0) {
    characterIndex = characters.findIndex(c => c.name === characterId);  // ✅ 按名称查找
  }
  ```

**代码位置**：
- `UpdateStrategyFactory.js` 第 83-91 行

#### 原因B：幕索引解析错误

**诊断**：
```javascript
// 检查幕的field解析
const actMatch = field.match(/第(一|二|三|四|五|六|七|八|九|十)?幕/);
const actIndex = this._parseActNumber(actMatch[1]);
console.log('幕索引:', actIndex);
console.log('outline.acts长度:', outline.acts.length);
```

**解决方案**：
- 确保 `_parseActNumber` 方法覆盖所有中文数字
- 如果超过10幕，需扩展映射表

**代码位置**：
- `UpdateStrategyFactory.js` 第 293-299 行

---

## 🔧 调试技巧

### 1. 启用详细日志

在关键方法中添加日志：

```javascript
// 数据获取
console.log('📖 获取字段内容:', { module, field, characterId });
console.log('获取结果:', content);

// AI调用
console.log('🤖 调用AI:', { stage, promptLength: prompt.length });
console.log('AI响应:', response);

// 数据更新
console.log('📤 准备更新:', { module, field, contentType: typeof content });
console.log('更新结果:', result);
```

### 2. 使用 Vue DevTools

- 查看 `aiIssues` 响应式状态
- 检查 `currentSolution` 对象结构
- 追踪 `props.project` 数据变化

### 3. 网络请求监控

```javascript
// 在 api/drama.js 中添加拦截器日志
request.interceptors.request.use(config => {
  console.log('🌐 API请求:', config.url, config.data);
  return config;
});

request.interceptors.response.use(response => {
  console.log('✅ API响应:', response.config.url, response.data);
  return response;
});
```

### 4. 断点调试

**关键断点位置**：
- `generateSolution()` 第 1079 行 - 方案生成入口
- `applySolution()` 第 1423 行 - 方案应用入口
- `UpdateStrategyFactory.apply()` 第 234 行 - 策略选择
- `_mergeActContent()` 第 164 行 - 大纲合并逻辑

---

## 📝 问题报告模板

发现新问题时，请提供以下信息：

```markdown
### 问题描述
[简要描述问题现象]

### 复现步骤
1. 
2. 
3. 

### 预期行为
[描述期望的正确行为]

### 实际行为
[描述实际发生的错误行为]

### 环境信息
- 浏览器: [Chrome 120 / Firefox 121 / ...]
- 项目ID: [xxx]
- 诊断阶段: [preparation / episodes / overall]

### 控制台日志
```
[粘贴相关错误日志]
```

### 截图
[如有必要，提供截图]

### 相关代码
[如果已定位问题代码，提供文件和行号]
```

---

## 🚀 预防性检查清单

在修改代码后，建议执行以下检查：

### UI 功能检查
- [ ] 快速检查能正常运行
- [ ] AI深度诊断能成功返回问题列表
- [ ] 生成方案能正确显示原文案和AI建议
- [ ] JSON / Formatted 模式切换正常
- [ ] 编辑、保存、恢复AI建议功能正常
- [ ] 替换原文案能成功更新数据

### 数据一致性检查
- [ ] 刷新页面后AI诊断数据正常加载
- [ ] 大纲更新后 `_id` 和 `id` 未丢失
- [ ] plotPoints 更新后数量和内容正确
- [ ] 角色字段更新后角色对象完整

### 边界情况检查
- [ ] 空数据时不报错
- [ ] 缺少可选字段时有默认值
- [ ] AI返回异常格式时有容错处理
- [ ] 网络请求失败时有友好提示

---

**文档版本**：v1.0  
**最后更新**：2025-01-15  
**相关文档**：[系统概述](./script-doctor-overview.md) | [AI提示词指南](./script-doctor-prompts.md)
