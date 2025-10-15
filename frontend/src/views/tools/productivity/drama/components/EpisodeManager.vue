<template>
  <div class="episode-manager">
    <div class="manager-header">
      <h3 class="section-title">
        <el-icon>
          <Film />
        </el-icon>
        分集管理
      </h3>
      <div class="header-actions">
        <el-button type="success" :icon="MagicStick" @click="handleAIBatchCreate">
          批量创建
        </el-button>
        <el-button type="primary" :icon="Plus" @click="handleAddEpisode">
          添加分集
        </el-button>
        <el-dropdown @command="handleExport">
          <el-button type="info" :icon="Download" :disabled="completedCount === 0">
            导出剧本<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="completed-txt">
                已完成剧本 (TXT)
              </el-dropdown-item>
              <el-dropdown-item command="completed-md">
                已完成剧本 (Markdown)
              </el-dropdown-item>
              <el-dropdown-item command="all-txt" divided>
                所有剧本 (TXT)
              </el-dropdown-item>
              <el-dropdown-item command="all-md">
                所有剧本 (Markdown)
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="warning" :icon="MagicStick" :disabled="episodes.length === 0" @click="handleBatchGenerate">
          批量生成提示词
        </el-button>
      </div>
    </div>

    <div class="manager-content">
      <!-- 视图切换 -->
      <div class="view-switcher">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button label="grid">
            <el-icon>
              <Grid />
            </el-icon>
            卡片视图
          </el-radio-button>
          <el-radio-button label="list">
            <el-icon>
              <List />
            </el-icon>
            列表视图
          </el-radio-button>
        </el-radio-group>

        <div class="stats-info">
          <el-tag type="info">共 {{ episodes.length }} 集</el-tag>
          <el-tag type="success">已完成 {{ completedCount }} 集</el-tag>
        </div>
      </div>

      <!-- 卡片视图 -->
      <div v-if="viewMode === 'grid'" class="episodes-grid">
        <div v-for="episode in sortedEpisodes" :key="episode.id" class="episode-card"
          @click="handleEditEpisode(episode)">
          <div class="card-header">
            <div class="episode-number">第 {{ episode.number }} 集</div>
            <el-tag :type="getStatusType(episode.status)" size="small">
              {{ getStatusText(episode.status) }}
            </el-tag>
          </div>

          <div class="card-body">
            <h4 class="episode-title">{{ episode.title || '未命名' }}</h4>
            <p class="episode-summary">{{ episode.content?.summary || '暂无简介' }}</p>

            <div class="episode-meta">
              <span class="meta-item">
                <el-icon>
                  <Document />
                </el-icon>
                {{ episode.wordCount || 0 }} 字
              </span>
              <span class="meta-item">
                <el-icon>
                  <Calendar />
                </el-icon>
                {{ formatDate(episode.updatedAt) }}
              </span>
            </div>
          </div>

          <div class="card-footer" @click.stop>
            <div class="footer-row">
              <el-button size="small" :icon="Edit" @click="handleEditEpisode(episode)" class="action-btn-flex">
                编辑
              </el-button>
              <el-tooltip content="生成普通提示词" placement="top">
                <el-button size="small" :icon="MagicStick" @click="handleGeneratePrompt(episode, false)"
                  class="action-btn-flex">
                  提示词
                </el-button>
              </el-tooltip>
            </div>
            <div class="footer-row">
              <el-tooltip content="下载完整创作包（含项目设定、角色、已完成剧集和当前集提示词）" placement="top">
                <el-button size="small" :icon="DocumentCopy" @click="handleDownloadCompletePackage(episode)"
                  class="action-btn-flex">
                  完整包
                </el-button>
              </el-tooltip>
              <el-button size="small" type="danger" :icon="Delete" @click="handleDeleteEpisode(episode)"
                class="action-btn-flex">
                删除
              </el-button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <el-empty v-if="episodes.length === 0" description="暂无分集，点击上方按钮添加" :image-size="120" />
      </div>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="episodes-list">
        <el-table :data="sortedEpisodes" style="width: 100%" @row-click="handleEditEpisode">
          <el-table-column prop="number" label="集数" width="80" sortable />
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              {{ row.title || '未命名' }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="wordCount" label="字数" width="100" sortable>
            <template #default="{ row }">
              {{ row.wordCount || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="360" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button-group>
                  <el-button size="small" :icon="Edit" @click.stop="handleEditEpisode(row)">
                    编辑
                  </el-button>
                  <el-tooltip content="生成普通提示词" placement="top">
                    <el-button size="small" :icon="MagicStick" @click.stop="handleGeneratePrompt(row, false)">
                      提示词
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="下载完整创作包" placement="top">
                    <el-button size="small" :icon="DocumentCopy" @click.stop="handleDownloadCompletePackage(row)">
                      完整包
                    </el-button>
                  </el-tooltip>
                </el-button-group>
                <el-button size="small" type="danger" :icon="Delete" @click.stop="handleDeleteEpisode(row)"
                  style="margin-left: 8px">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 空状态 -->
        <el-empty v-if="episodes.length === 0" description="暂无分集，点击上方按钮添加" :image-size="120" />
      </div>
    </div>

    <!-- 分集编辑对话框 -->
    <EpisodeDialog v-model="showEpisodeDialog" :episode="currentEpisode" :episode-number="nextEpisodeNumber"
      :characters="characters" @submit="handleEpisodeSubmit" />

    <!-- 提示词对话框 -->
    <PromptDialog v-model="showPromptDialog" :prompt="generatedPrompt" :title="`第${currentEpisode?.number}集提示词`" />

    <!-- 批量创建集数输入对话框 -->
    <el-dialog v-model="showBatchCreateDialog" title="批量创建分集" width="500px">
      <el-form :model="batchCreateForm" label-width="120px">
        <el-form-item label="起始集数">
          <el-input-number v-model="batchCreateForm.startNumber" :min="1" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束集数">
          <el-input-number v-model="batchCreateForm.endNumber" :min="batchCreateForm.startNumber" :max="100"
            style="width: 100%" />
        </el-form-item>
        <el-alert title="说明" :closable="false" type="info" show-icon>
          将根据大纲和角色信息为每一集创建基本框架，然后可使用“批量生成提示词”功能生成详细内容。
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showBatchCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchCreate">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 批量提示词对话框 -->
    <el-dialog v-model="showBatchPromptDialog" title="批量提示词" width="800px" :close-on-click-modal="false">
      <div class="batch-prompt-container">
        <el-alert title="使用说明" type="info" :closable="false" show-icon style="margin-bottom: 16px">
          已为 {{ batchPrompts.length }} 集生成提示词，可以分别复制到AI工具生成内容。
        </el-alert>

        <el-collapse v-model="activePrompts" accordion>
          <el-collapse-item v-for="(item, index) in batchPrompts" :key="index" :name="index">
            <template #title>
              <div class="prompt-item-header">
                <span class="episode-badge">第 {{ item.episode.number }} 集</span>
                <span class="episode-title">{{ item.episode.title || '未命名' }}</span>
              </div>
            </template>
            <div class="prompt-content">
              <el-input v-model="item.prompt" type="textarea" :rows="12" readonly />
              <div class="prompt-actions">
                <el-button type="primary" size="small" @click="copyPrompt(item.prompt)">
                  复制提示词
                </el-button>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      <template #footer>
        <el-button @click="showBatchPromptDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyAllPrompts">复制所有提示词</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Film,
  Plus,
  MagicStick,
  Grid,
  List,
  Document,
  Calendar,
  Edit,
  Delete,
  Download,
  ArrowDown,
  DocumentCopy
} from '@element-plus/icons-vue';
import EpisodeDialog from './EpisodeDialog.vue';
import PromptDialog from './PromptDialog.vue';
import { generateEpisodePrompt } from '../utils/promptTemplates';
import {
  checkScriptCompleteness,
  generateFullScript,
  downloadTextFile,
  generateCompleteCreationPackage
} from '../utils/scriptExporter';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  },
  worldview: {
    type: Object,
    default: () => ({})
  },
  outline: {
    type: Object,
    default: () => ({})
  },
  characters: {
    type: Array,
    default: () => []
  },
  promptTemplate: {
    type: Object,
    default: () => ({
      useCustom: false,
      customTemplate: null, // null 表示未初始化
      lastModified: null
    })
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

const viewMode = ref('grid');
const showEpisodeDialog = ref(false);
const showPromptDialog = ref(false);
const currentEpisode = ref(null);
const generatedPrompt = ref('');

// 批量创建相关
const showBatchCreateDialog = ref(false);
const batchCreateForm = ref({
  startNumber: 1,
  endNumber: 5
});

// 批量提示词相关
const showBatchPromptDialog = ref(false);
const batchPrompts = ref([]);
const activePrompts = ref(0);

// 分集列表
const episodes = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val)
});

// 排序后的分集
const sortedEpisodes = computed(() => {
  return [...episodes.value].sort((a, b) => a.number - b.number);
});

// 完成数量
const completedCount = computed(() => {
  return episodes.value.filter(e => e.status === 'completed' || e.status === 'reviewed').length;
});

// 下一集号
const nextEpisodeNumber = computed(() => {
  if (episodes.value.length === 0) return 1;
  const maxNumber = Math.max(...episodes.value.map(e => e.number));
  return maxNumber + 1;
});

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    draft: 'info',
    'in-progress': 'warning',
    completed: 'success',
    reviewed: 'success'
  };
  return types[status] || 'info';
};

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    'in-progress': '进行中',
    completed: '已完成',
    reviewed: '已审核'
  };
  return texts[status] || '未知';
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 添加分集
const handleAddEpisode = () => {
  currentEpisode.value = null;
  showEpisodeDialog.value = true;
};

// 编辑分集
const handleEditEpisode = (episode) => {
  currentEpisode.value = { ...episode };
  showEpisodeDialog.value = true;
};

// 删除分集
const handleDeleteEpisode = async (episode) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除第${episode.number}集吗？此操作不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    );

    const index = episodes.value.findIndex(e => e.id === episode.id);
    if (index > -1) {
      episodes.value.splice(index, 1);
      emit('save', episodes.value);
      ElMessage.success('已删除');
    }
  } catch {
    // 用户取消
  }
};

// 检查是否有已完成的前置剧集
const hasCompletedBeforeEpisode = (episodeNumber) => {
  return episodes.value.some(ep =>
    ep.number < episodeNumber &&
    (ep.status === 'completed' || ep.status === 'reviewed')
  );
};

// 生成提示词
const handleGeneratePrompt = (episode, includeContext = false) => {
  currentEpisode.value = episode;

  try {
    // 如果需要包含上下文，检查完整性
    if (includeContext) {
      const completenessCheck = checkScriptCompleteness(episodes.value, episode.number - 1);

      if (!completenessCheck.isComplete && completenessCheck.warnings.length > 0) {
        ElMessageBox.confirm(
          `检测到以下问题：\n${completenessCheck.warnings.slice(0, 5).join('\n')}${completenessCheck.warnings.length > 5 ? '\n...' : ''}\n\n是否继续生成带上下文的提示词？`,
          '提示',
          {
            confirmButtonText: '继续生成',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          generatePromptWithContext(episode, true);
        }).catch(() => {
          // 用户取消
        });
        return;
      }
    }

    generatePromptWithContext(episode, includeContext);
  } catch (error) {
    console.error('生成提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 生成带或不带上下文的提示词
const generatePromptWithContext = (episode, includeContext) => {
  generatedPrompt.value = generateEpisodePrompt({
    episode,
    projectInfo: props.projectInfo,
    worldview: props.worldview,
    outline: props.outline,
    characters: props.characters,
    allEpisodes: sortedEpisodes.value,
    includeFullContext: includeContext, // 传递是否包含完整上下文
    promptTemplate: props.promptTemplate // 传递提示词模板
  });
  showPromptDialog.value = true;
};

// 批量创建集数
const handleAIBatchCreate = () => {
  // 检查是否有大纲数据
  if (!props.outline || !props.outline.acts || props.outline.acts.length === 0) {
    ElMessageBox.confirm(
      '建议先完善大纲设定，这样AI能生成更合理的分集框架。是否继续？',
      '提示',
      {
        confirmButtonText: '继续创建',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      openBatchCreateDialog();
    }).catch(() => {
      // 用户取消
    });
  } else {
    openBatchCreateDialog();
  }
};

// 打开批量创建对话框
const openBatchCreateDialog = () => {
  batchCreateForm.value.startNumber = nextEpisodeNumber.value;
  batchCreateForm.value.endNumber = nextEpisodeNumber.value + 4; // 默认创建5集
  showBatchCreateDialog.value = true;
};

// 确认批量创建
const confirmBatchCreate = () => {
  const start = batchCreateForm.value.startNumber;
  const end = batchCreateForm.value.endNumber;

  if (start > end) {
    ElMessage.warning('起始集数不能大于结束集数');
    return;
  }

  const count = end - start + 1;
  if (count > 50) {
    ElMessage.warning('批量创建最多50集');
    return;
  }

  // 创建新的分集
  const newEpisodes = [];
  for (let i = start; i <= end; i++) {
    const newEpisode = {
      id: `${Date.now()}_${i}`,
      number: i,
      title: `第${i}集`,
      status: 'draft',
      wordCount: 0,
      content: {
        summary: '待生成',
        scenes: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    newEpisodes.push(newEpisode);
  }

  episodes.value.push(...newEpisodes);
  emit('save', episodes.value);

  ElMessage.success(`成功创建 ${count} 个分集框架`);
  showBatchCreateDialog.value = false;
};

// 批量生成提示词
const handleBatchGenerate = () => {
  if (episodes.value.length === 0) {
    ElMessage.warning('暂无分集');
    return;
  }

  try {
    const allEpisodes = sortedEpisodes.value;

    // 为所有分集生成提示词，每个提示词都包含完整的上下文
    batchPrompts.value = allEpisodes.map(episode => ({
      episode,
      prompt: generateEpisodePrompt({
        episode,
        projectInfo: props.projectInfo,
        worldview: props.worldview,
        outline: props.outline,
        characters: props.characters,
        allEpisodes, // 传递所有分集，便于生成上下集链接
        promptTemplate: props.promptTemplate // 传递提示词模板
      })
    }));

    activePrompts.value = 0; // 默认展开第一个
    showBatchPromptDialog.value = true;
    ElMessage.success(`成功生成 ${batchPrompts.value.length} 个提示词，已包含上下集链接信息`);
  } catch (error) {
    console.error('批量生成提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 复制单个提示词
const copyPrompt = async (prompt) => {
  try {
    await navigator.clipboard.writeText(prompt);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    ElMessage.error('复制失败，请手动复制');
  }
};

// 复制所有提示词
const copyAllPrompts = async () => {
  try {
    const allPrompts = batchPrompts.value
      .map((item, index) => `
========== 第 ${item.episode.number} 集 ==========
${item.prompt}
`)
      .join('\n\n');

    await navigator.clipboard.writeText(allPrompts);
    ElMessage.success('已复制所有提示词到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    ElMessage.error('复制失败，请手动复制');
  }
};

// 提交分集
const handleEpisodeSubmit = (episodeData) => {
  if (episodeData.id) {
    // 编辑
    const index = episodes.value.findIndex(e => e.id === episodeData.id);
    if (index > -1) {
      episodes.value[index] = {
        ...episodeData,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    // 新增
    const newEpisode = {
      ...episodeData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    episodes.value.push(newEpisode);
  }

  emit('save', episodes.value);
  ElMessage.success(episodeData.id ? '已更新' : '已添加');
};

// 下载完整创作包
const handleDownloadCompletePackage = (episode) => {
  try {
    // 尝试从 localStorage 读取关系图谱数据
    let relationshipGraph = null;
    try {
      const storageKey = `drama_relationships_${props.projectInfo.name}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // RelationshipGraph 保存的数据结构是 { relationships: [...], timestamp, characterNames }
        if (parsedData && typeof parsedData === 'object' && parsedData.relationships) {
          relationshipGraph = parsedData.relationships;
        } else if (Array.isArray(parsedData)) {
          relationshipGraph = parsedData;
        }
        
        // 验证数据格式
        if (Array.isArray(relationshipGraph) && relationshipGraph.length > 0) {
          const validRelationships = relationshipGraph.filter(rel => 
            rel && rel.from && rel.to && rel.type
          );
          relationshipGraph = validRelationships.length > 0 ? validRelationships : null;
        } else {
          relationshipGraph = null;
        }
      }
    } catch (error) {
      console.error('读取关系图谱数据失败:', error);
    }
    
    // 生成该集的提示词
    const episodePrompt = generateEpisodePrompt({
      episode,
      projectInfo: props.projectInfo,
      worldview: props.worldview,
      outline: props.outline,
      characters: props.characters,
      allEpisodes: sortedEpisodes.value,
      promptTemplate: props.promptTemplate // 传递提示词模板
    });

    // 生成完整创作包内容
    const packageContent = generateCompleteCreationPackage({
      episode: episode,
      projectInfo: props.projectInfo,
      worldview: props.worldview,
      characters: props.characters,
      outline: props.outline,
      allEpisodes: sortedEpisodes.value,
      prompt: episodePrompt,  // 添加提示词
      relationshipGraph: relationshipGraph  // 添加关系图谱
    });

    // 生成文件名
    const projectName = props.projectInfo.name || '未命名剧本';
    const filename = `${projectName}-第${episode.number}集-完整创作包.md`;

    // 下载文件
    downloadTextFile(packageContent, filename);

    ElMessage.success('完整创作包下载成功！');
  } catch (error) {
    console.error('下载完整创作包失败:', error);
    ElMessage.error('下载失败');
  }
};

// 导出剧本
const handleExport = async (command) => {
  const [type, format] = command.split('-'); // 'completed-txt' -> ['completed', 'txt']
  const includeIncomplete = type === 'all';

  try {
    // 检查完整性
    if (!includeIncomplete) {
      const completenessCheck = checkScriptCompleteness(episodes.value);

      if (!completenessCheck.isComplete && completenessCheck.warnings.length > 0) {
        const proceed = await ElMessageBox.confirm(
          `检测到以下问题：\n${completenessCheck.warnings.slice(0, 10).join('\n')}${completenessCheck.warnings.length > 10 ? `\n...还有${completenessCheck.warnings.length - 10}个问题` : ''}\n\n是否继续导出？`,
          '提示',
          {
            confirmButtonText: '继续导出',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
      }
    }

    // 生成剧本文本
    const scriptContent = generateFullScript({
      projectInfo: props.projectInfo,
      worldview: props.worldview,
      characters: props.characters,
      episodes: episodes.value,
      format: format,
      includeIncomplete: includeIncomplete
    });

    // 生成文件名
    const projectName = props.projectInfo.name || '未命名剧本';
    const statusText = includeIncomplete ? '完整' : '已完成';
    const ext = format === 'markdown' ? 'md' : 'txt';
    const filename = `${projectName}-${statusText}剧本.${ext}`;

    // 下载文件
    downloadTextFile(scriptContent, filename);

    ElMessage.success('导出成功！');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导出失败:', error);
      ElMessage.error('导出失败');
    }
  }
};
</script>

<style scoped>
.episode-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #EBEEF5;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.manager-content {
  flex: 1;
  overflow-y: auto;
}

.view-switcher {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stats-info {
  display: flex;
  gap: 8px;
}

.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.episode-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 2px solid #E4E7ED;
  transition: all 0.3s;
  cursor: pointer;
}

.episode-card:hover {
  border-color: #409EFF;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.episode-number {
  font-size: 16px;
  font-weight: 600;
  color: #409EFF;
}

/* 批量提示词样式 */
.batch-prompt-container {
  max-height: 600px;
  overflow-y: auto;
}

.prompt-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.episode-badge {
  background: #409EFF;
  color: white;
  padding: 2px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.episode-title {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.prompt-content {
  padding: 12px 0;
}

.prompt-actions {
  margin-top: 12px;
  text-align: right;
}

.episode-number {
  font-size: 16px;
  font-weight: 600;
  color: #409EFF;
}

.card-body {
  margin-bottom: 12px;
}

.episode-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.episode-summary {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 40px;
}

.episode-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.card-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #EBEEF5;
}

.footer-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.action-btn {
  flex: 1;
}

.action-btn-flex {
  flex: 1;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.episodes-list {
  background: white;
  border-radius: 8px;
  padding: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-button {
    flex: 1;
  }

  .view-switcher {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .episodes-grid {
    grid-template-columns: 1fr;
  }

  .card-footer {
    flex-wrap: wrap;
  }

  .card-footer .el-button {
    flex: 1;
  }
}
</style>
