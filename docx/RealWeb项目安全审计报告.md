# RealWeb 项目安全审计报告

- 审计日期：2025-09-25
- 审计范围：后端 Node.js API、前端 Vue 应用、配置与脚本、文件上传路径
- 审计方式：静态代码审查 + 配置核查
- 综合安全等级：⚠️ 中等偏高风险（存在多个需优先修复的高危问题）

## 1. 风险评估总览
| 模块 | 风险等级 | 评分 (0-10) | 说明 |
| --- | --- | --- | --- |
| 身份认证与会话 | 🟡 中 | 6 | JWT 与会话管理完善，但前端存储方式存在提升空间 |
| 授权与后台管理 | 🔴 高 | 3 | 管理配置接口缺少管理员校验，可被任意登录用户篡改 |
| API 输入与调用 | 🟡 中 | 6 | 业务接口验证较好，工具型接口缺少限制 |
| 文件上传与下载 | 🔴 高 | 3 | 视频下载工具存在命令注入与任意文件读风险 |
| 凭据与敏感信息 | 🔴 高 | 3 | Augment 令牌以明文存储并直接对外输出 |
| 前端安全 | 🟡 中 | 5 | Markdown 转义完善，但令牌保存在 Web Storage 暴露于 XSS |
| 日志与监控 | 🟢 较好 | 7 | 有安全审计日志与活动记录，建议补充敏感字段脱敏 |

## 2. 高危问题（需立即修复）

### 2.1 安全配置接口缺乏管理员校验
- 风险描述：`/api/security/configs`、`/api/security/config/:id`、`/api/security/config/:id/activate` 等接口只使用 `auth` 中间件，任何登录用户都能读取、修改并激活全局安全策略配置。
- 影响：普通用户可篡改密码策略、验证码规则等敏感设置，导致整体安全基线被绕过，产生权限提升。
- 证据：`backend/src/routes/security.js:30`、`backend/src/routes/security.js:46`、`backend/src/routes/security.js:95`
- 整改建议：为所有安全配置读写接口追加管理员校验（例如复用 `adminAuth`），并记录安全审计日志；同时在路由层面拆分只读与写入权限。

### 2.2 视频下载接口存在命令注入
- 风险描述：在 `/api/tools/video/parse` 与 `/api/tools/video/download` 中，用户提供的 `url` 与 `format` 被直接拼接进 shell 命令并由 `execSync` 执行。
- 影响：攻击者可构造恶意链接执行任意系统命令，完整接管服务器。
- 证据：`backend/src/routes/tools/video.js:104`、`backend/src/routes/tools/video.js:291`、`backend/src/routes/tools/video.js:301`
- 整改建议：改用 `spawn`/`execFile` 并以参数数组形式传递；对 URL 做严格白名单校验（协议、域名、字符集），对 `format` 做固定枚举；在容器或受限账户中运行下载子进程。

### 2.3 视频下载文件服务缺乏路径校验
- 风险描述：`/api/tools/video/file/:filename` 与 `/api/tools/youtube/file/:filename` 仅使用 `path.join` 拼接路径，未校验解析后的真实路径是否仍位于临时目录内。
- 影响：攻击者可通过 `../../../../etc/passwd` 等输入下载任意服务器文件，导致敏感信息泄露。
- 证据：`backend/src/routes/tools/video.js:366`、`backend/src/routes/tools/youtube.js:379`
- 整改建议：使用 `path.resolve` 后比对前缀限制在白名单目录；对文件名应用严格正则（仅字母数字和受控分隔符）；为下载目录设置只读白名单并启用临时凭据。

### 2.4 Augment 令牌以明文存储并对外输出
- 风险描述：Augment 访问令牌在数据库中直接以明文保存，并在列表接口的 `toJSON` 转换中原样返回前端；令牌池模型同样未加密存储。
- 影响：任何拥有接口访问权限的用户或日志读取者都可复制令牌执行第三方 API 调用，造成账号滥用或资费损失。
- 证据：`backend/src/models/AugmentToken.js:40`、`backend/src/models/AugmentToken.js:144`、`backend/src/routes/tools/augment.js:157`、`backend/src/models/TokenPool.js:4`
- 整改建议：
  - 在落库前使用强随机 32 字节密钥 + `crypto.createCipheriv('aes-256-gcm', key, iv)` 加密，并妥善管理密钥；
  - API 响应仅返回脱敏值（末尾 4 位等），禁止明文输出；
  - 为敏感字段设置访问日志与权限分级，必要时分离到专用密钥管理服务。

## 3. 中危问题

### 3.1 加密实现不正确且存在弱密钥回退
- 现状：AugmentService 的加密实现使用已废弃的 `crypto.createCipher`/`createDecipher`，并在未配置密钥时退回到固定字符串。
- 影响：即使开启加密，也无法提供真实的机密性，且默认密钥极易被猜测。
- 证据：`backend/src/services/AugmentService.js:16`、`backend/src/services/AugmentService.js:404`、`backend/src/services/AugmentService.js:436`
- 建议：改为 `createCipheriv`/`createDecipheriv` + 唯一 IV，并强制从环境变量读取 32 字节密钥；启动时校验密钥长度，未配置时拒绝启动。

### 3.2 文件上传类型校验不足
- 现状：上传中间件仅依赖 `file.mimetype.startsWith('image/')` 判定，缺少魔数/内容检测，且默认允许任意非头像字段上传。
- 影响：攻击者可上传伪造 MIME 的脚本文件，再结合静态文件访问获得 RCE/XSS。
- 证据：`backend/src/middleware/upload.js:57`、`backend/src/middleware/upload.js:199`、`backend/src/middleware/upload.js:229`
- 建议：读取文件头校验魔数、限制扩展名白名单、上传后使用安全扫描工具（如 ClamAV），并将可执行位与权限控制在最小化范围。

### 3.3 静态上传目录过于开放
- 现状：`/uploads` 静态资源对任何来源开放 `Access-Control-Allow-Origin: *`，且未做鉴权。
- 影响：内部生成的头像、文章图片可被第三方任意调用，若包含敏感信息可能泄露；同时为 CSRF 链接提供便利。
- 证据：`backend/app.js:158`
- 建议：仅对受信任的前端域开放；对于私有资源改造为受控下载接口；对响应头部进行缓存与跨域限制配置。

### 3.4 前端令牌保存在 Web Storage
- 现状：登录成功后将 JWT 存入 `localStorage` 或 `sessionStorage`，在存在 XSS 时易被窃取。
- 影响：一旦出现前端脚本注入，攻击者可获取令牌并冒充用户。
- 证据：`frontend/src/stores/user.js:14`
- 建议：切换为 HttpOnly/SameSite Cookie 携带访问令牌，或在 Web Storage 中存储短期交换码并配合后端一次性刷新机制；同时强化 CSP 与输入过滤。

## 4. 低危与改进项
- 上传中间件在生产环境 `console.log` 输出真实路径，易泄露目录结构（`backend/src/middleware/upload.js:24`）。
- `dotenv` 在生产环境无配置校验，建议启动时检查关键变量是否缺失。
- Docker / 部署脚本未限制 `yt-dlp` 等工具的可执行路径，建议在部署文档中标注沙箱要求。

## 5. 现有安全能力亮点
- 身份认证流程使用 `express-validator` 做输入验证（`backend/src/routes/auth.js:18`），提高了基础防护。
- 用户密码采用 `bcrypt` 加盐哈希（`backend/src/models/User.js:192`），符合行业最佳实践。
- 系统具备会话统计与异常检测能力（`backend/src/utils/sessionManager.js:15`），便于后续扩展安全监控。
- 评论渲染对用户内容进行自定义转义处理，缓解 XSS 攻击面（`frontend/src/components/CommentItem.vue:228`）。

## 6. 建议的加固优先级路线
1. **P0（立即）**：修复安全配置权限缺陷，重构视频下载工具命令执行与文件访问；下线 Augment 令牌明文输出。
2. **P1（1 周内）**：重写令牌加密实现，完成上传/下载路径白名单校验与 MIME 双重检测；调整静态资源跨域策略。
3. **P2（2-4 周）**：将登录令牌迁移到 HttpOnly Cookie，完善安全配置审计日志，补充关键环境变量缺省校验。
4. **持续项**：制定令牌轮换机制、补充自动化安全测试与依赖审计。

## 7. 建议的验证与监控动作
- 对视频下载与文件服务执行路径遍历、命令注入 PoC 测试，确保修复有效。
- 增加自动化脚本，启动时校验 `JWT_SECRET`、加密密钥、数据库连接等必需变量。
- 安排第三方渗透测试覆盖工具箱模块，关注外部依赖（yt-dlp、python 脚本）的安全更新。
- 开启敏感接口的安全日志审阅，结合 `SecurityLogger` 输出构建实时告警。

## 附录：审计方法
- 代码基位置：`backend/`, `frontend/`
- 使用工具：静态代码阅读、模式搜索（`rg`）、配置文件检查
- 未执行自动化单元测试或动态渗透；建议修复后补充对应验收测试。
