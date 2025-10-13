<template>
  <div class="worldview-editor">
    <div class="editor-header">
      <h3 class="section-title">
        <el-icon><Document /></el-icon>
        世界观设定
      </h3>
      <div class="header-actions">
        <el-button 
          type="primary" 
          :icon="MagicStick"
          @click="handleGeneratePrompt"
        >
          生成提示词
        </el-button>
        <el-button 
          type="warning" 
          :icon="Upload"
          @click="handlePasteAI"
        >
          粘贴AI回答
        </el-button>
        <el-button 
          type="success"
          :icon="Check"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </el-button>
      </div>
    </div>

    <div class="editor-content">
      <el-form
        ref="formRef"
        :model="formData"
        label-position="top"
        class="worldview-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="📜 故事背景">
              <el-input
                v-model="formData.background"
                type="textarea"
                :rows="4"
                placeholder="描述故事发生的时代背景、社会环境等...
例如：现代都市，某顶级跨国集团总部大楼"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.background.length > 500 }">
                💡 提示：包括时代、地点、社会结构等基本信息 
                <span v-if="formData.background.length > 0">
                  (当前 {{ formData.background.length }} 字<span v-if="formData.background.length > 500" class="warning-text">，建议不超过500字</span>)
                </span>
              </div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="🌍 世界设定">
              <el-input
                v-model="formData.setting"
                type="textarea"
                :rows="4"
                placeholder="描述这个世界的特殊规则、独特设定等...
例如：豪门世家的等级制度、契约婚姻的社会背景"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.setting.length > 500 }">
                💡 提示：世界的独特规则、价值观、特殊设定
                <span v-if="formData.setting.length > 0">
                  (当前 {{ formData.setting.length }} 字<span v-if="formData.setting.length > 500" class="warning-text">，建议不超过500字</span>)
                </span>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item label="🎯 核心主题">
              <el-input
                v-model="formData.theme"
                type="textarea"
                :rows="3"
                placeholder="故事想表达的核心主题...
例如：爱情与自我救赎、从契约到真爱"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.theme.length > 200 }">
                💡 提示：故事的核心理念和价值观
                <span v-if="formData.theme.length > 0">
                  (当前 {{ formData.theme.length }} 字<span v-if="formData.theme.length > 200" class="warning-text">，建议不超过200字</span>)
                </span>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item label="⚔️ 主要冲突">
              <el-input
                v-model="formData.conflict"
                type="textarea"
                :rows="3"
                placeholder="故事的主要矛盾和冲突点...
例如：男女主的身份差距、家族恩怨、契约限制"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.conflict.length > 200 }">
                💡 提示：推动剧情发展的核心矛盾
                <span v-if="formData.conflict.length > 0">
                  (当前 {{ formData.conflict.length }} 字<span v-if="formData.conflict.length > 200" class="warning-text">，建议不超过200字</span>)
                </span>
              </div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="🎨 情感基调">
              <el-radio-group v-model="formData.tone" size="large">
                <el-radio-button label="轻松幽默">😄 轻松幽默</el-radio-button>
                <el-radio-button label="紧张悬疑">🔥 紧张悬疑</el-radio-button>
                <el-radio-button label="浪漫甜蜜">💕 浪漫甜蜜</el-radio-button>
                <el-radio-button label="热血励志">💪 热血励志</el-radio-button>
                <el-radio-button label="虐心催泪">😢 虐心催泪</el-radio-button>
                <el-radio-button label="爽快打脸">😎 爽快打脸</el-radio-button>
                <el-radio-button value="custom">✏️ 自定义</el-radio-button>
              </el-radio-group>
              
              <!-- 自定义输入框 -->
              <el-input
                v-if="showCustomTone"
                v-model="customTone"
                placeholder="请输入自定义的情感基调..."
                maxlength="20"
                show-word-limit
                style="margin-top: 12px;"
                @blur="handleCustomToneBlur"
              />
              
              <div class="field-tip">
                💡 提示：选择剧本的整体情感氛围，或自定义输入
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 预览卡片 -->
      <div v-if="hasContent" class="preview-card">
        <div class="preview-header">
          <el-icon><View /></el-icon>
          <span>世界观概览</span>
        </div>
        <div class="preview-content">
          <div v-if="formData.background" class="preview-item">
            <strong>背景：</strong>{{ formData.background }}
          </div>
          <div v-if="formData.setting" class="preview-item">
            <strong>设定：</strong>{{ formData.setting }}
          </div>
          <div v-if="formData.theme" class="preview-item">
            <strong>主题：</strong>{{ formData.theme }}
          </div>
          <div v-if="formData.conflict" class="preview-item">
            <strong>冲突：</strong>{{ formData.conflict }}
          </div>
          <div v-if="formData.tone" class="preview-item">
            <strong>基调：</strong>{{ formData.tone }}
          </div>
        </div>
      </div>
    </div>

    <!-- 提示词对话框 -->
    <PromptDialog
      v-model="showPromptDialog"
      :prompt="generatedPrompt"
      title="世界观设定提示词"
    />

    <!-- AI回答解析器 -->
    <AIResponseParser
      v-model="showAIParser"
      mode="worldview"
      @confirm="handleAIParseConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  Document, 
  MagicStick, 
  Check, 
  View,
  Upload
} from '@element-plus/icons-vue';
import PromptDialog from './PromptDialog.vue';
import AIResponseParser from './AIResponseParser.vue';
import { generateWorldviewPrompt } from '../utils/promptTemplates';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      background: '',
      setting: '',
      theme: '',
      conflict: '',
      tone: ''
    })
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

const formRef = ref(null);
const saving = ref(false);
const showPromptDialog = ref(false);
const generatedPrompt = ref('');
const showAIParser = ref(false);
const customTone = ref('');

// 是否显示自定义输入框
const showCustomTone = computed(() => {
  return formData.value.tone === 'custom';
});

// 表单数据
const formData = ref({
  background: props.modelValue?.background || '',
  setting: props.modelValue?.setting || '',
  theme: props.modelValue?.theme || '',
  conflict: props.modelValue?.conflict || '',
  tone: props.modelValue?.tone || ''
});

// 是否有内容
const hasContent = computed(() => {
  return formData.value.background || 
         formData.value.setting || 
         formData.value.theme || 
         formData.value.conflict || 
         formData.value.tone;
});

// 监听数据变化
watch(formData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });

// 监听props变化（只在初始化时或外部数据真正变化时更新）
watch(() => props.modelValue, (newVal, oldVal) => {
  // 避免循环更新：只在外部数据真正改变时更新
  if (newVal && JSON.stringify(newVal) !== JSON.stringify(formData.value)) {
    formData.value = {
      background: newVal.background || '',
      setting: newVal.setting || '',
      theme: newVal.theme || '',
      conflict: newVal.conflict || '',
      tone: newVal.tone || ''
    };
  }
}, { deep: true });

// 保存
const handleSave = async () => {
  if (!hasContent.value) {
    ElMessage.warning('请至少填写一项世界观设定');
    return;
  }

  saving.value = true;
  try {
    emit('save', formData.value);
  } finally {
    saving.value = false;
  }
};

// 处理自定义基调失焦
const handleCustomToneBlur = () => {
  if (customTone.value.trim()) {
    formData.value.tone = customTone.value.trim();
  } else {
    // 如果没有输入，恢复到默认选项
    formData.value.tone = '';
  }
};

// 生成提示词
const handleGeneratePrompt = () => {
  if (!hasContent.value) {
    ElMessage.warning('请先填写世界观设定内容');
    return;
  }

  try {
    generatedPrompt.value = generateWorldviewPrompt({
      ...formData.value,
      projectType: props.projectInfo.type,
      projectName: props.projectInfo.name
    });
    showPromptDialog.value = true;
  } catch (error) {
    console.error('生成提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 打开AI回答解析器
const handlePasteAI = () => {
  showAIParser.value = true;
};

// 处理AI解析结果
const handleAIParseConfirm = (parsedData) => {
  // 填充表单数据
  if (parsedData.background) formData.value.background = parsedData.background;
  if (parsedData.setting) formData.value.setting = parsedData.setting;
  if (parsedData.theme) formData.value.theme = parsedData.theme;
  if (parsedData.conflict) formData.value.conflict = parsedData.conflict;
  if (parsedData.tone) {
    // 检查是否是预设基调
    const presetTones = ['轻松幽默', '紧张悬疑', '浪漫甜蜜', '热血励志', '虐心催泪', '爽快打脸'];
    if (presetTones.includes(parsedData.tone)) {
      formData.value.tone = parsedData.tone;
    } else {
      // 自定义基调
      customTone.value = parsedData.tone;
      formData.value.tone = 'custom';
    }
  }
  
  ElMessage.success('已从AI回答中提取并填充内容');
};
</script>

<style scoped>
.worldview-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #EBEEF5;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
}

.worldview-form {
  margin-bottom: 24px;
}

.field-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.field-tip.field-warning {
  color: #E6A23C;
}

.warning-text {
  color: #F56C6C;
  font-weight: 600;
}

.preview-card {
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF0F6 100%);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #FFE0E6;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #FF6B6B;
  margin-bottom: 16px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

.preview-item strong {
  color: #FF6B6B;
  margin-right: 8px;
}

/* 响应式 */
@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-button {
    flex: 1;
  }
}
</style>
