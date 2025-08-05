/**
 * Canvas 2D 赛博朋克背景 - 备选方案
 */
export class Canvas2DBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
    
    // 网格参数
    this.gridSpacing = 60;
    this.lineWidth = 1;
    
    // 赛博朋克颜色
    this.colors = [
      'rgba(0, 255, 255, 0.6)',    // 青色
      'rgba(255, 0, 255, 0.6)',    // 紫色
      'rgba(0, 255, 128, 0.6)',    // 绿色
      'rgba(255, 51, 204, 0.6)'    // 霓虹粉
    ];
    
    console.log('Canvas 2D 背景初始化成功');
  }

  render(time) {
    this.time = time;
    
    try {
      // 清除画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // 设置混合模式
      this.ctx.globalCompositeOperation = 'screen';
      
      // 绘制动态网格
      this.drawGrid();
      
      // 绘制脉动圆圈
      this.drawPulsingCircles();
      
      // 重置混合模式
      this.ctx.globalCompositeOperation = 'source-over';
      
    } catch (error) {
      console.error('Canvas 2D 背景渲染错误:', error);
    }
  }

  drawGrid() {
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2);
    const wave = Math.sin(this.time * 1.5) * 20;
    
    this.ctx.lineWidth = this.lineWidth;
    
    // 绘制垂直线
    for (let x = 0; x < this.canvas.width + this.gridSpacing; x += this.gridSpacing) {
      const colorIndex = Math.floor(x / this.gridSpacing) % this.colors.length;
      this.ctx.strokeStyle = this.colors[colorIndex];
      this.ctx.globalAlpha = pulse * 0.8;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      
      // 添加波浪效果
      for (let y = 0; y <= this.canvas.height; y += 10) {
        const waveOffset = Math.sin((y + this.time * 100) * 0.01) * wave;
        this.ctx.lineTo(x + waveOffset, y);
      }
      
      this.ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y < this.canvas.height + this.gridSpacing; y += this.gridSpacing) {
      const colorIndex = Math.floor(y / this.gridSpacing) % this.colors.length;
      this.ctx.strokeStyle = this.colors[colorIndex];
      this.ctx.globalAlpha = pulse * 0.6;
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      
      // 添加波浪效果
      for (let x = 0; x <= this.canvas.width; x += 10) {
        const waveOffset = Math.sin((x + this.time * 80) * 0.008) * wave * 0.5;
        this.ctx.lineTo(x, y + waveOffset);
      }
      
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  drawPulsingCircles() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 绘制多个脉动圆圈
    for (let i = 0; i < 3; i++) {
      const phase = this.time * 2 + i * Math.PI * 0.6;
      const radius = 50 + i * 80 + Math.sin(phase) * 30;
      const alpha = (Math.sin(phase) + 1) * 0.3;
      
      this.ctx.strokeStyle = this.colors[i % this.colors.length];
      this.ctx.globalAlpha = alpha;
      this.ctx.lineWidth = 2;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  onResize() {
    // Canvas 2D 不需要特殊的尺寸处理
    console.log('Canvas 2D 背景尺寸更新:', this.canvas.width, 'x', this.canvas.height);
  }

  destroy() {
    // Canvas 2D 不需要特殊清理
    console.log('Canvas 2D 背景已清理');
  }
}
