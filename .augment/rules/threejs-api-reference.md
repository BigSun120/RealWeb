# Three.js API Reference and Best Practices

## 基本信息
- **当前版本**: r179 (2024年最新版本)
- **官方文档**: https://threejs.org/docs/
- **GitHub**: https://github.com/mrdoob/three.js

## 核心对象和API

### 1. 渲染器 (WebGLRenderer)
```javascript
const renderer = new THREE.WebGLRenderer({
  canvas: canvasElement,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance'
});

// 基本设置
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0);

// 阴影设置
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 色调映射
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
```

### 2. 场景 (Scene)
```javascript
const scene = new THREE.Scene();

// 雾效果
scene.fog = new THREE.Fog(0x000000, near, far);
scene.fog = new THREE.FogExp2(0x000000, density);

// 背景
scene.background = new THREE.Color(0x000000);
scene.background = new THREE.CubeTexture(urls);
```

### 3. 相机 (Camera)
```javascript
// 透视相机
const camera = new THREE.PerspectiveCamera(
  fov,        // 视野角度
  aspect,     // 宽高比
  near,       // 近裁剪面
  far         // 远裁剪面
);

// 正交相机
const camera = new THREE.OrthographicCamera(
  left, right, top, bottom, near, far
);

// 相机控制
camera.position.set(x, y, z);
camera.lookAt(x, y, z);
camera.updateProjectionMatrix();
```

### 4. 几何体 (Geometry)
```javascript
// 基本几何体
const geometry = new THREE.BoxGeometry(width, height, depth);
const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
const geometry = new THREE.PlaneGeometry(width, height);
const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height);

// 缓冲几何体
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array([...]);
const colors = new Float32Array([...]);
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// 从点创建
const points = [new THREE.Vector3(x, y, z), ...];
const geometry = new THREE.BufferGeometry().setFromPoints(points);
```

### 5. 材质 (Material)
```javascript
// 基础材质
const material = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.5
});

// 物理材质
const material = new THREE.MeshPhongMaterial({
  color: 0xff0000,
  emissive: 0x000000,
  specular: 0x111111,
  shininess: 100
});

// 标准材质 (PBR)
const material = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  metalness: 0.0,
  roughness: 0.5
});

// 线条材质
const material = new THREE.LineBasicMaterial({
  color: 0xff0000,
  linewidth: 1
});

// 点材质
const material = new THREE.PointsMaterial({
  color: 0xff0000,
  size: 1,
  sizeAttenuation: true
});
```

### 6. 网格 (Mesh)
```javascript
const mesh = new THREE.Mesh(geometry, material);

// 位置、旋转、缩放
mesh.position.set(x, y, z);
mesh.rotation.set(x, y, z);
mesh.scale.set(x, y, z);

// 矩阵变换
mesh.updateMatrix();
mesh.updateMatrixWorld();

// 阴影
mesh.castShadow = true;
mesh.receiveShadow = true;

// 添加到场景
scene.add(mesh);
```

### 7. 光照 (Lights)
```javascript
// 环境光
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);

// 方向光
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(x, y, z);
directionalLight.castShadow = true;

// 点光源
const pointLight = new THREE.PointLight(0xffffff, 1, distance);
pointLight.position.set(x, y, z);

// 聚光灯
const spotLight = new THREE.SpotLight(0xffffff, 1, distance, angle);
```

### 8. 组 (Group)
```javascript
const group = new THREE.Group();
group.add(mesh1);
group.add(mesh2);
scene.add(group);

// 组的变换会影响所有子对象
group.position.set(x, y, z);
group.rotation.set(x, y, z);
```

## 常见问题和解决方案

### 1. 版本兼容性问题
- **问题**: `modelViewMatrix` 只读属性错误
- **原因**: Three.js版本更新导致的API变化
- **解决**: 使用最新的API方式

### 2. 性能优化
```javascript
// 使用实例化渲染
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

// 合并几何体
const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);

// LOD (Level of Detail)
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(lowDetailMesh, 100);
```

### 3. 内存管理
```javascript
// 释放几何体
geometry.dispose();

// 释放材质
material.dispose();

// 释放纹理
texture.dispose();

// 释放渲染目标
renderTarget.dispose();
```

### 4. 事件处理
```javascript
// 鼠标拾取
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);
}
```

## 最佳实践

### 1. 渲染循环
```javascript
function animate() {
  requestAnimationFrame(animate);
  
  // 更新逻辑
  updateObjects();
  
  // 渲染
  renderer.render(scene, camera);
}
```

### 2. 响应式设计
```javascript
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```

### 3. 错误处理
```javascript
// WebGL上下文丢失处理
renderer.domElement.addEventListener('webglcontextlost', onContextLost);
renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
```

## 常用工具和扩展

### 1. 控制器
```javascript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
const controls = new OrbitControls(camera, renderer.domElement);
```

### 2. 加载器
```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
```

### 3. 后处理
```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
```

## 调试技巧

### 1. 开发工具
- 使用 `THREE.WebGLRenderer({ antialias: true, alpha: true })` 进行调试
- 启用 `renderer.debug.checkShaderErrors = true`

### 2. 性能监控
```javascript
const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  // 渲染代码
  stats.end();
}
```

### 3. 常见错误
- **几何体未定义**: 检查几何体是否正确创建
- **材质错误**: 确保材质与几何体兼容
- **相机设置**: 检查相机位置和目标
- **光照问题**: 确保场景有适当的光照
