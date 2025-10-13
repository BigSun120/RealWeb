# Drama Script Generator - 数据库设计

## 数据库基本信息

- **数据库名称**: `drama_script_db`
- **版本**: 1
- **存储方式**: IndexedDB (浏览器本地存储)

---

## 数据表（Object Stores）

### 1. projects (项目表)

**用途**: 存储所有短剧项目的基本信息

**主键**: `id` (string, UUID)

**字段**:
```typescript
{
  id: string;                    // UUID
  name: string;                  // 项目名称
  type: string;                  // 类型：霸道总裁/悬疑/甜宠等
  episodeCount: number;          // 总集数
  episodeDuration: number;       // 每集时长(分钟)
  status: string;                // 状态：设定中/大纲中/剧本中/已完成
  progress: number;              // 进度 0-100
  currentStep: string;           // 当前步骤
  targetAudience: string[];      // 目标受众
  coreConflict: string;          // 核心冲突
  emotionalTone: string;         // 情感基调
  specialRequirements: string;   // 特殊要求
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}
```

**索引**:
- `status` (non-unique)
- `updatedAt` (non-unique)

---

### 2. characters (角色表)

**用途**: 存储项目中的所有角色信息

**主键**: `id` (string, UUID)

**字段**:
```typescript
{
  id: string;
  projectId: string;             // 关联的项目ID
  name: string;                  // 角色姓名
  role: string;                  // 角色类型：主角/配角/反派
  age: number;                   // 年龄
  gender: string;                // 性别
  occupation: string;            // 职业
  personality: string[];         // 性格标签
  background: string;            // 背景故事
  goal: string;                  // 核心目标
  relationships: Array<{         // 关系列表
    characterId: string;
    relation: string;
    description: string;
  }>;
  avatar: string;                // 头像URL(可选)
  createdAt: number;
  updatedAt: number;
}
```

**索引**:
- `projectId` (non-unique)
- `[projectId, role]` (compound, non-unique)

---

### 3. outlines (大纲表)

**用途**: 存储项目的剧情大纲

**主键**: `id` (string, UUID)

**字段**:
```typescript
{
  id: string;
  projectId: string;
  structure: string;             // 结构类型：三幕式/五幕式/序列式
  acts: Array<{                  // 幕次列表
    id: string;
    name: string;
    episodes: string;            // 集数范围：1-10
    coreEvents: string;
    emotionArc: string;
    keyConflict: string;
    endingTwist: string;
  }>;
  keyPlotPoints: Array<{         // 关键情节点
    episode: number;
    type: string;                // 类型：开场/转折/高潮/结局
    event: string;
    resolved: boolean;
  }>;
  createdAt: number;
  updatedAt: number;
  version: number;               // 版本号
}
```

**索引**:
- `projectId` (unique)

---

### 4. episodes (分集梗概表)

**用途**: 存储每集的梗概

**主键**: `id` (string, UUID)

**字段**:
```typescript
{
  id: string;
  projectId: string;
  episodeNumber: number;         // 集数
  title: string;                 // 标题(可选)
  summary: string;               // 梗概摘要
  coreEvents: string;            // 核心事件
  emotionChange: string;         // 情感变化
  conflictPoint: string;         // 冲突点
  cliffhanger: string;           // 结尾钩子
  createdAt: number;
  updatedAt: number;
}
```

**索引**:
- `projectId` (non-unique)
- `[projectId, episodeNumber]` (compound, unique)

---

### 5. scripts (剧本表)

**用途**: 存储详细剧本内容

**主键**: `id` (string, UUID)

**字段**:
```typescript
{
  id: string;
  projectId: string;
  episodeNumber: number;
  scenes: Array<{                // 场景列表
    id: string;
    number: number;
    setting: string;             // 场景设定：日/外/咖啡厅
    description: string;         // 场景描述
    content: string;             // 剧本内容(包含对白和动作)
    wordCount: number;
  }>;
  totalWordCount: number;        // 总字数
  createdAt: number;
  updatedAt: number;
  version: number;
}
```

**索引**:
- `projectId` (non-unique)
- `[projectId, episodeNumber]` (compound, unique)

---

### 6. templates (模板表)

**用途**: 存储用户的自定义模板

**主键**: `id` (string, UUID)

**字段**:
```typescript
{
  id: string;
  name: string;                  // 模板名称
  category: string;              // 分类：角色/大纲/剧本/优化
  type: string;                  // 项目类型：霸道总裁/悬疑等
  content: string;               // 模板内容
  variables: string[];           // 变量列表
  tags: string[];                // 标签
  isSystem: boolean;             // 是否系统模板
  usageCount: number;            // 使用次数
  createdAt: number;
  updatedAt: number;
}
```

**索引**:
- `category` (non-unique)
- `type` (non-unique)

---

### 7. versions (版本历史表)

**用途**: 存储各模块的版本历史

**主键**: `id` (string, UUID)

**字段**:
```typescript
{
  id: string;
  projectId: string;
  moduleType: string;            // 模块类型：character/outline/script
  moduleId: string;              // 模块ID
  versionNumber: number;         // 版本号
  content: any;                  // 内容快照(JSON)
  description: string;           // 版本说明
  changes: string;               // 变更摘要
  createdAt: number;
}
```

**索引**:
- `[projectId, moduleType, moduleId]` (compound, non-unique)
- `createdAt` (non-unique)

---

## 数据关系图

```
projects (1)
    ├── characters (N)
    ├── outlines (1)
    ├── episodes (N)
    ├── scripts (N)
    └── versions (N)

templates (独立表)
```

---

## 数据迁移策略

### 版本升级
- v1 → v2: 添加新字段时使用 onupgradeneeded
- 保持向后兼容，旧数据自动补全默认值

### 数据导出/导入
- 使用 JSON 格式
- 包含版本信息用于兼容性检查

---

## 存储容量估算

假设30集短剧项目：
- 项目基本信息: ~2KB
- 角色(8人): ~16KB
- 大纲: ~5KB
- 分集梗概(30集): ~30KB
- 详细剧本(30集): ~300KB
- 版本历史(50个): ~200KB

**单个项目总计**: ~550KB  
**10个项目**: ~5.5MB  
**100个项目**: ~55MB (仍在浏览器限额内)
