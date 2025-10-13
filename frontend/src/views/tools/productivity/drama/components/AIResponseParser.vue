<template>
  <el-dialog
    :model-value="modelValue"
    :title="title || '粘贴 AI 回答'"
    width="800px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <div class="parser-container">
      <!-- 使用提示 -->
      <el-alert
        v-if="!aiResponse && description"
        :title="description"
        type="info"
        :closable="false"
        class="usage-tip"
      />
      <el-alert
        v-else-if="!aiResponse"
        title="使用说明"
        type="info"
        :closable="false"
        class="usage-tip"
      >
        <template #default>
          <p>1. 将从 AI （ChatGPT / Claude 等）获得的回答完整粘贴到下方文本框</p>
          <p>2. 点击"智能解析"按钮，系统将自动提取结构化信息</p>
          <p>3. 检查解析结果，手动调整不准确的字段</p>
          <p>4. 点击"确认填充"将内容填入表单</p>
        </template>
      </el-alert>

      <!-- 粘贴区域 -->
      <div class="paste-section">
        <div class="section-header">
          <span class="section-title">AI回答内容</span>
          <el-tag v-if="aiResponse" size="small" type="info">
            {{ aiResponse.length }} 字符
          </el-tag>
        </div>
        <el-input
          v-model="aiResponse"
          type="textarea"
          :rows="12"
          placeholder="请粘贴 AI 的完整回答..."
          class="response-textarea"
        />
      </div>

      <!-- 操作按钮 -->
      <div v-if="aiResponse && !parsed" class="action-buttons">
        <el-button
          type="primary"
          :icon="MagicStick"
          :loading="parsing"
          @click="handleParse"
        >
          {{ parsing ? '解析中...' : '智能解析' }}
        </el-button>
        <el-button @click="handleClear">清空</el-button>
      </div>

      <!-- 批量角色解析结果预览 -->
      <div v-if="parsed && props.mode === 'batch-characters'" class="parse-result">
        <div class="result-header">
          <div class="header-left">
            <el-icon :size="20" color="#67C23A"><SuccessFilled /></el-icon>
            <span class="header-title">解析结果</span>
            <el-tag type="success" size="small">
              成功解析 {{ parsedData.characters?.length || 0 }} 个角色
            </el-tag>
          </div>
          <el-button size="small" text @click="handleReparse">
            <el-icon><RefreshRight /></el-icon>
            重新解析
          </el-button>
        </div>

        <div class="characters-preview">
          <div v-for="(char, index) in parsedData.characters" :key="index" class="character-preview-item">
            <div class="preview-header">
              <span class="preview-index">角色 {{ index + 1 }}</span>
              <el-tag v-if="char.role" size="small" type="primary">{{ char.role }}</el-tag>
            </div>
            <div class="preview-content">
              <p><strong>姓名：</strong>{{ char.name || '未识别' }}</p>
              <p v-if="char.age"><strong>年龄：</strong>{{ char.age }}</p>
              <p v-if="char.gender"><strong>性别：</strong>{{ char.gender }}</p>
              <p v-if="char.description"><strong>描述：</strong>{{ char.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 大纲解析结果预览 -->
      <div v-else-if="parsed && props.mode === 'outline'" class="parse-result">
        <div class="result-header">
          <div class="header-left">
            <el-icon :size="20" color="#67C23A"><SuccessFilled /></el-icon>
            <span class="header-title">解析结果</span>
            <el-tag type="success" size="small">
              共 {{ getTotalNodes() }} 个故事节点
            </el-tag>
          </div>
          <el-button size="small" text @click="handleReparse">
            <el-icon><RefreshRight /></el-icon>
            重新解析
          </el-button>
        </div>

        <div class="outline-preview">
          <div v-for="(act, actIndex) in parsedData.acts" :key="actIndex" class="act-preview">
            <h4 class="act-title">{{ act.title || `第${actIndex + 1}幕` }}</h4>
            <div v-for="(node, nodeIndex) in act.nodes" :key="nodeIndex" class="node-preview">
              <p class="node-title"><strong>节点 {{ nodeIndex + 1 }}：</strong>{{ node.title }}</p>
              <p v-if="node.content" class="node-content">{{ node.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 单个字段解析结果 -->
      <div v-else-if="parsed" class="parse-result">
        <div class="result-header">
          <div class="header-left">
            <el-icon :size="20" color="#67C23A"><SuccessFilled /></el-icon>
            <span class="header-title">解析结果</span>
            <el-tag :type="successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'danger'" size="small">
              成功率: {{ successRate }}%
            </el-tag>
          </div>
          <el-button size="small" text @click="handleReparse">
            <el-icon><RefreshRight /></el-icon>
            重新解析
          </el-button>
        </div>

        <!-- 字段列表 -->
        <div class="fields-list">
          <div
            v-for="field in displayFields"
            :key="field.key"
            class="field-item"
            :class="{ 'field-success': field.success, 'field-failed': !field.success }"
          >
            <div class="field-header">
              <span class="field-icon">{{ field.icon }}</span>
              <span class="field-label">{{ field.label }}</span>
              <el-tag :type="getConfidenceType(field.confidence)" size="small">
                {{ getConfidenceText(field.confidence) }}
              </el-tag>
            </div>
            
            <!-- 编辑模式 -->
            <div v-if="editingField === field.key" class="field-editor">
              <el-input
                v-if="field.key === 'age'"
                v-model.number="parsedData[field.key]"
                type="number"
                placeholder="请输入年龄"
              />
              <el-select
                v-else-if="field.key === 'gender'"
                v-model="parsedData[field.key]"
                placeholder="请选择性别"
              >
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
                <el-option label="其他" value="其他" />
              </el-select>
              <el-select
                v-else-if="field.key === 'tone'"
                v-model="parsedData[field.key]"
                placeholder="请选择情感基调"
              >
                <el-option label="轻松幽默" value="轻松幽默" />
                <el-option label="紧张悬疑" value="紧张悬疑" />
                <el-option label="浪漫甜蜜" value="浪漫甜蜜" />
                <el-option label="热血励志" value="热血励志" />
                <el-option label="虐心催泪" value="虐心催泪" />
                <el-option label="爽快打脸" value="爽快打脸" />
              </el-select>
              <el-input
                v-else
                v-model="parsedData[field.key]"
                type="textarea"
                :rows="3"
                placeholder="请输入内容"
              />
              <div class="editor-actions">
                <el-button size="small" type="primary" @click="saveFieldEdit(field.key)">保存</el-button>
                <el-button size="small" @click="cancelFieldEdit">取消</el-button>
              </div>
            </div>

            <!-- 显示模式 -->
            <div v-else class="field-content">
              <div v-if="field.value" class="field-value">{{ field.value }}</div>
              <div v-else class="field-empty">未识别</div>
              <el-button
                size="small"
                text
                type="primary"
                class="edit-btn"
                @click="startEditField(field.key)"
              >
                编辑
              </el-button>
            </div>
          </div>
        </div>

        <!-- 提示信息 -->
        <el-alert
          v-if="successRate < 50"
          title="解析成功率较低"
          type="warning"
          :closable="false"
          class="warning-tip"
        >
          系统未能识别部分字段，请手动编辑或重新粘贴更清晰的AI回答
        </el-alert>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="parsed" type="primary" :icon="Check" @click="handleConfirm">
          {{ props.mode === 'batch-characters' ? '确认导入' : props.mode === 'outline' ? '确认导入' : '确认填充' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Check,
  MagicStick,
  SuccessFilled,
  RefreshRight
} from '@element-plus/icons-vue';
import {
  parseWorldviewResponse,
  parseCharacterResponse,
  parseBatchCharactersResponse,
  parseOutlineResponse,
  evaluateParseResult,
  calculateSuccessRate,
  formatParseResultForDisplay
} from '../utils/aiResponseParser';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String, // 'worldview', 'character', 'batch-characters', 'outline'
    required: true,
    validator: (value) => ['worldview', 'character', 'batch-characters', 'outline'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'parsed']);

// 状态
const aiResponse = ref('');
const parsing = ref(false);
const parsed = ref(false);
const parsedData = ref({});
const evaluatedResult = ref({});
const editingField = ref(null);

// 字段标签映射
const fieldLabels = {
  worldview: {
    background: '故事背景',
    setting: '世界设定',
    theme: '核心主题',
    conflict: '主要冲突',
    tone: '情感基调'
  },
  character: {
    name: '角色姓名',
    age: '年龄',
    gender: '性别',
    description: '角色描述',
    personality: '性格特点',
    background: '角色背景',
    motivation: '行为动机',
    relationships: '人际关系'
  }
};

// 计算属性
const currentLabels = computed(() => {
  return fieldLabels[props.mode] || {};
});

const displayFields = computed(() => {
  if (!parsed.value) return [];
  return formatParseResultForDisplay(evaluatedResult.value, currentLabels.value);
});

const successRate = computed(() => {
  if (!parsed.value) return 0;
  return calculateSuccessRate(evaluatedResult.value);
});

// 方法
const handleParse = async () => {
  if (!aiResponse.value.trim()) {
    ElMessage.warning('请先粘贴 AI 回答内容');
    return;
  }

  parsing.value = true;
  
  try {
    // 模拟异步解析（给用户感觉正在处理）
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 根据模式解析
    if (props.mode === 'worldview') {
      parsedData.value = parseWorldviewResponse(aiResponse.value);
      // 评估结果
      evaluatedResult.value = evaluateParseResult(parsedData.value);
      parsed.value = true;
      
      const rate = calculateSuccessRate(evaluatedResult.value);
      if (rate >= 80) {
        ElMessage.success('解析成功！识别了大部分字段');
      } else if (rate >= 50) {
        ElMessage.warning('解析完成，但部分字段需要手动调整');
      } else {
        ElMessage.warning('解析成功率较低，建议检查所有字段');
      }
    } else if (props.mode === 'character') {
      parsedData.value = parseCharacterResponse(aiResponse.value);
      // 评估结果
      evaluatedResult.value = evaluateParseResult(parsedData.value);
      parsed.value = true;
      
      const rate = calculateSuccessRate(evaluatedResult.value);
      if (rate >= 80) {
        ElMessage.success('解析成功！识别了大部分字段');
      } else if (rate >= 50) {
        ElMessage.warning('解析完成，但部分字段需要手动调整');
      } else {
        ElMessage.warning('解析成功率较低，建议检查所有字段');
      }
    } else if (props.mode === 'batch-characters') {
      parsedData.value = parseBatchCharactersResponse(aiResponse.value);
      parsed.value = true;
      
      const count = parsedData.value.characters?.length || 0;
      if (count > 0) {
        ElMessage.success(`成功解析 ${count} 个角色`);
      } else {
        ElMessage.warning('未能解析到角色信息，请检查格式');
      }
    } else if (props.mode === 'outline') {
      parsedData.value = parseOutlineResponse(aiResponse.value);
      parsed.value = true;
      
      const totalNodes = getTotalNodes();
      if (totalNodes > 0) {
        ElMessage.success(`成功解析大纲，共 ${totalNodes} 个故事节点`);
      } else {
        ElMessage.warning('未能解析到大纲信息，请检查格式');
      }
    }
  } catch (error) {
    console.error('解析失败:', error);
    ElMessage.error('解析失败，请重试');
  } finally {
    parsing.value = false;
  }
};

const handleReparse = () => {
  parsed.value = false;
  parsedData.value = {};
  evaluatedResult.value = {};
  editingField.value = null;
};

const handleClear = () => {
  aiResponse.value = '';
  handleReparse();
};

const startEditField = (fieldKey) => {
  editingField.value = fieldKey;
};

const saveFieldEdit = (fieldKey) => {
  // 重新评估该字段
  evaluatedResult.value[fieldKey] = {
    value: parsedData.value[fieldKey],
    confidence: parsedData.value[fieldKey] ? 'high' : 'none'
  };
  editingField.value = null;
  ElMessage.success('字段已更新');
};

const cancelFieldEdit = () => {
  editingField.value = null;
};

const handleConfirm = () => {
  // 对于 batch-characters 和 outline 模式，使用 parsed 事件
  if (props.mode === 'batch-characters' || props.mode === 'outline') {
    emit('parsed', parsedData.value);
  } else {
    emit('confirm', parsedData.value);
  }
  handleClose();
  
  const message = props.mode === 'batch-characters' ? '角色已导入' : 
                  props.mode === 'outline' ? '大纲已导入' : 
                  '已填充到表单';
  ElMessage.success(message);
};

const handleClose = () => {
  emit('update:modelValue', false);
  // 延迟重置，避免关闭动画时看到内容变化
  setTimeout(() => {
    aiResponse.value = '';
    handleReparse();
  }, 300);
};

const getConfidenceType = (confidence) => {
  const types = {
    high: 'success',
    medium: 'warning',
    low: 'warning',
    none: 'danger'
  };
  return types[confidence] || 'info';
};

const getConfidenceText = (confidence) => {
  const texts = {
    high: '高',
    medium: '中',
    low: '低',
    none: '未识别'
  };
  return texts[confidence] || '未知';
};

// 计算大纲总节点数
const getTotalNodes = () => {
  if (!parsedData.value.acts || !Array.isArray(parsedData.value.acts)) {
    return 0;
  }
  return parsedData.value.acts.reduce((total, act) => {
    return total + (act.nodes?.length || 0);
  }, 0);
};

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    // 对话框关闭时清理
    editingField.value = null;
  }
});
</script>

<style scoped>
.parser-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.usage-tip {
  margin-bottom: 4px;
}

.usage-tip p {
  margin: 4px 0;
  font-size: 14px;
  line-height: 1.6;
}

.paste-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.response-textarea {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.parse-result {
  background: #F5F7FA;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #E4E7ED;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E4E7ED;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.fields-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  background: white;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #DCDFE6;
  transition: all 0.3s;
}

.field-item:hover {
  border-color: #C0C4CC;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.field-success {
  border-left: 3px solid #67C23A;
}

.field-failed {
  border-left: 3px solid #F56C6C;
}

.field-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field-icon {
  font-size: 16px;
  font-weight: bold;
}

.field-label {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  flex: 1;
}

.field-content {
  position: relative;
  padding-right: 60px;
}

.field-value {
  font-size: 13px;
  color: #303133;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.field-empty {
  font-size: 13px;
  color: #909399;
  font-style: italic;
}

.edit-btn {
  position: absolute;
  top: 0;
  right: 0;
}

.field-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.warning-tip {
  margin-top: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 批量角色预览样式 */
.characters-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.character-preview-item {
  background: white;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #DCDFE6;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #F0F0F0;
}

.preview-index {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-content p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.preview-content strong {
  color: #303133;
  font-weight: 600;
}

/* 大纲预览样式 */
.outline-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.act-preview {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #DCDFE6;
}

.act-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #409EFF;
}

.node-preview {
  margin-left: 12px;
  padding: 8px;
  border-left: 3px solid #E4E7ED;
  margin-bottom: 8px;
}

.node-preview:last-child {
  margin-bottom: 0;
}

.node-title {
  font-size: 14px;
  color: #303133;
  margin: 0 0 4px 0;
  font-weight: 600;
}

.node-content {
  font-size: 13px;
  color: #606266;
  margin: 0;
  line-height: 1.6;
}

/* 响应式 */
@media (max-width: 768px) {
  .response-textarea {
    font-size: 12px;
  }

  .field-content {
    padding-right: 0;
  }

  .edit-btn {
    position: static;
    margin-top: 8px;
  }
}
</style>
