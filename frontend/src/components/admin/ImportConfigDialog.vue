<template>
  <el-dialog
    v-model="visible"
    title="导入配置"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-content">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 文件导入 -->
        <el-tab-pane label="文件导入" name="file">
          <div class="upload-section">
            <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :show-file-list="true"
              :limit="1"
              accept=".json,.csv,.xlsx"
              @change="handleFileChange"
              @remove="handleFileRemove"
              drag
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 JSON、CSV、Excel 格式文件
                </div>
              </template>
            </el-upload>
          </div>
          
          <div v-if="filePreview.length > 0" class="preview-section">
            <h4>预览数据 (前5条)</h4>
            <el-table :data="filePreview.slice(0, 5)" border size="small">
              <el-table-column prop="path" label="路径" width="200" />
              <el-table-column prop="matchType" label="匹配类型" width="100" />
              <el-table-column prop="priority" label="优先级" width="80" />
              <el-table-column prop="description" label="描述" />
            </el-table>
            <div class="preview-info">
              共 {{ filePreview.length }} 条数据
            </div>
          </div>
        </el-tab-pane>
        
        <!-- JSON导入 -->
        <el-tab-pane label="JSON导入" name="json">
          <div class="json-section">
            <el-form-item label="JSON数据">
              <el-input
                v-model="jsonData"
                type="textarea"
                :rows="12"
                placeholder="粘贴JSON配置数据..."
              />
            </el-form-item>
            
            <div class="json-actions">
              <el-button size="small" @click="validateJson">验证JSON</el-button>
              <el-button size="small" @click="formatJson">格式化</el-button>
              <el-button size="small" @click="loadSampleJson">加载示例</el-button>
            </div>
            
            <div v-if="jsonPreview.length > 0" class="preview-section">
              <h4>解析结果 ({{ jsonPreview.length }} 条)</h4>
              <el-table :data="jsonPreview.slice(0, 3)" border size="small">
                <el-table-column prop="path" label="路径" width="200" />
                <el-table-column prop="matchType" label="匹配类型" width="100" />
                <el-table-column prop="priority" label="优先级" width="80" />
                <el-table-column prop="description" label="描述" />
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      
      <!-- 导入选项 -->
      <el-card class="import-options" shadow="never">
        <template #header>
          <h4>导入选项</h4>
        </template>
        
        <el-form :model="importOptions" label-width="120px">
          <el-form-item label="冲突处理">
            <el-radio-group v-model="importOptions.conflictAction">
              <el-radio label="skip">跳过重复</el-radio>
              <el-radio label="update">更新现有</el-radio>
              <el-radio label="rename">自动重命名</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="默认状态">
            <el-switch v-model="importOptions.defaultActive" />
            <span class="form-tip">导入的配置默认是否激活</span>
          </el-form-item>
          
          <el-form-item label="优先级偏移">
            <el-input-number
              v-model="importOptions.priorityOffset"
              :min="-999"
              :max="999"
              placeholder="0"
            />
            <span class="form-tip">为所有导入配置的优先级添加偏移量</span>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="downloadTemplate">下载模板</el-button>
        <el-button
          type="primary"
          @click="handleImport"
          :loading="importing"
          :disabled="!canImport"
        >
          开始导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { importBackgroundConfigs } from '@/api/backgrounds';

const props = defineProps({
  modelValue: Boolean
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const importing = ref(false);
const activeTab = ref('file');
const uploadRef = ref(null);
const selectedFile = ref(null);
const filePreview = ref([]);
const jsonData = ref('');
const jsonPreview = ref([]);

const importOptions = ref({
  conflictAction: 'skip',
  defaultActive: true,
  priorityOffset: 0
});

const canImport = computed(() => {
  return (activeTab.value === 'file' && filePreview.value.length > 0) ||
         (activeTab.value === 'json' && jsonPreview.value.length > 0);
});

const handleFileChange = (file) => {
  selectedFile.value = file;
  parseFile(file.raw);
};

const handleFileRemove = () => {
  selectedFile.value = null;
  filePreview.value = [];
};

const parseFile = async (file) => {
  try {
    const text = await file.text();
    
    if (file.name.endsWith('.json')) {
      const data = JSON.parse(text);
      filePreview.value = Array.isArray(data) ? data : [data];
    } else if (file.name.endsWith('.csv')) {
      // 简单的CSV解析
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      filePreview.value = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });
    }
    
    ElMessage.success(`成功解析 ${filePreview.value.length} 条数据`);
  } catch (error) {
    ElMessage.error('文件解析失败：' + error.message);
    filePreview.value = [];
  }
};

const validateJson = () => {
  try {
    const data = JSON.parse(jsonData.value);
    jsonPreview.value = Array.isArray(data) ? data : [data];
    ElMessage.success(`JSON验证成功，解析到 ${jsonPreview.value.length} 条数据`);
  } catch (error) {
    ElMessage.error('JSON格式错误：' + error.message);
    jsonPreview.value = [];
  }
};

const formatJson = () => {
  try {
    const data = JSON.parse(jsonData.value);
    jsonData.value = JSON.stringify(data, null, 2);
    ElMessage.success('JSON格式化完成');
  } catch (error) {
    ElMessage.error('JSON格式错误，无法格式化');
  }
};

const loadSampleJson = () => {
  const sample = [
    {
      pathConfig: {
        path: "/example1",
        matchType: "exact",
        priority: 100,
        description: "示例配置1"
      },
      backgroundImage: {
        url: "/uploads/backgrounds/example1.jpg",
        filename: "example1.jpg",
        size: 1024000,
        dimensions: { width: 1920, height: 1080 },
        format: "jpg"
      },
      displaySettings: {
        opacity: 1.0,
        blur: 0,
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0
      },
      layoutSettings: {
        zIndex: -1,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "scroll"
      },
      responsiveSettings: {
        enableOnMobile: true,
        enableOnTablet: true,
        enableOnDesktop: true,
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024
      },
      isActive: true,
      notes: "示例配置1"
    },
    {
      pathConfig: {
        path: "/example2/*",
        matchType: "wildcard",
        priority: 90,
        description: "示例配置2"
      },
      backgroundImage: {
        url: "/uploads/backgrounds/example2.jpg",
        filename: "example2.jpg",
        size: 2048000,
        dimensions: { width: 1920, height: 1080 },
        format: "jpg"
      },
      displaySettings: {
        opacity: 0.8,
        blur: 2,
        brightness: 1.1,
        contrast: 1.0,
        saturation: 1.0
      },
      layoutSettings: {
        zIndex: -1,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "scroll"
      },
      responsiveSettings: {
        enableOnMobile: true,
        enableOnTablet: true,
        enableOnDesktop: true,
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024
      },
      isActive: true,
      notes: "示例配置2"
    }
  ];

  jsonData.value = JSON.stringify(sample, null, 2);
  validateJson();
};

const downloadTemplate = () => {
  const template = [
    {
      pathConfig: {
        path: "/example",
        matchType: "exact",
        priority: 100,
        description: "配置描述"
      },
      backgroundImage: {
        url: "/uploads/backgrounds/example.jpg",
        filename: "example.jpg",
        size: 1024000,
        dimensions: { width: 1920, height: 1080 },
        format: "jpg",
        mobileUrl: "",
        tabletUrl: ""
      },
      displaySettings: {
        opacity: 1.0,
        blur: 0,
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0
      },
      layoutSettings: {
        zIndex: -1,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "scroll"
      },
      responsiveSettings: {
        enableOnMobile: true,
        enableOnTablet: true,
        enableOnDesktop: true,
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024
      },
      isActive: true,
      notes: "配置备注"
    }
  ];
  
  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'background-config-template.json';
  a.click();
  URL.revokeObjectURL(url);
  
  ElMessage.success('模板下载完成');
};

const handleImport = async () => {
  const dataToImport = activeTab.value === 'file' ? filePreview.value : jsonPreview.value;

  if (dataToImport.length === 0) {
    ElMessage.warning('没有可导入的数据');
    return;
  }

  // 数据格式化和验证
  const formattedConfigs = dataToImport.map(item => {
    // 如果数据已经是完整格式，直接使用
    if (item.pathConfig && item.backgroundImage) {
      return item;
    }

    // 否则转换为标准格式
    return {
      pathConfig: {
        path: item.path || '',
        matchType: item.matchType || 'exact',
        priority: (item.priority || 100) + (importOptions.value.priorityOffset || 0),
        description: item.description || `导入的配置 - ${item.path}`
      },
      backgroundImage: {
        url: item.backgroundImage?.url || item.url || '',
        filename: item.backgroundImage?.filename || item.filename || '',
        size: item.backgroundImage?.size || item.size || 0,
        dimensions: item.backgroundImage?.dimensions || item.dimensions || { width: 0, height: 0 },
        format: item.backgroundImage?.format || item.format || ''
      },
      displaySettings: item.displaySettings || {
        opacity: 1.0,
        blur: 0,
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0
      },
      layoutSettings: item.layoutSettings || {
        zIndex: -1,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'scroll'
      },
      responsiveSettings: item.responsiveSettings || {
        enableOnMobile: true,
        enableOnTablet: true,
        enableOnDesktop: true,
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024
      },
      isActive: item.isActive !== undefined ? item.isActive : importOptions.value.defaultActive,
      notes: item.notes || '导入的配置'
    };
  });

  importing.value = true;
  try {
    const response = await importBackgroundConfigs(formattedConfigs, importOptions.value);

    const result = response.data.data;
    const hasSuccess = result.created > 0 || result.updated > 0;
    const hasFailures = result.failed > 0;

    if (response.data.success) {
      if (hasFailures && hasSuccess) {
        // 部分成功
        ElMessage.warning(
          `导入部分成功！成功: ${result.created}，更新: ${result.updated}，跳过: ${result.skipped}，失败: ${result.failed}`
        );
      } else {
        // 完全成功
        ElMessage.success(
          `导入完成！成功: ${result.created}，更新: ${result.updated}，跳过: ${result.skipped}`
        );
      }
      emit('success');
    } else {
      // 完全失败或主要失败
      if (result.skipped > 0 && result.failed > 0) {
        ElMessage.error(
          `导入失败！跳过: ${result.skipped}，失败: ${result.failed}。${response.data.message || ''}`
        );
      } else {
        ElMessage.error(response.data.message || '导入失败');
      }

      // 如果有错误详情，显示在消息中
      if (result.errors && result.errors.length > 0 && result.errors.length <= 3) {
        ElMessage.error(`导入失败！${result.errors.join('; ')}`);
      }
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '导入失败');
  } finally {
    importing.value = false;
  }
};

const handleClose = () => {
  visible.value = false;
  resetForm();
};

const resetForm = () => {
  activeTab.value = 'file';
  selectedFile.value = null;
  filePreview.value = [];
  jsonData.value = '';
  jsonPreview.value = [];
  importOptions.value = {
    conflictAction: 'skip',
    defaultActive: true,
    priorityOffset: 0
  };
  
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};
</script>

<style scoped>
.import-content {
  max-height: 70vh;
  overflow-y: auto;
}

.upload-section {
  padding: 20px 0;
}

.preview-section {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.preview-info {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.json-section {
  padding: 16px 0;
}

.json-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.import-options {
  margin-top: 16px;
  border: 1px solid #e4e7ed;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
</style>
