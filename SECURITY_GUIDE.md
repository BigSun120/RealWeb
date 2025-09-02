# 🔒 安全配置指南

## 🔑 密钥管理

### JWT 密钥生成

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 数据库密码生成

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64').replace(/[+/=]/g, '').substring(0, 24))"
```

## 🛡️ 安全最佳实践

- ✅ 所有敏感配置使用环境变量
- ✅ 开发和生产环境使用不同的密钥
- ✅ 配置文件不提交到 Git 仓库
- 🔄 定期更换 JWT 密钥（建议每 3 个月）
- 🔄 定期更换数据库密码（建议每 6 个月）

## 🚨 安全事件响应

如果发现密钥泄露：

1. **立即更换**所有相关密钥
2. **强制登出**所有用户
3. **审查日志**查找异常活动
