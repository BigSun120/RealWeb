<template>
  <div class="millipede-background" ref="container">
    <!-- CSS星空背景 - 底层 -->
    <StarfieldCSS :enabled="!prefersReducedMotion" />

    <!-- 千足虫Canvas (WebGL) - 上层 -->
    <canvas
      ref="millipedeCanvas"
      class="millipede-canvas"
      :class="{ 'reduced-motion': prefersReducedMotion }"
    ></canvas>

    <!-- WebGL 不支持时的降级提示 -->
    <div v-if="!webglSupported" class="webgl-fallback">
      <p>您的浏览器不支持 WebGL，千足虫效果已降级为基础版本</p>
    </div>

    <!-- 控制按钮 (开发模式) -->
    <button
      v-if="showControls && isDev"
      class="control-toggle-btn"
      @click="showControlPanel = !showControlPanel"
      :title="showControlPanel ? '隐藏控制面板' : '显示控制面板'"
    >
      ⚙️
    </button>

    <!-- 性能控制面板 (开发模式) -->
    <div
      v-if="showControls && isDev && showControlPanel"
      class="performance-controls"
      @click.stop
    >
      <div class="control-header">
        <h4>WebGL 千足虫控制面板</h4>
        <button class="close-btn" @click="showControlPanel = false">×</button>
      </div>

      <div class="control-group">
        <label>千足虫数量: {{ millipedeCount }}</label>
        <input
          type="range"
          min="1"
          max="5"
          v-model="millipedeCount"
          @input="updateCount"
        />
      </div>

      <div class="control-group">
        <label>渲染质量:</label>
        <select v-model="renderQuality" @change="updateQuality">
          <option value="low">低质量</option>
          <option value="medium">中等质量</option>
          <option value="high">高质量</option>
        </select>
      </div>

      <div class="control-group">
        <button @click="toggleInteraction" class="toggle-btn">
          {{ interactionEnabled ? '禁用' : '启用' }}鼠标交互
        </button>
      </div>

      <div class="control-group">
        <label>粒子效果:</label>
        <input
          type="checkbox"
          v-model="particlesEnabled"
          @change="updateParticles"
        />
      </div>

      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">FPS:</span>
          <span class="stat-value" :class="{
            'good': fps >= 50,
            'fair': fps >= 30 && fps < 50,
            'poor': fps < 30
          }">{{ fps }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">WebGL:</span>
          <span class="stat-value">{{ webglSupported ? '支持' : '不支持' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import StarfieldCSS from './StarfieldCSS.vue';

export default {
  name: 'MillipedeBackground',
  components: {
    StarfieldCSS
  },
  props: {
    enabled: {
      type: Boolean,
      default: true
    },
    count: {
      type: Number,
      default: 5 // 增加到5个千足虫
    },
    showControls: {
      type: Boolean,
      default: false
    }
  },

  setup(props) {
    const container = ref(null);
    const millipedeCanvas = ref(null);
    const webglRenderer = ref(null);

    // 响应式数据
    const millipedeCount = ref(props.count);
    const renderQuality = ref('medium');
    const interactionEnabled = ref(true);
    const particlesEnabled = ref(true);
    const fps = ref(60);
    const webglSupported = ref(false);
    const prefersReducedMotion = ref(false);
    const showControlPanel = ref(false);

    // 环境检测
    const isDev = process.env.NODE_ENV === 'development';

    // 检测WebGL支持
    const checkWebGLSupport = () => {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        webglSupported.value = !!gl;
        return webglSupported.value;
      } catch (e) {
        webglSupported.value = false;
        return false;
      }
    };

    // 检测用户偏好
    const checkMotionPreference = () => {
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotion.value = mediaQuery.matches;

        mediaQuery.addEventListener('change', (e) => {
          prefersReducedMotion.value = e.matches;
          if (e.matches && webglRenderer.value) {
            webglRenderer.value.pause();
          } else if (webglRenderer.value) {
            webglRenderer.value.resume();
          }
        });
      }
    };



    // 初始化WebGL千足虫系统
    const initMillipedes = async () => {
      if (!props.enabled || prefersReducedMotion.value) {
        return;
      }

      await nextTick();

      if (!millipedeCanvas.value) {
        console.warn('Millipede canvas element not found');
        return;
      }

      // 检测WebGL支持
      if (!checkWebGLSupport()) {
        console.warn('WebGL not supported, falling back to Canvas 2D');
        return;
      }

      try {
        // 设置Canvas尺寸
        const rect = container.value.getBoundingClientRect();
        millipedeCanvas.value.width = rect.width;
        millipedeCanvas.value.height = rect.height;

        console.log('千足虫Canvas尺寸:', rect.width, 'x', rect.height);

        // 使用千足虫WebGL渲染器（不包含背景）
        const { MillipedeWebGLRenderer } = await import('@/utils/millipede/MillipedeRenderer.js');

        // console.log('创建千足虫渲染器，禁用背景...');
        webglRenderer.value = new MillipedeWebGLRenderer(millipedeCanvas.value, {
          count: millipedeCount.value,
          segmentCount: 50,
          segmentSpacing: 12,
          segmentSize: 15,
          disableBackground: true // 禁用内置背景
        });
        // console.log('千足虫渲染器创建成功，背景状态:', webglRenderer.value.backgroundType);

        // 启动渲染
        webglRenderer.value.start();

        // 启动性能监控
        startPerformanceMonitoring();

        // console.log('千足虫WebGL渲染器启动成功');

      } catch (error) {
        console.error('Failed to initialize millipede WebGL renderer:', error);
        webglSupported.value = false;
      }
    };

    // 性能监控
    const startPerformanceMonitoring = () => {
      const updateStats = () => {
        if (webglRenderer.value) {
          const stats = webglRenderer.value.getStats();
          fps.value = Math.round(stats.fps);

          // 自动质量调整
          if (stats.fps < 30 && renderQuality.value === 'high') {
            renderQuality.value = 'medium';
            webglRenderer.value.setQuality('medium');
          } else if (stats.fps < 20 && renderQuality.value === 'medium') {
            renderQuality.value = 'low';
            webglRenderer.value.setQuality('low');
          }
        }

        if (webglRenderer.value?.isRunning) {
          setTimeout(updateStats, 1000);
        }
      };

      setTimeout(updateStats, 1000);
    };

    // 控制方法
    const updateCount = (event) => {
      const count = parseInt(event.target.value);
      millipedeCount.value = count;
      if (webglRenderer.value) {
        webglRenderer.value.setCount(count);
      }
    };

    const updateQuality = () => {
      if (webglRenderer.value) {
        webglRenderer.value.setQuality(renderQuality.value);
      }
    };

    const updateParticles = () => {
      if (webglRenderer.value) {
        webglRenderer.value.setParticlesEnabled(particlesEnabled.value);
      }
    };

    const toggleInteraction = () => {
      interactionEnabled.value = !interactionEnabled.value;
      if (webglRenderer.value) {
        webglRenderer.value.setInteractionEnabled(interactionEnabled.value);
      }
    };

    // 清理
    const cleanup = () => {
      if (webglRenderer.value) {
        webglRenderer.value.destroy();
        webglRenderer.value = null;
      }
    };

    // 生命周期
    onMounted(() => {
      checkMotionPreference();
      initMillipedes();
    });

    onUnmounted(() => {
      cleanup();
    });

    return {
      container,
      millipedeCanvas,
      millipedeCount,
      renderQuality,
      interactionEnabled,
      particlesEnabled,
      fps,
      webglSupported,
      prefersReducedMotion,
      showControlPanel,
      isDev,
      updateCount,
      updateQuality,
      updateParticles,
      toggleInteraction
    };
  }
};
</script>

<style scoped>
.millipede-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

/* 千足虫Canvas */
.millipede-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  z-index: 2;
  pointer-events: none; /* 避免干扰页面交互 */
}

.millipede-canvas.reduced-motion {
  display: none;
}

.control-toggle-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 16px;
  cursor: pointer;
  z-index: 9999; /* 提高z-index确保在最上层 */
  pointer-events: auto;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.control-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.performance-controls {
  position: fixed;
  top: 70px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0;
  border-radius: 12px;
  font-size: 12px;
  z-index: 9998; /* 提高z-index但低于按钮 */
  pointer-events: auto;
  min-width: 250px;
  max-width: 300px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.control-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-group {
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.control-group:last-of-type {
  border-bottom: none;
}

.control-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #e2e8f0;
}

.control-group input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-btn {
  width: 100%;
  padding: 8px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.toggle-btn:hover {
  background: #2563eb;
}

.stats {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0 0 12px 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  font-weight: 500;
  color: #94a3b8;
}

.stat-value {
  font-weight: 600;
  color: #e2e8f0;
}

.stat-value.good {
  color: #10b981;
}

.stat-value.fair {
  color: #f59e0b;
}

.stat-value.poor {
  color: #ef4444;
}

.fallback-background {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 51, 234, 0.1) 25%,
    rgba(236, 72, 153, 0.1) 50%,
    rgba(34, 197, 94, 0.1) 75%,
    rgba(251, 191, 36, 0.1) 100%);
  animation: gradientShift 10s ease-in-out infinite;
}

.fallback-pattern {
  width: 100%;
  height: 100%;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%);
  animation: patternMove 20s linear infinite;
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes patternMove {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(-50px, -50px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .millipede-canvas {
    display: none;
  }

  .fallback-background,
  .fallback-pattern {
    animation: none;
  }
}

@media (max-width: 768px) {
  .control-toggle-btn {
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .performance-controls {
    top: 55px;
    right: 10px;
    min-width: 220px;
    font-size: 11px;
  }

  .control-header h4 {
    font-size: 13px;
  }

  .control-group {
    padding: 12px;
  }
}
</style>
