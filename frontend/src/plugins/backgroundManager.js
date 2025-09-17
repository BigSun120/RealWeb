import { useGlobalBackgroundManager } from '@/composables/useBackgroundManager';

/**
 * 背景管理器插件
 * 提供全局背景管理功能
 */
export default {
  install(app, options = {}) {
    const {
      // 是否自动启用
      autoEnable = true,
      // 调试模式
      debug = false
    } = options;

    // 调试日志
    const log = (...args) => {
      if (debug) {
        console.log('[BackgroundManager]', ...args);
      }
    };

    // 延迟初始化全局背景管理器
    let globalManager = null;
    const initGlobalManager = () => {
      if (!globalManager) {
        try {
          globalManager = useGlobalBackgroundManager();
          if (autoEnable) {
            globalManager.setGlobalEnabled(true);
            log('Global background manager enabled');
          }
        } catch (error) {
          log('Failed to initialize global manager:', error.message);
        }
      }
      return globalManager;
    };

    // 全局属性和方法
    app.config.globalProperties.$backgroundManager = {
      // 状态
      get hasBackground() {
        const manager = initGlobalManager();
        return manager ? manager.hasBackground.value : false;
      },
      get loading() {
        const manager = initGlobalManager();
        return manager ? manager.loading.value : false;
      },
      get config() {
        const manager = initGlobalManager();
        return manager ? manager.backgroundConfig.value : null;
      },
      get device() {
        const manager = initGlobalManager();
        return manager ? manager.currentDevice.value : 'desktop';
      },

      // 方法
      load: (path) => {
        const manager = initGlobalManager();
        return manager ? manager.loadBackgroundConfig(path) : Promise.resolve();
      },
      clear: () => {
        const manager = initGlobalManager();
        return manager ? manager.clearBackground() : undefined;
      },
      enable: () => {
        const manager = initGlobalManager();
        return manager ? manager.setGlobalEnabled(true) : undefined;
      },
      disable: () => {
        const manager = initGlobalManager();
        return manager ? manager.setGlobalEnabled(false) : undefined;
      },
      detectDevice: () => {
        const manager = initGlobalManager();
        return manager ? manager.detectDevice() : 'desktop';
      },

      // 调试方法
      debug: (enabled = true) => {
        options.debug = enabled;
        log('Debug mode:', enabled ? 'enabled' : 'disabled');
      }
    };

    // 提供全局组合式函数
    app.provide('backgroundManager', {
      getInstance: initGlobalManager
    });

    log('Background manager plugin installed');
  }
};

/**
 * 背景管理器指令
 * 用于在元素上应用背景
 */
export const vBackground = {
  mounted(el, binding) {
    const { value, modifiers } = binding;

    // 如果提供了配置对象
    if (typeof value === 'object' && value !== null) {
      const styles = value;
      Object.entries(styles).forEach(([key, val]) => {
        el.style[key] = val;
      });
    }

    // 修饰符处理
    if (modifiers.cover) {
      el.style.backgroundSize = 'cover';
    }
    if (modifiers.contain) {
      el.style.backgroundSize = 'contain';
    }
    if (modifiers.center) {
      el.style.backgroundPosition = 'center';
    }
    if (modifiers.fixed) {
      el.style.backgroundAttachment = 'fixed';
    }
    if (modifiers.norepeat) {
      el.style.backgroundRepeat = 'no-repeat';
    }
  },

  updated(el, binding) {
    // 更新时重新应用样式
    this.mounted(el, binding);
  }
};

/**
 * 背景管理器混入
 * 为组件提供背景管理功能
 */
export const backgroundManagerMixin = {
  data() {
    return {
      backgroundManager: null
    };
  },

  created() {
    this.backgroundManager = useGlobalBackgroundManager();
  },

  computed: {
    hasBackground() {
      return this.backgroundManager.hasBackground.value;
    },
    backgroundLoading() {
      return this.backgroundManager.loading.value;
    },
    backgroundStyles() {
      return this.backgroundManager.backgroundStyles.value;
    },
    backgroundCSSVariables() {
      return this.backgroundManager.cssVariables.value;
    }
  },

  methods: {
    loadBackground(path) {
      return this.backgroundManager.loadBackgroundConfig(path);
    },
    clearBackground() {
      this.backgroundManager.clearBackground();
    },
    applyBackgroundToElement(element) {
      this.backgroundManager.applyBackgroundToElement(element);
    }
  }
};

/**
 * 创建背景管理器实例
 * 工厂函数，用于创建自定义配置的背景管理器
 */
export function createBackgroundManager(options = {}) {
  return useGlobalBackgroundManager(options);
}
