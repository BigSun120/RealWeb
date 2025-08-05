/**
 * 千足虫实体类 - 单个千足虫的完整实现
 */
export class MillipedeEntity {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      segmentCount: options.segmentCount || 50,
      segmentSpacing: options.segmentSpacing || 12, // 增加间距
      segmentSize: options.segmentSize || 15, // 增大尺寸
      hairCount: options.hairCount || 8,
      speed: options.speed || 2.0, // 稍微加快速度
      ...options
    };

    // 物理属性
    this.position = {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height
    };
    this.velocity = { x: 0, y: 0 };
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.time = Math.random() * 1000;

    // 身体系统
    this.segments = [];
    this.positionHistory = [];
    this.maxHistoryLength = this.options.segmentCount * this.options.segmentSpacing;

    // 赛博朋克颜色系统
    this.cyberpunkHues = [180, 300, 120, 330]; // 青色、紫色、绿色、粉色
    this.baseHue = this.cyberpunkHues[Math.floor(Math.random() * this.cyberpunkHues.length)];
    this.colorShiftSpeed = 0.3;
    this.movementColorInfluence = 1.5;

    // 数学美学参数
    this.waveAmplitude = 50; // 增大波浪振幅
    this.waveFrequency = 0.02; // 波浪频率
    this.spiralTightness = 0.15; // 增加螺旋效果
    this.flowSmoothness = 0.95; // 流动平滑度

    // 粒子系统
    this.particles = [];
    this.maxParticles = 200; // 增加粒子数量

    // 交互
    this.mousePosition = { x: 0, y: 0 };
    this.avoidanceRadius = 100;

    this.init();
  }

  init() {
    this.createSegments();
    this.initializePositionHistory();
  }

  createSegments() {
    // 创建身体节段
    for (let i = 0; i < this.options.segmentCount; i++) {
      this.segments.push({
        x: this.position.x - i * this.options.segmentSpacing,
        y: this.position.y,
        size: this.options.segmentSize * (1 - i * 0.01), // 逐渐变小
        hue: (this.baseHue + i * 5) % 360
      });
    }
  }

  createLegs() {
    // 为每个身体节段创建腿部
    for (let segmentIndex = 0; segmentIndex < this.options.segmentCount; segmentIndex++) {
      const segmentLegs = [];

      // 每个节段创建4条腿（左右各2条）
      for (let legIndex = 0; legIndex < this.legsPerSegment; legIndex++) {
        const isLeft = legIndex < this.legsPerSegment / 2;
        const legPosition = legIndex % (this.legsPerSegment / 2); // 0或1

        const leg = {
          segments: [],
          segmentCount: 6, // 腿部节段数（更长）
          restLength: 8, // 节段间距离（更长）
          stiffness: 0.2, // 更柔软
          damping: 0.92,
          side: isLeft ? -1 : 1, // 左侧-1，右侧1
          position: legPosition, // 在该侧的位置（前后）
          baseAngle: isLeft ? Math.PI * 0.7 : Math.PI * 0.3, // 基础角度
          segmentIndex: segmentIndex,
          walkPhase: (segmentIndex * 0.3 + legIndex * 0.5) % (Math.PI * 2) // 行走相位
        };

        // 初始化腿部节段
        for (let j = 0; j < leg.segmentCount; j++) {
          leg.segments.push({
            x: this.position.x,
            y: this.position.y,
            oldX: this.position.x,
            oldY: this.position.y,
            pinned: j === 0 // 第一个节段固定在身体上
          });
        }

        segmentLegs.push(leg);
      }

      this.legs.push(segmentLegs);
    }
  }

  initializePositionHistory() {
    // 填充初始位置历史
    for (let i = 0; i < this.maxHistoryLength; i++) {
      this.positionHistory.push({
        x: this.position.x,
        y: this.position.y,
        time: this.time
      });
    }
  }

  update(deltaTime) {
    this.time += deltaTime;

    this.updateMovement(deltaTime);
    this.updatePositionHistory();
    this.updateSegments();
    this.updateColors();
    this.updateMathematicalMotion(deltaTime);
    this.updateParticles(deltaTime);
  }

  updateMovement(deltaTime) {
    // 优美的数学运动 - 基于正弦波和螺旋，增加平滑度
    const t = this.time * 0.3; // 减慢时间变化

    // 主要运动方向 - 更平滑的变化
    const angleChange = Math.sin(t * 0.2) * 0.008 + Math.cos(t * 0.13) * 0.006;
    this.wanderAngle += angleChange;

    // 基础运动向量
    const baseX = Math.cos(this.wanderAngle);
    const baseY = Math.sin(this.wanderAngle);

    // 添加优美的波动 - 更平滑的正弦波
    const perpX = -baseY;
    const perpY = baseX;
    const waveOffset = Math.sin(t * 1.5 + this.wanderAngle * 2) * 0.2; // 减小波动幅度

    // 组合运动向量
    const targetVelX = baseX + perpX * waveOffset;
    const targetVelY = baseY + perpY * waveOffset;

    // 鼠标交互 - 更平滑的避让
    const mouseDistance = Math.sqrt(
      (this.position.x - this.mousePosition.x) ** 2 +
      (this.position.y - this.mousePosition.y) ** 2
    );

    let avoidForceX = 0;
    let avoidForceY = 0;

    if (mouseDistance < this.avoidanceRadius && mouseDistance > 0) {
      const avoidX = (this.position.x - this.mousePosition.x) / mouseDistance;
      const avoidY = (this.position.y - this.mousePosition.y) / mouseDistance;
      const avoidStrength = Math.pow((this.avoidanceRadius - mouseDistance) / this.avoidanceRadius, 3); // 更平滑的曲线

      avoidForceX = avoidX * avoidStrength * 0.8; // 减小避让力
      avoidForceY = avoidY * avoidStrength * 0.8;
    }

    // 更平滑地趋向目标速度
    const lerpFactor = 0.02; // 更小的插值因子
    this.velocity.x += (targetVelX * this.options.speed - this.velocity.x) * lerpFactor;
    this.velocity.y += (targetVelY * this.options.speed - this.velocity.y) * lerpFactor;

    // 平滑地应用避让力
    this.velocity.x += avoidForceX * lerpFactor;
    this.velocity.y += avoidForceY * lerpFactor;

    // 更高质量的阻尼
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;

    // 限制最大速度变化
    const maxSpeedChange = 0.1;
    this.velocity.x = Math.max(-this.options.speed - maxSpeedChange,
                              Math.min(this.options.speed + maxSpeedChange, this.velocity.x));
    this.velocity.y = Math.max(-this.options.speed - maxSpeedChange,
                              Math.min(this.options.speed + maxSpeedChange, this.velocity.y));

    // 更新位置
    this.position.x += this.velocity.x * deltaTime * 60;
    this.position.y += this.velocity.y * deltaTime * 60;

    // 柔和的边界处理
    this.handleBoundariesSmoothly();
  }

  handleBoundariesSmoothly() {
    const margin = 80;
    const softZone = 40;

    // 柔和的边界反弹 - 使用正弦函数创建平滑过渡
    if (this.position.x < margin) {
      const penetration = (margin - this.position.x) / softZone;
      const force = Math.sin(Math.min(penetration, 1) * Math.PI / 2) * 2;
      this.velocity.x += force;
      this.wanderAngle += (Math.PI / 2 - this.wanderAngle) * 0.02;
    }

    if (this.position.x > this.canvas.width - margin) {
      const penetration = (this.position.x - (this.canvas.width - margin)) / softZone;
      const force = Math.sin(Math.min(penetration, 1) * Math.PI / 2) * 2;
      this.velocity.x -= force;
      this.wanderAngle += (Math.PI - this.wanderAngle) * 0.02;
    }

    if (this.position.y < margin) {
      const penetration = (margin - this.position.y) / softZone;
      const force = Math.sin(Math.min(penetration, 1) * Math.PI / 2) * 2;
      this.velocity.y += force;
      this.wanderAngle += (-this.wanderAngle) * 0.02;
    }

    if (this.position.y > this.canvas.height - margin) {
      const penetration = (this.position.y - (this.canvas.height - margin)) / softZone;
      const force = Math.sin(Math.min(penetration, 1) * Math.PI / 2) * 2;
      this.velocity.y -= force;
      this.wanderAngle += (Math.PI - this.wanderAngle) * 0.02;
    }
  }

  updatePositionHistory() {
    this.positionHistory.push({
      x: this.position.x,
      y: this.position.y,
      time: this.time
    });

    if (this.positionHistory.length > this.maxHistoryLength) {
      this.positionHistory.shift();
    }
  }

  updateSegments() {
    // 优美的身体流动 - 结合历史位置和数学波动
    for (let i = 0; i < this.segments.length; i++) {
      const historyIndex = this.positionHistory.length - 1 - (i * this.options.segmentSpacing);

      if (historyIndex >= 0 && this.positionHistory[historyIndex]) {
        const targetPos = this.positionHistory[historyIndex];

        // 基础跟随位置
        let segmentX = targetPos.x;
        let segmentY = targetPos.y;

        // 添加优美的波动效果
        const segmentRatio = i / (this.segments.length - 1);
        const wavePhase = this.time * 2 + i * 0.3;

        // 垂直于运动方向的波动
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > 0.1) {
          const direction = Math.atan2(this.velocity.y, this.velocity.x);
          const perpX = -Math.sin(direction);
          const perpY = Math.cos(direction);

          // 多层波动创造复杂美感
          const wave1 = Math.sin(wavePhase) * this.waveAmplitude * (1 - segmentRatio * 0.5);
          const wave2 = Math.sin(wavePhase * 1.618 + Math.PI / 3) * this.waveAmplitude * 0.3; // 黄金比例
          const wave3 = Math.sin(wavePhase * 2.414 + Math.PI / 2) * this.waveAmplitude * 0.15; // 白银比例

          const totalWave = (wave1 + wave2 + wave3) * (1 - segmentRatio * 0.3);

          segmentX += perpX * totalWave;
          segmentY += perpY * totalWave;
        }

        // 更平滑的插值到目标位置
        const smoothing = 0.08; // 减小插值因子，增加平滑度
        this.segments[i].x += (segmentX - this.segments[i].x) * smoothing;
        this.segments[i].y += (segmentY - this.segments[i].y) * smoothing;

        // 动态大小变化
        const pulseFactor = 1 + Math.sin(this.time * 3 + i * 0.2) * 0.1;
        this.segments[i].size = this.options.segmentSize * (1 - segmentRatio * 0.3) * pulseFactor;
      }
    }
  }

  updateColors() {
    // 基于数学函数的优美变色
    const speedFactor = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

    // 主色调缓慢变化 - 基于黄金角度
    const goldenAngle = 137.508; // 黄金角度（度）
    this.baseHue += (this.colorShiftSpeed + speedFactor * this.movementColorInfluence) * 0.016;
    this.baseHue = this.baseHue % 360;

    // 更新节段颜色 - 赛博朋克风格
    this.segments.forEach((segment, index) => {
      const segmentRatio = index / (this.segments.length - 1);

      // 在赛博朋克色调间切换
      const hueIndex = Math.floor(this.time * 0.1 + segmentRatio * 2) % this.cyberpunkHues.length;
      const targetHue = this.cyberpunkHues[hueIndex];
      const nextHue = this.cyberpunkHues[(hueIndex + 1) % this.cyberpunkHues.length];

      // 平滑过渡
      const transition = (this.time * 0.1 + segmentRatio * 2) % 1;
      const baseHue = targetHue + (nextHue - targetHue) * transition;

      // 添加时间波动
      const timeWave = Math.sin(this.time * 1.5 + index * 0.1) * 15;

      // 添加速度影响
      const speedWave = Math.sin(this.time * 3 + index * 0.2) * speedFactor * 10;

      // 添加位置波动
      const fibWave = Math.sin(this.time * 0.8 + index * goldenAngle * Math.PI / 180) * 8;

      // 组合所有颜色效果
      segment.hue = (baseHue + timeWave + speedWave + fibWave) % 360;

      // 确保色调为正数
      if (segment.hue < 0) segment.hue += 360;

      // 增强赛博朋克效果的饱和度和亮度
      segment.saturation = 0.9 + Math.sin(this.time * 2 + index * 0.1) * 0.1;
      segment.brightness = 0.7 + Math.sin(this.time * 1.5 + index * 0.15) * 0.2;
    });
  }

  updateMathematicalMotion(deltaTime) {
    // 数学美学的额外运动效果

    // 1. 螺旋运动叠加
    const spiralPhase = this.time * 0.5;
    const spiralRadius = 5 + Math.sin(this.time * 0.3) * 3;
    const spiralX = Math.cos(spiralPhase) * spiralRadius * this.spiralTightness;
    const spiralY = Math.sin(spiralPhase) * spiralRadius * this.spiralTightness;

    // 2. 呼吸效果 - 整体大小的周期性变化
    const breathPhase = this.time * 1.2;
    const breathScale = 1 + Math.sin(breathPhase) * 0.05;

    // 3. 应用螺旋偏移到头部
    this.position.x += spiralX * deltaTime * 60;
    this.position.y += spiralY * deltaTime * 60;

    // 4. 应用呼吸效果到所有节段
    this.segments.forEach((segment, index) => {
      const segmentBreath = breathScale + Math.sin(breathPhase + index * 0.1) * 0.02;
      segment.size *= segmentBreath;
    });

    // 5. 添加微妙的抖动效果（模拟生命力）
    const jitterStrength = 0.2;
    const jitterX = (Math.random() - 0.5) * jitterStrength;
    const jitterY = (Math.random() - 0.5) * jitterStrength;

    this.position.x += jitterX;
    this.position.y += jitterY;
  }

  updateParticles(deltaTime) {
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

    // 根据速度生成粒子 - 速度越快粒子越多
    const particleChance = Math.min(speed * 0.2, 0.9); // 增加粒子生成概率
    if (Math.random() < particleChance) {
      // 从尾部节段生成粒子
      const tailSegments = this.segments.slice(-5); // 最后5个节段
      const randomSegment = tailSegments[Math.floor(Math.random() * tailSegments.length)];

      if (randomSegment) {
        this.particles.push({
          x: randomSegment.x + (Math.random() - 0.5) * 8,
          y: randomSegment.y + (Math.random() - 0.5) * 8,
          vx: -this.velocity.x * 0.3 + (Math.random() - 0.5) * 5,
          vy: -this.velocity.y * 0.3 + (Math.random() - 0.5) * 5,
          life: 1.0,
          decay: 0.015 + Math.random() * 0.01,
          size: 1 + Math.random() * 2,
          hue: randomSegment.hue + (Math.random() - 0.5) * 30,
          sparkle: Math.random() > 0.7 // 20%的粒子有闪烁效果
        });
      }
    }

    // 更新粒子 - 添加更复杂的运动
    this.particles = this.particles.filter(particle => {
      // 基础运动
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      // 添加微妙的螺旋运动
      const spiralForce = 0.5;
      const angle = Math.atan2(particle.vy, particle.vx) + 0.1;
      particle.vx += Math.cos(angle) * spiralForce * deltaTime;
      particle.vy += Math.sin(angle) * spiralForce * deltaTime;

      // 阻尼
      particle.vx *= 0.98;
      particle.vy *= 0.98;

      // 生命衰减
      particle.life -= particle.decay;

      // 大小变化
      particle.size *= 0.995;

      return particle.life > 0 && particle.size > 0.1;
    });

    // 限制粒子数量
    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(-this.maxParticles);
    }
  }

  onMouseMove(mouseX, mouseY) {
    this.mousePosition.x = mouseX;
    this.mousePosition.y = mouseY;
  }

  getVertexData() {
    const data = {
      segments: [],
      particles: []
    };

    // 身体节段数据 - 增强的视觉效果
    this.segments.forEach((segment, index) => {
      data.segments.push({
        x: segment.x,
        y: segment.y,
        size: segment.size,
        hue: segment.hue,
        saturation: 0.8 + Math.sin(this.time * 2 + index * 0.1) * 0.2, // 动态饱和度
        brightness: 0.6 + Math.sin(this.time * 1.5 + index * 0.15) * 0.3, // 动态亮度
        glow: 1 + Math.sin(this.time * 3 + index * 0.2) * 0.5 // 发光强度
      });
    });

    // 粒子数据 - 增强效果
    this.particles.forEach(particle => {
      data.particles.push({
        x: particle.x,
        y: particle.y,
        size: particle.size,
        life: particle.life,
        hue: particle.hue,
        sparkle: particle.sparkle || false,
        alpha: particle.life * (particle.sparkle ? (0.5 + Math.sin(this.time * 10) * 0.5) : 1)
      });
    });

    return data;
  }
}
