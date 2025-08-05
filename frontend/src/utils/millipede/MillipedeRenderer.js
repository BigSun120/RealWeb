/**
 * 千足虫WebGL渲染器 - 重新创建干净版本
 */
export class MillipedeWebGLRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.gl = null;
    this.programs = {};
    this.isRunning = false;
    this.frameCount = 0;
    this.time = 0;

    // 千足虫配置
    this.options = {
      count: options.count || 3,
      segmentCount: 50,
      segmentSpacing: 8,
      disableBackground: options.disableBackground || false,
      ...options
    };

    // 千足虫实体
    this.millipedes = [];

    // 鼠标交互
    this.mouse = { x: 0, y: 0 };

    // 环境效果
    this.backgroundParticles = [];
    this.maxBackgroundParticles = 50;

    // 赛博朋克3D背景
    this.cyberpunkBackground = null;
    this.backgroundType = 'none'; // 'webgl', 'canvas2d', 'none'

    this.init();
  }

  init() {
    try {
      console.log('开始千足虫WebGL渲染器初始化...');

      if (!this.canvas) {
        throw new Error('Canvas element not found');
      }

      // 获取WebGL上下文
      this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
      if (!this.gl) {
        throw new Error('WebGL not supported');
      }

      console.log('WebGL上下文创建成功');

      // 设置视口
      this.setupViewport();

      // 创建着色器程序
      this.createShaderPrograms();

      // 创建千足虫
      this.createMillipedes();

      // 设置WebGL状态
      this.setupWebGLState();

      // 设置事件监听
      this.setupEventListeners();

      // 初始化赛博朋克背景（如果未禁用）
      if (!this.options.disableBackground) {
        console.log('初始化内置背景...');
        this.initCyberpunkBackground();
      } else {
        console.log('✅ 背景已禁用，跳过背景初始化');
        this.cyberpunkBackground = null;
        this.backgroundType = 'disabled';
      }

      console.log('千足虫WebGL渲染器初始化完成');

    } catch (error) {
      console.error('千足虫WebGL渲染器初始化失败:', error);
      throw error;
    }
  }

  setupViewport() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    console.log('Canvas尺寸:', this.canvas.width, 'x', this.canvas.height);
  }

  createShaderPrograms() {
    // 创建千足虫身体着色器
    this.programs.millipede = this.createProgram(
      this.getMillipedeVertexShader(),
      this.getMillipedeFragmentShader()
    );

    // 创建粒子着色器
    this.programs.particles = this.createProgram(
      this.getParticleVertexShader(),
      this.getParticleFragmentShader()
    );

    console.log('所有着色器程序创建成功');
  }

  getMillipedeVertexShader() {
    return `
      attribute vec3 a_position;
      attribute vec3 a_color;
      attribute float a_size;

      uniform vec2 u_resolution;
      uniform float u_time;

      varying vec3 v_color;
      varying float v_size;

      void main() {
        vec2 screenPos = (a_position.xy / u_resolution) * 2.0 - 1.0;
        screenPos.y *= -1.0;

        gl_Position = vec4(screenPos, 0.0, 1.0);
        gl_PointSize = a_size;

        v_color = a_color;
        v_size = a_size;
      }
    `;
  }

  getMillipedeFragmentShader() {
    return `
      precision mediump float;

      varying vec3 v_color;
      varying float v_size;
      uniform float u_time;

      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);

        if (dist > 0.5) {
          discard;
        }

        // 多层发光效果 - 增强版
        float innerGlow = 1.0 - smoothstep(0.0, 0.2, dist);
        float midGlow = 1.0 - smoothstep(0.2, 0.4, dist);
        float outerGlow = 1.0 - smoothstep(0.4, 0.6, dist); // 扩大发光范围

        // 复杂的脉动效果
        float pulse1 = 0.6 + 0.4 * sin(u_time * 2.0);
        float pulse2 = 0.7 + 0.3 * sin(u_time * 3.14159);
        float pulse3 = 0.8 + 0.2 * sin(u_time * 5.0);
        float pulse4 = 0.9 + 0.1 * sin(u_time * 7.0);

        // 组合发光 - 更强的效果
        vec3 innerColor = v_color * innerGlow * pulse1 * 1.2;
        vec3 midColor = v_color * 0.8 * midGlow * pulse2;
        vec3 outerColor = v_color * 0.5 * outerGlow * pulse3;
        vec3 finalColor = innerColor + midColor + outerColor;

        // 添加更强的闪烁效果
        float sparkle = 1.0 + 0.5 * sin(u_time * 10.0 + gl_FragCoord.x * 0.05 + gl_FragCoord.y * 0.05);
        finalColor *= sparkle;

        // 增强透明度
        float alpha = (innerGlow * 1.0 + midGlow * 0.8 + outerGlow * 0.4) * pulse4;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
  }

  getParticleVertexShader() {
    return `
      attribute vec3 a_position;
      attribute vec3 a_color;
      attribute float a_size;
      attribute float a_life;

      uniform vec2 u_resolution;
      uniform float u_time;

      varying vec3 v_color;
      varying float v_life;
      varying float v_sparkle;

      void main() {
        vec2 screenPos = (a_position.xy / u_resolution) * 2.0 - 1.0;
        screenPos.y *= -1.0;

        gl_Position = vec4(screenPos, 0.0, 1.0);
        gl_PointSize = a_size * a_life;

        v_color = a_color;
        v_life = a_life;
        v_sparkle = sin(u_time * 10.0 + a_position.x * 0.1);
      }
    `;
  }

  getParticleFragmentShader() {
    return `
      precision mediump float;

      varying vec3 v_color;
      varying float v_life;
      varying float v_sparkle;

      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);

        if (dist > 0.5) {
          discard;
        }

        // 粒子发光效果
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);

        // 闪烁效果
        float sparkleEffect = 1.0 + v_sparkle * 0.5;

        vec3 finalColor = v_color * glow * sparkleEffect;
        float alpha = glow * v_life * 0.8;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error('着色器编译失败: ' + error);
    }

    return shader;
  }

  createProgram(vertexShaderSource, fragmentShaderSource) {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('着色器程序链接失败: ' + this.gl.getProgramInfoLog(program));
    }

    return program;
  }

  createMillipedes() {
    // 动态导入千足虫实体类
    import('./MillipedeEntity.js').then(({ MillipedeEntity }) => {
      for (let i = 0; i < this.options.count; i++) {
        const millipede = new MillipedeEntity(this.canvas, {
          segmentCount: this.options.segmentCount,
          segmentSpacing: this.options.segmentSpacing
        });

        this.millipedes.push(millipede);
      }

      console.log(`创建了 ${this.millipedes.length} 个千足虫`);
    });
  }

  setupWebGLState() {
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    console.log('WebGL状态设置完成');
  }

  async initCyberpunkBackground() {
    try {
      // 使用3D网格背景（你的原始需求）
      const { CyberpunkGrid3D } = await import('./CyberpunkGrid3D.js');
      this.cyberpunkBackground = new CyberpunkGrid3D(this.canvas);
      this.backgroundType = 'canvas2d';
      console.log('赛博朋克3D网格背景初始化成功');
    } catch (error) {
      console.error('3D网格背景初始化失败，尝试简化版WebGL背景:', error);
      try {
        // 备选方案1：简化版WebGL背景
        const { SimpleCyberpunkBackground } = await import('./SimpleCyberpunkBackground.js');
        this.cyberpunkBackground = new SimpleCyberpunkBackground(this.gl, this.canvas);
        this.backgroundType = 'webgl';
        console.log('简化版赛博朋克WebGL背景初始化成功');
      } catch (webglError) {
        console.error('WebGL背景也失败，尝试基础Canvas 2D背景:', webglError);
        try {
          // 备选方案2：基础Canvas 2D背景
          const { Canvas2DBackground } = await import('./Canvas2DBackground.js');
          this.cyberpunkBackground = new Canvas2DBackground(this.canvas);
          this.backgroundType = 'canvas2d';
          console.log('基础Canvas 2D背景初始化成功');
        } catch (fallbackError) {
          console.error('所有背景方案都失败:', fallbackError);
          this.cyberpunkBackground = null;
          this.backgroundType = 'none';
        }
      }
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      this.mouse.x = mouseX;
      this.mouse.y = mouseY;

      this.millipedes.forEach(millipede => {
        millipede.onMouseMove(mouseX, mouseY);
      });
    });

    window.addEventListener('resize', () => {
      this.onResize();
    });

    console.log('事件监听器设置完成');
  }

  start() {
    if (this.isRunning) return;
    console.log('启动千足虫WebGL渲染循环...');
    this.isRunning = true;
    this.frameCount = 0;
    this.time = 0;
    this.animate();
  }

  stop() {
    console.log('停止千足虫WebGL渲染循环');
    this.isRunning = false;
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    this.frameCount++;
    this.time += 0.016;

    if (this.frameCount % 100 === 0) {
      console.log('千足虫WebGL渲染帧数:', this.frameCount);
    }

    this.update();
    this.render();
  }

  update() {
    this.millipedes.forEach(millipede => {
      millipede.update(0.016);
    });

    this.updateBackgroundParticles();
  }

  updateBackgroundParticles() {
    // 生成背景粒子
    if (Math.random() < 0.1 && this.backgroundParticles.length < this.maxBackgroundParticles) {
      this.backgroundParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1.0,
        decay: 0.005,
        size: 1 + Math.random() * 2,
        hue: Math.random() * 360,
        twinkle: Math.random() * Math.PI * 2
      });
    }

    // 更新背景粒子
    this.backgroundParticles = this.backgroundParticles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.decay;
      particle.twinkle += 0.1;

      // 边界循环
      if (particle.x < 0) particle.x = this.canvas.width;
      if (particle.x > this.canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.canvas.height;
      if (particle.y > this.canvas.height) particle.y = 0;

      return particle.life > 0;
    });
  }

  render() {
    try {
      // 清除WebGL画布
      if (this.backgroundType === 'disabled') {
        // 背景已禁用，使用透明清除
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
      } else if (this.backgroundType === 'canvas2d') {
        // 使用透明清除，保留Canvas 2D背景
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
      } else {
        // 正常清除
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      }
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      // 禁用深度测试进行2D渲染
      this.gl.disable(this.gl.DEPTH_TEST);

      // 只有在背景未禁用时才渲染背景
      if (this.cyberpunkBackground && this.backgroundType !== 'disabled') {
        if (this.backgroundType === 'canvas2d') {
          this.cyberpunkBackground.render(this.time);
        } else if (this.backgroundType === 'webgl') {
          this.cyberpunkBackground.render(this.time);
        }
      }

      // 渲染背景粒子
      this.renderBackgroundParticles();

      // 最后渲染千足虫（最上层）
      this.millipedes.forEach(millipede => {
        this.renderMillipede(millipede);
      });

    } catch (error) {
      console.error('千足虫WebGL渲染错误:', error);
      console.error('错误堆栈:', error.stack);
      this.stop();
    }
  }

  renderMillipede(millipede) {
    const data = millipede.getVertexData();
    this.renderSegments(data.segments);
    this.renderParticles(data.particles);
  }

  renderSegments(segments) {
    if (segments.length === 0) return;

    this.gl.useProgram(this.programs.millipede);

    const resolutionLocation = this.gl.getUniformLocation(this.programs.millipede, 'u_resolution');
    const timeLocation = this.gl.getUniformLocation(this.programs.millipede, 'u_time');

    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(timeLocation, this.time);

    const positions = [];
    const colors = [];
    const sizes = [];

    segments.forEach(segment => {
      positions.push(segment.x, segment.y, 0);

      // 使用增强的颜色数据
      const saturation = segment.saturation || 0.8;
      const brightness = segment.brightness || 0.6;
      const rgb = this.hslToRgb(segment.hue / 360, saturation, brightness);

      colors.push(rgb.r, rgb.g, rgb.b);
      sizes.push(segment.size * (segment.glow || 1));
    });

    this.bindVertexData(this.programs.millipede, positions, colors, sizes);
    this.gl.drawArrays(this.gl.POINTS, 0, segments.length);
  }

  renderParticles(particles) {
    if (particles.length === 0) return;

    this.gl.useProgram(this.programs.particles);

    const resolutionLocation = this.gl.getUniformLocation(this.programs.particles, 'u_resolution');
    const timeLocation = this.gl.getUniformLocation(this.programs.particles, 'u_time');

    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(timeLocation, this.time);

    const positions = [];
    const colors = [];
    const sizes = [];
    const lives = [];

    particles.forEach(particle => {
      positions.push(particle.x, particle.y, 0);

      const rgb = this.hslToRgb(particle.hue / 360, 0.9, 0.7);
      colors.push(rgb.r, rgb.g, rgb.b);

      sizes.push(particle.size);
      lives.push(particle.life);
    });

    this.bindParticleData(this.programs.particles, positions, colors, sizes, lives);
    this.gl.drawArrays(this.gl.POINTS, 0, particles.length);
  }

  renderBackgroundParticles() {
    if (this.backgroundParticles.length === 0) return;

    this.gl.useProgram(this.programs.particles);

    const resolutionLocation = this.gl.getUniformLocation(this.programs.particles, 'u_resolution');
    const timeLocation = this.gl.getUniformLocation(this.programs.particles, 'u_time');

    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(timeLocation, this.time);

    const positions = [];
    const colors = [];
    const sizes = [];
    const lives = [];

    this.backgroundParticles.forEach(particle => {
      positions.push(particle.x, particle.y, 0);

      // 背景粒子使用更暗的颜色
      const rgb = this.hslToRgb(particle.hue / 360, 0.3, 0.2);
      colors.push(rgb.r, rgb.g, rgb.b);

      // 闪烁效果
      const twinkleSize = particle.size * (0.5 + 0.5 * Math.sin(particle.twinkle));
      sizes.push(twinkleSize);
      lives.push(particle.life * 0.3); // 更透明
    });

    this.bindParticleData(this.programs.particles, positions, colors, sizes, lives);
    this.gl.drawArrays(this.gl.POINTS, 0, this.backgroundParticles.length);
  }

  bindVertexData(program, positions, colors, sizes) {
    const positionLocation = this.gl.getAttribLocation(program, 'a_position');
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(positionLocation);

    const colorLocation = this.gl.getAttribLocation(program, 'a_color');
    const colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(colorLocation, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(colorLocation);

    if (sizes) {
      const sizeLocation = this.gl.getAttribLocation(program, 'a_size');
      if (sizeLocation !== -1) {
        const sizeBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, sizeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(sizes), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(sizeLocation, 1, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(sizeLocation);
      }
    }
  }

  bindParticleData(program, positions, colors, sizes, lives) {
    this.bindVertexData(program, positions, colors, sizes);

    // 生命值属性
    const lifeLocation = this.gl.getAttribLocation(program, 'a_life');
    if (lifeLocation !== -1) {
      const lifeBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, lifeBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(lives), this.gl.STATIC_DRAW);
      this.gl.vertexAttribPointer(lifeLocation, 1, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(lifeLocation);
    }
  }

  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  onResize() {
    if (!this.gl) return;

    this.setupViewport();

    // 更新赛博朋克背景尺寸
    if (this.cyberpunkBackground && this.cyberpunkBackground.onResize) {
      this.cyberpunkBackground.onResize();
    }

    this.millipedes.forEach(millipede => {
      millipede.canvas = this.canvas;
    });

    console.log('千足虫WebGL尺寸更新:', this.canvas.width, 'x', this.canvas.height);
  }

  destroy() {
    this.stop();

    Object.values(this.programs).forEach(program => {
      if (this.gl && program) {
        this.gl.deleteProgram(program);
      }
    });

    window.removeEventListener('resize', this.onResize.bind(this));

    console.log('千足虫WebGL渲染器已清理');
  }

  getStats() {
    return {
      fps: Math.round(1000 / 16.67),
      frameCount: this.frameCount,
      millipedeCount: this.millipedes.length,
      particleCount: 0
    };
  }

  setCount(count) {
    this.options.count = count;
  }

  setQuality(quality) {
    console.log('设置渲染质量:', quality);
  }

  setInteractionEnabled(enabled) {
    console.log('设置交互:', enabled);
  }

  setParticlesEnabled(enabled) {
    console.log('设置粒子:', enabled);
  }
}
