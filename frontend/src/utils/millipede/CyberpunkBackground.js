/**
 * 赛博朋克3D背景渲染器
 */
export class CyberpunkBackground {
  constructor(gl, canvas) {
    this.gl = gl;
    this.canvas = canvas;
    this.program = null;
    this.time = 0;

    // 3D网格参数 - 简化版本
    this.gridSize = 15; // 减少网格大小
    this.gridSpacing = 60;
    this.waveHeight = 25;

    // 赛博朋克颜色
    this.colors = {
      primary: [0.0, 1.0, 1.0],    // 青色
      secondary: [1.0, 0.0, 1.0],  // 紫色
      accent: [0.0, 1.0, 0.5],     // 绿色
      neon: [1.0, 0.2, 0.8]        // 霓虹粉
    };

    this.init();
  }

  init() {
    this.createShaderProgram();
    this.createGeometry();
  }

  createShaderProgram() {
    const vertexShaderSource = `
      precision mediump float;

      attribute vec3 a_position;
      attribute vec3 a_color;

      uniform mat4 u_projectionMatrix;
      uniform mat4 u_viewMatrix;
      uniform float u_time;
      uniform vec2 u_resolution;

      varying vec3 v_color;
      varying float v_depth;
      varying vec3 v_worldPos;

      void main() {
        vec3 pos = a_position;

        // 3D波浪效果
        float wave1 = sin(pos.x * 0.1 + u_time * 2.0) * 15.0;
        float wave2 = cos(pos.z * 0.08 + u_time * 1.5) * 10.0;
        float wave3 = sin((pos.x + pos.z) * 0.05 + u_time * 3.0) * 8.0;

        pos.y += wave1 + wave2 + wave3;

        // 简化的3D变换
        pos.z -= 200.0; // 向后移动

        vec4 worldPos = vec4(pos, 1.0);
        gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;

        v_color = a_color;
        v_depth = gl_Position.z / gl_Position.w;
        v_worldPos = worldPos.xyz;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      varying vec3 v_color;
      varying float v_depth;
      varying vec3 v_worldPos;

      uniform float u_time;

      void main() {
        // 距离衰减
        float distance = length(v_worldPos.xz) / 500.0;
        float fade = 1.0 - smoothstep(0.0, 1.0, distance);

        // 深度雾效
        float fogFactor = 1.0 - smoothstep(0.0, 1.0, abs(v_depth));

        // 脉动效果
        float pulse = 0.7 + 0.3 * sin(u_time * 4.0 + distance * 10.0);

        // 扫描线效果
        float scanline = sin(v_worldPos.y * 0.5 + u_time * 8.0) * 0.1 + 0.9;

        vec3 finalColor = v_color * fade * fogFactor * pulse * scanline;
        float alpha = fade * fogFactor * 0.6;

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
      throw new Error('赛博朋克背景着色器程序链接失败: ' + this.gl.getProgramInfoLog(this.program));
    }

    // 获取uniform位置
    this.uniforms = {
      projectionMatrix: this.gl.getUniformLocation(this.program, 'u_projectionMatrix'),
      viewMatrix: this.gl.getUniformLocation(this.program, 'u_viewMatrix'),
      time: this.gl.getUniformLocation(this.program, 'u_time'),
      resolution: this.gl.getUniformLocation(this.program, 'u_resolution')
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
      throw new Error('赛博朋克背景着色器编译失败: ' + error);
    }

    return shader;
  }

  createGeometry() {
    const positions = [];
    const colors = [];
    const indices = [];

    // 创建3D网格
    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const posX = (x - this.gridSize / 2) * this.gridSpacing;
        const posZ = (z - this.gridSize / 2) * this.gridSpacing;
        const posY = 0;

        positions.push(posX, posY, posZ);

        // 赛博朋克颜色渐变
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - this.gridSize / 2, 2) +
          Math.pow(z - this.gridSize / 2, 2)
        ) / (this.gridSize / 2);

        let color;
        if (distanceFromCenter < 0.3) {
          color = this.colors.primary;
        } else if (distanceFromCenter < 0.6) {
          color = this.colors.secondary;
        } else if (distanceFromCenter < 0.8) {
          color = this.colors.accent;
        } else {
          color = this.colors.neon;
        }

        colors.push(color[0], color[1], color[2]);
      }
    }

    // 创建线条索引（网格线）
    for (let x = 0; x < this.gridSize - 1; x++) {
      for (let z = 0; z < this.gridSize - 1; z++) {
        const i = x * this.gridSize + z;

        // 水平线
        indices.push(i, i + 1);
        // 垂直线
        indices.push(i, i + this.gridSize);
      }
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

    this.gl.useProgram(this.program);

    // 设置3D投影矩阵
    const projectionMatrix = this.createPerspectiveMatrix(
      45 * Math.PI / 180,
      this.canvas.width / this.canvas.height,
      0.1,
      1000.0
    );

    // 设置视图矩阵
    const viewMatrix = this.createViewMatrix();

    // 设置uniform
    this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, projectionMatrix);
    this.gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, viewMatrix);
    this.gl.uniform1f(this.uniforms.time, this.time);
    this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);

    // 绑定属性
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.vertexAttribPointer(this.attributes.position, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.attributes.position);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.vertexAttribPointer(this.attributes.color, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.attributes.color);

    // 绘制网格线
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.drawElements(this.gl.LINES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
  }

  createPerspectiveMatrix(fov, aspect, near, far) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    const rangeInv = 1.0 / (near - far);

    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  createViewMatrix() {
    // 创建俯视角度的视图矩阵
    const eye = [0, 100, 50];
    const target = [0, 0, -100];
    const up = [0, 1, 0];

    return this.lookAt(eye, target, up);
  }

  lookAt(eye, target, up) {
    const zAxis = this.normalize(this.subtract(eye, target));
    const xAxis = this.normalize(this.cross(up, zAxis));
    const yAxis = this.cross(zAxis, xAxis);

    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -this.dot(xAxis, eye), -this.dot(yAxis, eye), -this.dot(zAxis, eye), 1
    ]);
  }

  // 向量数学辅助函数
  subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  normalize(v) {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return length > 0 ? [v[0] / length, v[1] / length, v[2] / length] : [0, 0, 0];
  }

  cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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
