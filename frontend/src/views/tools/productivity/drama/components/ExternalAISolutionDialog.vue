<template>
  <el-dialog
    v-model="dialogVisible"
    title="生成解决方案 - 外部AI"
    width="900px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <!-- 步骤指示器 -->
    <el-steps :active="currentStep" align-center finish-status="success" class="mb-4">
      <el-step title="复制提示词" description="准备材料" />
      <el-step title="外部AI生成" description="使用Claude/GPT等AI" />
      <el-step title="导入方案" description="解析并应用" />
    </el-steps>

    <!-- 步骤内容 -->
    <div class="workflow-content">
      <!-- Step 0: 复制提示词 -->
      <div v-if="currentStep === 0" class="step-content">
        <el-alert
          title="第一步：复制解决方案生成提示词"
          type="info"
          :closable="false"
          class="mb-4"
        >
          <template #default>
            <p>请复制下方的提示词，然后前往外部AI平台获取解决方案。</p>
          </template>
        </el-alert>

        <div class="material-section">
          <div class="section-header">
            <h4>📋 解决方案生成提示词</h4>
            <el-button
              type="primary"
              size="small"
              :icon="DocumentCopy"
              @click="copyPrompt"
            >
              复制提示词
            </el-button>
          </div>
          
          <el-input
            v-model="prompt"
            type="textarea"
            :rows="15"
            readonly
            class="prompt-textarea"
          />
        </div>

        <el-alert type="warning" :closable="false" class="mt-4">
          <template #default>
            <p><strong>提示</strong>：外部AI将返回包含 <code>suggestedContent</code> 和 <code>explanation</code> 的JSON对象。</p>
          </template>
        </el-alert>
      </div>

      <!-- Step 1: 提示用户到外部AI执行 -->
      <div v-if="currentStep === 1" class="step-content">
        <el-alert
          title="第二步：在外部AI平台生成解决方案"
          type="warning"
          :closable="false"
          class="mb-4"
        >
          <template #default>
            <p>请按照以下步骤操作：</p>
            <ol class="instruction-list">
              <li>打开外部AI平台（推荐：Claude 3.5 Sonnet、GPT-4、DeepSeek等）</li>
              <li>粘贴刚才复制的提示词</li>
              <li>发送消息，等待AI返回解决方案</li>
              <li>复制AI返回的<strong>完整JSON对象</strong></li>
            </ol>
          </template>
        </el-alert>

        <el-card class="ai-platforms-card">
          <template #header>
            <span>推荐的AI平台</span>
          </template>
          <div class="platforms-list">
            <div class="platform-item">
              <el-tag type="primary">Claude 3.5 Sonnet</el-tag>
              <span>最佳选择，理解力强，输出规范</span>
            </div>
            <div class="platform-item">
              <el-tag type="success">GPT-4o</el-tag>
              <span>次佳选择，创意性好</span>
            </div>
            <div class="platform-item">
              <el-tag type="info">DeepSeek V3</el-tag>
              <span>国产选择，性价比高</span>
            </div>
          </div>
        </el-card>
      </div>

      <!-- Step 2: 导入AI回答并解析 -->
      <div v-if="currentStep === 2" class="step-content">
        <el-alert
          title="第三步：导入AI生成的解决方案"
          type="success"
          :closable="false"
          class="mb-4"
        >
          <template #default>
            <p>请将AI返回的JSON格式解决方案粘贴到下方文本框中。</p>
          </template>
        </el-alert>

        <el-form :model="importForm" label-width="100px">
          <el-form-item label="AI回答">
            <el-input
              v-model="importForm.aiResponse"
              type="textarea"
              :rows="12"
              placeholder="粘贴AI返回的JSON对象，例如：{&quot;suggestedContent&quot;:&quot;...&quot;,&quot;explanation&quot;:&quot;...&quot;}"
              @input="validateJSON"
            />
          </el-form-item>

          <!-- 实时验证提示 -->
          <el-form-item v-if="importForm.aiResponse">
            <div v-if="parseError" class="parse-status error">
              <el-icon><WarningFilled /></el-icon>
              <span>{{ parseError }}</span>
            </div>
            <div v-else-if="parsedSolution" class="parse-status success">
              <el-icon><SuccessFilled /></el-icon>
              <span>解析成功，已识别建议内容和说明</span>
            </div>
          </el-form-item>

          <!-- 预览解析结果 -->
          <el-form-item v-if="parsedSolution" label="预览">
            <el-card>
              <div class="solution-preview">
                <h4>💡 建议内容</h4>
                <pre class="preview-content">{{ parsedSolution.suggestedContent }}</pre>
                
                <el-divider />
                
                <h4>📝 修改说明</h4>
                <p>{{ parsedSolution.explanation }}</p>
              </div>
            </el-card>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        
        <div class="footer-right">
          <el-button
            v-if="currentStep > 0"
            @click="prevStep"
          >
            上一步
          </el-button>
          
          <el-button
            v-if="currentStep < 2"
            type="primary"
            @click="nextStep"
          >
            下一步
          </el-button>
          
          <el-button
            v-if="currentStep === 2"
            type="primary"
            :disabled="!parsedSolution"
            :loading="importing"
            @click="handleImport"
          >
            应用解决方案
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  DocumentCopy,
  WarningFilled,
  SuccessFilled
} from '@element-plus/icons-vue';
import { generateEpisodeSolutionPrompt } from '../utils/episodeCheckPrompts';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  issue: {
    type: Object,
    required: true
  },
  project: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits(['update:visible', 'solution-imported']);

// 响应式状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const currentStep = ref(0);
const prompt = ref('');
const importForm = ref({
  aiResponse: ''
});
const parsedSolution = ref(null);
const parseError = ref('');
const importing = ref(false);

// 初始化提示词
watch(() => props.visible, (visible) => {
  if (visible) {
    currentStep.value = 0;
    generatePrompt();
    resetImportForm();
  }
}, { immediate: true });

// 生成提示词
const generatePrompt = () => {
  try {
    prompt.value = generateEpisodeSolutionPrompt(props.issue, props.project);
  } catch (error) {
    ElMessage.error(error.message);
    dialogVisible.value = false;
  }
};

// 复制提示词
const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(prompt.value);
    ElMessage.success('提示词已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败，请手动选择复制');
  }
};

// 步骤导航
const nextStep = () => {
  if (currentStep.value < 2) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// 重置导入表单
const resetImportForm = () => {
  importForm.value.aiResponse = '';
  parsedSolution.value = null;
  parseError.value = '';
};

// 验证并解析JSON
const validateJSON = () => {
  const input = importForm.value.aiResponse.trim();
  
  if (!input) {
    parsedSolution.value = null;
    parseError.value = '';
    return;
  }

  try {
    // 智能清理JSON
    const cleanJSON = (jsonStr) => {
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log('🔧 JSON解析失败，尝试自动修复...');
        
        // 清理description/explanation字段中的未转义引号
        const cleaned = jsonStr.replace(
          /"(suggestedContent|explanation)"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"/g,
          (match, fieldName, content) => {
            let escaped = content;
            escaped = escaped.replace(/\\"/g, '___ESCAPED_QUOTE___');
            escaped = escaped.replace(/"/g, '\\"');
            escaped = escaped.replace(/___ESCAPED_QUOTE___/g, '\\"');
            return `"${fieldName}": "${escaped}"`;
          }
        );
        
        return JSON.parse(cleaned);
      }
    };
    
    // 尝试解析
    let solution = null;
    try {
      solution = cleanJSON(input);
    } catch {
      // 从代码块中提取
      const codeBlockMatch = input.match(/```(?:json)?\\s*\\n?([\\s\\S]*?)\\n?```/);
      if (codeBlockMatch) {
        solution = cleanJSON(codeBlockMatch[1].trim());
      } else {
        // 正则提取JSON对象
        const jsonMatch = input.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          solution = cleanJSON(jsonMatch[0]);
        } else {
          throw new Error('无法识别的JSON格式');
        }
      }
    }

    // 验证必填字段
    if (!solution.suggestedContent) {
      throw new Error('缺少必填字段：suggestedContent');
    }
    
    if (!solution.explanation) {
      throw new Error('缺少必填字段：explanation');
    }

    parsedSolution.value = {
      suggestedContent: solution.suggestedContent,
      explanation: solution.explanation,
      generatedAt: new Date()
    };
    parseError.value = '';

  } catch (error) {
    parsedSolution.value = null;
    parseError.value = error.message || 'JSON解析失败';
  }
};

// 导入解决方案
const handleImport = async () => {
  if (!parsedSolution.value) {
    ElMessage.warning('没有可导入的解决方案');
    return;
  }

  importing.value = true;

  try {
    // 触发导入事件，由父组件处理应用逻辑
    emit('solution-imported', parsedSolution.value);
    
    ElMessage.success('解决方案已导入');
    
    // 清空数据
    parsedSolution.value = null;
    importForm.value.aiResponse = '';
    
    dialogVisible.value = false;
  } catch (error) {
    console.error('导入失败:', error);
    ElMessage.error('导入失败：' + error.message);
  } finally {
    importing.value = false;
  }
};

// 关闭对话框
const handleClose = () => {
  if (currentStep.value === 2 && parsedSolution.value) {
    ElMessageBox.confirm('您已解析出解决方案但未导入，确认关闭吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        dialogVisible.value = false;
      })
      .catch(() => {});
  } else {
    dialogVisible.value = false;
  }
};
</script>

<style scoped lang="scss">
.workflow-content {
  min-height: 400px;
  padding: 20px 0;
}

.step-content {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.material-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
    }
  }

  .prompt-textarea {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    
    :deep(.el-textarea__inner) {
      line-height: 1.6;
    }
  }
}

.instruction-list {
  margin: 12px 0;
  padding-left: 24px;
  line-height: 1.8;

  li {
    margin-bottom: 8px;
    color: var(--el-text-color-regular);

    strong {
      color: var(--el-color-warning);
    }
  }
}

.ai-platforms-card {
  margin-top: 20px;

  .platforms-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .platform-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: 4px;
    background: var(--el-fill-color-light);

    .el-tag {
      flex-shrink: 0;
    }

    span {
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
  }
}

.parse-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 4px;

  &.success {
    background: #f0f9ff;
    color: #67c23a;
  }

  &.error {
    background: #fef0f0;
    color: #f56c6c;
  }
}

.solution-preview {
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
  }

  .preview-content {
    background: var(--el-fill-color-light);
    padding: 12px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
  }

  p {
    margin: 0;
    line-height: 1.6;
    color: var(--el-text-color-regular);
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;

  .footer-right {
    display: flex;
    gap: 8px;
  }
}
</style>
