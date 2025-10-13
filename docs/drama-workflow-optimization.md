# Phase 2.5 - 工作流程优化开发文档

## 🎯 优化目标

解决用户创作流程中的**效率瓶颈**，将手动逐个录入改为**批量智能生成**。

---

## ✅ 已完成的底层功能

### 1. 提示词模板扩展 (`promptTemplates.js`)

#### 新增函数：

**✅ `generateBatchCharactersPrompt(data)`**
- 功能：基于世界观批量生成所有角色的提示词
- 输入：项目信息、世界观、推荐角色数量
- 输出：格式化的批量角色生成提示词
- 格式：使用【角色1】【角色2】标记，包含完整角色信息模板

**✅ `generateCompleteOutlinePrompt(data)`**
- 功能：AI智能生成完整三幕大纲（含12-15个节点）
- 输入：项目信息、世界观、角色列表
- 输出：格式化的完整大纲提示词
- 格式：使用【第X幕：标题】【节点X】标记

### 2. AI解析器增强 (`aiResponseParser.js`)

#### 新增函数：

**✅ `parseBatchCharactersResponse(text)`**
- 功能：解析批量角色AI回答
- 识别：【角色1】【角色2】...【角色N】格式
- 返回：角色对象数组
- 字段提取：姓名、年龄、性别、角色定位、描述、性格特点、背景、动机、人际关系

**✅ `parseOutlineResponse(text)`**
- 功能：解析完整大纲AI回答
- 识别：【第X幕：标题】和【节点X】格式
- 返回：包含三幕结构和所有节点的大纲对象
- 智能分配：自动将节点按比例分配到三幕（30%:50%:20%）

**✅ `extractCharactersList(text)`**
- 功能：从节点描述中提取涉及角色列表
- 支持：逗号、顿号、空格分隔

---

## 🔧 待实现的UI组件

### 3. CharacterManager 优化

#### 需要添加的功能：

```vue
<!-- 新增按钮 -->
<el-button 
  type="warning" 
  :icon="MagicStick" 
  @click="handleBatchGenerate"
  :disabled="!hasWorldview"
>
  基于世界观生成所有角色
</el-button>

<el-button 
  type="success" 
  :icon="Upload" 
  @click="handleBatchImport"
>
  批量导入角色
</el-button>
```

#### 新增函数：

```javascript
// 批量生成提示词
const handleBatchGenerate = () => {
  const recommendedCount = getRecommendedCharacterCount();
  const prompt = generateBatchCharactersPrompt({
    projectName: projectInfo.name,
    projectType: projectInfo.type,
    worldview,
    recommendedCount
  });
  generatedPrompt.value = prompt;
  showPromptDialog.value = true;
};

// 批量导入
const handleBatchImport = () => {
  showBatchImportDialog.value = true;
};

// 智能推荐角色数量
const getRecommendedCharacterCount = () => {
  const typeMap = {
    '霸道总裁': 6,
    '悬疑推理': 8,
    '甜宠日常': 4,
    '复仇爽剧': 7,
    '古装穿越': 8,
    '职场励志': 6
  };
  return typeMap[projectInfo.type] || 6;
};

// 处理批量导入确认
const handleBatchImportConfirm = (aiText) => {
  const parsedCharacters = parseBatchCharactersResponse(aiText);
  if (parsedCharacters.length > 0) {
    characters.value.push(...parsedCharacters);
    emit('save', characters.value);
    ElMessage.success(`成功导入 ${parsedCharacters.length} 个角色`);
  } else {
    ElMessage.warning('未能解析出角色信息，请检查格式');
  }
};
```

---

### 4. OutlineEditor 优化

#### 需要添加的功能：

```vue
<el-button 
  type="danger" 
  :icon="Sparkles"
  @click="handleAIGenerate"
  :disabled="!hasCharacters"
>
  AI智能生成完整大纲
</el-button>

<el-button 
  type="success" 
  :icon="Upload"
  @click="handleImportOutline"
>
  导入AI生成的大纲
</el-button>
```

#### 新增函数：

```javascript
// AI生成完整大纲
const handleAIGenerate = () => {
  const prompt = generateCompleteOutlinePrompt({
    projectName: projectInfo.name,
    projectType: projectInfo.type,
    episodeCount: projectInfo.episodeCount || 60,
    worldview,
    characters
  });
  generatedPrompt.value = prompt;
  showPromptDialog.value = true;
};

// 导入大纲
const handleImportOutline = () => {
  showImportDialog.value = true;
};

// 处理导入确认
const handleImportConfirm = (aiText) => {
  const parsedOutline = parseOutlineResponse(aiText);
  if (parsedOutline.acts.length > 0) {
    // 合并到现有大纲
    outlineData.value.acts = parsedOutline.acts;
    ElMessage.success(`成功导入大纲，共 ${getTotalPlotPoints()} 个节点`);
  } else {
    ElMessage.warning('未能解析出大纲信息，请检查格式');
  }
};

// 计算总节点数
const getTotalPlotPoints = () => {
  return outlineData.value.acts.reduce((sum, act) => sum + act.plotPoints.length, 0);
};
```

---

### 5. EpisodeManager 优化

#### 实现批量生成功能：

```javascript
// 已有按钮，实现功能
const handleBatchGenerate = () => {
  showBatchDialog.value = true;
};

// 批量生成对话框配置
const batchConfig = ref({
  startEpisode: 1,
  endEpisode: 10,
  generateMode: 'outline' // 'outline' 或 'full'
});

// 生成批量提示词
const generateBatchPrompt = () => {
  const prompt = generateBatchEpisodesPrompt({
    startEpisode: batchConfig.value.startEpisode,
    endEpisode: batchConfig.value.endEpisode,
    totalEpisodes: projectInfo.episodeCount,
    outline: outline,
    characters: characters
  });
  return prompt;
};
```

---

## 📊 优化效果对比

### 优化前（手动流程）：

```
角色创建（6个角色）：
1. 手动添加角色1 → 填表 → 生成提示词 → AI → 粘贴 → 保存
2. 手动添加角色2 → 填表 → 生成提示词 → AI → 粘贴 → 保存
...重复6次
预计时间：30-45分钟

大纲创建（15个节点）：
1. 手动添加节点1 → 填写信息
2. 手动添加节点2 → 填写信息
...重复15次
3. 生成提示词 → AI优化 → 手动调整
预计时间：60-90分钟

分集创建（60集）：
1. 手动添加第1集 → 填写信息
2. 手动添加第2集 → 填写信息
...重复60次
预计时间：120-180分钟

总计：3.5-5.5小时
```

### 优化后（批量流程）：

```
角色创建（6个角色）：
1. 点击「基于世界观生成所有角色」
2. 复制提示词 → AI生成
3. 点击「批量导入角色」→ 粘贴 → 确认
4. 逐个微调（可选）
预计时间：5-10分钟

大纲创建（15个节点）：
1. 点击「AI智能生成完整大纲」
2. 复制提示词 → AI生成
3. 点击「导入AI生成的大纲」→ 粘贴 → 确认
4. 逐个微调节点（可选）
预计时间：10-15分钟

分集创建（60集）：
1. 选择范围（如1-10集）→「批量生成」
2. 复制提示词 → AI生成
3. 批量导入框架
4. 重复6次完成60集框架
5. 逐集丰富内容
预计时间：30-60分钟

总计：45-85分钟
```

**效率提升：约 4-5倍！**

---

## 🎨 UI设计要点

### 按钮位置：

**CharacterManager**:
```
[添加角色] [基于世界观生成所有角色] [批量导入角色]
```

**OutlineEditor**:
```
[AI智能生成完整大纲] [生成提示词] [保存]
```

**EpisodeManager**:
```
[添加分集] [批量生成提示词]
```

### 颜色方案：

- **批量生成按钮**：`type="warning"` (橙色) - 表示AI功能
- **批量导入按钮**：`type="success"` (绿色) - 表示导入操作
- **AI智能生成**：`type="danger"` (红色) - 突出显示核心功能

### 禁用逻辑：

- 「基于世界观生成所有角色」→ 需要世界观已填写
- 「AI智能生成完整大纲」→ 需要至少有1个角色
- 「批量生成提示词」→ 需要大纲已创建

---

## 🔄 数据流程图

### 批量角色生成流程：

```
世界观完成
    ↓
点击「基于世界观生成所有角色」
    ↓
调用 generateBatchCharactersPrompt()
    ↓
显示提示词对话框
    ↓
用户复制 → AI平台生成 → 复制答案
    ↓
点击「批量导入角色」
    ↓
粘贴AI答案到文本框
    ↓
调用 parseBatchCharactersResponse()
    ↓
显示解析结果预览（6个角色）
    ↓
确认 → characters.value.push(...) → 保存
    ↓
完成！6个角色已创建
```

### 智能大纲生成流程：

```
角色完成
    ↓
点击「AI智能生成完整大纲」
    ↓
调用 generateCompleteOutlinePrompt()
    ↓
显示提示词对话框
    ↓
用户复制 → AI平台生成 → 复制答案
    ↓
点击「导入AI生成的大纲」
    ↓
粘贴AI答案到文本框
    ↓
调用 parseOutlineResponse()
    ↓
显示解析结果预览（三幕+15个节点）
    ↓
确认 → outlineData.value.acts = ... → 保存
    ↓
完成！完整大纲已创建
```

---

## 📝 代码实现清单

### ✅ 已完成：

- [x] `promptTemplates.js` - 添加批量生成模板
  - [x] `generateBatchCharactersPrompt()`
  - [x] `generateCompleteOutlinePrompt()`
  
- [x] `aiResponseParser.js` - 添加批量解析功能
  - [x] `parseBatchCharactersResponse()`
  - [x] `parseOutlineResponse()`
  - [x] `extractCharactersList()`

### 🔄 进行中：

- [ ] `CharacterManager.vue` - 添加批量生成UI
  - [ ] 添加批量生成按钮
  - [ ] 添加批量导入按钮  
  - [ ] 实现 `handleBatchGenerate()`
  - [ ] 实现 `handleBatchImport()`
  - [ ] 集成AIResponseParser组件

- [ ] `OutlineEditor.vue` - 添加智能生成UI
  - [ ] 添加AI生成按钮
  - [ ] 添加导入按钮
  - [ ] 实现 `handleAIGenerate()`
  - [ ] 实现 `handleImportOutline()`
  - [ ] 集成解析功能

- [ ] `EpisodeManager.vue` - 实现批量生成
  - [ ] 创建批量生成对话框
  - [ ] 实现范围选择
  - [ ] 实现批量创建逻辑

- [ ] `AIResponseParser.vue` - 增强组件
  - [ ] 添加 `batch-characters` 模式
  - [ ] 添加 `outline` 模式
  - [ ] 添加批量预览界面

### 📌 待完成：

- [ ] 测试完整工作流
- [ ] 编写使用文档
- [ ] 创建示例视频/GIF

---

## 🧪 测试场景

### 测试1：批量角色生成

**前置条件**：世界观已填写

**步骤**：
1. 进入角色管理
2. 点击「基于世界观生成所有角色」
3. 复制生成的提示词
4. 在AI平台（如ChatGPT）粘贴并获取答案
5. 点击「批量导入角色」
6. 粘贴AI答案
7. 查看解析结果
8. 确认导入

**预期结果**：
- 成功解析出6个角色
- 所有字段都正确填充
- 角色列表显示6个新角色
- 保存成功提示

### 测试2：智能大纲生成

**前置条件**：世界观+角色已完成

**步骤**：
1. 进入大纲编辑器
2. 点击「AI智能生成完整大纲」
3. 复制提示词
4. AI生成答案
5. 点击「导入AI生成的大纲」
6. 粘贴并确认

**预期结果**：
- 三幕结构正确
- 节点数12-15个
- 节点自动分配到各幕
- 所有节点信息完整

---

## 💡 优化建议

### 用户体验：

1. **智能提示**：
   - 世界观完成后，显示提示：「建议您现在批量生成角色」
   - 角色完成后，显示提示：「可以开始生成大纲了」

2. **进度指示**：
   - 显示创作进度条：世界观(25%) → 角色(50%) → 大纲(75%) → 分集(100%)

3. **示例展示**：
   - 在批量生成按钮旁边添加(?)图标，点击显示示例和说明

4. **错误处理**：
   - AI答案格式不对时，提供格式说明
   - 解析失败时，显示具体错误原因

### 技术优化：

1. **缓存机制**：
   - 缓存生成的提示词，避免重复计算

2. **增量更新**：
   - 批量导入时，与现有数据智能合并而非覆盖

3. **撤销功能**：
   - 批量操作后支持一键撤销

---

## 📚 相关文档

- [Phase 2.3 集成测试指南](./drama-outline-episodes-integration-test.md)
- [Phase 2.4 数据统计指南](./drama-statistics-guide.md)
- [提示词模板API](./prompt-templates-api.md)
- [AI解析器API](./ai-parser-api.md)

---

**文档版本**: v1.0  
**创建日期**: 2024-01  
**开发状态**: 🔄 开发中  
**预计完成**: Phase 2.5

---

**Next Step**: 实现CharacterManager和OutlineEditor的UI增强 🚀
