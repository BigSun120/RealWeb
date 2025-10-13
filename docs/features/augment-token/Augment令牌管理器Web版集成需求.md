# Augment令牌管理器Web版集成需求文档

## 一、项目概述

### 1.1 项目目标
将桌面版Augment Token Manager的功能集成到现有工具箱中，实现Web端的令牌管理和账号切换功能。

### 1.2 项目背景
- 现有桌面版Augment Token Manager功能完善
- 需要在Web端提供相同的令牌管理体验
- 保持与桌面版的功能一致性和数据兼容性

## 二、功能需求

### 2.1 基础令牌管理功能
- **OAuth授权流程**：生成授权URL，处理授权码，获取访问令牌
- **令牌CRUD操作**：创建、读取、更新、删除用户令牌
- **令牌数据字段**：tenant_url, access_token, portal_url, email_note, 创建时间等
- **用户隔离**：每个用户只能访问自己的令牌数据
- **数据加密**：敏感的access_token字段需要加密存储

### 2.2 用户界面需求
- **步骤式引导界面**：保持与桌面版相似的3步操作流程
- **令牌列表管理**：展示、编辑、删除、复制令牌功能
- **响应式设计**：适配桌面和移动端
- **集成工具箱UI**：使用现有的设计风格和组件

### 2.3 高级功能需求
- **账号快速切换**：通过本地代理程序实现无感账号切换
- **数据导入导出**：支持从桌面版导入数据，导出备份
- **Portal URL管理**：支持Portal链接的存储和快速访问
- **令牌状态检测**：检测令牌是否有效（可选功能）

### 2.4 本地代理集成需求
- **服务发现机制**：Web端自动检测本地代理服务
- **协议注册支持**：支持通过自定义协议调用本地程序
- **降级体验**：本地代理不可用时提供基础Web功能
- **跨平台兼容**：支持Windows、macOS、Linux

## 三、技术实现需求

### 3.1 后端API需求
```
POST /api/tools/augment/auth-url     - 生成授权URL
POST /api/tools/augment/token        - 获取访问令牌
GET  /api/tools/augment/tokens       - 获取用户令牌列表
POST /api/tools/augment/tokens       - 保存新令牌
PUT  /api/tools/augment/tokens/:id   - 更新令牌
DELETE /api/tools/augment/tokens/:id - 删除令牌
POST /api/tools/augment/import       - 导入令牌数据
GET  /api/tools/augment/export       - 导出令牌数据
```

### 3.2 数据模型需求
```javascript
AugmentToken Schema:
{
  _id: ObjectId,
  userId: ObjectId,              // 用户ID，实现数据隔离
  tokenId: String,               // 令牌唯一标识
  tenantUrl: String,             // 租户URL
  accessToken: String,           // 加密存储的访问令牌
  portalUrl: String,             // Portal URL（可选）
  emailNote: String,             // 邮箱备注（可选）
  isActive: Boolean,             // 是否激活
  createdAt: Date,               // 创建时间
  updatedAt: Date,               // 更新时间
  lastUsed: Date,                // 最后使用时间
  metadata: Object               // 扩展字段
}
```

### 3.3 前端组件需求
```
组件结构：
├── AugmentTokenManager.vue      (主组件)
├── components/
│   ├── AuthUrlGenerator.vue     (授权URL生成器)
│   ├── TokenProcessor.vue       (令牌处理器)
│   ├── TokenList.vue           (令牌列表)
│   ├── TokenForm.vue           (令牌表单)
│   ├── AccountSwitcher.vue     (账号切换器)
│   └── ImportExport.vue        (导入导出)
├── composables/
│   ├── useAugmentAuth.js       (OAuth逻辑)
│   ├── useTokenManager.js      (令牌管理)
│   ├── useLocalProxy.js        (本地代理)
│   └── useTokenStorage.js      (存储逻辑)
└── services/
    └── augmentService.js       (API服务)
```

### 3.4 本地代理程序需求
- **HTTP服务**：监听固定端口（8899-8903范围）
- **API端点**：ping, current-account, switch-account, accounts
- **协议注册**：注册augment-switch://协议处理器
- **安全机制**：CORS配置，临时token认证
- **服务发现**：在系统临时目录写入服务信息文件

## 四、安全需求

### 4.1 数据安全
- **访问令牌加密**：使用AES-256加密存储access_token
- **用户数据隔离**：严格的用户级别数据访问控制
- **传输安全**：HTTPS传输，敏感数据不在URL中传递

### 4.2 本地代理安全
- **CORS限制**：只允许特定域名访问本地服务
- **端口扫描保护**：限制扫描范围，添加超时机制
- **认证机制**：本地服务使用临时token验证请求

## 五、用户体验需求

### 5.1 操作流程
1. 用户访问工具箱中的"Augment令牌管理器"
2. 检测用户登录状态，未登录则引导登录
3. 检测本地代理可用性，显示相应功能
4. 提供步骤式令牌生成界面
5. 提供令牌列表管理界面

### 5.2 状态反馈
- **连接状态指示**：显示本地代理连接状态
- **操作结果反馈**：成功/失败消息提示
- **加载状态**：异步操作的加载指示器
- **错误处理**：友好的错误信息和恢复建议

### 5.3 兼容性处理
- **降级体验**：本地代理不可用时的基础功能
- **数据迁移**：从桌面版平滑迁移数据
- **浏览器兼容**：支持主流浏览器的现代特性

## 六、部署需求

### 6.1 Web端部署
- **工具注册**：在工具箱系统中注册新工具
- **路由配置**：添加/tools/dev/augment-token-manager路由
- **权限配置**：设置工具访问权限（需要登录）

### 6.2 本地代理部署
- **安装包集成**：在现有桌面应用中集成HTTP服务
- **系统注册**：自动注册协议处理器和服务发现
- **可选安装**：用户可选择是否启用本地代理功能

## 七、开发优先级

### Phase 1 (核心功能)
- OAuth授权流程实现
- 基础令牌管理（CRUD）
- 用户界面集成
- 数据加密和用户隔离

### Phase 2 (增强功能)
- 本地代理服务开发
- 账号切换功能
- 数据导入导出
- 状态检测和反馈

### Phase 3 (优化功能)
- 性能优化
- 错误处理完善
- 用户体验优化
- 文档和帮助系统

## 八、技术风险评估

### 8.1 主要风险
- **跨域安全限制**：Web端与本地代理通信的安全限制
- **浏览器兼容性**：不同浏览器对协议处理的支持差异
- **数据迁移复杂性**：桌面版数据格式与Web版的兼容性

### 8.2 风险缓解措施
- **多重连接方案**：协议调用 + HTTP服务发现
- **渐进式增强**：基础功能优先，高级功能可选
- **完善的降级机制**：确保基础功能在任何环境下可用

## 九、验收标准

### 9.1 功能验收
- [ ] 完整的OAuth授权流程
- [ ] 令牌CRUD操作正常
- [ ] 用户数据严格隔离
- [ ] 本地代理连接成功
- [ ] 账号切换功能正常

### 9.2 性能验收
- [ ] 页面加载时间 < 3秒
- [ ] API响应时间 < 1秒
- [ ] 本地代理检测 < 2秒

### 9.3 安全验收
- [ ] 敏感数据加密存储
- [ ] 用户权限验证正确
- [ ] 跨域访问控制有效

## 十、项目时间规划

### 10.1 Phase 1 (2周)
- 后端API开发
- 数据模型设计
- 基础前端组件

### 10.2 Phase 2 (2周)
- 本地代理开发
- 高级功能实现
- 集成测试

### 10.3 Phase 3 (1周)
- 性能优化
- 用户体验完善
- 文档编写

---

**文档版本**：1.0  
**创建日期**：2025-09-08  
**负责人**：开发团队  
**审核状态**：待审核
