# 预览区域优化指南

## 已完成的修改 ✅

1. **导入新图标** (第211行)
```javascript
import { CopyDocument, InfoFilled, Document, List, EditPen, FullScreen, Close } from '@element-plus/icons-vue';
```

2. **添加状态变量** (第232行)
```javascript
const isFullScreen = ref(false);
```

3. **添加全屏函数** (第441-447行)
```javascript
function openFullScreen() {
  isFullScreen.value = true;
}

function closeFullScreen() {
  isFullScreen.value = false;
}
```

4. **橙色边框样式** (第505-525行)
```scss
.preview-section {
  margin-bottom: 24px;
  background: #fafafa;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  
  // 微微发橙光的边框效果
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 12px;
    background: linear-gradient(135deg, #ff9a56 0%, #ffb366 50%, #ffc477 100%);
    z-index: -1;
    opacity: 0.6;
  }
}
```

## 需要手动添加的部分 ⚠️

### 1. 添加全屏按钮 (在第127行之后)

在复制和展开按钮后面添加：

```vue
            <el-button
              :icon="FullScreen"
              @click="openFullScreen"
              size="small"
              title="全屏预览"
            >
              全屏
            </el-button>
          </div>
        </div>
```

### 2. 添加全屏对话框 (在第378行"使用统计对话框"之前)

```vue
    <!-- 全屏预览 -->
    <el-dialog
      v-model="isFullScreen"
      title="预览"
      fullscreen
      :show-close="false"
      class="fullscreen-preview-dialog"
    >
      <template #header>
        <div class="fullscreen-header">
          <div class="header-left">
            <h3> 预览</h3>
            <div class="preview-stats">
              <span class="stat-item">
                <el-icon><Document /></el-icon>
                {{ previewStats.chars }} 字符
              </span>
              <span class="stat-item">
                <el-icon><List /></el-icon>
                {{ previewStats.lines }} 行
              </span>
              <span class="stat-item" v-if="previewStats.words > 0">
                <el-icon><EditPen /></el-icon>
                {{ previewStats.words }} 词
              </span>
            </div>
          </div>
          <div class="header-actions">
            <el-button
              :icon="CopyDocument"
              @click="copyToClipboard"
              type="primary"
            >
              复制
            </el-button>
            <el-button
              :icon="Close"
              @click="closeFullScreen"
            >
              关闭
            </el-button>
          </div>
        </div>
      </template>
      <div class="fullscreen-content">
        <pre>{{ renderedContent }}</pre>
      </div>
    </el-dialog>
```

### 3. 更新样式颜色 (替换以下几个部分)

#### a) section-header 去除白色 (第527-532行)
```scss
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  // 删除: color: white;
}
```

#### b) h4 标题改为深色 (第539-551行)
```scss
h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;  // 改为深色
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    font-size: 20px;
  }
}
```

#### c) preview-stats 改为白色胶囊 (第554-574行)
```scss
.preview-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #606266;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background: white;
    padding: 4px 10px;
    border-radius: 12px;
    border: 1px solid #e4e7ed;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .el-icon {
      font-size: 14px;
      color: #ff9a56;  // 橙色图标
    }
  }
}
```

#### d) header-actions 去除样式 (第576-591行)
```scss
.header-actions {
  display: flex;
  gap: 8px;
  // 删除所有按钮样式覆盖
}
```

#### e) 滚动条改为橙色 (第617-624行)
```scss
&::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #ff9a56 0%, #ffb366 100%);
  border-radius: 4px;

  &:hover {
    background: linear-gradient(135deg, #ff8844 0%, #ffa055 100%);
  }
}
```

### 4. 添加全屏对话框样式 (在第696行末尾之前)

```scss
// 全屏预览样式
:deep(.fullscreen-preview-dialog) {
  .el-dialog__header {
    padding: 20px 30px;
    background: #f5f5f5;
    border-bottom: 1px solid #e4e7ed;
  }

  .el-dialog__body {
    padding: 30px;
    background: #fafafa;
    height: calc(100vh - 80px);
    overflow: auto;
  }

  .fullscreen-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .header-left {
      display: flex;
      align-items: center;
      gap: 24px;

      h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #303133;
      }

      .preview-stats {
        display: flex;
        gap: 16px;
        font-size: 14px;

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: white;
          padding: 6px 14px;
          border-radius: 16px;
          border: 1px solid #e4e7ed;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
          color: #606266;

          .el-icon {
            color: #ff9a56;
          }
        }
      }
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }
  }

  .fullscreen-content {
    background: white;
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 30px;
    min-height: 100%;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ff9a56 0%, #ffb366 50%, #ffc477 100%);
      z-index: -1;
      opacity: 0.4;
    }

    pre {
      margin: 0;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
      font-size: 16px;
      line-height: 1.8;
      color: #2c3e50;
      white-space: pre-wrap;
      word-wrap: break-word;
      letter-spacing: 0.3px;
    }
  }
}
```

## 最终效果

- ✅ 柔和的橙色渐变边框（不是紫色）
- ✅ 白色胶囊状统计标签，图标为橙色
- ✅ 全屏预览功能
- ✅ 橙色渐变滚动条
- ✅ 深色文字，易于阅读
