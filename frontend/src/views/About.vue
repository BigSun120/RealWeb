<template>
  <div class="about-container">
    <!-- 切换开关 -->
    <div class="view-switch">
      <label class="switch">
        <input type="checkbox" v-model="showCreativeView">
        <span class="slider"></span>
      </label>
      <span class="switch-label">
        {{ showCreativeView ? '切换为常规版' : '切换为修真版' }}
      </span>
    </div>

    <!-- 条件渲染组件 -->
    <div v-if="showCreativeView">
      <AboutCreative />
    </div>
    <div v-else>
      <AboutProfessional />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AboutCreative from '@/components/AboutCreative.vue';
import AboutProfessional from '@/components/AboutProfessional.vue';

// 控制显示哪个视图的响应式变量，默认显示常规版
const showCreativeView = ref(false);
</script>

<style scoped>
.about-container {
  position: relative;
}

.view-switch {
  position: fixed;
  top: 100px;
  right: 30px;
  z-index: 9999;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
}

.switch-label {
  margin-left: 10px;
  font-size: 14px;
  font-weight: bold;
}

/* 经典的开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(22px);
}
</style>