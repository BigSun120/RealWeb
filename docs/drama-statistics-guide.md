# Phase 2.4 - 数据统计可视化功能指南

## 📊 功能概览

数据统计可视化模块为AI短剧脚本生成工具提供全面的数据分析和图表展示能力，帮助用户实时了解项目创作进度和数据洞察。

---

## ✨ 主要功能

### 1. 概览卡片 (OverviewCards)
四个核心指标卡片：
- **完成进度** - 显示已完成集数和总体进度百分比
- **总字数** - 展示剧本总字数和平均字数
- **角色数量** - 统计角色总数和世界观完成状态
- **关键节点** - 显示大纲中的节点总数

### 2. 图表分析 (ChartsPanel)
多种图表类型的数据可视化：

#### 2.1 项目进度环形图
- 展示已完成和未完成集数比例
- 动态颜色标识进度状态

#### 2.2 分集状态饼图
- 统计不同状态的分集数量
  - 草稿 (draft)
  - 进行中 (in-progress)
  - 已完成 (completed)
  - 已审核 (reviewed)

#### 2.3 角色类型柱状图
- 按角色类型（主角/配角/反派等）统计数量
- 清晰展示角色分布

#### 2.4 大纲节点分布柱状图
- 显示三幕结构中各幕的节点数量
- 帮助平衡剧情分布

#### 2.5 分集字数趋势折线图
- 展示各分集字数变化趋势
- 识别异常集数

#### 2.6 角色参与度雷达图
- 展示TOP 8角色在大纲中的出现频次
- 识别主要角色和戏份分配

### 3. 详细数据 (DetailPanel)
详细的数据统计信息：

#### 3.1 分集详情
- 总集数
- 完成率（进度条）
- 平均字数
- 最长/最短分集信息

#### 3.2 最近更新
- 时间线展示最近5次更新
- 智能时间格式（刚刚/分钟前/小时前/天前）

#### 3.3 角色统计
- 总角色数
- 平均描述长度
- 角色类型分布列表

#### 3.4 大纲统计
- 总节点数
- 预估集数
- 各幕节点分布（进度条）
- 情感分布标签

### 4. 导出功能
- 一键导出文本格式统计报告
- 包含项目信息和完整统计数据

---

## 📁 文件结构

```
frontend/src/views/tools/productivity/drama/
├── components/
│   ├── StatisticsPanel.vue           # 主统计面板
│   └── statistics/
│       ├── OverviewCards.vue         # 概览卡片组件
│       ├── ChartsPanel.vue           # 图表面板组件
│       └── DetailPanel.vue           # 详细数据组件
└── utils/
    └── statistics.js                 # 统计计算工具函数
```

---

## 🔧 核心工具函数

### statistics.js 提供的函数

```javascript
// 计算函数
- calculateProjectStats(project)      // 项目总体统计
- calculateCharacterStats(characters)  // 角色统计
- calculateOutlineStats(outline)       // 大纲统计
- calculateEpisodeStats(episodes)      // 分集统计
- generateTimeline(episodes)           // 生成时间线

// ECharts配置生成函数
- generateProgressChartOption()        // 进度环形图
- generateCharacterRoleChartOption()   // 角色柱状图
- generateEpisodeStatusChartOption()   // 分集饼图
- generateWordCountTrendChartOption()  // 字数折线图
- generatePlotPointsDistributionChartOption() // 节点柱状图
- generateCharacterInvolvementChartOption()   // 参与度雷达图
```

---

## 🚀 使用指南

### 访问统计面板

1. 打开项目工作台
2. 点击左侧导航栏的「数据统计」菜单
3. 查看自动生成的统计数据和图表

### 刷新数据

- 点击右上角「刷新数据」按钮
- 系统将从服务器重新获取最新数据
- 所有图表自动更新

### 导出报告

1. 点击右上角「导出报告」按钮
2. 系统生成文本格式报告
3. 自动下载 `项目名称_统计报告_时间戳.txt` 文件

### 切换视图

- 「图表分析」标签 - 查看可视化图表
- 「详细数据」标签 - 查看详细统计信息

---

## 📊 数据示例

### 概览卡片数据
```javascript
{
  progress: 75,              // 完成进度 75%
  completedEpisodes: 45,     // 已完成 45 集
  totalEpisodes: 60,         // 总计 60 集
  totalWordCount: 90000,     // 总字数 90,000 字
  avgWordCount: 2000,        // 平均 2,000 字/集
  charactersCount: 8,        // 8 个角色
  plotPointsCount: 15,       // 15 个关键节点
  worldviewComplete: true    // 世界观已完成
}
```

### 角色统计数据
```javascript
{
  total: 8,
  byRole: {
    '主角': 2,
    '配角': 4,
    '反派': 2
  },
  byGender: {
    '男': 4,
    '女': 4
  },
  avgDescriptionLength: 250
}
```

### 分集统计数据
```javascript
{
  total: 45,
  byStatus: {
    'draft': 5,
    'in-progress': 10,
    'completed': 25,
    'reviewed': 5
  },
  totalWordCount: 90000,
  avgWordCount: 2000,
  completionRate: 67,
  longestEpisode: { number: 10, wordCount: 3500 },
  shortestEpisode: { number: 5, wordCount: 1200 }
}
```

---

## 🎨 样式说明

### 颜色方案

**进度状态颜色**:
- 完成进度 ≥ 80% → 绿色 (#67C23A)
- 完成进度 ≥ 50% → 橙色 (#E6A23C)
- 完成进度 < 50% → 红色 (#F56C6C)

**分集状态颜色**:
- 草稿 → 灰色 (#909399)
- 进行中 → 橙色 (#E6A23C)
- 已完成 → 绿色 (#67C23A)
- 已审核 → 蓝色 (#409EFF)

**图标颜色**:
- 进度 → 蓝色 (#409EFF)
- 字数 → 绿色 (#67C23A)
- 角色 → 橙色 (#E6A23C)
- 节点 → 红色 (#F56C6C)

### 响应式设计

**桌面端** (>768px):
- 概览卡片：4列布局
- 图表：2列布局
- 详细数据：2列布局

**移动端** (≤768px):
- 概览卡片：单列布局
- 图表：单列布局
- 详细数据：单列布局

---

## 🧪 测试清单

### 基础功能测试

- [ ] 概览卡片正确显示所有指标
- [ ] 图表正确渲染和显示数据
- [ ] 详细数据准确无误
- [ ] 刷新功能正常工作
- [ ] 导出报告功能正常

### 图表测试

#### 进度环形图
- [ ] 正确显示已完成/未完成比例
- [ ] 鼠标悬停显示详细信息
- [ ] 颜色标识准确

#### 分集状态饼图
- [ ] 正确统计各状态分集数量
- [ ] 图例显示完整
- [ ] 交互流畅

#### 角色类型柱状图
- [ ] 正确显示各类型角色数量
- [ ] 柱状图高度合理
- [ ] tooltip信息完整

#### 字数趋势折线图
- [ ] 正确显示各集字数
- [ ] 趋势线平滑
- [ ] 区域填充效果良好

#### 节点分布柱状图
- [ ] 正确显示各幕节点数
- [ ] Y轴最小间隔为1
- [ ] 标签清晰

#### 角色参与度雷达图
- [ ] 正确显示TOP 8角色
- [ ] 雷达图比例合理
- [ ] 数据准确

### 详细数据测试

- [ ] 分集详情数据准确
- [ ] 最近更新时间格式正确
- [ ] 角色统计完整
- [ ] 大纲统计准确
- [ ] 进度条百分比正确

### 边界情况测试

- [ ] 空数据状态显示正常
- [ ] 只有部分数据时显示正常
- [ ] 大量数据时性能良好
- [ ] 窗口调整时图表响应式调整

### 导出功能测试

- [ ] 文件命名正确
- [ ] 文件内容完整
- [ ] 中文编码正确
- [ ] 数据格式规范

---

## 🔍 常见问题

### 1. 图表不显示

**症状**: 图表区域空白  
**原因**: 
- ECharts 未正确初始化
- DOM 元素未挂载
- 数据格式错误

**解决方案**:
```javascript
// 确保在 nextTick 后初始化图表
await nextTick();
if (chartRef.value) {
  chart = echarts.init(chartRef.value);
  chart.setOption(option);
}
```

### 2. 图表不响应窗口调整

**症状**: 调整窗口大小时图表不自适应  
**原因**: 未监听 resize 事件

**解决方案**:
```javascript
// 添加 resize 监听
window.addEventListener('resize', handleResize);

// 在组件卸载时移除
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});
```

### 3. 统计数据不准确

**症状**: 显示的统计数据与实际不符  
**原因**: 
- 数据格式不匹配
- 计算逻辑错误
- 数据未及时更新

**解决方案**:
- 检查 `statistics.js` 中的计算函数
- 确认数据结构符合预期
- 使用「刷新数据」功能更新

### 4. 导出报告乱码

**症状**: 导出的文本文件中文显示乱码  
**原因**: 文件编码问题

**解决方案**:
```javascript
// 指定 UTF-8 编码
const blob = new Blob([reportText], { 
  type: 'text/plain;charset=utf-8' 
});
```

### 5. 雷达图不显示

**症状**: 角色参与度雷达图不显示  
**原因**: 没有角色参与度数据

**解决方案**:
- 确保大纲中的节点关联了角色
- 检查 `characterInvolvement` 数据是否为空
- 至少需要1个角色参与数据

---

## 💡 性能优化

### 图表性能

1. **防抖处理**
```javascript
// 窗口resize时使用防抖
import { useDebounceFn } from '@vueuse/core';

const handleResize = useDebounceFn(() => {
  chart?.resize();
}, 300);
```

2. **按需渲染**
```javascript
// 只渲染可见的图表
<el-col v-if="hasCharacters">
  <CharacterRoleChart />
</el-col>
```

3. **数据缓存**
```javascript
// 使用 computed 缓存计算结果
const projectStats = computed(() => {
  return calculateProjectStats(props.project);
});
```

### 大数据量处理

- 字数趋势图：如果分集数量 > 100，考虑采样显示
- 角色参与度：限制为TOP 8，避免雷达图过于拥挤
- 时间线：只显示最近5次更新

---

## 📝 开发笔记

### ECharts 集成

```javascript
// 导入 ECharts
import * as echarts from 'echarts';

// 初始化图表
const chart = echarts.init(domRef.value);

// 设置配置
chart.setOption(option);

// 销毁图表
chart.dispose();
```

### 计算函数设计原则

1. **纯函数**: 无副作用，相同输入必然相同输出
2. **容错处理**: 处理空数据、undefined、null
3. **性能优化**: 避免不必要的循环
4. **可测试**: 函数独立，易于单元测试

### 组件拆分原则

- **OverviewCards**: 只负责卡片展示
- **ChartsPanel**: 只负责图表渲染
- **DetailPanel**: 只负责详细数据展示
- **StatisticsPanel**: 统筹协调，处理数据刷新和导出

---

## 🎯 下一步优化

### Phase 2.5 建议

1. **更多图表类型**
   - 词云图（高频词汇）
   - 热力图（创作活跃时间）
   - 桑基图（剧情流程）

2. **数据对比**
   - 历史数据对比
   - 同类项目对比
   - 行业标准对比

3. **智能分析**
   - AI 剧情合理性分析
   - 角色弧光分析
   - 节奏分析

4. **交互增强**
   - 图表点击跳转到对应编辑器
   - 数据钻取
   - 自定义图表配置

5. **导出增强**
   - PDF 格式导出
   - Excel 格式导出
   - 图表截图导出

---

## 🔗 相关文档

- [Phase 2.3 - 大纲和分集管理集成](./drama-outline-episodes-integration-test.md)
- [集成完成总结](./drama-integration-summary.md)
- [Element Plus 文档](https://element-plus.org/)
- [ECharts 文档](https://echarts.apache.org/zh/index.html)

---

## ✅ 测试报告模板

```markdown
### 测试日期: YYYY-MM-DD
### 测试人员: [姓名]
### 测试环境: [浏览器/操作系统]

#### 功能测试结果

1. **概览卡片**: ✅ 通过 / ❌ 失败
   - 说明: 

2. **图表渲染**: ✅ 通过 / ❌ 失败
   - 进度环形图: ✅ / ❌
   - 分集饼图: ✅ / ❌
   - 角色柱状图: ✅ / ❌
   - 节点柱状图: ✅ / ❌
   - 字数折线图: ✅ / ❌
   - 参与度雷达图: ✅ / ❌

3. **详细数据**: ✅ 通过 / ❌ 失败
   - 说明:

4. **导出功能**: ✅ 通过 / ❌ 失败
   - 说明:

#### 性能测试

- 页面加载时间: X 秒
- 图表渲染时间: X 秒
- 内存占用: X MB

#### 问题记录

1. [问题描述]
   - 严重程度: 高/中/低
   - 复现步骤:
   - 截图:

#### 改进建议

1. [建议内容]
```

---

**文档版本**: v1.0  
**创建日期**: 2024-01  
**维护者**: Development Team  
**状态**: ✅ 已完成

---

Happy Analyzing! 📊🚀

