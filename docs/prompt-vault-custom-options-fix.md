# AI 提示词工具 - 自定义选项管理修复

## 问题描述

用户在新建提示词时添加自定义的分类/模型/标签后，打开"管理自定义选项"对话框时，这些自定义选项显示为空。

### 根本原因

之前的实现错误地使用了 **localStorage** 来存储自定义选项，但实际上提示词数据是保存在**服务器数据库**中的。这导致：
1. 自定义选项尝试从 localStorage 读取，但数据实际存储在数据库中
2. 管理对话框无法正确显示用户创建的自定义分类和模型
3. 数据不一致和界面连接问题

## 解决方案

### 1. 后端改动

#### 新增 API 端点

**路径**: `GET /api/tools/prompt-vault/options`

**功能**: 从用户的提示词数据中动态提取自定义选项

**返回数据**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "categories": ["数据科学", "产品设计"],  // 用户自定义的分类
    "models": ["gpt-4o", "claude-3.5-sonnet"],  // 用户自定义的AI模型
    "tags": ["高频使用", "工作", "学习"]       // 用户使用过的标签（按频率排序）
  }
}
```

**实现逻辑**:
- 使用 MongoDB 的 `distinct()` 方法提取用户所有提示词中使用的唯一分类和模型
- 排除预定义的分类和模型，只返回自定义的
- 使用聚合管道 (`aggregate`) 提取所有标签，按使用频率排序，返回前50个

**文件**: 
- `backend/src/controllers/promptController.js` - 添加 `getCustomOptions()` 方法
- `backend/src/routes/prompts.js` - 添加路由

### 2. 前端改动

#### PromptEditor.vue

**改动**:
- 移除所有 localStorage 相关代码
- 添加 `loadCustomOptions()` 函数，从服务器获取自定义选项
- 在对话框打开时自动加载自定义选项
- 移除 `@change` 事件处理器（分类和模型选择器）
- 数据现在直接保存到数据库，无需客户端额外处理

**关键代码**:
```javascript
// 从服务器加载自定义选项
async function loadCustomOptions() {
  try {
    const response = await request({
      url: '/tools/prompt-vault/options',
      method: 'get'
    });

    if (response.code === 200) {
      customCategories.value = response.data.categories || [];
      customModels.value = response.data.models || [];
    }
  } catch (error) {
    console.error('加载自定义选项失败:', error);
  }
}

// 在对话框打开时加载
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadCustomOptions();
  }
});
```

#### CustomOptionsManager.vue

**改动**:
- 将数据源从 localStorage 改为服务器 API
- 更新 `loadData()` 函数为异步，调用后端 API
- 简化 `handleSave()` - 由于数据从数据库动态提取，删除操作只影响当前显示
- 更新 UI 文本，说明这些选项是从数据库自动提取的
- 修改删除确认对话框，解释删除只是临时隐藏

**关键代码**:
```javascript
// 从服务器加载数据
async function loadData() {
  try {
    const request = (await import('@/utils/request')).default;
    const response = await request({
      url: '/tools/prompt-vault/options',
      method: 'get'
    });

    if (response.code === 200) {
      localCategories.value = response.data.categories || [];
      localModels.value = response.data.models || [];
      recentTags.value = response.data.tags || [];
    }
  } catch (error) {
    console.error('从服务器加载数据失败:', error);
    ElMessage.error('加载数据失败');
  }
}
```

#### PromptVaultWorking.vue

**改动**:
- 更新 `loadCustomCategories()` 从服务器获取数据
- 在 `handlePromptSaved()` 中重新加载自定义分类，确保筛选器更新
- 在 `openOptionsManager()` 中重新加载数据，确保管理器显示最新数据

## 工作流程

### 创建提示词时
1. 用户在 PromptEditor 中输入自定义分类（如"数据科学"）或模型（如"gpt-4o"）
2. 点击"创建"按钮
3. 数据（包括自定义分类和模型）直接保存到数据库
4. 保存成功后，父组件调用 `loadCustomCategories()` 刷新筛选器选项

### 查看自定义选项时
1. 用户点击"管理选项"按钮
2. 打开 CustomOptionsManager 对话框
3. 对话框自动调用后端 API `/api/tools/prompt-vault/options`
4. 后端从数据库中动态提取用户所有提示词使用的自定义分类/模型/标签
5. 返回结果显示在对话框中

### 删除自定义选项
- **重要**: 删除操作只是从当前显示列表中临时移除，不影响数据库
- 如果用户的提示词仍在使用该分类/模型，下次打开对话框时会再次显示
- 这种设计确保数据一致性：自定义选项完全由数据库中的实际使用情况决定

## 优势

### 数据一致性
- 单一数据源（数据库），避免 localStorage 和数据库不同步
- 自动同步：自定义选项始终反映数据库中的实际使用情况

### 用户体验
- 自动化：无需手动管理自定义选项，系统自动从提示词中提取
- 跨设备同步：数据存储在服务器，不同设备间自动同步
- 智能排序：标签按使用频率排序，常用标签排在前面

### 代码质量
- 简化客户端逻辑，移除复杂的 localStorage 管理代码
- 统一数据流：所有数据都通过 API 与服务器交互
- 更易维护和扩展

## 测试指南

### 测试步骤

1. **创建带自定义选项的提示词**
   ```
   - 登录系统
   - 点击"新建提示词"
   - 在"分类"字段输入自定义分类，如"数据科学"
   - 在"AI模型"字段输入自定义模型，如"gpt-4o"
   - 添加标签："数据分析", "Python"
   - 填写其他必填字段并保存
   ```

2. **验证筛选器更新**
   ```
   - 在主界面的分类筛选器中查看
   - 应该能看到"数据科学"出现在"自定义分类"分组中
   ```

3. **打开管理对话框**
   ```
   - 点击页面头部的"管理选项"按钮
   - 查看控制台日志，应该看到：
     ===== CustomOptionsManager: 开始从服务器加载数据 =====
     从服务器加载的自定义分类 (数量: 1): ["数据科学"]
     从服务器加载的自定义AI模型 (数量: 1): ["gpt-4o"]
     从服务器加载的标签 (数量: 2): ["数据分析", "Python"]
   ```

4. **验证删除功能**
   ```
   - 在管理对话框中，点击某个自定义分类的"删除"按钮
   - 应该显示提示："删除分类'xxx'只会从当前显示列表移除..."
   - 确认后，该项从列表中消失
   - 关闭对话框，重新打开
   - 如果数据库中仍有提示词使用该分类，它会再次出现
   ```

5. **多提示词测试**
   ```
   - 创建多个提示词，使用不同的自定义分类和模型
   - 打开管理对话框
   - 验证所有自定义选项都正确显示
   - 验证标签按使用频率排序
   ```

### 预期结果

✅ 新建提示词时添加的自定义分类/模型会立即出现在筛选器中  
✅ 管理对话框显示所有使用过的自定义选项  
✅ 数据在不同设备/浏览器间同步  
✅ 删除操作不影响已有提示词  
✅ 控制台没有错误日志  

## 注意事项

1. **需要登录**: 自定义选项 API 需要用户认证，未登录用户无法访问
2. **性能**: 对于大量提示词的用户，聚合查询可能需要优化（当前限制返回前50个标签）
3. **缓存**: 可以考虑在前端添加缓存机制，避免频繁请求 API
4. **预定义列表**: 后端和前端的预定义分类/模型列表需要保持一致

## 相关文件

### 后端
- `backend/src/controllers/promptController.js`
- `backend/src/routes/prompts.js`

### 前端
- `frontend/src/views/tools/productivity/components/PromptEditor.vue`
- `frontend/src/views/tools/productivity/components/CustomOptionsManager.vue`
- `frontend/src/views/tools/productivity/PromptVaultWorking.vue`

## 总结

这次修复从根本上解决了自定义选项管理的架构问题，将数据源从客户端 localStorage 迁移到服务器数据库，实现了：
- ✅ 数据一致性和可靠性
- ✅ 跨设备同步
- ✅ 自动化管理
- ✅ 更好的用户体验

现在自定义选项完全由用户实际创建的提示词决定，系统自动提取和管理，用户无需手动维护。
