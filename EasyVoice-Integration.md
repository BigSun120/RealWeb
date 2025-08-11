## EasyVoice 集成方案（计划与契约）

本方案基于对 `test/easyVoice-main` 源码的阅读与路由梳理，目标是在现有网站“工具箱”中落地一个“文本转语音”工具，并通过统一的前缀 `/api/tools/tts/*` 访问 EasyVoice 服务。

### 1. 架构与落地方式

- 推荐方案 A（独立服务 + 反向代理）
  - 以 Docker 或 Node 方式运行 EasyVoice（端口 3000），对外暴露 `http://<easyvoice-host>:3000/api/v1/tts/*`。
  - 我们前端开发态通过 Vite 代理，生产通过网关/Nginx 将 `/api/tools/tts/*` 反代到 EasyVoice。
  - 优点：解耦、升级简单；风险小。
- 备选方案 B（子服务并入后端）
  - 将 `packages/backend` 作为子服务整合到现有后端，统一端口/鉴权。
  - 风险：依赖与配置冲突，升级成本较高。

建议先落地方案 A，后续视运维与需求收敛考虑 B。

### 2. EasyVoice 可用 API（从源码提取）

后端路由（`packages/backend/src/routes/tts.route.ts`）：

- GET `/engines`：返回可用引擎/声音信息（含语言/voices 列表）
- GET `/voiceList`：返回支持的声音列表
- GET `/task/stats`：返回任务统计
- GET `/task/:id`：查询任务详情
- GET `/download/:file`：下载音频
- POST `/create`：创建任务（非流式）
- POST `/createStream`：创建任务（流式返回）
- POST `/generate`：直接生成并返回结果（短文本）
- POST `/generateJson`：多段 JSON 生成（长文本、多角色）

请求校验 Schema（`packages/backend/src/schema/generate.ts`）：

- Edge 直参（非 LLM）：
  - `{ text: string(min 5), voice: string, rate?: string, pitch?: string, volume?: string, useLLM?: false }`
- LLM 推荐：
  - `{ text: string(min 5), openaiBaseUrl: url, openaiKey: string, openaiModel: string, useLLM: true }`
- JSON 方案：
  - `{ data: Array<{ text: string, voice: string, rate?: string, pitch?: string, volume?: string }>} }

响应包装（参考 `packages/frontend/src/api/tts.ts`）：

- 通用：`{ success: boolean, code: number, message?: string, data?: T }`
- 生成：`{ audio: string, file: string, srt?: string, size?: number, id: string }`
- 下载：直接文件流；或错误 JSON

注意与限制：

- 直生 `/generate` 有长度限制（`DIRECT_GEN_LIMIT`），超长文本需走流式或 JSON。
- `download/:file` 会校验扩展名与路径，需通过安全网关透传。

### 3. 统一前缀与代理策略

- 开发态（Vite）：
  - 当前已取消前端直连 EasyVoice 的代理，统一经后端 `/api/tools/tts/*` 转发，便于鉴权与审计。
- 生产态（Nginx/Gateway）：
  - 将 `/api/tools/tts` 反代到 EasyVoice 服务地址；同时在网关执行鉴权、配额与审计。

Nginx 示例：

```
location /api/tools/tts/ {
  proxy_pass http://easyvoice:3000/api/v1/tts/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 4. 环境变量与运行地址

- 运行地址（默认）：`http://localhost:3500/api/v1/tts`（推荐本地开发使用 3500 端口；生产可用 3000 或其它端口）
- 环境变量（摘自 README 与 schema 初始化逻辑）：
  - `PORT=3000`
  - `OPENAI_BASE_URL=https://api.openai.com/v1`（或兼容地址，如 `https://openrouter.ai/api/v1/`）
  - `OPENAI_API_KEY=***`
  - `MODEL_NAME=gpt-4o-mini`（示例）
  - `RATE_LIMIT_WINDOW=1`（分钟）
  - `RATE_LIMIT=10`
  - `EDGE_API_LIMIT=3`（并发 1~10 内，过高可能被限流）

见根目录 `easyvoice.env.example` 示例。

### 5. 前端页面原型（`/tools/media/txttovoice`）

页面以 EasyVoice `Generate.vue` 交互为准（不抄代码，仅复刻行为）：

- 左侧：文本输入区
  - 支持粘贴/上传 txt；清空按钮
- 右侧：语音设置
  - 语音模式：预设（Edge-TTS）/ AI 推荐（OpenAI 兼容）
  - 预设：语言/性别/语音 下拉；`rate/volume/pitch` 滑块
  - AI 推荐：`openaiBaseUrl/openaiKey/openaiModel` 输入
  - 试听：`previewText` 输入 + 试听按钮（短文本直生 `/generate`）
- 操作区：生成语音（短文本直生，长文本流式 `/createStream`）、重置配置
- 进度条：展示生成进度（流式采用 `ReadableStream` + 自增进度/真实加载时长估计）
- 音频列表：`file/audio/srt/size` 列表，支持播放、下载（`/download/:file`）、进度展示
- 错误处理：对 400/429/500 分类提示；中文模型/英文文本等场景提示

数据契约（前端 -> 网关 `/api/tools/tts`）：

- 预设直生：
  - POST `/generate`，body：`{ text, voice, rate: '+10%', pitch: '+2Hz', volume: '+0%', useLLM: false }`
- AI 推荐：
  - POST `/generate` 或 `/createStream`，body：`{ text, useLLM: true, openaiBaseUrl, openaiKey, openaiModel }`
- 多角色：
  - POST `/generateJson`，body：`{ data: [{ text, voice, rate, pitch, volume }, ...] }`
- 任务：
  - POST `/create` 或 `/createStream`；GET `/task/:id`；GET `/task/stats`
- 下载：
  - GET `/download/:file`

### 6. 鉴权/限流/审计

- 网关在转发前校验登录态与权限（若需），记录调用日志（脱敏）。
- 双限流：网关层 + EasyVoice 内置 `RATE_LIMIT*` 与 `EDGE_API_LIMIT`。

### 7. 运维与清理

- EasyVoice 挂载 `audio` 目录；定期清理过期文件（策略：时间或配额）。
- 健康检查 `/engines`；错误上报。

### 8. 里程碑

- M1：接入代理与页面骨架，联通 `/voiceList`、短文本 `/generate`
- M2：接入流式 `/createStream` 与下载 `/download`
- M3：接入 JSON 多角色 `/generateJson`、任务详情与统计
- M4：完善管理端配置、限额与监控

### 9. 兼容性与注意事项

- `DIRECT_GEN_LIMIT` 控制直生阈值；超长文本走流式。
- `download/:file` 只允许白名单后缀；不可向下遍历路径。
- 开发态代理路径要优先匹配 `/api/tools/tts`，避免被更宽泛的 `/api` 捕获。

### 10. 地址与端口修改指引（本地/生产）

- 本地启动 EasyVoice（端口 3500 推荐）

  - Docker：
    - 使用 3500 端口映射避免与 Vite 冲突：`docker run -d -p 3500:3000 --env-file ./easyvoice.env.example -v $(pwd)/audio:/app/audio cosincox/easyvoice:latest`
    - 或设置容器内端口（如镜像支持 `PORT`）：`-e PORT=3500 -p 3500:3500`
  - Node：
    - 在 `test/easyVoice-main/packages/backend/.env` 或项目根 `.env` 设置 `PORT=3500`，启动后访问 `http://localhost:3500/api/v1/tts`。

- 前端（开发态）说明

  - 现已仅保留到后端的 `/api` 代理。前端不需要再感知 EasyVoice 真实地址。
  - 若需更改统一前缀，修改后端路由 `backend/src/routes/tools.js` 与 `backend/src/routes/tools/tts.js`。

- 生产（Nginx/网关）修改位置

  - 网关规则中将 `/api/tools/tts/` 反代到实际地址：
    - `proxy_pass http://<easyvoice-host>:3000/api/v1/tts/;`
  - 如生产端口或路径变更，同步替换上述地址；如前缀调整，同步修改 `location` 路径。

- OpenAI/LLM 环境变量

  - 位于 EasyVoice 服务侧：
    - `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`MODEL_NAME` 等在服务器环境或容器 `--env-file` 中配置（参考 `easyvoice.env.example`）。
  - 若在前端启用“AI 推荐”模式传参，也可由前端表单透传，服务端会优先使用请求体；未提供时回退到服务端环境变量。
  - 后端代理地址通过环境变量 `EASYVOICE_BASE_URL` 指定（示例：`http://localhost:3500/api/v1/tts`）。

- 验证流程（修改后务必执行）
  1. 访问 `GET http://<映射域>/api/tools/tts/voiceList`（经前端或网关代理）应返回 200 与 voice 列表。
  2. 用短文本测试 `POST /api/tools/tts/generate`（body 参考第 5 节契约），应返回音频 `audio` 与 `file`。
  3. 用长文本测试 `POST /api/tools/tts/createStream`，确认流式播放与进度正常。
