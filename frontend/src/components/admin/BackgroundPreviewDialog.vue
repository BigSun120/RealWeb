<template>
  <el-dialog
    v-model="dialogVisible"
    title="背景配置预览"
    width="900px"
    :close-on-click-modal="false"
  >
    <div class="preview-container" v-if="config">
      <!-- 配置信息 -->
      <el-card class="config-info" shadow="never">
        <template #header>
          <h4>配置信息</h4>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="路径规则">
            <el-tag :type="getMatchTypeTagType(config.pathConfig.matchType)" size="small">
              {{ getMatchTypeLabel(config.pathConfig.matchType) }}
            </el-tag>
            <code class="path-text">{{ config.pathConfig.path }}</code>
          </el-descriptions-item>
          
          <el-descriptions-item label="优先级">
            <el-tag size="small">{{ config.pathConfig.priority }}</el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="状态">
            <el-tag :type="config.isActive ? 'success' : 'danger'" size="small">
              {{ config.isActive ? '激活' : '停用' }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="创建时间">
            {{ formatDate(config.createdAt) }}
          </el-descriptions-item>
          
          <el-descriptions-item label="图片信息" v-if="config.backgroundImage?.url">
            <div class="image-info">
              <p>{{ config.backgroundImage.filename }}</p>
              <p>{{ config.backgroundImage.dimensions?.width }}x{{ config.backgroundImage.dimensions?.height }}</p>
              <p>{{ formatFileSize(config.backgroundImage.size) }}</p>
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="响应式支持">
            <div class="responsive-info">
              <el-tag v-if="config.responsiveSettings?.enableOnDesktop" size="small" type="primary">桌面端</el-tag>
              <el-tag v-if="config.responsiveSettings?.enableOnTablet" size="small" type="warning">平板端</el-tag>
              <el-tag v-if="config.responsiveSettings?.enableOnMobile" size="small" type="success">移动端</el-tag>
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="配置描述" :span="2" v-if="config.pathConfig.description">
            {{ config.pathConfig.description }}
          </el-descriptions-item>
          
          <el-descriptions-item label="备注" :span="2" v-if="config.notes">
            {{ config.notes }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>



      <!-- 背景效果预览 -->
      <el-card class="background-preview" shadow="never" v-if="config.backgroundImage?.url">
        <template #header>
          <div class="preview-header">
            <h4>背景效果预览</h4>
            <div class="device-selector">
              <el-radio-group v-model="previewDevice" size="small">
                <el-radio-button label="desktop">桌面端</el-radio-button>
                <el-radio-button label="tablet">平板端</el-radio-button>
                <el-radio-button label="mobile">移动端</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </template>
        
        <div class="preview-area">
          <div 
            class="preview-viewport"
            :class="previewDevice"
            :style="previewStyles"
          >
            <div class="preview-content">
              <h3>示例页面内容</h3>
              <p>这是一个示例页面，用于预览背景效果。</p>
              <p>背景图片会根据配置的参数进行显示。</p>
              
              <div class="sample-card">
                <h4>示例卡片</h4>
                <p>这是页面中的内容区域，可以看到背景图片的效果。</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 参数显示 -->
        <div class="params-display">
          <h5>当前显示参数:</h5>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="param-item">
                <label>透明度:</label>
                <span>{{ Math.round(config.displaySettings.opacity * 100) }}%</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <label>模糊:</label>
                <span>{{ config.displaySettings.blur }}px</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <label>亮度:</label>
                <span>{{ config.displaySettings.brightness }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <label>对比度:</label>
                <span>{{ config.displaySettings.contrast }}</span>
              </div>
            </el-col>
          </el-row>
          
          <el-row :gutter="20" style="margin-top: 10px">
            <el-col :span="6">
              <div class="param-item">
                <label>饱和度:</label>
                <span>{{ config.displaySettings.saturation }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <label>尺寸:</label>
                <span>{{ config.layoutSettings.backgroundSize }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <label>位置:</label>
                <span>{{ config.layoutSettings.backgroundPosition }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="param-item">
                <label>重复:</label>
                <span>{{ config.layoutSettings.backgroundRepeat }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="editConfig">编辑配置</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  getImageUrl,
  formatFileSize,
  getMatchTypeLabel
} from '@/api/backgrounds';

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
const emit = defineEmits(['update:modelValue', 'edit']);

// 响应式数据
const previewDevice = ref('desktop');
const testPath = ref('');
const testResult = ref(null);

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const previewStyles = computed(() => {
  if (!props.config?.backgroundImage?.url) return {};

  const config = props.config;
  const imageUrl = getImageUrl(config.backgroundImage.url);

  // 根据设备选择合适的图片
  let backgroundImage = imageUrl;
  if (previewDevice.value === 'mobile' && config.backgroundImage.mobileUrl) {
    backgroundImage = getImageUrl(config.backgroundImage.mobileUrl);
  } else if (previewDevice.value === 'tablet' && config.backgroundImage.tabletUrl) {
    backgroundImage = getImageUrl(config.backgroundImage.tabletUrl);
  }

  const filters = [];
  if (config.displaySettings.blur > 0) {
    filters.push(`blur(${config.displaySettings.blur}px)`);
  }
  if (config.displaySettings.brightness !== 1) {
    filters.push(`brightness(${config.displaySettings.brightness})`);
  }
  if (config.displaySettings.contrast !== 1) {
    filters.push(`contrast(${config.displaySettings.contrast})`);
  }
  if (config.displaySettings.saturation !== 1) {
    filters.push(`saturate(${config.displaySettings.saturation})`);
  }

  return {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: config.layoutSettings.backgroundSize,
    backgroundPosition: config.layoutSettings.backgroundPosition,
    backgroundRepeat: config.layoutSettings.backgroundRepeat,
    backgroundAttachment: config.layoutSettings.backgroundAttachment,
    opacity: config.displaySettings.opacity,
    filter: filters.length > 0 ? filters.join(' ') : 'none'
  };
});

// 方法

const editConfig = () => {
  emit('edit', props.config);
  dialogVisible.value = false;
};

const getMatchTypeTagType = (matchType) => {
  const types = {
    exact: 'success',
    prefix: 'primary',
    wildcard: 'warning',
    regex: 'danger'
  };
  return types[matchType] || 'info';
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN');
};

// 监听对话框显示状态
watch(dialogVisible, (visible) => {
  if (visible) {
    testPath.value = '';
    testResult.value = null;
    previewDevice.value = 'desktop';
  }
});
</script>

<style scoped>
.preview-container {
  max-height: 70vh;
  overflow-y: auto;
}

.config-info,
.path-test,
.background-preview {
  margin-bottom: 20px;
}

.config-info :deep(.el-card__header),
.path-test :deep(.el-card__header),
.background-preview :deep(.el-card__header) {
  padding: 12px 20px;
  background: #f8f9fa;
}

.config-info h4,
.path-test h4,
.background-preview h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.path-text {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  margin-left: 8px;
}

.image-info p {
  margin: 2px 0;
  font-size: 12px;
}

.responsive-info .el-tag {
  margin-right: 4px;
}

.test-input {
  margin-bottom: 15px;
}

.test-result {
  margin-bottom: 15px;
}

.match-examples h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-area {
  margin-bottom: 20px;
}

.preview-viewport {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.preview-viewport.desktop {
  width: 100%;
  height: 400px;
}

.preview-viewport.tablet {
  width: 600px;
  height: 400px;
  margin: 0 auto;
}

.preview-viewport.mobile {
  width: 320px;
  height: 400px;
  margin: 0 auto;
}

.preview-content {
  position: relative;
  z-index: 1;
  padding: 30px;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
}

.preview-content h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.preview-content p {
  margin: 0 0 15px 0;
  color: #666;
  line-height: 1.6;
}

.sample-card {
  background: rgba(255, 255, 255, 0.8);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.sample-card h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.sample-card p {
  margin: 0;
  color: #666;
}

.params-display h5 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #666;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
}

.param-item label {
  font-weight: 500;
  color: #666;
}

.param-item span {
  color: #333;
}

.dialog-footer {
  text-align: right;
}
</style>
