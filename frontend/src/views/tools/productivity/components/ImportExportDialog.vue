<template>
  <el-dialog
    v-model="dialogVisible"
    :title="mode === 'export' ? '导出提示词' : '导入提示词'"
    width="600px"
    :close-on-click-modal="false"
  >
    <!-- 导出模式 -->
    <div v-if="mode === 'export'" class="export-content">
      <el-form label-width="100px">
        <el-form-item label="导出范围">
          <el-radio-group v-model="exportScope">
            <el-radio label="all">全部提示词</el-radio>
            <el-radio label="folder" :disabled="!currentFolderId">
              当前文件夹
            </el-radio>
            <el-radio label="selected" :disabled="!selectedPrompts || selectedPrompts.length === 0">
              选中的提示词 ({{ selectedPrompts?.length || 0 }})
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="导出选项">
          <el-checkbox v-model="exportOptions.includeFolders">
            包含文件夹结构
          </el-checkbox>
          <el-checkbox v-model="exportOptions.includeExamples">
            包含使用示例
          </el-checkbox>
        </el-form-item>

        <el-alert
          type="info"
          :closable="false"
          show-icon
        >
          <template #title>
            <div class="export-info">
              将导出 {{ estimatedCount }} 个提示词
            </div>
          </template>
        </el-alert>
      </el-form>
    </div>

    <!-- 导入模式 -->
    <div v-else class="import-content">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :on-change="handleFileChange"
        :show-file-list="true"
        :limit="1"
        accept=".json"
        drag
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到这里或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只能上传 JSON 文件
          </div>
        </template>
      </el-upload>

      <el-form v-if="selectedFile" label-width="120px" style="margin-top: 20px;">
        <el-form-item label="重复处理">
          <el-radio-group v-model="importOptions.onDuplicate">
            <el-radio label="skip">跳过</el-radio>
            <el-radio label="overwrite">覆盖</el-radio>
            <el-radio label="createCopy">创建副本</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="文件夹">
          <el-checkbox v-model="importOptions.createFolders">
            自动创建文件夹
          </el-checkbox>
        </el-form-item>
      </el-form>

      <!-- 导入进度 -->
      <div v-if="importing" class="import-progress">
        <el-progress :percentage="importProgress" />
        <p class="progress-text">正在导入...</p>
      </div>

      <!-- 导入结果 -->
      <div v-if="importResult" class="import-result">
        <el-alert
          :type="importResult.errors.length > 0 ? 'warning' : 'success'"
          :closable="false"
          show-icon
        >
          <template #title>
            <div class="result-summary">
              <p>成功导入 {{ importResult.success }} 个提示词</p>
              <p v-if="importResult.skipped > 0">跳过 {{ importResult.skipped }} 个重复项</p>
              <p v-if="importResult.createdFolders > 0">创建 {{ importResult.createdFolders }} 个文件夹</p>
              <p v-if="importResult.errors.length > 0" class="error-text">
                {{ importResult.errors.length }} 个错误
              </p>
            </div>
          </template>
        </el-alert>

        <el-collapse v-if="importResult.errors.length > 0" style="margin-top: 10px;">
          <el-collapse-item title="查看错误详情" name="errors">
            <div class="error-list">
              <div v-for="(error, idx) in importResult.errors" :key="idx" class="error-item">
                <strong>{{ error.title }}</strong>: {{ error.error }}
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ importing || importResult ? '关闭' : '取消' }}
        </el-button>
        <el-button
          v-if="mode === 'export'"
          type="primary"
          :loading="exporting"
          @click="handleExport"
        >
          <i class="el-icon-download"></i>
          导出
        </el-button>
        <el-button
          v-else
          type="primary"
          :loading="importing"
          :disabled="!selectedFile || importResult"
          @click="handleImport"
        >
          <i class="el-icon-upload"></i>
          开始导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, reactive, computed, watch, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';

export default {
  name: 'ImportExportDialog',
  components: {
    UploadFilled
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'export', // 'export' or 'import'
      validator: (value) => ['export', 'import'].includes(value)
    },
    currentFolderId: {
      type: String,
      default: null
    },
    selectedPrompts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:visible', 'import-success', 'export-success'],
  setup(props, { emit }) {
    const promptService = inject('promptService');

    const dialogVisible = computed({
      get: () => props.visible,
      set: (val) => emit('update:visible', val)
    });

    // 导出相关
    const exportScope = ref('all');
    const exporting = ref(false);
    const exportOptions = reactive({
      includeFolders: true,
      includeExamples: true
    });

    const estimatedCount = computed(() => {
      if (exportScope.value === 'all') {
        return '全部';
      } else if (exportScope.value === 'folder') {
        return '该文件夹中的所有';
      } else if (exportScope.value === 'selected') {
        return props.selectedPrompts?.length || 0;
      }
      return 0;
    });

    // 导入相关
    const uploadRef = ref(null);
    const selectedFile = ref(null);
    const importing = ref(false);
    const importProgress = ref(0);
    const importResult = ref(null);
    const importOptions = reactive({
      onDuplicate: 'skip',
      createFolders: true
    });

    // 处理文件选择
    const handleFileChange = (file) => {
      if (file.raw.type !== 'application/json') {
        ElMessage.error('只能上传 JSON 文件');
        return;
      }
      selectedFile.value = file.raw;
      importResult.value = null;
    };

    // 导出
    const handleExport = async () => {
      try {
        exporting.value = true;

        const params = {};
        if (exportScope.value === 'all') {
          params.exportAll = true;
        } else if (exportScope.value === 'folder') {
          params.folderId = props.currentFolderId;
        } else if (exportScope.value === 'selected') {
          params.promptIds = props.selectedPrompts.map(p => p.id).join(',');
        }

        const response = await promptService.exportPrompts(params);

        if (response.code === 200) {
          // 生成文件名
          const timestamp = new Date().toISOString().slice(0, 10);
          const filename = `prompt-vault-export-${timestamp}.json`;

          // 下载文件
          const blob = new Blob([JSON.stringify(response.data, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          ElMessage.success('导出成功');
          emit('export-success');
          handleClose();
        }
      } catch (error) {
        console.error('导出失败:', error);
        ElMessage.error(error.message || '导出失败');
      } finally {
        exporting.value = false;
      }
    };

    // 导入
    const handleImport = async () => {
      if (!selectedFile.value) {
        ElMessage.warning('请选择要导入的文件');
        return;
      }

      try {
        importing.value = true;
        importProgress.value = 0;

        // 读取文件内容
        const fileContent = await readFileAsText(selectedFile.value);
        const importData = JSON.parse(fileContent);

        // 模拟进度
        const progressInterval = setInterval(() => {
          if (importProgress.value < 90) {
            importProgress.value += 10;
          }
        }, 200);

        // 调用导入 API
        const response = await promptService.importPrompts({
          data: importData,
          options: importOptions
        });

        clearInterval(progressInterval);
        importProgress.value = 100;

        if (response.code === 200) {
          importResult.value = response.data;
          ElMessage.success(response.message);
          emit('import-success', response.data);
        }
      } catch (error) {
        console.error('导入失败:', error);
        ElMessage.error(error.message || '导入失败');
      } finally {
        importing.value = false;
      }
    };

    // 读取文件
    const readFileAsText = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    };

    // 关闭对话框
    const handleClose = () => {
      if (!importing.value) {
        dialogVisible.value = false;
        // 重置状态
        selectedFile.value = null;
        importResult.value = null;
        importProgress.value = 0;
        exportScope.value = 'all';
      }
    };

    // 监听对话框打开
    watch(dialogVisible, (visible) => {
      if (!visible) {
        selectedFile.value = null;
        importResult.value = null;
        importProgress.value = 0;
      }
    });

    return {
      dialogVisible,
      exportScope,
      exporting,
      exportOptions,
      estimatedCount,
      uploadRef,
      selectedFile,
      importing,
      importProgress,
      importResult,
      importOptions,
      handleFileChange,
      handleExport,
      handleImport,
      handleClose
    };
  }
};
</script>

<style scoped lang="scss">
.export-content,
.import-content {
  min-height: 200px;
}

.export-info {
  font-size: 14px;
  color: #606266;
}

.import-progress {
  margin-top: 20px;

  .progress-text {
    text-align: center;
    margin-top: 10px;
    color: #606266;
  }
}

.import-result {
  margin-top: 20px;

  .result-summary {
    p {
      margin: 4px 0;
      font-size: 14px;
    }

    .error-text {
      color: #F56C6C;
    }
  }

  .error-list {
    max-height: 200px;
    overflow-y: auto;

    .error-item {
      padding: 8px;
      border-bottom: 1px solid #EBEEF5;
      font-size: 13px;

      &:last-child {
        border-bottom: none;
      }

      strong {
        color: #303133;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
