<template>
  <div class="script-analysis">
    <!-- 头部标题 -->
    <div class="analysis-header">
      <div class="header-left">
        <el-icon :size="24" class="header-icon"><Document /></el-icon>
        <div class="header-info">
          <h2>剧本医生</h2>
          <p class="header-subtitle">智能分析剧本结构与质量，提供优化建议</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button 
          type="primary" 
          :icon="Refresh" 
          :loading="analyzing"
          @click="runAnalysis"
        >
          {{ analyzing ? '分析中...' : '重新分析' }}
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="analyzing" class="analysis-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在分析剧本，请稍候...</p>
    </div>

    <!-- 分析结果 -->
    <div v-else-if="analysisResult" class="analysis-content">
      
      <!-- 总览卡片 -->
      <el-card class="overview-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><DataAnalysis /></el-icon>
            <span>整体评估</span>
          </div>
        </template>
        
        <div class="overview-grid">
          <div class="overview-item">
            <div class="overview-label">完整性</div>
            <el-progress 
              type="circle" 
              :percentage="analysisResult.completeness.overall"
              :color="getScoreColor(analysisResult.completeness.overall)"
              :width="100"
            />
            <div class="overview-score">{{ analysisResult.completeness.overall }}分</div>
          </div>
          
          <div class="overview-item">
            <div class="overview-label">总字数</div>
            <div class="overview-value">{{ formatNumber(analysisResult.stats.totalWords) }}</div>
            <div class="overview-unit">字</div>
          </div>
          
          <div class="overview-item">
            <div class="overview-label">角色数量</div>
            <div class="overview-value">{{ analysisResult.stats.characterCount }}</div>
            <div class="overview-unit">个</div>
          </div>
          
          <div class="overview-item">
            <div class="overview-label">已完成集数</div>
            <div class="overview-value">{{ analysisResult.stats.completedEpisodes }}</div>
            <div class="overview-unit">/ {{ analysisResult.stats.episodeCount }}集</div>
          </div>
        </div>
      </el-card>

      <!-- 问题检测 -->
      <el-card v-if="hasIssues" class="issues-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Warning /></el-icon>
            <span>问题检测</span>
            <el-tag 
              v-if="analysisResult.issues.critical.length" 
              type="danger" 
              size="small"
              style="margin-left: 10px;"
            >
              {{ analysisResult.issues.critical.length }}个严重问题
            </el-tag>
          </div>
        </template>
        
        <el-tabs v-model="activeIssueTab" class="issues-tabs">
          <el-tab-pane 
            label="严重问题" 
            name="critical"
            :disabled="!analysisResult.issues.critical.length"
          >
            <template #label>
              <span>
                严重问题
                <el-badge 
                  v-if="analysisResult.issues.critical.length" 
                  :value="analysisResult.issues.critical.length" 
                  type="danger"
                  style="margin-left: 5px;"
                />
              </span>
            </template>
            <div class="issue-list">
              <div 
                v-for="(issue, index) in analysisResult.issues.critical" 
                :key="index"
                class="issue-item critical"
              >
                <el-icon class="issue-icon"><CircleClose /></el-icon>
                <div class="issue-content">
                  <div class="issue-title">{{ issue.title }}</div>
                  <div class="issue-desc">{{ issue.description }}</div>
                </div>
                <el-button 
                  type="danger" 
                  size="small" 
                  link
                  @click="goToModule(issue.module)"
                >
                  立即修复
                </el-button>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane 
            label="警告" 
            name="warning"
            :disabled="!analysisResult.issues.warning.length"
          >
            <template #label>
              <span>
                警告
                <el-badge 
                  v-if="analysisResult.issues.warning.length" 
                  :value="analysisResult.issues.warning.length" 
                  type="warning"
                  style="margin-left: 5px;"
                />
              </span>
            </template>
            <div class="issue-list">
              <div 
                v-for="(issue, index) in analysisResult.issues.warning" 
                :key="index"
                class="issue-item warning"
              >
                <el-icon class="issue-icon"><WarningFilled /></el-icon>
                <div class="issue-content">
                  <div class="issue-title">{{ issue.title }}</div>
                  <div class="issue-desc">{{ issue.description }}</div>
                </div>
                <el-button 
                  type="warning" 
                  size="small" 
                  link
                  @click="goToModule(issue.module)"
                >
                  查看详情
                </el-button>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane 
            label="提示" 
            name="info"
            :disabled="!analysisResult.issues.info.length"
          >
            <template #label>
              <span>
                提示
                <el-badge 
                  v-if="analysisResult.issues.info.length" 
                  :value="analysisResult.issues.info.length" 
                  style="margin-left: 5px;"
                />
              </span>
            </template>
            <div class="issue-list">
              <div 
                v-for="(issue, index) in analysisResult.issues.info" 
                :key="index"
                class="issue-item info"
              >
                <el-icon class="issue-icon"><InfoFilled /></el-icon>
                <div class="issue-content">
                  <div class="issue-title">{{ issue.title }}</div>
                  <div class="issue-desc">{{ issue.description }}</div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>

      <!-- 详细统计 -->
      <div class="stats-grid">
        <!-- 字数统计 -->
        <el-card class="stat-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>字数统计</span>
            </div>
          </template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">世界观</span>
              <span class="stat-value">{{ formatNumber(analysisResult.stats.worldviewWords) }}字</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">角色设定</span>
              <span class="stat-value">{{ formatNumber(analysisResult.stats.charactersWords) }}字</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">剧情大纲</span>
              <span class="stat-value">{{ formatNumber(analysisResult.stats.outlineWords) }}字</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">分集剧本</span>
              <span class="stat-value">{{ formatNumber(analysisResult.stats.episodesWords) }}字</span>
            </div>
            <div class="stat-item highlight">
              <span class="stat-label">总计</span>
              <span class="stat-value">{{ formatNumber(analysisResult.stats.totalWords) }}字</span>
            </div>
          </div>
        </el-card>

        <!-- 结构完整性 -->
        <el-card class="stat-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Grid /></el-icon>
              <span>结构完整性</span>
            </div>
          </template>
          <div class="completeness-list">
            <div class="completeness-item">
              <div class="completeness-header">
                <span class="completeness-label">世界观</span>
                <span class="completeness-score" :style="{ color: getScoreColor(analysisResult.completeness.worldview.score) }">
                  {{ analysisResult.completeness.worldview.score }}%
                </span>
              </div>
              <el-progress 
                :percentage="analysisResult.completeness.worldview.score" 
                :color="getScoreColor(analysisResult.completeness.worldview.score)"
                :show-text="false"
              />
            </div>
            <div class="completeness-item">
              <div class="completeness-header">
                <span class="completeness-label">角色设定</span>
                <span class="completeness-score" :style="{ color: getScoreColor(analysisResult.completeness.characters.score) }">
                  {{ analysisResult.completeness.characters.score }}%
                </span>
              </div>
              <el-progress 
                :percentage="analysisResult.completeness.characters.score" 
                :color="getScoreColor(analysisResult.completeness.characters.score)"
                :show-text="false"
              />
            </div>
            <div class="completeness-item">
              <div class="completeness-header">
                <span class="completeness-label">剧情大纲</span>
                <span class="completeness-score" :style="{ color: getScoreColor(analysisResult.completeness.outline.score) }">
                  {{ analysisResult.completeness.outline.score }}%
                </span>
              </div>
              <el-progress 
                :percentage="analysisResult.completeness.outline.score" 
                :color="getScoreColor(analysisResult.completeness.outline.score)"
                :show-text="false"
              />
            </div>
            <div class="completeness-item">
              <div class="completeness-header">
                <span class="completeness-label">分集进度</span>
                <span class="completeness-score" :style="{ color: getScoreColor(analysisResult.completeness.episodes.score) }">
                  {{ analysisResult.completeness.episodes.score }}%
                </span>
              </div>
              <el-progress 
                :percentage="analysisResult.completeness.episodes.score" 
                :color="getScoreColor(analysisResult.completeness.episodes.score)"
                :show-text="false"
              />
            </div>
          </div>
        </el-card>
      </div>

      <!-- 优化建议 -->
      <el-card v-if="analysisResult.suggestions.length" class="suggestions-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Promotion /></el-icon>
            <span>优化建议</span>
          </div>
        </template>
        
        <div class="suggestion-list">
          <div 
            v-for="(suggestion, index) in analysisResult.suggestions" 
            :key="index"
            class="suggestion-item"
            :class="suggestion.priority"
          >
            <div class="suggestion-priority">
              <el-tag 
                :type="getSuggestionTagType(suggestion.priority)" 
                size="small"
              >
                {{ getSuggestionPriorityText(suggestion.priority) }}
              </el-tag>
            </div>
            <div class="suggestion-content">
              <div class="suggestion-title">{{ suggestion.title }}</div>
              <div class="suggestion-desc">{{ suggestion.description }}</div>
            </div>
            <el-button 
              v-if="suggestion.action === 'goto'" 
              type="primary" 
              size="small"
              @click="goToModule(suggestion.module)"
            >
              前往处理
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 空状态 -->
    <el-empty 
      v-else 
      description="暂无分析结果，点击上方按钮开始分析"
      :image-size="120"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { 
  Document, 
  DataAnalysis, 
  Warning, 
  Refresh, 
  Loading,
  CircleClose,
  WarningFilled,
  InfoFilled,
  Grid,
  Promotion
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import {
  analyzeBasicStats,
  analyzeCompleteness,
  detectIssues,
  generateSuggestions
} from '../utils/analysisEngine';

// Props
const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits(['goto-module']);

// 状态
const analyzing = ref(false);
const analysisResult = ref(null);
const activeIssueTab = ref('critical');

// 计算属性
const hasIssues = computed(() => {
  if (!analysisResult.value) return false;
  const issues = analysisResult.value.issues;
  return issues.critical.length > 0 || issues.warning.length > 0 || issues.info.length > 0;
});

// 执行分析
const runAnalysis = async () => {
  analyzing.value = true;
  
  try {
    // 模拟异步分析过程
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 执行各项分析
    const stats = analyzeBasicStats(props.project);
    const completeness = analyzeCompleteness(props.project);
    const issues = detectIssues(props.project);
    const suggestions = generateSuggestions(props.project, stats, completeness, issues);
    
    analysisResult.value = {
      stats,
      completeness,
      issues,
      suggestions
    };
    
    // 默认显示第一个有内容的标签页
    if (issues.critical.length > 0) {
      activeIssueTab.value = 'critical';
    } else if (issues.warning.length > 0) {
      activeIssueTab.value = 'warning';
    } else if (issues.info.length > 0) {
      activeIssueTab.value = 'info';
    }
    
    ElMessage.success('分析完成');
  } catch (error) {
    console.error('分析失败:', error);
    ElMessage.error('分析失败，请重试');
  } finally {
    analyzing.value = false;
  }
};

// 跳转到指定模块
const goToModule = (module) => {
  emit('goto-module', module);
};

// 格式化数字
const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString();
};

// 获取分数颜色
const getScoreColor = (score) => {
  if (score >= 80) return '#67c23a';
  if (score >= 60) return '#e6a23c';
  if (score >= 40) return '#f56c6c';
  return '#909399';
};

// 获取建议标签类型
const getSuggestionTagType = (priority) => {
  const map = {
    critical: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'info'
  };
  return map[priority] || 'info';
};

// 获取建议优先级文本
const getSuggestionPriorityText = (priority) => {
  const map = {
    critical: '紧急',
    high: '重要',
    medium: '一般',
    low: '建议'
  };
  return map[priority] || '建议';
};

// 组件挂载时执行一次分析
onMounted(() => {
  runAnalysis();
});
</script>

<style scoped lang="scss">
.script-analysis {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 100px);
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-icon {
      color: #409eff;
    }

    .header-info {
      h2 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        color: #303133;
      }

      .header-subtitle {
        margin: 0;
        font-size: 14px;
        color: #909399;
      }
    }
  }
}

.analysis-loading {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 8px;

  .el-icon {
    font-size: 48px;
    color: #409eff;
    margin-bottom: 16px;
  }

  p {
    color: #606266;
    font-size: 16px;
  }
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;

  .el-icon {
    color: #409eff;
  }
}

// 总览卡片
.overview-card {
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    padding: 20px 0;
  }

  .overview-item {
    text-align: center;

    .overview-label {
      font-size: 14px;
      color: #909399;
      margin-bottom: 16px;
    }

    .overview-value {
      font-size: 36px;
      font-weight: 600;
      color: #409eff;
      margin-top: 8px;
    }

    .overview-score {
      font-size: 16px;
      color: #606266;
      margin-top: 8px;
    }

    .overview-unit {
      font-size: 14px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

// 问题卡片
.issues-card {
  .issue-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .issue-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #e4e7ed;
    background: #fafafa;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &.critical {
      border-color: #f56c6c;
      background: #fef0f0;

      .issue-icon {
        color: #f56c6c;
      }
    }

    &.warning {
      border-color: #e6a23c;
      background: #fdf6ec;

      .issue-icon {
        color: #e6a23c;
      }
    }

    &.info {
      border-color: #409eff;
      background: #ecf5ff;

      .issue-icon {
        color: #409eff;
      }
    }

    .issue-icon {
      font-size: 20px;
      margin-top: 2px;
    }

    .issue-content {
      flex: 1;

      .issue-title {
        font-weight: 600;
        font-size: 14px;
        color: #303133;
        margin-bottom: 4px;
      }

      .issue-desc {
        font-size: 13px;
        color: #606266;
        line-height: 1.6;
      }
    }
  }
}

// 统计网格
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.stat-card {
  .stat-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;

    &.highlight {
      background: #ecf5ff;
      font-weight: 600;

      .stat-value {
        color: #409eff;
      }
    }

    .stat-label {
      font-size: 14px;
      color: #606266;
    }

    .stat-value {
      font-size: 16px;
      color: #303133;
      font-weight: 500;
    }
  }

  .completeness-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .completeness-item {
    .completeness-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .completeness-label {
        font-size: 14px;
        color: #606266;
      }

      .completeness-score {
        font-size: 16px;
        font-weight: 600;
      }
    }
  }
}

// 建议卡片
.suggestions-card {
  .suggestion-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #e4e7ed;
    background: white;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .suggestion-priority {
      flex-shrink: 0;
    }

    .suggestion-content {
      flex: 1;

      .suggestion-title {
        font-weight: 600;
        font-size: 14px;
        color: #303133;
        margin-bottom: 4px;
      }

      .suggestion-desc {
        font-size: 13px;
        color: #606266;
        line-height: 1.6;
      }
    }
  }
}

@media (max-width: 1200px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
