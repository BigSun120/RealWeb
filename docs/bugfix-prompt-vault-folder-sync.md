# AI 提示词管理 Bug 修复文档

## 修复日期
2025-10-10

## 问题描述

### 问题 1: 文件夹同步问题
**现象：**
当用户在 AI 提示词管理中编辑提示词卡片并更改文件夹后：
1. 文件夹树中的计数没有更新
2. 如果当前正在查看该文件夹，提示词列表没有刷新
3. 文件夹树的选中状态不正确

**原因：**
`handlePromptSaved()` 函数只是简单地关闭编辑器和重新加载数据，没有考虑文件夹变化的情况。

### 问题 2: Runtime directive 警告
**现象：**
控制台出现警告：
```
Runtime directive used on component with non-element root node. The directives will not function as intended.
```

**原因：**
在 Vue 3 中，组件根节点上使用 `v-if`、`v-loading` 等指令时，如果组件条件不满足或有多个根节点（fragment），会导致指令无法正常工作并产生警告。

## 修复方案

### 修复 1: 文件夹同步问题

#### 修改文件：`frontend/src/views/tools/productivity/PromptVault.vue`

**修改前：**
```javascript
function handlePromptSaved() {
  editorVisible.value = false;
  loadData();
}
```

**修改后：**
```javascript
async function handlePromptSaved(updatedPrompt) {
  editorVisible.value = false;
  // 重新加载数据以确保文件夹计数和提示词列表同步
  await loadData();
  
  // 如果提示词的文件夹发生了变化，需要特殊处理
  if (updatedPrompt && currentPrompt.value) {
    const oldFolderId = currentPrompt.value.folderId;
    const newFolderId = updatedPrompt.folderId;
    
    // 如果文件夹发生变化且当前正在查看某个文件夹
    if (oldFolderId !== newFolderId && currentFolderId.value) {
      // 如果当前查看的是旧文件夹或新文件夹，刷新列表
      if (currentFolderId.value === oldFolderId || currentFolderId.value === newFolderId) {
        await loadPrompts();
      }
    }
  }
}
```

#### 修改文件：`frontend/src/views/tools/productivity/components/PromptEditor.vue`

**修改前：**
```javascript
if (isEdit.value) {
  await promptService.updatePrompt(props.prompt.id, data);
  ElMessage.success('更新成功');
} else {
  await promptService.createPrompt(data);
  ElMessage.success('创建成功');
}

emit('saved');
```

**修改后：**
```javascript
let result;
if (isEdit.value) {
  result = await promptService.updatePrompt(props.prompt.id, data);
  ElMessage.success('更新成功');
} else {
  result = await promptService.createPrompt(data);
  ElMessage.success('创建成功');
}

// 发出 saved 事件，带上更新后的数据（包含 folderId）
emit('saved', {
  ...data,
  ...(result?.data || {}),
  id: props.prompt?.id || result?.data?.id
});
```

**改进点：**
1. ✅ `handlePromptSaved` 现在接收更新后的数据作为参数
2. ✅ 比较新旧文件夹 ID，判断是否需要额外刷新
3. ✅ 如果当前查看的文件夹受影响，自动刷新列表
4. ✅ 确保文件夹树的计数正确更新

### 修复 2: Runtime directive 警告

#### 修改文件 1：`frontend/src/components/PublicNoticeBanner.vue`

**修改前：**
```vue
<template>
  <div v-if="visibleNotices.length && placements.includes('banner')" class="public-notice-banner">
    <!-- ... -->
  </div>
</template>
```

**修改后：**
```vue
<template>
  <div v-show="visibleNotices.length && placements.includes('banner')" class="public-notice-banner">
    <!-- ... -->
  </div>
</template>
```

#### 修改文件 2：`frontend/src/components/EmailVerificationBanner.vue`

**修改前：**
```vue
<template>
  <div v-if="shouldShow" class="email-verification-banner">
    <!-- ... -->
  </div>
</template>
```

**修改后：**
```vue
<template>
  <div v-show="shouldShow" class="email-verification-banner">
    <!-- ... -->
  </div>
</template>
```

#### 修改文件 3：`frontend/src/components/PublicNoticeDropdown.vue`

**修改前：**
```vue
<template>
  <el-dropdown v-if="placements.includes('dropdown')" trigger="click">
    <!-- ... -->
  </el-dropdown>
</template>
```

**修改后：**
```vue
<template>
  <el-dropdown v-show="placements.includes('dropdown')" trigger="click">
    <!-- ... -->
  </el-dropdown>
</template>
```

#### 修改文件 4：`frontend/src/views/tools/productivity/components/ShareDialog.vue`

**修改前：**
```vue
<div class="share-options" v-loading="generating">
  <div v-if="shareUrl" class="share-result">
    <!-- ... -->
  </div>
</div>
```

**修改后：**
```vue
<div class="share-options">
  <div v-if="shareUrl" v-loading="generating" class="share-result">
    <!-- ... -->
  </div>
</div>
```

**改进点：**
1. ✅ 将根节点的 `v-if` 改为 `v-show`，避免组件完全不渲染
2. ✅ 将 `v-loading` 指令移到内部元素上，确保指令可以正常工作
3. ✅ 消除控制台警告，提升用户体验

## v-if vs v-show 的选择

**使用 `v-show` 的场景（本次修复采用）：**
- ✅ 频繁切换显示/隐藏
- ✅ 组件初始化成本较高
- ✅ Banner 类组件（需要保持 DOM 结构）

**使用 `v-if` 的场景：**
- 条件很少改变
- 组件较重，不需要时完全销毁
- 需要真正的条件渲染（如权限控制）

## 测试验证

### 测试场景 1: 文件夹同步
1. ✅ 创建一个新提示词并分配到文件夹 A
2. ✅ 编辑该提示词，将其移动到文件夹 B
3. ✅ 保存后验证：
   - 文件夹 A 的计数减 1
   - 文件夹 B 的计数加 1
   - 如果当前查看文件夹 A，列表自动刷新
   - 如果当前查看文件夹 B，列表自动刷新

### 测试场景 2: 控制台警告
1. ✅ 打开浏览器开发者工具
2. ✅ 浏览各个页面，特别是包含以下组件的页面：
   - AI 提示词管理（PromptVault）
   - 首页（PublicNoticeBanner）
   - 用户中心（EmailVerificationBanner）
3. ✅ 验证控制台没有 "Runtime directive" 警告

## 注意事项

1. **性能考虑**：使用 `v-show` 会保持 DOM 元素，即使不可见也会占用内存。对于 Banner 类组件，这是可以接受的权衡。

2. **向后兼容**：这些修改不会影响现有功能，只是改善了内部实现和用户体验。

3. **Future Improvement**：
   - 可以考虑在文件夹树中添加实时更新功能
   - 可以添加文件夹拖放功能，让用户更方便地移动提示词
   - 可以优化加载逻辑，避免不必要的全量刷新

## 相关文件清单

### 修改的文件
- `frontend/src/views/tools/productivity/PromptVault.vue`
- `frontend/src/views/tools/productivity/components/PromptEditor.vue`
- `frontend/src/components/PublicNoticeBanner.vue`
- `frontend/src/components/EmailVerificationBanner.vue`
- `frontend/src/components/PublicNoticeDropdown.vue`
- `frontend/src/views/tools/productivity/components/ShareDialog.vue`

### 依赖的文件（无需修改）
- `frontend/src/services/promptService.js`
- `backend/src/controllers/promptController.js`
- `backend/src/models/PromptFolder.js`

## 总结

通过这次修复：
1. ✅ 解决了 AI 提示词管理中文件夹同步的问题
2. ✅ 消除了所有 "Runtime directive" 控制台警告
3. ✅ 提升了用户体验和代码质量
4. ✅ 没有引入任何破坏性变更

这些改进使得 AI 提示词管理系统更加稳定和用户友好。
