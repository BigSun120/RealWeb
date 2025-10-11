# 提示词导入导出数据格式

## 数据结构

### 导出格式（JSON）

```json
{
  "version": "1.0.0",
  "exportDate": "2024-01-01T00:00:00.000Z",
  "exportedBy": "userId",
  "metadata": {
    "totalPrompts": 10,
    "totalFolders": 2,
    "source": "AI Prompt Vault"
  },
  "folders": [
    {
      "id": "folder-id-1",
      "name": "工作相关",
      "icon": "📁",
      "color": "#409EFF",
      "parentId": null,
      "path": ["工作相关"],
      "description": "工作中常用的提示词"
    }
  ],
  "prompts": [
    {
      "title": "代码审查助手",
      "description": "帮助进行代码审查的提示词",
      "content": "请审查以下代码...",
      "category": "编程",
      "aiModel": "gpt-4",
      "tags": ["代码", "审查"],
      "variables": [
        {
          "name": "language",
          "type": "text",
          "label": "编程语言",
          "required": true,
          "default": "JavaScript",
          "placeholder": "输入编程语言",
          "description": "要审查的代码使用的编程语言"
        }
      ],
      "folderPath": ["工作相关"],
      "visibility": "private",
      "version": "1.0.0",
      "examples": [
        {
          "title": "审查 React 组件",
          "input": {
            "language": "JavaScript",
            "code": "..."
          },
          "output": "审查结果...",
          "note": "示例说明"
        }
      ],
      "tips": "使用技巧",
      "warnings": "注意事项"
    }
  ]
}
```

## 字段说明

### 根级别
- `version`: 格式版本号
- `exportDate`: 导出时间
- `exportedBy`: 导出用户ID（可选）
- `metadata`: 元数据信息
- `folders`: 文件夹数组
- `prompts`: 提示词数组

### Folder 对象
- `id`: 文件夹ID（导入时忽略，用于引用）
- `name`: 文件夹名称（必填）
- `icon`: 图标（可选）
- `color`: 颜色（可选）
- `parentId`: 父文件夹ID（用于建立层级关系）
- `path`: 文件夹路径数组（从根到当前）
- `description`: 描述（可选）

### Prompt 对象
- `title`: 标题（必填）
- `description`: 描述（可选）
- `content`: 内容（必填）
- `category`: 分类（必填）
- `aiModel`: AI模型（可选）
- `tags`: 标签数组（可选）
- `variables`: 变量定义数组（可选）
- `folderPath`: 所属文件夹路径（可选，用于映射到文件夹）
- `visibility`: 可见性（private/public/unlisted，默认private）
- `version`: 版本号（可选）
- `examples`: 示例数组（可选）
- `tips`: 使用技巧（可选）
- `warnings`: 注意事项（可选）

### Variable 对象
- `name`: 变量名（必填）
- `type`: 类型（text/textarea/select/number/date）
- `label`: 显示标签（可选）
- `required`: 是否必填（默认false）
- `default`: 默认值（可选）
- `placeholder`: 占位符（可选）
- `description`: 描述（可选）
- `options`: 选项数组（select类型需要）
- `validation`: 验证规则（可选）

## 导入逻辑

### 1. 文件夹处理
- 按照 `path` 字段重建文件夹层级
- 如果文件夹已存在（按名称和路径匹配），则复用现有文件夹
- 保持原有的层级关系

### 2. 提示词处理
- 检查是否存在重复（按 title + content 匹配）
- 如果重复，提供选项：跳过、覆盖、创建副本
- 根据 `folderPath` 映射到对应文件夹
- 保持变量定义完整

### 3. 去重策略
- **标题+内容** 完全相同 → 视为重复
- **仅标题相同** → 自动添加后缀 "(导入)"
- **用户选择** → 允许用户决定如何处理重复项

### 4. 错误处理
- 记录所有导入错误和警告
- 返回详细的导入报告
- 部分成功也返回成功的条目

## 导出选项

### 导出范围
1. **单个提示词** - 导出选中的一个提示词
2. **选中的提示词** - 导出多个选中的提示词
3. **文件夹** - 导出整个文件夹（包含子文件夹）
4. **全部** - 导出所有提示词和文件夹

### 导出选项
- **包含文件夹结构** - 是否包含文件夹信息
- **包含示例** - 是否包含使用示例
- **包含版本历史** - 是否包含版本历史（可选）
- **最小化** - 只导出必要字段，减小文件大小

## 兼容性

- 支持向后兼容（旧版本格式）
- 导入时自动检测格式版本
- 提供格式转换工具（如需要）
