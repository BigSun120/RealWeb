module.exports = {
  // 基础格式化选项
  semi: true,                    // 语句末尾添加分号
  singleQuote: true,            // 使用单引号
  quoteProps: 'as-needed',      // 仅在需要时为对象属性添加引号
  trailingComma: 'none',        // 不添加尾随逗号
  
  // 缩进和空格
  tabWidth: 2,                  // 缩进宽度为2个空格
  useTabs: false,               // 使用空格而不是制表符
  bracketSpacing: true,         // 对象字面量的大括号间添加空格
  bracketSameLine: false,       // 将>放在新行
  
  // 行长度
  printWidth: 100,              // 每行最大长度100字符
  
  // 箭头函数
  arrowParens: 'avoid',         // 单参数箭头函数省略括号
  
  // 换行符
  endOfLine: 'lf',              // 使用LF换行符
  
  // HTML/Vue特定选项
  htmlWhitespaceSensitivity: 'css',  // HTML空白敏感性
  vueIndentScriptAndStyle: false,    // Vue文件中不缩进<script>和<style>
  
  // 嵌入式语言格式化
  embeddedLanguageFormatting: 'auto',
  
  // 特定文件类型覆盖
  overrides: [
    {
      files: '*.vue',
      options: {
        parser: 'vue'
      }
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        trailingComma: 'none'
      }
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'preserve',
        printWidth: 80
      }
    },
    {
      files: '*.yaml',
      options: {
        parser: 'yaml',
        tabWidth: 2
      }
    },
    {
      files: '*.yml',
      options: {
        parser: 'yaml',
        tabWidth: 2
      }
    }
  ]
};
