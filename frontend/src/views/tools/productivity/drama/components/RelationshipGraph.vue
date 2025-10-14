<template>
  <div class="relationship-graph">
    <!-- 工具栏 -->
    <div class="graph-toolbar">
      <div class="toolbar-left">
        <h3 class="graph-title">
          <el-icon>
            <Share />
          </el-icon>
          角色关系图谱
        </h3>
        <el-tag v-if="graphData.nodes.length > 0" type="success" size="small">
          {{ graphData.nodes.length }} 个角色 · {{ graphData.links.length }} 条关系
        </el-tag>
      </div>

      <div class="toolbar-right">
        <!-- AI生成按钮组 -->
        <el-dropdown v-if="graphData.nodes.length > 0" split-button type="success" :icon="MagicStick"
          @click="handleAIGenerate" :loading="generating">
          {{ generating ? 'AI生成中...' : 'AI智能生成' }}
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="MagicStick" @click="handleAIGenerate">
                AI直接生成（内置AI）
              </el-dropdown-item>
              <el-dropdown-item :icon="DocumentCopy" @click="handleShowPrompt">
                生成提示词（外部AI）
              </el-dropdown-item>
              <el-dropdown-item :icon="Upload" @click="handleImportAI">
                导入AI回答
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 其他操作按钮 -->
        <el-button v-if="graphData.nodes.length > 0" :icon="RefreshRight" @click="handleReset">
          重置布局
        </el-button>
        <el-button v-if="graphData.nodes.length > 0" type="primary" :icon="Document" @click="handleSaveRelationships">
          保存关系
        </el-button>
        <el-button v-if="graphData.nodes.length > 0" type="danger" :icon="Delete" @click="handleClearGraph">
          清空图谱
        </el-button>
        <el-dropdown v-if="graphData.nodes.length > 0" split-button :icon="Download" @click="handleExportImage">
          导出图片
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="Download" @click="handleExportImage">
                导出为PNG图片
              </el-dropdown-item>
              <el-dropdown-item :icon="Document" @click="handleExportText">
                导出为TXT文本
              </el-dropdown-item>
              <el-dropdown-item :icon="Document" @click="handleExportMarkdown">
                导出为Markdown
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="characters.length === 0" class="empty-state">
      <el-empty description="还没有角色数据">
        <el-alert title="提示" type="info" :closable="false" show-icon>
          请先在「角色管理」中添加至少2个角色，然后再生成关系图谱
        </el-alert>
      </el-empty>
    </div>

    <!-- 未生成状态 -->
    <div v-else-if="graphData.nodes.length === 0" class="empty-state">
      <el-empty description="还没有生成关系图谱" :image-size="150">
        <div class="empty-actions">
          <el-alert title="💡 使用 AI 智能生成角色关系" type="success" :closable="false" show-icon style="margin-bottom: 20px;">
            <template #default>
              <p>AI 将根据以下信息自动推断角色之间的关系：</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>世界观背景和主题</li>
                <li>角色的定位、性格、背景</li>
                <li>剧本的情感基调</li>
              </ul>
              <p style="color: #67C23A; font-weight: 500;">✅ 当前有 {{ characters.length }} 个角色，可以开始生成</p>
            </template>
          </el-alert>

          <el-space direction="vertical" :size="15" style="width: 100%;">
            <el-button type="success" size="large" :icon="MagicStick" @click="handleAIGenerate" :loading="generating"
              style="width: 100%;">
              {{ generating ? 'AI生成中...' : 'AI智能生成关系图谱' }}
            </el-button>



            <div style="display: flex; gap: 10px; width: 100%;">
              <el-button type="primary" size="default" :icon="DocumentCopy" @click="handleShowPrompt" style="flex: 1;">
                生成提示词
              </el-button>
              <el-button type="primary" size="default" :icon="Upload" @click="handleImportAI" style="flex: 1;">
                导入AI回答
              </el-button>
            </div>
          </el-space>
        </div>
      </el-empty>
    </div>

    <!-- 图谱容器 -->
    <div v-else class="graph-container">
      <div ref="chartRef" class="chart-wrapper"></div>

      <!-- 右侧面板：统计 + 图例 + 过滤器 -->
      <div class="graph-sidebar">
        <!-- 统计信息 -->
        <el-card shadow="hover" class="sidebar-card">
          <template #header>
            <span>📊 图谱统计</span>
          </template>
          <div class="stats-content">
            <div class="stat-item">
              <span class="stat-label">角色数量</span>
              <span class="stat-value">{{ graphData.nodes.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">关系总数</span>
              <span class="stat-value">{{ graphData.links.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">情感关系</span>
              <span class="stat-value">{{ getRelationTypeCount('情感') }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">对抗关系</span>
              <span class="stat-value">{{ getRelationTypeCount('对抗') }}</span>
            </div>
          </div>
        </el-card>

        <!-- 图例说明 -->
        <el-card shadow="hover" class="sidebar-card legend-card">
          <template #header>
            <span>🎨 图例说明</span>
          </template>
          <div class="legend-content">
            <div class="legend-section">
              <div class="legend-title">角色类型</div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #3B82F6; width: 16px; height: 16px;"></span>
                <span>男主角</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #EC4899; width: 16px; height: 16px;"></span>
                <span>女主角</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #10B981; width: 14px; height: 14px;"></span>
                <span>配角</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #F59E0B; width: 14px; height: 14px;"></span>
                <span>反派</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #9CA3AF; width: 10px; height: 10px;"></span>
                <span>次要</span>
              </div>
            </div>

            <el-divider style="margin: 12px 0;" />

            <div class="legend-section">
              <div class="legend-title">关系类型</div>
              <div class="legend-item">
                <span class="legend-line" style="background: #FF1493;"></span>
                <span>情感</span>
              </div>
              <div class="legend-item">
                <span class="legend-line" style="background: #4169E1;"></span>
                <span>亲情</span>
              </div>
              <div class="legend-item">
                <span class="legend-line" style="background: #32CD32;"></span>
                <span>友情</span>
              </div>
              <div class="legend-item">
                <span class="legend-line" style="background: #DC143C;"></span>
                <span>仇恨</span>
              </div>
              <div class="legend-item">
                <span class="legend-line" style="background: #FF8C00;"></span>
                <span>竞争</span>
              </div>
              <div class="legend-item">
                <span class="legend-line" style="background: #20B2AA;"></span>
                <span>合作</span>
              </div>
            </div>

            <el-divider style="margin: 12px 0;" />

            <div class="legend-section">
              <div class="legend-title">线条样式</div>
              <div class="legend-item">
                <div class="legend-line-demo solid"></div>
                <span>双向关系</span>
              </div>
              <div class="legend-item">
                <div class="legend-line-demo dashed"></div>
                <span>单向关系</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 关系过滤器 -->
        <el-card shadow="hover" class="sidebar-card filter-card">
          <template #header>
            <span>🔍 关系过滤</span>
          </template>
          <div class="filter-content">
            <div class="filter-item">
              <el-checkbox 
                :model-value="selectedRelationTypes.includes('all')" 
                @change="handleAllChange"
                border 
                size="small"
              >
                全部显示
              </el-checkbox>
            </div>
            <el-divider style="margin: 10px 0;" />
            <div class="filter-item" v-for="type in relationTypeOptions" :key="type.value">
              <el-checkbox 
                :model-value="selectedRelationTypes.includes(type.value)" 
                @change="(val) => handleTypeChange(type.value, val)"
                border 
                size="small"
                :disabled="selectedRelationTypes.includes('all')"
              >
                {{ type.icon }} {{ type.label }}
              </el-checkbox>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 提示词对话框 -->
    <PromptDialog v-model="showPromptDialog" :prompt="generatedPrompt" title="角色关系生成提示词（用于外部AI）"
      description="📝 复制以下提示词到外部AI工具（如ChatGPT、Claude等）生成角色关系，然后使用「导入AI回答」功能导入生成的内容。" />

    <!-- AI回答导入对话框 -->
    <el-dialog v-model="showImportDialog" title="导入 AI 生成的关系" width="700px" :close-on-click-modal="false">
      <el-alert title="粘贴 AI 生成的关系内容" type="info" :closable="false" show-icon style="margin-bottom: 15px;">
        请将外部AI工具返回的关系内容粘贴到下方文本框
      </el-alert>

      <el-input v-model="importContent" type="textarea" :rows="15" placeholder="粘贴 AI 生成的内容，例如：

【角色：陆景琛】
关系1：夏晴 | 类型：暗恋 | 方向：单向 | 强度：5 | 描述：对夏晴一见钟情
关系2：宋凯 | 类型：商业竞争 | 方向：双向 | 强度：4 | 描述：争夺公司控制权

【角色：夏晴】
关系1：陆景琛 | 类型：雇佣关系 | 方向：双向 | 强度：3 | 描述：秘书关系
..." />

      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleImportConfirm" :loading="importing">
          {{ importing ? '解析中...' : '开始解析' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Share,
  MagicStick,
  DocumentCopy,
  Upload,
  RefreshRight,
  Download,
  Document,
  Delete
} from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import PromptDialog from './PromptDialog.vue';
import { generateAIContent } from '@/api/ai';
import {
  generateRelationshipGraphPrompt,
  parseRelationshipResponse
} from '../utils/promptTemplates';

const props = defineProps({
  characters: {
    type: Array,
    default: () => []
  },
  worldview: {
    type: Object,
    default: () => ({})
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update', 'save', 'relationships-changed', 'relationships-save']);

// 状态
const chartRef = ref(null);
const chartInstance = ref(null);
const generating = ref(false);
const importing = ref(false);
const showPromptDialog = ref(false);
const showImportDialog = ref(false);
const generatedPrompt = ref('');
const importContent = ref('');

// 图谱数据
const graphData = ref({
  nodes: [],
  links: []
});

// 临时存储关系数据（用于后续保存）
const relationshipsData = ref([]);

// 过滤器状态
const selectedRelationTypes = ref(['all']);

// 关系类型选项
const relationTypeOptions = [
  { value: '爱情', label: '爱情/暗恋', icon: '💘' },
  { value: '亲情', label: '亲情', icon: '👨‍👩‍👧' },
  { value: '友情', label: '友情', icon: '👫' },
  { value: '仇恨', label: '仇恨', icon: '⚔️' },
  { value: '竞争', label: '竞争', icon: '🎯' },
  { value: '合作', label: '合作', icon: '🤝' }
];

// 持久化存储key
const STORAGE_KEY_PREFIX = 'drama_relationships_';

// 获取特定类型的关系数量
const getRelationTypeCount = (category) => {
  const typeMap = {
    '情感': ['爱情', '暗恋', '前任', '亲情', '友情', '闺蜜'],
    '对抗': ['仇恨', '纾争', '商业竞争', '利用', '误会']
  };

  const types = typeMap[category] || [];
  return graphData.value.links.filter(link =>
    types.some(type => link.relationshipType?.includes(type))
  ).length;
};

// 处理“全部显示”变化
const handleAllChange = (checked) => {
  if (checked) {
    selectedRelationTypes.value = ['all'];
  } else {
    selectedRelationTypes.value = [];
  }
  updateChart();
};

// 处理单个类型变化
const handleTypeChange = (type, checked) => {
  if (checked) {
    // 添加该类型
    if (!selectedRelationTypes.value.includes(type)) {
      selectedRelationTypes.value.push(type);
    }
    // 移除“全部显示”
    const allIndex = selectedRelationTypes.value.indexOf('all');
    if (allIndex > -1) {
      selectedRelationTypes.value.splice(allIndex, 1);
    }
  } else {
    // 移除该类型
    const index = selectedRelationTypes.value.indexOf(type);
    if (index > -1) {
      selectedRelationTypes.value.splice(index, 1);
    }
    // 如果没有任何选项，默认显示全部
    if (selectedRelationTypes.value.length === 0) {
      selectedRelationTypes.value = ['all'];
    }
  }
  updateChart();
};

// 生成存储key
const getStorageKey = () => {
  const projectName = props.projectInfo?.name || 'default';
  return `${STORAGE_KEY_PREFIX}${projectName}`;
};

// 保存关系数据到localStorage
const saveRelationshipsToLocal = () => {
  if (relationshipsData.value.length === 0) return;
  
  try {
    const storageKey = getStorageKey();
    const dataToSave = {
      relationships: relationshipsData.value,
      timestamp: Date.now(),
      characterNames: props.characters.map(c => c.name)
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    console.log('✅ 关系数据已保存到localStorage', dataToSave);
  } catch (error) {
    console.error('保存关系数据失败:', error);
  }
};

// 从 localStorage 加载关系数据
const loadRelationships = () => {
  try {
    const storageKey = getStorageKey();
    const savedData = localStorage.getItem(storageKey);

    if (!savedData) {
      console.log('ℹ️ 未找到已保存的关系数据');
      return false;
    }

    const parsed = JSON.parse(savedData);

    // 验证角色是否匹配
    const currentCharNames = props.characters.map(c => c.name).sort();
    const savedCharNames = (parsed.characterNames || []).sort();

    if (JSON.stringify(currentCharNames) !== JSON.stringify(savedCharNames)) {
      console.log('⚠️ 角色列表已变化，不加载旧数据');
      return false;
    }

    // 恢复数据
    relationshipsData.value = parsed.relationships || [];
    convertToGraphData(relationshipsData.value);

    nextTick(() => {
      updateChart();
    });

    console.log('✅ 已加载保存的关系数据', relationshipsData.value.length, '条');
    ElMessage.success(`已加载 ${relationshipsData.value.length} 条关系`);
    return true;
  } catch (error) {
    console.error('加载关系数据失败:', error);
    return false;
  }
};

// 监听角色变化
watch(() => props.characters, (newChars, oldChars) => {
  // 如果是初始化（从空到有数据），尝试加载保存的数据
  if ((!oldChars || oldChars.length === 0) && newChars && newChars.length > 0) {
    console.log('ℹ️ 角色列表初始化，尝试加载保存的关系数据');
    loadRelationships();
    return;
  }

  // 如枟角色发生变化，清空图谱（需要重新生成）
  if (graphData.value.nodes.length > 0 && oldChars && oldChars.length > 0) {
    ElMessage.warning('角色列表已变化，请重新生成关系图谱');
  }
}, { deep: true });

// AI智能生成
const handleAIGenerate = async () => {
  // 检查前置条件
  if (props.characters.length < 2) {
    ElMessage.warning('至少需要2个角色才能生成关系图谱');
    return;
  }

  if (!props.worldview || !props.worldview.theme) {
    const confirmed = await ElMessageBox.confirm(
      '建议先完善世界观设定，这样AI能生成更合理的角色关系。是否继续？',
      '提示',
      {
        confirmButtonText: '继续生成',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).catch(() => false);

    if (!confirmed) return;
  }

  generating.value = true;

  // 立即显示加载提示
  const loadingMessage = ElMessage({
    message: `🤖 正在为${props.characters.length}个角色生成关系图谱...，预计需要20-30秒`,
    type: 'info',
    duration: 0,
    iconClass: 'el-icon-loading'
  });

  try {
    // 生成提示词
    const prompt = generateRelationshipGraphPrompt({
      projectName: props.projectInfo.name,
      projectType: props.projectInfo.type,
      worldview: props.worldview,
      characters: props.characters
    });

    console.log('🤖 发送AI请求，生成关系图谱...');

    // 调用AI API
    const response = await generateAIContent(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.8,
        maxTokens: 3000
      }
    );

    loadingMessage.close();

    if (response.code === 200 && response.data?.content) {
      const { content } = response.data;

      // 解析AI返回的关系数据
      const parsedRelationships = parseRelationshipResponse(content);

      console.log('✅ AI解析结果:', parsedRelationships);

      if (parsedRelationships.length === 0) {
        ElMessage.warning('未能从AI回答中解析到有效的关系数据，请检查AI回答格式');
        return;
      }

      // 存储原始关系数据
      relationshipsData.value = parsedRelationships;

      // 转换为图谱数据
      convertToGraphData(parsedRelationships);

      // 更新图表
      nextTick(() => {
        updateChart();
      });

      // 保存到localStorage
      saveRelationshipsToLocal();
      
      // 触发自动保存事件
      emit('relationships-changed', { data: parsedRelationships, isAutoSave: true });
      
      ElMessage.success({
        message: `✅ 成功生成${parsedRelationships.length}条关系，浉及${graphData.value.nodes.length}个角色`,
        duration: 3000
      });
    } else {
      throw new Error(response.message || 'AI生成失败');
    }
  } catch (error) {
    console.error('❌ AI生成失败:', error);
    loadingMessage.close();
    ElMessage.error(error.message || 'AI生成失败，请稍后重试');
  } finally {
    generating.value = false;
  }
};

// 显示提示词
const handleShowPrompt = () => {
  if (props.characters.length < 2) {
    ElMessage.warning('至少需要2个角色才能生成提示词');
    return;
  }

  // 生成提示词
  generatedPrompt.value = generateRelationshipGraphPrompt({
    projectName: props.projectInfo.name,
    projectType: props.projectInfo.type,
    worldview: props.worldview,
    characters: props.characters
  });

  showPromptDialog.value = true;
};

// 导入AI回答
const handleImportAI = () => {
  importContent.value = '';
  showImportDialog.value = true;
};

// 确认导入
const handleImportConfirm = () => {
  if (!importContent.value.trim()) {
    ElMessage.warning('请粘贄AI生成的内容');
    return;
  }

  importing.value = true;

  try {
    // 解析导入的内容
    const parsedRelationships = parseRelationshipResponse(importContent.value);

    if (parsedRelationships.length === 0) {
      ElMessage.warning('未能解析到有效的关系数据，请检查格式');
      return;
    }

    // 存储原始关系数据
    relationshipsData.value = parsedRelationships;

    // 转换为图谱数据
    convertToGraphData(parsedRelationships);

    // 更新图表
    nextTick(() => {
      updateChart();
    });

    // 保存到localStorage
    saveRelationshipsToLocal();
    
    // 触发自动保存事件
    emit('relationships-changed', { data: parsedRelationships, isAutoSave: true });
    
    showImportDialog.value = false;
    
    ElMessage.success({
      message: `✅ 成功导入${parsedRelationships.length}条关系，涉及${graphData.value.nodes.length}个角色`,
      duration: 3000
    });
  } catch (error) {
    console.error('解析失败:', error);
    ElMessage.error('解析失败：' + error.message);
  } finally {
    importing.value = false;
  }
};

// 重置布局
const handleReset = () => {
  if (chartInstance.value) {
    chartInstance.value.resize();
    ElMessage.success('已重置布局');
  }
};

// 手动保存关系图谱
const handleSaveRelationships = () => {
  if (relationshipsData.value.length === 0) {
    ElMessage.warning('没有可保存的关系数据');
    return;
  }
  
  // 保存到 localStorage
  saveRelationshipsToLocal();
  
  // 触发手动保存事件
  emit('relationships-save', { data: relationshipsData.value, isAutoSave: false });
  
  ElMessage.success(`已保存 ${relationshipsData.value.length} 条关系`);
};

// 清空关系图谱
const handleClearGraph = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空关系图谱吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );

    // 清空数据
    relationshipsData.value = [];
    graphData.value = { nodes: [], links: [] };

    // 清空 localStorage
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);

    // 清空图表
    if (chartInstance.value) {
      chartInstance.value.clear();
    }

    ElMessage.success('已清空关系图谱');
    
    // 触发清空事件（自动保存）
    emit('relationships-changed', { data: [], isAutoSave: true });
  } catch (error) {
    // 用户取消
    if (error !== 'cancel') {
      console.error('清空失败:', error);
    }
  }
};

// 导出图片
const handleExportImage = () => {
  if (chartInstance.value) {
    const url = chartInstance.value.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    });

    const link = document.createElement('a');
    link.href = url;
    link.download = `角色关系图谱-${props.projectInfo.name || '未命名'}.png`;
    link.click();

    ElMessage.success('图谱已导出PNG图片');
  }
};

// 导出为文本文件
const handleExportText = () => {
  if (relationshipsData.value.length === 0) {
    ElMessage.warning('没有可导出的关系数据');
    return;
  }

  const projectName = props.projectInfo.name || '未命名';
  let content = `# ${projectName} - 角色关系图谱\n\n`;
  content += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
  content += `角色数量：${graphData.value.nodes.length} 个\n`;
  content += `关系数量：${relationshipsData.value.length} 条\n\n`;
  content += '='.repeat(60) + '\n\n';

  // 按角色分组关系
  const relationsByCharacter = {};
  relationshipsData.value.forEach(rel => {
    if (!relationsByCharacter[rel.from]) {
      relationsByCharacter[rel.from] = [];
    }
    relationsByCharacter[rel.from].push(rel);
  });

  // 生成文本
  Object.keys(relationsByCharacter).forEach((charName, index) => {
    content += `${index + 1}. 【角色：${charName}】\n\n`;

    const relations = relationsByCharacter[charName];
    relations.forEach((rel, relIndex) => {
      const directionSymbol = rel.direction === 'bidirectional' ? '↔' : '→';
      const strengthStars = '★'.repeat(rel.strength);

      content += `   关系${relIndex + 1}：${rel.from} ${directionSymbol} ${rel.to}\n`;
      content += `   类型：${rel.type}\n`;
      content += `   强度：${strengthStars} (${rel.strength}/5)\n`;
      content += `   描述：${rel.description}\n\n`;
    });

    content += '-'.repeat(60) + '\n\n';
  });

  // 创建下载
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `角色关系图谱-${projectName}.txt`;
  link.click();
  URL.revokeObjectURL(url);

  ElMessage.success('已导出为TXT文件');
};

// 导出为Markdown文件
const handleExportMarkdown = () => {
  if (relationshipsData.value.length === 0) {
    ElMessage.warning('没有可导出的关系数据');
    return;
  }

  const projectName = props.projectInfo.name || '未命名';
  let content = `# ${projectName} - 角色关系图谱\n\n`;

  // 元信息
  content += `## 基本信息\n\n`;
  content += `- **生成时间**：${new Date().toLocaleString('zh-CN')}\n`;
  content += `- **角色数量**：${graphData.value.nodes.length} 个\n`;
  content += `- **关系数量**：${relationshipsData.value.length} 条\n\n`;

  // 统计信息
  const emotionCount = getRelationTypeCount('情感');
  const conflictCount = getRelationTypeCount('对抗');

  content += `## 关系统计\n\n`;
  content += `- **情感关系**：${emotionCount} 条\n`;
  content += `- **对抗关系**：${conflictCount} 条\n`;
  content += `- **其他关系**：${relationshipsData.value.length - emotionCount - conflictCount} 条\n\n`;

  content += `---\n\n`;

  // 按角色分组关系
  const relationsByCharacter = {};
  relationshipsData.value.forEach(rel => {
    if (!relationsByCharacter[rel.from]) {
      relationsByCharacter[rel.from] = [];
    }
    relationsByCharacter[rel.from].push(rel);
  });

  // 生成Markdown表格和详情
  content += `## 角色关系详情\n\n`;

  Object.keys(relationsByCharacter).forEach((charName, index) => {
    const char = props.characters.find(c => c.name === charName);
    const charRole = char?.role || '角色';

    content += `### ${index + 1}. ${charName}（${charRole}）\n\n`;

    const relations = relationsByCharacter[charName];

    // 表格头
    content += `| 目标角色 | 关系类型 | 方向 | 强度 | 关系描述 |\n`;
    content += `|----------|----------|------|------|----------|\n`;

    // 表格数据
    relations.forEach(rel => {
      const directionSymbol = rel.direction === 'bidirectional' ? '↔️' : '→';
      const strengthStars = '⭐'.repeat(rel.strength);

      content += `| ${rel.to} | ${rel.type} | ${directionSymbol} | ${strengthStars} | ${rel.description} |\n`;
    });

    content += `\n`;
  });

  content += `---\n\n`;
  content += `> 此文件由 RealWeb 短剧创作工具自动生成\n`;

  // 创建下载
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `角色关系图谱-${projectName}.md`;
  link.click();
  URL.revokeObjectURL(url);

  ElMessage.success('已导出为Markdown文件');
};

// 转换关系数据为图谱格式
const convertToGraphData = (relationships) => {
  console.log('🔄 开始转换关系数据为图谱格式', relationships.length, '条关系');
  console.log('📊 当前角色列表:', props.characters.map(c => c.name));

  // 收集所有涉及的角色
  const characterMap = new Map();

  // 从现有角色列表构建 Map
  props.characters.forEach(char => {
    characterMap.set(char.name, char);
  });

  // 生成节点
  const nodes = [];
  const processedNames = new Set();
  const missingCharacters = new Set();

  relationships.forEach(rel => {
    [rel.from, rel.to].forEach(name => {
      if (!processedNames.has(name)) {
        const char = characterMap.get(name);
        if (char) {
          nodes.push({
            id: char._id || char.id || name,
            name: char.name,
            value: char.name,
            role: char.role,
            symbolSize: getRoleSymbolSize(char.role),
            itemStyle: {
              color: getRoleColor(char.role)
            },
            label: {
              show: true,  // 默认显示所有角色标签
              position: 'bottom',
              formatter: `{name|${char.name}}\\n{role|${char.role || ''}}`,
              color: '#333',  // 标签文本颜色
              backgroundColor: 'rgba(255, 255, 255, 0.9)',  // 背景色
              padding: [4, 8],
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#e0e0e0',
              rich: {
                name: {
                  fontSize: 13,
                  fontWeight: 'bold',
                  lineHeight: 18,
                  color: '#333'
                },
                role: {
                  fontSize: 11,
                  color: '#666',
                  lineHeight: 16
                }
              }
            },
            // 悬停时强化显示
            emphasis: {
              label: {
                show: true,
                fontSize: 15,
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 2,
                borderColor: '#409EFF'
              }
            }
          });
          processedNames.add(name);
          console.log(`  ✅ 添加节点: ${name} (${char.role})`);
        } else {
          missingCharacters.add(name);
          console.warn(`  ⚠️ 找不到角色: ${name}`);
        }
      }
    });
  });

  if (missingCharacters.size > 0) {
    console.warn('⚠️ 以下角色在关系中被提到，但不在角色列表中：', Array.from(missingCharacters));
  }

  // 生成连线
  const links = relationships.map(rel => {
    const sourceId = nodes.find(n => n.name === rel.from)?.id;
    const targetId = nodes.find(n => n.name === rel.to)?.id;

    if (!sourceId || !targetId) {
      console.warn(`  ⚠️ 跳过无效关系: ${rel.from} -> ${rel.to}`);
      return null;
    }

    return {
      source: sourceId,
      target: targetId,
      relationshipType: rel.type,
      description: rel.description,
      strength: rel.strength,
      label: {
        show: true,
        formatter: getRelationIcon(rel.type) + ' ' + rel.type,
        fontSize: 11
      },
      lineStyle: {
        // 根据关系强度调整线条粗细：1-5 分别对应 1.5-5
        width: rel.strength >= 4 ? 4 : rel.strength >= 3 ? 3 : rel.strength >= 2 ? 2 : 1.5,
        color: getRelationColor(rel.type),
        // 单向关系用虚线，双向用实线
        type: rel.direction === 'bidirectional' ? 'solid' : 'dashed',
        curveness: 0.3,
        // 添加阴影效果
        shadowBlur: 2,
        shadowColor: 'rgba(0, 0, 0, 0.2)'
      },
      // 双向关系显示双箭头
      symbol: rel.direction === 'bidirectional' ? ['arrow', 'arrow'] : ['none', 'arrow'],
      symbolSize: rel.direction === 'bidirectional' ? [8, 12] : [0, 12]
    };
  }).filter(link => link !== null);

  graphData.value = { nodes, links };

  console.log(`✅ 图谱数据转换完成: ${nodes.length} 个节点, ${links.length} 条连线`);
  console.log('📋 图谱数据:', graphData.value);
};

// 获取角色定位的节点大小（增强差异化）
const getRoleSymbolSize = (role) => {
  if (!role) return 65;
  // 主角：最大最显眼
  if (role.includes('男主角') || role.includes('女主角')) return 110;
  if (role.includes('主角')) return 100;
  // 反派：中等偏大
  if (role.includes('反派')) return 85;
  // 配角：中等
  if (role.includes('主要配角')) return 80;
  if (role.includes('配角')) return 75;
  // 龙套/次要：较小
  if (role.includes('龙套') || role.includes('次要')) return 60;
  return 70;
};

// 获取角色定位的颜色（使用高对比度颜色）
const getRoleColor = (role) => {
  if (!role) return '#6B7280';
  // 主角：鲜明的蓝色和粉红色
  if (role.includes('男主角')) return '#3B82F6';
  if (role.includes('女主角')) return '#EC4899';
  // 配角：翠绿色
  if (role.includes('主要配角')) return '#10B981';
  if (role.includes('配角')) return '#34D399';
  // 反派：金黄/橙色
  if (role.includes('反派')) return '#F59E0B';
  // 龙套/次要：灰色
  if (role.includes('龙套') || role.includes('次要')) return '#9CA3AF';
  return '#6B7280';
};

// 获取关系类型的图标
const getRelationIcon = (type) => {
  const iconMap = {
    '爱情': '❤️',
    '暗恋': '💘',
    '前任': '💔',
    '亲情': '👨‍👩‍👧',
    '友情': '👫',
    '闺蜜': '👯',
    '仇恨': '⚔️',
    '竞争': '🎯',
    '商业竞争': '💼',
    '利用': '😈',
    '误会': '❓',
    '上下级': '📈',
    '合作': '🤝',
    '雇佣': '💼',
    '秘密': '🤐',
    '保护': '🛡️',
    '嫉妒': '👁️'
  };

  for (const [key, icon] of Object.entries(iconMap)) {
    if (type.includes(key)) return icon;
  }
  return '🔗';
};

// 获取关系类型的颜色（高对比度颜色）
const getRelationColor = (type) => {
  // 情感关系：深粉/红色
  if (type.includes('爱情') || type.includes('暗恋')) return '#FF1493';
  if (type.includes('前任')) return '#FF69B4';
  // 亲情：皇家蓝
  if (type.includes('亲情')) return '#4169E1';
  // 友情：酸橙绿
  if (type.includes('友情') || type.includes('闺蜜')) return '#32CD32';
  // 对抗关系：猩红/金色
  if (type.includes('仇恨')) return '#DC143C';
  if (type.includes('竞争') || type.includes('商业竞争')) return '#FF8C00';
  // 负面关系：紫色
  if (type.includes('利用') || type.includes('误会') || type.includes('嫉妒')) return '#9370DB';
  // 合作关系：蓝绿色
  if (type.includes('合作') || type.includes('雇佣') || type.includes('上下级')) return '#20B2AA';
  // 特殊关系：橙红色
  if (type.includes('秘密') || type.includes('保护')) return '#FF6347';
  // 默认：灰色
  return '#A0A0A0';
};

// 初始化图表
const initChart = () => {
  if (!chartRef.value) {
    console.warn('⚠️ chartRef 不存在，无法初始化图表');
    return;
  }

  // 检查元素是否可见和有宽高
  const rect = chartRef.value.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    console.warn('⚠️ chartRef 元素宽高为0，延迟初始化');
    // 延迟100ms重试
    setTimeout(() => {
      if (chartRef.value && !chartInstance.value) {
        const newRect = chartRef.value.getBoundingClientRect();
        if (newRect.width > 0 && newRect.height > 0) {
          chartInstance.value = echarts.init(chartRef.value);
          console.log('✅ 图表延迟初始化成功');
          updateChart();
        }
      }
    }, 100);
    return;
  }

  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value);
    console.log('✅ 图表初始化成功');
  }
  updateChart();
};

// 更新图表
const updateChart = () => {
  if (!chartInstance.value) {
    console.warn('⚠️ chartInstance 未初始化，尝试重新初始化');
    // 尝试重新初始化
    initChart();
    if (!chartInstance.value) {
      console.error('❌ 无法初始化图表，放弃更新');
      return;
    }
  }

  if (graphData.value.nodes.length === 0) {
    console.warn('⚠️ 图谱数据为空，不更新图表');
    return;
  }

  console.log('📊 开始更新图表...', graphData.value);

  // 过滤关系数据
  let filteredLinks = graphData.value.links;
  if (!selectedRelationTypes.value.includes('all')) {
    filteredLinks = graphData.value.links.filter(link => {
      const type = link.relationshipType || '';
      return selectedRelationTypes.value.some(filterType => {
        if (filterType === '爱情') return type.includes('爱情') || type.includes('暗恋');
        if (filterType === '亲情') return type.includes('亲情');
        if (filterType === '友情') return type.includes('友情') || type.includes('闺蜜');
        if (filterType === '仇恨') return type.includes('仇恨');
        if (filterType === '竞争') return type.includes('竞争');
        if (filterType === '合作') return type.includes('合作') || type.includes('雇佣') || type.includes('上下级');
        return false;
      });
    });
  }

  const option = {
    tooltip: {
      formatter: (params) => {
        if (params.dataType === 'edge') {
          const strength = '⭐'.repeat(params.data.strength || 3);
          return `<div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 5px;">
              ${getRelationIcon(params.data.relationshipType)} ${params.data.relationshipType}
            </div>
            <div style="color: #999; font-size: 12px; margin-bottom: 3px;">
              关系强度：${strength}
            </div>
            <div style="font-size: 13px;">
              ${params.data.description || '暂无描述'}
            </div>
          </div>`;
        }
        return `<div style="padding: 8px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">
            ${params.data.name}
          </div>
          <div style="color: #999; font-size: 12px;">
            ${params.data.role || '角色'}
          </div>
        </div>`;
      }
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: graphData.value.nodes,
      links: filteredLinks,
      roam: true,
      draggable: true,
      label: {
        show: true,
        position: 'bottom',
        color: '#333',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        padding: [3, 6],
        borderRadius: 3,
        fontSize: 12
      },
      edgeLabel: {
        show: false,  // 默认隐藏关系标签
        fontSize: 10,
        color: '#666',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        padding: [2, 5],
        borderRadius: 3,
        formatter: (params) => {
          return getRelationIcon(params.data.relationshipType) + ' ' + params.data.relationshipType;
        }
      },
      force: {
        repulsion: 800,        // 增加排斥力，让节点更分散
        edgeLength: [380, 650], // 增加连线长度
        gravity: 0.08,          // 降低重力，减少向中心聚集
        layoutAnimation: true,
        friction: 0.6           // 添加阻力，让动画更平滑
      },
      emphasis: {
        focus: 'adjacency',  // 点击节点时高亮相邻节点和连线
        scale: true,         // 放大效果
        lineStyle: {
          width: 6,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        },
        itemStyle: {
          shadowBlur: 15,
          shadowColor: 'rgba(0, 0, 0, 0.4)',
          borderWidth: 3,
          borderColor: '#fff'
        },
        label: {
          show: true,  // 点击时显示标签
          fontSize: 16,
          fontWeight: 'bold'
        },
        edgeLabel: {
          show: true,  // 点击时显示关系标签
          fontSize: 12
        }
      },
      lineStyle: {
        curveness: 0.3
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut'
    }]
  };

  chartInstance.value.setOption(option, true);
  console.log('✅ 图表更新完成');
};

// 生命周期
onMounted(() => {
  nextTick(() => {
    if (chartRef.value) {
      initChart();
    }

    // 尝试加载保存的关系数据
    if (props.characters.length > 0) {
      loadRelationships();
    }
  });
});
</script>

<style scoped>
.relationship-graph {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.graph-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  padding: 40px;
}

.empty-actions {
  width: 100%;
  max-width: 600px;
}

.empty-actions ul {
  text-align: left;
}

.graph-container {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
}

.chart-wrapper {
  flex: 1;
  background: #fafafa;  /* 浅灰色背景，让白色标签更显眼 */
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  min-height: 600px;
}

.graph-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
  padding-right: 5px;
}

.sidebar-card {
  margin-bottom: 0;
  flex-shrink: 0;
}

.sidebar-card :deep(.el-card__body) {
  max-height: 400px;
  overflow-y: auto;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
}

.stat-item:hover {
  background: #e8f4ff;
  transform: translateX(2px);
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #409EFF;
}

/* 图例样式 */
.legend-content {
  font-size: 13px;
}

.legend-section {
  margin-bottom: 8px;
}

.legend-title {
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  color: #606266;
}

.legend-dot {
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.legend-line {
  width: 30px;
  height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.legend-line-demo {
  width: 30px;
  height: 2px;
  background: #606266;
  flex-shrink: 0;
}

.legend-line-demo.solid {
  background: linear-gradient(90deg, #606266 0%, #606266 100%);
}

.legend-line-demo.dashed {
  background: linear-gradient(90deg, #606266 0%, #606266 40%, transparent 40%, transparent 60%, #606266 60%, #606266 100%);
}

/* 过滤器样式 */
.filter-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-item {
  width: 100%;
}

.filter-item :deep(.el-checkbox) {
  width: 100%;
  margin-right: 0;
  height: auto;
}

.filter-item :deep(.el-checkbox.is-bordered) {
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.3s;
}

.filter-item :deep(.el-checkbox.is-bordered.is-checked) {
  border-color: #409EFF;
  background-color: #ecf5ff;
}

.filter-item :deep(.el-checkbox.is-bordered.is-disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式 */
@media (max-width: 1200px) {
  .graph-container {
    flex-direction: column;
  }

  .graph-stats {
    width: 100%;
  }

  .stats-content {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .stat-item {
    flex: 1;
    min-width: 150px;
  }
}
</style>
