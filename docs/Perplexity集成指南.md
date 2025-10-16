# Perplexity 集成使用指南

## 📖 概述

RealWeb 已集成 Perplexity Pro 账号的反向代理功能，允许你在个人中心配置自己的 Perplexity 账号，实现跨设备使用。

### ✨ 特性

- ✅ **无缝集成** - 像使用 OpenAI/DeepSeek 一样使用 Perplexity
- ✅ **跨设备访问** - 手机、电脑都能用
- ✅ **私有连接** - 只有你能使用，其他用户看不到
- ✅ **统计追踪** - 自动记录使用量（Token 估算）
- ✅ **Pro 功能** - 使用 Perplexity Pro 的高级模型

---

## 🚀 快速开始

### 步骤 1: 获取 Session Token

1. 登录你的 Perplexity Pro 账号：https://www.perplexity.ai/
2. 打开浏览器开发者工具（F12）
3. 切换到 **Application** 或 **存储** 标签
4. 展开 **Cookies** → `https://www.perplexity.ai`
5. 找到 `__Secure-next-auth.session-token`
6. 复制它的值（类似：`eyJhbGciOiJkaXIi...`）

![获取 Session Token 示例](https://via.placeholder.com/600x300?text=Session+Token+Location)

---

### 步骤 2: 在 RealWeb 中配置

1. 登录 RealWeb
2. 进入 **个人中心** → **AI 连接**
3. 点击 **添加连接**
4. 填写表单：
   - **连接名称**: `我的 Perplexity`
   - **提供商**: 选择 `Perplexity`
   - **基础URL**: 自动填充 `https://www.perplexity.ai`
   - **Session Token**: 粘贴你的 token
   - **默认模型**: 自动填充 `pplx_alpha`（Pro 模型）
   - **私有连接**: 开启（推荐）
5. 点击 **创建**

![配置界面示例](https://via.placeholder.com/600x400?text=Configuration+Form)

---

### 步骤 3: 验证连接

1. 创建成功后，找到刚才添加的连接
2. 点击 **验证** 按钮
3. 如果显示 **已验证**，说明配置成功 ✅

---

### 步骤 4: 使用 Perplexity

在 RealWeb 的 AI 功能中：
1. 选择你创建的 `我的 Perplexity` 连接
2. 输入问题
3. 获得 Perplexity Pro 的搜索增强回答

---

## 🔧 配置说明

### 必填字段

| 字段 | 说明 | 示例 |
|------|------|------|
| 连接名称 | 自定义名称 | `我的 Perplexity` |
| Session Token | 从浏览器获取 | `eyJhbGciOiJkaXIi...` |
| 默认模型 | Pro 模型 | `pplx_alpha` |

### 可选字段

| 字段 | 说明 | 默认值 |
|------|------|--------|
| 温度 | 控制随机性 | 0.8 |
| 最大Tokens | 响应长度 | 4000 |
| 设为默认 | 默认使用此连接 | 关闭 |
| **私有连接** | 只有你能使用 | **建议开启** |

---

## 🔐 安全说明

### Session Token 安全

- ✅ **加密存储** - Token 存储在数据库中，仅你可访问
- ✅ **HTTPS 传输** - 所有请求都通过加密通道
- ✅ **私有连接** - 开启后，其他用户看不到你的配置

### 注意事项

⚠️ **Token 有效期**
- Session Token 会定期过期（通常几天到几周）
- 过期后需要重新获取并更新
- 如果验证失败，说明 Token 已过期

⚠️ **账号安全**
- 不要分享你的 Session Token
- 建议定期更新 Token
- 如果怀疑泄露，立即在 Perplexity 网站上退出登录

---

## 🌐 跨设备使用

### 电脑上使用
```
1. 打开 https://yourdomain.com
2. 登录你的 RealWeb 账号
3. 选择 "我的 Perplexity" 连接
4. 直接使用 ✅
```

### 手机上使用
```
1. 打开 https://yourdomain.com
2. 登录同一个 RealWeb 账号
3. 选择 "我的 Perplexity" 连接
4. 直接使用 ✅
```

### 其他用户
```
- 无法看到你的 Perplexity 连接 ❌
- 只能使用他们自己配置的 AI
```

---

## 🛠️ 技术细节

### 工作原理

```
你的请求 → RealWeb Backend → Perplexity API
              ↓
         - 注入 Session Token
         - 处理 SSE 流式响应
         - 转换为统一格式
         - 记录使用统计
```

### 支持的功能

- ✅ 网络搜索增强
- ✅ 实时信息获取
- ✅ 引用来源显示
- ✅ Pro 模型 (pplx_alpha)
- ✅ 中文优化

### 限制

- ❌ 不支持图片上传（Perplexity API 限制）
- ❌ 不支持流式输出（后端会等待完整响应）
- ⚠️ Token 统计为估算值（Perplexity 不返回实际 token 数）

---

## ❓ 常见问题

### Q1: Token 如何获取？
**A:** 登录 Perplexity → F12 → Application → Cookies → 复制 `__Secure-next-auth.session-token`

### Q2: Token 多久过期？
**A:** 通常几天到几周，过期后会提示验证失败，需重新获取。

### Q3: 是否影响我的 Pro 会员？
**A:** 不会。你只是通过 RealWeb 使用自己的 Perplexity 账号，不会产生额外费用。

### Q4: 其他人能用我的账号吗？
**A:** 不能。开启"私有连接"后，只有你能使用。

### Q5: 手机能用吗？
**A:** 能！登录 RealWeb 后，跨设备同步使用。

### Q6: 验证失败怎么办？
**A:** 说明 Token 过期，重新获取并更新即可。

### Q7: 能否同时配置多个账号？
**A:** 可以，每个连接独立配置，互不影响。

### Q8: 是否符合 Perplexity 服务条款？
**A:** 这是通过你自己的账号访问，类似于浏览器插件的方式。但请注意：
   - ⚠️ 技术上可行，但可能违反服务条款
   - ⚠️ 账号有被封禁的风险
   - ✅ 建议：个人低频使用，避免异常高频请求

---

## 📝 更新日志

### v1.0.0 (2025-10-16)
- ✅ 初始版本
- ✅ 支持 Perplexity Pro 账号集成
- ✅ 私有连接功能
- ✅ 跨设备访问
- ✅ Token 验证

---

## 🆘 需要帮助？

如遇到问题，请检查：

1. ✅ Session Token 是否正确完整
2. ✅ Token 是否过期（尝试重新获取）
3. ✅ 网络连接是否正常
4. ✅ Perplexity 账号是否为 Pro 会员

仍有问题？联系管理员：1461020599@qq.com

---

**祝使用愉快！** 🎉
