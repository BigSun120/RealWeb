# 短剧剧本导出功能

## 概述

短剧脚本生成器现在支持将项目剧本导出为文本文件（TXT 或 Markdown 格式），方便分享、备份和进一步编辑。

## 功能特点

### 1. 多格式支持
- **TXT 格式**：纯文本格式，适合通用阅读和编辑
- **Markdown 格式**：支持富文本格式，适合文档化和版本管理

### 2. 灵活的导出选项
- **完整导出**：导出所有已完成的剧集
- **包含未完成**：可选择导出包括草稿和进行中的剧集
- **指定范围**：可以只导出前N集的内容

### 3. 完整的项目信息
导出的文件包含：
- 项目基本信息（名称、类型、集数、状态、进度等）
- 世界观设定（如果已设定）
- 主要角色列表及描述
- 分集剧本详细内容
  - 每集标题和状态
  - 内容概要
  - 场景描述（地点、时间、氛围、内容）
  - 关键对白
  - 结尾悬念
  - 备注信息

## API 使用

### 后端 API

#### 端点
```
GET /api/tools/drama/projects/:id/export
```

#### 请求参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| format | String | 'txt' | 导出格式：txt、markdown 或 md |
| includeIncomplete | Boolean | false | 是否包含未完成的剧集 |
| upToEpisode | Number | null | 截止到哪一集（不指定则导出全部）|
| includeMetadata | Boolean | true | 是否包含创作辅助信息（关键对白、结尾悬念、备注） |

#### 示例请求
```bash
# 导出TXT格式，仅已完成剧集
GET /api/tools/drama/projects/507f1f77bcf86cd799439011/export?format=txt

# 导出Markdown格式，包含未完成剧集
GET /api/tools/drama/projects/507f1f77bcf86cd799439011/export?format=markdown&includeIncomplete=true

# 导出前10集
GET /api/tools/drama/projects/507f1f77bcf86cd799439011/export?format=txt&upToEpisode=10

# 纯净剧本版（不包含创作辅助信息）
GET /api/tools/drama/projects/507f1f77bcf86cd799439011/export?format=txt&includeMetadata=false
```

#### 响应
- **成功**：返回文件下载流，Content-Type 为 `text/plain` 或 `text/markdown`
- **失败**：返回 JSON 格式的错误信息

```json
{
  "code": 400,
  "message": "暂无已完成的剧集可导出，请先完成至少一集剧本",
  "data": {
    "warnings": [
      "第1集：未命名 (草稿)",
      "第2集：新的开始 (进行中)"
    ]
  }
}
```

### 前端 API

#### 导入模块
```javascript
import { exportDramaProject } from '@/api/drama';
```

#### 函数签名
```javascript
exportDramaProject(projectId, options)
```

#### 参数说明
- `projectId` (String): 项目 ID
- `options` (Object): 导出选项
  - `format` (String): 导出格式，可选值 'txt'、'markdown'、'md'，默认 'txt'
  - `includeIncomplete` (Boolean): 是否包含未完成的剧集，默认 false
  - `upToEpisode` (Number): 截止到哪一集，默认 null（导出全部）

#### 使用示例

```javascript
// 基本用法：导出为 TXT
async function handleExportTxt() {
  try {
    const blob = await exportDramaProject(projectId, { format: 'txt' });
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败：' + error.message);
  }
}

// 导出为 Markdown
async function handleExportMarkdown() {
  try {
    const blob = await exportDramaProject(projectId, { 
      format: 'markdown' 
    });
    
    // 下载处理同上...
  } catch (error) {
    ElMessage.error('导出失败');
  }
}

// 导出包含未完成的剧集
async function handleExportAll() {
  try {
    const blob = await exportDramaProject(projectId, { 
      format: 'txt',
      includeIncomplete: true 
    });
    // 下载处理...
  } catch (error) {
    ElMessage.error('导出失败');
  }
}

// 导出前10集
async function handleExportRange() {
  try {
    const blob = await exportDramaProject(projectId, { 
      format: 'markdown',
      upToEpisode: 10
    });
    // 下载处理...
  } catch (error) {
    ElMessage.error('导出失败');
  }
}
```

## UI 集成建议

### 在项目工作台添加导出按钮

```vue
<template>
  <div class="export-controls">
    <el-button-group>
      <el-button 
        icon="Document" 
        @click="handleExport('txt')"
        :loading="exporting"
      >
        导出TXT
      </el-button>
      <el-button 
        icon="Document" 
        @click="handleExport('markdown')"
        :loading="exporting"
      >
        导出Markdown
      </el-button>
    </el-button-group>
    
    <el-dropdown @command="handleExportCommand">
      <el-button icon="More">
        更多选项<el-icon class="el-icon--right"><arrow-down /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="txt-all">
            导出全部（含未完成）- TXT
          </el-dropdown-item>
          <el-dropdown-item command="md-all">
            导出全部（含未完成）- Markdown
          </el-dropdown-item>
          <el-dropdown-item command="custom" divided>
            自定义导出...
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { exportDramaProject } from '@/api/drama';

const props = defineProps({
  projectId: String,
  projectName: String
});

const exporting = ref(false);

// 基本导出
async function handleExport(format) {
  exporting.value = true;
  try {
    const blob = await exportDramaProject(props.projectId, { format });
    downloadBlob(blob, format);
    ElMessage.success('导出成功');
  } catch (error) {
    console.error('Export failed:', error);
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
}

// 下拉菜单导出
async function handleExportCommand(command) {
  const [format, option] = command.split('-');
  
  exporting.value = true;
  try {
    const options = { format };
    if (option === 'all') {
      options.includeIncomplete = true;
    }
    
    if (command === 'custom') {
      // 打开自定义导出对话框
      showCustomExportDialog();
      return;
    }
    
    const blob = await exportDramaProject(props.projectId, options);
    downloadBlob(blob, format);
    ElMessage.success('导出成功');
  } catch (error) {
    console.error('Export failed:', error);
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
}

// 下载 Blob 文件
function downloadBlob(blob, format) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const ext = format === 'markdown' ? 'md' : 'txt';
  link.download = `${props.projectName}_${Date.now()}.${ext}`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
</script>
```

### 自定义导出对话框示例

```vue
<el-dialog v-model="exportDialogVisible" title="自定义导出">
  <el-form :model="exportForm" label-width="120px">
    <el-form-item label="导出格式">
      <el-radio-group v-model="exportForm.format">
        <el-radio label="txt">TXT 纯文本</el-radio>
        <el-radio label="markdown">Markdown</el-radio>
      </el-radio-group>
    </el-form-item>
    
    <el-form-item label="导出范围">
      <el-radio-group v-model="exportForm.rangeType">
        <el-radio label="completed">仅已完成</el-radio>
        <el-radio label="all">包含未完成</el-radio>
        <el-radio label="custom">自定义集数</el-radio>
      </el-radio-group>
    </el-form-item>
    
    <el-form-item 
      v-if="exportForm.rangeType === 'custom'" 
      label="截止集数"
    >
      <el-input-number 
        v-model="exportForm.upToEpisode" 
        :min="1" 
        :max="projectEpisodeCount"
      />
    </el-form-item>
  </el-form>
  
  <template #footer>
    <el-button @click="exportDialogVisible = false">取消</el-button>
    <el-button type="primary" @click="confirmExport" :loading="exporting">
      确认导出
    </el-button>
  </template>
</el-dialog>
```

## 导出文件格式示例

### TXT 格式示例
```
============================================================
项目名称：霸道总裁的复仇之路
============================================================

类型：霸道总裁
总集数：60
状态：剧本中
进度：35%
简介：一场商业阴谋引发的复仇与爱情故事

------------------------------------------------------------

世界观设定
------------------------------------------------------------
背景：现代都市商业环境
设定：顶级企业之间的竞争和权力斗争

主要角色
------------------------------------------------------------
陈默寒 (男主角)
冷峻的企业总裁，背负家族仇恨

林晓雪 (女主角)
独立坚强的职场精英

========== 第 1 集 ==========
标题：相遇
状态：已完成
概要：男女主角在商业活动中初次相遇...

--- 场景1 | 豪华酒店宴会厅 ---
时间：晚上8点
氛围：觥筹交错，人声鼎沸
...
```

### Markdown 格式示例
```markdown
# 霸道总裁的复仇之路

## 项目信息

- **类型**：霸道总裁
- **总集数**：60
- **状态**：剧本中
- **进度**：35%
- **简介**：一场商业阴谋引发的复仇与爱情故事

---

## 世界观设定

**背景**：现代都市商业环境

**设定**：顶级企业之间的竞争和权力斗争

---

## 主要角色

### 陈默寒 (男主角)

冷峻的企业总裁，背负家族仇恨

### 林晓雪 (女主角)

独立坚强的职场精英

---

## 分集剧本

## 第1集：相遇

**状态**：已完成

**概要**：男女主角在商业活动中初次相遇...

### 场景1：豪华酒店宴会厅

**时间**：晚上8点

**氛围**：觥筹交错，人声鼎沸

...
```

## 错误处理

### 常见错误及解决方案

1. **无已完成剧集**
   - 错误信息：`暂无已完成的剧集可导出`
   - 解决方案：至少完成一集剧本，或使用 `includeIncomplete: true` 导出草稿

2. **项目不存在**
   - 错误信息：`项目不存在`
   - 解决方案：检查项目 ID 是否正确，确认用户有访问权限

3. **无效的导出格式**
   - 错误信息：`不支持的导出格式`
   - 解决方案：使用支持的格式：txt、markdown 或 md

4. **服务器错误**
   - 错误信息：`导出过程中发生错误`
   - 解决方案：检查服务器日志，确认数据完整性

## 后续扩展计划

### 1. PDF 导出
- 支持带格式的 PDF 文档导出
- 自定义封面和样式
- 添加页眉页脚

### 2. Word/DOCX 导出
- 导出为 Microsoft Word 格式
- 支持自定义模板
- 保留格式和样式

### 3. 批量导出
- 一次导出多个项目
- 打包为 ZIP 文件
- 支持批量格式转换

### 4. 云端存储集成
- 直接保存到云盘（阿里云OSS、腾讯云COS等）
- 分享链接生成
- 在线预览

## 技术实现细节

### 后端实现
- 位置：`backend/src/utils/dramaExporter.js`
- 功能：剧本格式化、完整性检查、文本生成
- 依赖：无外部依赖，纯 JavaScript 实现

### 前端实现
- 位置：`frontend/src/api/drama.js`
- 功能：API 调用、Blob 下载处理
- 响应类型：`responseType: 'blob'`

### 路由配置
- 后端路由：`GET /api/tools/drama/projects/:id/export`
- 控制器方法：`dramaController.exportProject`
- 认证：需要登录认证

## 总结

导出功能提供了灵活且强大的方式来保存和分享你的短剧作品。通过简单的 API 调用，你可以轻松地将项目导出为多种格式，满足不同的使用场景。

如有问题或建议，请联系开发团队。
