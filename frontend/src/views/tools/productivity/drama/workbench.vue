<template>
  <div class="drama-workbench">
    <!-- 顶部导航栏 -->
    <div class="workbench-header">
      <div class="header-left">
        <el-button type="text" :icon="ArrowLeft" @click="goBack">
          返回项目列表
        </el-button>

        <el-divider direction="vertical" />

        <div class="project-info">
          <h2 class="project-name">{{ project.name }}</h2>
          <el-tag :type="getStatusType(project.status)" size="small">
            {{ project.status }}
          </el-tag>
        </div>
      </div>

      <div class="header-right">
        <!-- 自动保存状态指示器（优化版） -->
        <div class="auto-save-indicator">
          <el-tooltip placement="bottom">
            <template #content>
              <div class="auto-save-tooltip">
                <div v-if="isSaving" class="tooltip-row">
                  <strong>⏳ 正在保存...</strong>
                </div>
                <div v-else-if="lastSaveTime" class="tooltip-row">
                  <strong>✅ 最后保存:</strong> {{ formatSaveTime(lastSaveTime) }}
                </div>
                <div v-else class="tooltip-row">
                  <strong>📝 未保存</strong>
                </div>
                <el-divider style="margin: 8px 0;" />
                <div class="tooltip-section">
                  <div class="tooltip-title">🛡️ 自动保存规则</div>
                  <div class="tooltip-item">• 每1小时自动检查一次</div>
                  <div class="tooltip-item">• 仅保存有变化的模块</div>
                  <div class="tooltip-item">• 手动保存后重置计时</div>
                  <div class="tooltip-item" style="color: #67c23a;">• 最多保留10个自动保存版本</div>
                </div>
                <el-divider style="margin: 8px 0;" />
                <div class="tooltip-section">
                  <div class="tooltip-title">💡 建议</div>
                  <div class="tooltip-item">• 重要修改请手动保存</div>
                  <div class="tooltip-item">• 长时间编辑建议定期手动保存</div>
                </div>
                <div v-if="hasAnyChanges()" class="tooltip-warning">
                  <el-icon>
                    <WarningFilled />
                  </el-icon>
                  有未保存的修改
                </div>
              </div>
            </template>
            <div class="save-status" :class="{ 'has-changes': hasAnyChanges() }">
              <el-icon :class="{ 'saving': isSaving }">
                <CircleCheck v-if="!isSaving && !hasAnyChanges()" />
                <Loading v-else-if="isSaving" />
                <EditPen v-else />
              </el-icon>
              <span class="save-text">
                {{ getSaveStatusText() }}
              </span>
            </div>
          </el-tooltip>
        </div>

        <el-progress :percentage="project.progress" :stroke-width="8" style="width: 150px" />
        <el-dropdown @command="handleExportCommand" split-button @click="handleQuickExport">
          <el-icon>
            <Download />
          </el-icon>
          导出
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="txt">
                <el-icon>
                  <Document />
                </el-icon>
                导出TXT
              </el-dropdown-item>
              <el-dropdown-item command="markdown">
                <el-icon>
                  <Tickets />
                </el-icon>
                导出Markdown
              </el-dropdown-item>
              <el-dropdown-item command="with-incomplete" divided>
                <el-icon>
                  <FolderOpened />
                </el-icon>
                包含未完成剧集
              </el-dropdown-item>
              <el-dropdown-item command="custom">
                <el-icon>
                  <Setting />
                </el-icon>
                自定义导出...
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" :icon="Setting" @click="showSettings = true">
          项目设置
        </el-button>
      </div>
    </div>

    <!-- 工作区 -->
    <div class="workbench-content">
      <!-- 左侧导航 -->
      <div class="sidebar">
        <el-menu :default-active="activeTab" class="sidebar-menu" @select="handleTabChange">
          <el-menu-item index="worldview">
            <el-icon>
              <Document />
            </el-icon>
            <span>世界观设定</span>
          </el-menu-item>
          <el-menu-item index="characters">
            <el-icon>
              <User />
            </el-icon>
            <span>角色管理</span>
            <el-badge v-if="characters.length" :value="characters.length" class="item-badge" />
          </el-menu-item>
          <el-menu-item index="outline">
            <el-icon>
              <List />
            </el-icon>
            <span>剧情大纲</span>
          </el-menu-item>
          <el-menu-item index="episodes">
            <el-icon>
              <Tickets />
            </el-icon>
            <span>分集剧本</span>
            <el-badge v-if="episodes.length" :value="episodes.length" class="item-badge" />
          </el-menu-item>
          <el-menu-item index="analysis">
            <el-icon>
              <Monitor />
            </el-icon>
            <span>剧本医生</span>
          </el-menu-item>
          <el-menu-item index="statistics">
            <el-icon>
              <DataAnalysis />
            </el-icon>
            <span>数据统计</span>
          </el-menu-item>
          <el-menu-item index="prompt-template">
            <el-icon>
              <Edit />
            </el-icon>
            <span>提示词模板</span>
          </el-menu-item>
          <el-menu-item index="versions">
            <el-icon>
              <Clock />
            </el-icon>
            <span>版本历史</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 世界观设定 -->
        <div v-if="activeTab === 'worldview'" class="content-panel">
          <WorldviewEditor v-model="worldview" :project-info="project" @save="handleSaveWorldview" />
        </div>

        <!-- 角色管理 -->
        <div v-else-if="activeTab === 'characters'" class="content-panel">
          <CharacterManager v-model="characters" :project-info="project" :worldview="worldview"
            @save="handleSaveCharacters" />
        </div>

        <!-- 剧情大纲 -->
        <div v-else-if="activeTab === 'outline'" class="content-panel">
          <OutlineEditor v-model="outline" :project-info="project" :worldview="worldview" :characters="characters"
            @generate="handleGenerateOutline" @save="handleSaveOutline" />
        </div>

        <!-- 分集剧本 -->
        <div v-else-if="activeTab === 'episodes'" class="content-panel">
          <EpisodeManager v-model="episodes" :project-info="project" :worldview="worldview" :outline="outline"
            :characters="characters" :prompt-template="promptTemplate" @save="handleSaveEpisodes" />
        </div>

        <!-- 提示词模板 -->
        <div v-else-if="activeTab === 'prompt-template'" class="content-panel">
          <PromptTemplateEditor v-model="promptTemplate" :project-info="project" :worldview="worldview"
            :characters="characters" @save="handleSavePromptTemplate" />
        </div>

        <!-- 剧本医生 -->
        <div v-else-if="activeTab === 'analysis'" class="content-panel">
          <ScriptAnalysis :project="fullProjectData" @goto-module="handleTabChange" />
        </div>

        <!-- 数据统计 -->
        <div v-else-if="activeTab === 'statistics'" class="content-panel">
          <StatisticsPanel :project="project" @refresh="handleRefreshData" @go-to-tab="handleTabChange" />
        </div>

        <!-- 版本历史 -->
        <div v-else-if="activeTab === 'versions'" class="content-panel">
          <VersionHistory :project="project" @restore="handleRestoreVersion" />
        </div>
      </div>
    </div>

    <!-- 导出对话框 -->
    <ExportDialog ref="exportDialogRef" v-model="exportDialogVisible" :project-id="project._id || project.id"
      :project-name="project.name" :project-data="exportProjectData" @confirm="handleConfirmExport" />

    <!-- 项目设置对话框 -->
    <el-dialog v-model="showSettings" title="项目设置" width="600px">
      <el-form :model="project" label-width="100px">
        <el-form-item label="项目名称">
          <el-input v-model="project.name" />
        </el-form-item>
        <el-form-item label="剧本类型">
          <el-select v-model="project.type" style="width: 100%">
            <el-option label="霸道总裁" value="霸道总裁" />
            <el-option label="悬疑推理" value="悬疑推理" />
            <el-option label="甜宠日常" value="甜宠日常" />
            <el-option label="复仇爽剧" value="复仇爽剧" />
            <el-option label="古装穿越" value="古装穿越" />
            <el-option label="职场励志" value="职场励志" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划集数">
          <el-input-number v-model="project.episodeCount" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="project.description" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="handleSaveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElNotification } from 'element-plus';
import { getDramaProject, updateDramaProject, patchDramaWorldview, patchDramaCharacters, patchDramaOutline, patchDramaEpisodes, patchDramaPromptTemplate, exportDramaProject } from '@/api/drama';
import { downloadBlob, generateFilename } from '@/utils/download';
import { createVersion } from './utils/versionManager';
import {
  ArrowLeft,
  Download,
  Setting,
  Document,
  User,
  List,
  Tickets,
  Clock,
  DataAnalysis,
  Edit,
  FolderOpened,
  CircleCheck,
  Monitor,
  Loading,
  EditPen,
  WarningFilled
} from '@element-plus/icons-vue';

// 导入组件
import WorldviewEditor from './components/WorldviewEditor.vue';
import CharacterManager from './components/CharacterManager.vue';
import OutlineEditor from './components/OutlineEditor.vue';
import EpisodeManager from './components/EpisodeManager.vue';
import StatisticsPanel from './components/StatisticsPanel.vue';
import PromptTemplateEditor from './components/PromptTemplateEditor.vue';
import ExportDialog from './components/ExportDialog.vue';
import VersionHistory from './components/VersionHistory.vue';
import ScriptAnalysis from './components/ScriptAnalysis.vue';

const router = useRouter();
const route = useRoute();

// 当前激活的标签
const activeTab = ref('worldview');

// 显示设置对话框
const showSettings = ref(false);

// 自动保存相关状态
const autoSaveEnabled = ref(true); // 自动保存开关
const lastSaveTime = ref(null); // 最后保存时间
const lastAutoSaveTime = ref(null); // 上次自动保存时间
const isSaving = ref(false); // 是否正在保存
const isInitialized = ref(false); // 是否已完成初始化
const autoSaveInterval = 3600000; // 自动保存间隔：1小时（毫秒）
const maxAutoSaveVersions = 10; // 最多保留10个自动保存版本

// 数据变化标记（用于跟踪哪些模块被修改）
const dataChangeFlags = ref({
  worldview: false,
  characters: false,
  outline: false,
  episodes: false
});

// 自动保存定时器
let autoSaveTimer = null;

// 导出对话框状态
const exportDialogVisible = ref(false);
const exportDialogRef = ref(null);

// 项目数据
const project = reactive({
  _id: route.params.id,
  id: route.params.id,
  name: '',
  type: '',
  status: '设定中',
  episodeCount: 60,
  progress: 0,
  description: ''
});

// 世界观数据
const worldview = ref({
  background: '',
  setting: '',
  theme: '',
  conflict: '',
  tone: ''
});

// 初始化世界观数据
if (project.worldview) {
  worldview.value = { ...project.worldview };
}

// 角色数据
const characters = ref([]);

// 大纲数据 - 初始化三幕结构
const outline = ref({
  structure: 'three-act',
  acts: [
    {
      actNumber: 1,
      title: '第一幕：开端',
      description: '建立世界观，介绍主要角色，引发核心冲突',
      plotPoints: []
    },
    {
      actNumber: 2,
      title: '第二幕：对抗',
      description: '角色面对挑战，冲突升级，经历转折',
      plotPoints: []
    },
    {
      actNumber: 3,
      title: '第三幕：结局',
      description: '冲突解决，故事高潮，收尾',
      plotPoints: []
    }
  ]
});

// 分集数据
const episodes = ref([]);

// 提示词模板数据
const promptTemplate = ref({
  useCustom: false,
  customTemplate: null, // 使用 null 表示未初始化，区分于空字符串
  lastModified: null
});


// 导出对话框数据
const exportProjectData = computed(() => ({
  ...project,
  worldview: worldview.value,
  characters: characters.value,
  outline: outline.value,
  episodes: episodes.value,
  promptTemplate: promptTemplate.value
}));

// 完整项目数据（用于剧本医生分析）
const fullProjectData = computed(() => ({
  ...project,
  worldview: worldview.value,
  characters: characters.value,
  outline: outline.value,
  episodes: episodes.value
}));

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    '设定中': 'info',
    '大纲中': 'warning',
    '剧本中': 'primary',
    '已完成': 'success'
  };
  return types[status] || 'info';
};

// 返回项目列表
const goBack = () => {
  router.push({ name: 'DramaScriptGenerator' });
};

// 标签切换
const handleTabChange = (index) => {
  activeTab.value = index;
};

// 快速导出（默认TXT格式，仅已完成）
const handleQuickExport = async () => {
  await performExport({ format: 'txt', includeIncomplete: false });
};

// 导出命令处理
const handleExportCommand = async (command) => {
  switch (command) {
    case 'txt':
      await performExport({ format: 'txt', includeIncomplete: false });
      break;
    case 'markdown':
      await performExport({ format: 'markdown', includeIncomplete: false });
      break;
    case 'with-incomplete':
      await performExport({ format: 'txt', includeIncomplete: true });
      break;
    case 'custom':
      // 打开自定义导出对话框
      exportDialogVisible.value = true;
      break;
  }
};

// 执行导出
const performExport = async (options) => {
  try {
    const projectId = project._id || project.id;
    const blob = await exportDramaProject(projectId, options);

    // 生成文件名
    const ext = options.format === 'markdown' ? 'md' : 'txt';
    const filename = generateFilename(project.name, ext);

    // 下载文件
    downloadBlob(blob, filename);

    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error(error.message || '导出失败，请稍后再试');
  }
};

// 确认导出（来自对话框）
const handleConfirmExport = async (options) => {
  // 设置导出中状态
  if (exportDialogRef.value) {
    exportDialogRef.value.setExporting(true);
  }

  try {
    await performExport(options);
    exportDialogVisible.value = false;
  } finally {
    // 恢复状态
    if (exportDialogRef.value) {
      exportDialogRef.value.setExporting(false);
    }
  }
};

// 保存设置
const handleSaveSettings = async () => {
  try {
    const response = await updateDramaProject(project._id || project.id, {
      name: project.name,
      type: project.type,
      episodeCount: project.episodeCount,
      description: project.description
    });

    if (response.code === 200) {
      Object.assign(project, response.data);
      ElMessage.success('项目设置已保存');
      showSettings.value = false;
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存项目设置失败:', error);
    ElMessage.error(error.message || '保存项目设置失败');
  }
};

// 计算项目进度
const calculateProjectProgress = () => {
  const totalEpisodes = project.episodeCount || 60;
  const completedCount = episodes.value.filter(
    ep => ep.status === 'completed' || ep.status === 'reviewed'
  ).length;
  return totalEpisodes > 0 ? Math.round((completedCount / totalEpisodes) * 100) : 0;
};

// 更新项目进度到服务器
const updateProjectProgress = async () => {
  const newProgress = calculateProjectProgress();
  if (newProgress !== project.progress) {
    project.progress = newProgress;
    // 静默更新进度，不显示提示
    try {
      await updateDramaProject(project._id || project.id, {
        progress: newProgress
      });
    } catch (error) {
      console.error('更新进度失败:', error);
    }
  }
};

// 自动判断和更新项目状态
const updateProjectStatus = async () => {
  const newStatus = calculateProjectStatus();
  if (newStatus !== project.status) {
    const oldStatus = project.status;
    project.status = newStatus;

    // 更新到服务器
    try {
      await updateDramaProject(project._id || project.id, {
        status: newStatus
      });
      console.log(`项目状态更新: ${oldStatus} -> ${newStatus}`);
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  }
};

// 计算项目当前状态
const calculateProjectStatus = () => {
  // 1. 检查是否已完成：所有分集都完成且达到目标集数
  const targetEpisodes = project.episodeCount || 60;
  const currentEpisodes = episodes.value.length;
  const completedEpisodes = episodes.value.filter(
    ep => ep.status === 'completed' || ep.status === 'reviewed'
  ).length;

  if (currentEpisodes >= targetEpisodes && completedEpisodes >= targetEpisodes) {
    return '已完成';
  }

  // 2. 检查是否在剧本中：有分集且有已完成的分集
  if (currentEpisodes > 0 && completedEpisodes > 0) {
    return '剧本中';
  }

  // 3. 检查是否在大纲中：有大纲节点且有分集（但没有完成的）
  const hasOutlinePoints = outline.value?.acts?.some(
    act => act.plotPoints && act.plotPoints.length > 0
  ) || false;

  if (hasOutlinePoints && currentEpisodes > 0) {
    return '大纲中';
  }

  // 4. 检查是否在大纲中：只有大纲节点，没有分集
  if (hasOutlinePoints) {
    return '大纲中';
  }

  // 5. 默认：还在设定中（有世界观或角色，但没有大纲）
  return '设定中';
};

// 标记数据已修改
const markDataChanged = (module) => {
  if (dataChangeFlags.value.hasOwnProperty(module)) {
    dataChangeFlags.value[module] = true;
    console.log(`📝 数据变化标记: ${module}`);
  }
};

// 重置所有变化标记
const resetChangeFlags = () => {
  Object.keys(dataChangeFlags.value).forEach(key => {
    dataChangeFlags.value[key] = false;
  });
};

// 检查是否有任何数据变化
const hasAnyChanges = () => {
  return Object.values(dataChangeFlags.value).some(flag => flag === true);
};

// 格式化保存时间
const formatSaveTime = (time) => {
  if (!time) return '';
  const date = new Date(time);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // 秒数差

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 获取保存状态文本
const getSaveStatusText = () => {
  if (isSaving.value) {
    return '保存中...';
  }
  if (hasAnyChanges()) {
    return '有修改';
  }
  return '已保存';
};

// 全局自动保存函数（每小时触发一次）
const performAutoSave = async () => {
  if (!autoSaveEnabled.value || isSaving.value || !isInitialized.value) {
    return;
  }

  // 检查是否有任何数据变化
  if (!hasAnyChanges()) {
    console.log('🕐 定时检查：没有数据变化，跳过自动保存');
    return;
  }

  console.log('💾 开始自动保存，变化的模块:', dataChangeFlags.value);

  try {
    isSaving.value = true;
    const savedModules = [];

    // 保存所有有变化的模块
    if (dataChangeFlags.value.worldview) {
      await handleSaveWorldview(worldview.value, true);
      savedModules.push('世界观');
    }

    if (dataChangeFlags.value.characters) {
      await handleSaveCharacters(characters.value, true);
      savedModules.push('角色');
    }

    if (dataChangeFlags.value.outline) {
      await handleSaveOutline(outline.value, true);
      savedModules.push('大纲');
    }

    if (dataChangeFlags.value.episodes) {
      await handleSaveEpisodes(episodes.value, true);
      savedModules.push('分集');
    }

    // 更新保存时间
    lastSaveTime.value = new Date();
    lastAutoSaveTime.value = new Date();

    // 重置变化标记
    resetChangeFlags();

    // 显示通知
    if (savedModules.length > 0) {
      ElNotification.success({
        title: '自动保存',
        message: `已保存: ${savedModules.join('、')}`,
        duration: 3000,
        offset: 50
      });
    }

    console.log('✅ 自动保存完成，保存了:', savedModules);
  } catch (error) {
    console.error('自动保存失败:', error);
    ElNotification.error({
      title: '自动保存失败',
      message: '部分数据保存失败，请手动保存',
      duration: 3000
    });
  } finally {
    isSaving.value = false;
  }
};

// 启动自动保存定时器
const startAutoSaveTimer = () => {
  // 清除现有定时器
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }

  // 设置1小时定时器
  autoSaveTimer = setInterval(() => {
    performAutoSave();
  }, autoSaveInterval);

};

// 停止自动保存定时器
const stopAutoSaveTimer = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

// 世界观相关
const handleSaveWorldview = async (worldviewData, isAutoSave = false) => {
  try {
    const projectId = project._id || project.id;
    const response = await patchDramaWorldview(projectId, worldviewData);

    if (response.code === 200) {
      // 创建版本快照
      try {
        await createVersion('worldview', projectId, worldviewData, projectId, { isAutoSave });
      } catch (versionError) {
        console.error('创建版本失败:', versionError);
        // 版本创建失败不影响保存
      }

      // 修复问题3：同步更新 project 对象，触发统计面板响应式更新
      project.worldview = { ...worldviewData };

      // 修复：手动保存后更新保存时间和重置变化标记
      if (!isAutoSave) {
        lastSaveTime.value = new Date();
        dataChangeFlags.value.worldview = false;
        ElMessage.success('世界观已保存');
      }

      // 更新项目进度和状态
      await updateProjectProgress();
      await updateProjectStatus();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存世界观失败:', error);
    // 错误始终显示
    ElMessage.error(error.message || '保存世界观失败');
    throw error; // 重新抛出错误供autoSaveWrapper捕获
  }
};

// 角色相关
const handleSaveCharacters = async (charactersData, isAutoSave = false) => {
  try {
    const projectId = project._id || project.id;
    const response = await patchDramaCharacters(projectId, charactersData);

    if (response.code === 200) {
      // 为每个角色创建版本快照
      try {
        for (const character of charactersData) {
          await createVersion('character', character.id, character, projectId, { isAutoSave });
        }
      } catch (versionError) {
        console.error('创建版本失败:', versionError);
      }

      // 修复问题3：同步更新 project 对象，触发统计面板响应式更新
      project.characters = [...charactersData];

      // 修复：手动保存后更新保存时间和重置变化标记
      if (!isAutoSave) {
        lastSaveTime.value = new Date();
        dataChangeFlags.value.characters = false;
        ElMessage.success('角色已保存');
      }

      // 更新项目进度和状态
      await updateProjectProgress();
      await updateProjectStatus();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存角色失败:', error);
    ElMessage.error(error.message || '保存角色失败');
    throw error;
  }
};

// 大纲相关
const handleGenerateOutline = () => {
  // OutlineEditor内部已有生成提示词功能，这里只是占位
  ElMessage.info('请在大纲编辑器中使用生成提示词功能');
};

const handleSaveOutline = async (outlineData, isAutoSave = false) => {
  try {
    const projectId = project._id || project.id;
    const response = await patchDramaOutline(projectId, outlineData);

    if (response.code === 200) {
      // 创建版本快照
      try {
        await createVersion('outline', projectId, outlineData, projectId, { isAutoSave });
      } catch (versionError) {
        console.error('创建版本失败:', versionError);
      }

      // 修复问题3：同步更新 project 对象，触发统计面板响应式更新
      project.outline = { ...outlineData };

      // 修复：手动保存后更新保存时间和重置变化标记
      if (!isAutoSave) {
        lastSaveTime.value = new Date();
        dataChangeFlags.value.outline = false;
        ElMessage.success('大纲已保存');
      }

      // 更新项目进度和状态
      await updateProjectProgress();
      await updateProjectStatus();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存大纲失败:', error);
    ElMessage.error(error.message || '保存大纲失败');
    throw error;
  }
};

// 分集相关 - EpisodeManager内部已处理这些事件
const handleAddEpisode = () => {
  // EpisodeManager内部处理
};

const handleEditEpisode = (episode) => {
  // EpisodeManager内部处理
};

const handleDeleteEpisode = (episode) => {
  // EpisodeManager内部处理
};

// 提示词模板相关
const handleSavePromptTemplate = async (templateData) => {
  try {
    // 修复：确保完整保存所有字段，包括 useCustom、customTemplate、lastModified
    const promptTemplateToSave = {
      useCustom: templateData.useCustom ?? false,
      customTemplate: templateData.customTemplate ?? null,
      lastModified: templateData.lastModified ?? null
    };

    const response = await patchDramaPromptTemplate(project._id || project.id, promptTemplateToSave);

    if (response.code === 200) {
      // 修复：保存成功后同步更新本地状态，避免数据不一致
      promptTemplate.value = { ...promptTemplateToSave };
      ElMessage.success('提示词模板已保存');
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存提示词模板失败:', error);
    ElMessage.error(error.message || '保存提示词模板失败');
  }
};

const handleGenerateEpisode = () => {
  // EpisodeManager内部处理
};

const handleSaveEpisodes = async (episodesData, isAutoSave = false) => {
  try {
    const projectId = project._id || project.id;
    const response = await patchDramaEpisodes(projectId, episodesData);

    if (response.code === 200) {
      // 修复：只为实际修改的分集创建版本快照
      // 通过对比 updatedAt 时间戳来判断哪些分集是刚刚修改的
      try {
        const now = new Date();
        const recentThreshold = 5000; // 5秒内的修改视为本次保存

        for (const episode of episodesData) {
          const updatedAt = new Date(episode.updatedAt);
          const timeDiff = now - updatedAt;

          // 只为最近修改的分集创建版本
          if (timeDiff <= recentThreshold) {
            await createVersion('episode', episode.id || episode.number.toString(), episode, projectId, { isAutoSave });
            console.log(`✅ 创建版本: 第${episode.number}集 (修改于 ${timeDiff}ms 前)`);
          }
        }
      } catch (versionError) {
        console.error('创建版本失败:', versionError);
      }

      // 修复问题3：同步更新 project 对象，触发统计面板响应式更新
      project.episodes = [...episodesData];

      // 修复：手动保存后更新保存时间和重置变化标记
      if (!isAutoSave) {
        lastSaveTime.value = new Date();
        dataChangeFlags.value.episodes = false;
      }

      // 成功消息已在EpisodeManager中显示，这里不重复提示
      // 更新项目进度和状态（分集数据变化时尤其重要）
      await updateProjectProgress();
      await updateProjectStatus();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存分集失败:', error);
    ElMessage.error(error.message || '保存分集失败');
    throw error;
  }
};

// 统计相关
const handleRefreshData = async () => {
  try {
    const response = await getDramaProject(route.params.id);
    if (response.code === 200) {
      Object.assign(project, response.data);

      // 更新所有数据
      if (response.data.worldview) {
        worldview.value = { ...response.data.worldview };
      }
      if (response.data.characters) {
        characters.value = [...response.data.characters];
      }
      if (response.data.outline) {
        outline.value = { ...response.data.outline };
      }
      if (response.data.episodes) {
        episodes.value = [...response.data.episodes];
      }
      if (response.data.promptTemplate) {
        // 修复：确保正确读取并保留所有字段
        promptTemplate.value = {
          useCustom: response.data.promptTemplate.useCustom ?? false,
          customTemplate: response.data.promptTemplate.customTemplate ?? null,
          lastModified: response.data.promptTemplate.lastModified ?? null
        };
      }

      // 刷新后重新计算进度
      project.progress = calculateProjectProgress();
    }
  } catch (error) {
    console.error('刷新数据失败:', error);
    throw error;
  }
};

// 版本历史相关
const handleRestoreVersion = async (restoreData) => {
  try {
    const { moduleType, moduleId, content } = restoreData;
    const projectId = project._id || project.id;

    // 根据模块类型恢复数据
    switch (moduleType) {
      case 'worldview':
        // 恢复世界观
        worldview.value = { ...content };
        await patchDramaWorldview(projectId, content);
        ElMessage.success('世界观已恢复');
        break;

      case 'character':
        // 恢夏角色（找到则替换，找不到则添加）
        const charIndex = characters.value.findIndex(c => c.id === moduleId);
        if (charIndex > -1) {
          // 找到了，替换现有角色
          characters.value[charIndex] = { ...content };
          await patchDramaCharacters(projectId, characters.value);
          ElMessage.success(`角色 "${content.name}" 已恢复`);
        } else {
          // 找不到，说明已被删除，重新添加
          characters.value.push({ ...content });
          await patchDramaCharacters(projectId, characters.value);
          ElMessage.success(`角色 "${content.name}" 已恢复（已重新添加）`);
        }
        break;

      case 'outline':
        // 恢复大纲
        outline.value = { ...content };
        await patchDramaOutline(projectId, content);
        ElMessage.success('大纲已恢复');
        break;

      case 'episode':
        // 恢复分集（找到则替换，找不到则添加）
        const epIndex = episodes.value.findIndex(e => e.id === moduleId || e.number === content.number);
        if (epIndex > -1) {
          // 找到了，替换现有分集
          episodes.value[epIndex] = { ...content };
          await patchDramaEpisodes(projectId, episodes.value);
          ElMessage.success(`第${content.number}集已恢复`);
        } else {
          // 找不到，说明已被删除，重新添加
          episodes.value.push({ ...content });
          // 按集数排序
          episodes.value.sort((a, b) => a.number - b.number);
          await patchDramaEpisodes(projectId, episodes.value);
          ElMessage.success(`第${content.number}集已恢复（已重新添加）`);
        }
        break;

      default:
        ElMessage.error('未知的模块类型');
    }

    // 刷新项目进度
    await updateProjectProgress();
  } catch (error) {
    console.error('恢复版本失败:', error);
    ElMessage.error('恢复版本失败');
  }
};

// 设置数据变化监听器（只标记变化，不立即保存）
watch(
  () => worldview.value,
  () => {
    if (!isInitialized.value) return;
    markDataChanged('worldview');
  },
  { deep: true }
);

watch(
  () => characters.value,
  () => {
    if (!isInitialized.value) return;
    markDataChanged('characters');
  },
  { deep: true }
);

watch(
  () => outline.value,
  () => {
    if (!isInitialized.value) return;
    markDataChanged('outline');
  },
  { deep: true }
);

watch(
  () => episodes.value,
  () => {
    if (!isInitialized.value) return;
    markDataChanged('episodes');
  },
  { deep: true }
);

// 初始化
onMounted(async () => {
  try {
    const response = await getDramaProject(route.params.id);
    if (response.code === 200) {
      Object.assign(project, response.data);

      // 初始化世界观数据
      if (response.data.worldview) {
        worldview.value = { ...response.data.worldview };
      }

      // 初始化角色数据
      if (response.data.characters) {
        characters.value = [...response.data.characters];
      }

      // 初始化大纲数据
      if (response.data.outline) {
        outline.value = { ...response.data.outline };
      }

      // 初始化分集数据
      if (response.data.episodes) {
        episodes.value = [...response.data.episodes];
      }

      // 初始化提示词模板数据
      if (response.data.promptTemplate) {
        // 修复：确保正确读取并保留所有字段
        promptTemplate.value = {
          useCustom: response.data.promptTemplate.useCustom ?? false,
          customTemplate: response.data.promptTemplate.customTemplate ?? null,
          lastModified: response.data.promptTemplate.lastModified ?? null
        };
      } else {
        // 修复：如果数据库没有模板数据，初始化为默认值
        promptTemplate.value = {
          useCustom: false,
          customTemplate: null,
          lastModified: null
        };
      }

      // 标记初始化完成，延迟1秒后启用自动保存监听
      setTimeout(() => {
        isInitialized.value = true;
        // 重置所有变化标记（初始化不算变化）
        resetChangeFlags();
        // 启动自动保存定时器
        startAutoSaveTimer();
      }, 1000);
    } else {
      throw new Error(response.message || '加载失败');
    }
  } catch (error) {
    console.error('加载项目数据失败:', error);
    ElMessage.error(error.message || '加载项目数据失败');
    // 如果加载失败，返回项目列表
    setTimeout(() => {
      router.push({ name: 'DramaScriptGenerator' });
    }, 1500);
  }
});

// 组件销毁时清理定时器
import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  stopAutoSaveTimer();
});
</script>

<style scoped>
.drama-workbench {
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.workbench-header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 自动保存指示器（优化版） */
.auto-save-indicator {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae7ff;
  border-radius: 6px;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.auto-save-indicator:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #67c23a;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-status.has-changes {
  color: #e6a23c;
}

.save-status .el-icon {
  font-size: 16px;
  transition: all 0.3s ease;
}

.save-status .el-icon.saving {
  animation: rotate 1s linear infinite;
  color: #409eff;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.save-text {
  font-weight: 600;
  font-size: 13px;
}

/* Tooltip 样式 */
.auto-save-tooltip {
  max-width: 280px;
  padding: 4px;
}

.tooltip-row {
  margin-bottom: 4px;
  font-size: 13px;
  color: #ffffff;
}

.tooltip-section {
  margin: 8px 0;
}

.tooltip-title {
  font-weight: 600;
  font-size: 13px;
  color: #409eff;
  margin-bottom: 6px;
}

.tooltip-item {
  font-size: 12px;
  color: #ffffff;
  /* 修复：使用白色文字，与深色 tooltip 背景对比 */
  line-height: 1.6;
  padding-left: 4px;
}

.tooltip-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  background: #fef0f0;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 12px;
  font-weight: 600;
}

.tooltip-warning .el-icon {
  font-size: 14px;
}

.workbench-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  background: white;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.sidebar-menu {
  border: none;
}

.item-badge {
  margin-left: auto;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.content-panel {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-height: 500px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  font-size: 20px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .sidebar {
    width: 180px;
  }

  .main-content {
    padding: 16px;
  }

  .workbench-header {
    padding: 0 16px;
    flex-wrap: wrap;
    height: auto;
    min-height: 60px;
  }

  .header-left,
  .header-right {
    flex-wrap: wrap;
  }
}
</style>
