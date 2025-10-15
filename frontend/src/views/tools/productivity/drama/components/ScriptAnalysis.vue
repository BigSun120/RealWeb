<template>
  <div class="script-analysis">
    <!-- 头部标题 -->


    <!-- 阶段Tab -->
    <el-card class="tabs-card" shadow="never">
      <el-tabs v-model="activeStage" class="stage-tabs" @tab-change="handleStageChange">
        <el-tab-pane label="前期检查" name="preparation">
          <template #label>
            <span class="tab-label">
              <el-icon>
                <Edit />
              </el-icon>
              <span>前期检查</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="分集检查" name="episodes">
          <template #label>
            <span class="tab-label">
              <el-icon>
                <Tickets />
              </el-icon>
              <span>分集检查</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="整体检查" name="overall">
          <template #label>
            <span class="tab-label">
              <el-icon>
                <TrendCharts />
              </el-icon>
              <span>整体检查</span>
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 前期检查内容 -->
    <div v-if="activeStage === 'preparation'" class="stage-content">
      <!-- 操作按钮组 -->
      <div class="action-bar">
        <el-button type="primary" :icon="Refresh" @click="runQuickAnalysis">
          快速检查
        </el-button>
        <el-button type="success" :icon="MagicStick" :loading="aiDiagnosing" @click="runAIDiagnosis">
          {{ aiDiagnosing ? 'AI诊断中...' : '启动AI深度诊断' }}
        </el-button>
        <el-button type="primary" :icon="DocumentCopy" @click="generatePromptForExternal">
          生成提示词（外部AI）
        </el-button>
        <el-button type="warning" :icon="Upload" @click="showImportDialog = true">
          导入AI回答
        </el-button>
      </div>

      <!-- 子级Tab -->
      <el-card class="sub-tabs-card" shadow="never">
        <el-tabs v-model="activeSubTab.preparation" class="sub-tabs">
          <!-- 快速检查Tab -->
          <el-tab-pane label="快速检查" name="quick">
            <template #label>
              <span class="tab-label">
                <el-icon>
                  <Refresh />
                </el-icon>
                <span>快速检查</span>
              </span>
            </template>

            <!-- 加载状态 -->
            <div v-if="analyzing" class="analysis-loading">
              <el-icon class="is-loading">
                <Loading />
              </el-icon>
              <p>正在分析剧本，请稍候...</p>
            </div>

            <!-- 快速分析结果 -->
            <div v-else-if="analysisResult" class="analysis-content">

              <!-- 总览卡片 -->
              <el-card class="overview-card" shadow="never">
                <template #header>
                  <div class="card-header">
                    <el-icon>
                      <DataAnalysis />
                    </el-icon>
                    <span>整体评估</span>
                  </div>
                </template>

                <div class="overview-grid">
                  <div class="overview-item">
                    <div class="overview-label">完整性</div>
                    <el-progress type="circle" :percentage="analysisResult.completeness.overall"
                      :color="getScoreColor(analysisResult.completeness.overall)" :width="100" />
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
                    <el-icon>
                      <Warning />
                    </el-icon>
                    <span>问题检测</span>
                    <el-tag v-if="analysisResult.issues.critical.length" type="danger" size="small"
                      style="margin-left: 10px;">
                      {{ analysisResult.issues.critical.length }}个严重问题
                    </el-tag>
                  </div>
                </template>

                <el-tabs v-model="activeIssueTab" class="issues-tabs">
                  <el-tab-pane label="严重问题" name="critical" :disabled="!analysisResult.issues.critical.length">
                    <template #label>
                      <span>
                        严重问题
                        <el-badge v-if="analysisResult.issues.critical.length"
                          :value="analysisResult.issues.critical.length" type="danger" style="margin-left: 5px;" />
                      </span>
                    </template>
                    <div class="issue-list">
                      <div v-for="(issue, index) in analysisResult.issues.critical" :key="index"
                        class="issue-item critical">
                        <el-icon class="issue-icon">
                          <CircleClose />
                        </el-icon>
                        <div class="issue-content">
                          <div class="issue-title">{{ issue.title }}</div>
                          <div class="issue-desc">{{ issue.description }}</div>
                        </div>
                        <el-button type="danger" size="small" link @click="goToModule(issue.module)">
                          立即修复
                        </el-button>
                      </div>
                    </div>
                  </el-tab-pane>

                  <el-tab-pane label="警告" name="warning" :disabled="!analysisResult.issues.warning.length">
                    <template #label>
                      <span>
                        警告
                        <el-badge v-if="analysisResult.issues.warning.length"
                          :value="analysisResult.issues.warning.length" type="warning" style="margin-left: 5px;" />
                      </span>
                    </template>
                    <div class="issue-list">
                      <div v-for="(issue, index) in analysisResult.issues.warning" :key="index"
                        class="issue-item warning">
                        <el-icon class="issue-icon">
                          <WarningFilled />
                        </el-icon>
                        <div class="issue-content">
                          <div class="issue-title">{{ issue.title }}</div>
                          <div class="issue-desc">{{ issue.description }}</div>
                        </div>
                        <el-button type="warning" size="small" link @click="goToModule(issue.module)">
                          查看详情
                        </el-button>
                      </div>
                    </div>
                  </el-tab-pane>

                  <el-tab-pane label="提示" name="info" :disabled="!analysisResult.issues.info.length">
                    <template #label>
                      <span>
                        提示
                        <el-badge v-if="analysisResult.issues.info.length" :value="analysisResult.issues.info.length"
                          style="margin-left: 5px;" />
                      </span>
                    </template>
                    <div class="issue-list">
                      <div v-for="(issue, index) in analysisResult.issues.info" :key="index" class="issue-item info">
                        <el-icon class="issue-icon">
                          <InfoFilled />
                        </el-icon>
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
                      <el-icon>
                        <Document />
                      </el-icon>
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
                      <el-icon>
                        <Grid />
                      </el-icon>
                      <span>结构完整性</span>
                    </div>
                  </template>
                  <div class="completeness-list">
                    <div class="completeness-item">
                      <div class="completeness-header">
                        <span class="completeness-label">世界观</span>
                        <span class="completeness-score"
                          :style="{ color: getScoreColor(analysisResult.completeness.worldview.score) }">
                          {{ analysisResult.completeness.worldview.score }}%
                        </span>
                      </div>
                      <el-progress :percentage="analysisResult.completeness.worldview.score"
                        :color="getScoreColor(analysisResult.completeness.worldview.score)" :show-text="false" />
                    </div>
                    <div class="completeness-item">
                      <div class="completeness-header">
                        <span class="completeness-label">角色设定</span>
                        <span class="completeness-score"
                          :style="{ color: getScoreColor(analysisResult.completeness.characters.score) }">
                          {{ analysisResult.completeness.characters.score }}%
                        </span>
                      </div>
                      <el-progress :percentage="analysisResult.completeness.characters.score"
                        :color="getScoreColor(analysisResult.completeness.characters.score)" :show-text="false" />
                    </div>
                    <div class="completeness-item">
                      <div class="completeness-header">
                        <span class="completeness-label">剧情大纲</span>
                        <span class="completeness-score"
                          :style="{ color: getScoreColor(analysisResult.completeness.outline.score) }">
                          {{ analysisResult.completeness.outline.score }}%
                        </span>
                      </div>
                      <el-progress :percentage="analysisResult.completeness.outline.score"
                        :color="getScoreColor(analysisResult.completeness.outline.score)" :show-text="false" />
                    </div>
                    <div class="completeness-item">
                      <div class="completeness-header">
                        <span class="completeness-label">分集进度</span>
                        <span class="completeness-score"
                          :style="{ color: getScoreColor(analysisResult.completeness.episodes.score) }">
                          {{ analysisResult.completeness.episodes.score }}%
                        </span>
                      </div>
                      <el-progress :percentage="analysisResult.completeness.episodes.score"
                        :color="getScoreColor(analysisResult.completeness.episodes.score)" :show-text="false" />
                    </div>
                  </div>
                </el-card>
              </div>

              <!-- 优化建议 -->
              <el-card v-if="analysisResult.suggestions.length" class="suggestions-card" shadow="never">
                <template #header>
                  <div class="card-header">
                    <el-icon>
                      <Promotion />
                    </el-icon>
                    <span>优化建议</span>
                  </div>
                </template>

                <div class="suggestion-list">
                  <div v-for="(suggestion, index) in analysisResult.suggestions" :key="index" class="suggestion-item"
                    :class="suggestion.priority">
                    <div class="suggestion-priority">
                      <el-tag :type="getSuggestionTagType(suggestion.priority)" size="small">
                        {{ getSuggestionPriorityText(suggestion.priority) }}
                      </el-tag>
                    </div>
                    <div class="suggestion-content">
                      <div class="suggestion-title">{{ suggestion.title }}</div>
                      <div class="suggestion-desc">{{ suggestion.description }}</div>
                    </div>
                    <el-button v-if="suggestion.action === 'goto'" type="primary" size="small"
                      @click="goToModule(suggestion.module)">
                      前往处理
                    </el-button>
                  </div>
                </div>
              </el-card>
            </div>

            <!-- 空状态 -->
            <el-empty v-else description="点击快速检查开始分析" :image-size="120">
              <el-button type="primary" @click="runQuickAnalysis">开始检查</el-button>
            </el-empty>
          </el-tab-pane>

          <!-- AI诊断 Tab -->
          <el-tab-pane label="AI诊断" name="ai-diagnosis">
            <template #label>
              <span class="tab-label">
                <el-icon>
                  <MagicStick />
                </el-icon>
                <span>AI诊断</span>
                <el-badge v-if="aiIssues.length > 0" :value="aiIssues.length" type="danger" style="margin-left: 5px;" />
              </span>
            </template>

            <!-- AI诊断加载状态 -->
            <div v-if="aiDiagnosing" class="analysis-loading">
              <el-icon class="is-loading">
                <Loading />
              </el-icon>
              <p>🤖 AI正在诊断中，预计需要30-60秒...</p>
            </div>

            <!-- AI诊断结果 -->
            <div v-else-if="aiIssues.length > 0" class="ai-issues-container">
              <el-alert :title="`发现 ${aiIssues.length} 个问题`" type="info" :closable="false"
                style="margin-bottom: 20px;" />

              <div v-for="(issue, index) in aiIssues" :key="index" class="ai-issue-item"
                :class="{ 'ignored': issue.status === 'ignored' }">
                <div class="ai-issue-header">
                  <el-tag :type="getIssueSeverityType(issue.severity)" size="small">
                    {{ getIssueSeverityText(issue.severity) }}
                  </el-tag>
                  <span class="ai-issue-number">{{ index + 1 }}</span>
                  <el-tag v-if="issue.status === 'ignored'" type="info" size="small" style="margin-left: 8px;">
                    已忽略
                  </el-tag>
                  <el-tag v-if="issue.status === 'solved' || issue.status === 'completed'" type="success" size="small"
                    style="margin-left: 8px;">
                    ✅ 已完成
                  </el-tag>
                </div>

                <h4 class="ai-issue-title">{{ issue.title }}</h4>
                <p class="ai-issue-desc">{{ issue.description }}</p>

                <div class="ai-issue-location">
                  <el-icon>
                    <Location />
                  </el-icon>
                  <span>位置：{{ getLocationText(issue.location) }}</span>
                </div>

                <div class="ai-issue-actions">
                  <template v-if="issue.status === 'ignored'">
                    <el-button type="success" size="small" @click="restoreIssue(issue)">
                      恢复问题
                    </el-button>
                  </template>
                  <template v-else-if="issue.status === 'solved' || issue.status === 'completed'">
                    <el-button type="primary" size="small" @click="generateSolution(issue, false)">
                      查看方案
                    </el-button>
                    <el-button size="small" @click="restoreIssue(issue)">
                      恢复待处理
                    </el-button>
                  </template>
                  <template v-else>
                    <el-button type="primary" size="small" :loading="issue.generating"
                      @click="generateSolution(issue, false)">
                      {{ issue.generating ? '生成中...' : (issue.solution ? '查看方案' : '生成解决方案') }}
                    </el-button>
                    <el-button size="small" :icon="DocumentCopy" @click="showSolutionPrompt(issue)">
                      复制提示词
                    </el-button>
                    <el-button v-if="issue.solution" size="small" type="warning" :loading="issue.generating"
                      @click="generateSolution(issue, true)">
                      重新生成
                    </el-button>
                    <el-button v-if="issue.solution" type="success" size="small" @click="markAsCompleted(issue)">
                      ✅ 标记为已完成
                    </el-button>
                    <el-button size="small" @click="ignoreIssue(issue)">
                      忽略此问题
                    </el-button>
                  </template>
                </div>

                <el-divider v-if="index < aiIssues.length - 1" />
              </div>
            </div>

            <!-- AI诊断空状态 -->
            <el-empty v-else description="暂无AI诊断结果，点击上方「启动AI深度诊断」按钮开始诊断" :image-size="100" />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <!-- 分集检查内容 -->
    <div v-else-if="activeStage === 'episodes'" class="stage-content">
      <el-empty description="分集检查功能开发中..." :image-size="120" />
    </div>

    <!-- 整体检查内容 -->
    <div v-else-if="activeStage === 'overall'" class="stage-content">
      <el-empty description="整体检查功能开发中..." :image-size="120" />
    </div>


    <!-- 解决方案对话框 -->
    <el-dialog v-model="showSolution" title="解决方案" width="900px" :close-on-click-modal="false">
      <div v-if="currentSolution" class="solution-container">
        <el-alert :title="currentSolution.issue.title" :description="currentSolution.issue.description" type="warning"
          :closable="false" style="margin-bottom: 20px;" />

        <div class="solution-compare">
          <div class="solution-section">
            <div class="section-header">
              <h4>📝 原文案</h4>
              <el-radio-group v-model="displayMode" size="small" @change="updateDisplayMode">
                <el-radio-button label="formatted">📄 格式化显示</el-radio-button>
                <el-radio-button label="json">🔧 JSON原始数据</el-radio-button>
              </el-radio-group>
            </div>
            <el-input v-model="currentSolution.originalContent" type="textarea" :rows="10" readonly
              class="content-textarea" :class="{ 'json-mode': displayMode === 'json' }" />
          </div>

          <div class="solution-section">
            <div class="section-header">
              <h4>✨ AI建议方案</h4>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <el-radio-group v-model="suggestionDisplayMode" size="small" @change="updateSuggestionDisplayMode">
                  <el-radio-button label="formatted">📝 格式化显示</el-radio-button>
                  <el-radio-button label="json">🔧 JSON原始数据</el-radio-button>
                </el-radio-group>
                <el-button v-if="solutionModified" size="small" type="success" @click="saveSolutionEdit">
                  💾 保存修改
                </el-button>
                <el-button v-if="solutionModified" size="small" @click="restoreSolution">
                  ↩️ 恢复原始
                </el-button>
                <span v-if="solutionModified" style="color: #67c23a; font-size: 12px;">• 已修改</span>
              </div>
            </div>
            <el-input v-model="currentSolution.suggestedDisplayContent" type="textarea" :rows="10"
              class="content-textarea suggested" :class="{ 'json-mode': suggestionDisplayMode === 'json' }" />
          </div>
        </div>

        <div class="solution-explanation">
          <h4>💡 修改说明</h4>
          <p v-html="formatExplanation(currentSolution.explanation)"></p>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <el-button type="warning" :loading="currentSolution?.issue?.generating" @click="regenerateSolution">
            重新生成
          </el-button>
          <div>
            <el-button @click="showSolution = false">取消</el-button>
            <el-button @click="copySolution">仅复制方案</el-button>
            <el-button type="primary" :loading="applying" @click="confirmApplySolution">
              替换原文案
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 提示词对话框 -->
    <PromptDialog v-model="showPromptDialog" :prompt="generatedPrompt" :title="promptDialogTitle"
      :supports-paste="promptSupportsPaste" :paste-mode="promptPasteMode" @paste="handlePromptPaste" />

    <!-- AI回答导入对话框 -->
    <AIResponseParser v-model="showImportDialog" mode="diagnosis" title="导入AI诊断结果" description="粘贴AI返回的诊断结果，系统将自动解析问题列表"
      @parsed="handleDiagnosisParsed" />
  </div>
</template>

<script setup>
/**
 * AI剧本医生 - ScriptAnalysis.vue
 * 
 * ✅ 遗留代码清理完成（v2.0.0）
 * 
 * 已删除：
 * - _updateModuleContent_OLD (~200行) → 由 UpdateStrategyFactory 替代
 * - parseAICharacterSolution (~100行) → 集成到 AIService
 * - parseAIOutlineSolution (~40行) → 集成到 AIService
 * - formatCharactersContent (~30行) → 集成到 DataService
 * - formatOutlineContent (~35行) → 集成到 DataService
 * - formatEpisodeContent (~30行) → 集成到 DataService
 * - getOriginalContent (~250行) → 由 DataService.getFieldContent() 替代
 * 
 * 总计删除：~685行遗留代码
 * 
 * 新架构优势：
 * - 分层清晰：UI层 / Service层 / Mapper层
 * - 代码可维护性大幅提升
 * - 易于测试和扩展
 * - 减少重复代码，降低技术债务
 */

import { ref, computed, onMounted, watch } from 'vue';
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
  Promotion,
  Edit,
  Tickets,
  TrendCharts,
  MagicStick,
  Location,
  DocumentCopy,
  Upload
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useClipboard } from '@vueuse/core';
import PromptDialog from './PromptDialog.vue';
import AIResponseParser from './AIResponseParser.vue';
import {
  analyzeBasicStats,
  analyzeCompleteness,
  detectIssues,
  generateSuggestions
} from '../utils/analysisEngine';
import { generateAIContent } from '@/api/ai';
import {
  saveAIDiagnosis,
  getAIDiagnosis
} from '@/api/drama';

// ========================================
// 🎉 新架构：导入重构后的Services
// ========================================
import { DataService } from '../services/DataService';
import { AIService } from '../services/AIService';
import { UpdateStrategyFactory } from '../services/UpdateStrategyFactory';
import { FieldMapper } from '../mappers/FieldMapper';
import { DIAGNOSIS_ISSUES_SCHEMA } from '../schemas/aiResponseSchemas';

// Props
const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits(['goto-module', 'content-updated']);

// 状态
const activeStage = ref('preparation'); // preparation / episodes / overall
const analyzing = ref(false);
const analysisResult = ref(null);
const activeIssueTab = ref('critical');

// 子级Tab状态（每个阶段都有自己的子Tab）
const activeSubTab = ref({
  preparation: 'quick',  // quick 或 ai-diagnosis
  episodes: 'quick',
  overall: 'quick'
});

// AI诊断相关状态
const aiDiagnosing = ref(false);
const showAIResult = ref(false);  // 保留以兼容旧代码，但不再使用
const aiIssues = ref([]);

// 解决方案相关状态
const showSolution = ref(false);
const currentSolution = ref(null);
const applying = ref(false);
const displayMode = ref('formatted'); // 'formatted' 或 'json' - 原文案显示模式
const suggestionDisplayMode = ref('formatted'); // 'formatted' 或 'json' - AI建议方案显示模式
const solutionModified = ref(false); // 方案是否被编辑过
const originalSuggestedContent = ref(''); // 保存原AI建议方案，用于恢复

// 外部AI支持
const showPromptDialog = ref(false);
const generatedPrompt = ref('');
const showImportDialog = ref(false);
const promptDialogTitle = ref('AI 提示词');
const promptSupportsPaste = ref(false);
const promptPasteMode = ref('solution');
const currentPromptIssue = ref(null); // 当前正在处理的问题（用于外部AI对接）

// 剪贴板
const { copy, isSupported: clipboardSupported } = useClipboard();

// 初始化DataService实例（用于数据访问）
const dataService = new DataService(props.project);

// 计算属性
const hasIssues = computed(() => {
  if (!analysisResult.value) return false;
  const issues = analysisResult.value.issues;
  return issues.critical.length > 0 || issues.warning.length > 0 || issues.info.length > 0;
});

// 快速检查（原分析功能）
const runQuickAnalysis = async () => {
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

    ElMessage.success('快速检查完成');
  } catch (error) {
    console.error('检查失败:', error);
    ElMessage.error('检查失败，请重试');
  } finally {
    analyzing.value = false;
  }
};

// Tab切换处理
const handleStageChange = (stage) => {
  console.log('切换到阶段:', stage);
  // 注意：不清空结果，保留用户之前的分析结果
  // 如果需要重新分析，用户可以手动点击“快速检查”按钮
};

// ========================================
// 🔍字段验证 - 验证issue位置是否可定位
// ========================================
const validateIssueLocation = (issue) => {
  const { module, field, characterId } = issue.location;

  console.log(`🔍 验证问题位置: ${module}.${field}, characterId=${characterId}`);

  // 1. 验证module是否合法
  const validModules = ['worldview', 'characters', 'outline', 'episodes'];
  if (!validModules.includes(module)) {
    console.warn(`❌ 拦截: 非法module "${module}"`);
    return {
      valid: false,
      reason: `未知模块: ${module}`,
      details: `允许的模块: ${validModules.join(', ')}`
    };
  }

  // 2. 对 worldview 和 characters 使用严格验证
  if (module === 'worldview' || module === 'characters') {
    const isLogical = FieldMapper.isLogicalField(module, field);
    const englishField = FieldMapper.getEnglishField(module, field);

    if (!isLogical && !englishField) {
      console.warn(`❌ 拦截: ${module}模块中不存在字段 "${field}"`);

      // 获取允许的字段列表
      const allowedFields = Object.keys(FieldMapper.mappings[module] || {});
      const logicalFields = Object.keys(FieldMapper.logicalFields[module] || {});
      const allFields = [...allowedFields, ...logicalFields];

      return {
        valid: false,
        reason: `字段不存在: ${field}`,
        details: `${module}模块允许的字段: ${allFields.join(', ')}`
      };
    }
  }

  // 3. 对 outline 验证动态字段格式
  if (module === 'outline') {
    const outlinePattern = /^第[一二三四五六七八九十\d]+幕$/;
    if (!outlinePattern.test(field)) {
      console.warn(`❌ 拦截: 大纲字段格式错误 "${field}"`);
      return {
        valid: false,
        reason: `无效的大纲字段: ${field}`,
        details: '正确格式: "第一幕"、"第二幕" 等'
      };
    }
  }

  // 4. 对 episodes 验证动态字段格式
  if (module === 'episodes') {
    const episodePattern = /^第\d+集$/;
    if (!episodePattern.test(field)) {
      console.warn(`❌ 拦截: 分集字段格式错误 "${field}"`);
      return {
        valid: false,
        reason: `无效的分集字段: ${field}`,
        details: '正确格式: "第1集"、"第2集" 等'
      };
    }
  }

  // 5. 尝试获取内容（最后防线）
  try {
    const content = dataService.getFieldContent(issue.location, { format: 'formatted' });

    // 修复运算符优先级问题：使用括号明确逻辑
    if (!content || (content.includes('【') && content.includes('字段当前为空】'))) {
      console.warn(`❌ 拦截: 字段内容为空 "${module}.${field}"`);
      return {
        valid: false,
        reason: '字段内容为空或不存在',
        details: '请先填充字段内容后再进行诊断'
      };
    }

    console.log(`✅ 验证通过: ${module}.${field}`);
    return { valid: true };
  } catch (e) {
    console.error(`❌ 拦截: 无法获取字段内容 "${module}.${field}"`, e);
    return {
      valid: false,
      reason: `无法获取内容`,
      details: e.message
    };
  }
};

// 启动AI诊断
const runAIDiagnosis = async () => {
  aiDiagnosing.value = true;

  const loadingMessage = ElMessage({
    message: '🤖 AI正在诊断中，预计需要30-60秒...',
    type: 'info',
    duration: 0
  });

  try {
    // 生成提示词
    const prompt = generateDiagnosisPrompt(activeStage.value, props.project);

    // 调用AI API（添加JSON Schema约束）
    const response = await generateAIContent(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.7,
        maxTokens: 3000,
        jsonSchema: DIAGNOSIS_ISSUES_SCHEMA,  // ✅ 使用结构化输出
        timeout: 300000  // ✅ 诊断超时设置为5分钟
      }
    );

    loadingMessage.close();

    if (response.code === 200 && response.data?.content) {
      // 解析AI返回的问题列表
      const parsedIssues = parseAIIssues(response.data.content);

      console.log(`🔍 开始验证 ${parsedIssues.length} 个问题的位置...`);

      // ✅ 验证每个问题的位置
      const issuesWithValidation = parsedIssues.map(issue => {
        const validation = validateIssueLocation(issue);
        return {
          ...issue,
          generating: false,
          status: 'pending',
          validation  // 附加验证结果
        };
      });

      // 分类：有效 vs 无效
      const validIssues = issuesWithValidation.filter(i => i.validation.valid);
      const invalidIssues = issuesWithValidation.filter(i => !i.validation.valid);

      console.log(`✅ 有效问题: ${validIssues.length} 个`);
      console.log(`❌ 无效问题: ${invalidIssues.length} 个`, invalidIssues);

      // 只保留有效问题
      aiIssues.value = validIssues;

      // 切换到AI诊断Tab
      activeSubTab.value[activeStage.value] = 'ai-diagnosis';

      // 显示结果
      if (invalidIssues.length > 0) {
        ElMessage.warning({
          message: `AI诊断完成：发现 ${validIssues.length} 个有效问题，过滤 ${invalidIssues.length} 个无法定位的问题`,
          duration: 5000
        });
      } else {
        ElMessage.success(`AI诊断完成，发现 ${aiIssues.value.length} 个问题`);
      }
    } else {
      throw new Error(response.message || 'AI诊断失败');
    }
  } catch (error) {
    loadingMessage.close();
    console.error('AI诊断失败:', error);
    ElMessage.error('AI诊断失败：' + (error.message || '请稍后重试'));
  } finally {
    aiDiagnosing.value = false;
  }
};

// 更新原文案显示模式（使用DataService）
const updateDisplayMode = () => {
  if (currentSolution.value && currentSolution.value.issue) {
    // 使用DataService重新获取内容
    currentSolution.value.originalContent = dataService.getFieldContent(
      currentSolution.value.issue.location,
      { format: displayMode.value }
    );
    console.log(`✅ 切换原文案显示模式为: ${displayMode.value}`);
  }
};

// 更新AI建议方案显示模式
const updateSuggestionDisplayMode = () => {
  if (currentSolution.value && currentSolution.value.suggestedContent) {
    const { issue, suggestedContent } = currentSolution.value;
    const { module, field } = issue.location;

    if (suggestionDisplayMode.value === 'json') {
      // JSON模式：提取并显示纯JSON数据
      try {
        const parsed = AIService.parseModuleData(module, suggestedContent);
        if (parsed && typeof parsed === 'object') {
          // 如果是字符串类型（解析失败），尝试提取JSON
          currentSolution.value.suggestedDisplayContent = JSON.stringify(parsed, null, 2);
        } else if (typeof parsed === 'string') {
          // 如果parseModuleData返回字符串，尝试从中提取JSON或构造JSON对象
          const jsonExtracted = extractJSONFromText(parsed, module, field);
          currentSolution.value.suggestedDisplayContent = JSON.stringify(jsonExtracted, null, 2);
        } else {
          currentSolution.value.suggestedDisplayContent = suggestedContent;
        }
      } catch (e) {
        // 如果解析失败，尝试从原文提取或包装为JSON
        try {
          const jsonExtracted = extractJSONFromText(suggestedContent, module, field);
          currentSolution.value.suggestedDisplayContent = JSON.stringify(jsonExtracted, null, 2);
        } catch (e2) {
          currentSolution.value.suggestedDisplayContent = suggestedContent;
        }
      }
    } else {
      // formatted模式：使用类似DataService的格式化逻辑
      try {
        const parsed = AIService.parseModuleData(module, suggestedContent);
        if (parsed && typeof parsed === 'object') {
          currentSolution.value.suggestedDisplayContent = formatSuggestedContent(module, parsed);
        } else {
          currentSolution.value.suggestedDisplayContent = suggestedContent;
        }
      } catch (e) {
        // 如果解析失败，直接显示原文
        currentSolution.value.suggestedDisplayContent = suggestedContent;
      }
    }
    console.log(`✅ 切换AI建议方案显示模式为: ${suggestionDisplayMode.value}`);
  }
};

// 从文本中提取JSON或构造JSON对象
const extractJSONFromText = (text, module, field) => {
  // 1. 尝试直接JSON解析
  try {
    return JSON.parse(text);
  } catch (e) {
    // 继续
  }

  // 2. 尝试从代码块提取
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // 继续
    }
  }

  // 3. 尝试提取JSON对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // 继续
    }
  }

  // 4. 根据字段构造JSON对象（适用于简单字段）
  const englishField = FieldMapper.getEnglishField(module, field);
  if (englishField) {
    return { [englishField]: text.trim() };
  }

  // 5. 无法提取，返回包装的对象
  return { content: text.trim() };
};

// 格式化AI建议内容（类似DataService的格式化）
const formatSuggestedContent = (module, data) => {
  switch (module) {
    case 'characters':
      return formatCharacterSuggestion(data);
    case 'outline':
      return formatOutlineSuggestion(data);
    case 'episodes':
      return formatEpisodeSuggestion(data);
    case 'worldview':
    case 'project':
      return formatSimpleSuggestion(data);
    default:
      return JSON.stringify(data, null, 2);
  }
};

// 格式化角色建议
const formatCharacterSuggestion = (char) => {
  const lines = [];
  lines.push(`### ${char.name || '未命名'}${char.role ? `（${char.role}）` : ''}`);

  if (char.age !== undefined || char.gender) {
    const info = [];
    if (char.age !== undefined) info.push(`${char.age}岁`);
    if (char.gender) info.push(char.gender);
    lines.push(`- **基本信息**：${info.join('、')}`);
  }

  if (char.description) lines.push(`- **角色描述**：${char.description}`);
  if (char.personality) lines.push(`- **性格特点**：${char.personality}`);
  if (char.background) lines.push(`- **角色背景**：${char.background}`);
  if (char.motivation) lines.push(`- **行为动机**：${char.motivation}`);
  if (char.relationships) lines.push(`- **人际关系**：${char.relationships}`);
  if (char.tags && char.tags.length > 0) lines.push(`- **标签**：${char.tags.join('、')}`);

  return lines.join('\n');
};

// 格式化大纲建议
const formatOutlineSuggestion = (act) => {
  const lines = [];
  lines.push(`## ${act.title || '未命名'}`);

  if (act.actNumber !== undefined) {
    lines.push(`**幕序号**：第${act.actNumber}幕`);
  }

  if (act.description) {
    lines.push(`\n${act.description}`);
  }

  if (act.plotPoints && act.plotPoints.length > 0) {
    lines.push('\n**情节点**：');
    act.plotPoints.forEach((point, idx) => {
      lines.push(`${idx + 1}. **${point.name || '未命名'}**`);
      if (point.description) {
        lines.push(`   ${point.description}`);
      }
      if (point.characters && point.characters.length > 0) {
        lines.push(`   涉及角色：${point.characters.join('、')}`);
      }
    });
  }

  return lines.join('\n');
};

// 格式化分集建议
const formatEpisodeSuggestion = (episode) => {
  const lines = [];
  lines.push(`# 第${episode.number}集：${episode.title || '未命名'}`);
  lines.push(`**状态**：${episode.status || 'draft'}`);

  if (episode.content) {
    if (episode.content.summary) {
      lines.push(`\n## 简介\n${episode.content.summary}`);
    }
    if (episode.content.script) {
      const script = episode.content.script;
      const preview = script.length > 500 ? script.substring(0, 500) + '...' : script;
      lines.push(`\n## 剧本内容\n${preview}`);
    }
  }

  if (episode.wordCount) {
    lines.push(`\n**字数**：${episode.wordCount}`);
  }

  return lines.join('\n');
};

// 格式化简单字段建议（世界观、项目等）
const formatSimpleSuggestion = (data) => {
  if (typeof data === 'string') {
    return data;
  }

  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') {
      lines.push(`**${key}**：${value}`);
    }
  }
  return lines.join('\n\n');
};

// 生成解决方案（使用DataService）
const generateSolution = async (issue, forceRegenerate = false) => {
  // 确保 issue 对象存在
  if (!issue) {
    console.error('❗ issue 对象不存在');
    return;
  }

  // 如果已有方案且不是强制重新生成，直接显示
  if (issue.solution && !forceRegenerate) {
    const { module } = issue.location;
    const suggestedContent = issue.solution.suggestedContent;

    // 尝试解析和格式化建议内容
    let suggestedDisplayContent = suggestedContent;
    try {
      const parsed = AIService.parseModuleData(module, suggestedContent);
      if (parsed && typeof parsed === 'object') {
        suggestedDisplayContent = formatSuggestedContent(module, parsed);
      }
    } catch (e) {
      console.warn('格式化建议内容失败，使用原始内容');
    }

    currentSolution.value = {
      issue,
      originalContent: dataService.getFieldContent(issue.location, { format: displayMode.value }),
      suggestedContent,
      suggestedDisplayContent, // 初始化为格式化后的内容
      explanation: issue.solution.explanation
    };
    // 重置显示模式和编辑状态
    suggestionDisplayMode.value = 'formatted';
    solutionModified.value = false;
    originalSuggestedContent.value = suggestedDisplayContent; // 保存原始备份
    showSolution.value = true;
    return;
  }

  issue.generating = true;

  try {
    // 生成解决方案的提示词
    const prompt = generateSolutionPrompt(issue, props.project);

    // 调用AI API（正确格式）
    const response = await generateAIContent(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.8,
        maxTokens: 2000
      }
    );

    if (response.code === 200 && response.data?.content) {
      // 解析方案
      const solution = parseAISolution(response.data.content);

      // 获取原文案用于对比
      const { module } = issue.location;
      const originalContent = dataService.getFieldContent(issue.location, { format: 'json' });
      const suggestedContent = solution.suggestedContent;

      // 检测内容是否相同（规范化后比较）
      const isSameContent = checkContentSimilarity(originalContent, suggestedContent);

      if (isSameContent) {
        console.log('⚠️ AI返回的建议方案与原文案相同');
        ElMessageBox.alert(
          `AI 分析后认为当前文案已经很好，没有提出修改建议。\n\n💡 建议：\n1. 如果你认为还有问题，可以点击「重新生成」再试一次\n2. 或者直接标记为已完成，忽略此问题\n3. 也可以手动修改该字段`,
          'AI 评估结果',
          {
            confirmButtonText: '知道了',
            type: 'info',
            dangerouslyUseHTMLString: false
          }
        );
        // 不保存方案，也不改变状态
        return;
      }

      // ✅ 确保保存完整的JSON内容
      let contentToSave = solution.suggestedContent;

      // 验证内容不是MongoDB ID
      if (typeof contentToSave === 'string' && /^[a-f0-9]{24}$/i.test(contentToSave.trim())) {
        console.error('❌ AI返回的内容是MongoDB ID，拒绝保存');
        throw new Error('AI返回的内容格式错误，请重新生成');
      }

      // 如果是对象，转为字符串保存
      if (typeof contentToSave === 'object') {
        contentToSave = JSON.stringify(contentToSave);
      }

      console.log('💾 保存solution内容长度:', contentToSave.length);
      console.log('💾 内容预览:', contentToSave.substring(0, 100));

      // 保存方案到issue对象
      issue.solution = {
        suggestedContent: contentToSave,
        explanation: solution.explanation,
        generatedAt: new Date().toISOString()
      };

      // 尝试解析和格式化建议内容
      let suggestedDisplayContent = suggestedContent;
      try {
        const parsed = AIService.parseModuleData(module, suggestedContent);
        if (parsed && typeof parsed === 'object') {
          suggestedDisplayContent = formatSuggestedContent(module, parsed);
        }
      } catch (e) {
        console.warn('格式化建议内容失败，使用原始内容');
      }

      // 显示解决方案对话框（使用DataService）
      currentSolution.value = {
        issue,
        originalContent: dataService.getFieldContent(issue.location, { format: displayMode.value }),
        suggestedContent,
        suggestedDisplayContent, // 初始化为格式化后的内容
        explanation: solution.explanation
      };

      issue.status = 'solution_ready';
      // 重置显示模式和编辑状态
      suggestionDisplayMode.value = 'formatted';
      solutionModified.value = false;
      originalSuggestedContent.value = suggestedDisplayContent; // 保存原始备份
      showSolution.value = true;
    } else {
      throw new Error(response.message || '生成方案失败');
    }
  } catch (error) {
    console.error('生成方案失败:', error);
    console.error('错误堆栈:', error.stack);
    ElMessage.error('生成方案失败：' + (error.message || '请稍后重试'));
  } finally {
    // 确保重置 generating 状态
    if (issue) {
      issue.generating = false;
      console.log(`✅ 已重置 issue.generating = false (${issue.title})`);
    }
  }
};

// 检查内容相似度（用于判断AI是否返回了相同的内容）
const checkContentSimilarity = (content1, content2) => {
  try {
    // 规范化内容：移除空格、换行、缩进
    const normalize = (content) => {
      if (typeof content === 'object') {
        content = JSON.stringify(content);
      }
      return String(content)
        .replace(/\s+/g, '') // 移除所有空白
        .replace(/[\r\n]+/g, '') // 移除换行
        .toLowerCase(); // 转小写
    };

    const normalized1 = normalize(content1);
    const normalized2 = normalize(content2);

    // 完全相同
    if (normalized1 === normalized2) {
      return true;
    }

    // 计算相似度（如果相似度 > 95%，认为相同）
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;

    if (longer.length === 0) return true;

    const similarity = (longer.length - editDistance(longer, shorter)) / longer.length;
    return similarity > 0.95;
  } catch (error) {
    console.error('检查内容相似度失败:', error);
    return false;
  }
};

// 计算编辑距离（Levenshtein Distance）
const editDistance = (s1, s2) => {
  const len1 = s1.length;
  const len2 = s2.length;
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // 删除
          dp[i][j - 1] + 1,    // 插入
          dp[i - 1][j - 1] + 1 // 替换
        );
      }
    }
  }

  return dp[len1][len2];
};

// 忽略问题
const ignoreIssue = (issue) => {
  issue.status = 'ignored';
  ElMessage.info('已忽略此问题');
};

// 恢复问题
const restoreIssue = (issue) => {
  issue.status = 'pending';
  ElMessage.success('已恢复此问题');
};

// 标记为已完成
const markAsCompleted = (issue) => {
  issue.status = 'completed';
  ElMessage.success('✅ 已标记为已完成');
};

// 显示解决方案提示词（用于外部AI对接）
const showSolutionPrompt = (issue) => {
  // 生成提示词
  generatedPrompt.value = generateSolutionPrompt(issue, props.project);
  promptDialogTitle.value = `解决方案提示词：${issue.title}`;
  promptSupportsPaste.value = true;
  promptPasteMode.value = 'solution';
  currentPromptIssue.value = issue;
  showPromptDialog.value = true;
};

// 处理提示词对话框的粘贴事件
const handlePromptPaste = ({ mode }) => {
  if (mode === 'solution') {
    // 打开粘贴解决方案对话框
    showSolutionResponseDialog();
  }
};

// 显示解决方案回复对话框
const showSolutionResponseDialog = () => {
  ElMessageBox.prompt(
    '请粘贴 AI 返回的解决方案：',
    '导入 AI 解决方案',
    {
      confirmButtonText: '解析并导入',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '粘贴 AI 的回复内容...',
      beforeClose: async (action, instance, done) => {
        if (action === 'confirm') {
          const aiResponse = instance.inputValue;
          if (!aiResponse || !aiResponse.trim()) {
            ElMessage.warning('请粘贴 AI 回复内容');
            done(false);
            return;
          }

          try {
            // 解析解决方案
            const solution = parseSolutionResponse(aiResponse);

            if (!solution.suggestedContent) {
              ElMessage.warning('未能解析到解决方案，请检查格式');
              done(false);
              return;
            }

            // 应用到当前问题
            if (currentPromptIssue.value) {
              await handleParsedSolution(solution);
            }

            done();
          } catch (error) {
            console.error('解析失败:', error);
            ElMessage.error('解析失败：' + error.message);
            done(false);
          }
        } else {
          done();
        }
      }
    }
  ).catch(() => {
    // 用户取消
  });
};

// 处理解析后的解决方案
const handleParsedSolution = async (solution) => {
  if (!currentPromptIssue.value) {
    ElMessage.error('未找到当前问题');
    return;
  }

  const issue = currentPromptIssue.value;

  try {
    console.log('📦 解析到的方案:', solution);
    console.log('  - suggestedContent 长度:', solution.suggestedContent.length);
    console.log('  - explanation 长度:', solution.explanation?.length || 0);

    // 保存方案到issue对象
    issue.solution = {
      suggestedContent: solution.suggestedContent,
      explanation: solution.explanation || '（无说明）',
      generatedAt: new Date().toISOString()
    };

    console.log('💾 已保存到 issue.solution:', issue.solution);

    // 显示解决方案对话框
    await generateSolution(issue, false);

    ElMessage.success('✅ 已导入外部 AI 解决方案');

    // 清理状态
    currentPromptIssue.value = null;
  } catch (error) {
    console.error('应用解决方案失败:', error);
    ElMessage.error('应用失败：' + error.message);
  }
};

// 重新生成方案
const regenerateSolution = async () => {
  if (!currentSolution.value) return;
  await generateSolution(currentSolution.value.issue, true);
};

// 复制方案
const copySolution = async () => {
  if (!currentSolution.value || !clipboardSupported) return;

  try {
    await copy(currentSolution.value.suggestedContent);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

// 监听 AI 建议方案的编辑
watch(() => currentSolution.value?.suggestedDisplayContent, (newValue, oldValue) => {
  // 当内容改变时检查是否与原始内容不同
  if (oldValue !== undefined && newValue !== originalSuggestedContent.value) {
    solutionModified.value = true;
    console.log('📝 检测到编辑，显示保存/恢复按钮');
  }
});

// 处理方案编辑（保留作为备用）
const handleSolutionEdit = () => {
  if (!currentSolution.value) return;
  solutionModified.value = true;
};

// 保存方案修改
const saveSolutionEdit = () => {
  if (!currentSolution.value) return;

  try {
    const { issue, suggestedDisplayContent } = currentSolution.value;
    const { module } = issue.location;

    // 根据当前显示模式解析内容
    let newSuggestedContent;

    if (suggestionDisplayMode.value === 'json') {
      // JSON模式：解析JSON
      try {
        newSuggestedContent = JSON.parse(suggestedDisplayContent);
      } catch (e) {
        ElMessage.error('JSON 格式错误，请检查后保存');
        return;
      }
    } else {
      // formatted模式：直接使用文本
      newSuggestedContent = suggestedDisplayContent;
    }

    // 更新suggestedContent
    currentSolution.value.suggestedContent = newSuggestedContent;

    // 保存到issue.solution
    if (issue.solution) {
      issue.solution.suggestedContent = newSuggestedContent;
    }

    // 重置修改标记
    solutionModified.value = false;

    // 更新原始备份
    originalSuggestedContent.value = suggestedDisplayContent;

    ElMessage.success('✅ 已保存修改，点击「替换原文案」将使用修改后的内容');
    console.log('✅ 已保存用户修改的AI建议方案');
  } catch (error) {
    console.error('保存修改失败:', error);
    ElMessage.error('保存失败：' + error.message);
  }
};

// 恢复原始方案
const restoreSolution = () => {
  if (!currentSolution.value || !originalSuggestedContent.value) return;

  // 恢复显示内容
  currentSolution.value.suggestedDisplayContent = originalSuggestedContent.value;

  // 重置修改标记
  solutionModified.value = false;

  ElMessage.success('⤴️ 已恢复为AI原始建议方案');
  console.log('✅ 已恢复为AI原始建议方案');
};

// 确认应用解决方案
const confirmApplySolution = async () => {
  if (!currentSolution.value) return;

  try {
    await ElMessageBox.confirm(
      `确定要将AI建议方案替换到“${getLocationText(currentSolution.value.issue.location)}”吗？原文案将被覆盖。`,
      '确认替换',
      {
        confirmButtonText: '确认替换',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await applySolution(currentSolution.value);
  } catch (error) {
    if (error !== 'cancel') {
      console.error('应用方案失败:', error);
    }
  }
};

// 应用解决方案
const applySolution = async (solution) => {
  if (!solution || !solution.issue) {
    console.error('❗ solution 或 issue 对象不存在');
    return;
  }

  applying.value = true;

  try {
    const { issue, suggestedDisplayContent, suggestedContent } = solution;
    const { module, field, characterId, episodeNumber } = issue.location;

    // ✅ 优先使用用户编辑后的内容（suggestedDisplayContent），如果是formatted模式需要转换为JSON
    let contentToApply = suggestedContent;

    if (suggestionDisplayMode.value === 'formatted' && suggestedDisplayContent) {
      // 如果在formatted模式，需要从显示内容反向解析出JSON
      console.log('🔄 从formatted内容反向解析JSON用于应用...');
      try {
        // 尝试从issue.solution获取最新保存的suggestedContent
        if (issue.solution && issue.solution.suggestedContent) {
          contentToApply = issue.solution.suggestedContent;
          console.log('✅ 使用issue.solution中保存的最新内容');
        } else {
          // 如果没有，尝试解析当前的suggestedContent
          const parsed = AIService.parseModuleData(module, suggestedContent);
          if (parsed && typeof parsed === 'object') {
            contentToApply = JSON.stringify(parsed);
            console.log('✅ 从原始suggestedContent解析成功');
          } else {
            console.warn('⚠️ 无法解析formatted内容，使用原始suggestedContent');
          }
        }
      } catch (e) {
        console.error('❌ 反向解析失败，使用原始suggestedContent:', e);
      }
    }

    // 验证内容有效性
    if (!contentToApply || (typeof contentToApply === 'string' && /^[a-f0-9]{24}$/i.test(contentToApply.trim()))) {
      throw new Error('建议方案内容无效或为空，请重新生成方案');
    }

    console.log('📤 准备应用的内容类型:', typeof contentToApply);
    console.log('📤 内容预览:', typeof contentToApply === 'string' ? contentToApply.substring(0, 200) : contentToApply);

    // 根据模块类型更新内容
    await updateModuleContent(module, field, contentToApply, characterId, episodeNumber);

    // 标记问题为已解决
    issue.status = 'solved';

    ElMessage.success('已应用AI建议方案');
    showSolution.value = false;

    // 通知父组件内容已更新（带上详细信息以便父组件刷新）
    emit('content-updated', {
      module,
      field,
      characterId,
      episodeNumber,
      action: 'ai-solution-applied'
    });

    // 重新运行快速检查
    await runQuickAnalysis();
  } catch (error) {
    console.error('应用方案失败:', error);
    console.error('错误堆栈:', error.stack);
    ElMessage.error('应用方案失败：' + (error.message || '请稍后重试'));

    // 失败时也重置 generating 状态（防止按钮卡死）
    if (solution.issue) {
      solution.issue.generating = false;
      console.log(`✅ 应用失败，已重置 issue.generating = false`);
    }
  } finally {
    applying.value = false;
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

// 更新模块内容（使用UpdateStrategyFactory）
const updateModuleContent = async (module, field, content, characterId, episodeNumber) => {
  try {
    const message = await UpdateStrategyFactory.apply(
      props.project,
      module,
      field,
      content,
      characterId,
      episodeNumber
    );

    console.log(`✅ ${message}`);
    return message;
  } catch (error) {
    console.error('❗ 更新失败:', error);
    throw error;
  }
};

// ✅ 已删除旧的 _updateModuleContent_OLD 函数
// 该函数已被 UpdateStrategyFactory 完全替代，无需保留

// ========================================
// 🎯 字段精确匹配 - 生成可用字段约束
// ========================================
const generateFieldConstraints = (project) => {
  const { outline, episodes } = project;

  // 1) 世界观字段（静态）
  const worldviewFields = [
    '故事背景',
    '世界设定',
    '核心主题',
    '主要冲突',
    '情感基调'
  ];

  // 2) 角色字段（静态+逻辑概念）
  const logicalCharacterFields = ['主要配角', '配角', '次要角色'];
  const concreteCharacterFields = [
    '角色名称',
    '角色定位',
    '角色描述',
    '性格描述',
    '性格特点',
    '角色背景',
    '行为动机',
    '人际关系'
  ];

  // 3) 大纲字段（动态：第N幕）
  const outlineFields = [];
  if (outline && Array.isArray(outline.acts)) {
    const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    outline.acts.forEach((_, idx) => {
      const n = numerals[idx] || `${idx + 1}`;
      outlineFields.push(`第${n}幕`);
    });
  }

  // 4) 分集字段（动态：第N集）
  const episodeFields = [];
  if (episodes && Array.isArray(episodes)) {
    episodes.forEach(ep => {
      if (ep && typeof ep.number === 'number') {
        episodeFields.push(`第${ep.number}集`);
      }
    });
  }

  // 5) 拼装说明文本
  return `
## 📍 可诊断字段清单（必须从以下选择）

### 🌍 世界观模块 (module: "worldview")
${worldviewFields.map(f => `- ${f}`).join('\n')}

### 👥 角色模块 (module: "characters")
**逻辑概念字段**（用于批量诊断）：
${logicalCharacterFields.map(f => `- ${f}`).join('\n')}

**具体字段**（用于单个角色诊断，需要提供 characterId 为角色名称）：
${concreteCharacterFields.map(f => `- ${f}`).join('\n')}

### 📝 大纲模块 (module: "outline")
${outlineFields.length ? outlineFields.map(f => `- ${f}`).join('\n') : '- （当前无大纲）'}

### 🎬 分集模块 (module: "episodes")
${episodeFields.length ? episodeFields.map(f => `- ${f}`).join('\n') : '- （当前无分集）'}

---

## ⚠️ 重要约束（必须遵守）
1. location.field 必须精确使用上述中文字段名
   - ✅ 正确示例："field": "故事背景"
   - ❌ 错误示例："field": "整体节奏设计"、"角色塑造"
2. 不要使用抽象概念字段；如涉及多个位置，请拆分为多个 issue
3. 角色：
   - 批量诊断（如 "主要配角"）时，characterId 填 null
   - 单个角色诊断时，characterId 填角色名称（如 "萧玦"）
4. 不要创造新的字段名；必须从清单中选择
`;
};

// 生成诊断提示词
const generateDiagnosisPrompt = (stage, project) => {
  const { name, type, worldview, characters, outline, episodes } = project;

  // 格式化世界观
  const formatWorldview = () => {
    if (!worldview || Object.keys(worldview).length === 0) {
      return '暂无世界观设定';
    }

    let result = [];
    if (worldview.background) result.push(`**故事背景**：${worldview.background}`);
    if (worldview.setting) result.push(`**世界设定**：${worldview.setting}`);
    if (worldview.theme) result.push(`**核心主题**：${worldview.theme}`);
    if (worldview.conflict) result.push(`**主要冲突**：${worldview.conflict}`);
    if (worldview.tone) result.push(`**情感基调**：${worldview.tone}`);

    return result.length > 0 ? result.join('\n') : '暂无世界观设定';
  };

  // 格式化角色信息
  const formatCharacters = () => {
    if (!characters || characters.length === 0) {
      return '暂无角色设定';
    }

    return characters.map((c, index) => {
      let charInfo = [`### ${index + 1}. ${c.name || '未命名'}`];
      if (c.role) charInfo.push(`**定位**：${c.role}`);
      if (c.age || c.gender) {
        charInfo.push(`**基本信息**：${c.age ? c.age + '岁' : ''}${c.age && c.gender ? '，' : ''}${c.gender || ''}`);
      }
      if (c.description) charInfo.push(`**简介**：${c.description}`);
      if (c.personality) charInfo.push(`**性格**：${c.personality}`);
      if (c.background) charInfo.push(`**背景**：${c.background}`);
      if (c.motivation) charInfo.push(`**动机**：${c.motivation}`);
      if (c.relationships) charInfo.push(`**关系**：${c.relationships}`);
      if (c.tags && c.tags.length > 0) charInfo.push(`**标签**：${c.tags.join('、')}`);

      return charInfo.join('\n');
    }).join('\n\n');
  };

  // 根据不同阶段生成不同的提示词
  if (stage === 'preparation') {
    return `# 短剧前期设定诊断

## 项目基本信息
- **项目名称**：${name}
- **剧本类型**：${type}

---

## 世界观设定

${formatWorldview()}

---

## 角色设定

${formatCharacters()}

---

## 剧情大纲

${formatOutline(outline)}

---

# 诊断任务

请作为专业的短剧编剧，仔细分析以上【世界观】、【角色设定】和【剧情大纲】。

## 评估标准
- 世界观是否完整、自洽？
- 角色设定是否鲜明、有冲突性？
- 大纲是否逻辑清晰、节奏合理？
- 是否符合【${type}】类型的核心要素？

## 诊断原则
1. **优先质量而非数量**：只列出真正影响剧本质量的问题
2. **如果内容已经很完善**，可以返回空数组 []
3. **如果存在问题**，请列出最重要的3-5个
4. **不要为了凑数而挑剔**：宁缺母滥

## 字段约束（严格遵守）
${generateFieldConstraints(project)}

## 返回格式

请按以下JSON格式返回诊断结果：

\`\`\`json
{
  "issues": [
    {
      "severity": "critical|medium|low",
      "title": "问题标题（10字内）",
      "description": "详细描述问题，为什么这是问题，会造成什么影响（50字内）",
      "location": {
        "module": "worldview|characters|outline",
        "field": "具体字段名或节点",
        "characterId": "如果是角色问题，填写角色ID，否则null"
      }
    }
  ]
}
\`\`\`

## 要求
1. **客观评估**：如果内容已达到短剧标准，可以返回空数组
2. **真实问题**：只列出真正需要修复的、影响剧本质量的问题
3. **优先级准确**：critical 应为严重问题，medium 为中等问题，low 为轻微问题
4. **描述具体**：每个问题要可操作，给出明确的修改方向
5. **数量控制**：如有问题，建议3-5个，最多不超过6个`;
  } else if (stage === 'episodes') {
    // 分集检查
    const completedEpisodes = episodes?.filter(ep => ep.status === 'completed' || ep.status === 'reviewed') || [];
    const episodeSummary = completedEpisodes.slice(0, 5).map(ep =>
      `- 第${ep.number}集：${ep.title || '未命名'}（${ep.wordCount || 0}字）`
    ).join('\n');

    return `# 短剧分集质量检查

## 项目信息
- **项目名称**：${name}
- **剧本类型**：${type}
- **已完成集数**：${completedEpisodes.length}集

## 已完成剧集
${episodeSummary || '暂无已完成剧集'}

---

# 诊断任务

请检查已完成的分集剧本。

## 检查要点
- 剧情连贯性和逻辑性
- 对白质量和人物塑造
- 节奏把控和悬念设置
- 字数是否符合短剧标准（800-1200字/集）

## 诊断原则
1. **如果质量达标**，可以返回空数组
2. **如果存在问题**，请列出最重要的3-5个
3. **优先质量而非数量**：不要为了凑数而挑剔

${generateFieldConstraints(project)}

请按相同JSON格式返回诊断结果。`;
  } else if (stage === 'overall') {
    // 整体优化
    const stats = {
      totalEpisodes: episodes?.length || 0,
      completedEpisodes: episodes?.filter(ep => ep.status === 'completed' || ep.status === 'reviewed').length || 0,
      totalWords: episodes?.reduce((sum, ep) => sum + (ep.wordCount || 0), 0) || 0
    };

    return `# 短剧整体优化建议

## 项目信息
- **项目名称**：${name}
- **剧本类型**：${type}
- **总集数**：${stats.totalEpisodes}集
- **已完成**：${stats.completedEpisodes}集
- **总字数**：${stats.totalWords}字

---

# 诊断任务

请从整体角度审视这部短剧。

## 关注点
- 整体剧情结构和完整性
- 角色弧光和成长曲线
- 情感高潮和冲突设计
- 市场定位和受众吸引力

## 诊断原则
1. **如果整体结构已经很好**，可以返回空数组
2. **如果有优化空间**，请提出战略性的优化建议（3-5个）
3. **优先质量而非数量**：不要为了凑数而挑剔

${generateFieldConstraints(project)}

请按相同JSON格式返回诊断结果。`;
  }

  // 默认返回前期检查
  return generateDiagnosisPrompt('preparation', project);
};

// 生成解决方案提示词
const generateSolutionPrompt = (issue, project) => {
  // ✅ 使用 DataService 获取原始内容
  const originalContent = dataService.getFieldContent(
    issue.location,
    { format: 'formatted' }
  );

  // 格式化大纲（完整版）
  const formatOutlineForSolution = (outline) => {
    if (!outline || !outline.acts || outline.acts.length === 0) {
      return '暂无大纲';
    }

    return outline.acts.map((act, actIndex) => {
      let actText = `${actIndex + 1}. ${act.title || `第${actIndex + 1}幕`}`;
      if (act.description) {
        actText += `\n   ${act.description}`;
      }

      if (act.plotPoints && act.plotPoints.length > 0) {
        actText += '\n   情节点:';
        act.plotPoints.forEach((point, idx) => {
          actText += `\n   ${idx + 1}) ${point.name || '未命名'}`;
          if (point.description) {
            actText += ` - ${point.description}`;
          }
        });
      }

      return actText;
    }).join('\n\n');
  };

  // 获取问题定位信息
  const { module, field, characterId } = issue.location;
  const moduleNames = {
    'worldview': '世界观',
    'characters': '角色',
    'outline': '大纲幕',
    'episodes': '分集'
  };

  return `# 生成解决方案

## 问题信息
- **问题标题**：${issue.title}
- **严重程度**：${getIssueSeverityText(issue.severity)}
- **问题描述**：${issue.description}
- **定位模块**：${moduleNames[module] || module}
- **目标字段**：${field}
${characterId ? `- **目标角色**：${characterId}` : ''}

## 原文案
${originalContent || '(无原文案)'}

## 项目上下文

### 基本信息
- **项目名称**：${project.name}
- **剧本类型**：${project.type}
- **情感基调**：${project.worldview?.tone || '未设定'}

### 世界观
${project.worldview?.background ? `- 故事背景：${project.worldview.background.substring(0, 100)}${project.worldview.background.length > 100 ? '...' : ''}` : ''}
${project.worldview?.theme ? `- 核心主题：${project.worldview.theme}` : ''}
${project.worldview?.conflict ? `- 主要冲突：${project.worldview.conflict}` : ''}

### 剧情大纲
${formatOutlineForSolution(project.outline)}

---

# 任务要求

请针对上述问题，结合项目上下文，生成一个**具体可用的修改方案**。

## ⚠️ 核心约束（必须遵守）

**你必须修改的是：${moduleNames[module]} > ${field}${characterId ? ` > ${characterId}` : ''}**

- 如果是角色字段（${module === 'characters' ? '✅ 是' : '❌ 不是'}），只返回该字段的文本内容
- 如果是世界观字段（${module === 'worldview' ? '✅ 是' : '❌ 不是'}），只返回该字段的文本内容
- 如果是大纲幕（${module === 'outline' ? '✅ 是' : '❌ 不是'}），返回JSON对象（包含actNumber, title, description, plotPoints）
- **禁止跨模块修改**：不要返回其他模块的内容

## 返回格式

必须返回JSON格式，包含以下字段：

\`\`\`json
{
  "suggestedContent": "修改后的完整文案（使用\\\\n表示换行）",
  "explanation": "修改说明：\\n1. 改动点1\\n2. 改动点2\\n3. 改动点3"
}
\`\`\`

## 重要注意事项

1. **suggestedContent 的格式根据模块不同**
   - **如果是世界观字段**：suggestedContent 为字符串，返回完整的描述文本
   - **如果是角色字段**：suggestedContent 为字符串，返回完整的角色描述
   - **如果是大纲幕**：suggestedContent 为 JSON 对象（注意：不是字符串）：
     \`\`\`json
     {
       "suggestedContent": {
         "_id": "68ee5c57b89f9267f4cb8f22",  // ⚠️ 幕的_id，必须放在最前面
         "id": "68ee5c57b89f9267f4cb8f22",  // ⚠️ 幕的id，必须放在最前面
         "actNumber": 2,
         "title": "第二幕：对抗",
         "description": "幕的完整描述...",
         "plotPoints": [
           {
             "id": "mgqngt6c2jld3dlpqe5",  // ⚠️ 情节点的id
             "name": "情节点名称",
             "description": "情节点完整描述...",
             "characters": ["角色1", "角色2"],
             "emotion": ["复仇的快感", "紧张"],  // ⚠️ 必需字段
             "episodeRange": "16-19",  // ⚠️ 必需字段
             "_id": "68ee5c57b89f9267f4cb8f23"  // ⚠️ 情节点的_id
           }
         ]
       },
       "explanation": "..."
     }
     \`\`\`
   - **不要只返回框架或大纲结构**，要返回具体内容

2. **保持原有风格和结构**
   - 字数相近（八成3倒）
   - 文风一致
   - 结构完整

3. **解决问题但不过度修改**
   - 只针对问题点进行修改
   - 保留好的部分
   - 对于大纲问题：
     - 如果原大纲有plotPoints，必须保留并优化
     - 如果原大纲没有plotPoints，请添加详细的plotPoints

## ⚠️ 特别注意 - 幕和 plotPoints 的字段完整性

修改大纲时，**必须保留**原有字段：

### 幕层级必须保留：
1. **_id** - 幕的MongoDB内部ID（如 "68ee5c57b89f9267f4cb8f22"），**必须放在最前面**
2. **id** - 幕的ID（如 "68ee5c57b89f9267f4cb8f22"），**必须放在最前面**
3. **actNumber, title, description, plotPoints** - 根据问题优化

### plotPoints 层级必须保留：
1. **id** - 情节点原ID（如 "mgqngt6c2jld3dlpqe5"），不要改为 "1", "2", "3"
2. **_id** - 情节点MongoDB内部ID（如 "68ee5c57b89f9267f4cb8f23"）
3. **emotion** - 保留情感标签数组，可适当调整
4. **episodeRange** - 保留集数范围（如 "16-19"），可适当调整
5. **name, description, characters** - 根据问题优化

**如果新增情节点**，请为其生成类似格式的ID和默认字段

4. **explanation 要清晰列举改动点**

5. **JSON格式规范**
   - 换行使用 \\\\n
   - 引号使用 \\\\"
   - 确保格式正确，可被JSON.parse()解析

## 示例

### 示例1：角色字段修改（✅ 正确）

**问题定位**: 角色 > 行为动机 > 夏语冰
**原文案**: "揭示昆虫世界的奥秘，保护生态平衡。"
**问题**: 人蚊情感牵强，缺乏合理铺垫。

**✅ 正确返回**：
\`\`\`json
{
  "suggestedContent": "揭示昆虫世界的奥秘，保护生态平衡。在调查过程中，她逐渐察觉到背后似乎有人为操控的痕迹。出于科学家的好奇心，她开始密切关注某只表现异常的蚊子，并尝试与它建立沟通，意外成为凌云复仇计划中的关键变数。",
  "explanation": "1. 保留原有的科研动机\\n2. 添加与蚊子凌云的接触铺垫\\n3. 强化科学家角度的合理性"
}
\`\`\`

**❌ 错误返回**（跨模块修改）：
\`\`\`json
{
  "suggestedContent": {
    "actNumber": 2,
    "title": "第二幕：对抗",
    "description": "...关于情感铺垫的大纲..."
  }
}
\`\`\`

### 示例2：大纲幕修改（重要！）

**问题定位**: 大纲幕 > 第二幕
**原大纲**:
\`\`\`json
{
  "actNumber": 2,
  "title": "第二幕：对抗",
  "description": "冲突升级",
  "plotPoints": []
}
\`\`\`
**问题**: 大纲节点笼统，缺乏具体情节转折点设计。

**✅ 正确返回**（注意：必须包含所有字段）：
\`\`\`json
{
  "suggestedContent": {
    "_id": "68ee5c57b89f9267f4cb8f22",  // ✅ 幕的_id，必须放在最前面
    "id": "68ee5c57b89f9267f4cb8f22",  // ✅ 幕的id，必须放在最前面
    "actNumber": 2,
    "title": "第二幕：对抗",
    "description": "本幕是复仇计划全面展开的阶段。凌云利用马东的技术和蚊子军队，对赵凯的商业帝国发起了一系列精准打击。",
    "plotPoints": [
      {
        "id": "mgqngt6c2jld3dlpqe5",  // ✅ 情节点的id
        "name": "初次反击",
        "description": "凌云指挥蚊子大军，在赵凯公司的重要产品发布会上制造了一场蚊群骚乱，导致产品演示失败。",
        "characters": ["凌云", "赵凯", "马东"],
        "emotion": ["复仇的快感", "紧张", "挫败（赵凯）"],
        "episodeRange": "16-19",
        "_id": "68ee5c57b89f9267f4cb8f23"  // ✅ 情节点的_id
      }
    ]
  },
  "explanation": "1. 丰富幕描述，明确阶段任务\\n2. 优化情节点描述\\n3. 保留所有原有字段"
}
\`\`\`

**❌ 错误返回1**（suggestedContent 是字符串）：
\`\`\`json
{
  "suggestedContent": "{\\n  \\\"actNumber\\\": 2,\\n  ...",
  "explanation": "..."
}
\`\`\`

**❌ 错误返回2**（缺少外层包装）：
\`\`\`json
{
  "actNumber": 2,
  "title": "第二幕：对抗",
  ...
}
\`\`\`

**不要返回Markdown格式**，如：
\`\`\`
## 第二幕：对抗
本幕是...
**情节点**：
1. **初次反击**...
\`\`\`
`;
};

// 格式化大纲（完整版，用于诊断提示词）
const formatOutline = (outline) => {
  if (!outline || !outline.acts) return '暂无大纲';

  return outline.acts.map((act, index) => {
    let actText = `### 第${index + 1}幕：${act.title}`;

    // 添加幕描述
    if (act.description) {
      actText += `\n**幕描述**：${act.description}`;
    }

    // 添加情节点详细信息
    if (act.plotPoints && act.plotPoints.length > 0) {
      actText += '\n\n**情节点**：';
      act.plotPoints.forEach((point, idx) => {
        actText += `\n${idx + 1}. **${point.name || '未命名'}**`;
        if (point.description) {
          actText += `\n   ${point.description}`;
        }
        if (point.characters && point.characters.length > 0) {
          actText += `\n   涉及角色：${point.characters.join('、')}`;
        }
      });
    } else {
      actText += '\n\n**情节点**：暂无节点';
    }

    return actText;
  }).join('\n\n');
};

// ✅ 已删除旧的解析函数 parseAICharacterSolution 和 parseAIOutlineSolution
// 这些函数已被集成到 AIService 中，无需在这里重复实现

// 导入parseSolutionResponse函数
import { parseSolutionResponse } from '../utils/aiResponseParser';

// 解析AI返回的问题列表
const parseAIIssues = (content) => {
  try {
    console.log('开始解析AI返回的问题列表...');
    console.log('原始内容:', content.substring(0, 200));

    // 方法1：直接尝试解析整个内容（可能已经是纯 JSON）
    try {
      const directParse = JSON.parse(content);
      if (directParse.issues && Array.isArray(directParse.issues)) {
        console.log('✅ 直接解析成功，问题数量:', directParse.issues.length);
        return directParse.issues;
      }
    } catch (e) {
      console.log('直接解析失败，尝试提取JSON块...');
    }

    // 方法2：从 markdown 代码块中提取 JSON
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const jsonContent = codeBlockMatch[1].trim();
        console.log('提取到代码块:', jsonContent.substring(0, 100));
        const data = JSON.parse(jsonContent);
        if (data.issues && Array.isArray(data.issues)) {
          console.log('✅ 从代码块解析成功，问题数量:', data.issues.length);
          return data.issues;
        }
      } catch (e) {
        console.error('代码块解析失败:', e);
      }
    }

    // 方法3：使用正则提取 JSON 对象
    const jsonMatch = content.match(/\{[\s\S]*"issues"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[0];
        console.log('正则提取到JSON:', jsonStr.substring(0, 100));

        // 清理可能的问题字符
        jsonStr = jsonStr
          .replace(/\r\n/g, '\\n')  // 替换换行符
          .replace(/\n/g, '\\n')     // 替换换行符
          .replace(/\t/g, '\\t')     // 替换制表符
          .replace(/\\\\n/g, '\\n'); // 避免重复转义

        const data = JSON.parse(jsonStr);
        if (data.issues && Array.isArray(data.issues)) {
          console.log('✅ 正则提取解析成功，问题数量:', data.issues.length);
          return data.issues;
        }
      } catch (e) {
        console.error('正则提取解析失败:', e);
      }
    }

    console.warn('⚠️ 所有解析方法均失败');
    return [];
  } catch (error) {
    console.error('❌ 解析AI返回失败:', error);
    console.error('错误堆栈:', error.stack);
    return [];
  }
};

// 解析AI返回的解决方案（改进版）
const parseAISolution = (content) => {
  try {
    console.log('开始解析AI返回的解决方案...');
    console.log('原始内容:', content.substring(0, 200));

    // 方法1：直接尝试解析
    try {
      const directParse = JSON.parse(content);
      if (directParse.suggestedContent !== undefined) {
        console.log('✅ 直接解析成功');
        return directParse;
      }
    } catch (e) {
      console.log('直接解析失败，尝试提取JSON块...');
    }

    // 方法2：从 markdown 代码块中提取
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const jsonContent = codeBlockMatch[1].trim();
        console.log('提取到代码块:', jsonContent.substring(0, 100));
        const solution = JSON.parse(jsonContent);
        if (solution.suggestedContent !== undefined) {
          console.log('✅ 从代码块解析成功');
          return solution;
        }
      } catch (e) {
        console.error('代码块解析失败:', e);
      }
    }

    // 方法3：使用正则提取
    const jsonMatch = content.match(/\{[\s\S]*"suggestedContent"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[0];
        console.log('正则提取到JSON:', jsonStr.substring(0, 100));

        // 清理控制字符和特殊字符
        jsonStr = jsonStr
          .replace(/\r\n/g, '\\n')  // 替换Windows换行
          .replace(/\r/g, '\\n')     // 替换Mac换行
          .replace(/\n/g, '\\n')     // 替换Unix换行
          .replace(/\t/g, '\\t')     // 替换制表符
          .replace(/\\\\n/g, '\\n') // 避免重复转义
          .replace(/\\\\t/g, '\\t'); // 避免重复转义

        console.log('清理后的JSON:', jsonStr.substring(0, 100));
        const solution = JSON.parse(jsonStr);
        console.log('✅ 正则提取解析成功');
        return solution;
      } catch (e) {
        console.error('正则提取解析失败:', e);
        console.error('错误详情:', e.message);
        console.error('问题位置:', jsonMatch[0].substring(Math.max(0, e.message.match(/\d+/)?.[0] - 50), parseInt(e.message.match(/\d+/)?.[0] || 0) + 50));
      }
    }

    console.warn('⚠️ 所有解析方法均失败');
    return { suggestedContent: '', explanation: '' };
  } catch (error) {
    console.error('❌ 解析方案失败:', error);
    console.error('错误堆栈:', error.stack);
    return { suggestedContent: '', explanation: '' };
  }
};

// ✅ 已删除旧的格式化函数
// formatCharactersContent, formatOutlineContent, formatEpisodeContent
// 这些函数已被集成到 DataService 中，通过 getFieldContent 统一调用

// ✅ 已删除旧的 getOriginalContent 函数 - 第1部分
// 该函数已被 DataService.getFieldContent() 完全替代

// ✅ 已删除旧的 getOriginalContent 函数 - 第2部分
// 该函数已被 DataService.getFieldContent() 完全替代

// 获取位置文本
const getLocationText = (location) => {
  const moduleMap = {
    'worldview': '世界观',
    'characters': '角色管理',
    'outline': '剧情大纲',
    'episodes': '分集剧本'
  };

  const fieldMap = {
    'background': '故事背景',
    'setting': '世界设定',
    'theme': '核心主题',
    'conflict': '主要冲突',
    'tone': '情感基调',
    'personality': '性格描述',
    'background': '角色背景',
    'motivation': '行为动机'
  };

  return `${moduleMap[location.module] || location.module} > ${fieldMap[location.field] || location.field}`;
};

// 获取问题严重程度类型
const getIssueSeverityType = (severity) => {
  const map = {
    'critical': 'danger',
    'medium': 'warning',
    'low': 'info'
  };
  return map[severity] || 'info';
};

// 获取问题严重程度文本
const getIssueSeverityText = (severity) => {
  const map = {
    'critical': '严重',
    'medium': '中等',
    'low': '轻微'
  };
  return map[severity] || '未知';
};

// 格式化解释文本
const formatExplanation = (text) => {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
};

// 生成外部AI提示词
const generatePromptForExternal = () => {
  try {
    const prompt = generateDiagnosisPrompt(activeStage.value, props.project);
    generatedPrompt.value = prompt;
    showPromptDialog.value = true;
  } catch (error) {
    console.error('生成提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 处理导入的AI诊断结果
const handleDiagnosisParsed = (parsedData) => {
  console.log('📥 开始处理导入的AI诊断结果');
  console.log('原始数据类型:', typeof parsedData);
  console.log('原始数据:', parsedData);

  try {
    // parsedData 可能是字符串或对象
    let issues = [];

    if (typeof parsedData === 'string') {
      console.log('尝试解析字符串格式的数据...');
      // 尝试解析字符串
      issues = parseAIIssues(parsedData);
      console.log('解析结果:', issues);
    } else if (parsedData && parsedData.issues) {
      console.log('直接使用对象中的 issues 字段');
      // 已经是解析后的对象
      issues = parsedData.issues;
    } else {
      console.warn('⚠️ 无法识别的数据格式');
    }

    console.log('最终解析到的问题数量:', issues.length);

    if (!issues || issues.length === 0) {
      console.error('❌ 未能解析到有效问题');
      ElMessage.warning('未能从内容中解析到有效的问题列表，请检查格式');
      return;
    }

    // 导入问题列表
    aiIssues.value = issues.map(issue => ({
      ...issue,
      generating: false,
      status: 'pending'
    }));

    console.log('✅ 问题列表已设置到 aiIssues');

    showImportDialog.value = false;
    // 切换到AI诊断Tab
    activeSubTab.value[activeStage.value] = 'ai-diagnosis';
    console.log('✅ 已切换到AI诊断Tab');

    ElMessage.success(`成功导入 ${aiIssues.value.length} 个问题`);
  } catch (error) {
    console.error('❌ 导入AI结果失败:', error);
    console.error('错误堆栈:', error.stack);
    ElMessage.error('导入失败，请检查内容格式');
  }
};

// 服务器持久化函数
const saveAIDiagnosisToServer = async () => {
  try {
    const projectId = props.project._id || props.project.id;
    if (!projectId) {
      console.error('项目ID不存在');
      return;
    }

    const response = await saveAIDiagnosis(projectId, activeStage.value, aiIssues.value);
    if (response.code === 200) {
      console.log('✅ AI诊断结果已保存到服务器', {
        stage: activeStage.value,
        issuesCount: aiIssues.value.length
      });
    }
  } catch (error) {
    console.error('保存AI诊断结果失败:', error);
    // 不阻塞用户操作
  }
};

// 从服务器加载AI诊断结果
const loadAIDiagnosisFromServer = async () => {
  try {
    const projectId = props.project._id || props.project.id;
    if (!projectId) {
      console.log('ℹ️ 项目ID不存在，跳过加载');
      return false;
    }

    const response = await getAIDiagnosis(projectId, activeStage.value);
    if (response.code === 200 && response.data) {
      const { issues, lastUpdated } = response.data;

      if (issues && Array.isArray(issues) && issues.length > 0) {
        // ✅ 验证和修复solution数据
        const validatedIssues = issues.map(issue => {
          if (issue.solution && issue.solution.suggestedContent) {
            const content = issue.solution.suggestedContent;

            // 检查是否为无效的MongoDB ID字符串（24位十六进制）
            if (typeof content === 'string' && /^[a-f0-9]{24}$/i.test(content.trim())) {
              console.warn(`⚠️ 问题"${issue.title}"的solution.suggestedContent是无效的ID字符串，已清除`);
              // 清除无效的solution，强制用户重新生成
              issue.solution = null;
              issue.status = 'pending';
            }
          }
          return issue;
        });

        aiIssues.value = validatedIssues;
        // 切换到AI诊断Tab
        activeSubTab.value[activeStage.value] = 'ai-diagnosis';

        // 调试：检查solution数据
        const issuesWithSolution = validatedIssues.filter(i => i.solution);
        console.log('✅ 已从服务器加载AI诊断结果:', validatedIssues.length, '个问题');
        console.log('💾 其中', issuesWithSolution.length, '个问题已有有效solution数据');
        if (issuesWithSolution.length > 0) {
          console.log('示例 solution:', issuesWithSolution[0].solution);
        }

        const invalidCount = validatedIssues.filter(i => !i.solution && issues.find(orig => orig.id === i.id)?.solution).length;
        if (invalidCount > 0) {
          ElMessage.warning(`已加载 ${validatedIssues.length} 个问题，其中 ${invalidCount} 个方案数据异常已清除，请重新生成`);
        } else {
          ElMessage.success(`已加载 ${validatedIssues.length} 个AI诊断问题`);
        }
        return true;
      } else {
        console.log('ℹ️ 服务器上无保存的AI诊断结果');
        aiIssues.value = [];
        showAIResult.value = false;
      }
    }
    return false;
  } catch (error) {
    console.error('加载AI诊断结果失败:', error);
    return false;
  }
};

// 清除AI诊断结果
const clearAIDiagnosis = async () => {
  try {
    aiIssues.value = [];
    showAIResult.value = false;
    // 保存空数据到服务器
    await saveAIDiagnosisToServer();
    console.log('✅ 已清除AI诊断结果');
  } catch (error) {
    console.error('清除AI诊断结果失败:', error);
  }
};

// 监听 aiIssues 变化，防抖后保存
let saveTimer = null;
watch(aiIssues, () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (aiIssues.value.length > 0) {
      saveAIDiagnosisToServer();
    }
  }, 1000); // 防抖 1 秒
}, { deep: true });

// 监听阶段切换，加载对应的AI诊断结果
watch(activeStage, () => {
  loadAIDiagnosisFromServer();
});

// 组件挂载时执行一次快速检查并加载AI诊断结果
onMounted(() => {
  runQuickAnalysis();
  loadAIDiagnosisFromServer();
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

// 操作按钮栏
.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

// 子级Tab卡片
.sub-tabs-card {
  :deep(.el-card__body) {
    padding: 0;
  }
}

.sub-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #e4e7ed;
  }

  :deep(.el-tabs__content) {
    padding: 20px;
  }

  :deep(.el-tabs__item) {
    height: 50px;
    line-height: 50px;
    font-size: 14px;

    .tab-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
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

// 新增样式
.tabs-card {
  margin-bottom: 20px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
    padding: 0 20px;
  }

  :deep(.el-tabs__nav-wrap)::after {
    height: 1px;
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;

    .el-icon {
      font-size: 16px;
    }
  }
}

.stage-content {
  min-height: 400px;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

// AI诊断结果样式
.ai-issues-container {
  max-height: 600px;
  overflow-y: auto;
}

.ai-issue-item {
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 16px;
  background: #fafafa;
  transition: all 0.3s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &.ignored {
    opacity: 0.6;
    background: #f5f7fa;

    .ai-issue-title {
      text-decoration: line-through;
      color: #909399;
    }

    .ai-issue-desc {
      text-decoration: line-through;
      color: #c0c4cc;
    }

    .ai-issue-location {
      text-decoration: line-through;
    }
  }
}

.ai-issue-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .ai-issue-number {
    font-size: 12px;
    color: #909399;
    font-weight: 600;
  }
}

.ai-issue-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.ai-issue-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.ai-issue-location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;

  .el-icon {
    font-size: 14px;
  }
}

.ai-issue-actions {
  display: flex;
  gap: 8px;
}

// 解决方案样式
.solution-container {
  h4 {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px 0;
  }
}

.solution-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.solution-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h4 {
      margin: 0;
    }

    .el-radio-group {
      :deep(.el-radio-button__inner) {
        padding: 8px 12px;
        font-size: 12px;
      }
    }
  }

  .content-textarea {
    font-family: inherit;

    &.json-mode {
      :deep(textarea) {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        background: #f6f8fa;
        color: #24292f;
      }
    }

    &.suggested {
      :deep(textarea) {
        background: #f0f9ff;
        border-color: #409eff;
      }
    }
  }
}

.solution-explanation {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;

  p {
    font-size: 14px;
    color: #606266;
    line-height: 1.8;
    margin: 0;
  }
}
</style>
