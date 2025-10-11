<template>
  <el-card class="template-syntax-help" shadow="hover">
    <template #header>
      <div class="card-header">
        <span><i class="el-icon-info-filled"></i> 模板语法说明</span>
        <el-button link @click="visible = !visible">
          {{ visible ? '收起' : '展开' }}
        </el-button>
      </div>
    </template>

    <el-collapse v-model="activeNames" v-show="visible">
      <!-- 基础语法 -->
      <el-collapse-item name="basic" title="基础语法">
        <div class="syntax-section">
          <div class="intro-text">
            <p>💡 模板引擎支持<strong>变量替换</strong>、<strong>条件判断</strong>、<strong>循环遍历</strong>等功能，让提示词更加灵活强大！</p>
          </div>

          <h4>1. 变量替换</h4>
          <div class="example">
            <code v-pre>{{name}}</code>
            <p class="description">基本用法：使用 <code v-pre>{{</code> 和 <code v-pre>}}</code> 包裹变量名，将自动替换为对应值</p>
          </div>

          <div class="example">
            <code v-pre>Hello {{name}}, you are {{age}} years old.</code>
            <p class="description"><strong>示例输出：</strong>Hello Alice, you are 25 years old.</p>
          </div>

          <div class="example">
            <code v-pre>{{user.name}} - {{user.email}}</code>
            <p class="description">支持<strong>对象属性访问</strong>，使用 <code>.</code> 操作符</p>
          </div>

          <h4>2. 条件判断</h4>
          <div class="example">
            <code v-pre>
{{#if 条件}}
  条件为真时显示的内容
{{/if}}
            </code>
            <p class="description">基本 if 语句，当条件为真时显示内容</p>
          </div>

          <div class="example">
            <code v-pre>
{{#if isVip}}
  感谢您成为VIP会员！
{{else}}
  欢迎成为我们的用户！
{{/if}}
            </code>
            <p class="description">带 else 分支，根据条件显示不同内容</p>
          </div>

          <div class="example">
            <code v-pre>{{#if !hasData}}无数据{{/if}}</code>
            <p class="description">支持 <code>!</code> 取反操作符</p>
          </div>

          <h4>3. 循环遍历</h4>
          <div class="example">
            <code v-pre>
{{#each items}}
  - {{this}}
{{/each}}
            </code>
            <p class="description">遍历数组，<code v-pre>{{this}}</code> 表示当前元素</p>
          </div>

          <div class="example">
            <code v-pre>
{{#each users}}
  {{this.name}}: {{this.email}}
{{/each}}
            </code>
            <p class="description">遍历对象数组，访问对象属性</p>
          </div>

          <h4>4. 比较操作符</h4>
          <div class="example">
            <code v-pre>
{{#if age > 18}}成年人{{/if}}
{{#if score === 100}}满分{{/if}}
{{#if status !== "active"}}非活跃{{/if}}
            </code>
            <p class="description">支持操作符：<code>></code> <code><</code> <code>>=</code> <code><=</code> <code>===</code> <code>!==</code> <code>==</code> <code>!=</code></p>
          </div>
        </div>
      </el-collapse-item>

      <!-- 辅助函数 -->
      <el-collapse-item name="helpers" title="辅助函数">
        <div class="syntax-section">
          <el-table :data="helpersList" size="small">
            <el-table-column prop="name" label="函数名" width="150" />
            <el-table-column prop="description" label="说明" />
            <el-table-column prop="example" label="示例" width="200">
              <template #default="{ row }">
                <code class="small">{{ row.example }}</code>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-collapse-item>

      <!-- 高级用法 -->
      <el-collapse-item name="advanced" title="高级用法">
        <div class="syntax-section">
          <h4>1. 循环中的特殊变量</h4>
          <div class="example">
            <ul class="feature-list">
              <li><code v-pre>{{@index}}</code> - 当前索引（从 0 开始）</li>
              <li><code v-pre>{{@first}}</code> - 是否第一项（true/false）</li>
              <li><code v-pre>{{@last}}</code> - 是否最后一项（true/false）</li>
            </ul>
            <code v-pre>
{{#each items}}
  {{@index}}. {{this}}{{#if @last}}（最后一项）{{/if}}
{{/each}}
            </code>
          </div>

          <h4>2. 嵌套使用</h4>
          <div class="example">
            <code v-pre>
{{#if hasCategories}}
  分类列表：
  {{#each categories}}
    {{@index}}. {{this.name}}
    {{#if this.items}}
      子项：
      {{#each this.items}}
        - {{this}}
      {{/each}}
    {{/if}}
  {{/each}}
{{/if}}
            </code>
            <p class="description">支持多层嵌套，可以在条件中使用循环，或在循环中使用条件</p>
          </div>

          <h4>3. 组合使用辅助函数</h4>
          <div class="example">
            <code v-pre>
{{#each users}}
  {{@index}}. {{uppercase this.name}} - {{lowercase this.email}}
{{/each}}
            </code>
            <p class="description">在循环中结合辅助函数使用</p>
          </div>

          <div class="example">
            <code v-pre>
{{#if length(items) > 0}}
  总计 {{length items}} 项
{{else}}
  暂无数据
{{/if}}
            </code>
            <p class="description">在条件中使用辅助函数</p>
          </div>

          <h4>4. 默认值处理</h4>
          <div class="example">
            <code v-pre>
姓名：{{default name "未设置"}}
状态：{{default status "无"}}
            </code>
            <p class="description">使用 default 函数为空值设置默认显示</p>
          </div>

          <h4>5. 字符串拼接</h4>
          <div class="example">
            <code v-pre>
全名：{{firstName}} {{lastName}}
网站：https://{{domain}}.com
            </code>
            <p class="description">可以在同一行内使用多个变量</p>
          </div>
        </div>
      </el-collapse-item>

      <!-- 常见问题 -->
      <el-collapse-item name="faq" title="常见问题">
        <div class="syntax-section">
          <div class="faq-item">
            <h4>❓ 如何在模板中显示真实的大括号？</h4>
            <p>如果您需要显示大括号本身（而不是作为变量），可以使用反斜杠转义：</p>
            <div class="example">
              <code v-pre>\{\{name\}\}</code>
              <p class="description">或者使用空格分隔：<code v-pre>{ {name} }</code></p>
            </div>
          </div>

          <div class="faq-item">
            <h4>❓ 如何处理空值或不存在的变量？</h4>
            <p>使用 <code>default</code> 辅助函数：</p>
            <div class="example">
              <code v-pre>{{default username "游客"}}</code>
              <p class="description">如果 username 为空，将显示“游客”</p>
            </div>
          </div>

          <div class="faq-item">
            <h4>❓ 如何判断数组是否为空？</h4>
            <div class="example">
              <code v-pre>
{{#if length(items) > 0}}
  有数据
{{else}}
  暂无数据
{{/if}}
              </code>
            </div>
          </div>

          <div class="faq-item">
            <h4>❓ 如何格式化日期？</h4>
            <div class="example">
              <code v-pre>
{{format today "YYYY-MM-DD"}}          // 2025-10-11
{{format today "YYYY年MM月DD日"}}      // 2025年10月11日
{{format today "HH:mm:ss"}}           // 14:30:45
              </code>
              <p class="description">支持的格式化符号：YYYY(年) MM(月) DD(日) HH(时) mm(分) ss(秒)</p>
            </div>
          </div>

          <div class="faq-item">
            <h4>❓ 如何连接数组元素？</h4>
            <div class="example">
              <code v-pre>
{{join tags ", "}}                    // tag1, tag2, tag3
{{join names " | "}}                 // Alice | Bob | Charlie
              </code>
            </div>
          </div>
        </div>
      </el-collapse-item>

      <!-- 完整示例 -->
      <el-collapse-item name="examples" title="完整示例">
        <div class="syntax-section">
          <el-tabs>
            <el-tab-pane label="邮件模板">
              <pre class="example-code" v-pre>亲爱的{{name}}：

{{#if isVip}}
感谢您成为VIP会员！
{{else}}
欢迎成为我们的用户！
{{/if}}

您的订单列表：
{{#each orders}}
{{@index}}. 订单号: {{this.id}}, 金额: {{this.amount}}
{{/each}}

{{format today "YYYY-MM-DD"}}</pre>
            </el-tab-pane>

            <el-tab-pane label="代码生成">
              <pre class="example-code" v-pre>class {{className}} {
  {{#each properties}}
  private {{this.type}} {{this.name}};
  {{/each}}
  
  constructor() {
    {{#each properties}}
    this.{{this.name}} = {{default this.name "null"}};
    {{/each}}
  }
}</pre>
            </el-tab-pane>

            <el-tab-pane label="报告生成">
              <pre class="example-code" v-pre>## {{title}}

生成时间: {{format date "YYYY-MM-DD HH:mm:ss"}}
作者: {{uppercase author}}

### 数据统计
总计: {{length items}} 项

{{#each items}}
{{@index}}. {{this.name}} - {{this.value}}
{{/each}}

{{#if hasWarning}}
⚠️ 警告: {{warningMessage}}
{{/if}}</pre>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';

const visible = ref(true);
const activeNames = ref(['basic']);

// 辅助函数示例需要转义大括号
const helpersList = [
  { name: 'uppercase', description: '转换为大写', example: '{{uppercase text}}' },
  { name: 'lowercase', description: '转换为小写', example: '{{lowercase text}}' },
  { name: 'capitalize', description: '首字母大写', example: '{{capitalize text}}' },
  { name: 'length', description: '获取数组长度', example: '{{length array}}' },
  { name: 'join', description: '连接数组元素', example: '{{join array ", "}}' },
  { name: 'trim', description: '去除首尾空格', example: '{{trim text}}' },
  { name: 'default', description: '设置默认值', example: '{{default value "默认"}}' },
  { name: 'format', description: '格式化日期', example: '{{format date "YYYY-MM-DD"}}' },
  { name: 'json', description: '转JSON字符串', example: '{{json object}}' }
];
</script>

<style scoped lang="scss">
.template-syntax-help {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    i {
      margin-right: 6px;
      color: #409eff;
    }
  }

  .syntax-section {
    .intro-text {
      margin-bottom: 16px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: white;
      
      p {
        margin: 0;
        font-size: 14px;
        line-height: 1.6;
        
        strong {
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
      }
    }

    h4 {
      margin: 20px 0 12px;
      color: #303133;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      
      &:first-of-type {
        margin-top: 0;
      }
      
      &::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 2px;
        margin-right: 8px;
      }
    }

    .feature-list {
      margin: 12px 0;
      padding: 12px 16px;
      background: #f0f9ff;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
      list-style: none;
      
      li {
        margin: 8px 0;
        color: #1e3a8a;
        font-size: 13px;
        line-height: 1.6;
        
        code {
          padding: 2px 6px;
          background: white;
          border-radius: 3px;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
        }
      }
    }

    .faq-item {
      margin-bottom: 24px;
      padding: 16px;
      background: #fffbeb;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      h4 {
        margin: 0 0 12px !important;
        color: #92400e;
        font-size: 14px;
        
        &::before {
          display: none;
        }
      }
      
      > p {
        margin: 8px 0;
        color: #78350f;
        font-size: 13px;
        line-height: 1.6;
      }
      
      .example {
        margin: 12px 0 0;
        background: white;
      }
    }

    .example {
      margin-bottom: 16px;
      padding: 14px;
      background: #f5f7fa;
      border-radius: 6px;
      border-left: 3px solid #409eff;
      transition: all 0.2s;
      
      &:hover {
        background: #eef2f6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }

      code {
        display: block;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        color: #dc2626;
        line-height: 1.8;
        font-weight: 500;
        
        code {
          display: inline;
          padding: 2px 6px;
          background: #fee2e2;
          border-radius: 3px;
          font-size: 12px;
        }
      }

      .description {
        margin: 10px 0 0;
        color: #606266;
        font-size: 13px;
        line-height: 1.6;
        
        strong {
          color: #303133;
          font-weight: 600;
        }
        
        code {
          display: inline;
          padding: 2px 6px;
          background: #fee2e2;
          border-radius: 3px;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
        }
      }
    }

    .example-code {
      padding: 16px;
      background: #1e293b;
      border-radius: 8px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.8;
      color: #e2e8f0;
      overflow-x: auto;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
      
      &::-webkit-scrollbar {
        height: 8px;
      }
      
      &::-webkit-scrollbar-track {
        background: #0f172a;
        border-radius: 4px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #475569;
        border-radius: 4px;
        
        &:hover {
          background: #64748b;
        }
      }
    }

    ul {
      margin: 8px 0;
      padding-left: 20px;

      li {
        margin: 6px 0;
        color: #606266;
        font-size: 13px;

        code {
          padding: 2px 6px;
          background: #f5f7fa;
          border-radius: 3px;
          color: #e96900;
          font-size: 12px;
        }
      }
    }

    code.small {
      padding: 2px 6px;
      background: #f5f7fa;
      border-radius: 3px;
      color: #e96900;
      font-size: 12px;
    }
  }

  :deep(.el-table) {
    font-size: 13px;
  }
}
</style>
