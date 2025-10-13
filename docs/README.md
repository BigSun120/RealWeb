# RealWeb 项目文档

> 📚 统一的文档管理中心
> 
> 最后更新：2025-10-13

---

## 📁 文档结构

```
docs/
├── project/              # 🏢 项目级文档
├── deployment/           # 🚀 部署运维文档
├── business/             # 💼 商业策略文档
├── features/             # ⚙️ 功能模块文档
│   ├── drama/           # 短剧工具
│   ├── prompt-vault/    # 提示词管理
│   ├── temp-email/      # 临时邮箱
│   └── augment-token/   # Augment令牌管理
├── backend/              # 🔙 后端文档
└── frontend/             # 🖥️ 前端文档
    ├── ai/              # AI服务（全局）
    └── general/         # 通用文档
```

---

## 🏢 项目级文档 (`project/`)

**架构与设计：**
- [技术架构设计文档.md](project/技术架构设计文档.md) - 整体技术架构
- [数据库设计文档.md](project/数据库设计文档.md) - 数据库设计
- [API接口文档.md](project/API接口文档.md) - API接口说明
- [项目结构说明.md](project/项目结构说明.md) - 项目目录结构

**规范与管理：**
- [代码规范文档.md](project/代码规范文档.md) - 编码规范
- [项目管理规范.md](project/项目管理规范.md) - 项目管理流程
- [文档索引.md](project/文档索引.md) - 文档索引
- [RealWeb项目安全审计报告.md](project/RealWeb项目安全审计报告.md) - 安全审计
- [禁用数据库清理.md](project/禁用数据库清理.md) - 数据库维护
- [静态工具新增与后台指引.md](project/静态工具新增与后台指引.md) - 工具集成指南

---

## 🚀 部署运维文档 (`deployment/`)

**部署指南：**
- [部署更新指南.md](deployment/部署更新指南.md) - 部署流程
- [服务器迁移详细指南.md](deployment/服务器迁移详细指南.md) - 服务器迁移
- [邮箱验证部署指南.md](deployment/邮箱验证部署指南.md) - 邮箱验证部署

**邮件服务：**
- [邮件服务配置指南.md](deployment/邮件服务配置指南.md) - 邮件服务配置
- [邮件服务维护指南.md](deployment/邮件服务维护指南.md) - 邮件服务维护
- [邮件服务快速参考.md](deployment/邮件服务快速参考.md) - 邮件服务快速参考

---

## 💼 商业策略文档 (`business/`)

- [SEO优化与网站盈利策略.md](business/SEO优化与网站盈利策略.md) - SEO与盈利
- [网站流量提升行动计划.md](business/网站流量提升行动计划.md) - 流量提升
- [网站通用化定位策略.md](business/网站通用化定位策略.md) - 产品定位
- [社交互动整体功能.md](business/社交互动整体功能.md) - 社交功能规划

---

## ⚙️ 功能模块文档 (`features/`)

### 🎬 短剧工具 (`features/drama/`)

**目录结构：**
- `requirements/` - 需求文档
- `design/` - 设计文档
- `implementation/` - 实现记录
- `guides/` - 使用指南
- `changelog/` - 变更日志

**📋 需求文档：**
- [需求概要.md](features/drama/requirements/需求概要.md) - 核心需求和功能规划
- [AI接入功能需求文档.md](features/drama/requirements/) - AI 集成详细设计
- [小说改编短剧功能需求文档.md](features/drama/requirements/) - 小说改编功能

**🎨 设计文档：**
- [DATABASE_SCHEMA.md](features/drama/design/) - 数据库Schema
- [drama-workflow-analysis.md](features/drama/design/) - 工作流分析
- [drama-workflow-optimization.md](features/drama/design/) - 工作流优化
- [version-management-optimization-analysis.md](features/drama/design/) - 版本管理优化

**🔧 实现记录：**
- [实现概要.md](features/drama/implementation/实现概要.md) - 完整的功能实现概要和技术文档

**📖 使用指南：**
- [QUICKSTART.md](features/drama/guides/) - 快速开始
- [version-management-complete-guide.md](features/drama/guides/) - 版本管理指南
- [export-debugging-guide.md](features/drama/guides/) - 导出调试指南
- [export-metadata-guide.md](features/drama/guides/) - 导出元数据指南
- [测试指南系列.md](features/drama/guides/)

**📝 变更日志：**
- [CHANGELOG-export.md](features/drama/changelog/) - 导出功能变更日志

---

### 📝 提示词管理 (`features/prompt-vault/`)

- [01-AI提示词管理工具-需求文档-已完成.md](features/prompt-vault/)
- [提示词工具优化需求文档.md](features/prompt-vault/)

---

### 📧 临时邮箱 (`features/temp-email/`)

- [临时邮箱服务指南.md](features/temp-email/)

---

### 🔑 Augment令牌管理 (`features/augment-token/`)

- [Augment令牌管理器Web版集成需求.md](features/augment-token/)
- [全部令牌管理功能开发需求文档.md](features/augment-token/)

---

## 🔙 后端文档 (`backend/`)

- [prompt-import-export-format.md](backend/) - 提示词导入导出格式
- [SECURITY_NOTE.md](backend/) - 日志安全说明

---

## 🖥️ 前端文档 (`frontend/`)

### 🤖 AI服务文档 (`frontend/ai/`)

- [AI配置管理需求文档.md](frontend/ai/) - 全局AI配置管理（适用所有工具）

### 🛠️ 通用文档 (`frontend/general/`)

- [bugfix-analysis-rules.md](frontend/general/) - Bug修复分析规则
- [project-status-management.md](frontend/general/) - 项目状态管理
- [quick-test-guide.md](frontend/general/) - 快速测试指南

---

## 📝 文档规范

### 文档命名规范

```
需求文档: {功能名}-requirements.md 或 {功能名}-需求文档.md
设计文档: {功能名}-design.md 或 {功能名}-设计文档.md
实现记录: {功能名}-implementation.md 或 phase{X}.{Y}-{描述}.md
使用指南: {功能名}-guide.md 或 QUICKSTART.md
变更日志: CHANGELOG-{模块}.md
```

### 文档分类原则

- **需求文档** (`requirements/`) - 功能需求、用户故事、验收标准
- **设计文档** (`design/`) - 架构设计、数据库设计、工作流设计
- **实现记录** (`implementation/`) - 开发进度、完成总结、技术实现
- **使用指南** (`guides/`) - 快速开始、操作手册、调试指南
- **变更日志** (`changelog/`) - 版本变更、功能更新

---

## 🔍 快速查找

### 按功能模块查找

- **短剧工具** → `features/drama/`
- **AI服务** → `frontend/ai/`
- **提示词管理** → `features/prompt-vault/`
- **部署运维** → `deployment/`

### 按文档类型查找

- **需求文档** → `features/{模块}/requirements/`
- **技术设计** → `features/{模块}/design/` 或 `project/`
- **使用指南** → `features/{模块}/guides/`
- **API文档** → `project/API接口文档.md` 或 `backend/`

---

## 📞 文档维护

**文档维护者：** 待定

**更新原则：**
1. 所有新文档按照上述结构存放
2. 文档命名遵循规范
3. 重要变更需更新本索引
4. 定期清理过时文档

**问题反馈：** 请在项目 Issue 中提出

---

**文档统计：** 39 个文档
**最后整理：** 2025-10-13
**最后清理：** 2025-10-13（移除 38 个冗余/过详文档，整合为 2 个概要）
