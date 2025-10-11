# Phase 6 优化补丁说明

## 📋 需要优化的问题

### 1. ✅ 后端验证错误需要提供详细信息

**问题**：
```
ValidationError: PromptTemplate validation failed: title: 标题至少3个字符
```
只返回 500 错误，前端无法获知具体哪个字段出错。

**解决方案**：
已在 `promptController.js` 的 `createPrompt` 和 `updatePrompt` 方法中添加了详细的 ValidationError 处理。

**返回格式**：
```json
{
  "code": 400,
  "message": "数据验证失败",
  "errors": {
    "title": "标题至少3个字符",
    "content": "内容至少10个字符"
  },
  "details": "title: 标题至少3个字符; content: 内容至少10个字符"
}
```

---

### 2. 🔄 AI模型筛选需要参考分类筛选

**需求**：
AI模型筛选框应该像分类筛选框一样，支持：
- 预设模型选项
- 自定义模型选项（从数据库动态加载）
- 分组显示

**实现方案**：

#### 2.1 后端：获取自定义模型列表

在 `promptController.js` 或 `customOptionsController.js` 中添加接口：

```javascript
// 获取系统中使用过的所有自定义AI模型
static async getCustomAIModels(req, res) {
  try {
    const userId = req.user ? req.user._id : null;
    
    // 获取所有不同的 aiModel 值
    const models = await PromptTemplate.distinct('aiModel', {
      isDeleted: false,
      $or: userId ? [
        { visibility: 'public' },
        { userId }
      ] : [
        { visibility: 'public' }
      ]
    });
    
    // 过滤掉预设的模型，只返回自定义模型
    const presetModels = ['gpt-4', 'gpt-3.5', 'claude', 'general'];
    const customModels = models.filter(m => !presetModels.includes(m));
    
    res.json({
      code: 200,
      data: {
        models: customModels
      }
    });
  } catch (error) {
    logger.error('获取自定义AI模型失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败',
      error: error.message
    });
  }
}
```

#### 2.2 前端：动态加载模型列表

在 `PromptVaultWorking.vue` 中添加：

```javascript
const customAIModels = ref([]);

async function loadCustomAIModels() {
  try {
    const response = await request({
      url: '/tools/prompt-vault/custom-models',  // 或 /api/prompt/custom-models
      method: 'get'
    });
    
    if (response.code === 200) {
      customAIModels.value = response.data.models || [];
    }
  } catch (error) {
    console.error('加载自定义AI模型失败:', error);
  }
}

// 在 onMounted 中调用
onMounted(() => {
  loadCustomCategories();
  loadCustomAIModels(); // 新增
  loadData();
});
```

#### 2.3 更新筛选框 HTML

```vue
<el-select v-model="filters.aiModel" clearable placeholder="AI模型" @change="handleSearch"
  class="filter-select">
  <el-option label="全部模型" value="" />
  
  <!-- 预设模型 -->
  <el-option-group label="预设模型">
    <el-option label="GPT-4" value="gpt-4" />
    <el-option label="GPT-3.5" value="gpt-3.5" />
    <el-option label="Claude" value="claude" />
    <el-option label="通用" value="general" />
  </el-option-group>
  
  <!-- 自定义模型 -->
  <el-option-group label="自定义模型" v-if="customAIModels.length > 0">
    <el-option 
      v-for="model in customAIModels" 
      :key="model" 
      :label="model" 
      :value="model" 
    />
  </el-option-group>
</el-select>
```

---

### 3. 🔍 搜索功能需要支持精确和模糊搜索

**需求**：
- 默认：模糊搜索（全文搜索）
- 特殊语法：精确搜索（完全匹配）

**实现方案**：

#### 3.1 搜索语法设计

```
普通搜索：    写作提示词       （模糊匹配）
精确搜索：    "写作提示词"     （完全匹配，使用双引号）
标题搜索：    title:写作       （只搜索标题）
内容搜索：    content:代码     （只搜索内容）
标签搜索：    tag:编程         （搜索标签）
组合搜索：    title:写作 tag:编程（多条件组合）
```

#### 3.2 后端实现

在 `promptController.js` 的 `getPrompts` 方法中：

```javascript
// 搜索逻辑增强
if (search) {
  const trimmedSearch = search.trim();
  
  // 检查是否是精确搜索（双引号包裹）
  if (trimmedSearch.startsWith('"') && trimmedSearch.endsWith('"')) {
    // 精确搜索：完全匹配
    const exactTerm = trimmedSearch.slice(1, -1);
    query.$or = [
      { title: { $regex: `^${exactTerm}$`, $options: 'i' } },
      { description: { $regex: `^${exactTerm}$`, $options: 'i' } },
      { content: { $regex: `^${exactTerm}$`, $options: 'i' } }
    ];
  }
  // 检查是否是字段搜索
  else if (trimmedSearch.includes(':')) {
    const searchQueries = [];
    const parts = trimmedSearch.split(' ');
    
    parts.forEach(part => {
      const [field, value] = part.split(':');
      if (value) {
        switch(field.toLowerCase()) {
          case 'title':
            searchQueries.push({ title: { $regex: value, $options: 'i' } });
            break;
          case 'content':
            searchQueries.push({ content: { $regex: value, $options: 'i' } });
            break;
          case 'tag':
            searchQueries.push({ tags: { $in: [new RegExp(value, 'i')] } });
            break;
          case 'category':
            searchQueries.push({ category: { $regex: value, $options: 'i' } });
            break;
        }
      }
    });
    
    if (searchQueries.length > 0) {
      query.$and = searchQueries;
    }
  }
  // 默认：模糊搜索（全文搜索）
  else {
    query.$text = { $search: trimmedSearch };
  }
}
```

#### 3.3 前端搜索提示

在搜索框下方添加提示：

```vue
<el-input v-model="filters.search" placeholder="搜索提示词..." clearable class="search-input"
  @keyup.enter="handleSearch">
  <template #prefix>
    <el-icon>
      <Search />
    </el-icon>
  </template>
  <template #append>
    <el-button @click="handleSearch">搜索</el-button>
  </template>
</el-input>

<!-- 搜索提示 -->
<div class="search-hints" v-if="showSearchHints">
  <el-popover placement="bottom" :width="350" trigger="hover">
    <template #reference>
      <el-link :underline="false" type="info" style="font-size: 12px;">
        <el-icon><QuestionFilled /></el-icon> 搜索技巧
      </el-link>
    </template>
    <div class="search-tips">
      <p><strong>普通搜索：</strong>写作提示词（模糊匹配）</p>
      <p><strong>精确搜索：</strong>"写作提示词"（完全匹配）</p>
      <p><strong>标题搜索：</strong>title:写作</p>
      <p><strong>内容搜索：</strong>content:代码</p>
      <p><strong>标签搜索：</strong>tag:编程</p>
      <p><strong>组合搜索：</strong>title:写作 tag:编程</p>
    </div>
  </el-popover>
</div>
```

---

## 🛠️ 实施步骤

### 步骤 1：后端错误处理（✅ 已完成）
- [x] 修改 `promptController.js` 的 `createPrompt` 方法
- [x] 修改 `promptController.js` 的 `updatePrompt` 方法
- [x] 返回详细的 ValidationError 信息

### 步骤 2：前端错误显示
- [ ] 在 `PromptEditor.vue` 中捕获并显示详细错误
- [ ] 使用 ElMessage 或 ElNotification 显示多行错误信息
- [ ] 高亮显示出错的表单字段

### 步骤 3：AI模型筛选增强
- [ ] 后端：添加获取自定义模型的接口
- [ ] 前端：加载并显示自定义模型列表
- [ ] 前端：更新筛选框为分组样式

### 步骤 4：搜索功能增强
- [ ] 后端：实现多种搜索模式
- [ ] 前端：添加搜索提示和帮助
- [ ] 测试各种搜索场景

---

## 📝 代码修改清单

### 已修改的文件
1. `backend/src/controllers/promptController.js`
   - `createPrompt` 方法（+18 行）
   - `updatePrompt` 方法（+18 行）

### 待修改的文件
1. `backend/src/controllers/promptController.js` 或新建 API
   - 添加 `getCustomAIModels` 方法

2. `backend/src/routes/promptRoutes.js`
   - 添加路由：`GET /custom-models`

3. `frontend/src/views/tools/productivity/PromptVaultWorking.vue`
   - 添加 `customAIModels` 状态
   - 添加 `loadCustomAIModels` 方法
   - 更新 AI 模型筛选框 HTML
   - 添加搜索提示组件

4. `frontend/src/views/tools/productivity/components/PromptEditor.vue`
   - 增强错误处理和显示
   - 高亮出错字段

---

## 🧪 测试用例

### 验证错误测试
```
1. 创建标题少于3个字符的提示词
   预期：显示 "title: 标题至少3个字符"

2. 创建内容少于10个字符的提示词
   预期：显示 "content: 内容至少10个字符"

3. 同时违反多个规则
   预期：显示所有错误信息，用分号分隔
```

### AI模型筛选测试
```
1. 创建使用自定义模型的提示词
2. 刷新页面
3. 查看 AI 模型筛选框
   预期：在"自定义模型"分组中看到新模型
```

### 搜索功能测试
```
1. 普通搜索：写作
   预期：返回标题、描述、内容中包含"写作"的所有提示词

2. 精确搜索："写作助手"
   预期：只返回完全匹配"写作助手"的提示词

3. 字段搜索：title:写作
   预期：只返回标题中包含"写作"的提示词

4. 组合搜索：title:写作 tag:编程
   预期：返回标题包含"写作"且标签包含"编程"的提示词
```

---

## 📊 优先级

| 优化项 | 优先级 | 状态 | 预计时间 |
|--------|--------|------|----------|
| 1. 详细错误信息 | 🔴 高 | ✅ 后端完成 | 前端30分钟 |
| 2. AI模型筛选 | 🟡 中 | ⏳ 待开始 | 1小时 |
| 3. 高级搜索 | 🟢 低 | ⏳ 待开始 | 1.5小时 |

---

## 💡 补充建议

### 用户体验优化
1. **表单实时验证**：在用户输入时就提示字段错误
2. **错误字段高亮**：出错的输入框标红并显示错误信息
3. **搜索历史**：记录最近的搜索关键词
4. **搜索建议**：输入时显示建议的搜索关键词

### 性能优化
1. **搜索防抖**：避免每次输入都触发搜索
2. **结果缓存**：缓存最近的搜索结果
3. **分页优化**：大结果集分页加载

---

**文档创建时间：2025-10-11**  
**状态：部分完成，待继续实施**
