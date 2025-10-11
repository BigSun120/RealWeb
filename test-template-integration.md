# Phase 6 模板引擎集成测试

## 测试清单

### 1. 后端 API 测试

#### 1.1 渲染简单模板
```bash
POST http://localhost:5001/api/template/render
Content-Type: application/json

{
  "template": "Hello {{name}}, you are {{age}} years old.",
  "variables": {
    "name": "Alice",
    "age": 25
  }
}
```

#### 1.2 渲染条件判断模板
```bash
POST http://localhost:5001/api/template/render
Content-Type: application/json

{
  "template": "{{#if isVip}}Welcome VIP!{{else}}Welcome User!{{/if}}",
  "variables": {
    "isVip": true
  }
}
```

#### 1.3 渲染循环模板
```bash
POST http://localhost:5001/api/template/render
Content-Type: application/json

{
  "template": "{{#each items}}- {{this}}\n{{/each}}",
  "variables": {
    "items": ["Apple", "Banana", "Orange"]
  }
}
```

#### 1.4 提取模板变量
```bash
POST http://localhost:5001/api/template/extract-variables
Content-Type: application/json

{
  "template": "Hello {{name}}, your order {{orderId}} is ready. Total: {{total}}"
}
```

#### 1.5 获取辅助函数列表
```bash
GET http://localhost:5001/api/template/helpers
```

### 2. 前端界面测试

#### 2.1 访问 Prompt Vault
1. 打开浏览器访问: http://localhost:5173
2. 导航到 "工具" -> "生产力工具" -> "Prompt Vault"

#### 2.2 创建高级模板提示词
1. 点击"新建提示词"
2. 输入以下内容：
   - 标题: "邮件模板测试"
   - 分类: writing
   - 内容:
```
亲爱的{{name}}：

{{#if isVip}}
感谢您成为VIP会员！您将享受以下特权：
{{#each privileges}}
- {{this}}
{{/each}}
{{else}}
欢迎成为我们的用户！
{{/if}}

您的订单列表：
{{#each orders}}
{{@index}}. 订单号: {{this.id}}, 金额: ¥{{this.amount}}
{{/each}}

{{uppercase company}} 团队
{{format today "YYYY-MM-DD"}}
```

#### 2.3 测试提示词使用
1. 点击新创建的提示词的"使用"按钮
2. 验证是否显示了"模板语法说明"卡片
3. 在变量输入区填写：
   - name: 张三
   - isVip: true
   - privileges: ["优先客服", "专属折扣", "免费配送"]
   - orders: [{"id": "001", "amount": 299}, {"id": "002", "amount": 599}]
   - company: acme
   - today: 2025-10-11

4. 检查预览区是否正确渲染
5. 点击"复制到剪贴板"验证功能

### 3. 错误处理测试

#### 3.1 测试无效模板
```bash
POST http://localhost:5001/api/template/render
Content-Type: application/json

{
  "template": "{{#if test}}No closing tag",
  "variables": {}
}
```
预期: 返回错误信息

#### 3.2 测试缺失变量
```bash
POST http://localhost:5001/api/template/render
Content-Type: application/json

{
  "template": "Hello {{name}}",
  "variables": {}
}
```
预期: 正常渲染，但变量为空

### 4. 性能测试

#### 4.1 测试大量循环
```bash
POST http://localhost:5001/api/template/render
Content-Type: application/json

{
  "template": "{{#each items}}{{this}} {{/each}}",
  "variables": {
    "items": [1, 2, 3, ... 1000]
  }
}
```

#### 4.2 测试复杂嵌套
```bash
POST http://localhost:5001/api/template/render
Content-Type: application/json

{
  "template": "{{#each categories}}Category: {{this.name}}\n{{#each this.items}}  - {{this}}\n{{/each}}{{/each}}",
  "variables": {
    "categories": [
      {"name": "Fruits", "items": ["Apple", "Banana"]},
      {"name": "Vegetables", "items": ["Carrot", "Potato"]}
    ]
  }
}
```

## 验收标准

- [ ] 所有后端 API 测试通过
- [ ] 前端可以正确检测高级模板语法
- [ ] 模板语法帮助组件正确显示
- [ ] 变量自动提取功能正常
- [ ] 实时预览功能正常
- [ ] 错误提示友好清晰
- [ ] 性能满足要求（<100ms for simple templates）

## 下一步

1. 修复发现的 bug
2. 优化性能
3. 增加更多辅助函数
4. 编写单元测试
5. 更新文档
