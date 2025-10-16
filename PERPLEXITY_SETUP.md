# 🚀 Perplexity 集成快速启动

## ✅ 已完成的工作

Perplexity Pro 账号反向代理已成功集成到 RealWeb！现在可以：
- ✅ 在个人中心配置 Perplexity 连接
- ✅ 手机和电脑跨设备使用
- ✅ 私有连接，只有你能用
- ✅ 自动统计使用量

---

## 📦 启动步骤

### 1. 安装依赖（已完成）
```bash
cd backend
npm install uuid  # ✅ 已安装
```

### 2. 启动服务
```bash
# 开发环境
npm run dev

# 生产环境
npm run deploy
```

### 3. 配置你的 Perplexity

#### 步骤 A: 获取 Session Token
1. 登录 https://www.perplexity.ai/
2. 按 F12 打开开发者工具
3. Application → Cookies → `__Secure-next-auth.session-token`
4. 复制完整的 token 值

#### 步骤 B: 在 RealWeb 中配置
1. 登录 RealWeb
2. 个人中心 → AI 连接
3. 添加连接：
   - **提供商**: Perplexity
   - **Session Token**: 粘贴你的 token
   - **私有连接**: 开启（推荐）
4. 点击"验证"确认配置成功

### 4. 开始使用
在 RealWeb 的 AI 功能中选择 Perplexity 连接即可！

---

## 📚 文档

- **用户指南**: `docs/Perplexity集成指南.md`
- **技术说明**: `docs/Perplexity集成实现说明.md`

---

## 🔧 修改的文件

### 后端
- ✅ `backend/src/services/PerplexityProxyService.js` (新增)
- ✅ `backend/src/services/AIGatewayService.js`
- ✅ `backend/src/models/UserAIConnection.js`
- ✅ `backend/src/controllers/aiGatewayController.js`

### 前端
- ✅ `frontend/src/views/user/AIConnections.vue`

---

## ⚠️ 注意事项

1. **Session Token 会过期**
   - 通常几天到几周
   - 过期后重新获取即可

2. **私有连接**
   - 建议开启，保护你的账号
   - 其他用户将无法看到

3. **使用频率**
   - 建议个人低频使用
   - 避免被 Perplexity 检测为异常

---

## 🎉 就这么简单！

现在你可以在任何设备上通过 RealWeb 使用 Perplexity Pro 了。

有问题？查看 `docs/Perplexity集成指南.md` 获取详细帮助。
