# Phase 2.2 增强：提示词对话框编辑功能

## 概述
本次增强为 PromptDialog 组件添加了完整的编辑功能，允许用户在生成提示词后进行修改和优化。

## 完成时间
2025-10-12

## 功能特性

### 1. 提示词实时编辑
- **编辑按钮**：在查看模式下显示"编辑"按钮
- **编辑模式**：点击编辑按钮后，提示词内容变为可编辑的文本框
- **完成按钮**：编辑模式下显示"完成"按钮，点击后保存并返回查看模式
- **字符计数**：实时显示提示词的字符数量

### 2. 编辑状态管理
- 使用 Vue3 Composition API 的 `ref` 和 `watch` 进行响应式状态管理
- `isEditing` 状态控制编辑/查看模式切换
- `editablePrompt` 保存可编辑的提示词内容

### 3. 数据同步
- 监听 `props.prompt` 的变化，自动同步到 `editablePrompt`
- 复制功能使用编辑后的内容，确保用户复制的是最新版本
- 关闭对话框时自动退出编辑模式

## 技术实现

### 组件结构
```
PromptDialog.vue
├── template - 对话框UI
│   ├── 提示说明区
│   ├── 提示词展示/编辑区
│   │   ├── 标题栏（编辑/完成按钮 + 字符计数）
│   │   └── 内容区（查看pre/编辑textarea切换）
│   └── 底部操作按钮（关闭 + 复制）
├── script setup - 逻辑实现
│   ├── 响应式状态定义
│   ├── 事件处理函数
│   └── 数据监听
└── style scoped - 样式定义
```

### 关键代码片段

#### 响应式状态和监听
```javascript
import { ref, watch } from 'vue';

const isEditing = ref(false);
const editablePrompt = ref(props.prompt);

// 监听 prompt 变化，更新可编辑内容
watch(() => props.prompt, (newVal) => {
  editablePrompt.value = newVal;
  isEditing.value = false;
});
```

#### 编辑控制函数
```javascript
// 开始编辑
const handleEdit = () => {
  isEditing.value = true;
};

// 完成编辑
const handleSaveEdit = () => {
  isEditing.value = false;
  ElMessage.success('编辑完成');
};
```

#### 复制功能增强
```javascript
const handleCopy = async () => {
  const textToCopy = editablePrompt.value; // 使用编辑后的内容
  try {
    await navigator.clipboard.writeText(textToCopy);
    ElMessage.success('提示词已复制到剪贴板');
  } catch (error) {
    // 降级方案...
  }
};
```

#### UI切换实现
```vue
<template>
  <!-- 标题栏 -->
  <div class="header-actions">
    <el-button
      v-if="!isEditing"
      size="small"
      :icon="Edit"
      @click="handleEdit"
    >
      编辑
    </el-button>
    <el-button
      v-else
      size="small"
      type="primary"
      :icon="Check"
      @click="handleSaveEdit"
    >
      完成
    </el-button>
    <el-tag size="small" type="success">
      {{ editablePrompt.length }} 字符
    </el-tag>
  </div>

  <!-- 内容区 -->
  <div class="prompt-content">
    <el-input
      v-if="isEditing"
      v-model="editablePrompt"
      type="textarea"
      :rows="15"
      placeholder="编辑提示词..."
    />
    <pre v-else>{{ editablePrompt }}</pre>
  </div>
</template>
```

## 用户体验改进

### 1. 直观的编辑流程
```
查看模式 → 点击"编辑" → 编辑模式 → 点击"完成" → 查看模式
```

### 2. 实时反馈
- 字符计数实时更新
- 编辑完成时显示成功提示
- 复制成功时显示确认提示

### 3. 安全保障
- 关闭对话框时自动退出编辑模式
- Prompt更新时自动同步并退出编辑状态
- 防止意外数据丢失

## 样式设计

### 布局优化
```css
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

### 响应式支持
- 移动端优化：缩小文本框高度
- 自定义滚动条：统一视觉风格
- 合理的内边距和间距

## 测试要点

### 功能测试
1. ✅ 编辑按钮点击切换到编辑模式
2. ✅ 完成按钮点击保存并返回查看模式
3. ✅ 编辑内容能正确保存和显示
4. ✅ 字符计数准确更新
5. ✅ 复制功能使用编辑后的内容

### 边界测试
1. ✅ 编辑过程中关闭对话框，再次打开恢复原始内容
2. ✅ Props.prompt更新时自动同步到editablePrompt
3. ✅ 长文本编辑时滚动正常
4. ✅ 空内容编辑时不报错

### 集成测试
1. ✅ 在WorldviewEditor中生成提示词并编辑
2. ✅ 在CharacterManager中生成提示词并编辑
3. ✅ 编辑后复制到剪贴板功能正常

## 后续优化建议

### 1. 持久化编辑内容（可选）
```javascript
// 可以将编辑的内容emit给父组件保存
const emit = defineEmits(['update:modelValue', 'update:prompt']);

const handleSaveEdit = () => {
  isEditing.value = false;
  emit('update:prompt', editablePrompt.value);
  ElMessage.success('编辑完成');
};
```

### 2. 预定义模板选择（规划中）
- 集成AI提示词管理工具箱
- 支持从预定义模板选择和组合
- 提供常用提示词片段快速插入

### 3. 历史版本管理（未来考虑）
- 记录编辑历史
- 支持撤销/重做
- 版本对比功能

## 相关文件

### 修改的文件
- `frontend/src/views/tools/productivity/drama/components/PromptDialog.vue`

### 依赖的组件
- Element Plus Dialog
- Element Plus Button, Input, Tag, Alert
- Element Plus Icons: CopyDocument, Edit, Check

## 注意事项

1. **编辑状态隔离**：editablePrompt与props.prompt分离，避免直接修改props
2. **响应式更新**：使用watch监听确保数据同步
3. **用户体验**：编辑模式使用textarea，查看模式使用pre标签保持格式
4. **兼容性**：复制功能提供降级方案，兼容不支持Clipboard API的浏览器

## 总结

本次增强成功为PromptDialog组件添加了完整的编辑功能，提升了用户体验和工具的实用性。用户现在可以：
- 灵活编辑生成的提示词
- 实时查看字符数
- 一键复制编辑后的内容

这为后续集成AI提示词管理工具箱和模板选择功能奠定了基础。
