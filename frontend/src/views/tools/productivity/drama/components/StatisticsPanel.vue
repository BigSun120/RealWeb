<template>
  <div class="statistics-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <h3 class="panel-title">
        <el-icon><DataAnalysis /></el-icon>
        数据统计与分析
      </h3>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="refreshData" :loading="loading">
          刷新数据
        </el-button>
        <el-button :icon="Download" @click="exportData">
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 统计内容 -->
    <div v-else class="panel-content">
      <!-- 概览卡片 -->
      <OverviewCards :stats="projectStats" />

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" type="card" class="stats-tabs">
        <el-tab-pane label="图表分析" name="charts">
          <ChartsPanel
            :project-stats="projectStats"
            :character-stats="characterStats"
            :outline-stats="outlineStats"
            :episode-stats="episodeStats"
            :episodes="episodes"
          />
        </el-tab-pane>

        <el-tab-pane label="详细数据" name="details">
          <DetailPanel
            :character-stats="characterStats"
            :outline-stats="outlineStats"
            :episode-stats="episodeStats"
          />
        </el-tab-pane>
      </el-tabs>

      <!-- 空状态提示 -->
      <div v-if="isEmpty" class="empty-state">
        <el-empty description="暂无统计数据，开始创作后将自动生成统计信息">
          <el-button type="primary" @click="goToEditor">开始创作</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DataAnalysis, Refresh, Download } from '@element-plus/icons-vue';
import OverviewCards from './statistics/OverviewCards.vue';
import ChartsPanel from './statistics/ChartsPanel.vue';
import DetailPanel from './statistics/DetailPanel.vue';
import {
  calculateProjectStats,
  calculateCharacterStats,
  calculateOutlineStats,
  calculateEpisodeStats
} from '../utils/statistics';

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['refresh', 'go-to-tab']);

// 状态
const loading = ref(false);
const activeTab = ref('charts');

// 计算统计数据
const projectStats = computed(() => {
  return calculateProjectStats(props.project);
});

const characterStats = computed(() => {
  return calculateCharacterStats(props.project.characters || []);
});

const outlineStats = computed(() => {
  return calculateOutlineStats(
    props.project.outline || {}, 
    props.project.characters || []
  );
});

const episodeStats = computed(() => {
  return calculateEpisodeStats(props.project.episodes || []);
});

const episodes = computed(() => {
  return props.project.episodes || [];
});

// 是否为空状态
const isEmpty = computed(() => {
  return projectStats.value.charactersCount === 0 &&
         projectStats.value.plotPointsCount === 0 &&
         episodes.value.length === 0;
});

// 刷新数据
const refreshData = async () => {
  loading.value = true;
  try {
    await emit('refresh');
    ElMessage.success('数据已刷新');
  } catch (error) {
    console.error('刷新数据失败:', error);
    ElMessage.error('刷新数据失败');
  } finally {
    loading.value = false;
  }
};

// 导出数据
const exportData = () => {
  try {
    // 构建导出数据
    const exportContent = {
      projectInfo: {
        name: props.project.name,
        type: props.project.type,
        status: props.project.status,
        createdAt: props.project.createdAt,
        updatedAt: props.project.updatedAt
      },
      statistics: {
        project: projectStats.value,
        characters: characterStats.value,
        outline: outlineStats.value,
        episodes: episodeStats.value
      },
      exportTime: new Date().toISOString()
    };

    // 生成文本报告
    const reportText = generateTextReport(exportContent);

    // 创建并下载文件
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.project.name}_统计报告_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success('报告已导出');
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败');
  }
};

// 生成文本报告
const generateTextReport = (data) => {
  const { projectInfo, statistics, exportTime } = data;
  
  let report = '='.repeat(60) + '\n';
  report += '  AI短剧脚本生成工具 - 项目统计报告\n';
  report += '='.repeat(60) + '\n\n';

  // 项目信息
  report += '【项目信息】\n';
  report += `项目名称: ${projectInfo.name}\n`;
  report += `剧本类型: ${projectInfo.type}\n`;
  report += `项目状态: ${projectInfo.status}\n`;
  report += `创建时间: ${new Date(projectInfo.createdAt).toLocaleString()}\n`;
  report += `最后更新: ${new Date(projectInfo.updatedAt).toLocaleString()}\n\n`;

  // 总体统计
  report += '【总体统计】\n';
  report += `完成进度: ${statistics.project.progress}%\n`;
  report += `已完成集数: ${statistics.project.completedEpisodes} / ${statistics.project.totalEpisodes}\n`;
  report += `总字数: ${statistics.project.totalWordCount.toLocaleString()} 字\n`;
  report += `平均字数: ${statistics.project.avgWordCount.toLocaleString()} 字/集\n`;
  report += `角色数量: ${statistics.project.charactersCount} 个\n`;
  report += `关键节点: ${statistics.project.plotPointsCount} 个\n\n`;

  // 角色统计
  if (statistics.characters.total > 0) {
    report += '【角色统计】\n';
    report += `总计: ${statistics.characters.total} 个角色\n`;
    report += '角色类型分布:\n';
    Object.entries(statistics.characters.byRole).forEach(([role, count]) => {
      report += `  - ${role}: ${count} 个\n`;
    });
    report += '\n';
  }

  // 大纲统计
  if (statistics.outline.totalPlotPoints > 0) {
    report += '【大纲统计】\n';
    report += `总节点数: ${statistics.outline.totalPlotPoints} 个\n`;
    report += `预估集数: ${statistics.outline.estimatedEpisodes}\n`;
    report += '各幕节点分布:\n';
    statistics.outline.plotPointsByAct.forEach(act => {
      report += `  - ${act.actTitle}: ${act.count} 个节点\n`;
    });
    report += '\n';
  }

  // 分集统计
  if (statistics.episodes.total > 0) {
    report += '【分集统计】\n';
    report += `总集数: ${statistics.episodes.total} 集\n`;
    report += `完成率: ${statistics.episodes.completionRate}%\n`;
    report += '状态分布:\n';
    Object.entries(statistics.episodes.byStatus).forEach(([status, count]) => {
      const statusMap = {
        'draft': '草稿',
        'in-progress': '进行中',
        'completed': '已完成',
        'reviewed': '已审核'
      };
      report += `  - ${statusMap[status] || status}: ${count} 集\n`;
    });
    report += '\n';
  }

  report += '-'.repeat(60) + '\n';
  report += `导出时间: ${new Date(exportTime).toLocaleString()}\n`;
  report += '='.repeat(60) + '\n';

  return report;
};

// 跳转到编辑器
const goToEditor = () => {
  emit('go-to-tab', 'worldview');
};

// 监听项目变化
watch(() => props.project, () => {
  // 项目数据变化时可以做一些处理
}, { deep: true });
</script>

<style scoped>
.statistics-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #EBEEF5;
}

.panel-title {
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

.loading-container {
  padding: 24px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.stats-tabs {
  margin-top: 8px;
}

.stats-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.stats-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  padding: 0 24px;
  height: 40px;
  line-height: 40px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* 响应式 */
@media (max-width: 768px) {
  .panel-header {
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

  .stats-tabs :deep(.el-tabs__item) {
    padding: 0 16px;
    font-size: 14px;
  }
}
</style>
