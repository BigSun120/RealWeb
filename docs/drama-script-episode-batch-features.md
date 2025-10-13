# 集数批量功能实现文档

## 概述
本文档记录了在剧本生成工具的分集管理器（EpisodeManager）中实现的批量功能。该功能包括AI批量创建集数框架和批量生成提示词两大核心功能，大幅提升了剧本分集创作的效率。

## 实现日期
2024年

## 功能描述

### 1. AI批量创建按钮
- **位置**：EpisodeManager组件的头部操作区
- **功能**：批量创建多个分集的基本框架
- **按钮样式**：绿色success类型，带MagicStick图标
- **用户流程**：
  1. 点击"AI批量创建"按钮
  2. 系统检查大纲数据（如无，提示建议先完善）
  3. 打开批量创建对话框，输入起始和结束集数
  4. 确认后自动创建多个集数的基本框架
  5. 每个框架包含集数、标题、状态等基本信息

### 2. 批量生成提示词按钮
- **位置**：EpisodeManager组件的头部操作区
- **功能**：为已有的所有分集批量生成AI提示词
- **按钮样式**：橙色warning类型，带MagicStick图标
- **状态**：当没有分集时禁用
- **用户流程**：
  1. 点击"批量生成提示词"按钮
  2. 系统为所有已存在的分集生成AI提示词
  3. 打开折叠面板对话框，展示所有提示词
  4. 用户可以逐个查看和复制提示词
  5. 也可以一键复制所有提示词

## 技术实现

### 文件修改清单

#### EpisodeManager.vue
**修改内容**：
- 新增"AI批量创建"按钮
- 新增状态管理：
  - `showBatchCreateDialog`: 控制批量创建对话框
  - `batchCreateForm`: 存储批量创建表单数据（startNumber, endNumber）
  - `showBatchPromptDialog`: 控制批量提示词对话框
  - `batchPrompts`: 存储生成的批量提示词数组
  - `activePrompts`: 控制折叠面板激活项
- 新增对话框：
  - 批量创建输入对话框（el-dialog + el-form）
  - 批量提示词展示对话框（el-dialog + el-collapse）
- 新增方法：
  - `handleAIBatchCreate()`: 处理AI批量创建按钮点击
  - `openBatchCreateDialog()`: 打开批量创建对话框
  - `confirmBatchCreate()`: 确认批量创建集数
  - `handleBatchGenerate()`: 批量生成所有分集的提示词
  - `copyPrompt(prompt)`: 复制单个提示词
  - `copyAllPrompts()`: 复制所有提示词
- 新增CSS样式：
  - `.batch-prompt-container`: 批量提示词容器
  - `.prompt-item-header`: 提示词项目头部
  - `.episode-badge`: 集数徽章
  - `.episode-title`: 集数标题
  - `.prompt-content`: 提示词内容
  - `.prompt-actions`: 提示词操作按钮

**关键代码逻辑**：

```javascript
// AI批量创建逻辑
const confirmBatchCreate = () => {
  const start = batchCreateForm.value.startNumber;
  const end = batchCreateForm.value.endNumber;
  
  // 创建新的分集
  const newEpisodes = [];
  for (let i = start; i <= end; i++) {
    const newEpisode = {
      id: `${Date.now()}_${i}`,
      number: i,
      title: `第${i}集`,
      status: 'draft',
      wordCount: 0,
      content: {
        summary: '待生成',
        scenes: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    newEpisodes.push(newEpisode);
  }
  
  episodes.value.push(...newEpisodes);
  emit('save', episodes.value);
};

// 批量生成提示词逻辑
const handleBatchGenerate = () => {
  batchPrompts.value = sortedEpisodes.value.map(episode => ({
    episode,
    prompt: generateEpisodePrompt({
      episode,
      projectInfo: props.projectInfo,
      worldview: props.worldview,
      outline: props.outline,
      characters: props.characters
    })
  }));
  
  showBatchPromptDialog.value = true;
};
```

## 用户体验优化

### 1. 智能默认值
- 批量创建对话框自动计算起始集数（nextEpisodeNumber）
- 默认创建5集（可调整）
- 避免用户手动计算集数

### 2. 输入验证
- 限制起始集数不能大于结束集数
- 限制批量创建最多50集
- 范围控制在1-100集之间

### 3. 折叠面板展示
- 使用el-collapse组件展示批量提示词
- 默认展开第一个，避免界面过于拥挤
- 每个提示词独立复制按钮
- 提供"复制所有"快捷操作

### 4. 徽章标识
- 每个集数使用蓝色徽章标识
- 清晰显示集数编号和标题
- 视觉上易于区分不同集数

### 5. 剪贴板操作
- 使用navigator.clipboard API
- 复制成功后显示提示消息
- 复制失败时友好提示

## 工作流程示意

### 批量创建工作流
```
用户点击"AI批量创建"
    ↓
检查大纲数据（无则提示）
    ↓
打开批量创建对话框
    ↓
输入起始和结束集数
    ↓
确认创建
    ↓
生成N个集数框架
    ↓
自动保存 ✅
```

### 批量提示词工作流
```
用户创建或已有多个分集
    ↓
点击"批量生成提示词"
    ↓
系统遍历所有分集
    ↓
为每个分集生成提示词
    ↓
展示折叠面板对话框
    ↓
用户逐个或批量复制提示词
    ↓
在AI工具中生成内容
```

## 与其他功能的集成

### 与大纲的联动
- 批量创建前检查大纲数据
- 提示词生成时包含大纲节点信息
- 根据大纲预估合理的集数范围

### 与角色和世界观的联动
- 提示词包含世界观背景
- 提示词包含所有角色信息
- AI可以基于角色和世界观生成针对性的分集内容

### 数据流向
```
WorldviewEditor → 世界观数据
CharacterManager → 角色数据
OutlineEditor → 大纲数据
    ↓
EpisodeManager (批量创建/批量提示词)
    ↓
单个集数编辑和生成
```

## 数据结构

### 集数基本框架
```javascript
{
  id: "unique_id",
  number: 1,                // 集数编号
  title: "第1集",           // 集数标题
  status: "draft",          // 状态：draft/in-progress/completed/reviewed
  wordCount: 0,             // 字数统计
  content: {
    summary: "待生成",      // 简介
    scenes: []              // 场景列表
  },
  createdAt: "ISO时间",
  updatedAt: "ISO时间"
}
```

### 批量提示词数据
```javascript
[
  {
    episode: {/* 集数对象 */},
    prompt: "生成的提示词内容"
  },
  // ... 更多集数的提示词
]
```

## 已有基础设施（之前实现）

### promptTemplates.js
已实现的函数：
- `generateEpisodePrompt(options)`: 生成单集提示词
  - 接收参数：episode对象、项目信息、世界观、大纲、角色列表
  - 返回：结构化的分集生成提示词

## 测试建议

### 功能测试
1. 测试有大纲时的批量创建
2. 测试无大纲时的提示流程
3. 测试各种起始和结束集数组合
4. 测试超过50集的限制
5. 测试批量提示词生成
6. 测试单个和批量复制功能

### 边界测试
1. 测试0集的情况
2. 测试100集的极限情况
3. 测试集数编号冲突
4. 测试空剪贴板API的浏览器兼容性

### 性能测试
1. 测试50集批量创建的性能
2. 测试50集批量提示词生成的性能
3. 测试折叠面板滚动性能

## 技术亮点

1. **智能默认值**：自动计算起始集数，减少用户思考
2. **折叠面板设计**：优雅展示大量提示词，避免界面拥挤
3. **独立复制功能**：支持单个和批量两种复制方式
4. **剪贴板API**：使用现代浏览器API，提升用户体验
5. **框架化创建**：批量创建基础框架，后续可逐个完善

## 与前两个功能的对比

| 特性 | 批量角色生成 | 大纲AI生成 | 集数批量功能 |
|------|------------|-----------|------------|
| 生成方式 | AI生成后导入 | AI生成后导入 | 直接创建框架 + 批量提示词 |
| 数据追加 | 追加到列表 | 替换整个结构 | 追加到列表 |
| 前置检查 | 检查世界观 | 检查世界观+角色 | 检查大纲 |
| 主要对话框 | 单个导入对话框 | 单个导入对话框 | 创建对话框 + 提示词对话框 |
| 复制功能 | 无 | 无 | 单个复制 + 批量复制 |

## 创新点

### 1. 两阶段设计
- **第一阶段**：批量创建框架（快速搭建结构）
- **第二阶段**：批量生成提示词（逐个完善内容）
- 比一次性生成更灵活，用户可以中途调整

### 2. 折叠面板展示
- 不同于简单的文本区域
- 更适合展示多个结构化的提示词
- 用户体验更好

### 3. 独立复制按钮
- 每个提示词都有独立的复制按钮
- 用户可以选择性地使用某些提示词
- 也可以一键复制所有

### 4. 徽章标识系统
- 使用视觉徽章标识集数
- 提升界面美观度和可读性

## 维护说明

### 关键文件位置
- `frontend/src/views/tools/productivity/drama/components/EpisodeManager.vue`
- `frontend/src/views/tools/productivity/drama/utils/promptTemplates.js`

### 注意事项
1. 批量创建的集数ID使用时间戳+编号，确保唯一性
2. 批量创建最多50集的限制可根据性能调整
3. 剪贴板API需要HTTPS环境或localhost
4. 折叠面板的activePrompts设置为0，默认展开第一个

## 后续优化方向

### 1. 选择性批量生成
- 支持选择特定集数生成提示词
- 而不是必须为所有集数生成

### 2. 智能集数分配
- 根据大纲节点自动建议集数分配
- 例如：某个节点建议分配2-3集

### 3. 模板系统
- 提供不同的集数框架模板
- 用户可以选择不同风格的框架

### 4. 批量导入生成内容
- 支持将AI生成的多集内容一次性导入
- 类似于角色和大纲的批量导入

### 5. 进度跟踪
- 显示哪些集数已生成内容
- 哪些集数还是框架状态

## 总结

集数批量功能是剧本生成工具的最后一个核心功能，它将前面的世界观、角色、大纲等信息整合起来，帮助用户快速创建完整的分集结构。通过"框架创建 + 提示词生成"的两阶段设计，既保证了效率，又保留了灵活性。

与批量角色生成和大纲AI生成功能共同构成了完整的剧本创作工作流，让用户可以从零开始，通过AI辅助快速搭建起完整的剧本框架，然后逐步完善细节，大幅降低了剧本创作的门槛。
