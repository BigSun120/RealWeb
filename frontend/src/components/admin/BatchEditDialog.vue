<template>
  <el-dialog
    v-model="visible"
    title="批量编辑配置"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="batch-edit-content">
      <el-alert
        :title="`正在编辑 ${selectedConfigs.length} 个配置`"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />

      <el-form :model="form" label-width="120px">
        <el-card class="form-section" shadow="never">
          <template #header>
            <h4>显示设置</h4>
          </template>
          
          <el-form-item>
            <el-checkbox v-model="enableDisplayEdit">修改显示设置</el-checkbox>
          </el-form-item>
          
          <template v-if="enableDisplayEdit">
            <el-form-item label="透明度">
              <el-slider
                v-model="form.displaySettings.opacity"
                :min="0"
                :max="1"
                :step="0.1"
                show-input
                :input-size="'small'"
              />
            </el-form-item>
            
            <el-form-item label="模糊效果">
              <el-slider
                v-model="form.displaySettings.blur"
                :min="0"
                :max="20"
                show-input
                :input-size="'small'"
              />
            </el-form-item>
            
            <el-form-item label="亮度">
              <el-slider
                v-model="form.displaySettings.brightness"
                :min="0.1"
                :max="2"
                :step="0.1"
                show-input
                :input-size="'small'"
              />
            </el-form-item>
          </template>
        </el-card>

        <el-card class="form-section" shadow="never">
          <template #header>
            <h4>布局设置</h4>
          </template>
          
          <el-form-item>
            <el-checkbox v-model="enableLayoutEdit">修改布局设置</el-checkbox>
          </el-form-item>
          
          <template v-if="enableLayoutEdit">
            <el-form-item label="背景尺寸">
              <el-select v-model="form.layoutSettings.backgroundSize">
                <el-option label="覆盖 (cover)" value="cover" />
                <el-option label="包含 (contain)" value="contain" />
                <el-option label="自动 (auto)" value="auto" />
                <el-option label="拉伸 (100% 100%)" value="100% 100%" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="背景位置">
              <el-input v-model="form.layoutSettings.backgroundPosition" placeholder="center center" />
            </el-form-item>
          </template>
        </el-card>

        <el-card class="form-section" shadow="never">
          <template #header>
            <h4>其他设置</h4>
          </template>
          
          <el-form-item>
            <el-checkbox v-model="enableStatusEdit">修改激活状态</el-checkbox>
          </el-form-item>
          
          <template v-if="enableStatusEdit">
            <el-form-item label="激活状态">
              <el-switch v-model="form.isActive" />
            </el-form-item>
          </template>
          
          <el-form-item>
            <el-checkbox v-model="enablePriorityEdit">修改优先级</el-checkbox>
          </el-form-item>
          
          <template v-if="enablePriorityEdit">
            <el-form-item label="优先级调整">
              <el-radio-group v-model="priorityAction">
                <el-radio label="set">设置为</el-radio>
                <el-radio label="increase">增加</el-radio>
                <el-radio label="decrease">减少</el-radio>
              </el-radio-group>
              <el-input-number
                v-model="priorityValue"
                :min="priorityAction === 'set' ? 1 : 1"
                :max="priorityAction === 'set' ? 1000 : 100"
                style="margin-left: 12px"
              />
            </el-form-item>
          </template>
        </el-card>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          批量更新
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { batchUpdateBackgroundConfigs } from '@/api/backgrounds';

const props = defineProps({
  modelValue: Boolean,
  selectedConfigs: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const submitting = ref(false);
const enableDisplayEdit = ref(false);
const enableLayoutEdit = ref(false);
const enableStatusEdit = ref(false);
const enablePriorityEdit = ref(false);
const priorityAction = ref('set');
const priorityValue = ref(100);

const form = ref({
  displaySettings: {
    opacity: 1.0,
    blur: 0,
    brightness: 1.0
  },
  layoutSettings: {
    backgroundSize: 'cover',
    backgroundPosition: 'center center'
  },
  isActive: true
});

const handleClose = () => {
  visible.value = false;
  resetForm();
};

const resetForm = () => {
  enableDisplayEdit.value = false;
  enableLayoutEdit.value = false;
  enableStatusEdit.value = false;
  enablePriorityEdit.value = false;
  priorityAction.value = 'set';
  priorityValue.value = 100;
  
  form.value = {
    displaySettings: {
      opacity: 1.0,
      blur: 0,
      brightness: 1.0
    },
    layoutSettings: {
      backgroundSize: 'cover',
      backgroundPosition: 'center center'
    },
    isActive: true
  };
};

const handleSubmit = async () => {
  if (!enableDisplayEdit.value && !enableLayoutEdit.value &&
      !enableStatusEdit.value && !enablePriorityEdit.value) {
    ElMessage.warning('请至少选择一项要修改的设置');
    return;
  }

  // 构建更新数据
  const updateData = {};

  if (enableDisplayEdit.value) {
    updateData.displaySettings = form.value.displaySettings;
  }

  if (enableLayoutEdit.value) {
    updateData.layoutSettings = form.value.layoutSettings;
  }

  if (enableStatusEdit.value) {
    updateData.isActive = form.value.isActive;
  }

  if (enablePriorityEdit.value) {
    updateData.priorityUpdate = {
      action: priorityAction.value,
      value: priorityValue.value
    };
  }

  const ids = props.selectedConfigs.map(config => config._id);

  submitting.value = true;
  try {
    const response = await batchUpdateBackgroundConfigs(ids, updateData);

    if (response.data.success) {
      ElMessage.success(`已成功更新 ${response.data.data.updated} 个配置`);
      emit('success');
    } else {
      ElMessage.error(response.data.message || '批量编辑失败');
    }
  } catch (error) {
    console.error('批量编辑失败:', error);
    ElMessage.error(error.response?.data?.message || '批量编辑失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.batch-edit-content {
  max-height: 60vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
}

.form-section:last-child {
  margin-bottom: 0;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
