# AI剧本医生 - 新架构使用指南

## 📚 概述

本模块采用分层架构，将复杂的业务逻辑拆分为清晰的服务层，提高可维护性和可扩展性。

## 🏗️ 架构图

```
┌──────────────────────────────────────┐
│   UI层 (ScriptAnalysis.vue)          │
│   - 用户界面                           │
│   - 事件处理                           │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│   Services 层                         │
│   ├─ DataService     数据访问         │
│   ├─ AIService       AI交互           │
│   └─ UpdateStrategyFactory 更新策略   │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│   Mappers 层                          │
│   └─ FieldMapper     字段映射         │
└───────────────────────────────────────┘
```

## 📁 目录结构

```
drama/
├── components/
│   └── ScriptAnalysis.vue       # 主UI组件
├── services/                     # 服务层
│   ├── DataService.js           # 数据访问服务
│   ├── AIService.js             # AI交互服务
│   └── UpdateStrategyFactory.js # 更新策略工厂
├── mappers/                      # 映射层
│   └── FieldMapper.js           # 字段映射管理
├── models/                       # 数据模型（预留）
└── utils/
    ├── promptTemplates.js       # Prompt模板
    └── analysisEngine.js        # 分析引擎
```

## 🔧 核心服务使用

### 1. FieldMapper - 字段映射

**用途**: 管理所有中英文字段映射

```javascript
import { FieldMapper } from '../mappers/FieldMapper';

// 获取英文字段名
const englishField = FieldMapper.getEnglishField('characters', '性格描述');
// 返回: 'personality'

// 获取中文字段名
const chineseField = FieldMapper.getChineseField('characters', 'personality');
// 返回: '性格描述'

// 检查是否是逻辑概念字段
const isLogical = FieldMapper.isLogicalField('characters', '主要配角');
// 返回: true

// 获取逻辑字段配置
const config = FieldMapper.getLogicalFieldConfig('characters', '主要配角');
// 返回: { type: 'filter', roleFilter: ['配角', '主要配角'] }
```

**新增字段**: 只需在 `FieldMapper.mappings` 中添加即可！

---

### 2. DataService - 数据访问

**用途**: 统一的数据获取接口，自动处理空值

```javascript
import { DataService } from '../services/DataService';

// 创建实例
const dataService = new DataService(project);

// 获取字段内容（格式化文本）
const content = dataService.getFieldContent(
  { module: 'characters', field: '主要配角', characterId: null },
  { format: 'formatted' }
);

// 获取字段内容（JSON格式）
const jsonContent = dataService.getFieldContent(
  { module: 'characters', field: '主要配角', characterId: null },
  { format: 'json' }
);

// 自动处理空值
// 如果字段为空，自动返回：
// "【角色的"动机"字段当前为空】
// 
// 💡 这正是AI诊断发现需要改进的地方！"
```

**支持的模块**:
- `project`: 项目级别字段（如"剧本类型"）
- `worldview`: 世界观字段
- `characters`: 角色字段（支持逻辑概念如"主要配角"）
- `outline`: 大纲字段
- `episodes`: 分集字段

---

### 3. AIService - AI交互

**用途**: 统一AI调用和响应解析

```javascript
import { AIService } from '../services/AIService';

// 运行AI诊断
const issues = await AIService.runDiagnosis(
  project,
  'preparation',
  prompt
);

// 生成解决方案
const solution = await AIService.generateSolution(
  issue,
  project,
  prompt
);
// 返回: { suggestedContent: '...', explanation: '...' }

// 智能解析角色数据（支持JSON、Markdown等格式）
const characters = AIService.parseCharacterData(aiResponse);
// 自动识别格式并返回结构化数据
```

---

### 4. UpdateStrategyFactory - 更新策略

**用途**: 智能更新内容，支持批量操作

```javascript
import { UpdateStrategyFactory } from '../services/UpdateStrategyFactory';

// 更新角色（自动判断批量/单个）
const message = await UpdateStrategyFactory.apply(
  project,
  'characters',     // 模块
  '主要配角',        // 字段
  aiContent,        // AI生成的内容
  null,             // characterId（批量时为null）
  null              // episodeNumber（角色不需要）
);

// 返回: "更新2个角色，新增1个角色"
```

**特性**:
- ✅ 自动解析AI返回格式
- ✅ 支持批量角色更新
- ✅ 保留未提及的字段
- ✅ 自动判断更新/新增

---

## 💡 使用示例

### 示例1：完整的AI诊断流程

```javascript
import { DataService } from '../services/DataService';
import { AIService } from '../services/AIService';
import { UpdateStrategyFactory } from '../services/UpdateStrategyFactory';

// 1. 初始化数据服务
const dataService = new DataService(project);

// 2. 运行AI诊断
const issues = await AIService.runDiagnosis(
  project,
  'preparation',
  generateDiagnosisPrompt('preparation', project)
);

// 3. 为每个问题生成解决方案
for (const issue of issues) {
  // 获取原始内容
  const originalContent = dataService.getFieldContent(
    issue.location,
    { format: 'formatted' }
  );
  
  // 生成解决方案
  const solution = await AIService.generateSolution(
    { ...issue, originalContent },
    project,
    generateSolutionPrompt(issue, project)
  );
  
  // 应用解决方案
  const message = await UpdateStrategyFactory.apply(
    project,
    issue.location.module,
    issue.location.field,
    solution.suggestedContent,
    issue.location.characterId
  );
  
  console.log(message); // "角色字段更新成功" 或 "更新2个角色，新增1个角色"
}
```

### 示例2：切换显示模式

```javascript
// 在解决方案对话框中切换格式
const updateDisplayMode = () => {
  if (currentSolution.value && currentSolution.value.issue) {
    // 使用DataService重新获取内容
    currentSolution.value.originalContent = dataService.getFieldContent(
      currentSolution.value.issue.location,
      { format: displayMode.value } // 'formatted' 或 'json'
    );
  }
};
```

### 示例3：新增模块支持

如果要新增一个模块（如"场景"），只需：

1. 在 `FieldMapper.js` 中添加字段映射：
```javascript
static mappings = {
  // ...
  scenes: {
    '场景名称': 'name',
    '场景描述': 'description',
    '时间': 'time',
    '地点': 'location'
  }
};
```

2. 在 `DataService.js` 中添加获取逻辑（如果需要特殊处理）

3. 在 `UpdateStrategyFactory.js` 中添加更新策略：
```javascript
class SceneUpdateStrategy {
  async apply(project, field, content) {
    // 实现场景更新逻辑
  }
}

// 注册策略
static strategies = {
  // ...
  scenes: new SceneUpdateStrategy()
};
```

完成！无需修改UI层代码。

---

## 🎯 最佳实践

### 1. 字段映射
- ✅ 新增字段只在 `FieldMapper.js` 中定义
- ✅ 使用 `FieldMapper.getEnglishField()` 而不是硬编码
- ❌ 不要在多处重复定义映射

### 2. 数据访问
- ✅ 始终使用 `DataService.getFieldContent()`
- ✅ 利用自动空值处理
- ❌ 不要直接访问 `project.characters[0].name`

### 3. 内容更新
- ✅ 使用 `UpdateStrategyFactory.apply()`
- ✅ 让策略自动判断批量/单个
- ❌ 不要手动调用 `patchDramaCharacters` 等API

### 4. AI交互
- ✅ 使用 `AIService` 的统一接口
- ✅ 利用智能解析功能
- ❌ 不要重复实现解析逻辑

---

## 🐛 调试技巧

### 启用详细日志

所有Service都有详细的console.log输出：

```javascript
📖 DataService.getFieldContent: {...}
🔍 逻辑字段配置: {...}
✅ "主要配角"匹配到3个角色: ...

🤖 AIService.runDiagnosis: preparation
✅ AI诊断完成，发现 5 个问题

🔄 处理3个结构化角色...
✅ 更新角色: 柳如烟
➕ 新增角色: 玄机子
```

### 常见问题

**Q: 字段为空怎么办？**
A: DataService会自动返回友好提示，无需特殊处理。

**Q: AI返回格式不统一怎么办？**
A: AIService有多种解析方法，会自动尝试。

**Q: 如何知道是更新还是新增角色？**
A: UpdateStrategyFactory会根据角色名称自动判断。

**Q: 如何添加新的逻辑概念字段？**
A: 在 `FieldMapper.logicalFields` 中添加定义即可。

---

## 📝 迁移指南

如果你有旧代码需要迁移到新架构：

### 旧代码
```javascript
// ❌ 旧方式
const fieldMap = {
  '性格描述': 'personality',
  '角色背景': 'background'
};

const content = character[fieldMap[field]] || '';
if (!content) {
  content = '暂无内容';
}
```

### 新代码
```javascript
// ✅ 新方式
const content = dataService.getFieldContent(
  { module: 'characters', field, characterId },
  { format: 'formatted' }
);
// 自动处理映射和空值！
```

---

## 🚀 性能优化

1. **DataService实例复用**: 在组件级别创建一次，不要每次调用都new
2. **批量操作**: UpdateStrategyFactory会自动批量处理多个角色
3. **缓存**: FieldMapper使用静态方法，无需实例化

---

## 📚 参考文档

- **重构方案分析**: `docs/frontend/剧本医生-重构方案分析.md`
- **重构完成总结**: `docs/frontend/剧本医生-重构完成总结.md`
- **重构进度跟踪**: `docs/frontend/剧本医生-重构进度.md`

---

## 🙋 常见问题

**Q: 为什么要用这个架构？**
A: 降低复杂度，提高可维护性。从300行函数 → 3行调用。

**Q: 学习成本高吗？**
A: 不高。核心就3个Service，接口都很简单。

**Q: 如何扩展新功能？**
A: 实现对应的Strategy即可，不影响其他模块。

**Q: 性能会下降吗？**
A: 不会。反而因为减少重复代码，性能更好。

---

**版本**: v2.0.0  
**最后更新**: 2025-10-14  
**维护者**: AI剧本医生开发团队
