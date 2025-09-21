/**
 * 简化版赛博朋克背景 - 2D效果，更好的兼容性
 */
export class SimpleCyberpunkBackground {
  constructor(gl, canvas) {
    this.gl = gl;
    this.canvas = canvas;
    this.program = null;
    this.time = 0;

    // 网格线参数
    this.gridLines = [];
    this.gridSpacing = 80;
    this.lineCount = 20;

    // 赛博朋克颜色
    this.colors = [
      [0.0, 1.0, 1.0],    // 青色
      [1.0, 0.0, 1.0],    // 紫色
      [0.0, 1.0, 0.5],    // 绿色
      [1.0, 0.2, 0.8]     // 霓虹粉
    ];

    this.init();
  }

  init() {
    try {
      this.createShaderProgram();
      this.createGridLines();
      console.log('简化版赛博朋克背景初始化成功');
    } catch (error) {
      console.error('简化版赛博朋克背景初始化失败:', error);
      throw error;
    }
  }

  createShaderProgram() {
    const vertexShaderSource = `
      precision mediump float;

      attribute vec2 a_position;
      attribute vec3 a_color;

      uniform vec2 u_resolution;
      uniform float u_time;

      varying vec3 v_color;
      varying float v_alpha;

      void main() {
        vec2 pos = a_position;

        // 添加波动效果
        pos.y += sin(pos.x * 0.01 + u_time * 2.0) * 20.0;

        // 转换到屏幕坐标
        vec2 screenPos = (pos / u_resolution) * 2.0 - 1.0;
        screenPos.y *= -1.0;

        gl_Position = vec4(screenPos, 0.0, 1.0);

        v_color = a_color;

        // 距离衰减
        float distance = length(pos - u_resolution * 0.5) / (u_resolution.x * 0.5);
        v_alpha = 1.0 - smoothstep(0.0, 1.0, distance);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      varying vec3 v_color;
      varying float v_alpha;

      uniform float u_time;

      void main() {
        // 增强的脉动效果
        float pulse = 0.7 + 0.3 * sin(u_time * 2.0);

        // 扫描线效果
        float scanline = sin(gl_FragCoord.y * 0.3 + u_time * 5.0) * 0.2 + 0.8;

        // 增强颜色强度和透明度
        vec3 finalColor = v_color * pulse * scanline * 1.5;
        float alpha = v_alpha * 0.8; // 增加透明度使背景更明显

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    // 创建着色器
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    // 创建程序
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error('简化版赛博朋克背景着色器程序链接失败: ' + this.gl.getProgramInfoLog(this.program));
    }

    // 获取uniform位置
    this.uniforms = {
      resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
      time: this.gl.getUniformLocation(this.program, 'u_time')
    };

    // 获取属性位置
    this.attributes = {
      position: this.gl.getAttribLocation(this.program, 'a_position'),
      color: this.gl.getAttribLocation(this.program, 'a_color')
    };
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error('简化版赛博朋克背景着色器编译失败: ' + error);
    }

    return shader;
  }

  createGridLines() {
    const positions = [];
    const colors = [];
    const indices = [];
    let vertexIndex = 0;

    // 创建水平线
    for (let i = 0; i < this.lineCount; i++) {
      const y = (i / (this.lineCount - 1)) * this.canvas.height;
      const colorIndex = i % this.colors.length;
      const color = this.colors[colorIndex];

      // 线的起点和终点
      positions.push(0, y);
      colors.push(color[0], color[1], color[2]);

      positions.push(this.canvas.width, y);
      colors.push(color[0], color[1], color[2]);

      // 线的索引
      indices.push(vertexIndex, vertexIndex + 1);
      vertexIndex += 2;
    }

    // 创建垂直线
    for (let i = 0; i < this.lineCount; i++) {
      const x = (i / (this.lineCount - 1)) * this.canvas.width;
      const colorIndex = i % this.colors.length;
      const color = this.colors[colorIndex];

      // 线的起点和终点
      positions.push(x, 0);
      colors.push(color[0], color[1], color[2]);

      positions.push(x, this.canvas.height);
      colors.push(color[0], color[1], color[2]);

      // 线的索引
      indices.push(vertexIndex, vertexIndex + 1);
      vertexIndex += 2;
    }

    // 创建缓冲区
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

    this.indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

    this.indexCount = indices.length;
  }

  render(time) {
    this.time = time;

    try {
      // 保存当前WebGL状态
      const currentProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM);

      this.gl.useProgram(this.program);

      // 设置混合模式以确保背景可见
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      // 设置uniform
      this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      this.gl.uniform1f(this.uniforms.time, this.time);

      // 绑定属性
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
      this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.attributes.position);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.vertexAttribPointer(this.attributes.color, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.attributes.color);

      // 绘制网格线
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      this.gl.drawElements(this.gl.LINES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);

      // 恢复之前的程序
      this.gl.useProgram(currentProgram);

      console.log('简化版赛博朋克背景渲染成功，线条数量:', this.indexCount / 2);

    } catch (error) {
      console.error('简化版赛博朋克背景渲染错误:', error);
      console.error('错误堆栈:', error.stack);
    }
  }

  onResize() {
    // 重新创建网格线以适应新尺寸
    this.createGridLines();
  }

  destroy() {
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
    if (this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer);
    }
    if (this.colorBuffer) {
      this.gl.deleteBuffer(this.colorBuffer);
    }
    if (this.indexBuffer) {
      this.gl.deleteBuffer(this.indexBuffer);
    }
  }
}
