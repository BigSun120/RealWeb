<template>
  <div class="global-background-manager">
    <!-- 调试信息 -->
    <div v-if="showDebug" class="debug-info">
      <p>hasBackground: {{ hasBackground }}</p>
      <p>isHomePage: {{ isHomePage }}</p>
      <p>backgroundConfig: {{ !!globalManager.backgroundConfig.value }}</p>
      <p>backgroundImage: {{ globalManager.backgroundImage?.value }}</p>
      <p>backgroundStyles: {{ JSON.stringify(backgroundStyles) }}</p>
    </div>

    <!-- 全局背景层 -->
    <div
      v-if="hasBackground && !isHomePage"
      class="global-background-layer"
      :style="backgroundStyles"
    ></div>

    <!-- 内容插槽 -->
    <div class="content-wrapper">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useGlobalBackgroundManager } from '@/composables/useBackgroundManager';

// 全局背景管理器
const globalManager = useGlobalBackgroundManager();
const route = useRoute();

// 临时调试开关
const showDebug = ref(false);

// 组件挂载时立即加载背景
onMounted(() => {
  // 确保全局管理器已启用
  globalManager.setGlobalEnabled(true);

  // 立即加载当前路径的背景
  if (route.path) {
    globalManager.loadBackgroundConfig(route.path);
  }
});

// 监听路由变化，加载对应的背景配置
watch(() => route.path, (newPath) => {
  if (newPath) {
    globalManager.loadBackgroundConfig(newPath);
  }
}, { immediate: true });

// 计算属性
const isHomePage = computed(() => {
  return route && route.name === 'Home';
});

const hasBackground = computed(() => {
  return globalManager.hasBackground.value && globalManager.isResponsiveEnabled.value;
});

const backgroundStyles = computed(() => {
  if (!hasBackground.value || isHomePage.value) {
    return {};
  }

  const styles = globalManager.backgroundStyles.value;

  return {
    ...styles,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none'
  };
});

// 暴露给父组件
defineExpose({
  globalManager,
  hasBackground,
  isHomePage
});
</script>

<style scoped>
.global-background-manager {
  position: relative;
  min-height: 100vh;
  width: 100%;
}

.global-background-layer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
}

.content-wrapper {
  position: relative;
  z-index: 1;
}

/* 确保背景不会影响内容的交互 */
.global-background-manager:has(.global-background-layer) .content-wrapper {
  background: transparent;
}

/* 调试信息样式 */
.debug-info {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  z-index: 9999;
  font-family: monospace;
}

.debug-info p {
  margin: 2px 0;
}
</style>
