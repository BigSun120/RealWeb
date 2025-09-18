<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑背景配置' : '新增背景配置'"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent
    >
      <!-- 路径配置 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <h4>路径匹配配置</h4>
        </template>
        
        <el-form-item label="匹配类型" prop="pathConfig.matchType">
          <el-select
            v-model="form.pathConfig.matchType"
            style="width: 200px"
            @change="handleMatchTypeChange"
          >
            <el-option label="精确匹配" value="exact" />
            <el-option label="前缀匹配" value="prefix" />
            <el-option label="通配符匹配" value="wildcard" />
            <el-option label="正则匹配" value="regex" />
          </el-select>
          <el-tooltip placement="right">
            <template #content>
              <div>
                <p><strong>精确匹配</strong>: 完全匹配指定路径</p>
                <p><strong>前缀匹配</strong>: 匹配以指定路径开头的所有路径</p>
                <p><strong>通配符匹配</strong>: 支持 * 和 ? 通配符</p>
                <p><strong>正则匹配</strong>: 使用正则表达式匹配</p>
              </div>
            </template>
            <el-icon style="margin-left: 8px; cursor: help"><question-filled /></el-icon>
          </el-tooltip>
        </el-form-item>
        
        <el-form-item label="路径规则" prop="pathConfig.path">
          <el-input
            v-model="form.pathConfig.path"
            placeholder="请输入路径规则"
            style="width: 400px"
            @input="updatePathExamples"
          />
        </el-form-item>
        
        <el-form-item label="匹配示例" v-if="pathExamples.length > 0">
          <div class="path-examples">
            <el-tag
              v-for="example in pathExamples"
              :key="example"
              size="small"
              type="info"
              style="margin-right: 8px; margin-bottom: 4px"
            >
              {{ example }}
            </el-tag>
          </div>
        </el-form-item>
        
        <el-form-item label="优先级" prop="pathConfig.priority">
          <el-input-number
            v-model="form.pathConfig.priority"
            :min="1"
            :max="1000"
            style="width: 150px"
          />
          <span class="form-tip">数字越大优先级越高</span>
        </el-form-item>
        
        <el-form-item label="配置描述" prop="pathConfig.description">
          <el-input
            v-model="form.pathConfig.description"
            type="textarea"
            :rows="2"
            placeholder="请输入配置描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-card>

      <!-- 背景图片配置 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <h4>背景图片配置</h4>
        </template>
        
        <el-form-item label="背景图片" prop="backgroundImage.url" required>
          <div class="image-upload-area">
            <div class="upload-section">
              <el-upload
                ref="uploadRef"
                :action="uploadAction"
                :headers="uploadHeaders"
                :data="uploadData"
                :before-upload="beforeUpload"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
                :on-progress="handleUploadProgress"
                :show-file-list="false"
                accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/ogg"
                drag
              >
                <div class="upload-content">
                  <el-icon class="upload-icon"><upload-filled /></el-icon>
                  <div class="upload-text">
                    <p>点击或拖拽图片到此处上传</p>
                    <p class="upload-tip">支持 JPG、PNG、WebP 格式，建议大小不超过 {{ maxFileSize }}MB</p>
                  </div>
                </div>
              </el-upload>
              
              <div class="upload-options">
                <el-checkbox v-model="generateMobile">
                  自动生成移动端图片
                </el-checkbox>
              </div>
            </div>
            
            <div class="preview-section" v-if="form.backgroundImage.url">
              <div class="image-preview">
                <el-image
                  :src="getImageUrl(form.backgroundImage.url)"
                  fit="cover"
                  style="width: 200px; height: 120px; border-radius: 8px"
                />
                <div class="image-info">
                  <p><strong>文件名:</strong> {{ form.backgroundImage.filename }}</p>
                  <p><strong>尺寸:</strong> {{ form.backgroundImage.dimensions?.width }}x{{ form.backgroundImage.dimensions?.height }}</p>
                  <p><strong>大小:</strong> {{ formatFileSize(form.backgroundImage.size) }}</p>
                  <p><strong>格式:</strong> {{ form.backgroundImage.format?.toUpperCase() }}</p>
                </div>
              </div>
              
              <el-button type="danger" size="small" @click="removeImage">
                <el-icon><delete /></el-icon>
                移除图片
              </el-button>
            </div>
          </div>
          
          <el-progress
            v-if="uploadProgress > 0 && uploadProgress < 100"
            :percentage="uploadProgress"
            :show-text="false"
            style="margin-top: 10px"
          />
        </el-form-item>
      </el-card>

      <!-- 显示设置 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <h4>显示设置</h4>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="透明度">
              <el-slider
                v-model="form.displaySettings.opacity"
                :min="0"
                :max="1"
                :step="0.1"
                show-input
                :format-tooltip="(val) => `${Math.round(val * 100)}%`"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="模糊程度">
              <el-slider
                v-model="form.displaySettings.blur"
                :min="0"
                :max="20"
                show-input
                :format-tooltip="(val) => `${val}px`"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="亮度">
              <el-slider
                v-model="form.displaySettings.brightness"
                :min="0.1"
                :max="2"
                :step="0.1"
                show-input
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="8">
            <el-form-item label="对比度">
              <el-slider
                v-model="form.displaySettings.contrast"
                :min="0.1"
                :max="2"
                :step="0.1"
                show-input
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="8">
            <el-form-item label="饱和度">
              <el-slider
                v-model="form.displaySettings.saturation"
                :min="0"
                :max="2"
                :step="0.1"
                show-input
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 布局设置 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <h4>布局设置</h4>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="背景尺寸">
              <el-select v-model="form.layoutSettings.backgroundSize" style="width: 100%">
                <el-option label="覆盖 (cover)" value="cover" />
                <el-option label="包含 (contain)" value="contain" />
                <el-option label="自动 (auto)" value="auto" />
                <el-option label="拉伸 (100% 100%)" value="100% 100%" />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="背景位置">
              <el-select v-model="form.layoutSettings.backgroundPosition" style="width: 100%">
                <el-option label="居中 (center)" value="center center" />
                <el-option label="顶部居中 (top center)" value="top center" />
                <el-option label="底部居中 (bottom center)" value="bottom center" />
                <el-option label="左上角 (top left)" value="top left" />
                <el-option label="右上角 (top right)" value="top right" />
                <el-option label="左下角 (bottom left)" value="bottom left" />
                <el-option label="右下角 (bottom right)" value="bottom right" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="背景重复">
              <el-select v-model="form.layoutSettings.backgroundRepeat" style="width: 100%">
                <el-option label="不重复 (no-repeat)" value="no-repeat" />
                <el-option label="重复 (repeat)" value="repeat" />
                <el-option label="水平重复 (repeat-x)" value="repeat-x" />
                <el-option label="垂直重复 (repeat-y)" value="repeat-y" />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="背景固定">
              <el-select v-model="form.layoutSettings.backgroundAttachment" style="width: 100%">
                <el-option label="滚动 (scroll)" value="scroll" />
                <el-option label="固定 (fixed)" value="fixed" />
                <el-option label="本地 (local)" value="local" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 其他设置 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <h4>其他设置</h4>
        </template>
        
        <el-form-item label="响应式设置">
          <el-checkbox-group v-model="responsiveDevices">
            <el-checkbox label="desktop">桌面端</el-checkbox>
            <el-checkbox label="tablet">平板端</el-checkbox>
            <el-checkbox label="mobile">移动端</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="激活状态">
          <el-switch v-model="form.isActive" />
          <span class="form-tip">关闭后此配置将不会生效</span>
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input
            v-model="form.notes"
            type="textarea"
            :rows="3"
            placeholder="配置备注信息"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-card>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  QuestionFilled, UploadFilled, Delete
} from '@element-plus/icons-vue';
import {
  createBackgroundConfig,
  updateBackgroundConfig,
  getImageUrl,
  formatFileSize,
  validatePath,
  getPathMatchExamples
} from '@/api/backgrounds';
import { useUserStore } from '@/stores/user';
import configsApi from '@/api/admin/configs';
import api from '@/api/index';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  config: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'success']);

// Store
const userStore = useUserStore();

// 响应式数据
const formRef = ref();
const uploadRef = ref();
const submitting = ref(false);
const uploadProgress = ref(0);
const generateMobile = ref(false);
const pathExamples = ref([]);
const responsiveDevices = ref(['desktop', 'tablet', 'mobile']);

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const isEdit = computed(() => !!props.config);

const uploadAction = computed(() => {
  // 使用统一的API配置
  return `${api.defaults.baseURL}/backgrounds/admin/upload`;
});

const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${userStore.token}`
}));

// 最大文件大小
const maxFileSize = ref(10);

const uploadData = computed(() => ({
  generateMobile: generateMobile.value
}));

// 表单数据
const defaultForm = {
  pathConfig: {
    path: '',
    matchType: 'exact',
    priority: 100,
    description: ''
  },
  backgroundImage: {
    url: '',
    filename: '',
    size: 0,
    dimensions: { width: 0, height: 0 },
    format: '',
    mobileUrl: '',
    tabletUrl: ''
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
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'scroll'
  },
  responsiveSettings: {
    enableOnMobile: true,
    enableOnTablet: true,
    enableOnDesktop: true,
    mobileBreakpoint: 768,
    tabletBreakpoint: 1024
  },
  isActive: true,
  notes: ''
};

const form = reactive(JSON.parse(JSON.stringify(defaultForm)));

// 表单验证规则
const rules = {
  'pathConfig.path': [
    { required: true, message: '请输入路径规则', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        const error = validatePath(value, form.pathConfig.matchType);
        if (error) {
          callback(new Error(error));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ],
  'pathConfig.matchType': [
    { required: true, message: '请选择匹配类型', trigger: 'change' }
  ],
  'backgroundImage.url': [
    { required: true, message: '请上传背景图片', trigger: 'blur' }
  ]
};

// 方法
const handleMatchTypeChange = () => {
  updatePathExamples();
};

const updatePathExamples = () => {
  if (form.pathConfig.path && form.pathConfig.matchType) {
    pathExamples.value = getPathMatchExamples(form.pathConfig.path, form.pathConfig.matchType);
  } else {
    pathExamples.value = [];
  }
};

const beforeUpload = (file) => {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const isValidType = [...validImageTypes, ...validVideoTypes].includes(file.type);
  const isValidSize = file.size / 1024 / 1024 < maxFileSize.value;

  if (!isValidType) {
    ElMessage.error('只支持 JPG、PNG、WebP 图片格式和 MP4、WebM、OGG 视频格式');
    return false;
  }
  if (!isValidSize) {
    ElMessage.error(`文件大小不能超过 ${maxFileSize.value}MB`);
    return false;
  }

  uploadProgress.value = 0;
  return true;
};

const handleUploadProgress = (event) => {
  uploadProgress.value = Math.round((event.loaded / event.total) * 100);
};

const handleUploadSuccess = (response) => {
  uploadProgress.value = 100;
  
  if (response.success) {
    form.backgroundImage = { ...response.data };
    ElMessage.success('图片上传成功');
  } else {
    ElMessage.error(response.message || '图片上传失败');
  }
  
  setTimeout(() => {
    uploadProgress.value = 0;
  }, 1000);
};

const handleUploadError = (error) => {
  uploadProgress.value = 0;
  console.error('图片上传失败:', error);
  ElMessage.error('图片上传失败');
};

const removeImage = () => {
  form.backgroundImage = { ...defaultForm.backgroundImage };
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    submitting.value = true;

    // 处理响应式设置
    form.responsiveSettings.enableOnDesktop = responsiveDevices.value.includes('desktop');
    form.responsiveSettings.enableOnTablet = responsiveDevices.value.includes('tablet');
    form.responsiveSettings.enableOnMobile = responsiveDevices.value.includes('mobile');

    // 调试：打印提交的数据
    //  console.log('提交的表单数据:', JSON.stringify(form, null, 2)); 

    if (isEdit.value) {
      await updateBackgroundConfig(props.config._id, form);
      ElMessage.success('配置更新成功');
    } else {
      await createBackgroundConfig(form);
      ElMessage.success('配置创建成功');
    }

    emit('success');
  } catch (error) {
    console.error('提交失败:', error);
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message);
    } else {
      ElMessage.error('操作失败');
    }
  } finally {
    submitting.value = false;
  }
};

const handleClose = () => {
  dialogVisible.value = false;
  resetForm();
};

const resetForm = () => {
  Object.assign(form, JSON.parse(JSON.stringify(defaultForm)));
  pathExamples.value = [];
  responsiveDevices.value = ['desktop', 'tablet', 'mobile'];
  uploadProgress.value = 0;

  nextTick(() => {
    formRef.value?.clearValidate();
  });
};

// 监听配置变化
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    // 编辑模式：加载现有配置
    Object.assign(form, {
      ...defaultForm,
      ...newConfig
    });

    // 设置响应式设备
    responsiveDevices.value = [];
    if (newConfig.responsiveSettings?.enableOnDesktop) responsiveDevices.value.push('desktop');
    if (newConfig.responsiveSettings?.enableOnTablet) responsiveDevices.value.push('tablet');
    if (newConfig.responsiveSettings?.enableOnMobile) responsiveDevices.value.push('mobile');

    updatePathExamples();
  } else {
    // 新增模式：重置表单
    resetForm();
  }
}, { immediate: true });

// 监听对话框显示状态
watch(dialogVisible, async (visible) => {
  if (!visible) {
    resetForm();
  } else {
    // 对话框打开时获取最大文件大小配置
    try {
      const config = await configsApi.getConfig('upload.maxFileSize');
      if (config.data?.value !== undefined) {
        // 配置值是字节数，转换为MB
        maxFileSize.value = Math.round(config.data.value / (1024 * 1024));
      } else {
        maxFileSize.value = 10; // 默认10MB
      }
    } catch (error) {
      console.error('获取文件大小限制失败:', error);
      maxFileSize.value = 10; // 默认10MB
    }
  }
});
</script>

<style scoped>
.form-section {
  margin-bottom: 20px;
}

.form-section :deep(.el-card__header) {
  padding: 12px 20px;
  background: #f8f9fa;
}

.form-section h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.form-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #999;
}

.path-examples {
  max-width: 400px;
}

.image-upload-area {
  display: flex;
  gap: 20px;
}

.upload-section {
  flex: 1;
}

.upload-content {
  text-align: center;
  padding: 40px 20px;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 0;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.upload-options {
  margin-top: 10px;
}

.preview-section {
  width: 220px;
  flex-shrink: 0;
}

.image-preview {
  margin-bottom: 10px;
}

.image-info {
  margin-top: 10px;
  font-size: 12px;
}

.image-info p {
  margin: 4px 0;
}

.dialog-footer {
  text-align: right;
}
</style>
