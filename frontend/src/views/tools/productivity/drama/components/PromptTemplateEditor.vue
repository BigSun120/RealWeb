<template>
  <div class="prompt-template-editor">
    <!-- 旧模板警告 -->
    <el-alert
      v-if="hasLegacyTemplate"
      title="检测到旧版本模板"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        <p style="margin: 0 0 10px 0;">
          您当前使用的自定义模板可能包含旧版本的语法格式，可能导致生成的提示词包含未处理的模板标记。
        </p>
        <p style="margin: 0;">
          <strong>建议操作：</strong>
          点击下方的「<el-button type="warning" size="small" @click="handleUpdateTemplate" style="margin: 0 5px;">更新为最新模板</el-button>」按钮，将您的模板更新为最新的标准格式。
        </p>
      </template>
    </el-alert>
    
    <el-alert
      title="提示词模板配置"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      此模板将用于生成所有剧集的提示词。支持使用变量动态替换内容，让AI更好地理解你的创作需求。
    </el-alert>

    <div class="editor-container">
      <div class="editor-main">
        <div class="editor-header">
          <h4>模板编辑器</h4>
          <el-switch
            v-model="localTemplate.useCustom"
            active-text="使用自定义模板"
            inactive-text="使用默认模板"
            @change="handleUseCustomChange"
          />
        </div>

        <el-input
          v-model="displayTemplate"
          type="textarea"
          :rows="20"
          :placeholder="localTemplate.useCustom ? '请输入自定义提示词模板...' : '当前使用默认模板，开启“使用自定义模板”后可编辑'"
          :disabled="!localTemplate.useCustom"
          class="template-textarea"
        />

        <div class="editor-actions">
          <el-button
            type="primary"
            :icon="Check"
            @click="handleSave"
            :disabled="!hasChanges"
          >
            保存模板
          </el-button>
          <el-button
            :icon="Refresh"
            @click="handleRestore"
          >
            恢复默认模板
          </el-button>
          <el-button
            v-if="localTemplate.useCustom"
            :icon="Refresh"
            @click="handleUpdateTemplate"
            type="warning"
          >
            更新为最新模板
          </el-button>
          <el-button
            :icon="View"
            @click="handlePreview"
          >
            预览效果
          </el-button>
        </div>
      </div>

      <div class="variables-panel">
        <h4>📝 可用变量</h4>
        <el-scrollbar height="600px">
          <div class="variable-section">
            <h5>基本变量</h5>
            <div
              v-for="variable in basicVariables"
              :key="variable.name"
              class="variable-item"
              @click="insertVariable(variable.name)"
            >
              <code v-text="formatVariableName(variable.name)"></code>
              <span class="variable-desc">{{ variable.desc }}</span>
            </div>
          </div>

          <div class="variable-section">
            <h5>项目变量</h5>
            <div
              v-for="variable in projectVariables"
              :key="variable.name"
              class="variable-item"
              @click="insertVariable(variable.name)"
            >
              <code v-text="formatVariableName(variable.name)"></code>
              <span class="variable-desc">{{ variable.desc }}</span>
            </div>
          </div>

          <div class="variable-section">
            <h5>世界观变量</h5>
            <div
              v-for="variable in worldviewVariables"
              :key="variable.name"
              class="variable-item"
              @click="insertVariable(variable.name)"
            >
              <code v-text="formatVariableName(variable.name)"></code>
              <span class="variable-desc">{{ variable.desc }}</span>
            </div>
          </div>

          <div class="variable-section">
            <h5>条件语法</h5>
            <div class="syntax-example">
              <code v-text="'{{#if variableName}}'"></code>
              <div class="syntax-desc">...内容...</div>
              <code v-text="'{{/if}}'"></code>
              <p class="syntax-note">当变量有值时显示内容</p>
            </div>
          </div>

          <div class="variable-section">
            <h5>对象属性访问</h5>
            <div class="syntax-example">
              <code v-text="'{{previousEpisode.number}}'"></code>
              <p class="syntax-note">访问对象的属性</p>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="showPreview"
      title="提示词预览"
      width="70%"
      :close-on-click-modal="false"
    >
      <el-alert
        title="预览说明"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      >
        以下是使用示例数据（第1集）生成的提示词预览
      </el-alert>
      
      <div class="preview-content">
        <pre>{{ previewContent }}</pre>
      </div>
      
      <template #footer>
        <el-button @click="showPreview = false">关闭</el-button>
        <el-button type="primary" @click="copyPreview">复制预览内容</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Refresh, View } from '@element-plus/icons-vue';
import { DEFAULT_PROMPT_TEMPLATE, replaceTemplateVariables } from '../utils/promptTemplates';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      useCustom: false,
      customTemplate: null, // null 表示未初始化，空字符串表示用户清空了模板
      lastModified: null
    })
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  },
  worldview: {
    type: Object,
    default: () => ({})
  },
  characters: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

// 本地模板数据
const localTemplate = ref({
  useCustom: props.modelValue?.useCustom ?? false,
  // 保存用户的自定义模板，null 表示未设置
  customTemplate: props.modelValue?.customTemplate ?? null,
  lastModified: props.modelValue?.lastModified ?? null
});

// 原始数据用于检测变化
const originalTemplate = ref(JSON.parse(JSON.stringify(localTemplate.value)));

// 预览相关
const showPreview = ref(false);
const previewContent = ref('');

// 旧模板检测
const hasLegacyTemplate = ref(false);

// 检测是否为旧版本模板（包含嵌套的条件块问题）
const checkLegacyTemplate = (template) => {
  if (!template) return false;
  
  // 检测旧版本的问题模式：
  // 1. 包含 {{#if previousEpisode.title}} 而不是嵌套在 {{#if previousEpisode}} 中
  // 2. 或者有多个独立的嵌套条件块
  
  const legacyPattern1 = /{{#if previousEpisode}}[\s\S]*?{{#if previousEpisode\.title}}[\s\S]*?{{#if previousEpisode\.summary}}/;
  const legacyPattern2 = /{{#if previousEpisode\.title}}[\s\S]*?{{\/#if}}[\s\S]*?{{#if previousEpisode\.summary}}/;
  
  return legacyPattern1.test(template) || legacyPattern2.test(template);
};

// 组件挂载时检测
onMounted(() => {
  if (localTemplate.value.useCustom && localTemplate.value.customTemplate) {
    hasLegacyTemplate.value = checkLegacyTemplate(localTemplate.value.customTemplate);
  }
});

// 显示的模板内容（计算属性）
const displayTemplate = computed({
  get: () => {
    if (!localTemplate.value.useCustom) {
      // 使用默认模板时，显示默认模板内容（只读）
      return DEFAULT_PROMPT_TEMPLATE;
    }
    // 使用自定义模板时，显示自定义内容，如果为空则显示默认模板
    return localTemplate.value.customTemplate || DEFAULT_PROMPT_TEMPLATE;
  },
  set: (value) => {
    // 只有开启自定义模板时才能编辑
    if (localTemplate.value.useCustom) {
      localTemplate.value.customTemplate = value;
    }
  }
});

// 是否有变化
const hasChanges = computed(() => {
  return JSON.stringify(localTemplate.value) !== JSON.stringify(originalTemplate.value);
});

// 基本变量
const basicVariables = [
  { name: 'episodeNumber', desc: '当前集数' },
  { name: 'episodeTitle', desc: '当前标题' },
  { name: 'episodeSummary', desc: '当前简介' }
];

// 项目变量
const projectVariables = [
  { name: 'projectName', desc: '项目名称' },
  { name: 'projectType', desc: '项目类型' },
  { name: 'totalEpisodes', desc: '总集数' }
];

// 世界观变量
const worldviewVariables = [
  { name: 'worldviewTheme', desc: '核心主题' },
  { name: 'worldviewTone', desc: '情感基调' },
  { name: 'worldviewBackground', desc: '故事背景' },
  { name: 'worldviewSetting', desc: '世界设定' },
  { name: 'worldviewConflict', desc: '主要冲突' },
  { name: 'charactersList', desc: '角色列表' },
  { name: 'completedCount', desc: '已完成集数' }
];

// 格式化变量名
 const formatVariableName = (name) => {
  return `{{${name}}}`;
};

// 插入变量
const insertVariable = (varName) => {
  if (!localTemplate.value.useCustom) {
    ElMessage.warning('请先启用自定义模板');
    return;
  }
  
  const textarea = document.querySelector('.template-textarea textarea');
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = localTemplate.value.customTemplate;
    const before = text.substring(0, start);
    const after = text.substring(end);
    localTemplate.value.customTemplate = before + `{{${varName}}}` + after;
    
    // 设置新的光标位置
    setTimeout(() => {
      textarea.focus();
      const newPos = start + varName.length + 4; // {{}}的长度
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  }
};

// 切换使用自定义模板
const handleUseCustomChange = (value) => {
  if (value) {
    // 开启自定义模板：如果没有自定义内容，从默认模板复制
    if (!localTemplate.value.customTemplate) {
      localTemplate.value.customTemplate = DEFAULT_PROMPT_TEMPLATE;
    }
    // 检测是否为旧模板
    hasLegacyTemplate.value = checkLegacyTemplate(localTemplate.value.customTemplate);
  } else {
    hasLegacyTemplate.value = false;
  }
  // 关闭自定义模板时不做任何操作，保留自定义内容
};

// 保存
const handleSave = () => {
  localTemplate.value.lastModified = new Date().toISOString();
  originalTemplate.value = JSON.parse(JSON.stringify(localTemplate.value));
  emit('update:modelValue', localTemplate.value);
  emit('save', localTemplate.value);
  ElMessage.success('提示词模板已保存');
};

// 恢复默认
const handleRestore = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复默认模板吗？当前的自定义模板将被覆盖。',
      '确认恢复',
      {
        type: 'warning',
        confirmButtonText: '确认恢复',
        cancelButtonText: '取消'
      }
    );
    
    // 修复：恢复时使用最新的默认模板，并关闭自定义模式
    localTemplate.value.useCustom = false;
    localTemplate.value.customTemplate = null;  // 设为 null，表示使用默认模板
    localTemplate.value.lastModified = null;
    
    ElMessage.success('已恢复默认模板');
  } catch {
    // 用户取消
  }
};

// 更新为最新模板
const handleUpdateTemplate = async () => {
  try {
    await ElMessageBox.confirm(
      '将当前自定义模板更新为最新的默认模板？当前的修改将被覆盖。',
      '确认更新',
      {
        type: 'warning',
        confirmButtonText: '确认更新',
        cancelButtonText: '取消'
      }
    );
    
    // 更新为最新的默认模板，但保持自定义模式开启
    localTemplate.value.customTemplate = DEFAULT_PROMPT_TEMPLATE;
    localTemplate.value.lastModified = new Date().toISOString();
    
    // 清除旧模板警告
    hasLegacyTemplate.value = false;
    
    ElMessage.success('已更新为最新模板');
  } catch {
    // 用户取消
  }
};

// 预览
const handlePreview = () => {
  // 准备示例数据
  const sampleData = {
    episodeNumber: 1,
    episodeTitle: '初次相遇',
    episodeSummary: '男女主角在公司电梯里意外相遇，因为误会产生冲突',
    projectName: props.projectInfo.name || '示例剧本',
    projectType: props.projectInfo.type || '霸道总裁',
    totalEpisodes: props.projectInfo.totalEpisodes || 60,
    worldviewTheme: props.worldview.theme || '现代都市爱情',
    worldviewTone: props.worldview.tone || '甜宠、轻松',
    worldviewBackground: props.worldview.background || '繁华都市的顶级商业集团',
    worldviewSetting: props.worldview.setting || '现代都市',
    worldviewConflict: props.worldview.conflict || '身份差距与情感抉择',
    charactersList: props.characters.length > 0 
      ? props.characters.map(c => `- ${c.name}（${c.role || '角色'}）`).join('\n')
      : '- 张晨阳（男主角）\n- 林诗雨（女主角）',
    completedCount: 0,
    previousEpisode: null
  };
  
  // 使用当前显示的模板进行预览
  const templateToPreview = localTemplate.value.useCustom 
    ? (localTemplate.value.customTemplate || DEFAULT_PROMPT_TEMPLATE)
    : DEFAULT_PROMPT_TEMPLATE;
  
  previewContent.value = replaceTemplateVariables(
    templateToPreview,
    sampleData
  );
  
  showPreview.value = true;
};

// 复制预览内容
const copyPreview = async () => {
  try {
    await navigator.clipboard.writeText(previewContent.value);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    ElMessage.error('复制失败，请手动复制');
  }
};

// 监听prop变化
watch(() => props.modelValue, (newVal) => {
  if (newVal && JSON.stringify(newVal) !== JSON.stringify(localTemplate.value)) {
    // 修复：使用 ?? 运算符，避免覆盖已保存的自定义模板
    localTemplate.value = {
      useCustom: newVal.useCustom ?? false,
      customTemplate: newVal.customTemplate ?? DEFAULT_PROMPT_TEMPLATE,
      lastModified: newVal.lastModified ?? null
    };
    originalTemplate.value = JSON.parse(JSON.stringify(localTemplate.value));
  }
}, { deep: true });
</script>

<style scoped>
.prompt-template-editor {
  padding: 20px;
}

.editor-container {
  display: flex;
  gap: 20px;
}

.editor-main {
  flex: 1;
  min-width: 0;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.editor-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.template-textarea {
  margin-bottom: 16px;
}

.template-textarea :deep(textarea) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.editor-actions {
  display: flex;
  gap: 12px;
}

.variables-panel {
  width: 300px;
  flex-shrink: 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e4e7ed;
}

.variables-panel h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.variable-section {
  margin-bottom: 20px;
}

.variable-section h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.variable-item {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  margin-bottom: 4px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e4e7ed;
}

.variable-item:hover {
  background: #ecf5ff;
  border-color: #409EFF;
}

.variable-item code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #E6A23C;
  background: transparent;
  padding: 0;
}

.variable-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.syntax-example {
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  margin-bottom: 8px;
}

.syntax-example code {
  display: block;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #67C23A;
  margin-bottom: 4px;
}

.syntax-desc {
  font-size: 12px;
  color: #909399;
  margin: 4px 0;
  padding-left: 12px;
}

.syntax-note {
  font-size: 11px;
  color: #909399;
  margin: 4px 0 0 0;
}

.preview-content {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.preview-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
