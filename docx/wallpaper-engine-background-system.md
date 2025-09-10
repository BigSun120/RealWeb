# Wallpaper Engine背景管理系统方案

## 📋 项目概述

### 目标
开发一个后台管理系统，支持上传Wallpaper Engine场景压缩包，并配置在登录、注册、首页三个页面作为动态背景。

### 技术要求
- 完整还原Wallpaper Engine场景的视觉效果
- 支持标准WE场景文件结构（project.json + scene.pkg）
- 仅支持三个页面：登录页、注册页、首页

## 🔍 PKG格式解析方案

### repkg工具使用方案 ⭐

**项目地址**: https://github.com/notscuffed/repkg

**工具特性**:
- ✅ 完整的PKG文件解压功能
- ✅ TEX纹理文件转换为标准图片格式
- ✅ 支持批量处理和递归搜索
- ✅ 可复制project.json和预览文件
- ✅ 命令行工具，易于集成

**部署方式**:
1. **下载预编译版本**: 从GitHub Releases下载repkg.exe
2. **放置位置**: `backend/tools/repkg.exe`
3. **Node.js集成**: 通过子进程调用命令行工具

**关键命令**:
```bash
# 基础解压PKG文件
repkg extract scene.pkg

# 解压并复制项目文件
repkg extract -c -o ./output scene.pkg

# 批量处理文件夹中的PKG
repkg extract -r -c -o ./output /path/to/wallpaper/folder
```

### Node.js集成实现
```javascript
// PKG解析服务
class WallpaperExtractor {
  constructor() {
    this.repkgPath = path.join(__dirname, '../tools/repkg.exe');
    this.tempDir = path.join(__dirname, '../temp/wallpaper-extract');
  }

  async extractWallpaperScene(zipFilePath, sceneId) {
    try {
      // 1. 解压上传的ZIP文件
      const extractPath = path.join(this.tempDir, sceneId);
      await this.extractZip(zipFilePath, extractPath);

      // 2. 查找scene.pkg文件
      const pkgFile = await this.findPkgFile(extractPath);
      if (!pkgFile) {
        throw new Error('未找到scene.pkg文件');
      }

      // 3. 使用repkg解压PKG文件
      const outputPath = path.join(extractPath, 'extracted');
      await this.extractPkg(pkgFile, outputPath);

      // 4. 解析project.json
      const projectJson = await this.loadProjectJson(extractPath);

      // 5. 分类和处理资源文件
      const assets = await this.processAssets(outputPath);

      return {
        sceneId,
        metadata: projectJson,
        assets,
        extractPath: outputPath
      };

    } catch (error) {
      throw new Error(`场景解析失败: ${error.message}`);
    }
  }

  async extractPkg(pkgPath, outputPath) {
    return new Promise((resolve, reject) => {
      // 使用repkg命令: extract -c -o outputPath pkgPath
      const command = `"${this.repkgPath}" extract -c -o "${outputPath}" "${pkgPath}"`;

      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`repkg执行失败: ${error.message}`));
        } else {
          console.log('repkg输出:', stdout);
          resolve(outputPath);
        }
      });
    });
  }

  async processAssets(extractPath) {
    const files = await this.scanDirectory(extractPath);

    return {
      textures: files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')),
      models: files.filter(f => f.endsWith('.json') && f.includes('models')),
      shaders: files.filter(f => f.endsWith('.frag') || f.endsWith('.vert')),
      materials: files.filter(f => f.endsWith('.json') && f.includes('materials')),
      particles: files.filter(f => f.endsWith('.json') && f.includes('particles')),
      audio: files.filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg')),
      other: files.filter(f => !this.isKnownAssetType(f))
    };
  }
}
```

## 🏗️ 系统架构设计

### 技术栈
- **后端**: Node.js + Express + MongoDB
- **前端管理**: Vue 3 + Element Plus
- **渲染引擎**: Three.js + WebGL
- **文件处理**: Multer + JSZip + repkg

### 核心模块

#### 1. 文件上传处理模块
```javascript
class WallpaperUploadHandler {
  async processUpload(zipFile) {
    // 1. 解压ZIP文件
    const extractPath = await this.extractZip(zipFile);
    
    // 2. 验证文件结构
    const isValid = await this.validateStructure(extractPath);
    
    // 3. 解析PKG文件
    const sceneData = await this.extractPkg(extractPath);
    
    // 4. 生成预览图
    const previewUrl = await this.generatePreview(extractPath);
    
    return { sceneData, previewUrl, extractPath };
  }
}
```

#### 2. 场景解析模块
```javascript
class WallpaperSceneParser {
  async parseScene(scenePath) {
    const projectJson = await this.loadProjectJson(scenePath);
    const sceneAssets = await this.extractSceneAssets(scenePath);
    
    return {
      metadata: this.parseMetadata(projectJson),
      models: sceneAssets.models,
      textures: sceneAssets.textures,
      shaders: sceneAssets.shaders,
      particles: sceneAssets.particles,
      audio: sceneAssets.audio
    };
  }
}
```

#### 3. Three.js渲染引擎
```javascript
class WallpaperRenderer {
  constructor(container, sceneData) {
    this.container = container;
    this.sceneData = sceneData;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
  }
  
  async init() {
    await this.loadAssets();
    this.createScene();
    this.setupAnimations();
    this.startRenderLoop();
  }
}
```

## 💾 数据库设计

### wallpaper_scenes 表
```sql
CREATE TABLE wallpaper_scenes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  workshop_id VARCHAR(50),
  file_path VARCHAR(500) NOT NULL,
  preview_url VARCHAR(500),
  metadata JSON,
  file_size BIGINT,
  status ENUM('processing', 'ready', 'error') DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### page_backgrounds 表
```sql
CREATE TABLE page_backgrounds (
  id VARCHAR(36) PRIMARY KEY,
  page_type ENUM('login', 'register', 'home') NOT NULL UNIQUE,
  scene_id VARCHAR(36),
  render_settings JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (scene_id) REFERENCES wallpaper_scenes(id) ON DELETE SET NULL
);
```

## 🎨 管理界面设计

### 场景管理页面
```vue
<template>
  <div class="wallpaper-manager">
    <!-- 上传区域 -->
    <el-card class="upload-section">
      <template #header>
        <h3>上传Wallpaper Engine场景</h3>
      </template>
      
      <el-upload
        class="scene-uploader"
        drag
        :action="uploadUrl"
        accept=".zip,.rar,.7z"
        :before-upload="validateUpload"
        :on-success="handleUploadSuccess"
      >
        <el-icon><upload-filled /></el-icon>
        <div class="upload-text">
          拖拽WE场景压缩包到此处，或点击上传
        </div>
        <div class="upload-tip">
          支持包含project.json和scene.pkg的标准场景文件夹
        </div>
      </el-upload>
    </el-card>

    <!-- 场景列表 -->
    <el-card class="scenes-section">
      <template #header>
        <h3>场景库</h3>
      </template>
      
      <div class="scenes-grid">
        <div v-for="scene in scenes" :key="scene.id" class="scene-card">
          <div class="scene-preview">
            <img :src="scene.previewUrl" />
            <div class="scene-actions">
              <el-button @click="previewScene(scene)">预览</el-button>
              <el-button type="danger" @click="deleteScene(scene)">删除</el-button>
            </div>
          </div>
          <div class="scene-info">
            <h4>{{ scene.name }}</h4>
            <p>{{ scene.description }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 页面配置 -->
    <el-card class="config-section">
      <template #header>
        <h3>页面背景配置</h3>
      </template>
      
      <el-form :model="pageConfigs" label-width="100px">
        <el-form-item label="登录页">
          <scene-selector v-model="pageConfigs.login" :scenes="scenes" />
        </el-form-item>
        <el-form-item label="注册页">
          <scene-selector v-model="pageConfigs.register" :scenes="scenes" />
        </el-form-item>
        <el-form-item label="首页">
          <scene-selector v-model="pageConfigs.home" :scenes="scenes" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveConfigs">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
```

## 🚀 API接口设计

### 场景管理接口
```javascript
// POST /api/admin/wallpaper/upload
// 上传场景压缩包
router.post('/upload', upload.single('scene'), async (req, res) => {
  try {
    const result = await wallpaperService.processUpload(req.file);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/admin/wallpaper/scenes
// 获取场景列表
router.get('/scenes', async (req, res) => {
  const scenes = await WallpaperScene.find().sort({ createdAt: -1 });
  res.json({ success: true, data: scenes });
});

// DELETE /api/admin/wallpaper/scenes/:id
// 删除场景
router.delete('/scenes/:id', async (req, res) => {
  await wallpaperService.deleteScene(req.params.id);
  res.json({ success: true });
});
```

### 页面配置接口
```javascript
// PUT /api/admin/wallpaper/page-config
// 配置页面背景
router.put('/page-config', async (req, res) => {
  const { pageType, sceneId, settings } = req.body;
  
  await PageBackground.upsert({
    pageType,
    sceneId,
    renderSettings: settings,
    isActive: true
  });
  
  res.json({ success: true });
});

// GET /api/wallpaper/page-config/:pageType
// 获取页面背景配置（前端调用）
router.get('/page-config/:pageType', async (req, res) => {
  const config = await PageBackground.findOne({
    pageType: req.params.pageType,
    isActive: true
  }).populate('sceneId');
  
  res.json({ success: true, data: config });
});
```

## ⚡ 前端集成方案

### 背景组件
```vue
<template>
  <div class="wallpaper-background" ref="container">
    <canvas ref="canvas" class="wallpaper-canvas"></canvas>
  </div>
</template>

<script>
import { WallpaperRenderer } from '@/utils/wallpaper/WallpaperRenderer';

export default {
  name: 'WallpaperBackground',
  props: {
    pageType: {
      type: String,
      required: true,
      validator: value => ['login', 'register', 'home'].includes(value)
    }
  },
  
  async mounted() {
    await this.loadAndRenderBackground();
  },
  
  methods: {
    async loadAndRenderBackground() {
      try {
        // 获取页面背景配置
        const config = await this.getPageConfig(this.pageType);
        if (!config || !config.sceneId) return;
        
        // 加载场景数据
        const sceneData = await this.loadSceneData(config.sceneId);
        
        // 初始化渲染器
        this.renderer = new WallpaperRenderer(this.$refs.container, sceneData);
        await this.renderer.init();
        
      } catch (error) {
        console.error('背景加载失败:', error);
      }
    }
  }
};
</script>
```

### 页面集成
```vue
<!-- 登录页 -->
<template>
  <div class="login-page">
    <WallpaperBackground page-type="login" />
    <div class="login-form">
      <!-- 登录表单内容 -->
    </div>
  </div>
</template>

<!-- 注册页 -->
<template>
  <div class="register-page">
    <WallpaperBackground page-type="register" />
    <div class="register-form">
      <!-- 注册表单内容 -->
    </div>
  </div>
</template>

<!-- 首页 -->
<template>
  <div class="home-page">
    <WallpaperBackground page-type="home" />
    <div class="home-content">
      <!-- 首页内容 -->
    </div>
  </div>
</template>
```

## 📈 开发计划

### 第一阶段：基础功能 (1-2周)
- [ ] 下载并集成repkg工具
- [ ] 实现文件上传和ZIP解压功能
- [ ] 创建数据库表结构
- [ ] 开发基础的管理界面
- [ ] 实现PKG文件解析和资源提取

### 第二阶段：渲染引擎 (2-3周)
- [ ] 开发Three.js场景渲染器
- [ ] 实现纹理加载和材质系统
- [ ] 开发着色器转换器（WE -> WebGL）
- [ ] 实现粒子系统
- [ ] 集成音频播放功能

### 第三阶段：前端集成 (1-2周)
- [ ] 开发背景组件
- [ ] 集成到登录、注册、首页
- [ ] 实现页面配置功能
- [ ] 添加性能监控

### 第四阶段：优化完善 (1周)
- [ ] 性能优化和缓存策略
- [ ] 错误处理和降级方案
- [ ] 用户体验优化
- [ ] 全面测试和调试

## 🎯 预期效果

1. **管理员**可以轻松上传WE场景压缩包
2. **自动解析**场景文件并生成预览
3. **灵活配置**三个页面的背景场景
4. **完整还原**原始场景的视觉效果
5. **性能优化**确保页面流畅运行

## ⚠️ 风险评估

1. **PKG格式复杂性**：可能需要额外的逆向工程工作
2. **性能影响**：复杂场景可能影响页面加载速度
3. **兼容性问题**：不同设备的WebGL支持差异
4. **文件大小**：WE场景文件通常较大，需要优化加载策略

## 💰 成本估算

- **开发时间**：5-7周（有现成PKG解析库大幅降低难度）
- **技术难度**：中等（repkg库解决了最大技术难点）
- **维护成本**：中等
- **用户价值**：高（独特的视觉体验，差异化竞争优势）
- **投资回报**：高（提升品牌形象，增加用户粘性）

## 🎯 关键成功因素

1. **repkg库的稳定性**：确保PKG解析的可靠性
2. **性能优化**：保证复杂场景的流畅运行
3. **兼容性处理**：适配不同设备和浏览器
4. **用户体验**：提供简洁易用的管理界面
5. **降级方案**：为低性能设备提供备选方案

## 📋 部署和使用指南

### 1. 下载repkg工具
```bash
# 1. 访问GitHub Releases页面
# https://github.com/notscuffed/repkg/releases

# 2. 下载最新版本的repkg.exe

# 3. 创建工具目录
mkdir backend/tools

# 4. 将repkg.exe放入工具目录
# backend/tools/repkg.exe
```

### 2. 项目集成步骤
```bash
# 1. 安装依赖
npm install multer jszip

# 2. 创建必要目录
mkdir backend/temp/wallpaper-extract
mkdir backend/uploads/wallpaper-scenes
mkdir frontend/public/wallpaper-assets

# 3. 配置环境变量
echo "WALLPAPER_UPLOAD_PATH=./uploads/wallpaper-scenes" >> .env
echo "WALLPAPER_EXTRACT_PATH=./temp/wallpaper-extract" >> .env
```

### 3. 使用流程
1. **管理员上传**: 上传包含标准WE场景结构的ZIP文件
2. **自动解析**: 系统自动解压ZIP，使用repkg解析PKG文件
3. **资源处理**: 转换TEX纹理，分类资源文件
4. **数据库存储**: 保存场景元数据和文件路径
5. **页面配置**: 在管理界面配置哪个页面使用哪个场景
6. **前端渲染**: Three.js加载场景数据并渲染

### 4. 技术依赖
- **repkg.exe**：PKG文件解析（必需）
- **Three.js**：3D渲染引擎
- **JSZip**：ZIP文件处理
- **Multer**：文件上传处理
- **Sharp**：图片处理（可选）

---

*此方案专注于Wallpaper Engine场景的完整还原，通过现有PKG解析库降低开发难度，限制页面范围控制复杂度。*
