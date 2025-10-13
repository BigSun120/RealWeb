# AI短剧剧本生成工具 - 前端模块

## 📁 目录结构

```
drama/
├── views/              # 页面组件
│   ├── ProjectList.vue           # 项目列表（待开发）
│   ├── ProjectWorkspace.vue      # 项目工作区（待开发）
│   └── WizardMode.vue            # 向导模式（待开发）
├── components/         # 通用组件
│   ├── CharacterEditor.vue       # 角色编辑器（待开发）
│   ├── OutlineEditor.vue         # 大纲编辑器（待开发）
│   └── ScriptEditor.vue          # 剧本编辑器（待开发）
├── services/          # 业务服务
│   ├── projectService.js         # 项目管理服务（待开发）
│   └── promptService.js          # 提示词生成服务（待开发）
├── store/             # 状态管理
│   └── dramaStore.js             # Pinia store（待开发）
└── README.md          # 本文件
```

## 🚀 开发状态

### ✅ 已完成
- [x] 目录结构创建
- [x] 入口组件 `DramaScriptGenerator.vue`
- [x] 路由注册
- [x] static-tools.json 配置

### ⏳ 进行中
- [ ] 项目数据模型设计
- [ ] IndexedDB 服务封装

### 📋 待开发
- [ ] 项目列表页面
- [ ] 项目CRUD功能
- [ ] 向导模式（7步）
- [ ] 提示词生成引擎
- [ ] 各编辑器组件

## 🔗 相关文档

- 需求文档：`/docx/需求文档/02-AI短剧剧本生成工具-需求文档.md`
- 集成方案：`/docx/需求文档/02-AI短剧剧本生成工具-RealWeb集成方案.md`
- 功能清单：`/docx/需求文档/02-AI短剧剧本生成工具-功能清单.md`

## 💡 开发规范

### 命名规范
- 组件：大驼峰（PascalCase），如 `ProjectList.vue`
- 服务：小驼峰（camelCase），如 `projectService.js`
- Store：小驼峰，如 `dramaStore.js`

### 技术栈
- Vue 3 (Composition API)
- Element Plus
- Monaco Editor (编辑器)
- Pinia (状态管理)
- Dexie.js (IndexedDB 封装)

### 数据存储
- 数据库名：`drama_script_db`
- 本地优先，可选云端同步
- 所有数据操作通过 `services/` 层

## 📝 待办事项

按优先级排序：

1. **P0 - 数据层**
   - [ ] 设计 IndexedDB Schema
   - [ ] 封装 projectService
   - [ ] 创建 Pinia store

2. **P0 - 项目管理**
   - [ ] 项目列表页面
   - [ ] 项目创建表单
   - [ ] 项目卡片组件

3. **P0 - 向导模式**
   - [ ] 向导框架组件
   - [ ] Step1: 基础设定
   - [ ] Step2: 角色设计
   - [ ] ...（后续7步）

4. **P1 - 核心功能**
   - [ ] 提示词生成引擎
   - [ ] 上下文管理器
   - [ ] 模板系统

## 🔧 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问工具
http://localhost:5173/tools/productivity/drama-script-generator
```

## 📮 联系方式

有问题请联系开发团队或查看项目文档。
