<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="800px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <!-- AI生成功能区 -->
    <div class="ai-generate-section">
      <el-alert
        title="AI智能生成"
        type="success"
        :closable="false"
      >
        <template #default>
          <div class="ai-actions">
            <div class="ai-desc">
              <span>💡 让AI帮你快速生成完整的角色设定，包括性格、背景、动机等详细信息</span>
            </div>
            <div class="ai-buttons">
              <el-button 
                size="small" 
                type="success" 
                :icon="MagicStick"
                :loading="generating"
                @click="handleAIGenerate"
              >
                {{ generating ? 'AI生成中...' : 'AI自动生成并填充' }}
              </el-button>
              <el-button 
                size="small" 
                type="primary" 
                :icon="Upload" 
                @click="handlePasteAI"
              >
                粘贴AI回答
              </el-button>
            </div>
          </div>
          
          <!-- 生成进度条 -->
          <el-progress
            v-if="generating"
            :percentage="generateProgress"
            :stroke-width="6"
            :text-inside="true"
            status="success"
            striped
            striped-flow
            style="margin-top: 12px;"
          />
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
            <div class="field-tip">
              💡 建议：用一句话概括角色的核心特征，例如：“高冷禁欲的集团总裁，外表冰冷内心热烈”
            </div>
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
            <div class="field-tip">
              💡 建议：列举3-5个核心性格特征，包括正面和负面，让角色更立体。例如：“表面高冷禁欲、实际内心细腻、对亲近人非常护短、偷偷关注女主的一举一动”
            </div>
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
            <div class="field-tip">
              💡 建议：包括家庭出身、成长环境、关键经历、形成性格的原因。例如：“盛家二少爷，从小被家族安排各种学习，被训练成完美继承人，但内心渴望自由和真爱”
            </div>
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
            <div class="field-tip">
              💡 建议：明确角色的行为动机和目标，这是推动剧情的关键。例如：“表面上想完成家族交付的契约婚姻，内心渴望找到真正的灵魂伴侣”
            </div>
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
            <div class="field-tip">
              💡 建议：描述与主要角色的关系及关系变化。例如：“女主的契约丈夫，初期冷淡相处，后期逐渐被她吸引，从契约变为真爱”
            </div>
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
import { Upload, MagicStick } from '@element-plus/icons-vue';
import AIResponseParser from './AIResponseParser.vue';
import { generateAIContent } from '@/api/ai';
import { generateCharacterPrompt, parseCharacterResponse } from '../utils/promptTemplates';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  character: {
    type: Object,
    default: null
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  },
  worldview: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'submit']);

const formRef = ref(null);
const submitting = ref(false);
const tagInputVisible = ref(false);
const tagInputValue = ref('');
const tagInputRef = ref(null);
const showAIParser = ref(false);

// AI生成相关状态
const generating = ref(false);
const generateProgress = ref(0);

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

// AI自动生成功能
const handleAIGenerate = async () => {
  // 检查必要信息
  if (!formData.value.name || !formData.value.role) {
    ElMessage.warning('请先填写角色姓名和角色定位，AI将基于这些信息生成完整设定');
    return;
  }
  
  generating.value = true;
  generateProgress.value = 0;
  
  // 立即显示开始提示
  ElMessage.info({
    message: `🤖 开始生成角色「${formData.value.name}」的详细设定...`,
    duration: 2000
  });
  
  const startTime = Date.now();
  
  // 模拟进度
  const progressInterval = setInterval(() => {
    if (generateProgress.value < 90) {
      generateProgress.value += 10;
    }
  }, 500);
  
  try {
    // 生成提示词
    const prompt = generateCharacterPrompt({
      name: formData.value.name,
      role: formData.value.role,
      age: formData.value.age,
      gender: formData.value.gender,
      personality: formData.value.personality,
      background: formData.value.background,
      motivation: formData.value.motivation,
      relationships: formData.value.relationships,
      projectType: props.projectInfo.type,
      projectName: props.projectInfo.name,
      worldview: props.worldview
    });
    
    console.log('🤖 发送AI请求，生成角色设定...', formData.value.name);
    
    // 调用AI API
    const response = await generateAIContent(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.8,
        maxTokens: 2000
      }
    );
    
    clearInterval(progressInterval);
    generateProgress.value = 100;
    
    const duration = Date.now() - startTime;
    
    if (response.code === 200 && response.data?.content) {
      const { content, usage, finishReason, latency } = response.data;
      
      // 解析AI返回内容
      const parsedData = parseCharacterResponse(content);
      
      console.log('✅ AI解析结果:', parsedData);
      
      // 填充表单数据
      if (parsedData.name) formData.value.name = parsedData.name;
      if (parsedData.age) formData.value.age = parsedData.age;
      if (parsedData.gender) formData.value.gender = parsedData.gender;
      if (parsedData.description) formData.value.description = parsedData.description;
      if (parsedData.personality) formData.value.personality = parsedData.personality;
      if (parsedData.background) formData.value.background = parsedData.background;
      if (parsedData.motivation) formData.value.motivation = parsedData.motivation;
      if (parsedData.relationships) formData.value.relationships = parsedData.relationships;
      
      // 检查完整性
      const completenessCheck = {
        hasName: !!parsedData.name,
        hasAge: !!parsedData.age,
        hasGender: !!parsedData.gender,
        hasDescription: parsedData.description && parsedData.description.length > 10,
        hasPersonality: parsedData.personality && parsedData.personality.length > 20,
        hasBackground: parsedData.background && parsedData.background.length > 50,
        hasMotivation: parsedData.motivation && parsedData.motivation.length > 20,
        hasRelationships: parsedData.relationships && parsedData.relationships.length > 20
      };
      
      const completedFields = Object.values(completenessCheck).filter(Boolean).length;
      const totalFields = Object.keys(completenessCheck).length;
      
      // 根据finishReason显示不同提示
      handleCharacterGenerationComplete(finishReason, usage, duration, completedFields, totalFields);
      
      // 输出统计信息
      console.log('📊 AI生成统计:', {
        '耗时': `${(duration/1000).toFixed(1)}秒`,
        'Token使用': usage?.total_tokens || 0,
        '输入Token': usage?.prompt_tokens || 0,
        '输出Token': usage?.completion_tokens || 0,
        '完成原因': finishReason || 'unknown',
        '响应时间': latency ? `${latency}ms` : '-',
        '完整度': `${completedFields}/${totalFields}`
      });
    } else {
      throw new Error(response.message || 'AI生成失败');
    }
  } catch (error) {
    console.error('❌ AI生成失败:', error);
    clearInterval(progressInterval);
    ElMessage.error(error.message || 'AI生成失败，请稍后重试');
  } finally {
    generating.value = false;
    // 等待一下再重置进度
    setTimeout(() => {
      generateProgress.value = 0;
    }, 1000);
  }
};

// 处理生成完成后的提示
const handleCharacterGenerationComplete = (finishReason, usage, duration, completedFields, totalFields) => {
  const completenessRate = (completedFields / totalFields * 100).toFixed(0);
  
  if (finishReason === 'stop') {
    // AI正常完成
    if (completedFields === totalFields) {
      ElMessage.success({
        message: `✅ AI生成成功！已自动填充所有字段（耗时${(duration/1000).toFixed(1)}秒）`,
        duration: 3000
      });
    } else if (completedFields >= totalFields * 0.75) {
      ElMessage.success({
        message: `✅ AI生成完成，已填充${completedFields}/${totalFields}个字段（完整度${completenessRate}%）`,
        duration: 3000
      });
    } else {
      ElMessage.warning({
        message: `⚠️ AI生成部分完成，已填充${completedFields}/${totalFields}个字段，请检查并补充`,
        duration: 4000
      });
    }
  } else if (finishReason === 'length') {
    // 达到Token限制
    ElMessage.warning({
      message: `⚠️ AI生成达到长度限制（${usage?.completion_tokens || 0} tokens），内容可能不完整。已填充${completedFields}/${totalFields}个字段。`,
      duration: 5000
    });
    console.warn('⚠️ 建议：增加maxTokens参数或简化提示词');
  } else if (finishReason === 'content_filter') {
    // 内容被过滤
    ElMessage.error({
      message: '🚫 生成内容触发了内容策略，请调整角色设定后重试',
      duration: 5000
    });
  } else {
    // 其他情况
    if (completedFields >= totalFields * 0.75) {
      ElMessage.success({
        message: `✅ AI生成完成，已填充${completedFields}/${totalFields}个字段（完整度${completenessRate}%）`,
        duration: 3000
      });
    } else if (completedFields >= totalFields * 0.5) {
      ElMessage.warning({
        message: `⚠️ AI生成部分完成，已填充${completedFields}/${totalFields}个字段，请检查并补充`,
        duration: 4000
      });
    } else {
      ElMessage.error({
        message: `❌ AI生成内容不完整（仅${completedFields}/${totalFields}个字段），建议重新生成`,
        duration: 5000
      });
    }
  }
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

.ai-generate-section {
  margin-bottom: 20px;
}

.ai-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.ai-desc {
  flex: 1;
  min-width: 200px;
}

.ai-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 响应式 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
  }
}
</style>
