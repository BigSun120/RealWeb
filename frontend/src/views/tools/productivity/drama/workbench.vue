<template>
  <div class="drama-workbench">
    <!-- 顶部导航栏 -->
    <div class="workbench-header">
      <div class="header-left">
        <el-button
          type="text"
          :icon="ArrowLeft"
          @click="goBack"
        >
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
        <el-progress
          :percentage="project.progress"
          :stroke-width="8"
          style="width: 150px"
        />
        <el-button :icon="Download" @click="handleExport">导出</el-button>
        <el-button type="primary" :icon="Setting" @click="showSettings = true">
          项目设置
        </el-button>
      </div>
    </div>

    <!-- 工作区 -->
    <div class="workbench-content">
      <!-- 左侧导航 -->
      <div class="sidebar">
        <el-menu
          :default-active="activeTab"
          class="sidebar-menu"
          @select="handleTabChange"
        >
          <el-menu-item index="worldview">
            <el-icon><Document /></el-icon>
            <span>世界观设定</span>
          </el-menu-item>
          <el-menu-item index="characters">
            <el-icon><User /></el-icon>
            <span>角色管理</span>
            <el-badge v-if="characters.length" :value="characters.length" class="item-badge" />
          </el-menu-item>
          <el-menu-item index="outline">
            <el-icon><List /></el-icon>
            <span>剧情大纲</span>
          </el-menu-item>
          <el-menu-item index="episodes">
            <el-icon><Tickets /></el-icon>
            <span>分集剧本</span>
            <el-badge v-if="episodes.length" :value="episodes.length" class="item-badge" />
          </el-menu-item>
          <el-menu-item index="prompt-template">
            <el-icon><Edit /></el-icon>
            <span>提示词模板</span>
          </el-menu-item>
          <el-menu-item index="statistics">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据统计</span>
          </el-menu-item>
          <el-menu-item index="versions">
            <el-icon><Clock /></el-icon>
            <span>版本历史</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 世界观设定 -->
        <div v-if="activeTab === 'worldview'" class="content-panel">
          <WorldviewEditor
            v-model="worldview"
            :project-info="project"
            @save="handleSaveWorldview"
          />
        </div>

        <!-- 角色管理 -->
        <div v-else-if="activeTab === 'characters'" class="content-panel">
          <CharacterManager
            v-model="characters"
            :project-info="project"
            :worldview="worldview"
            @save="handleSaveCharacters"
          />
        </div>

        <!-- 剧情大纲 -->
        <div v-else-if="activeTab === 'outline'" class="content-panel">
          <OutlineEditor
            v-model="outline"
            :project-info="project"
            :worldview="worldview"
            :characters="characters"
            @generate="handleGenerateOutline"
            @save="handleSaveOutline"
          />
        </div>

        <!-- 分集剧本 -->
        <div v-else-if="activeTab === 'episodes'" class="content-panel">
          <EpisodeManager
            v-model="episodes"
            :project-info="project"
            :worldview="worldview"
            :outline="outline"
            :characters="characters"
            :prompt-template="promptTemplate"
            @save="handleSaveEpisodes"
          />
        </div>

        <!-- 提示词模板 -->
        <div v-else-if="activeTab === 'prompt-template'" class="content-panel">
          <PromptTemplateEditor
            v-model="promptTemplate"
            :project-info="project"
            :worldview="worldview"
            :characters="characters"
            @save="handleSavePromptTemplate"
          />
        </div>

        <!-- 数据统计 -->
        <div v-else-if="activeTab === 'statistics'" class="content-panel">
          <StatisticsPanel
            :project="project"
            @refresh="handleRefreshData"
            @go-to-tab="handleTabChange"
          />
        </div>

        <!-- 版本历史 -->
        <div v-else-if="activeTab === 'versions'" class="content-panel">
          <VersionHistory
            :versions="versions"
            @restore="handleRestoreVersion"
            @compare="handleCompareVersions"
          />
        </div>
      </div>
    </div>

    <!-- 项目设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="项目设置"
      width="600px"
    >
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
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getDramaProject, updateDramaProject, patchDramaWorldview, patchDramaCharacters, patchDramaOutline, patchDramaEpisodes, patchDramaPromptTemplate } from '@/api/drama';
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
  Edit
} from '@element-plus/icons-vue';

// 导入组件
import WorldviewEditor from './components/WorldviewEditor.vue';
import CharacterManager from './components/CharacterManager.vue';
import OutlineEditor from './components/OutlineEditor.vue';
import EpisodeManager from './components/EpisodeManager.vue';
import StatisticsPanel from './components/StatisticsPanel.vue';
import PromptTemplateEditor from './components/PromptTemplateEditor.vue';

// 占位组件
const VersionHistory = { template: '<div class="placeholder">版本历史 - 开发中</div>' };

const router = useRouter();
const route = useRoute();

// 当前激活的标签
const activeTab = ref('worldview');

// 显示设置对话框
const showSettings = ref(false);

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

// 版本历史
const versions = ref([]);

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

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中...');
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

// 世界观相关
const handleSaveWorldview = async (worldviewData) => {
  try {
    const response = await patchDramaWorldview(project._id || project.id, worldviewData);
    
    if (response.code === 200) {
      // 不再修改worldview.value，避免循环更新
      ElMessage.success('世界观已保存');
      // 更新项目进度
      await updateProjectProgress();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存世界观失败:', error);
    ElMessage.error(error.message || '保存世界观失败');
  }
};

// 角色相关
const handleSaveCharacters = async (charactersData) => {
  try {
    const response = await patchDramaCharacters(project._id || project.id, charactersData);
    
    if (response.code === 200) {
      // 不再修改characters.value，避免循环更新
      ElMessage.success('角色已保存');
      // 更新项目进度
      await updateProjectProgress();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存角色失败:', error);
    ElMessage.error(error.message || '保存角色失败');
  }
};

// 大纲相关
const handleGenerateOutline = () => {
  // OutlineEditor内部已有生成提示词功能，这里只是占位
  ElMessage.info('请在大纲编辑器中使用生成提示词功能');
};

const handleSaveOutline = async (outlineData) => {
  try {
    const response = await patchDramaOutline(project._id || project.id, outlineData);
    
    if (response.code === 200) {
      // 不再修改outline.value，避免循环更新
      // OutlineEditor组件会通过v-model自动同步数据
      ElMessage.success('大纲已保存');
      // 更新项目进度
      await updateProjectProgress();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存大纲失败:', error);
    ElMessage.error(error.message || '保存大纲失败');
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

const handleSaveEpisodes = async (episodesData) => {
  try {
    const response = await patchDramaEpisodes(project._id || project.id, episodesData);
    
    if (response.code === 200) {
      // 不再修改episodes.value，避免循环更新
      // 成功消息已在EpisodeManager中显示，这里不重复提示
      // 更新项目进度（分集数据变化时尤其重要）
      await updateProjectProgress();
    } else {
      throw new Error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存分集失败:', error);
    ElMessage.error(error.message || '保存分集失败');
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
const handleRestoreVersion = (version) => {
  ElMessage.success(`已恢复到版本: ${version.name}`);
};

const handleCompareVersions = (v1, v2) => {
  ElMessage.info('版本对比功能开发中...');
};

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
</script>

<style scoped>
.drama-workbench {
  height: 100vh;
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
