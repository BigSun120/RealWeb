<template>
  <div 
    class="background-manager"
    :class="{ 'has-background': hasBackground }"
    :style="backgroundStyles"
  >
    <!-- 背景层 -->
    <div 
      v-if="hasBackground"
      class="background-layer"
      :style="backgroundLayerStyles"
    ></div>
    
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

const backgroundImage = computed(() => {
  if (!backgroundConfig.value?.backgroundImage) return null;
  
  const config = backgroundConfig.value.backgroundImage;
  
  // 根据设备类型选择合适的图片
  switch (deviceType.value) {
    case 'mobile':
      return config.mobileUrl ? getImageUrl(config.mobileUrl) : getImageUrl(config.url);
    case 'tablet':
      return config.tabletUrl ? getImageUrl(config.tabletUrl) : getImageUrl(config.url);
    default:
      return getImageUrl(config.url);
  }
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
  
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: layout.zIndex || -1,
    backgroundImage: `url(${backgroundImage.value})`,
    backgroundSize: layout.backgroundSize || 'cover',
    backgroundPosition: layout.backgroundPosition || 'center center',
    backgroundRepeat: layout.backgroundRepeat || 'no-repeat',
    backgroundAttachment: layout.backgroundAttachment || 'scroll',
    opacity: display.opacity !== undefined ? display.opacity : 1,
    filter: filters.length > 0 ? filters.join(' ') : 'none',
    pointerEvents: 'none'
  };
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
