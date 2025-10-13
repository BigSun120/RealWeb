<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="800px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <!-- AI回答快捷按钮 -->
    <div class="ai-paste-hint">
      <el-alert
        title="提示：您可以使用AI生成角色详细设定"
        type="info"
        :closable="false"
      >
        <template #default>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>将AI生成的角色描述粘贴至此，系统将自动提取并填充表单。</span>
            <el-button size="small" type="primary" :icon="Upload" @click="handlePasteAI">
              粘贴AI回答
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      label-position="left"
    >
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12">
          <el-form-item label="角色姓名" prop="name">
            <el-input
              v-model="formData.name"
              placeholder="例如：陆景琛"
              maxlength="20"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="12">
          <el-form-item label="角色定位" prop="role">
            <el-select
              v-model="formData.role"
              placeholder="选择角色定位"
              style="width: 100%"
            >
              <el-option label="男主角" value="男主角" />
              <el-option label="女主角" value="女主角" />
              <el-option label="男配角" value="男配角" />
              <el-option label="女配角" value="女配角" />
              <el-option label="反派" value="反派" />
              <el-option label="龙套" value="龙套" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="12">
          <el-form-item label="年龄">
            <el-input-number
              v-model="formData.age"
              :min="1"
              :max="100"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="12">
          <el-form-item label="性别">
            <el-radio-group v-model="formData.gender">
              <el-radio label="男">男</el-radio>
              <el-radio label="女">女</el-radio>
              <el-radio label="其他">其他</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="角色描述">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="2"
              placeholder="简短描述这个角色（一句话）"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="性格特点">
            <el-input
              v-model="formData.personality"
              type="textarea"
              :rows="3"
              placeholder="描述角色的性格特征，如：冷漠、高傲、温柔、腹黑..."
              maxlength="300"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="角色背景">
            <el-input
              v-model="formData.background"
              type="textarea"
              :rows="3"
              placeholder="角色的成长经历、家庭背景、教育经历等..."
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="行为动机">
            <el-input
              v-model="formData.motivation"
              type="textarea"
              :rows="2"
              placeholder="角色的目标、追求、内心渴望..."
              maxlength="300"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="人际关系">
            <el-input
              v-model="formData.relationships"
              type="textarea"
              :rows="2"
              placeholder="与其他角色的关系，如：男主的初恋、女主的闺蜜..."
              maxlength="300"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="标签">
            <el-tag
              v-for="tag in formData.tags"
              :key="tag"
              closable
              @close="handleRemoveTag(tag)"
              style="margin-right: 8px; margin-bottom: 8px;"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="tagInputVisible"
              ref="tagInputRef"
              v-model="tagInputValue"
              size="small"
              style="width: 100px;"
              @keyup.enter="handleAddTag"
              @blur="handleAddTag"
            />
            <el-button
              v-else
              size="small"
              @click="showTagInput"
            >
              + 添加标签
            </el-button>
            <div class="field-tip">
              常用标签：霸道、温柔、腹黑、单纯、高冷、热情等
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditMode ? '保存' : '添加' }}
        </el-button>
      </div>
    </template>

    <!-- AI回答解析器 -->
    <AIResponseParser
      v-model="showAIParser"
      mode="character"
      @confirm="handleAIParseConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';
import AIResponseParser from './AIResponseParser.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  character: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'submit']);

const formRef = ref(null);
const submitting = ref(false);
const tagInputVisible = ref(false);
const tagInputValue = ref('');
const tagInputRef = ref(null);
const showAIParser = ref(false);

// 表单数据
const formData = ref({
  name: '',
  role: '',
  age: null,
  gender: '男',
  description: '',
  personality: '',
  background: '',
  motivation: '',
  relationships: '',
  tags: []
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入角色姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色定位', trigger: 'change' }
  ]
};

// 是否编辑模式
const isEditMode = computed(() => !!props.character);

// 对话框标题
const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑角色' : '添加角色';
});

// 监听角色数据变化
watch(() => props.character, (newVal) => {
  if (newVal) {
    formData.value = {
      name: newVal.name || '',
      role: newVal.role || '',
      age: newVal.age || null,
      gender: newVal.gender || '男',
      description: newVal.description || '',
      personality: newVal.personality || '',
      background: newVal.background || '',
      motivation: newVal.motivation || '',
      relationships: newVal.relationships || '',
      tags: newVal.tags ? [...newVal.tags] : []
    };
  }
}, { immediate: true });

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    // 关闭时重置表单
    setTimeout(() => {
      resetForm();
    }, 300);
  } else if (!props.character) {
    // 新建时清空表单
    resetForm();
  }
});

// 关闭对话框
const handleClose = () => {
  emit('update:modelValue', false);
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  formData.value = {
    name: '',
    role: '',
    age: null,
    gender: '男',
    description: '',
    personality: '',
    background: '',
    motivation: '',
    relationships: '',
    tags: []
  };
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      const characterData = {
        ...formData.value,
        _id: props.character?._id,
        id: props.character?.id
      };
      
      emit('submit', characterData);
      handleClose();
    } catch (error) {
      console.error('提交失败:', error);
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

// 显示标签输入
const showTagInput = () => {
  tagInputVisible.value = true;
  nextTick(() => {
    tagInputRef.value?.focus();
  });
};

// 添加标签
const handleAddTag = () => {
  const tag = tagInputValue.value.trim();
  if (tag && !formData.value.tags.includes(tag)) {
    formData.value.tags.push(tag);
  }
  tagInputVisible.value = false;
  tagInputValue.value = '';
};

// 移除标签
const handleRemoveTag = (tag) => {
  const index = formData.value.tags.indexOf(tag);
  if (index > -1) {
    formData.value.tags.splice(index, 1);
  }
};

// 打开AI回答解析器
const handlePasteAI = () => {
  showAIParser.value = true;
};

// 处理AI解析结果
const handleAIParseConfirm = (parsedData) => {
  // 填充表单数据
  if (parsedData.name) formData.value.name = parsedData.name;
  if (parsedData.age) formData.value.age = parsedData.age;
  if (parsedData.gender) formData.value.gender = parsedData.gender;
  if (parsedData.description) formData.value.description = parsedData.description;
  if (parsedData.personality) formData.value.personality = parsedData.personality;
  if (parsedData.background) formData.value.background = parsedData.background;
  if (parsedData.motivation) formData.value.motivation = parsedData.motivation;
  if (parsedData.relationships) formData.value.relationships = parsedData.relationships;
  
  ElMessage.success('已从AI回答中提取并填充内容');
};
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.field-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.ai-paste-hint {
  margin-bottom: 20px;
}

/* 响应式 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
  }
}
</style>
