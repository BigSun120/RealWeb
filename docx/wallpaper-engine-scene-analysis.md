# Wallpaper Engine场景文件结构完整解析

## 概述

本文档详细分析了Wallpaper Engine场景目录 `68c1c30bd2db8bad98151294` 的完整文件结构，这是一个名为"Cyberpunk: Edgerunner-Lucy[4K]"的复杂场景，包含3D模型、多层纹理、特效、粒子系统和音频。

## 📁 根目录结构

```
68c1c30bd2db8bad98151294/
├── preview.gif          # 预览动图
└── extracted/           # 解压后的场景文件
```

## 📁 extracted/ - 核心场景数据

### 🎯 核心配置文件

#### 1. scene.json - 场景主文件
- **作用**：场景的核心配置文件，定义整个场景的结构
- **内容**：
  - 所有对象的位置、尺寸、变换信息
  - 相机设置（位置、视角、投影参数）
  - 光照配置（环境光、天空光等）
  - 渲染参数（清除颜色、FOV、近远裁剪面）
  - 对象层级关系和渲染顺序
- **关键字段**：
  - `camera`: 相机配置
  - `general`: 通用渲染设置
  - `objects`: 场景中所有对象的数组

#### 2. project.json - 项目配置文件
- **作用**：壁纸的元数据和用户交互配置
- **内容**：
  - 壁纸元数据（标题、描述、标签、作者信息）
  - 用户可调参数定义（开关、滑块、颜色选择器等）
  - 支持的功能标志（音频处理、交互等）
- **关键字段**：
  - `title`: "Cyberpunk: Edgerunner-Lucy[4K]"
  - `type`: "scene"
  - `general.properties`: 用户可调参数

### 🎨 materials/ - 材质和纹理系统

```
materials/
├── 基础纹理文件
│   ├── Lucy.json, Lucy.png, Lucy.tex, Lucy.tex-json    # Lucy角色纹理
│   ├── d.json, d.png, d.tex, d.tex-json               # 纹理d
│   ├── h.json, h.png, h.tex, h.tex-json               # 纹理h
│   ├── 吊瓶.json, 吊瓶.png, 吊瓶.tex, 吊瓶.tex-json    # 中文命名纹理
│   └── 图层 44.json, 图层 44.png, 图层 44.tex, 图层 44.tex-json
├── effects/           # 特效材质定义
├── masks/            # 遮罩纹理（用于特效遮罩）
├── particle/         # 粒子材质
├── presets/          # 预设材质
└── workshop/         # Workshop资源
    ├── 2079971872/   # 地球相关纹理包
    │   ├── Earth_Clouds_6K.png      # 地球云层纹理
    │   ├── Earth_Illumination_6K.jpg # 地球光照纹理
    │   ├── atmosphere.png           # 大气层效果
    │   ├── day.png, night1.png      # 昼夜切换纹理
    │   └── planetmask.png           # 行星遮罩
    └── 3502639183/   # 其他Workshop资源包
```

#### 材质文件格式说明：
- **.json** - 材质定义文件，包含：
  - 着色器引用
  - 混合模式设置
  - 纹理引用和参数
  - 渲染状态配置
- **.png/.jpg** - 标准格式的纹理图片
- **.tex** - Wallpaper Engine专有的优化纹理格式
- **.tex-json** - 纹理元数据（压缩格式、mipmap等）

### 🎭 models/ - 3D模型和对象定义

```
models/
├── Lucy.json          # Lucy对象定义
├── Lucy_puppet.mdl    # Lucy的3D模型文件
├── d.json, h.json     # 其他对象定义
├── 吊瓶.json, 图层 44.json
└── workshop/          # Workshop模型资源
```

#### 模型文件说明：
- **.json** - 对象定义文件，包含：
  - 材质引用路径
  - 自动尺寸设置
  - 3D模型引用
- **.mdl** - Wallpaper Engine专有的3D模型格式

#### Lucy.json示例：
```json
{
    "autosize": true,
    "material": "materials/Lucy.json",
    "puppet": "models/Lucy_puppet.mdl"
}
```

### ✨ effects/ - 特效系统

```
effects/
├── cloudmotion/       # 云层运动效果
├── filmgrain/         # 胶片颗粒效果
├── lightshafts/       # 光束效果
├── opacity/           # 透明度效果
├── shake/             # 震动效果
├── shine/             # 发光效果（多个子效果）
├── waterwaves/        # 水波效果
└── workshop/          # Workshop特效
```

#### 每个特效目录包含：
- **effect.json** - 特效定义和参数
- **材质文件** - 特效使用的材质定义
- **依赖关系** - 引用的着色器和资源

#### 特效定义示例（cloudmotion）：
```json
{
    "version": 2,
    "replacementkey": "cloudmotion",
    "name": "ui_editor_effect_cloudmotion_title",
    "description": "ui_editor_effect_cloudmotion_description",
    "group": "animate",
    "passes": [
        {
            "material": "materials/effects/cloudmotion.json"
        }
    ],
    "dependencies": [
        "materials/effects/cloudmotion.json",
        "shaders/effects/cloudmotion.frag",
        "shaders/effects/cloudmotion.vert"
    ]
}
```

### 🎆 particles/ - 粒子系统

```
particles/
├── star.json, star2.json      # 星星粒子效果
├── 十字星.json, 短.json, 长2.json  # 中文命名粒子
├── presets/                   # 粒子预设
│   ├── shootingstar.json      # 流星预设
│   └── shootingstarglow.json  # 流星光晕预设
└── workshop/                  # Workshop粒子资源
```

#### 粒子系统组件：
1. **控制点** - 粒子系统的空间控制点
2. **发射器** - 粒子生成规则（位置、速率）
3. **初始化器** - 粒子初始属性（生命周期、大小、颜色）
4. **操作器** - 粒子行为（淡入淡出、振荡、运动）
5. **渲染器** - 粒子渲染方式（精灵、网格等）

#### 粒子配置示例：
```json
{
    "emitter": [
        {
            "distancemax": "2000 800 0",
            "id": 5,
            "name": "boxrandom",
            "rate": 40
        }
    ],
    "initializer": [
        {
            "id": 2,
            "max": 14,
            "min": 7,
            "name": "lifetimerandom"
        }
    ],
    "material": "materials/particle/halo_1_1.json",
    "maxcount": 150
}
```

### 🎨 shaders/ - 着色器系统

```
shaders/
├── effects/           # 特效着色器
│   ├── cloudmotion.frag/.vert    # 云层运动着色器
│   ├── filmgrain.frag/.vert      # 胶片颗粒着色器
│   ├── lightshafts.frag/.vert    # 光束着色器
│   ├── shine_*.frag/.vert        # 发光系列着色器
│   └── waterwaves.frag/.vert     # 水波着色器
└── workshop/          # Workshop着色器
```

#### 着色器文件类型：
- **.frag** - 片段着色器（Fragment Shader）
  - 处理像素级的颜色计算
  - 实现纹理采样、光照计算、特效处理
- **.vert** - 顶点着色器（Vertex Shader）
  - 处理顶点变换和属性传递
  - 实现坐标变换、动画变形

#### 着色器示例（cloudmotion.frag）：
```glsl
#include "common.h"

uniform sampler2D g_Texture0; // 帧缓冲
uniform sampler2D g_Texture1; // 透明度遮罩
uniform sampler2D g_Texture2; // 柏林噪声

uniform float u_amount;    // 运动强度
uniform float u_direction; // 运动方向

void main() {
    // 采样噪声纹理
    vec3 noise = texSample2D(g_Texture2, v_NoiseCoord).rgb;

    // 计算偏移
    vec2 offset = vec2((noise.x * 2.0 - 1.0) * u_amount, 0.0);
    offset = rotateVec2(offset, u_direction);

    // 应用偏移采样
    vec2 uvs = v_TexCoord.xy + offset;
    gl_FragColor = texSample2D(g_Texture0, uvs);
}
```

### 📜 scripts/ - 脚本系统

```
scripts/
└── camera_paths_1640.json    # 相机路径动画配置
```

#### 脚本功能：
- **相机动画** - 定义相机运动路径
- **交互逻辑** - 处理用户交互
- **动态效果** - 控制场景动态变化

#### 当前状态：
```json
{
    "paths": []  // 当前场景没有相机动画路径
}
```

### 🎵 sounds/ - 音频系统

```
sounds/
└── I Really Want to Stay at Your House (Cyberpunk Edgerunners Lofi).mp3
```

#### 音频功能：
- **背景音乐** - 循环播放的背景音轨
- **音频可视化** - 支持音频频谱分析
- **用户控制** - 可通过project.json中的参数控制

## 🎯 Wallpaper Engine渲染流程分析

### 标准渲染管线：

1. **初始化阶段**：
   - 加载 `scene.json` 获取场景配置
   - 解析相机、光照、渲染设置
   - 建立对象层级关系

2. **资源加载阶段**：
   - 从 `models/` 读取对象定义
   - 从 `materials/` 加载纹理和材质
   - 从 `shaders/` 编译着色器程序
   - 从 `particles/` 初始化粒子系统

3. **渲染准备阶段**：
   - 设置渲染状态和参数
   - 创建帧缓冲和渲染目标
   - 初始化特效处理链

4. **主渲染循环**：
   - 按层级顺序渲染对象
   - 应用材质和着色器
   - 处理粒子系统
   - 执行后处理特效

5. **音频处理**：
   - 播放背景音乐
   - 处理音频可视化（如果启用）

### 关键技术特点：

1. **分层渲染**：
   - 背景层（solidlayer, composelayer）
   - 对象层（3D模型、2D精灵）
   - 特效层（后处理效果）
   - 粒子层（粒子系统）
   - UI层（fullscreenlayer）

2. **材质系统**：
   - 基于JSON的材质定义
   - 支持多通道渲染
   - 灵活的着色器参数绑定

3. **特效管线**：
   - 模块化的特效系统
   - 可组合的后处理效果
   - 实时参数调节

## 🔍 当前实现的问题分析

### 已发现的关键问题：

1. **缺失纹理**：
   - `Earth_Diffuse_6K.png` 文件不存在
   - 只有对应的 `.json` 定义文件
   - 导致地球纹理无法正确显示

2. **材质系统不完整**：
   - 当前只处理了 `.png` 图片文件
   - 忽略了 `.json` 材质定义中的着色器和渲染参数
   - 没有实现混合模式和渲染状态

3. **特效系统缺失**：
   - 完全忽略了 `effects/` 目录
   - 没有实现后处理特效管线
   - 缺少着色器支持

4. **粒子系统缺失**：
   - 没有实现粒子发射器
   - 缺少粒子行为模拟
   - 星星和流星效果无法显示

5. **3D模型支持不足**：
   - 没有处理 `.mdl` 模型文件
   - Lucy的3D模型被简化为2D平面

6. **音频系统缺失**：
   - 没有加载和播放背景音乐
   - 缺少音频可视化支持

### 渲染质量问题：

1. **坐标系统**：
   - WE使用复杂的相机系统
   - 当前实现的坐标转换不够精确

2. **尺寸计算**：
   - 对象尺寸限制逻辑有误
   - 没有正确处理autosize属性

3. **层级排序**：
   - 缺少正确的深度排序
   - 对象遮挡关系不正确

## 📋 改进建议

### 短期目标（基础渲染）：
1. 修复尺寸限制逻辑
2. 实现正确的坐标系统转换
3. 添加基础的材质系统支持
4. 处理缺失纹理的fallback机制

### 中期目标（特效支持）：
1. 实现基础的后处理特效
2. 添加粒子系统支持
3. 实现音频播放功能
4. 优化渲染性能

### 长期目标（完整支持）：
1. 完整的着色器系统
2. 3D模型渲染支持
3. 复杂特效管线
4. 用户交互参数支持

## 📊 场景复杂度评估

- **纹理数量**：约50+个纹理文件
- **特效数量**：7种主要特效类型
- **粒子系统**：6个不同的粒子效果
- **3D模型**：1个主要角色模型
- **着色器**：20+个着色器文件
- **音频文件**：1个背景音乐

**结论**：这是一个高复杂度的Wallpaper Engine场景，需要完整的渲染管线才能正确显示。当前的Web实现只覆盖了约10%的功能。

## 🎯 下一步行动计划

### 立即修复（优先级：高）：
1. **修复尺寸限制逻辑** - 解决Lucy对象过大问题
2. **实现scene.json的clearcolor** - 使用正确的背景色
3. **优化坐标转换** - 使用scene.json中的相机参数
4. **处理缺失纹理** - 创建fallback纹理或跳过

### 功能扩展（优先级：中）：
1. **基础材质系统** - 解析.json材质定义
2. **简化特效支持** - 实现基础的后处理
3. **音频播放** - 添加背景音乐支持
4. **性能优化** - 减少不必要的渲染调用

### 完整实现（优先级：低）：
1. **粒子系统** - 实现完整的粒子渲染
2. **3D模型支持** - 处理.mdl文件
3. **着色器系统** - 支持自定义着色器
4. **用户交互** - 实现project.json中的参数控制
