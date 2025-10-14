# AI连接管理功能 - 快速测试指南

## 问题修复总结

✅ **已修复**：两个页面的axios导入路径错误
- 错误：`import axios from '@/utils/axios'`（文件不存在）
- 正确：`import request from '@/utils/request'`（项目使用的请求工具）

## 测试前准备

### 1. 启动服务

```bash
# 1. 启动后端（在后端目录）
cd backend
npm run dev

# 2. 启动前端（在前端目录，新开一个终端）
cd frontend
npm run dev
```

### 2. 确认服务状态
- 后端：`http://localhost:5000`（或您的后端端口）
- 前端：`http://localhost:3000`

---

## 测试步骤

### 测试1：个人中心 - AI连接管理

#### 访问入口
1. **通过菜单**：登录 → 个人中心 → 左侧菜单 → 点击"AI连接管理"
2. **直接访问**：`http://localhost:3000/ai-connections`

#### 预期结果
- ✅ 页面正常加载，无404错误
- ✅ 显示"AI连接管理"标题
- ✅ 可以看到"添加连接"按钮
- ✅ 表格正常显示（即使数据为空）

#### 如果仍有错误
检查浏览器控制台，确认是否还有其他导入错误。

---

### 测试2：后台管理 - 公共API连接管理

#### 访问入口
1. **通过菜单**：管理员登录 → 后台管理 → 工具箱 → "公共API连接"
2. **直接访问**：`http://localhost:3000/admin/public-ai-connections`

#### 预期结果
- ✅ 页面正常加载，无404错误
- ✅ 显示"公共API连接管理"标题
- ✅ 可以看到"添加公共连接"按钮
- ✅ 表格正常显示（即使数据为空）

#### 如果仍有错误
检查浏览器控制台，确认是否还有其他导入错误。

---

## 关于后端API

### 当前状态
⚠️ **后端API尚未实现**，因此：
- 页面UI可以正常显示和交互
- 点击按钮会发送请求到后端
- 但会收到404或500错误（API不存在）

### 预期行为
- 添加/编辑/删除操作会显示"请求的资源不存在"或类似错误
- 这是**正常的**，因为后端API还未实现

---

## 后端API待实现列表

### 个人AI连接管理
```
GET    /api/ai/connections          # 获取个人连接列表
POST   /api/ai/connections          # 创建个人连接
PUT    /api/ai/connections/:id      # 更新个人连接
DELETE /api/ai/connections/:id      # 删除个人连接
POST   /api/ai/connections/:id/validate  # 验证连接
GET    /api/ai/stats/user           # 获取用户统计
```

### 公共API连接管理（管理员）
```
GET    /api/admin/ai-connections/public          # 获取公共连接列表
POST   /api/admin/ai-connections/public          # 创建公共连接
PUT    /api/admin/ai-connections/public/:id      # 更新公共连接
DELETE /api/admin/ai-connections/public/:id      # 删除公共连接
PATCH  /api/admin/ai-connections/public/:id/status    # 切换启用状态
PATCH  /api/admin/ai-connections/public/:id/default   # 设置为默认
POST   /api/admin/ai-connections/public/:id/test      # 测试连接
```

---

## 故障排查

### 问题：页面仍显示404错误

**可能原因1**：前端服务未正确启动
```bash
# 检查前端服务
cd frontend
npm run dev
```

**可能原因2**：浏览器缓存
- 按 `Ctrl + Shift + R` 强制刷新
- 或清除浏览器缓存

**可能原因3**：文件未保存
- 确认所有修改的文件已保存
- 重启前端开发服务器

### 问题：显示网络错误

**原因**：后端API未实现
- 这是正常的
- 等待后端API开发完成

### 问题：路由跳转失败

**检查**：
1. 路由配置是否正确
2. 用户是否有相应权限（管理员权限）
3. 用户是否已登录

---

## 成功标准

### 前端测试通过标准
1. ✅ 个人AI连接管理页面可以正常打开
2. ✅ 公共API连接管理页面可以正常打开（管理员）
3. ✅ 无404模块加载错误
4. ✅ UI界面完整显示
5. ✅ 可以打开添加/编辑对话框
6. ✅ 表单验证正常工作

### 完整功能测试通过标准（需后端支持）
1. ✅ 可以创建AI连接
2. ✅ 可以编辑AI连接
3. ✅ 可以删除AI连接
4. ✅ 可以验证/测试连接
5. ✅ 数据正确保存到数据库
6. ✅ 分页功能正常

---

## 下一步行动

### 立即可做
1. ✅ 测试前端页面是否能正常打开
2. ✅ 检查UI交互是否正常
3. ✅ 验证表单验证逻辑

### 需要后端支持
1. ⏳ 实现后端API接口
2. ⏳ 数据库表设计和创建
3. ⏳ API安全验证
4. ⏳ 完整功能测试

---

## 联系说明

如果测试过程中遇到问题：
1. 检查浏览器控制台的错误信息
2. 检查网络请求的状态码
3. 确认前后端服务都在运行
4. 查看 `AI_CONNECTIONS_FIX.md` 了解详细修复说明

测试日期：2025-10-14
修复状态：✅ 前端修复完成 / ⏳ 等待后端API实现
