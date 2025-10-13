# 导出功能调试指南

## 问题诊断

### 常见错误

#### 1. TypeError: Failed to execute 'createObjectURL' on 'URL'

**原因：** 传入 `createObjectURL` 的不是有效的 Blob 对象

**解决方案：**
- 已修复：在 `exportDramaProject` API 中正确提取 `response.data`
- 已添加：Blob 对象验证和错误处理

#### 2. 网络请求失败

**检查步骤：**

1. **检查后端服务是否运行**
   ```bash
   # 在后端目录运行
   npm run dev
   ```

2. **检查 API 路由是否正确注册**
   - 路由文件：`backend/src/routes/tools/drama.js`
   - 路由路径：`GET /api/tools/drama/projects/:id/export`
   - 控制器方法：`dramaController.exportProject`

3. **检查前端 API 配置**
   - API 文件：`frontend/src/api/drama.js`
   - 请求 URL：`/tools/drama/projects/${id}/export`
   - 响应类型：`responseType: 'blob'`

## 测试步骤

### 1. 使用浏览器开发者工具

打开浏览器控制台（F12）：

**网络（Network）标签页：**
- 筛选 XHR 请求
- 查找 `/export` 请求
- 检查请求状态码
- 查看响应头 `Content-Type`
- 检查响应内容

**控制台（Console）标签页：**
- 查看错误日志
- 检查 Blob 对象内容

### 2. 手动测试 API

使用 curl 或 Postman 测试后端 API：

```bash
# 替换 {projectId} 和 {token}
curl -X GET "http://localhost:5000/api/tools/drama/projects/{projectId}/export?format=txt" \
  -H "Authorization: Bearer {token}" \
  --output test_export.txt
```

**预期结果：**
- 状态码：200
- Content-Type: `text/plain; charset=utf-8`
- 文件内容：剧本文本

### 3. 检查响应数据

在前端代码中添加调试日志：

```javascript
// frontend/src/api/drama.js
export const exportDramaProject = async (id, options = {}) => {
  // ... 省略其他代码
  
  const response = await request({
    url: `/tools/drama/projects/${id}/export`,
    method: 'get',
    params,
    responseType: 'blob'
  });
  
  console.log('Export response:', response); // 调试：检查响应对象
  console.log('Response data type:', typeof response.data); // 调试：检查数据类型
  console.log('Is Blob?', response.data instanceof Blob); // 调试：检查是否为 Blob
  console.log('Blob type:', response.data?.type); // 调试：检查 Blob 类型
  console.log('Blob size:', response.data?.size); // 调试：检查 Blob 大小
  
  const blob = response.data;
  
  // ... 省略其他代码
};
```

## 修复后的代码要点

### 1. API 层 (`frontend/src/api/drama.js`)

```javascript
export const exportDramaProject = async (id, options = {}) => {
  // ... 参数处理
  
  try {
    const response = await request({
      url: `/tools/drama/projects/${id}/export`,
      method: 'get',
      params,
      responseType: 'blob'
    });
    
    // ✅ 关键：提取 response.data
    const blob = response.data;
    
    // ✅ 检查是否为错误响应（JSON）
    if (blob.type && blob.type.includes('application/json')) {
      const text = await blob.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || '导出失败');
    }
    
    return blob;
  } catch (error) {
    // ✅ 错误处理
    if (error.response?.data instanceof Blob) {
      // 尝试从 Blob 中提取错误消息
      // ...
    }
    throw error;
  }
};
```

### 2. 下载工具 (`frontend/src/utils/download.js`)

```javascript
export function downloadBlob(blob, filename) {
  // ✅ 验证 Blob 对象
  if (!blob || !(blob instanceof Blob)) {
    console.error('downloadBlob: Invalid blob object', blob);
    throw new Error('无效的文件数据');
  }
  
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('downloadBlob: Failed to download', error);
    throw new Error('下载文件失败: ' + error.message);
  }
}
```

### 3. 请求拦截器 (`frontend/src/utils/request.js`)

```javascript
request.interceptors.response.use(
  response => {
    // ✅ 对于 blob 响应，返回整个 response 对象
    if (response.config.responseType === 'blob') {
      return response; // 不是 response.data
    }
    
    // 其他响应正常处理
    // ...
  },
  error => {
    // 错误处理
    // ...
  }
);
```

## 可能的问题和解决方案

### 问题 1: 后端返回 JSON 错误而不是 Blob

**症状：**
- Blob type 是 `application/json`
- 无法创建 ObjectURL

**解决方案：**
- 已在 API 中添加 JSON 错误检测
- 解析 JSON 并抛出友好的错误消息

### 问题 2: CORS 问题

**症状：**
- 控制台显示 CORS 错误
- 请求被阻止

**解决方案：**
```javascript
// backend/app.js
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### 问题 3: 文件内容为空

**症状：**
- Blob size 为 0
- 下载的文件是空的

**解决方案：**
- 检查后端是否有剧集数据
- 检查导出选项（是否只导出已完成剧集）
- 查看后端日志确认数据生成

### 问题 4: 文件名乱码

**症状：**
- 下载的文件名显示为乱码

**解决方案：**
```javascript
// 使用 encodeURIComponent 编码文件名
const filename = generateFilename(project.name, ext);
link.download = filename; // 浏览器会自动处理编码
```

## 完整测试流程

### 步骤 1: 准备测试数据

1. 创建一个测试项目
2. 添加世界观设定
3. 添加角色
4. 创建并完成至少一集剧本

### 步骤 2: 测试列表页导出

1. 进入项目列表页
2. 点击项目卡片的导出按钮
3. 验证对话框显示
4. 选择导出选项
5. 点击确认导出
6. 验证文件下载

### 步骤 3: 测试工作台导出

1. 打开项目工作台
2. 测试快速导出（主按钮）
3. 测试下拉菜单各选项
4. 测试自定义导出
5. 验证所有导出格式

### 步骤 4: 边界测试

1. 测试无剧集的项目
2. 测试只有草稿的项目
3. 测试网络断开情况
4. 测试大型项目（50+集）

## 调试技巧

### 1. 查看 Blob 内容

```javascript
// 在浏览器控制台中
const blob = /* 你的 Blob 对象 */;
const text = await blob.text();
console.log('Blob content:', text);
```

### 2. 模拟 Blob 下载

```javascript
// 创建测试 Blob
const testBlob = new Blob(['测试内容'], { type: 'text/plain' });
downloadBlob(testBlob, 'test.txt');
```

### 3. 监听网络请求

```javascript
// 在前端代码中
window.addEventListener('beforeunload', (e) => {
  console.log('Page is unloading');
});
```

## 成功标志

✅ 控制台无错误  
✅ Network 标签显示 200 状态码  
✅ 文件自动下载  
✅ 文件内容正确  
✅ 文件名包含时间戳  
✅ 文件格式正确（TXT/Markdown）  

## 需要帮助？

如果问题仍然存在：

1. 收集以下信息：
   - 浏览器控制台完整错误日志
   - Network 标签中的请求/响应详情
   - 后端服务日志
   - 测试步骤和预期vs实际结果

2. 检查：
   - 前端和后端是否都在运行
   - API 基础 URL 是否正确配置
   - 用户是否已登录（有 token）
   - 项目是否有可导出的内容

3. 尝试：
   - 清除浏览器缓存和 localStorage
   - 重启前后端服务
   - 使用隐私/无痕模式测试
   - 在不同浏览器中测试

---

**更新日期：** 2025-10-13  
**状态：** ✅ 已修复常见问题
