# AI API集成功能 - 快速启动指南

## 🚀 5分钟快速开始

### 步骤1: 配置环境变量

编辑 `.env` 文件,添加加密密钥:

```env
# AI密钥加密用的密钥(32字符,必须配置)
ENCRYPTION_SECRET=your-32-character-secret-key-here-!!!!

# 其他已有配置保持不变...
```

**⚠️ 重要**: `ENCRYPTION_SECRET` 必须是32字符的随机字符串！

生成方法:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# 或手动生成32个随机字符
```

### 步骤2: 启动服务

```bash
# 1. 启动后端
cd backend
npm start

# 2. 启动前端(新终端)
cd frontend
npm run dev
```

### 步骤3: 测试用户AI连接功能

1. **登录账户**
   - 访问 `http://localhost:3000`
   - 使用已有账户登录(或注册新账户)

2. **访问AI连接管理**
   - 访问 `http://localhost:3000/ai-connections`
   - 或在个人中心找到"AI连接"入口

3. **添加第一个AI连接**
   - 点击"添加连接"按钮
   - 选择提供商(推荐DeepSeek,便宜)
   - 填写信息:
     ```
     连接名称: 我的DeepSeek
     提供商: DeepSeek
     基础URL: https://api.deepseek.com (自动填充)
     API密钥: sk-你的密钥
     默认模型: deepseek-chat (自动填充)
     ```
   - 点击"创建"

4. **验证连接**
   - 在连接卡片中点击"验证"按钮
   - 等待验证结果
   - 成功后会显示"已验证"状态

5. **测试AI生成**
   - 打开浏览器开发者工具(F12)
   - 在Console中执行:
   ```javascript
   const token = localStorage.getItem('token'); // 获取登录token
   
   fetch('http://localhost:8001/api/ai/generate', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       messages: [
         { role: 'user', content: 'Hello, 请用中文回答' }
       ],
       temperature: 0.8,
       maxTokens: 100
     })
   })
   .then(res => res.json())
   .then(data => {
     console.log('AI回复:', data.data.content);
     console.log('使用统计:', data.data.usage);
   });
   ```

## 📋 功能检查清单

测试以下功能确保一切正常:

### 用户AI连接管理
- [ ] 创建连接
- [ ] 编辑连接
- [ ] 删除连接
- [ ] 验证API密钥
- [ ] 查看使用统计
- [ ] 设置默认连接

### AI生成功能
- [ ] 基础生成(使用用户密钥)
- [ ] 查看生成结果
- [ ] 查看token使用量
- [ ] 查看预估成本

## 🔧 故障排查

### 问题1: "ENCRYPTION_SECRET未配置"
**解决**: 在.env文件中添加32字符的ENCRYPTION_SECRET

### 问题2: "平台AI服务未配置"
**原因**: 没有配置平台级AI服务,且用户也没有BYOK
**解决**: 
- 方案A: 用户配置自己的BYOK(推荐用于测试)
- 方案B: 管理员配置平台AI服务

### 问题3: API密钥验证失败
**检查**:
1. 密钥格式是否正确(通常以sk-开头)
2. 密钥是否有效(未过期/未超额)
3. baseURL是否正确
4. 网络连接是否正常

### 问题4: 生成失败
**检查**:
1. 是否已配置并验证AI连接
2. 查看浏览器控制台的错误信息
3. 查看后端日志

## 💡 API密钥获取指南

### DeepSeek (推荐,便宜)
1. 访问 https://platform.deepseek.com/
2. 注册/登录
3. 充值(最低5元)
4. 创建API密钥
5. 复制密钥(格式: sk-...)

### OpenAI
1. 访问 https://platform.openai.com/
2. 注册/登录(需要国外手机号)
3. 充值(需要国外信用卡)
4. 创建API密钥
5. 复制密钥(格式: sk-...)

### 其他平台
- Anthropic: https://console.anthropic.com/
- Google AI: https://makersuite.google.com/

## 📝 下一步

完成基础测试后,可以:

1. **管理员**: 配置平台AI服务(待实现)
2. **开发者**: 在剧本工具中集成AI生成功能(待实现)
3. **用户**: 开始使用AI辅助创作

## 📚 相关文档

- **技术文档**: `AI_API_INTEGRATION.md`
- **测试指南**: `FRONTEND_TEST_GUIDE.md`
- **进度报告**: `PROJECT_PROGRESS.md`

## 🆘 需要帮助?

- 查看技术文档的"故障排查"部分
- 查看后端日志: `backend/logs/`
- 检查浏览器控制台错误

---

**提示**: 第一次使用建议先用DeepSeek测试,因为:
- ✅ 价格便宜(0.001元/1k tokens)
- ✅ 支持中文
- ✅ 响应速度快
- ✅ 注册简单
- ✅ 充值方便
