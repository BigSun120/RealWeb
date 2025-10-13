# AI短剧剧本生成工具 - RealWeb集成方案

## 1. 集成方式

**作为RealWeb工具模块集成**，复用现有用户系统、权限管理和UI框架。

---

## 2. 技术栈（基于RealWeb现有架构）

| 技术 | 选型 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 | 与RealWeb一致 |
| UI组件库 | Element Plus | RealWeb现用 |
| 路由 | Vue Router 4 | 已有 |
| 状态管理 | Pinia | Vue3官方推荐 |
| 编辑器 | Monaco Editor | 代码高亮、Markdown支持 |
| 本地存储 | IndexedDB (Dexie.js) | 离线可用 |
| HTTP请求 | request.js | RealWeb已封装的axios |

---

## 3. 集成步骤

### Step 1: 添加工具配置（5分钟）

**文件**: `shared/static-tools.json`

```json
{
  "id": "ai-drama-script-generator",
  "name": "AI短剧剧本生成工具",
  "description": "智能辅助创作短剧剧本，支持向导模式、角色管理、大纲创作、剧本编辑、版本控制、多格式导出",
  "icon": "🎬",
  "category": "productivity",
  "route": "/tools/productivity/drama-script-generator",
  "component": "@/views/tools/productivity/DramaScriptGenerator.vue",
  "tags": ["AI", "剧本", "创作", "短剧", "提示词"],
  "featured": true,
  "status": "active",
  "difficulty": "medium",
  "estimatedTime": "30分钟+",
  "requiresAuth": true,
  "requiresAdmin": false,
  "sortOrder": 30
}
```

### Step 2: 注册路由（10分钟）

**文件**: `frontend/src/router/tools.js`

在 `productivity` 分类的 `children` 中添加：

```javascript
{
  path: 'drama-script-generator',
  name: 'DramaScriptGenerator',
  component: () => import('@/views/tools/productivity/DramaScriptGenerator.vue'),
  meta: {
    title: 'AI短剧剧本生成工具',
    description: '智能辅助创作短剧剧本',
    requiresAuth: true,
    fullWidth: true,
    noContainer: true
  }
}
```

### Step 3: 创建目录结构

```
frontend/src/views/tools/productivity/
├── DramaScriptGenerator.vue          # 主入口（路由容器）
└── drama/                             # 子模块目录
    ├── views/                         # 页面
    │   ├── ProjectList.vue            # 项目列表
    │   ├── ProjectWorkspace.vue       # 工作区
    │   └── WizardMode.vue             # 向导
    ├── components/                    # 组件
    │   ├── CharacterEditor.vue
    │   ├── OutlineEditor.vue
    │   └── ScriptEditor.vue
    ├── services/                      # 服务
    │   ├── projectService.js
    │   └── promptService.js
    └── store/                         # 状态
        └── dramaStore.js
```

### Step 4: 同步到数据库（2分钟）

1. 部署代码
2. 登录后台 → `/admin/tools/management`
3. 点击【同步静态工具】
4. 验证工具在列表中显示

---

## 4. 数据存储策略

### 本地存储（IndexedDB）
```javascript
// 数据库名称
const DB_NAME = 'drama_script_db';
const DB_VERSION = 1;

// 存储表
stores: {
  projects: { keyPath: 'id', autoIncrement: false },
  characters: { keyPath: 'id', indexes: ['projectId'] },
  outlines: { keyPath: 'id', indexes: ['projectId'] },
  scripts: { keyPath: 'id', indexes: ['projectId', 'episodeNumber'] },
  templates: { keyPath: 'id' }
}
```

### 云端同步（可选，后期实现）
- 用户登录后可选择备份到云端
- 使用RealWeb现有的用户认证
- API路径: `/api/tools/drama/*`

---

## 5. 路由设计

```
/tools/productivity/drama-script-generator
├── /                          # 项目列表页
├── /project/:id               # 项目工作区（默认）
├── /project/:id/wizard        # 向导模式
├── /project/:id/characters    # 角色管理
├── /project/:id/outline       # 大纲编辑
├── /project/:id/scripts       # 剧本编辑
└── /project/:id/export        # 导出配置
```

---

## 6. 集成优势

✅ **复用用户系统**: 无需重新登录  
✅ **统一导航**: 从工具箱直接访问  
✅ **权限管理**: 使用 requiresAuth 控制  
✅ **UI一致性**: 使用 Element Plus  
✅ **离线可用**: IndexedDB 本地存储  
✅ **可选同步**: 登录用户可云端备份  

---

## 7. 开发流程调整

### 阶段零：集成准备（1-2天）✨ 新增
- [x] 添加 static-tools.json 配置
- [x] 注册路由
- [ ] 创建目录和入口组件
- [ ] 后台同步静态工具
- [ ] 验证工具显示

### 后续阶段
按原需求文档的 MVP → 功能完善 → 体验优化 → 增强功能 执行

---

## 8. 发布流程

1. **提交代码**: 提交到 RealWeb 仓库
2. **部署**: 按 RealWeb 现有流程部署
3. **同步工具**: 后台执行【同步静态工具】
4. **验证**: 访问工具页面测试

---

## 9. 注意事项

⚠️ **路由组件必须存在**: 确保 `DramaScriptGenerator.vue` 文件存在  
⚠️ **分类一致**: category 必须是已存在的分类ID  
⚠️ **权限控制**: requiresAuth=true 需要用户登录  
⚠️ **数据迁移**: IndexedDB 版本升级需要迁移脚本  

---

**文档版本**: 1.0  
**创建日期**: 2025-10-12  
**维护人员**: [待指定]
