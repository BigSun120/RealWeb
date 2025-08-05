/**
 * 性能监控器 - 监控动画性能并提供优化建议
 */
export class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameStartTime = 0;
    this.frameTimes = [];
    this.maxFrameHistory = 60; // 保存最近60帧的数据
    this.fps = 60;
    this.averageFrameTime = 16.67; // 60fps对应的帧时间
  }

  startFrame() {
    this.frameStartTime = performance.now();
  }

  endFrame() {
    const currentTime = performance.now();
    const frameTime = currentTime - this.frameStartTime;
    
    // 记录帧时间
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameHistory) {
      this.frameTimes.shift();
    }
    
    this.frameCount++;
    
    // 每秒更新一次FPS
    if (currentTime - this.lastTime >= 1000) {
      this.calculateFPS(currentTime);
      this.lastTime = currentTime;
      this.frameCount = 0;
    }
  }

  calculateFPS(currentTime) {
    const deltaTime = currentTime - this.lastTime;
    this.fps = Math.round((this.frameCount * 1000) / deltaTime);
    
    // 计算平均帧时间
    if (this.frameTimes.length > 0) {
      const sum = this.frameTimes.reduce((a, b) => a + b, 0);
      this.averageFrameTime = sum / this.frameTimes.length;
    }
  }

  getFPS() {
    return this.fps;
  }

  getAverageFrameTime() {
    return this.averageFrameTime;
  }

  isPerformanceGood() {
    return this.fps >= 30;
  }

  isPerformanceExcellent() {
    return this.fps >= 55;
  }

  getPerformanceLevel() {
    if (this.fps >= 55) return 'excellent';
    if (this.fps >= 45) return 'good';
    if (this.fps >= 30) return 'fair';
    return 'poor';
  }

  getOptimizationSuggestions() {
    const suggestions = [];
    
    if (this.fps < 30) {
      suggestions.push('Consider reducing the number of millipedes');
      suggestions.push('Disable mouse interaction for better performance');
      suggestions.push('Increase background opacity to reduce trail effects');
    }
    
    if (this.averageFrameTime > 20) {
      suggestions.push('Frame time is high, consider simplifying animations');
    }
    
    return suggestions;
  }

  reset() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameTimes = [];
    this.fps = 60;
    this.averageFrameTime = 16.67;
  }
}
