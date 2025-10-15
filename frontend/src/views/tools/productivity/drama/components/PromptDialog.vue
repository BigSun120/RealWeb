<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="700px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <div class="prompt-dialog-content">
      <div class="prompt-tips">
        <el-alert
          title="使用提示"
          type="info"
          :closable="false"
        >
          <template #default>
            <div class="tips-content">
              <p>📋 点击下方"复制提示词"按钮，然后：</p>
              <ol>
                <li>打开 ChatGPT / Claude / 文心一言 等AI平台</li>
                <li>粘贴提示词到对话框</li>
                <li>复制AI的回复</li>
                <li>点击下方"粘贴AI回复"按钮，智能解析并导入</li>
              </ol>
            </div>
          </template>
        </el-alert>
      </div>

      <div class="prompt-display">
        <div class="prompt-header">
          <span class="prompt-label">生成的提示词</span>
          <div class="header-actions">
            <el-button
              v-if="!isEditing"
              size="small"
              :icon="Edit"
              @click="handleEdit"
            >
              编辑
            </el-button>
            <el-button
              v-else
              size="small"
              type="primary"
              :icon="Check"
              @click="handleSaveEdit"
            >
              完成
            </el-button>
            <el-tag size="small" type="success">
              {{ editablePrompt.length }} 字符
            </el-tag>
          </div>
        </div>
        <div class="prompt-content">
          <el-input
            v-if="isEditing"
            v-model="editablePrompt"
            type="textarea"
            :rows="15"
            placeholder="编辑提示词..."
          />
          <pre v-else>{{ editablePrompt }}</pre>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button
          v-if="supportsPaste"
          type="success"
          :icon="DocumentAdd"
          @click="handlePasteResponse"
        >
          粘贴AI回复
        </el-button>
        <el-button
          type="primary"
          :icon="CopyDocument"
          @click="handleCopy"
        >
          复制提示词
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, Edit, Check, DocumentAdd } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  prompt: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'AI 提示词'
  },
  // 是否支持粘贴AI回复
  supportsPaste: {
    type: Boolean,
    default: false
  },
  // 粘贴模式：用于判断如何解析AI回复
  // 可选值: 'solution' (解决方案)
  pasteMode: {
    type: String,
    default: 'solution',
    validator: (value) => ['solution'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue', 'paste']);

// 编辑状态和可编辑的提示词
const isEditing = ref(false);
const editablePrompt = ref(props.prompt);

// 监听 prompt 变化，更新可编辑内容
watch(() => props.prompt, (newVal) => {
  editablePrompt.value = newVal;
  isEditing.value = false;
});

// 关闭对话框
const handleClose = () => {
  isEditing.value = false;
  emit('update:modelValue', false);
};

// 开始编辑
const handleEdit = () => {
  isEditing.value = true;
};

// 完成编辑
const handleSaveEdit = () => {
  isEditing.value = false;
  ElMessage.success('编辑完成');
};

// 复制提示词
const handleCopy = async () => {
  const textToCopy = editablePrompt.value;
  try {
    await navigator.clipboard.writeText(textToCopy);
    ElMessage.success('提示词已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    
    // 降级方案
    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      ElMessage.success('提示词已复制到剪贴板');
    } catch (e) {
      ElMessage.error('复制失败，请手动复制');
    }
  }
};

// 粘贴AI回复
const handlePasteResponse = () => {
  // 关闭当前对话框
  emit('update:modelValue', false);
  // 触发粘贴事件，由父组件处理
  emit('paste', { mode: props.pasteMode });
};
</script>

<style scoped>
.prompt-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.prompt-tips {
  margin-bottom: 4px;
}

.tips-content {
  font-size: 14px;
  line-height: 1.6;
}

.tips-content p {
  margin: 0 0 8px 0;
  font-weight: 600;
}

.tips-content ol {
  margin: 0;
  padding-left: 20px;
}

.tips-content li {
  margin: 4px 0;
}

.prompt-display {
  background: #F5F7FA;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #E4E7ED;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.prompt-label {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-content {
  background: white;
  border-radius: 6px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #DCDFE6;
}

.prompt-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 自定义滚动条 */
.prompt-content::-webkit-scrollbar {
  width: 8px;
}

.prompt-content::-webkit-scrollbar-track {
  background: #F5F7FA;
  border-radius: 4px;
}

.prompt-content::-webkit-scrollbar-thumb {
  background: #C0C4CC;
  border-radius: 4px;
}

.prompt-content::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

/* 响应式 */
@media (max-width: 768px) {
  .prompt-content {
    max-height: 300px;
  }

  .prompt-content pre {
    font-size: 12px;
  }
}
</style>
