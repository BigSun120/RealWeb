# AI诊断模式测试指南

## 测试目标
验证 `AIResponseParser` 组件的 `diagnosis` 模式能够正确解析多种格式的AI诊断结果。

## 测试文件
- **测试数据**: `diagnosis-test-samples.json`
- **组件位置**: `components/AIResponseParser.vue`
- **解析工具**: `utils/aiResponseParser.js`

## 测试步骤

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 导航到剧本分析页面
前往短剧创作工具 → 剧本分析 → AI诊断

### 3. 打开导入对话框
点击页面上的"导入AI诊断结果"按钮,触发 `AIResponseParser` 对话框。

### 4. 依次测试各种格式

#### 测试用例 1: 标准JSON格式
**目的**: 验证标准的带完整字段的JSON对象解析

**测试数据**: 从 `diagnosis-test-samples.json` 复制 `samples[0].data` 对象并转为字符串
```json
{
  "issues": [
    {
      "id": "issue-001",
      "title": "世界观背景描述不够具体",
      "description": "故事背景过于笼统,缺少具体的时代、地理、社会结构等细节描述...",
      "severity": "critical",
      "location": {
        "module": "worldview",
        "field": "background"
      },
      "suggestion": "建议增加具体的时代背景..."
    }
    // ... 更多问题
  ]
}
```

**期望结果**:
- ✅ 解析成功提示: "成功解析 5 个诊断问题"
- ✅ 严重程度统计正确显示: 严重(2) 中等(2) 轻微(1)
- ✅ 问题列表完整展示,包含标题、描述、位置、建议
- ✅ 严重程度标签颜色正确(严重=红色、中等=黄色、轻微=蓝色)

---

#### 测试用例 2: 带Markdown包装的JSON
**目的**: 验证解析器能正确提取 Markdown 代码块中的JSON

**测试数据**: 从 `samples[1].data` 复制
```
根据您的短剧内容,我为您诊断出以下问题:

\`\`\`json
{
  "issues": [
    {
      "title": "核心冲突不够清晰",
      "description": "故事的主要矛盾和冲突点表达不够明确...",
      "severity": "critical",
      ...
    }
  ]
}
\`\`\`

以上是主要诊断问题,建议您优先处理严重等级的问题。
```

**期望结果**:
- ✅ 正确提取代码块中的JSON
- ✅ 解析成功,显示 3 个问题
- ✅ 忽略Markdown文本,仅解析JSON部分

---

#### 测试用例 3: 简化JSON格式(无location)
**目的**: 验证缺少可选字段时的容错性

**测试数据**: 从 `samples[2].data` 复制
```json
{
  "issues": [
    {
      "title": "人物关系网过于简单",
      "description": "角色之间的关系主要集中在主角身上...",
      "severity": "medium",
      "suggestion": "构建配角之间的关系网..."
    }
  ]
}
```

**期望结果**:
- ✅ 解析成功,不因缺少 `location` 字段报错
- ✅ 位置信息显示为空或默认值
- ✅ 其他字段正常显示

---

#### 测试用例 4: 纯数组格式
**目的**: 验证直接以 issues 数组形式提供的数据

**测试数据**: 从 `samples[3].data` 复制
```json
[
  {
    "title": "世界观设定存在逻辑漏洞",
    "description": "设定中的权力体系和实际情节中的权力运作方式存在矛盾...",
    "severity": "critical",
    "location": {...}
  }
]
```

**期望结果**:
- ✅ 正确识别为 issues 数组
- ✅ 解析成功,显示 2 个问题

---

#### 测试用例 5: 中英混合格式
**目的**: 验证字段名为英文key(如 issue_title, severity_level)的兼容性

**测试数据**: 从 `samples[4].data` 复制
```json
{
  "diagnosis_result": {
    "total_issues": 4,
    "issues": [
      {
        "issue_title": "开篇吸引力不足",
        "issue_description": "第1集前3分钟未能有效建立悬念...",
        "severity_level": "critical",
        "module_location": "outline",
        "suggestion_text": "在开篇30秒内设置钩子..."
      }
    ]
  }
}
```

**期望结果**:
- ✅ 正确映射英文字段名到标准字段
- ✅ 解析成功,显示 4 个问题
- ✅ 字段内容正确提取

---

#### 测试用例 6: 复杂嵌套格式
**目的**: 验证深层嵌套结构的解析能力

**测试数据**: 从 `samples[5].data` 复制
```json
{
  "diagnosis": {
    "metadata": {...},
    "result": {
      "summary": "...",
      "issues": [...]
    }
  }
}
```

**期望结果**:
- ✅ 能够深度查找并提取 `issues` 数组
- ✅ 解析成功,显示 3 个问题
- ✅ 忽略无关的 metadata 和 summary 字段

---

## 测试检查点

### 界面检查
- [ ] 对话框正确显示,标题为"导入AI诊断结果"
- [ ] 粘贴区域显示占位符文本
- [ ] "智能解析"按钮可点击
- [ ] 解析过程有loading动画

### 解析结果检查
- [ ] 成功解析后显示绿色成功图标
- [ ] 问题数量统计正确(标签显示)
- [ ] 严重程度统计正确显示(严重、中等、轻微各自数量)
- [ ] 问题列表按卡片形式展示
- [ ] 每个问题包含:
  - [ ] 严重程度标签(颜色正确)
  - [ ] 问题标题(粗体显示)
  - [ ] 问题描述(灰色文本)
  - [ ] 位置信息(有图标)
  - [ ] 改进建议(浅色背景)

### 交互检查
- [ ] 点击"重新解析"按钮,清空结果,返回粘贴界面
- [ ] 点击"确认导入"按钮,触发 `parsed` 事件
- [ ] 导入成功后显示"诊断问题已导入"提示
- [ ] 对话框关闭,数据传递到父组件

### 错误处理检查
- [ ] 粘贴空内容点解析,提示"请先粘贴 AI 回答内容"
- [ ] 粘贴无效JSON,提示"未能解析到问题信息,请检查格式"
- [ ] 解析后 issues 为空,显示警告信息

---

## 关键代码路径

### 1. 解析函数
`utils/aiResponseParser.js` → `parseDiagnosisResponse()`

**主要逻辑**:
- 提取Markdown代码块中的JSON
- 多种格式尝试(对象、数组、嵌套)
- 字段名映射(支持中英文key)
- 数据规范化

### 2. 组件处理
`components/AIResponseParser.vue` → `handleParse()`

**诊断模式分支**:
```javascript
else if (props.mode === 'diagnosis') {
  parsedData.value = parseDiagnosisResponse(aiResponse.value);
  parsed.value = true;
  
  const count = parsedData.value.issues?.length || 0;
  if (count > 0) {
    ElMessage.success(`成功解析 ${count} 个诊断问题`);
  } else {
    ElMessage.warning('未能解析到问题信息,请检查格式');
  }
}
```

### 3. 事件触发
`handleConfirm()` 方法:
```javascript
if (props.mode === 'diagnosis') {
  emit('parsed', parsedData.value);
}
```

---

## 常见问题排查

### Q1: 解析后显示 0 个问题
**可能原因**:
- JSON格式不正确(缺少引号、逗号等)
- issues 字段拼写错误或大小写不匹配
- 数据嵌套层级超出解析器查找范围

**解决方法**:
- 检查JSON格式是否合法
- 查看 `parseDiagnosisResponse` 函数的字段匹配逻辑
- 在解析函数中添加console.log调试

### Q2: 严重程度显示异常
**可能原因**:
- severity 字段值不在 ['critical', 'medium', 'low'] 范围内
- 字段名拼写错误(如 serverity)

**解决方法**:
- 确保 severity 值规范
- 在 `getSeverityType` 函数中添加默认值处理

### Q3: 位置信息不显示
**可能原因**:
- location 字段为空或格式不正确
- `getLocationText` 函数逻辑问题

**解决方法**:
- 检查 location 对象结构
- 验证 `getLocationText` 的字段访问路径

---

## 自动化测试建议

### 单元测试
在 `tests/unit/aiResponseParser.spec.js` 中添加:

```javascript
describe('parseDiagnosisResponse', () => {
  it('应该正确解析标准JSON格式', () => {
    const input = '{"issues": [...]}';
    const result = parseDiagnosisResponse(input);
    expect(result.issues).toHaveLength(5);
  });

  it('应该提取Markdown代码块中的JSON', () => {
    const input = '```json\n{"issues": [...]}\n```';
    const result = parseDiagnosisResponse(input);
    expect(result.issues).toBeDefined();
  });

  it('应该处理纯数组格式', () => {
    const input = '[{...}]';
    const result = parseDiagnosisResponse(input);
    expect(Array.isArray(result.issues)).toBe(true);
  });
});
```

### 集成测试
使用 Vue Test Utils 测试组件:

```javascript
describe('AIResponseParser - diagnosis mode', () => {
  it('应该在解析成功后显示结果预览', async () => {
    const wrapper = mount(AIResponseParser, {
      props: { mode: 'diagnosis', modelValue: true }
    });
    
    // 模拟粘贴和解析
    await wrapper.find('textarea').setValue('{"issues": [...]}');
    await wrapper.find('.parse-btn').trigger('click');
    
    // 验证结果显示
    expect(wrapper.find('.diagnosis-preview').exists()).toBe(true);
    expect(wrapper.findAll('.issue-card')).toHaveLength(5);
  });
});
```

---

## 测试完成检查清单

- [ ] 所有6个测试用例均通过
- [ ] 界面显示符合预期
- [ ] 数据正确传递到父组件
- [ ] 错误提示友好准确
- [ ] 无控制台报错
- [ ] 样式显示正常(标签颜色、布局、间距)
- [ ] 在不同浏览器中测试(Chrome、Firefox、Edge)

---

## 下一步工作
测试通过后,可进行:
1. 与 ScriptAnalysis.vue 的集成测试
2. 端到端(E2E)测试完整的诊断导入流程
3. 性能测试(大量问题数据的渲染)
4. 用户体验优化(动画、交互反馈)
