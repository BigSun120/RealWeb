import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getBackgroundByPath, getImageUrl } from '@/api/backgrounds';

// 全局状态
const globalBackgroundConfig = ref(null);
const globalLoading = ref(false);
const globalEnabled = ref(true);
const currentDevice = ref('desktop');

// 设备检测
const detectDevice = () => {
  const width = window.innerWidth;

  if (width < 768) {
    currentDevice.value = 'mobile';
  } else if (width < 1024) {
    currentDevice.value = 'tablet';
  } else {
    currentDevice.value = 'desktop';
  }
};

// 窗口大小变化处理
const handleResize = () => {
  detectDevice();
};

// 初始化设备检测
if (typeof window !== 'undefined') {
  detectDevice();
  window.addEventListener('resize', handleResize);
}

/**
 * 背景管理器 Composable
 * @param {Object} options - 配置选项
 * @param {boolean} options.enabled - 是否启用背景管理
 * @param {string} options.customPath - 自定义路径
 * @param {boolean} options.responsive - 是否启用响应式
 * @param {string} options.forceDevice - 强制设备类型
 * @param {boolean} options.global - 是否使用全局状态
 */
export function useBackgroundManager(options = {}) {
  const {
    enabled = true,
    customPath = null,
    responsive = true,
    forceDevice = null,
    global = false
  } = options;

  // 安全地获取路由，只在组件上下文中使用
  let route = null;
  try {
    route = useRoute();
  } catch (error) {
    // 在插件初始化时，useRoute()会失败，这是正常的
    console.log('[BackgroundManager] useRoute() not available in current context');
  }

  // 本地状态（如果不使用全局状态）
  const localBackgroundConfig = ref(null);
  const localLoading = ref(false);

  // 选择使用全局或本地状态
  const backgroundConfig = global ? globalBackgroundConfig : localBackgroundConfig;
  const loading = global ? globalLoading : localLoading;

  // 计算属性
  const currentPath = computed(() => {
    return customPath || (route && route.path) || '/';
  });

  const deviceType = computed(() => {
    if (forceDevice) return forceDevice;
    return currentDevice.value;
  });

  const hasBackground = computed(() => {
    return enabled && globalEnabled.value && backgroundConfig.value && backgroundConfig.value.backgroundImage?.url;
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

  const isResponsiveEnabled = computed(() => {
    if (!responsive || !backgroundConfig.value?.responsiveSettings) return true;

    const responsiveSettings = backgroundConfig.value.responsiveSettings;

    switch (deviceType.value) {
      case 'mobile':
        return responsiveSettings.enableOnMobile;
      case 'tablet':
        return responsiveSettings.enableOnTablet;
      case 'desktop':
        return responsiveSettings.enableOnDesktop;
      default:
        return true;
    }
  });

  const backgroundStyles = computed(() => {
    if (!hasBackground.value || !isResponsiveEnabled.value) return {};

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
      backgroundImage: `url(${backgroundImage.value})`,
      backgroundSize: layout.backgroundSize || 'cover',
      backgroundPosition: layout.backgroundPosition || 'center center',
      backgroundRepeat: layout.backgroundRepeat || 'no-repeat',
      backgroundAttachment: layout.backgroundAttachment || 'scroll',
      opacity: display.opacity !== undefined ? display.opacity : 1,
      filter: filters.length > 0 ? filters.join(' ') : 'none'
    };
  });

  const cssVariables = computed(() => {
    if (!hasBackground.value || !isResponsiveEnabled.value) return {};

    const styles = backgroundStyles.value;

    return {
      '--bg-image': styles.backgroundImage || 'none',
      '--bg-size': styles.backgroundSize || 'cover',
      '--bg-position': styles.backgroundPosition || 'center center',
      '--bg-repeat': styles.backgroundRepeat || 'no-repeat',
      '--bg-attachment': styles.backgroundAttachment || 'scroll',
      '--bg-opacity': styles.opacity || 1,
      '--bg-filter': styles.filter || 'none'
    };
  });

  // 方法
  const loadBackgroundConfig = async (path = null) => {
    const targetPath = path || currentPath.value;

    if (!enabled || !globalEnabled.value) {
      return;
    }

    loading.value = true;
    try {
      const response = await getBackgroundByPath(targetPath);

      if (response.data.success && response.data.data) {
        backgroundConfig.value = response.data.data;
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

  const clearBackground = () => {
    backgroundConfig.value = null;
  };

  const setGlobalEnabled = (value) => {
    globalEnabled.value = value;
  };

  const applyBackgroundToElement = (element) => {
    if (!element || !hasBackground.value || !isResponsiveEnabled.value) return;

    const styles = backgroundStyles.value;

    Object.entries(styles).forEach(([key, value]) => {
      element.style[key] = value;
    });
  };

  const applyCSSVariables = (element = document.documentElement) => {
    if (!element) return;

    const variables = cssVariables.value;

    Object.entries(variables).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
  };

  const removeCSSVariables = (element = document.documentElement) => {
    if (!element) return;

    const variableNames = [
      '--bg-image',
      '--bg-size',
      '--bg-position',
      '--bg-repeat',
      '--bg-attachment',
      '--bg-opacity',
      '--bg-filter'
    ];

    variableNames.forEach(name => {
      element.style.removeProperty(name);
    });
  };

  // 监听路径变化
  watch(currentPath, (newPath) => {
    if (newPath) {
      loadBackgroundConfig(newPath);
    }
  }, { immediate: true });

  // 监听启用状态变化
  watch(() => enabled && globalEnabled.value, (isEnabled) => {
    if (isEnabled) {
      loadBackgroundConfig();
    } else {
      clearBackground();
    }
  });

  return {
    // 状态
    backgroundConfig: computed(() => backgroundConfig.value),
    loading: computed(() => loading.value),
    hasBackground,
    currentDevice: computed(() => currentDevice.value),
    deviceType,
    isResponsiveEnabled,

    // 样式
    backgroundStyles,
    cssVariables,
    backgroundImage,

    // 方法
    loadBackgroundConfig,
    clearBackground,
    setGlobalEnabled,
    applyBackgroundToElement,
    applyCSSVariables,
    removeCSSVariables,

    // 工具方法
    detectDevice: () => detectDevice()
  };
}

/**
 * 全局背景管理器
 * 用于在应用级别管理背景
 */
export function useGlobalBackgroundManager() {
  return useBackgroundManager({ global: true });
}

/**
 * 页面背景管理器
 * 用于在特定页面管理背景
 */
export function usePageBackgroundManager(options = {}) {
  return useBackgroundManager({ ...options, global: false });
}

/**
 * 首页背景管理器
 * 专门用于首页的背景管理，支持动态/静态切换
 */
export function useHomeBackgroundManager() {
  const route = useRoute();
  const isHomePage = computed(() => route && route.name === 'Home');

  const backgroundManager = useBackgroundManager({
    enabled: isHomePage.value,
    customPath: '/',
    global: false
  });

  // 首页特殊配置
  const homeConfig = computed(() => {
    return backgroundManager.backgroundConfig.value?.homePageConfig;
  });

  const isDynamicMode = computed(() => {
    if (!homeConfig.value) return true;
    return homeConfig.value.defaultMode === 'dynamic';
  });

  const canUserSwitch = computed(() => {
    return homeConfig.value?.allowUserSwitch || false;
  });

  const dynamicOpacity = computed(() => {
    return homeConfig.value?.dynamicOpacity || 0.8;
  });

  return {
    ...backgroundManager,
    isHomePage,
    homeConfig,
    isDynamicMode,
    canUserSwitch,
    dynamicOpacity
  };
}

// 清理函数
export function cleanupBackgroundManager() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
}
