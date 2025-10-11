<template>
  <el-dialog
    v-model="dialogVisible"
    :title="prompt?.title || '使用提示词'"
    width="900px"
    :close-on-click-modal="false"
    :lock-scroll="true"
    :modal-append-to-body="true"
    :append-to-body="true"
    @open="handleOpen"
    @close="handleClose"
  >
    <div class="prompt-usage" v-if="prompt">
      <!-- 提示词信息 -->
      <div class="prompt-info">
        <p class="prompt-description">{{ prompt.description }}</p>
        <div class="prompt-meta">
          <el-tag size="small">{{ getCategoryLabel(prompt.category) }}</el-tag>
          <el-tag size="small" type="info" v-if="prompt.aiModel">{{ prompt.aiModel }}</el-tag>
          <span class="usage-count">已使用 {{ prompt.usageCount || 0 }} 次</span>
        </div>
      </div>

      <!-- 变量输入区 -->
      <div class="variables-section" v-if="variables.length > 0">
        <h4>填写变量</h4>
        <el-form ref="formRef" :model="variableValues" :rules="variableRules" label-position="top">
          <el-form-item
            v-for="variable in variables"
            :key="variable.name"
            :label="variable.name"
            :prop="variable.name"
          >
            <!-- 文本输入 -->
            <el-input
              v-if="variable.type === 'text'"
              v-model="variableValues[variable.name]"
              :placeholder="variable.default || `输入${variable.name}`"
              clearable
              @input="updatePreview"
            />

            <!-- 多行文本 -->
            <el-input
              v-else-if="variable.type === 'textarea'"
              v-model="variableValues[variable.name]"
              type="textarea"
              :rows="4"
              :placeholder="variable.default || `输入${variable.name}`"
              @input="updatePreview"
            />

            <!-- 数字输入 -->
            <el-input-number
              v-else-if="variable.type === 'number'"
              v-model="variableValues[variable.name]"
              :min="variable.validation?.min"
              :max="variable.validation?.max"
              :placeholder="variable.default"
              style="width: 100%"
              @change="updatePreview"
            />

            <!-- 日期选择 -->
            <el-date-picker
              v-else-if="variable.type === 'date'"
              v-model="variableValues[variable.name]"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
              @change="updatePreview"
            />

            <!-- 下拉选择 -->
            <el-select
              v-else-if="variable.type === 'select'"
              v-model="variableValues[variable.name]"
              :placeholder="`选择${variable.name}`"
              style="width: 100%"
              @change="updatePreview"
            >
              <el-option
                v-for="option in variable.options"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>

            <template #extra v-if="variable.default">
              <span class="variable-hint">默认值: {{ variable.default }}</span>
            </template>
          </el-form-item>
        </el-form>
      </div>

      <!-- 预览区 -->
      <div class="preview-section">
        <div class="section-header">
          <h4>预览</h4>
          <el-button
            type="primary"
            :icon="CopyDocument"
            @click="copyToClipboard"
            size="small"
          >
            复制到剪贴板
          </el-button>
        </div>
        <div class="preview-content">
          <pre>{{ renderedContent }}</pre>
        </div>
      </div>

      <!-- 使用反馈 -->
      <div class="feedback-section" v-if="showFeedback">
        <h4>使用反馈（可选）</h4>
        <el-rate v-model="feedback.rating" show-text />
        <el-input
          v-model="feedback.comment"
          type="textarea"
          :rows="3"
          placeholder="分享你的使用体验，帮助改进这个提示词..."
          maxlength="500"
          show-word-limit
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button type="primary" @click="recordAndCopy" :loading="recording">
        记录使用并复制
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument } from '@element-plus/icons-vue';
import { useClipboard } from '@vueuse/core';
import { trackCopy } from '@/utils/promptTracking';

const promptService = inject('promptService');

const props = defineProps({
  visible: Boolean,
  prompt: Object
});

const emit = defineEmits(['update:visible', 'used']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const formRef = ref(null);
const recording = ref(false);
const showFeedback = ref(false);
const variables = ref([]);
const variableValues = reactive({});
const variableRules = reactive({});
const renderedContent = ref('');

const feedback = reactive({
  rating: 0,
  comment: ''
});

const { copy, copied } = useClipboard();

// 监听提示词变化
watch(() => props.prompt, (newPrompt) => {
  if (newPrompt) {
    initializeVariables();
    updatePreview();
  }
}, { immediate: true });

// 监听复制状态
watch(copied, (isCopied) => {
  if (isCopied) {
    ElMessage.success('已复制到剪贴板');
  }
});

function initializeVariables() {
  if (!props.prompt) return;

  // 从提示词内容解析变量
  variables.value = props.prompt.variables || promptService.parseVariables(props.prompt.content);

  // 初始化变量值和验证规则
  Object.keys(variableValues).forEach(key => delete variableValues[key]);
  Object.keys(variableRules).forEach(key => delete variableRules[key]);

  variables.value.forEach(variable => {
    // 设置默认值
    variableValues[variable.name] = variable.default || '';

    // 设置验证规则
    if (variable.required) {
      variableRules[variable.name] = [
        { required: true, message: `请输入${variable.name}`, trigger: 'blur' }
      ];
    }
  });
}

function updatePreview() {
  if (!props.prompt) return;
  renderedContent.value = promptService.renderPrompt(props.prompt.content, variableValues);
}

async function copyToClipboard() {
  await copy(renderedContent.value);
  
  // 埋点: 记录复制事件
  if (props.prompt) {
    trackCopy(props.prompt.id, {
      source: 'usage',
      variablesFilled: variables.value.length > 0,
      variableCount: variables.value.length,
      prompt: props.prompt
    });
  }
}

async function recordAndCopy() {
  try {
    // 验证表单
    if (formRef.value) {
      const valid = await formRef.value.validate();
      if (!valid) {
        ElMessage.warning('请填写所有必填变量');
        return;
      }
    }

    recording.value = true;

    // 记录使用
    await promptService.recordUsage(props.prompt.id, {
      variableValues,
      rating: feedback.rating || undefined,
      feedback: feedback.comment || undefined
    });

    // 复制到剪贴板
    await copyToClipboard();
    
    // 注意: copyToClipboard 中已经调用了 trackCopy，这里不需要重复调用

    ElMessage.success('已记录使用并复制到剪贴板');
    emit('used');

    // 延迟关闭，让用户看到成功提示
    setTimeout(() => {
      handleClose();
    }, 500);
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message);
  } finally {
    recording.value = false;
  }
}

function handleOpen() {
  // 当对话框打开时，使用更强大的滚动锁定
  document.documentElement.classList.add('dialog-open');
  document.body.classList.add('dialog-open');
}

function handleClose() {
  // 当对话框关闭时，恢复滚动
  document.documentElement.classList.remove('dialog-open');
  document.body.classList.remove('dialog-open');

  dialogVisible.value = false;
  resetFeedback();
}

function resetFeedback() {
  feedback.rating = 0;
  feedback.comment = '';
  showFeedback.value = false;
}

function getCategoryLabel(category) {
  const labels = {
    writing: '写作',
    coding: '编程',
    translation: '翻译',
    analysis: '分析',
    creative: '创意',
    other: '其他'
  };
  return labels[category] || category;
}
</script>

<style scoped lang="scss">
.prompt-usage {
  .prompt-info {
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    margin-bottom: 24px;

    .prompt-description {
      margin: 0 0 12px;
      color: #606266;
      line-height: 1.6;
    }

    .prompt-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .usage-count {
        font-size: 13px;
        color: #909399;
      }
    }
  }

  .variables-section {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .variable-hint {
      font-size: 12px;
      color: #909399;
    }
  }

  .preview-section {
    margin-bottom: 24px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }
    }

    .preview-content {
      padding: 16px;
      background: #f5f7fa;
      border: 1px solid #ebeef5;
      border-radius: 8px;
      max-height: 400px;
      overflow-y: auto;

      pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.6;
        color: #303133;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    }
  }

  .feedback-section {
    padding: 16px;
    background: #f0f9ff;
    border: 1px solid #d1e9ff;
    border-radius: 8px;

    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .el-rate {
      margin-bottom: 12px;
    }
  }
}
</style>
