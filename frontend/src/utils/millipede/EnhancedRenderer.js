/**
 * 增强版千足虫渲染器 - 实现最佳视觉效果
 */
export class EnhancedRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 创建离屏画布用于多层渲染
    this.glowCanvas = document.createElement('canvas');
    this.glowCtx = this.glowCanvas.getContext('2d');
    
    this.trailCanvas = document.createElement('canvas');
    this.trailCtx = this.trailCanvas.getContext('2d');
    
    this.setupCanvases();
    
    // 渲染参数
    this.glowIntensity = 0.8;
    this.trailOpacity = 0.1;
    this.bloomRadius = 15;
    this.enableParticles = true;
    this.particles = [];
  }

  setupCanvases() {
    // 设置离屏画布尺寸
    this.glowCanvas.width = this.canvas.width;
    this.glowCanvas.height = this.canvas.height;
    this.trailCanvas.width = this.canvas.width;
    this.trailCanvas.height = this.canvas.height;
    
    // 启用抗锯齿
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.glowCtx.imageSmoothingEnabled = true;
    this.glowCtx.imageSmoothingQuality = 'high';
  }

  render(millipede) {
    // 清空主画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染轨迹层
    this.renderTrails(millipede);
    
    // 渲染发光效果
    this.renderGlow(millipede);
    
    // 渲染主体
    this.renderBody(millipede);
    
    // 渲染粒子效果
    if (this.enableParticles) {
      this.renderParticles(millipede);
    }
    
    // 合成最终效果
    this.compositeEffects();
  }

  renderTrails(millipede) {
    // 轨迹渐隐效果
    this.trailCtx.fillStyle = `rgba(0, 0, 0, ${this.trailOpacity})`;
    this.trailCtx.fillRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
    
    // 绘制当前位置到轨迹画布
    millipede.segments.forEach((segment, index) => {
      const hue = (millipede.hueOffset + millipede.time * 30 + index * 10) % 360;
      const alpha = 1 - index * 0.02;
      
      this.trailCtx.beginPath();
      this.trailCtx.arc(segment.x, segment.y, segment.size * 0.8, 0, Math.PI * 2);
      this.trailCtx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha * 0.3})`;
      this.trailCtx.fill();
    });
  }

  renderGlow(millipede) {
    // 清空发光画布
    this.glowCtx.clearRect(0, 0, this.glowCanvas.width, this.glowCanvas.height);
    
    // 绘制发光效果
    millipede.segments.forEach((segment, index) => {
      const hue = (millipede.hueOffset + millipede.time * 30 + index * 10) % 360;
      
      // 多层发光
      for (let i = 0; i < 3; i++) {
        const radius = segment.size * (2 + i * 0.8);
        const alpha = this.glowIntensity * (0.3 - i * 0.1);
        
        const gradient = this.glowCtx.createRadialGradient(
          segment.x, segment.y, 0,
          segment.x, segment.y, radius
        );
        
        gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
        
        this.glowCtx.beginPath();
        this.glowCtx.arc(segment.x, segment.y, radius, 0, Math.PI * 2);
        this.glowCtx.fillStyle = gradient;
        this.glowCtx.fill();
      }
    });
    
    // 应用模糊效果（简化版bloom）
    this.applyBlur(this.glowCtx, this.bloomRadius);
  }

  renderBody(millipede) {
    this.ctx.save();
    
    // 绘制身体连接线（增强版）
    this.renderEnhancedBody(millipede);
    
    // 绘制节段（增强版）
    this.renderEnhancedSegments(millipede);
    
    // 绘制头发（增强版）
    this.renderEnhancedHair(millipede);
    
    this.ctx.restore();
  }

  renderEnhancedBody(millipede) {
    if (millipede.segments.length < 2) return;
    
    // 创建渐变路径
    const gradient = this.ctx.createLinearGradient(
      millipede.segments[0].x, millipede.segments[0].y,
      millipede.segments[millipede.segments.length - 1].x,
      millipede.segments[millipede.segments.length - 1].y
    );
    
    for (let i = 0; i <= 10; i++) {
      const ratio = i / 10;
      const hue = (millipede.hueOffset + millipede.time * 20 + ratio * 60) % 360;
      gradient.addColorStop(ratio, `hsl(${hue}, 85%, 55%)`);
    }
    
    // 绘制平滑的身体曲线
    this.ctx.beginPath();
    this.ctx.moveTo(millipede.segments[0].x, millipede.segments[0].y);
    
    for (let i = 1; i < millipede.segments.length - 1; i++) {
      const current = millipede.segments[i];
      const next = millipede.segments[i + 1];
      const cpx = (current.x + next.x) / 2;
      const cpy = (current.y + next.y) / 2;
      this.ctx.quadraticCurveTo(current.x, current.y, cpx, cpy);
    }
    
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = millipede.segmentSize * 1.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
  }

  renderEnhancedSegments(millipede) {
    millipede.segments.forEach((segment, index) => {
      const hue = (millipede.hueOffset + millipede.time * 50 + index * 15) % 360;
      const saturation = 70 + Math.sin(millipede.time + index * 0.5) * 20;
      const lightness = 50 + Math.sin(millipede.time * 0.7 + index * 0.3) * 20;
      
      // 主体
      this.ctx.beginPath();
      this.ctx.arc(segment.x, segment.y, segment.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      this.ctx.fill();
      
      // 高光
      const highlightGradient = this.ctx.createRadialGradient(
        segment.x - segment.size * 0.3, segment.y - segment.size * 0.3, 0,
        segment.x, segment.y, segment.size
      );
      highlightGradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.8)`);
      highlightGradient.addColorStop(1, `hsla(${hue}, 100%, 90%, 0)`);
      
      this.ctx.beginPath();
      this.ctx.arc(segment.x, segment.y, segment.size, 0, Math.PI * 2);
      this.ctx.fillStyle = highlightGradient;
      this.ctx.fill();
    });
  }

  renderEnhancedHair(millipede) {
    millipede.hairStrands.forEach((strand, strandIndex) => {
      if (strand.segments.length < 2) return;
      
      const hue = (millipede.hueOffset + millipede.time * 20 + strandIndex * 15) % 360;
      
      // 绘制头发阴影
      this.ctx.save();
      this.ctx.translate(2, 2);
      this.ctx.beginPath();
      this.ctx.moveTo(strand.segments[0].x, strand.segments[0].y);
      
      for (let i = 1; i < strand.segments.length - 1; i++) {
        const current = strand.segments[i];
        const next = strand.segments[i + 1];
        const cpx = (current.x + next.x) / 2;
        const cpy = (current.y + next.y) / 2;
        this.ctx.quadraticCurveTo(current.x, current.y, cpx, cpy);
      }
      
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
      this.ctx.restore();
      
      // 绘制主体头发
      this.ctx.beginPath();
      this.ctx.moveTo(strand.segments[0].x, strand.segments[0].y);
      
      for (let i = 1; i < strand.segments.length - 1; i++) {
        const current = strand.segments[i];
        const next = strand.segments[i + 1];
        const cpx = (current.x + next.x) / 2;
        const cpy = (current.y + next.y) / 2;
        this.ctx.quadraticCurveTo(current.x, current.y, cpx, cpy);
      }
      
      // 渐变头发
      const hairGradient = this.ctx.createLinearGradient(
        strand.segments[0].x, strand.segments[0].y,
        strand.segments[strand.segments.length - 1].x,
        strand.segments[strand.segments.length - 1].y
      );
      hairGradient.addColorStop(0, `hsl(${hue}, 80%, 45%)`);
      hairGradient.addColorStop(1, `hsl(${hue}, 60%, 30%)`);
      
      this.ctx.strokeStyle = hairGradient;
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    });
  }

  renderParticles(millipede) {
    // 生成新粒子
    if (Math.random() < 0.3) {
      const head = millipede.segments[0];
      this.particles.push({
        x: head.x + (Math.random() - 0.5) * 20,
        y: head.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        decay: 0.02,
        size: 2 + Math.random() * 3,
        hue: (millipede.hueOffset + Math.random() * 60) % 360
      });
    }
    
    // 更新和绘制粒子
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.decay;
      particle.vy += 0.1; // 重力
      
      if (particle.life > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.life;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsl(${particle.hue}, 80%, 60%)`;
        this.ctx.fill();
        this.ctx.restore();
        return true;
      }
      return false;
    });
  }

  compositeEffects() {
    // 合成轨迹
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = 0.6;
    this.ctx.drawImage(this.trailCanvas, 0, 0);
    
    // 合成发光
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = this.glowIntensity;
    this.ctx.drawImage(this.glowCanvas, 0, 0);
    
    // 重置合成模式
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1.0;
  }

  applyBlur(ctx, radius) {
    // 简化版模糊效果
    ctx.filter = `blur(${radius}px)`;
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.putImageData(imageData, 0, 0);
    ctx.filter = 'none';
  }

  // 性能控制
  setQuality(level) {
    switch (level) {
      case 'low':
        this.glowIntensity = 0.3;
        this.enableParticles = false;
        this.bloomRadius = 5;
        break;
      case 'medium':
        this.glowIntensity = 0.6;
        this.enableParticles = true;
        this.bloomRadius = 10;
        break;
      case 'high':
        this.glowIntensity = 0.8;
        this.enableParticles = true;
        this.bloomRadius = 15;
        break;
    }
  }
}
