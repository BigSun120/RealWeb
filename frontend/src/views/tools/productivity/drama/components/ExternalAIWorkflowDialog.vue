<template>
  <el-dialog
    v-model="dialogVisible"
    title="外部AI诊断工作流"
    width="900px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <!-- 步骤指示器 -->
    <el-steps :active="currentStep" align-center finish-status="success" class="mb-4">
      <el-step title="复制提示词" description="准备诊断材料" />
      <el-step title="外部AI诊断" description="使用Claude/GPT等AI" />
      <el-step title="导入结果" description="解析并保存问题" />
    </el-steps>

    <!-- 步骤内容 -->
    <div class="workflow-content">
      <!-- Step 1: 复制提示词和下载完整包 -->
      <div v-if="currentStep === 0" class="step-content">
        <el-alert
          title="第一步：准备诊断材料"
          type="info"
          :closable="false"
          class="mb-4"
        >
          <template #default>
            <p>请复制下方的诊断提示词，并下载完整创作包（可选），然后前往外部AI（如Claude、ChatGPT）进行诊断。</p>
          </template>
        </el-alert>

        <div class="material-section">
          <div class="section-header">
            <h4>📋 诊断提示词</h4>
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
            :rows="12"
            readonly
            class="prompt-textarea"
          />
        </div>

        <div class="material-section mt-4">
          <div class="section-header">
            <h4>📦 完整创作包（可选）</h4>
            <el-button
              type="success"
              size="small"
              :icon="Download"
              @click="downloadCreationPackage"
            >
              下载完整包
            </el-button>
          </div>
          
          <el-alert type="warning" :closable="false">
            <template #default>
              <p><strong>建议</strong>：如果AI token预算充足，可下载完整包作为附件上传，以提供更完整的上下文。</p>
              <p class="mt-1"><strong>注意</strong>：完整包可能包含大量文本（10-50KB），请根据AI平台的token限制决定是否使用。</p>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 2: 提示用户到外部AI执行 -->
      <div v-if="currentStep === 1" class="step-content">
        <el-alert
          title="第二步：在外部AI平台执行诊断"
          type="warning"
          :closable="false"
          class="mb-4"
        >
          <template #default>
            <p>请按照以下步骤操作：</p>
            <ol class="instruction-list">
              <li>打开外部AI平台（推荐：Claude 3.5 Sonnet、GPT-4、DeepSeek等）</li>
              <li>粘贴刚才复制的诊断提示词</li>
              <li>（可选）如果下载了完整包，可以作为附件上传</li>
              <li>发送消息，等待AI返回诊断结果</li>
              <li>复制AI返回的<strong>完整JSON数组</strong></li>
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
              <span>最佳选择，支持大上下文，结构化输出优秀</span>
            </div>
            <div class="platform-item">
              <el-tag type="success">GPT-4o</el-tag>
              <span>次佳选择，需注意token限制</span>
            </div>
            <div class="platform-item">
              <el-tag type="info">DeepSeek V3</el-tag>
              <span>国产选择，性价比高</span>
            </div>
          </div>
        </el-card>

        <el-alert type="info" :closable="false" class="mt-4">
          <template #default>
            <p><strong>提示</strong>：如果AI返回的不是纯JSON数组，而是包含在markdown代码块中（如```json...```），请只复制JSON部分。</p>
          </template>
        </el-alert>
      </div>

      <!-- Step 3: 导入AI回答并解析 -->
      <div v-if="currentStep === 2" class="step-content">
        <el-alert
          title="第三步：导入AI诊断结果"
          type="success"
          :closable="false"
          class="mb-4"
        >
          <template #default>
            <p>请将AI返回的JSON格式问题列表粘贴到下方文本框中，系统会自动解析并验证。</p>
          </template>
        </el-alert>

        <el-form :model="importForm" label-width="100px">
          <el-form-item label="AI回答">
            <el-input
              v-model="importForm.aiResponse"
              type="textarea"
              :rows="12"
              placeholder="粘贴AI返回的JSON数组，例如：[{&quot;severity&quot;:&quot;critical&quot;,...}]"
              @input="validateJSON"
            />
          </el-form-item>

          <!-- 实时验证提示 -->
          <el-form-item v-if="importForm.aiResponse">
            <div v-if="parseError" class="parse-status error">
              <el-icon><WarningFilled /></el-icon>
              <span>{{ parseError }}</span>
            </div>
            <div v-else-if="parsedIssues.length > 0" class="parse-status success">
              <el-icon><SuccessFilled /></el-icon>
              <span>成功解析 {{ parsedIssues.length }} 个问题</span>
            </div>
          </el-form-item>

          <!-- 预览解析结果 -->
          <el-form-item v-if="parsedIssues.length > 0" label="预览">
            <el-scrollbar max-height="300px">
              <div class="issues-preview">
                <div
                  v-for="(issue, index) in parsedIssues"
                  :key="index"
                  class="issue-preview-item"
                >
                  <el-tag
                    :type="issue.severity === 'critical' ? 'danger' : issue.severity === 'medium' ? 'warning' : 'info'"
                    size="small"
                  >
                    {{ issue.severity }}
                  </el-tag>
                  <span class="issue-title">{{ issue.title }}</span>
                  <span class="issue-location">{{ issue.location?.field || '未知位置' }}</span>
                </div>
              </div>
            </el-scrollbar>
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
            :disabled="parsedIssues.length === 0"
            :loading="importing"
            @click="handleImport"
          >
            导入问题（{{ parsedIssues.length }}）
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
  Download,
  WarningFilled,
  SuccessFilled
} from '@element-plus/icons-vue';
import { generateEpisodeCheckPrompt, downloadTextFile } from '../utils/episodeCheckPrompts';
import { generateCompleteCreationPackage } from '../utils/scriptExporter';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    required: true
  },
  episodeNumber: {
    type: Number,
    required: true
  }
});

// Emits
const emit = defineEmits(['update:visible', 'issues-imported']);

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
const parsedIssues = ref([]);
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
    prompt.value = generateEpisodeCheckPrompt(props.project, props.episodeNumber);
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

// 下载完整创作包
const downloadCreationPackage = () => {
  try {
    const episode = props.project.episodes.find(ep => ep.number === props.episodeNumber);
    
    if (!episode) {
      ElMessage.error(`未找到第${props.episodeNumber}集`);
      return;
    }

    const content = generateCompleteCreationPackage({
      episode,
      projectInfo: props.project,
      worldview: props.project.worldview,
      characters: props.project.characters,
      outline: props.project.outline,
      allEpisodes: props.project.episodes,
      prompt: prompt.value,
      relationshipGraph: props.project.relationshipGraph
    });

    const filename = `${props.project.name}_第${props.episodeNumber}集_完整包.md`;
    downloadTextFile(content, filename);
    
    ElMessage.success('完整包下载成功');
  } catch (error) {
    console.error('下载完整包失败:', error);
    ElMessage.error('下载失败：' + error.message);
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
  parsedIssues.value = [];
  parseError.value = '';
};

// 验证并解析JSON
const validateJSON = () => {
  const input = importForm.value.aiResponse.trim();
  
  if (!input) {
    parsedIssues.value = [];
    parseError.value = '';
    return;
  }

  try {
    // 尝试三种解析方法 + 智能清理未转义引号
    
    // 预处理：智能清理JSON字符串中的未转义引号
    const cleanJSON = (jsonStr) => {
      // 方法1：尝试直接解析
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log('🔧 JSON解析失败，尝试自动修复...');
        
        // 方法2：逐字段智能转义
        // 匹配模式："fieldName": "content"
        const cleaned = jsonStr.replace(
          /"(description|title|explanation|suggestedContent)"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g,
          (match, fieldName, content) => {
            // 手动转义：将所有"替换为\"，但排除已经是\"的
            let escaped = content;
            // 先标记已转义的引号
            escaped = escaped.replace(/\\"/g, '___ESCAPED_QUOTE___');
            // 转义所有未转义的引号
            escaped = escaped.replace(/"/g, '\\"');
            // 恢复已转义的引号
            escaped = escaped.replace(/___ESCAPED_QUOTE___/g, '\\"');
            
            return `"${fieldName}": "${escaped}"`;
          }
        );
        
        console.log('✅ 修复后的JSON:', cleaned.substring(0, 200) + '...');
        
        // 再次尝试解析
        return JSON.parse(cleaned);
      }
    };
    
    // 方法1：直接解析
    let issues = null;
    try {
      issues = cleanJSON(input);
    } catch {
      // 方法2：从```json```代码块中提取
      const codeBlockMatch = input.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        issues = cleanJSON(codeBlockMatch[1].trim());
      } else {
        // 方法3：正则提取JSON数组
        const jsonMatch = input.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          issues = cleanJSON(jsonMatch[0]);
        } else {
          throw new Error('无法识别的JSON格式');
        }
      }
    }

    // 验证是否是数组
    if (!Array.isArray(issues)) {
      throw new Error('AI返回的结果不是数组格式');
    }

    // 验证每个问题的结构
    const validIssues = [];
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      
      // 验证必填字段
      if (!issue.severity || !issue.title || !issue.description) {
        console.warn(`问题${i + 1}缺少必填字段，已跳过`);
        continue;
      }

      // 验证location
      if (!issue.location || !issue.location.module || !issue.location.field) {
        console.warn(`问题${i + 1}的location字段不完整，已跳过`);
        continue;
      }

      // 验证module
      if (issue.location.module !== 'episodes') {
        console.warn(`问题${i + 1}的module不是episodes，已跳过`);
        continue;
      }

      // 验证field格式
      const fieldPattern = /^第\d+集$/;
      if (!fieldPattern.test(issue.location.field)) {
        console.warn(`问题${i + 1}的field格式错误（${issue.location.field}），已跳过`);
        continue;
      }

      // 提取集数并添加episodeNumber字段
      const episodeNum = parseInt(issue.location.field.match(/\d+/)[0]);
      
      validIssues.push({
        ...issue,
        location: {
          ...issue.location,
          episodeNumber: episodeNum
        },
        status: 'pending',
        generating: false
      });
    }

    if (validIssues.length === 0 && issues.length > 0) {
      throw new Error('所有问题都不符合格式要求，请检查AI返回的数据');
    }

    parsedIssues.value = validIssues;
    parseError.value = '';

    if (validIssues.length < issues.length) {
      ElMessage.warning(`已过滤 ${issues.length - validIssues.length} 个格式错误的问题`);
    }

  } catch (error) {
    parsedIssues.value = [];
    parseError.value = error.message || 'JSON解析失败';
  }
};

// 导入问题
const handleImport = async () => {
  if (parsedIssues.value.length === 0) {
    ElMessage.warning('没有可导入的问题');
    return;
  }

  importing.value = true;

  try {
    // 触发导入事件，由父组件处理保存逻辑
    emit('issues-imported', parsedIssues.value);
    
    ElMessage.success(`成功导入 ${parsedIssues.value.length} 个问题`);
    
    // 清空已导入的问题，防止关闭时触发确认弹窗
    parsedIssues.value = [];
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
  if (currentStep.value === 2 && parsedIssues.value.length > 0) {
    ElMessageBox.confirm('您已解析出问题但未导入，确认关闭吗？', '提示', {
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
  min-height: 450px;
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
  font-size: 14px;

  &.success {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
  }

  &.error {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
  }
}

.issues-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .issue-preview-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    border-left: 3px solid var(--el-color-primary);

    .el-tag {
      flex-shrink: 0;
    }

    .issue-title {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .issue-location {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .footer-right {
    display: flex;
    gap: 8px;
  }
}

.mt-1 {
  margin-top: 4px;
}

.mt-4 {
  margin-top: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
