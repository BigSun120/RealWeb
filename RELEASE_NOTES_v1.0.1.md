# 🚨 紧急安全更新 - v1.0.1

## 重要安全修复

本版本修复了一个**严重的安全漏洞**，强烈建议所有用户立即更新。

### 🔒 安全问题修复

1. **JWT密钥泄露修复**
   - 更换了所有JWT签名密钥
   - 使用加密级强度的64字节随机密钥
   - 所有现有用户会话将失效，需要重新登录

2. **数据库凭据安全加固**
   - 更新生产环境数据库密码
   - 使用24字符强随机密码
   - 同步更新Docker配置

3. **敏感信息清理**
   - 移除所有硬编码的敏感信息
   - 完善Git忽略规则
   - 添加安全配置指南

## 📋 升级步骤

### 对于开发者

1. **拉取最新代码**
   ```bash
   git pull origin main
   ```

2. **切换到开发环境**
   ```bash
   npm run env:dev
   ```

3. **重启开发服务器**
   ```bash
   npm run dev
   ```

### 对于生产环境

1. **备份数据**
   ```bash
   # 备份数据库
   mongodump --uri="mongodb://admin:旧密码@localhost:27017/personal_website_prod"
   ```

2. **更新代码**
   ```bash
   git pull origin main
   ```

3. **切换到生产配置**
   ```bash
   npm run env:prod
   ```

4. **重新构建和部署**
   ```bash
   npm run build
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

## ⚠️ 重要提醒

- **用户影响**: 所有用户需要重新登录
- **API影响**: 现有API令牌将失效
- **数据安全**: 用户数据完全安全，仅更换了访问密钥
- **功能影响**: 所有功能保持完全不变

## 🔍 安全检查

升级后建议进行以下检查：

1. **验证服务状态**
   ```bash
   curl http://your-domain/api/health
   ```

2. **检查用户登录**
   - 确认用户可以正常登录
   - 验证JWT令牌正常工作

3. **监控异常活动**
   - 检查访问日志
   - 监控数据库连接

## 📞 技术支持

如在升级过程中遇到问题，请：
1. 查看 `SECURITY_GUIDE.md` 安全指南
2. 查看 `ENVIRONMENT_SETUP.md` 环境配置指南
3. 检查应用日志文件

## 🙏 致谢

感谢GitGuardian安全扫描服务帮助发现此安全问题。
