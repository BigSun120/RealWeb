/**
 * 赛博朋克3D网格背景 - 经典80年代科幻风格
 */
export class CyberpunkGrid3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;

    // 检查2D上下文是否成功获取
    if (!this.ctx) {
      throw new Error('无法获取Canvas 2D上下文，可能Canvas已被其他上下文占用');
    }

    // 3D网格参数 - 增强版
    this.gridSize = 30; // 增加网格密度
    this.gridSpacing = 35; // 优化网格间距
    this.perspective = 1000; // 增加透视距离
    this.cameraHeight = 180; // 优化相机高度
    this.cameraAngle = Math.PI / 5; // 调整俯视角度

    // 动画参数 - 慢速优雅运动
    this.waveSpeed = 0.8; // 降低波浪速度
    this.waveHeight = 40; // 适中的波浪高度
    this.scanlineSpeed = 60; // 降低扫描线速度
    this.pulseSpeed = 0.6; // 脉冲速度
    this.dataStreamSpeed = 0.4; // 数据流速度
    this.galaxyRotationSpeed = 0.02; // 银河系旋转速度
    this.galaxyPulseSpeed = 0.15; // 银河系明暗变化速度

    // 赛博朋克颜色 - 增强版
    this.colors = {
      primary: '#00ffff',      // 青色主线
      secondary: '#ff00ff',    // 紫色副线
      accent: '#00ff80',       // 绿色强调
      neon: '#ff0080',         // 霓虹粉
      electric: '#80ff00',     // 电光绿
      plasma: '#ff8000',       // 等离子橙
      glow: '#ffffff',         // 白色发光
      horizon: '#ff0080',      // 地平线颜色
      deep: '#004080',         // 深蓝
      void: '#200040'          // 虚空紫
    };

    // 网格线颜色数组
    this.gridColors = [
      this.colors.primary,
      this.colors.secondary,
      this.colors.accent,
      this.colors.electric,
      this.colors.neon
    ];

    // 预计算网格点
    this.gridPoints = this.generateGridPoints();

    // console.log('赛博朋克3D网格背景初始化成功');
  }

  generateGridPoints() {
    const points = [];
    const halfSize = this.gridSize / 2;

    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        points.push({
          x: x * this.gridSpacing,
          y: 0,
          z: z * this.gridSpacing
        });
      }
    }

    return points;
  }

  project3DTo2D(x, y, z) {
    // 应用相机变换
    const cameraX = 0;
    const cameraY = this.cameraHeight;
    const cameraZ = 0;

    // 相对于相机的坐标
    const relX = x - cameraX;
    const relY = y - cameraY;
    const relZ = z - cameraZ;

    // 应用相机旋转（俯视角度）
    const rotatedY = relY * Math.cos(this.cameraAngle) - relZ * Math.sin(this.cameraAngle);
    const rotatedZ = relY * Math.sin(this.cameraAngle) + relZ * Math.cos(this.cameraAngle);

    // 透视投影
    if (rotatedZ <= 0) return null; // 在相机后面

    const scale = this.perspective / rotatedZ;
    const screenX = this.canvas.width / 2 + relX * scale;
    const screenY = this.canvas.height / 2 + rotatedY * scale;

    return {
      x: screenX,
      y: screenY,
      z: rotatedZ,
      scale: scale
    };
  }

  render(time) {
    this.time = time;

    try {
      // 检查上下文是否有效
      if (!this.ctx) {
        console.error('Canvas 2D上下文无效，停止渲染');
        return;
      }

      // 清除画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 绘制渐变背景
      this.drawBackground();

      // 绘制3D网格
      this.draw3DGrid();

      // 移除地平线效果（太突兀）
      // this.drawHorizon();

      // 绘制扫描线效果
      this.drawScanlines();

      // 绘制脉冲效果
      this.drawPulseEffects();

      // 绘制边框发光
      this.drawBorderGlow();

    } catch (error) {
      console.error('赛博朋克3D网格渲染错误:', error);
    }
  }

  drawBackground() {
    // 创建复杂的径向+垂直渐变背景
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height * 0.8;

    // 径向渐变（中心发光）
    const radialGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(this.canvas.width, this.canvas.height)
    );
    radialGradient.addColorStop(0, 'rgba(0, 64, 128, 0.3)');    // 中心蓝光
    radialGradient.addColorStop(0.3, 'rgba(32, 0, 64, 0.2)');   // 紫色环
    radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');         // 透明边缘

    // 垂直渐变（主背景）
    const verticalGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    verticalGradient.addColorStop(0, 'rgba(0, 8, 32, 1)');      // 深蓝顶部
    verticalGradient.addColorStop(0.3, 'rgba(16, 0, 48, 1)');   // 深紫
    verticalGradient.addColorStop(0.6, 'rgba(32, 0, 64, 1)');   // 紫色中部
    verticalGradient.addColorStop(0.8, 'rgba(48, 0, 32, 1)');   // 紫红
    verticalGradient.addColorStop(1, 'rgba(64, 0, 16, 1)');     // 深红底部

    // 绘制主背景
    this.ctx.fillStyle = verticalGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 叠加径向发光
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.fillStyle = radialGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over';

    // 添加星空效果
    this.drawStarField();
  }

  drawStarField() {
    // 绘制银河星空效果
    this.drawGalaxyBackground();
    this.drawStars();
    this.drawNebula();
  }

  drawGalaxyBackground() {
    // 绘制纯星空银河系 - 移除大块多边形
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    // 只绘制螺旋臂结构（非常淡的引导线）
    this.drawGalaxyArms();

    this.ctx.restore();
  }



  drawGalaxyArms() {
    // 绘制极简的螺旋臂引导线
    const mainArmCount = 4;
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.45;

    this.ctx.save();
    this.ctx.rotate(this.time * this.galaxyRotationSpeed);

    // 只绘制主要螺旋臂的淡引导线
    for (let arm = 0; arm < mainArmCount; arm++) {
      this.drawSpiralArm(arm, maxRadius, 'main');
    }

    this.ctx.restore();
  }

  drawSpiralArm(armIndex, maxRadius, armType = 'main') {
    // 绘制极淡的螺旋臂引导线 - 仅作为星星分布的视觉提示
    if (armType !== 'main') return; // 只绘制主臂

    const armOffset = armIndex * (Math.PI / 2);
    const spiralTightness = 0.15;

    // 极淡的引导线
    const armColors = [
      `rgba(150, 180, 255, `, // 淡蓝色
      `rgba(255, 200, 150, `, // 淡橙色
      `rgba(150, 255, 180, `, // 淡绿色
      `rgba(255, 150, 180, `  // 淡粉色
    ];

    // 非常淡的透明度
    const baseAlpha = 0.02;
    const armPulse = 0.8 + 0.2 * Math.sin(this.time * this.galaxyPulseSpeed * 0.3 + armIndex);
    const layerAlpha = baseAlpha * armPulse;

    this.ctx.beginPath();

    // 绘制简单的螺旋路径
    const startRadius = 60;
    for (let r = startRadius; r < maxRadius; r += 4) {
      const angle = armOffset + (r - startRadius) * spiralTightness;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.35;

      if (r === startRadius) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    // 设置极淡的样式
    const colorIndex = armIndex % armColors.length;
    this.ctx.strokeStyle = armColors[colorIndex] + layerAlpha + ')';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  }





  drawStars() {
    // 绘制优化的银河系星空 - 平衡性能和视觉效果
    const starLayers = [
      { count: 300, sizeRange: [0.3, 0.8], alpha: 0.5, twinkleSpeed: 1.2, type: 'distant', orbitSpeed: 0.001 },
      { count: 200, sizeRange: [0.8, 1.5], alpha: 0.7, twinkleSpeed: 0.9, type: 'medium', orbitSpeed: 0.0008 },
      { count: 120, sizeRange: [1.2, 2.2], alpha: 0.85, twinkleSpeed: 0.7, type: 'near', orbitSpeed: 0.0006 },
      { count: 60, sizeRange: [2.0, 3.5], alpha: 0.95, twinkleSpeed: 0.5, type: 'bright', orbitSpeed: 0.0004 },
      { count: 25, sizeRange: [3.0, 5.0], alpha: 1.0, twinkleSpeed: 0.3, type: 'giant', orbitSpeed: 0.0003 },
      { count: 10, sizeRange: [4.0, 7.0], alpha: 1.0, twinkleSpeed: 0.2, type: 'supergiant', orbitSpeed: 0.0002 }
    ];

    starLayers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const starId = layerIndex * 1000 + i;

        // 计算星星位置 - 添加轨道运动
        const starPosition = this.calculateStarPositionWithOrbit(starId, layer.type, layer.orbitSpeed);
        const x = starPosition.x;
        const y = starPosition.y;

        // 星星大小
        const baseSize = layer.sizeRange[0] +
          (Math.sin(starId * 34.567) + 1) / 2 * (layer.sizeRange[1] - layer.sizeRange[0]);

        // 闪烁效果
        const twinkle = Math.sin(this.time * layer.twinkleSpeed + starId) * 0.4 + 0.6;
        const size = baseSize * twinkle;

        // 真实的恒星光谱分类系统 - 基于实际恒星分布
        const starTypes = [
          { color: '#9bb0ff', temp: 'O', rarity: 0.00003, luminosity: 5.0 },  // O型 - 蓝色超巨星（极稀有）
          { color: '#aabfff', temp: 'B', rarity: 0.0013, luminosity: 4.0 },   // B型 - 蓝白色巨星（稀有）
          { color: '#cad7ff', temp: 'A', rarity: 0.006, luminosity: 2.5 },    // A型 - 白色主序星
          { color: '#f8f7ff', temp: 'F', rarity: 0.03, luminosity: 1.8 },     // F型 - 黄白色主序星
          { color: '#fff4ea', temp: 'G', rarity: 0.076, luminosity: 1.0 },    // G型 - 黄色主序星（太阳型）
          { color: '#ffcc6f', temp: 'K', rarity: 0.121, luminosity: 0.6 },    // K型 - 橙色主序星
          { color: '#ffad51', temp: 'M', rarity: 0.765, luminosity: 0.3 }     // M型 - 红色矮星（最常见）
        ];

        // 根据恒星类型和亮度选择光谱类型
        const starSpectralType = this.selectStarType(starId, layer.type, starTypes);
        const starType = starSpectralType;

        // 根据恒星光谱类型和光度调整亮度
        let brightness = layer.alpha * twinkle;

        // 基于真实光度调整亮度
        const luminosityFactor = Math.pow(starType.luminosity, 0.4); // 使用平方根缩放避免过度差异
        brightness *= luminosityFactor;

        // 根据层次进一步调整
        if (layer.type === 'supergiant') {
          brightness *= 1.5;
        } else if (layer.type === 'giant' || layer.type === 'bright') {
          brightness *= 1.2;
        }

        // 限制亮度范围
        brightness = Math.min(brightness, 1.0);

        this.ctx.globalAlpha = brightness;
        this.ctx.fillStyle = starType.color;

        // 绘制星星核心
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();

        // 添加星星光晕 - 基于恒星类型
        if (size > 1.0) {
          this.drawStarGlow(x, y, size, starType.color, brightness, starType.temp);
        }

        // 明亮恒星添加衍射尖峰
        if (size > 2.0 && starType.luminosity > 1.5) {
          this.drawDiffractionSpikes(x, y, size, starType.color, brightness * 0.8, starType.temp);
        }

        // 超巨星添加额外的光环效果
        if (layer.type === 'supergiant' && starType.luminosity > 3.0) {
          this.drawSuperGiantHalo(x, y, size, starType.color, brightness);
        }
      }
    });

    this.ctx.globalAlpha = 1;
  }

  calculateStarPositionWithOrbit(starId, starType, orbitSpeed) {
    // 计算星星在银河系中的位置，包含轨道运动
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.45;

    // 使用星星ID作为随机种子
    const random1 = Math.sin(starId * 12.345);
    const random2 = Math.cos(starId * 23.456);
    const random3 = Math.sin(starId * 34.567);
    const random4 = Math.cos(starId * 45.678);

    // 计算基础轨道参数
    const radiusRandom = Math.abs(random3);
    const baseRadius = this.calculateGalaxyRadius(radiusRandom, starType) * maxRadius;

    // 根据星星类型决定分布策略
    let distributionType = 'spiral';
    if (starType === 'distant' || starType === 'medium') {
      distributionType = Math.abs(random1) > 0.4 ? 'spiral' : 'random';
    } else {
      distributionType = Math.abs(random1) > 0.2 ? 'spiral' : 'random';
    }

    let x, y;

    if (distributionType === 'spiral') {
      // 沿螺旋臂分布 - 添加轨道运动
      const armIndex = Math.floor(Math.abs(random2) * 4);
      const baseArmOffset = armIndex * (Math.PI / 2);
      const spiralTightness = 0.15;

      // 轨道运动 - 基于开普勒定律，内侧星星转得更快
      const orbitalPeriod = Math.pow(baseRadius / maxRadius, 1.5); // 开普勒第三定律
      const orbitalMotion = this.time * orbitSpeed / orbitalPeriod;

      // 基础螺旋角度
      const baseSpiralAngle = baseArmOffset + (baseRadius / maxRadius) * spiralTightness * 6;

      // 添加轨道运动和个体随机运动
      const individualMotion = Math.sin(starId * 78.901 + this.time * orbitSpeed * 0.5) * 0.1;
      const finalAngle = baseSpiralAngle + orbitalMotion + individualMotion;

      // 轨道椭圆度（稍微椭圆的轨道）
      const eccentricity = 0.1 + Math.abs(random4) * 0.15;
      const radius = baseRadius * (1 + eccentricity * Math.cos(orbitalMotion * 2));

      // 螺旋臂宽度内的随机偏移
      const armWidth = radius * 0.12;
      const armOffset_x = (random4 - 0.5) * armWidth;
      const armOffset_y = (Math.sin(starId * 56.789) - 0.5) * armWidth * 0.25;

      x = centerX + Math.cos(finalAngle) * radius + armOffset_x;
      y = centerY + Math.sin(finalAngle) * radius * 0.35 + armOffset_y;

    } else {
      // 随机分布 - 银河晕中的缓慢运动
      const baseAngle = random1 * Math.PI * 2;

      // 银河晕中的缓慢随机运动
      const haloMotion = this.time * orbitSpeed * 0.3;
      const randomWalk = Math.sin(starId * 91.234 + haloMotion) * 0.2 +
                        Math.cos(starId * 65.432 + haloMotion * 0.7) * 0.15;

      const finalAngle = baseAngle + randomWalk;
      const radius = baseRadius;

      x = centerX + Math.cos(finalAngle) * radius;
      y = centerY + Math.sin(finalAngle) * radius * 0.4;
    }

    return { x, y };
  }

  calculateGalaxyRadius(random, starType) {
    // 计算星星在银河系中的径向分布
    // 使用指数分布，更多星星在中等距离

    let radiusDistribution;

    if (starType === 'distant') {
      // 遥远星星 - 更均匀分布
      radiusDistribution = Math.pow(random, 0.7);
    } else if (starType === 'supergiant' || starType === 'giant') {
      // 巨星和超巨星 - 更倾向于在螺旋臂上
      radiusDistribution = 0.3 + Math.pow(random, 1.2) * 0.6;
    } else {
      // 其他星星 - 中等距离较多
      radiusDistribution = Math.pow(random, 0.8);
    }

    return Math.min(radiusDistribution, 0.95); // 限制最大半径
  }

  selectStarType(starId, layerType, starTypes) {
    // 根据恒星层次和真实分布概率选择恒星类型
    const random = Math.abs(Math.sin(starId * 45.678));

    // 根据层次调整概率分布
    let adjustedRarities = starTypes.map(type => ({ ...type }));

    if (layerType === 'supergiant' || layerType === 'giant') {
      // 巨星层更多高光度恒星
      adjustedRarities[0].rarity *= 50;  // O型
      adjustedRarities[1].rarity *= 20;  // B型
      adjustedRarities[2].rarity *= 10;  // A型
      adjustedRarities[3].rarity *= 5;   // F型
    } else if (layerType === 'bright') {
      // 明亮恒星层
      adjustedRarities[0].rarity *= 10;  // O型
      adjustedRarities[1].rarity *= 8;   // B型
      adjustedRarities[2].rarity *= 5;   // A型
      adjustedRarities[3].rarity *= 3;   // F型
    } else if (layerType === 'distant') {
      // 遥远恒星更多红矮星
      adjustedRarities[6].rarity *= 2;   // M型
      adjustedRarities[5].rarity *= 1.5; // K型
    }

    // 归一化概率
    const totalRarity = adjustedRarities.reduce((sum, type) => sum + type.rarity, 0);
    let cumulativeProb = 0;

    for (let i = 0; i < adjustedRarities.length; i++) {
      cumulativeProb += adjustedRarities[i].rarity / totalRarity;
      if (random <= cumulativeProb) {
        return adjustedRarities[i];
      }
    }

    // 默认返回最常见的M型红矮星
    return adjustedRarities[6];
  }

  drawStarGlow(x, y, size, color, alpha, spectralType) {
    // 绘制基于恒星类型的光晕效果
    const glowSize = this.getGlowSize(spectralType, size);
    const glowGradient = this.ctx.createRadialGradient(x, y, size * 0.5, x, y, glowSize);

    // 转换十六进制颜色为rgba
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // 根据恒星类型调整光晕
    let glowIntensity = alpha * 0.6;
    if (spectralType === 'O' || spectralType === 'B') {
      glowIntensity *= 1.5; // 蓝色恒星更强的光晕
    }

    glowGradient.addColorStop(0, hexToRgba(color, glowIntensity));
    glowGradient.addColorStop(0.4, hexToRgba(color, glowIntensity * 0.6));
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    this.ctx.fill();
  }

  getGlowSize(spectralType, baseSize) {
    // 根据恒星类型返回光晕大小
    const glowMultipliers = {
      'O': 4.5,  // 蓝色超巨星 - 最大光晕
      'B': 4.0,  // 蓝白色巨星
      'A': 3.5,  // 白色主序星
      'F': 3.0,  // 黄白色主序星
      'G': 2.8,  // 黄色主序星
      'K': 2.5,  // 橙色主序星
      'M': 2.2   // 红色矮星 - 最小光晕
    };

    return baseSize * (glowMultipliers[spectralType] || 2.5);
  }

  drawDiffractionSpikes(x, y, size, color, alpha, spectralType) {
    // 绘制基于恒星类型的衍射尖峰
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;

    // 根据恒星类型调整尖峰属性
    const spikeProps = this.getSpikeProperties(spectralType, size);
    this.ctx.lineWidth = spikeProps.width;

    // 主要尖峰（垂直和水平）
    this.drawSpikePair(x, y, spikeProps.mainLength, 0); // 垂直
    this.drawSpikePair(x, y, spikeProps.mainLength, Math.PI / 2); // 水平

    // 对角尖峰（较短）
    this.ctx.lineWidth = spikeProps.width * 0.6;
    this.drawSpikePair(x, y, spikeProps.diagLength, Math.PI / 4); // 对角1
    this.drawSpikePair(x, y, spikeProps.diagLength, -Math.PI / 4); // 对角2

    // 超巨星额外的尖峰
    if (spectralType === 'O' || spectralType === 'B') {
      this.ctx.lineWidth = spikeProps.width * 0.4;
      this.drawSpikePair(x, y, spikeProps.diagLength * 0.8, Math.PI / 8);
      this.drawSpikePair(x, y, spikeProps.diagLength * 0.8, -Math.PI / 8);
    }
  }

  drawSpikePair(x, y, length, angle) {
    // 绘制一对对称的尖峰
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    this.ctx.beginPath();
    this.ctx.moveTo(x - cos * length, y - sin * length);
    this.ctx.lineTo(x + cos * length, y + sin * length);
    this.ctx.stroke();
  }

  getSpikeProperties(spectralType, size) {
    // 根据恒星类型返回尖峰属性
    const baseLength = size * 3.5;
    const properties = {
      'O': { mainLength: baseLength * 1.4, diagLength: baseLength * 1.0, width: 0.8 },
      'B': { mainLength: baseLength * 1.2, diagLength: baseLength * 0.9, width: 0.7 },
      'A': { mainLength: baseLength * 1.0, diagLength: baseLength * 0.7, width: 0.6 },
      'F': { mainLength: baseLength * 0.9, diagLength: baseLength * 0.6, width: 0.5 },
      'G': { mainLength: baseLength * 0.8, diagLength: baseLength * 0.5, width: 0.4 },
      'K': { mainLength: baseLength * 0.7, diagLength: baseLength * 0.4, width: 0.3 },
      'M': { mainLength: baseLength * 0.6, diagLength: baseLength * 0.3, width: 0.2 }
    };

    return properties[spectralType] || properties['G'];
  }

  drawSuperGiantHalo(x, y, size, color, alpha) {
    // 绘制超巨星的额外光环效果
    const haloSize = size * 6;
    const haloGradient = this.ctx.createRadialGradient(x, y, size * 2, x, y, haloSize);

    // 转换十六进制颜色为rgba
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    haloGradient.addColorStop(0, hexToRgba(color, alpha * 0.3));
    haloGradient.addColorStop(0.3, hexToRgba(color, alpha * 0.15));
    haloGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.globalAlpha = alpha * 0.6;
    this.ctx.fillStyle = haloGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, haloSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  drawNebula() {
    // 绘制简化的星云效果 - 性能优化版本
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const nebulaRegions = [
      // 只保留3个简单的星云
      {
        x: centerX + 150, y: centerY - 80,
        size: 120, color: 'rgba(255, 100, 120, 0.03)',
        drift: { x: 0.5, y: 0.3 }
      },
      {
        x: centerX - 120, y: centerY + 60,
        size: 100, color: 'rgba(100, 150, 255, 0.025)',
        drift: { x: -0.3, y: 0.4 }
      },
      {
        x: centerX + 80, y: centerY + 120,
        size: 80, color: 'rgba(100, 255, 150, 0.035)',
        drift: { x: 0.2, y: -0.2 }
      }
    ];

    nebulaRegions.forEach((nebula, index) => {
      this.drawSimpleNebula(nebula, index);
    });
  }

  drawSimpleNebula(nebula, index) {
    // 绘制简单的星云 - 单层渐变
    const time = this.time * 0.05;
    const x = nebula.x + Math.sin(time + index) * nebula.drift.x * 20;
    const y = nebula.y + Math.cos(time * 0.7 + index) * nebula.drift.y * 15;

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, nebula.size);
    gradient.addColorStop(0, nebula.color);
    gradient.addColorStop(0.6, nebula.color.replace(/[\d.]+\)$/, '0.01)'));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, nebula.size, 0, Math.PI * 2);
    this.ctx.fill();
  }







  draw3DGrid() {
    const halfSize = this.gridSize / 2;

    // 绘制纵向线（Z方向）
    for (let x = -halfSize; x <= halfSize; x++) {
      this.drawGridLine(x, 'z');
    }

    // 绘制横向线（X方向）
    for (let z = -halfSize; z <= halfSize; z++) {
      this.drawGridLine(z, 'x');
    }
  }

  drawGridLine(index, direction) {
    const points = [];
    const halfSize = this.gridSize / 2;

    // 生成线上的点
    for (let i = -halfSize; i <= halfSize; i++) {
      let x, z;
      if (direction === 'z') {
        x = index * this.gridSpacing;
        z = i * this.gridSpacing;
      } else {
        x = i * this.gridSpacing;
        z = index * this.gridSpacing;
      }

      // 计算复杂波浪高度
      const waveX = Math.sin((x * 0.008) + (this.time * this.waveSpeed)) * this.waveHeight;
      const waveZ = Math.cos((z * 0.006) + (this.time * this.waveSpeed * 0.7)) * this.waveHeight * 0.6;
      const ripple = Math.sin(Math.sqrt(x*x + z*z) * 0.01 - this.time * this.waveSpeed * 1.5) * this.waveHeight * 0.3;
      const y = waveX + waveZ + ripple;

      const projected = this.project3DTo2D(x, y, z);
      if (projected) {
        points.push(projected);
      }
    }

    if (points.length < 2) return;

    // 绘制线条
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    // 设置线条样式 - 增强版
    const distance = points[0].z;
    const alpha = Math.max(0.05, Math.min(1, (1200 - distance) / 1200));

    // 根据距离和时间选择动态颜色
    const colorIndex = Math.floor((distance / 200 + this.time * 0.1) % this.gridColors.length);
    const color = this.gridColors[colorIndex];

    // 添加脉冲效果
    const pulse = 0.7 + 0.3 * Math.sin(this.time * this.pulseSpeed + distance * 0.01);
    const finalAlpha = alpha * pulse;

    // 转换十六进制颜色为rgba
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // 绘制主线条
    this.ctx.strokeStyle = hexToRgba(color, finalAlpha);
    this.ctx.lineWidth = Math.max(0.3, 1.5 * alpha);
    this.ctx.stroke();

    // 添加多层发光效果
    if (finalAlpha > 0.3) {
      // 内层发光
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 8 * finalAlpha;
      this.ctx.lineWidth = Math.max(0.2, 1 * alpha);
      this.ctx.stroke();

      // 外层发光
      this.ctx.shadowBlur = 15 * finalAlpha;
      this.ctx.lineWidth = Math.max(0.1, 0.5 * alpha);
      this.ctx.strokeStyle = hexToRgba(this.colors.glow, finalAlpha * 0.5);
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;
    }

    // 添加节点高亮
    if (distance < 400 && finalAlpha > 0.6) {
      this.drawGridNodes(points, color, finalAlpha);
    }
  }

  drawGridNodes(points, color, alpha) {
    // 绘制网格交叉点的发光节点
    const nodeSpacing = 3; // 每3个点绘制一个节点

    for (let i = 0; i < points.length; i += nodeSpacing) {
      const point = points[i];
      const nodeSize = (1 - point.z / 1000) * 3 + 1;
      const nodePulse = Math.sin(this.time * 3 + i * 0.5) * 0.3 + 0.7;

      this.ctx.globalAlpha = alpha * nodePulse * 0.8;
      this.ctx.fillStyle = color;

      // 绘制节点核心
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, nodeSize, 0, Math.PI * 2);
      this.ctx.fill();

      // 绘制节点光晕
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = nodeSize * 4;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    this.ctx.globalAlpha = 1;
  }

  drawHorizon() {
    // 绘制增强的地平线效果
    const horizonY = this.canvas.height * 0.65;
    const horizonPulse = Math.sin(this.time * this.pulseSpeed) * 0.2 + 0.8;

    // 主地平线
    const gradient = this.ctx.createLinearGradient(0, horizonY - 60, 0, horizonY + 60);
    gradient.addColorStop(0, 'rgba(255, 0, 128, 0)');
    gradient.addColorStop(0.3, `rgba(255, 0, 128, ${0.4 * horizonPulse})`);
    gradient.addColorStop(0.5, `rgba(255, 0, 128, ${0.8 * horizonPulse})`);
    gradient.addColorStop(0.7, `rgba(255, 0, 128, ${0.4 * horizonPulse})`);
    gradient.addColorStop(1, 'rgba(255, 0, 128, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, horizonY - 60, this.canvas.width, 120);

    // 添加地平线扫描效果
    const scanOffset = (this.time * 50) % this.canvas.width;
    const scanGradient = this.ctx.createLinearGradient(scanOffset - 100, 0, scanOffset + 100, 0);
    scanGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
    scanGradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.6 * horizonPulse})`);
    scanGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

    this.ctx.fillStyle = scanGradient;
    this.ctx.fillRect(0, horizonY - 30, this.canvas.width, 60);
  }

  drawScanlines() {
    // 绘制CRT扫描线效果
    const scanlineOffset = (this.time * this.scanlineSpeed) % 4;

    this.ctx.globalAlpha = 0.1;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;

    for (let y = scanlineOffset; y < this.canvas.height; y += 4) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // 添加随机闪烁的数据流线条
    this.drawDataStreams();

    this.ctx.globalAlpha = 1;
  }

  drawDataStreams() {
    // 绘制增强的数据流效果
    const streamCount = 8;

    for (let i = 0; i < streamCount; i++) {
      const x = (this.canvas.width / streamCount) * i + (this.canvas.width / streamCount) / 2;
      const speed = (100 + i * 30) * this.dataStreamSpeed;
      const offset = (this.time * speed) % (this.canvas.height + 150);

      // 数据流的长度和透明度
      const streamLength = 60 + Math.sin(this.time + i) * 20;
      const startY = offset - 150;

      // 选择数据流颜色
      const colorIndex = i % this.gridColors.length;
      const streamColor = this.gridColors[colorIndex];

      for (let j = 0; j < streamLength; j++) {
        const y = startY + j * 3;
        if (y >= 0 && y <= this.canvas.height) {
          const alpha = (streamLength - j) / streamLength * 0.8;
          const width = Math.max(0.5, (streamLength - j) / streamLength * 2);

          this.ctx.globalAlpha = alpha;
          this.ctx.strokeStyle = streamColor;
          this.ctx.lineWidth = width;

          // 添加发光效果
          if (j < streamLength / 4) {
            this.ctx.shadowColor = streamColor;
            this.ctx.shadowBlur = width * 3;
          }

          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x, y + 2);
          this.ctx.stroke();

          this.ctx.shadowBlur = 0;
        }
      }
    }
  }

  drawPulseEffects() {
    // 绘制多层脉冲圆圈 - 定位在头像logo位置
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height * 0.35; // 头像通常在上半部分

    // 主脉冲圆圈 - 适合头像大小
    for (let i = 0; i < 4; i++) {
      const phase = this.time * this.pulseSpeed + i * Math.PI * 0.5;
      const radius = 40 + i * 25 + Math.sin(phase) * 10; // 更适合头像的尺寸
      const alpha = (Math.sin(phase) + 1) * 0.12;

      const colorIndex = i % this.gridColors.length;
      const color = this.gridColors[colorIndex];

      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.5;

      // 添加发光效果
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 10;

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;
    }

    // 添加能量波纹 - 头像周围的光环
    const waveRadius = 80 + Math.sin(this.time * this.pulseSpeed * 2) * 30;
    const waveAlpha = (Math.sin(this.time * this.pulseSpeed * 2) + 1) * 0.08;

    this.ctx.globalAlpha = waveAlpha;
    this.ctx.strokeStyle = this.colors.electric;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = this.colors.electric;
    this.ctx.shadowBlur = 20;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }

  drawBorderGlow() {
    // 绘制增强的屏幕边缘发光效果
    const glowSize = 30;
    const pulse = (Math.sin(this.time * this.pulseSpeed * 2) + 1) * 0.5;
    const sidePulse = (Math.cos(this.time * this.pulseSpeed * 1.5) + 1) * 0.5;

    // 顶部发光 - 青色
    const topGradient = this.ctx.createLinearGradient(0, 0, 0, glowSize);
    topGradient.addColorStop(0, `rgba(0, 255, 255, ${0.4 * pulse})`);
    topGradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.2 * pulse})`);
    topGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

    this.ctx.fillStyle = topGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, glowSize);

    // 底部发光 - 霓虹粉
    const bottomGradient = this.ctx.createLinearGradient(0, this.canvas.height - glowSize, 0, this.canvas.height);
    bottomGradient.addColorStop(0, 'rgba(255, 0, 128, 0)');
    bottomGradient.addColorStop(0.5, `rgba(255, 0, 128, ${0.3 * pulse})`);
    bottomGradient.addColorStop(1, `rgba(255, 0, 128, ${0.6 * pulse})`);

    this.ctx.fillStyle = bottomGradient;
    this.ctx.fillRect(0, this.canvas.height - glowSize, this.canvas.width, glowSize);

    // 左边缘发光 - 绿色
    const leftGradient = this.ctx.createLinearGradient(0, 0, glowSize, 0);
    leftGradient.addColorStop(0, `rgba(0, 255, 128, ${0.3 * sidePulse})`);
    leftGradient.addColorStop(0.5, `rgba(0, 255, 128, ${0.15 * sidePulse})`);
    leftGradient.addColorStop(1, 'rgba(0, 255, 128, 0)');

    this.ctx.fillStyle = leftGradient;
    this.ctx.fillRect(0, 0, glowSize, this.canvas.height);

    // 右边缘发光 - 紫色
    const rightGradient = this.ctx.createLinearGradient(this.canvas.width - glowSize, 0, this.canvas.width, 0);
    rightGradient.addColorStop(0, 'rgba(255, 0, 255, 0)');
    rightGradient.addColorStop(0.5, `rgba(255, 0, 255, ${0.15 * sidePulse})`);
    rightGradient.addColorStop(1, `rgba(255, 0, 255, ${0.3 * sidePulse})`);

    this.ctx.fillStyle = rightGradient;
    this.ctx.fillRect(this.canvas.width - glowSize, 0, glowSize, this.canvas.height);

    // 添加角落强化发光
    this.drawCornerGlow(glowSize, pulse);
  }

  drawCornerGlow(glowSize, pulse) {
    // 绘制四个角落的强化发光效果
    const cornerSize = glowSize * 2;
    const cornerAlpha = pulse * 0.4;

    // 左上角
    const topLeftGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, cornerSize);
    topLeftGradient.addColorStop(0, `rgba(0, 255, 255, ${cornerAlpha})`);
    topLeftGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

    this.ctx.fillStyle = topLeftGradient;
    this.ctx.fillRect(0, 0, cornerSize, cornerSize);

    // 右上角
    const topRightGradient = this.ctx.createRadialGradient(this.canvas.width, 0, 0, this.canvas.width, 0, cornerSize);
    topRightGradient.addColorStop(0, `rgba(255, 0, 255, ${cornerAlpha})`);
    topRightGradient.addColorStop(1, 'rgba(255, 0, 255, 0)');

    this.ctx.fillStyle = topRightGradient;
    this.ctx.fillRect(this.canvas.width - cornerSize, 0, cornerSize, cornerSize);

    // 左下角
    const bottomLeftGradient = this.ctx.createRadialGradient(0, this.canvas.height, 0, 0, this.canvas.height, cornerSize);
    bottomLeftGradient.addColorStop(0, `rgba(0, 255, 128, ${cornerAlpha})`);
    bottomLeftGradient.addColorStop(1, 'rgba(0, 255, 128, 0)');

    this.ctx.fillStyle = bottomLeftGradient;
    this.ctx.fillRect(0, this.canvas.height - cornerSize, cornerSize, cornerSize);

    // 右下角
    const bottomRightGradient = this.ctx.createRadialGradient(this.canvas.width, this.canvas.height, 0, this.canvas.width, this.canvas.height, cornerSize);
    bottomRightGradient.addColorStop(0, `rgba(255, 0, 128, ${cornerAlpha})`);
    bottomRightGradient.addColorStop(1, 'rgba(255, 0, 128, 0)');

    this.ctx.fillStyle = bottomRightGradient;
    this.ctx.fillRect(this.canvas.width - cornerSize, this.canvas.height - cornerSize, cornerSize, cornerSize);
  }

  onResize() {
    // console.log('赛博朋克3D网格尺寸更新:', this.canvas.width, 'x', this.canvas.height);
  }

  destroy() {
    // console.log('赛博朋克3D网格已清理');
  }
}
