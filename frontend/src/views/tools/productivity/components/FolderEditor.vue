<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑文件夹' : '新建文件夹'"
    width="500px"
    :close-on-click-modal="false"
    :lock-scroll="true"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="输入文件夹名称" maxlength="50" show-word-limit />
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="描述文件夹用途（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="图标">
        <div class="icon-selector">
          <el-input v-model="form.icon" placeholder="选择或输入 emoji" style="width: 120px" />
          <div class="icon-options">
            <span
              v-for="icon in iconOptions"
              :key="icon"
              class="icon-option"
              :class="{ active: form.icon === icon }"
              @click="form.icon = icon"
            >
              {{ icon }}
            </span>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="颜色">
        <el-color-picker v-model="form.color" show-alpha :predefine="predefineColors" />
      </el-form-item>

      <el-form-item label="父文件夹">
        <el-select v-model="form.parentId" clearable placeholder="选择父文件夹（可选）" style="width: 100%">
          <el-option label="根目录" :value="null" />
          <el-option
            v-for="folder in parentFolders"
            :key="folder.id"
            :label="folder.name"
            :value="folder.id"
            :disabled="isEdit && folder.id === currentFolderId"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue';
import { ElMessage } from 'element-plus';

const promptService = inject('promptService');

const props = defineProps({
  visible: Boolean,
  folder: Object,
  parentFolders: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:visible', 'saved']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const isEdit = computed(() => !!props.folder);
const currentFolderId = computed(() => props.folder?.id);
const formRef = ref(null);
const saving = ref(false);

const form = reactive({
  name: '',
  description: '',
  icon: '📁',
  color: '#409EFF',
  parentId: null
});

const rules = {
  name: [
    { required: true, message: '请输入文件夹名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度应在1-50字符之间', trigger: 'blur' }
  ]
};

const iconOptions = ref([
  '📁', '📂', '📋', '📝', '💡', '⭐', '🎯', '🔧',
  '📊', '🎨', '💼', '🎓', '📚', '🔬', '🎮', '🌟'
]);

const predefineColors = ref([
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
  '#909399', '#c71585', '#ff69b4', '#ba55d3',
  '#9370db', '#3cb371', '#2e8b57', '#008080'
]);

// 监听folder变化，初始化表单
watch(() => props.folder, (newFolder) => {
  if (newFolder) {
    Object.assign(form, {
      name: newFolder.name,
      description: newFolder.description || '',
      icon: newFolder.icon || '📁',
      color: newFolder.color || '#409EFF',
      parentId: newFolder.parentId || null
    });
  } else {
    resetForm();
  }
}, { immediate: true });

async function handleSave() {
  try {
    const valid = await formRef.value.validate();
    if (!valid) return;

    saving.value = true;

    if (isEdit.value) {
      await promptService.updateFolder(props.folder.id, form);
      ElMessage.success('更新成功');
    } else {
      await promptService.createFolder(form);
      ElMessage.success('创建成功');
    }

    emit('saved');
    handleClose();
  } catch (error) {
    ElMessage.error((isEdit.value ? '更新' : '创建') + '失败: ' + error.message);
  } finally {
    saving.value = false;
  }
}

function handleClose() {
  dialogVisible.value = false;
  resetForm();
}

function resetForm() {
  Object.assign(form, {
    name: '',
    description: '',
    icon: '📁',
    color: '#409EFF',
    parentId: null
  });
  formRef.value?.clearValidate();
}
</script>

<style scoped lang="scss">
.icon-selector {
  width: 100%;

  .icon-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;

    .icon-option {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      font-size: 24px;
      border: 2px solid #dcdfe6;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: #409eff;
        transform: scale(1.1);
      }

      &.active {
        border-color: #409eff;
        background: #ecf5ff;
      }
    }
  }
}
</style>
