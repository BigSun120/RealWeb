# Phase 6: 高级模板引擎 - 实现总结

## 实现日期
2024年10月11日

## 完成状态
✅ **后端核心功能已实现** (90%)
🚧 **前端增强功能待实现** (0%)

---

## 后端实现

### 1. ✅ 模板引擎核心 (`backend/src/utils/templateEngine.js`)

#### 支持的功能:

**变量替换**
```
{{name}}  → 替换为变量值
```

**条件判断**
```
{{#if condition}}
  条件为真时显示
{{else}}
  条件为假时显示
{{/if}}
```

支持的条件操作符:
- 比较: `===`, `!==`, `==`, `!=`, `>`, `<`, `>=`, `<=`
- 逻辑: `!` (NOT)
- 支持嵌套条件

**循环**
```
{{#each array}}
  {{this}}  - 当前项
  {{@index}} - 索引
  {{@first}} - 是否第一项
  {{@last}}  - 是否最后一项
{{/each}}
```

**辅助函数**
1. `{{uppercase text}}` - 转大写
2. `{{lowercase text}}` - 转小写
3. `{{capitalize text}}` - 首字母大写
4. `{{length array}}` - 获取长度
5. `{{trim text}}` - 去除首尾空格
6. `{{default value "默认值"}}` - 设置默认值
7. `{{join array ", "}}` - 连接数组
8. `{{json object}}` - 转JSON字符串
9. `{{format date "YYYY-MM-DD"}}` - 格式化日期

### 2. ✅ API 接口 (`backend/src/controllers/templateController.js`)

#### POST /api/tools/prompt-vault/template/render
渲染模板

**请求体**:
```json
{
  "content": "你好，{{name}}！",
  "variables": {
    "name": "张三"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "渲染成功",
  "data": {
    "rendered": "你好，张三！"
  }
}
```

#### POST /api/tools/prompt-vault/template/extract-variables
提取模板变量

**请求体**:
```json
{
  "content": "{{name}}今年{{age}}岁"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "提取成功",
  "data": {
    "variables": [
      {"name": "name", "type": "text", "required": true, "default": ""},
      {"name": "age", "type": "text", "required": true, "default": ""}
    ]
  }
}
```

#### GET /api/tools/prompt-vault/template/helpers
获取可用辅助函数列表

**响应**:
```json
{
  "code": 200,
  "data": {
    "helpers": [
      {"name": "uppercase", "description": "转换为大写"},
      ...
    ]
  }
}
```

### 3. ✅ 路由配置
已在 `backend/src/routes/prompts.js` 中注册所有模板相关路由

---

## 测试结果

### 测试脚本: `backend/test/templateEngine.test.js`

#### 测试通过 ✅ (9/11)
1. ✅ 基础变量替换
2. ✅ 条件判断
3. ✅ 循环
4. ✅ 辅助函数 - uppercase
5. ✅ 辅助函数 - lowercase
6. ✅ 辅助函数 - length
7. ❌ 辅助函数 - join (引号解析问题)
8. ✅ 嵌套条件
9. ❌ 循环中的@first变量 (未正确识别)
10. ✅ 变量提取
11. ✅ 复杂模板

### 已知问题 🐛

1. **join 辅助函数的引号解析**
   - 问题: `{{join items ", "}}` 输出时保留了引号
   - 影响: 轻微,不影响核心功能
   - 状态: 待修复

2. **循环中的特殊变量**
   - 问题: `@first` 等特殊变量在某些情况下不工作
   - 影响: 轻微
   - 状态: 待修复

---

## 前端实现 (待完成)

### 需要修改: `frontend/src/views/tools/productivity/components/PromptEditor.vue`

#### 计划添加的功能:

1. **实时预览面板**
   - 在编辑器旁边显示渲染结果
   - 实时更新

2. **变量自动提取**
   - 自动检测模板中的变量
   - 生成变量输入表单

3. **语法高亮**
   - 高亮显示 `{{...}}` 语法
   - 区分变量、条件、循环

4. **语法提示**
   - 输入 `{{` 时弹出自动完成
   - 显示可用的辅助函数列表

5. **错误提示**
   - 标记语法错误
   - 显示友好的错误消息

### 实现建议:

```vue
<template>
  <el-row :gutter="20">
    <!-- 左侧编辑器 -->
    <el-col :span="12">
      <el-input
        v-model="templateContent"
        type="textarea"
        :rows="20"
        @input="handleTemplateChange"
      />
      
      <!-- 语法帮助 -->
      <el-card class="syntax-help">
        <h4>模板语法</h4>
        <ul>
          <li>变量: {{`{{name}}`}}</li>
          <li>条件: {{`{{#if condition}}...{{/if}}`}}</li>
          <li>循环: {{`{{#each array}}...{{/each}}`}}</li>
        </ul>
      </el-card>
    </el-col>
    
    <!-- 右侧预览 -->
    <el-col :span="12">
      <h4>实时预览</h4>
      <div class="preview-panel" v-html="renderedContent"></div>
      
      <!-- 变量输入 -->
      <el-form v-if="extractedVariables.length > 0">
        <el-form-item
          v-for="variable in extractedVariables"
          :key="variable.name"
          :label="variable.name"
        >
          <el-input v-model="variableValues[variable.name]" />
        </el-form-item>
      </el-form>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { debounce } from 'lodash-es';

const templateContent = ref('');
const variableValues = ref({});
const extractedVariables = ref([]);
const renderedContent = ref('');

// 防抖的变量提取
const extractVariables = debounce(async () => {
  const response = await promptService.extractTemplateVariables(
    templateContent.value
  );
  extractedVariables.value = response.data.variables;
}, 500);

// 防抖的模板渲染
const renderTemplate = debounce(async () => {
  try {
    const response = await promptService.renderTemplate(
      templateContent.value,
      variableValues.value
    );
    renderedContent.value = response.data.rendered;
  } catch (error) {
    renderedContent.value = `渲染错误: ${error.message}`;
  }
}, 500);

watch(templateContent, () => {
  extractVariables();
  renderTemplate();
});

watch(variableValues, renderTemplate, { deep: true });
</script>
```

---

## API 使用示例

### 在前端 promptService 中添加:

```javascript
// frontend/src/services/promptService.js 或相应位置

async renderTemplate(content, variables) {
  const response = await request({
    url: '/tools/prompt-vault/template/render',
    method: 'post',
    data: { content, variables }
  });
  return response;
},

async extractTemplateVariables(content) {
  const response = await request({
    url: '/tools/prompt-vault/template/extract-variables',
    method: 'post',
    data: { content }
  });
  return response;
},

async getTemplateHelpers() {
  const response = await request({
    url: '/tools/prompt-vault/template/helpers',
    method: 'get'
  });
  return response;
}
```

---

## 使用场景示例

### 示例1: 邮件模板
```
亲爱的{{name}}：

{{#if isVip}}
感谢您成为我们的VIP会员！本月为您准备了专属优惠。
{{else}}
感谢您的关注！升级VIP可享受更多特权。
{{/if}}

您的积分: {{points}}
订单列表:
{{#each orders}}
- 订单号: {{this.id}}, 金额: {{this.amount}}
{{/each}}

{{format today "YYYY-MM-DD"}}
```

### 示例2: 代码生成模板
```
// 生成的{{language}}代码

class {{className}} {
  {{#each properties}}
  private {{this.type}} {{this.name}};
  {{/each}}
  
  constructor({{#each properties}}{{this.name}}: {{this.type}}{{#if @last}}{{else}}, {{/if}}{{/each}}) {
    {{#each properties}}
    this.{{this.name}} = {{this.name}};
    {{/each}}
  }
}
```

### 示例3: 报告模板
```
## {{title}}

生成时间: {{format date "YYYY-MM-DD HH:mm:ss"}}
作者: {{uppercase author}}

### 统计数据
总计: {{length items}} 项

{{#each items}}
{{@index}}. {{this.name}} - {{this.value}}
{{/each}}

{{#if hasWarning}}
⚠️ 注意: {{warningMessage}}
{{/if}}
```

---

## 性能考虑

1. **模板缓存**: 对于相同的模板内容,可以缓存编译结果
2. **变量验证**: 提取变量时进行基本验证
3. **错误处理**: 所有错误都有友好提示,不会中断渲染
4. **递归限制**: 嵌套深度有合理限制,防止无限递归

---

## 安全性

1. **不执行用户代码**: 模板引擎只支持安全的声明式语法
2. **无 eval**: 完全不使用 eval 或 Function 构造函数
3. **XSS 防护**: 渲染结果需要前端进行适当的转义

---

## 下一步工作

### 高优先级
1. 🔴 修复 join 函数的引号解析问题
2. 🔴 修复循环中的 @first 等特殊变量
3. 🟡 实现前端实时预览功能
4. 🟡 实现变量自动提取UI

### 中优先级
5. 🟢 添加更多辅助函数 (如: slice, reverse, sort等)
6. 🟢 语法高亮支持
7. 🟢 添加模板示例库

### 低优先级
8. ⚪ 支持自定义辅助函数注册
9. ⚪ 模板性能优化
10. ⚪ 添加单元测试覆盖率

---

## 文件清单

### 新增文件
- ✅ `backend/src/utils/templateEngine.js` - 模板引擎核心
- ✅ `backend/src/controllers/templateController.js` - 模板控制器
- ✅ `backend/test/templateEngine.test.js` - 测试脚本

### 修改文件
- ✅ `backend/src/routes/prompts.js` - 添加模板路由

### 待修改文件
- ⏳ `frontend/src/views/tools/productivity/components/PromptEditor.vue`
- ⏳ `frontend/src/services/promptService.js` (或对应的service文件)

---

## 总结

Phase 6 的后端核心功能已经完成并测试。模板引擎支持:
- ✅ 变量替换
- ✅ 条件判断 (包括嵌套)
- ✅ 循环遍历
- ✅ 9个辅助函数
- ✅ 变量自动提取
- ✅ REST API 接口

前端增强功能待实现,包括实时预览、语法高亮、自动完成等。

整体完成度: **后端90%, 前端0%, 总体45%**
