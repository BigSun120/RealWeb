<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="900px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <!-- 导入AI响应区域 -->
    <el-collapse v-model="activeSection" accordion style="margin-bottom: 20px">
      <el-collapse-item name="import" title="🤖 导入AI生成内容">
        <el-alert
          title="使用说明"
          type="info"
          :closable="false"
          style="margin-bottom: 12px"
        >
          将外部AI生成的分集内容粘贴到下方文本框，确保使用【字段名】格式，系统将自动解析并填充表单。
        </el-alert>
        <el-input
          v-model="aiResponseText"
          type="textarea"
          :rows="10"
          placeholder="粘贴AI生成的分集内容..."
        />
        <div style="margin-top: 12px; text-align: right">
          <el-button @click="clearAIResponse">清空</el-button>
          <el-button type="primary" :loading="parsing" @click="parseAIResponse">
            解析并填充
          </el-button>
        </div>
        
        <!-- 解析结果提示 -->
        <el-alert
          v-if="parseResult"
          :title="parseResult.message"
          :type="parseResult.type"
          style="margin-top: 12px"
          closable
          @close="parseResult = null"
        >
          <template v-if="parseResult.warnings && parseResult.warnings.length > 0">
            <div style="margin-top: 8px">
              <div style="font-weight: 600; margin-bottom: 4px">提示：</div>
              <ul style="margin: 0; padding-left: 20px">
                <li v-for="(warning, idx) in parseResult.warnings" :key="idx">
                  {{ warning }}
                </li>
              </ul>
            </div>
          </template>
        </el-alert>
      </el-collapse-item>
    </el-collapse>

    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      label-position="left"
    >
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12">
          <el-form-item label="集数" prop="number">
            <el-input-number
              v-model="formData.number"
              :min="1"
              :max="999"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="12">
          <el-form-item label="状态" prop="status">
            <el-select v-model="formData.status" placeholder="选择状态" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="进行中" value="in-progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已审核" value="reviewed" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="标题" prop="title">
            <el-input
              v-model="formData.title"
              placeholder="例如：第1集：契约的开始"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="集简介">
            <el-input
              v-model="formData.content.summary"
              type="textarea"
              :rows="3"
              placeholder="简要描述本集的主要内容和情节..."
              maxlength="300"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="场景内容">
            <div v-if="formData.content.scenes && formData.content.scenes.length > 0" class="scenes-list">
              <div
                v-for="(scene, index) in formData.content.scenes"
                :key="index"
                class="scene-item"
              >
                <div class="scene-header">
                  <span class="scene-number">场景{{ scene.number || index + 1 }}</span>
                  <el-button
                    type="danger"
                    size="small"
                    text
                    @click="removeScene(index)"
                  >
                    删除
                  </el-button>
                </div>
                <div class="scene-fields">
                  <el-input
                    v-model="scene.location"
                    placeholder="地点"
                    size="small"
                    style="margin-bottom: 8px"
                  >
                    <template #prepend>地点</template>
                  </el-input>
                  <el-input
                    v-model="scene.time"
                    placeholder="时间"
                    size="small"
                    style="margin-bottom: 8px"
                  >
                    <template #prepend>时间</template>
                  </el-input>
                  <el-input
                    v-model="scene.atmosphere"
                    placeholder="氛围"
                    size="small"
                    style="margin-bottom: 8px"
                  >
                    <template #prepend>氛围</template>
                  </el-input>
                  <el-input
                    v-model="scene.content"
                    type="textarea"
                    :rows="3"
                    placeholder="场景详细描述"
                    size="small"
                  />
                </div>
              </div>
              <el-button
                type="primary"
                size="small"
                plain
                style="width: 100%; margin-top: 8px"
                @click="addScene"
              >
                + 添加场景
              </el-button>
            </div>
            <el-input
              v-else
              v-model="formData.content.script"
              type="textarea"
              :rows="8"
              placeholder="编写详细的剧本内容，包括场景、对话、动作描写等...
提示：也可以使用上方'导入AI响应'功能自动解析场景结构"
              @input="updateWordCount"
            />
            <div class="field-tip">
              当前字数：{{ formData.wordCount }} 字
            </div>
          </el-form-item>
        </el-col>

        <el-col v-if="formData.content.keyDialogues && formData.content.keyDialogues.length > 0" :span="24">
          <el-form-item label="关键对白">
            <el-tag
              v-for="(dialogue, index) in formData.content.keyDialogues"
              :key="index"
              closable
              style="margin: 4px"
              @close="removeDialogue(index)"
            >
              {{ dialogue }}
            </el-tag>
          </el-form-item>
        </el-col>

        <el-col v-if="formData.content.cliffhanger" :span="24">
          <el-form-item label="结尾悬念">
            <el-input
              v-model="formData.content.cliffhanger"
              type="textarea"
              :rows="2"
              placeholder="描述结尾留下的悬念..."
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="备注">
            <el-input
              v-model="formData.content.notes"
              type="textarea"
              :rows="2"
              placeholder="导演备注、拍摄要点等..."
              maxlength="200"
              show-word-limit
            />
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
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { parseEpisodeResponse, validateEpisodeData } from '../utils/episodeResponseParser';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  episode: {
    type: Object,
    default: null
  },
  episodeNumber: {
    type: Number,
    default: 1
  },
  characters: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'submit']);

const formRef = ref(null);
const submitting = ref(false);
const aiResponseText = ref('');
const parsing = ref(false);
const parseResult = ref(null);
const activeSection = ref(''); // 折叠面板活动项

// 表单数据
const formData = ref({
  number: 1,
  title: '',
  status: 'draft',
  content: {
    summary: '',
    script: '',
    scenes: [],
    keyDialogues: [],
    cliffhanger: '',
    notes: ''
  },
  wordCount: 0
});

// 表单验证规则
const formRules = {
  number: [
    { required: true, message: '请输入集数', trigger: 'blur' },
    { type: 'number', min: 1, message: '集数必须大于0', trigger: 'blur' }
  ],
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
};

// 是否编辑模式
const isEditMode = computed(() => !!props.episode);

// 对话框标题
const dialogTitle = computed(() => {
  return isEditMode.value ? `编辑第${formData.value.number}集` : '添加新分集';
});

// 更新字数统计
const updateWordCount = () => {
  let totalWords = 0;
  
  // 计算script字数
  if (formData.value.content.script) {
    totalWords += formData.value.content.script.length;
  }
  
  // 计算scenes字数
  if (formData.value.content.scenes) {
    formData.value.content.scenes.forEach(scene => {
      if (scene.content) {
        totalWords += scene.content.length;
      }
    });
  }
  
  formData.value.wordCount = totalWords;
};

// 添加场景
const addScene = () => {
  if (!formData.value.content.scenes) {
    formData.value.content.scenes = [];
  }
  formData.value.content.scenes.push({
    number: formData.value.content.scenes.length + 1,
    location: '',
    time: '',
    atmosphere: '',
    content: ''
  });
};

// 删除场景
const removeScene = (index) => {
  formData.value.content.scenes.splice(index, 1);
  // 重新编号
  formData.value.content.scenes.forEach((scene, idx) => {
    scene.number = idx + 1;
  });
  updateWordCount();
};

// 删除对白
const removeDialogue = (index) => {
  formData.value.content.keyDialogues.splice(index, 1);
};

// 清空AI响应
const clearAIResponse = () => {
  aiResponseText.value = '';
  parseResult.value = null;
};

// 解析AI响应
const parseAIResponse = async () => {
  if (!aiResponseText.value.trim()) {
    ElMessage.warning('请先粘贴AI生成的内容');
    return;
  }
  
  parsing.value = true;
  parseResult.value = null;
  
  try {
    // 解析AI响应
    const parsed = parseEpisodeResponse(aiResponseText.value);
    
    // 验证解析结果
    const validation = validateEpisodeData(parsed);
    
    // 填充表单
    if (parsed.title) {
      formData.value.title = parsed.title;
    }
    if (parsed.content.summary) {
      formData.value.content.summary = parsed.content.summary;
    }
    if (parsed.content.scenes && parsed.content.scenes.length > 0) {
      formData.value.content.scenes = parsed.content.scenes;
    }
    if (parsed.content.keyDialogues && parsed.content.keyDialogues.length > 0) {
      formData.value.content.keyDialogues = parsed.content.keyDialogues;
    }
    if (parsed.content.cliffhanger) {
      formData.value.content.cliffhanger = parsed.content.cliffhanger;
    }
    
    // 更新字数
    updateWordCount();
    
    // 显示结果
    parseResult.value = {
      type: validation.isValid ? 'success' : 'warning',
      message: validation.isValid ? '解析成功！已自动填充表单' : '解析完成，但有一些字段缺失',
      warnings: validation.warnings
    };
    
    ElMessage.success('解析成功');
    
    // 收起导入面板
    activeSection.value = '';
    
  } catch (error) {
    console.error('解析失败:', error);
    parseResult.value = {
      type: 'error',
      message: `解析失败：${error.message}`,
      warnings: ['请确保AI输出使用了【字段名】格式']
    };
    ElMessage.error('解析失败');
  } finally {
    parsing.value = false;
  }
};

// 监听episode变化
watch(() => props.episode, (newVal) => {
  if (newVal) {
    formData.value = {
      ...newVal,
      content: {
        summary: newVal.content?.summary || '',
        script: newVal.content?.script || '',
        scenes: newVal.content?.scenes || [],
        keyDialogues: newVal.content?.keyDialogues || [],
        cliffhanger: newVal.content?.cliffhanger || '',
        notes: newVal.content?.notes || ''
      },
      wordCount: newVal.wordCount || 0
    };
  } else {
    // 新建模式
    formData.value = {
      number: props.episodeNumber,
      title: '',
      status: 'draft',
      content: {
        summary: '',
        script: '',
        scenes: [],
        keyDialogues: [],
        cliffhanger: '',
        notes: ''
      },
      wordCount: 0
    };
  }
}, { immediate: true });

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    // 关闭时重置表单
    setTimeout(() => {
      if (formRef.value) {
        formRef.value.resetFields();
      }
    }, 300);
  }
});

// 关闭对话框
const handleClose = () => {
  emit('update:modelValue', false);
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      // 更新字数统计
      updateWordCount();
      
      const episodeData = {
        ...formData.value,
        id: props.episode?.id,
        wordCount: formData.value.wordCount
      };
      
      emit('submit', episodeData);
      handleClose();
    } catch (error) {
      console.error('提交失败:', error);
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
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

.scenes-list {
  width: 100%;
}

.scene-item {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.scene-number {
  font-weight: 600;
  color: #409EFF;
  font-size: 14px;
}

.scene-fields {
  display: flex;
  flex-direction: column;
}

/* 响应式 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
  }
}
</style>
