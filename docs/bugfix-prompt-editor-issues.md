# 修复提示词编辑器的两个问题

## 修复日期
2025-10-10

## 问题描述

### 问题 1：自定义选项重复显示预设选项

**现象：**
当用户在"新建提示词"时选择了预设的【分类、AI模型、标签】选项后，这些预设选项会同时出现在"自定义选项"分组中，导致重复显示。

**示例：**
1. 用户创建提示词，选择分类"写作"（预设选项）
2. 保存后，再次打开编辑器
3. 下拉框中显示：
   - 预设分类：写作 ✓
   - 我的自定义分类：写作 ← **重复！**

**根本原因：**
后端的 `getCustomOptions` API 返回了用户所有使用过的分类/模型，包括预设的。这是因为：
1. 用户选择"写作"并保存到数据库
2. API 使用 `distinct` 查询所有使用过的分类
3. 返回的结果中包含了预设的"写作"
4. 前端将其显示在"自定义"分组中

### 问题 2：多级文件夹显示不正确

**现象：**
编辑提示词时，文件夹下拉框只显示文件夹名称，不显示层级关系。当有多个同名文件夹位于不同层级时，用户无法区分。

**示例：**
```
文件夹结构：
- 工作
  - 项目A
- 个人
  - 项目A  ← 同名但在不同父文件夹下
```

下拉框中只显示：
- 工作
- 项目A
- 个人
- 项目A  ← 无法区分是哪个

**根本原因：**
`PromptEditor.vue` 中的文件夹选择器直接使用 `folder.name`，没有显示完整的层级路径。

## 解决方案

### 修复 1：过滤自定义选项中的预设值

**文件：** `backend/src/controllers/promptController.js`

**修改：** `getCustomOptions` 方法

**修改前：**
```javascript
// 获取用户所有提示词中使用的分类（包括预设和自定义）
const categories = await PromptTemplate.distinct('category', {
  userId,
  isDeleted: false,
  category: { $ne: null, $ne: '' }
});

// 获取用户所有提示词中使用的AI模型（包括预设和自定义）
const models = await PromptTemplate.distinct('aiModel', {
  userId,
  isDeleted: false,
  aiModel: { $ne: null, $ne: '' }
});
```

**修改后：**
```javascript
// 获取用户所有提示词中使用的分类
const allCategories = await PromptTemplate.distinct('category', {
  userId,
  isDeleted: false,
  category: { $ne: null, $ne: '' }
});

// 过滤掉预设的分类，只返回自定义的
const categories = allCategories.filter(cat => !predefinedCategories.includes(cat));

// 获取用户所有提示词中使用的AI模型
const allModels = await PromptTemplate.distinct('aiModel', {
  userId,
  isDeleted: false,
  aiModel: { $ne: null, $ne: '' }
});

// 过滤掉预设的模型，只返回自定义的
const models = allModels.filter(model => !predefinedModels.includes(model));
```

**改进点：**
1. ✅ 只返回真正的自定义选项
2. ✅ 避免重复显示
3. ✅ 保持预设选项和自定义选项的清晰分离
4. ✅ 用户体验更好，下拉列表更简洁

### 修复 2：显示文件夹的完整层级路径

**文件：** `frontend/src/views/tools/productivity/components/PromptEditor.vue`

**修改 1：** 更新模板使用新函数

```vue
<el-form-item label="文件夹">
  <el-select v-model="form.folderId" clearable placeholder="选择文件夹（可选）" style="width: 100%">
    <el-option
      v-for="folder in folders"
      :key="folder.id"
      :label="getFolderDisplayName(folder)"  <!-- 使用新函数 -->
      :value="folder.id"
    />
  </el-select>
</el-form-item>
```

**修改 2：** 添加 `getFolderDisplayName` 函数

```javascript
// 获取文件夹显示名称（包含层级路径）
function getFolderDisplayName(folder) {
  if (!folder) return '未分类';
  
  // 如果有 path 属性，优先使用
  if (folder.path) {
    return folder.path;
  }
  
  // 如果有 parentId，尝试构建层级路径
  if (folder.parentId) {
    const parent = props.folders.find(f => f.id === folder.parentId);
    if (parent) {
      return `${getFolderDisplayName(parent)} / ${folder.name}`;
    }
  }
  
  // 否则直接返回名称
  return folder.name;
}
```

**改进点：**
1. ✅ 显示完整的层级路径（如："工作 / 项目A"）
2. ✅ 优先使用后端提供的 `path` 字段
3. ✅ 递归构建路径，支持任意层级
4. ✅ 用户可以清楚地区分不同层级的同名文件夹

**显示效果：**
```
文件夹结构：
- 工作
  - 项目A
- 个人
  - 项目A

下拉框显示：
- 工作
- 工作 / 项目A        ← 清晰！
- 个人
- 个人 / 项目A        ← 可以区分！
```

## 技术细节

### 预设选项的定义

后端定义了两套预设选项，用于过滤：

**分类（中英文）：**
```javascript
const predefinedCategories = [
  // 中文分类
  '写作', '编程', '翻译', '分析', '创意',
  '客户服务', '产品文档', '市场营销', '教育培训', '其他',
  // 英文分类（兼容老数据）
  'writing', 'coding', 'translation', 'analysis', 'creative',
  'customer-service', 'documentation', 'marketing', 'education', 'other'
];
```

**AI 模型：**
```javascript
const predefinedModels = [
  'general', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5',
  'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
  'gemini-pro', 'gemini-ultra', 'wenxin', 'tongyi',
  'chatglm', 'xinghuo', 'claude', 'gemini', 'chatgpt'
];
```

### 文件夹路径的优先级

`getFolderDisplayName` 函数的处理逻辑：

1. **首选方案**：使用后端提供的 `path` 字段
   - 如果后端已经计算好路径，直接使用

2. **备选方案**：通过 `parentId` 递归构建
   - 适用于后端没有提供 `path` 字段的情况
   - 递归查找父文件夹并拼接名称

3. **兜底方案**：直接返回文件夹名称
   - 用于根级别文件夹（没有 parentId）

## 测试验证

### 测试场景 1：自定义选项不重复

1. ✅ 创建新提示词
2. ✅ 选择预设分类"写作"
3. ✅ 选择预设模型"GPT-4"
4. ✅ 保存
5. ✅ 再次打开编辑器
6. ✅ 验证下拉框中：
   - 预设分类中有"写作"
   - 自定义分类中**没有**"写作"
7. ✅ 创建真正的自定义分类"我的分类"
8. ✅ 保存后验证：
   - 预设分类中有标准选项
   - 自定义分类中**只有**"我的分类"

### 测试场景 2：文件夹层级显示

1. ✅ 创建文件夹结构：
   ```
   - 工作
     - 项目A
       - 子项目1
   - 个人
     - 项目A
   ```
2. ✅ 打开编辑器
3. ✅ 验证文件夹下拉框显示：
   ```
   - 工作
   - 工作 / 项目A
   - 工作 / 项目A / 子项目1
   - 个人
   - 个人 / 项目A
   ```
4. ✅ 选择"工作 / 项目A"
5. ✅ 保存后验证提示词确实在正确的文件夹中

## 相关文件

### 修改的文件：
- `backend/src/controllers/promptController.js` - getCustomOptions 方法
- `frontend/src/views/tools/productivity/components/PromptEditor.vue` - 添加 getFolderDisplayName 函数

### 依赖的模型：
- `backend/src/models/PromptTemplate.js` - 提示词模型
- `backend/src/models/PromptFolder.js` - 文件夹模型

## 注意事项

### 1. 添加新预设选项

如果将来需要添加新的预设分类或模型，需要同时更新：
1. **前端** - `PromptEditor.vue` 中的 `el-option` 列表
2. **后端** - `promptController.js` 中的 `predefinedCategories` 和 `predefinedModels` 数组

### 2. 国际化支持

当前代码同时支持中英文分类名称，这是为了兼容老数据。如果未来需要完整的国际化支持，建议：
- 使用分类 ID 而不是名称作为值
- 在前端进行翻译显示

### 3. 性能优化

`getFolderDisplayName` 使用递归查找父文件夹，在文件夹层级很深时可能有性能影响。优化建议：
- 后端在 `getFolderTree` API 中计算并返回 `path` 字段
- 前端优先使用后端提供的 `path`，避免递归计算

## 总结

通过这两个修复：
1. ✅ 解决了自定义选项重复显示预设选项的问题
2. ✅ 改进了文件夹选择器，支持显示完整层级路径
3. ✅ 提升了用户体验，界面更清晰易用
4. ✅ 代码更加健壮，支持任意层级的文件夹结构

这些改进使得 AI 提示词管理系统更加专业和易用！
