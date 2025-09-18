<template>
  <div 
    class="background-manager"
    :class="{ 'has-background': hasBackground }"
    :style="backgroundStyles"
  >
    <!-- 背景层 -->
    <div v-if="hasBackground" class="background-layer">
      <!-- 视频背景 -->
      <video
        v-if="isVideoBackground"
        class="background-video"
        :src="backgroundUrl"
        :style="backgroundLayerStyles"
        autoplay
        muted
        loop
        playsinline
      ></video>

      <!-- 图片背景 -->
      <div
        v-else
        class="background-image"
        :style="backgroundLayerStyles"
      ></div>
    </div>
    
    <!-- 内容插槽 -->
    <div class="content-layer">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getBackgroundByPath, getImageUrl } from '@/api/backgrounds';

// Props
const props = defineProps({
  // 是否启用背景管理
  enabled: {
    type: Boolean,
    default: true
  },
  // 自定义路径（如果不提供则使用当前路由路径）
  customPath: {
    type: String,
    default: null
  },
  // 是否启用响应式
  responsive: {
    type: Boolean,
    default: true
  },
  // 强制设备类型
  forceDevice: {
    type: String,
    default: null,
    validator: (value) => !value || ['desktop', 'tablet', 'mobile'].includes(value)
  }
});

// 响应式数据
const route = useRoute();
const backgroundConfig = ref(null);
const loading = ref(false);
const currentDevice = ref('desktop');
const resizeObserver = ref(null);

// 计算属性
const currentPath = computed(() => {
  return props.customPath || (route && route.path) || '/';
});

const hasBackground = computed(() => {
  return props.enabled && backgroundConfig.value && backgroundConfig.value.backgroundImage?.url;
});

const deviceType = computed(() => {
  if (props.forceDevice) return props.forceDevice;
  return currentDevice.value;
});

// 判断是否为视频背景
const isVideoBackground = computed(() => {
  if (!backgroundConfig.value?.backgroundImage) return false;
  const config = backgroundConfig.value.backgroundImage;
  return config.type === 'video' || (config.mimetype && config.mimetype.startsWith('video/'));
});

// 获取背景URL（图片或视频）
const backgroundUrl = computed(() => {
  if (!backgroundConfig.value?.backgroundImage) return null;

  const config = backgroundConfig.value.backgroundImage;

  // 根据设备类型选择合适的文件
  switch (deviceType.value) {
    case 'mobile':
      return config.mobileUrl ? getImageUrl(config.mobileUrl) : getImageUrl(config.url);
    case 'tablet':
      return config.tabletUrl ? getImageUrl(config.tabletUrl) : getImageUrl(config.url);
    default:
      return getImageUrl(config.url);
  }
});

// 保持向后兼容的backgroundImage计算属性
const backgroundImage = computed(() => {
  return isVideoBackground.value ? null : backgroundUrl.value;
});

const backgroundStyles = computed(() => {
  if (!hasBackground.value) return {};
  
  const config = backgroundConfig.value;
  const styles = {
    position: 'relative',
    minHeight: '100vh'
  };
  
  // 检查响应式设置
  if (props.responsive && config.responsiveSettings) {
    const responsive = config.responsiveSettings;
    
    switch (deviceType.value) {
      case 'mobile':
        if (!responsive.enableOnMobile) return {};
        break;
      case 'tablet':
        if (!responsive.enableOnTablet) return {};
        break;
      case 'desktop':
        if (!responsive.enableOnDesktop) return {};
        break;
    }
  }
  
  return styles;
});

const backgroundLayerStyles = computed(() => {
  if (!hasBackground.value) return {};
  
  const config = backgroundConfig.value;
  const display = config.displaySettings || {};
  const layout = config.layoutSettings || {};
  
  const filters = [];
  if (display.blur > 0) {
    filters.push(`blur(${display.blur}px)`);
  }
  if (display.brightness !== 1) {
    filters.push(`brightness(${display.brightness})`);
  }
  if (display.contrast !== 1) {
    filters.push(`contrast(${display.contrast})`);
  }
  if (display.saturation !== 1) {
    filters.push(`saturate(${display.saturation})`);
  }
  
  const baseStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: layout.zIndex || -1,
    opacity: display.opacity !== undefined ? display.opacity : 1,
    filter: filters.length > 0 ? filters.join(' ') : 'none',
    pointerEvents: 'none'
  };

  // 对于图片背景，添加background相关样式
  if (!isVideoBackground.value && backgroundImage.value) {
    baseStyles.backgroundImage = `url(${backgroundImage.value})`;
    baseStyles.backgroundSize = layout.backgroundSize || 'cover';
    baseStyles.backgroundPosition = layout.backgroundPosition || 'center center';
    baseStyles.backgroundRepeat = layout.backgroundRepeat || 'no-repeat';
    baseStyles.backgroundAttachment = layout.backgroundAttachment || 'scroll';
  }

  // 对于视频背景，添加视频相关样式
  if (isVideoBackground.value) {
    baseStyles.width = '100%';
    baseStyles.height = '100%';
    baseStyles.objectFit = layout.backgroundSize === 'contain' ? 'contain' : 'cover';
  }

  return baseStyles;
});

// 方法
const detectDevice = () => {
  if (!props.responsive) return;
  
  const width = window.innerWidth;
  
  // 使用配置中的断点或默认值
  const mobileBreakpoint = backgroundConfig.value?.responsiveSettings?.mobileBreakpoint || 768;
  const tabletBreakpoint = backgroundConfig.value?.responsiveSettings?.tabletBreakpoint || 1024;
  
  if (width < mobileBreakpoint) {
    currentDevice.value = 'mobile';
  } else if (width < tabletBreakpoint) {
    currentDevice.value = 'tablet';
  } else {
    currentDevice.value = 'desktop';
  }
};

const loadBackgroundConfig = async () => {
  if (!props.enabled) return;
  
  loading.value = true;
  try {
    const response = await getBackgroundByPath(currentPath.value);
    
    if (response.data.success && response.data.data) {
      backgroundConfig.value = response.data.data;
      
      // 检测设备类型
      detectDevice();
    } else {
      backgroundConfig.value = null;
    }
  } catch (error) {
    console.error('加载背景配置失败:', error);
    backgroundConfig.value = null;
  } finally {
    loading.value = false;
  }
};

const handleResize = () => {
  detectDevice();
};

const setupResizeObserver = () => {
  if (!props.responsive || !window.ResizeObserver) return;
  
  resizeObserver.value = new ResizeObserver(handleResize);
  resizeObserver.value.observe(document.body);
};

const cleanupResizeObserver = () => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }
};

// 生命周期
onMounted(() => {
  loadBackgroundConfig();
  
  if (props.responsive) {
    window.addEventListener('resize', handleResize);
    setupResizeObserver();
  }
});

onUnmounted(() => {
  if (props.responsive) {
    window.removeEventListener('resize', handleResize);
    cleanupResizeObserver();
  }
});

// 监听路径变化
watch(currentPath, () => {
  loadBackgroundConfig();
});

// 监听启用状态变化
watch(() => props.enabled, (enabled) => {
  if (enabled) {
    loadBackgroundConfig();
  } else {
    backgroundConfig.value = null;
  }
});

// 暴露方法给父组件
defineExpose({
  loadBackgroundConfig,
  backgroundConfig: computed(() => backgroundConfig.value),
  hasBackground,
  currentDevice: computed(() => currentDevice.value),
  loading: computed(() => loading.value)
});
</script>

<style scoped>
.background-manager {
  position: relative;
  width: 100%;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.background-video {
  position: absolute;
  top: 50%;
  left: 50%;
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  transform: translate(-50%, -50%);
  z-index: -1;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}

.content-layer {
  position: relative;
  z-index: 1;
}

/* 确保背景不会影响内容的交互 */
.has-background .content-layer {
  background: transparent;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .background-manager {
    min-height: 100vh;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .background-manager {
    min-height: 100vh;
  }
}

@media (min-width: 1025px) {
  .background-manager {
    min-height: 100vh;
  }
}
</style>
