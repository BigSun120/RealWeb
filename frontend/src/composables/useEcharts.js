import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

/**
 * 简化 ECharts 生命周期管理，提供懒初始化与响应式尺寸处理。
 * @param {Ref<HTMLElement | null>} elRef 挂载节点引用
 */
export function useEcharts(elRef) {
  const chartRef = ref(null);

  const initChart = () => {
    if (!elRef.value) return;
    dispose();
    chartRef.value = echarts.init(elRef.value);
  };

  const dispose = () => {
    if (chartRef.value) {
      chartRef.value.dispose();
      chartRef.value = null;
    }
  };

  const setOption = option => {
    if (!chartRef.value) {
      initChart();
    }
    chartRef.value?.setOption(option, true);
  };

  const resize = () => {
    chartRef.value?.resize();
  };

  onMounted(async () => {
    await nextTick();
    initChart();
    window.addEventListener('resize', resize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize);
    dispose();
  });

  watch(
    () => elRef.value,
    async el => {
      if (!el) {
        dispose();
        return;
      }
      await nextTick();
      initChart();
    }
  );

  return {
    chartInstance: chartRef,
    setOption,
    resize,
    dispose
  };
}
