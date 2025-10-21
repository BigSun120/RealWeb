<template>
  <div class="overall-check">
    <!-- 检查范围选择器 -->
    <el-card class="range-selector-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><DataAnalysis /></el-icon>
          <span>选择检查范围</span>
        </div>
      </template>

      <div class="range-info">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <span>已完成 <strong>{{ completedCount }}</strong> / {{ project.episodeCount }} 集</span>
          </template>
        </el-alert>
      </div>

      <el-radio-group v-model="checkRange" class="range-options">
        <el-radio value="all">
          <span class="radio-label">全部已完成剧集（推荐）</span>
          <span class="range-hint">第1-{{ lastCompletedEpisode }}集</span>
        </el-radio>

        <el-radio value="custom">
          <span class="radio-label">指定范围</span>
        </el-radio>
      </el-radio-group>

      <div v-if="checkRange === 'custom'" class="custom-range-inputs">
        <el-input-number
          v-model="customRangeStart"
          :min="1"
          :max="lastCompletedEpisode"
          controls-position="right"
        />
        <span class="range-separator">至</span>
        <el-input-number
          v-model="customRangeEnd"
          :min="customRangeStart"
          :max="lastCompletedEpisode"
          controls-position="right"
        />
        <el-tag type="info" size="small" class="range-tag">
          共 {{ customRangeEnd - customRangeStart + 1 }} 集
        </el-tag>
      </div>

      <el-alert
        v-if="completedCount < 3"
        type="warning"
        :closable="false"
        class="mt-3"
        show-icon
      >
        <template #title>
          建议至少完成3集后再进行整体检查，当前仅完成 {{ completedCount }} 集
        </template>
      </el-alert>
    </el-card>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <el-button
        type="primary"
        :icon="MagicStick"
        :disabled="completedCount < 3"
        @click="openOverallAIWorkflow"
      >
        启动整体诊断
      </el-button>

      <el-button
        :icon="Setting"
        @click="openTemplateManager"
      >
        自定义提示词模板
      </el-button>
    </div>

    <!-- 问题列表（按维度分组） -->
    <el-card v-if="issues.length > 0" class="issues-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Warning /></el-icon>
          <span>整体诊断结果</span>
          <el-tag type="danger" size="small" class="ml-2">
            发现 {{ issues.length }} 个问题
          </el-tag>
        </div>
      </template>

      <el-tabs type="border-card" v-model="activeDimensionTab">
        <el-tab-pane
          v-for="dimension in dimensions"
          :key="dimension.value"
          :name="dimension.value"
        >
          <template #label>
            <span>
              {{ dimension.label }}
              <el-badge
                v-if="getIssuesByDimension(dimension.value).length > 0"
                :value="getIssuesByDimension(dimension.value).length"
                type="danger"
                class="ml-1"
              />
            </span>
          </template>

          <div class="dimension-issues-container">
            <div
              v-for="(issue, index) in getIssuesByDimension(dimension.value)"
              :key="index"
              class="ai-issue-item"
              :class="{ 'ignored': issue.status === 'ignored' }"
            >
              <!-- 问题头部 -->
              <div class="ai-issue-header">
                <el-tag :type="getIssueSeverityType(issue.severity)" size="small">
                  {{ getIssueSeverityText(issue.severity) }}
                </el-tag>
                <span class="ai-issue-number">{{ index + 1 }}</span>
                <el-tag v-if="issue.status === 'ignored'" type="info" size="small" class="ml-2">
                  已忽略
                </el-tag>
                <el-tag
                  v-if="issue.status === 'solved' || issue.status === 'completed'"
                  type="success"
                  size="small"
                  class="ml-2"
                >
                  ✅ 已完成
                </el-tag>
              </div>

              <h4 class="ai-issue-title">{{ issue.title }}</h4>
              <p class="ai-issue-desc">{{ issue.description }}</p>

              <div class="ai-issue-location">
                <el-icon><Location /></el-icon>
                <span>位置：{{ getLocationText(issue.location) }}</span>
              </div>

              <!-- 操作按钮 -->
              <div class="ai-issue-actions">
                <template v-if="issue.status === 'ignored'">
                  <el-button type="success" size="small" @click="restoreIssue(issue)">
                    恢复问题
                  </el-button>
                </template>
                <template v-else-if="issue.status === 'solved' || issue.status === 'completed'">
                  <el-button type="primary" size="small" @click="viewSolution(issue)">
                    查看方案
                  </el-button>
                  <el-button size="small" @click="restoreIssue(issue)">
                    恢复待处理
                  </el-button>
                </template>
                <template v-else>
                  <el-button
                    type="primary"
                    size="small"
                    :loading="issue.generating"
                    @click="generateSolution(issue)"
                  >
                    {{ issue.generating ? '生成中...' : (issue.solution ? '查看方案' : '生成解决方案') }}
                  </el-button>
                  <el-button
                    v-if="issue.solution"
                    type="success"
                    size="small"
                    @click="markAsCompleted(issue)"
                  >
                    ✅ 标记为已完成
                  </el-button>
                  <el-button size="small" @click="ignoreIssue(issue)">
                    忽略此问题
                  </el-button>
                </template>
              </div>

              <el-divider v-if="index < getIssuesByDimension(dimension.value).length - 1" />
            </div>

            <!-- 空状态 -->
            <el-empty
              v-if="getIssuesByDimension(dimension.value).length === 0"
              description="此维度暂无问题"
              :image-size="100"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 空状态 -->
    <el-empty
      v-else
      description="暂无整体诊断结果，点击「启动整体诊断」开始检查"
      :image-size="120"
    >
      <el-button
        type="primary"
        :disabled="completedCount < 3"
        @click="openOverallAIWorkflow"
      >
        开始诊断
      </el-button>
    </el-empty>

    <!-- 外部AI工作流对话框（整体检查专用） -->
    <el-dialog
      v-model="showWorkflowDialog"
      title="整体诊断 - 外部AI工作流"
      width="900px"
      :close-on-click-modal="false"
      @close="handleWorkflowClose"
    >
      <!-- 步骤指示器 -->
      <el-steps :active="currentStep" align-center finish-status="success" class="mb-4">
        <el-step title="复制提示词" description="准备诊断材料" />
        <el-step title="外部AI诊断" description="使用Claude/GPT等AI" />
        <el-step title="导入结果" description="解析并保存问题" />
      </el-steps>

      <!-- 步骤内容 -->
      <div class="workflow-content">
        <!-- Step 1: 复制提示词和下载完整包 -->
        <div v-if="currentStep === 0" class="step-content">
          <el-alert
            title="第一步：准备诊断材料"
            type="info"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <p>请复制下方的诊断提示词，并下载完整创作包，然后前往外部AI（如Claude、ChatGPT）进行诊断。</p>
            </template>
          </el-alert>

          <div class="material-section">
            <div class="section-header">
              <h4>📋 诊断提示词</h4>
              <el-button
                type="primary"
                size="small"
                @click="copyPrompt"
              >
                复制提示词
              </el-button>
            </div>

            <el-input
              v-model="prompt"
              type="textarea"
              :rows="12"
              readonly
              class="prompt-textarea"
            />
          </div>

          <div class="material-section mt-4">
            <div class="section-header">
              <h4>📦 完整创作包</h4>
              <el-button
                type="success"
                size="small"
                @click="downloadPackage"
              >
                下载完整包
              </el-button>
            </div>

            <el-alert type="warning" :closable="false">
              <template #default>
                <p><strong>建议</strong>：下载完整包作为附件上传给AI，以提供更完整的上下文。</p>
                <p class="mt-1"><strong>注意</strong>：完整包包含所有已完成剧集的详细内容，文件较大。</p>
              </template>
            </el-alert>
          </div>
        </div>

        <!-- Step 2: 提示用户到外部AI执行 -->
        <div v-if="currentStep === 1" class="step-content">
          <el-alert
            title="第二步：在外部AI平台执行诊断"
            type="warning"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <p>请按照以下步骤操作：</p>
              <ol class="instruction-list">
                <li>打开外部AI平台（推荐：Claude 3.5 Sonnet、GPT-4、DeepSeek等）</li>
                <li>粘贴刚才复制的诊断提示词</li>
                <li>上传刚才下载的完整包文件</li>
                <li>发送消息，等待AI返回诊断结果</li>
                <li>复制AI返回的<strong>完整JSON数组</strong></li>
              </ol>
            </template>
          </el-alert>
        </div>

        <!-- Step 3: 导入AI结果 -->
        <div v-if="currentStep === 2" class="step-content">
          <el-alert
            title="第三步：导入AI诊断结果"
            type="success"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <p>请将AI返回的JSON数组粘贴到下方文本框中，系统会自动解析并导入问题列表。</p>
            </template>
          </el-alert>

          <el-form label-width="100px">
            <el-form-item label="AI诊断结果">
              <el-input
                v-model="aiResponseText"
                type="textarea"
                :rows="15"
                placeholder='请粘贴AI返回的JSON数组，格式如：[{"dimension": "主线一致性", "title": "...", ...}]'
                @input="parseAIResponse"
              />
            </el-form-item>

            <el-form-item v-if="parseError" label="解析状态">
              <el-alert type="error" :closable="false" :title="parseError" />
            </el-form-item>

            <el-form-item v-if="parsedIssues.length > 0" label="解析结果">
              <el-alert type="success" :closable="false">
                <template #default>
                  成功解析 {{ parsedIssues.length }} 个问题
                </template>
              </el-alert>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 底部按钮 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleWorkflowClose">取消</el-button>

          <div class="footer-right">
            <el-button
              v-if="currentStep > 0"
              @click="prevStep"
            >
              上一步
            </el-button>

            <el-button
              v-if="currentStep < 2"
              type="primary"
              @click="nextStep"
            >
              下一步
            </el-button>

            <el-button
              v-if="currentStep === 2"
              type="primary"
              :disabled="parsedIssues.length === 0"
              :loading="importing"
              @click="handleImport"
            >
              导入问题（{{ parsedIssues.length }}）
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 解决方案生成对话框 -->
    <el-dialog
      v-model="showSolutionDialog"
      title="生成解决方案 - 外部AI工作流"
      width="900px"
      :close-on-click-modal="false"
      @close="handleSolutionDialogClose"
    >
      <!-- 问题信息卡片 -->
      <el-card v-if="currentSolutionIssue" shadow="never" class="issue-info-card mb-4">
        <template #header>
          <div class="issue-header">
            <el-tag :type="getIssueSeverityType(currentSolutionIssue.severity)" size="small">
              {{ getIssueSeverityText(currentSolutionIssue.severity) }}
            </el-tag>
            <el-tag type="info" size="small" class="ml-2">{{ currentSolutionIssue.dimension }}</el-tag>
          </div>
        </template>
        <h4 class="issue-title">{{ currentSolutionIssue.title }}</h4>
        <p class="issue-desc">{{ currentSolutionIssue.description }}</p>
      </el-card>

      <!-- 步骤指示器 -->
      <el-steps :active="solutionDialogStep" align-center finish-status="success" class="mb-4">
        <el-step title="复制提示词" description="准备解决方案提示词" />
        <el-step title="外部AI生成" description="使用Claude/GPT生成方案" />
        <el-step title="导入方案" description="保存解决方案" />
      </el-steps>

      <!-- 步骤内容 -->
      <div class="solution-workflow-content">
        <!-- Step 0: 复制提示词 -->
        <div v-if="solutionDialogStep === 0" class="step-content">
          <el-alert
            title="第一步：复制解决方案提示词"
            type="info"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <p>请复制下方的提示词，然后前往外部AI（如Claude 3.5、GPT-4等）生成解决方案。</p>
            </template>
          </el-alert>

          <div class="material-section">
            <div class="section-header">
              <h4>📋 解决方案提示词</h4>
              <el-button
                type="primary"
                size="small"
                @click="copySolutionPrompt"
              >
                复制提示词
              </el-button>
            </div>

            <el-input
              v-model="solutionPromptText"
              type="textarea"
              :rows="14"
              readonly
              class="prompt-textarea"
            />
          </div>
        </div>

        <!-- Step 1: 提示用户到外部AI执行 -->
        <div v-if="solutionDialogStep === 1" class="step-content">
          <el-alert
            title="第二步：在外部AI平台生成解决方案"
            type="warning"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <p>请按照以下步骤操作：</p>
              <ol class="instruction-list">
                <li>打开外部AI平台（推荐：Claude 3.5 Sonnet、GPT-4、DeepSeek等）</li>
                <li>粘贴刚才复制的解决方案提示词</li>
                <li>发送消息，等待AI返回解决方案</li>
                <li>复制AI返回的<strong>完整文本</strong>（纯文本即可）</li>
              </ol>
            </template>
          </el-alert>

          <el-card shadow="never" class="ai-platforms-card">
            <template #header>
              <span>推荐的AI平台</span>
            </template>
            <div class="platforms-list">
              <div class="platform-item">
                <strong>Claude 3.5 Sonnet</strong>
                <span>推荐，擅长长文本生成和逻辑分析</span>
              </div>
              <div class="platform-item">
                <strong>GPT-4 / GPT-4o</strong>
                <span>综合能力强，创意丰富</span>
              </div>
              <div class="platform-item">
                <strong>DeepSeek</strong>
                <span>性价比高，适合中文内容</span>
              </div>
            </div>
          </el-card>
        </div>

        <!-- Step 2: 导入AI方案 -->
        <div v-if="solutionDialogStep === 2" class="step-content">
          <el-alert
            title="第三步：导入AI生成的解决方案"
            type="success"
            :closable="false"
            class="mb-4"
          >
            <template #default>
              <p>请将AI返回的解决方案粘贴到下方文本框中，系统会自动保存。</p>
            </template>
          </el-alert>

          <el-form label-width="100px">
            <el-form-item label="解决方案">
              <el-input
                v-model="solutionResponseText"
                type="textarea"
                :rows="15"
                placeholder="请粘贴AI生成的解决方案（纯文本）"
              />
              <div class="form-item-tips">
                <el-text size="small" type="info">提示：导入后可以直接编辑AI回答的内容，点击"保存方案"即可保存修改</el-text>
              </div>
            </el-form-item>

            <el-form-item v-if="solutionResponseText.trim()" label="预览">
              <div class="solution-preview">
                <p>{{ solutionResponseText.substring(0, 200) }}{{ solutionResponseText.length > 200 ? '...' : '' }}</p>
                <el-tag size="small" type="info">共 {{ solutionResponseText.length }} 字</el-tag>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 底部按钮 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleSolutionDialogClose">取消</el-button>

          <div class="footer-right">
            <el-button
              v-if="solutionDialogStep > 0"
              @click="solutionPrevStep"
            >
              上一步
            </el-button>

            <el-button
              v-if="solutionDialogStep < 2"
              type="primary"
              @click="solutionNextStep"
            >
              下一步
            </el-button>

            <el-button
              v-if="solutionDialogStep === 2"
              type="primary"
              :disabled="!solutionResponseText.trim()"
              :loading="savingSolution"
              @click="handleSaveSolution"
            >
              保存解决方案
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 解决方案查看对话框（双栏对比） -->
    <el-dialog
      v-model="showSolutionViewDialog"
      title="查看解决方案"
      width="1200px"
      :close-on-click-modal="false"
      @close="handleSolutionViewClose"
    >
      <div v-if="currentViewSolution" class="solution-view-container">
        <!-- 问题信息 -->
        <el-alert
          :title="currentViewSolution.issue.title"
          :description="currentViewSolution.issue.description"
          type="warning"
          :closable="false"
          class="mb-4"
        />

        <!-- 剧集选择器（如果有多个建议剧集） -->
        <div v-if="currentViewSolution.suggestedEpisodes.length > 1" class="episode-selector mb-4">
          <el-radio-group v-model="selectedEpisodeIndex" size="small">
            <el-radio-button
              v-for="(ep, index) in currentViewSolution.suggestedEpisodes"
              :key="index"
              :label="index"
            >
              第{{ ep.number }}集
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 双栏对比 -->
        <div class="solution-compare">
          <!-- 左侧：原剧集内容 -->
          <div class="solution-section">
            <div class="section-header">
              <h4>📝 原剧集内容</h4>
              <el-radio-group v-model="displayMode" size="small">
                <el-radio-button label="formatted">📄 格式化显示</el-radio-button>
                <el-radio-button label="json">🔧 JSON原始数据</el-radio-button>
              </el-radio-group>
            </div>
            <el-input
              :model-value="getOriginalEpisodeContent()"
              type="textarea"
              :rows="20"
              readonly
              class="content-textarea"
              :class="{ 'json-mode': displayMode === 'json' }"
            />
          </div>

          <!-- 右侧：AI建议内容 -->
          <div class="solution-section">
            <div class="section-header">
              <h4>✨ AI建议方案</h4>
              <div class="header-controls">
                <el-radio-group v-model="suggestionDisplayMode" size="small">
                  <el-radio-button label="formatted">📝 格式化显示</el-radio-button>
                  <el-radio-button label="json">🔧 JSON原始数据</el-radio-button>
                </el-radio-group>
                <div v-if="suggestionDisplayMode === 'json'" class="edit-controls">
                  <el-button
                    v-if="!isEditingSuggestion"
                    size="small"
                    type="primary"
                    @click="startEditingSuggestion"
                  >
                    编辑
                  </el-button>
                  <template v-else>
                    <el-button size="small" @click="cancelEditingSuggestion">取消</el-button>
                    <el-button size="small" type="warning" @click="restoreSuggestion">恢复原始</el-button>
                    <el-button size="small" type="success" @click="saveSuggestionEdit">保存</el-button>
                  </template>
                </div>
              </div>
            </div>
            <el-input
              v-model="editedSuggestionContent"
              type="textarea"
              :rows="20"
              :readonly="!isEditingSuggestion || suggestionDisplayMode !== 'json'"
              class="content-textarea suggested"
              :class="{ 'json-mode': suggestionDisplayMode === 'json', 'editing': isEditingSuggestion }"
            />
          </div>
        </div>

        <!-- 修改说明 -->
        <div class="solution-explanation">
          <h4>💡 修改说明</h4>
          <div v-if="currentSelectedEpisode && currentSelectedEpisode.修改说明" class="mb-3">
            <strong>本集修改要点：</strong>
            <p>{{ currentSelectedEpisode.修改说明 }}</p>
          </div>
          <div>
            <strong>整体方案说明：</strong>
            <p style="white-space: pre-wrap;">{{ currentViewSolution.explanation }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <el-button type="warning" @click="regenerateFromView">
            重新生成
          </el-button>
          <div>
            <el-button @click="showSolutionViewDialog = false">取消</el-button>
            <el-button type="primary" @click="confirmApplySolution">
              应用到剧集
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  MagicStick,
  Setting,
  DataAnalysis,
  Warning,
  Location
} from '@element-plus/icons-vue';
import {
  generateOverallCheckPrompt,
  generateOverallCreationPackage,
  downloadOverallPackage
} from '../utils/overallCheckPrompts';
import { saveAIDiagnosis } from '@/api/drama';

// Props
const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits(['update:issues', 'open-template-manager', 'generate-solution', 'view-solution']);

// 数据
const checkRange = ref('all'); // 'all' | 'custom'
const customRangeStart = ref(1);
const customRangeEnd = ref(1);
const issues = ref([]); // 整体诊断的问题列表
const showWorkflowDialog = ref(false);
const prompt = ref('');
const creationPackage = ref('');
const packageFilename = ref('');
const activeDimensionTab = ref('主线一致性');

// 诊断对话框状态
const currentStep = ref(0);
const aiResponseText = ref('');
const parsedIssues = ref([]);
const parseError = ref('');
const importing = ref(false);

// 解决方案生成对话框状态
const showSolutionDialog = ref(false);
const currentSolutionIssue = ref(null);
const solutionDialogStep = ref(0);
const solutionPromptText = ref('');
const solutionResponseText = ref('');
const savingSolution = ref(false);

// 解决方案查看对话框状态
const showSolutionViewDialog = ref(false);
const currentViewSolution = ref(null);
const selectedEpisodeIndex = ref(0);
const displayMode = ref('formatted'); // 'formatted' | 'json'
const suggestionDisplayMode = ref('formatted'); // 'formatted' | 'json'

// AI建议方案编辑状态
const isEditingSuggestion = ref(false); // 是否处于编辑模式
const editedSuggestionContent = ref(''); // 编辑中的内容
const originalSuggestionBackup = ref(null); // 原始内容备份（用于恢复）

// 维度列表
const dimensions = [
  { value: '主线一致性', label: '主线一致性' },
  { value: '角色弧光完整性', label: '角色弧光' },
  { value: '节奏把控', label: '节奏把控' },
  { value: '情感曲线', label: '情感曲线' },
  { value: '伏笔回收', label: '伏笔回收' },
  { value: '大纲一致性', label: '大纲一致性' },
  { value: '其他', label: '其他' }
];

// 计算属性
const completedEpisodes = computed(() => {
  if (!props.project.episodes) return [];

  return props.project.episodes
    .filter(ep => ep.status === 'completed' || ep.status === 'reviewed')
    .sort((a, b) => a.number - b.number);
});

const completedCount = computed(() => completedEpisodes.value.length);

const lastCompletedEpisode = computed(() => {
  return completedCount.value > 0
    ? completedEpisodes.value[completedCount.value - 1].number
    : 0;
});

const effectiveRange = computed(() => {
  if (checkRange.value === 'all') {
    return {
      start: completedCount.value > 0 ? 1 : 0,
      end: lastCompletedEpisode.value,
      episodes: completedEpisodes.value
    };
  } else {
    const filtered = completedEpisodes.value.filter(ep =>
      ep.number >= customRangeStart.value &&
      ep.number <= customRangeEnd.value
    );

    return {
      start: customRangeStart.value,
      end: customRangeEnd.value,
      episodes: filtered
    };
  }
});

// 初始化自定义范围
watch(lastCompletedEpisode, (newVal) => {
  if (newVal > 0) {
    customRangeEnd.value = newVal;
  }
}, { immediate: true });

// 从项目加载已有诊断结果
watch(() => props.project.aiDiagnosis?.overall?.issues, (newIssues) => {
  console.log('OverallCheck: 检测到项目数据变化', {
    newIssues,
    hasIssues: newIssues && Array.isArray(newIssues),
    length: newIssues?.length,
    fullPath: props.project.aiDiagnosis?.overall
  });

  if (newIssues && Array.isArray(newIssues) && newIssues.length > 0) {
    issues.value = newIssues;
    console.log('OverallCheck: 已加载问题列表', issues.value.length, '个问题');
  } else {
    issues.value = [];
    console.log('OverallCheck: 清空问题列表');
  }
}, { immediate: true, deep: true });

// 方法
const openOverallAIWorkflow = () => {
  if (completedCount.value < 3) {
    ElMessage.warning('建议至少完成3集后再进行整体检查');
    return;
  }

  const range = effectiveRange.value;

  if (range.episodes.length === 0) {
    ElMessage.warning('所选范围内没有已完成的剧集');
    return;
  }

  try {
    // 生成提示词
    prompt.value = generateOverallCheckPrompt(props.project, range);

    // 生成完整包
    creationPackage.value = generateOverallCreationPackage(props.project, range);

    // 生成文件名
    packageFilename.value = `${props.project.name || '未命名'}_整体诊断材料_第${range.start}-${range.end}集.md`;

    // 打开对话框
    showWorkflowDialog.value = true;
  } catch (error) {
    console.error('生成诊断材料失败:', error);
    ElMessage.error('生成失败：' + error.message);
  }
};

// 对话框方法
const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(prompt.value);
    ElMessage.success('提示词已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    ElMessage.error('复制失败，请手动复制');
  }
};

const downloadPackage = () => {
  try {
    if (!creationPackage.value) {
      ElMessage.error('完整包内容为空');
      return;
    }
    downloadOverallPackage(creationPackage.value, packageFilename.value);
    ElMessage.success('下载成功');
  } catch (error) {
    console.error('下载完整包失败:', error);
    ElMessage.error('下载完整包失败: ' + error.message);
  }
};

const nextStep = () => {
  if (currentStep.value < 2) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const handleWorkflowClose = () => {
  showWorkflowDialog.value = false;
  // 重置对话框状态
  currentStep.value = 0;
  aiResponseText.value = '';
  parsedIssues.value = [];
  parseError.value = '';
};

const parseAIResponse = () => {
  parseError.value = '';
  parsedIssues.value = [];

  if (!aiResponseText.value.trim()) {
    return;
  }

  try {
    // 尝试提取JSON数组（处理AI可能在前后添加的说明文字）
    let jsonText = aiResponseText.value.trim();

    // 尝试找到JSON数组的开始和结束
    const startIdx = jsonText.indexOf('[');
    const endIdx = jsonText.lastIndexOf(']');

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      throw new Error('未找到有效的JSON数组');
    }

    jsonText = jsonText.substring(startIdx, endIdx + 1);

    // 解析JSON
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new Error('数据不是数组格式');
    }

    // 验证每个问题的必需字段
    parsed.forEach((issue, index) => {
      if (!issue.dimension || !issue.title || !issue.description) {
        throw new Error(`第 ${index + 1} 个问题缺少必需字段（dimension, title, description）`);
      }

      // 设置默认值
      if (!issue.severity) {
        issue.severity = 'medium';
      }
      if (!issue.status) {
        issue.status = 'pending';
      }
      if (!issue.location) {
        issue.location = {};
      }
    });

    parsedIssues.value = parsed;
  } catch (error) {
    parseError.value = '解析失败：' + error.message;
    parsedIssues.value = [];
  }
};

const handleImport = async () => {
  if (parsedIssues.value.length === 0) {
    ElMessage.warning('请先粘贴AI诊断结果');
    return;
  }

  importing.value = true;

  try {
    // 保存到后端
    await saveAIDiagnosis(props.project._id, 'overall', parsedIssues.value);

    // 更新本地状态
    issues.value = parsedIssues.value;

    // 通知父组件
    emit('update:issues', parsedIssues.value);

    ElMessage.success(`成功导入 ${parsedIssues.value.length} 个问题`);

    // 关闭对话框
    handleWorkflowClose();
  } catch (error) {
    console.error('保存整体诊断结果失败:', error);
    ElMessage.error('保存失败：' + error.message);
  } finally {
    importing.value = false;
  }
};

const getIssuesByDimension = (dimension) => {
  return issues.value.filter(issue => issue.dimension === dimension);
};

const getIssueSeverityType = (severity) => {
  const map = {
    'critical': 'danger',
    'medium': 'warning',
    'low': 'info'
  };
  return map[severity] || 'info';
};

const getIssueSeverityText = (severity) => {
  const map = {
    'critical': '严重',
    'medium': '中等',
    'low': '轻微'
  };
  return map[severity] || severity;
};

const getLocationText = (location) => {
  if (!location) return '未知位置';

  const module = location.module || '';
  const field = location.field || '';

  return field || module || '未知位置';
};

const openTemplateManager = () => {
  emit('open-template-manager');
};

const generateSolution = async (issue) => {
  // 整体问题的解决方案生成：使用专用对话框
  if (issue.solution &&
      Array.isArray(issue.solution.suggestedEpisodes) &&
      issue.solution.suggestedEpisodes.length > 0 &&
      !issue.generating) {
    // 如果已有方案且有建议剧集（非空数组），显示对比对话框
    viewSolutionDialog(issue);
    return;
  }

  // 打开解决方案生成对话框
  currentSolutionIssue.value = issue;
  solutionPromptText.value = generateOverallSolutionPrompt(issue, props.project);
  solutionDialogStep.value = 0;
  solutionResponseText.value = '';
  showSolutionDialog.value = true;
};

// ========================================
// 解决方案对话框方法
// ========================================

const copySolutionPrompt = async () => {
  try {
    await navigator.clipboard.writeText(solutionPromptText.value);
    ElMessage.success('解决方案提示词已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    ElMessage.error('复制失败，请手动复制');
  }
};

const solutionNextStep = () => {
  if (solutionDialogStep.value < 2) {
    solutionDialogStep.value++;
  }
};

const solutionPrevStep = () => {
  if (solutionDialogStep.value > 0) {
    solutionDialogStep.value--;
  }
};

const handleSolutionDialogClose = () => {
  showSolutionDialog.value = false;
  // 重置对话框状态
  solutionDialogStep.value = 0;
  solutionResponseText.value = '';
  currentSolutionIssue.value = null;
  solutionPromptText.value = '';
};

const handleSaveSolution = async () => {
  if (!solutionResponseText.value.trim()) {
    ElMessage.warning('请输入解决方案');
    return;
  }

  if (!currentSolutionIssue.value) {
    ElMessage.error('问题信息丢失');
    return;
  }

  savingSolution.value = true;

  try {
    // 尝试解析JSON
    let solutionData;
    try {
      // 提取JSON对象
      let jsonText = solutionResponseText.value.trim();

      // 尝试找到JSON对象的开始和结束
      const startIdx = jsonText.indexOf('{');
      const endIdx = jsonText.lastIndexOf('}');

      if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
        throw new Error('未找到有效的JSON对象');
      }

      jsonText = jsonText.substring(startIdx, endIdx + 1);

      // 解析JSON
      solutionData = JSON.parse(jsonText);

      // 验证必需字段
      if (!solutionData.explanation) {
        throw new Error('缺少 explanation 字段');
      }
      if (!Array.isArray(solutionData.suggestedEpisodes)) {
        throw new Error('suggestedEpisodes 必须是数组');
      }

      console.log('✅ 解决方案JSON解析成功:', solutionData);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      ElMessage.error('解析失败：' + parseError.message + '。请确保粘贴的是有效的JSON格式');
      return;
    }

    // 保存解决方案到问题对象（包含JSON结构化数据）
    currentSolutionIssue.value.solution = {
      explanation: solutionData.explanation,
      suggestedEpisodes: solutionData.suggestedEpisodes,  // JSON数组
      generatedAt: new Date().toISOString()
    };

    // 保存到后端
    await saveAIDiagnosis(props.project._id, 'overall', issues.value);

    ElMessage.success(`解决方案已保存（包含 ${solutionData.suggestedEpisodes.length} 个剧集修改建议）`);

    // 关闭对话框
    handleSolutionDialogClose();
  } catch (error) {
    console.error('保存解决方案失败:', error);
    ElMessage.error('保存失败：' + error.message);
  } finally {
    savingSolution.value = false;
  }
};

// 生成整体问题解决方案的提示词
const generateOverallSolutionPrompt = (issue, project) => {
  // 获取涉及的剧集范围
  const locationText = getLocationText(issue.location);
  const affectedEpisodes = extractEpisodeNumbers(locationText);

  return `# 短剧整体问题解决方案

## 问题描述

**维度**: ${issue.dimension}
**严重程度**: ${getIssueSeverityText(issue.severity)}
**问题标题**: ${issue.title}
**详细描述**: ${issue.description}
**位置**: ${locationText}
**涉及剧集**: ${affectedEpisodes.length > 0 ? '第' + affectedEpisodes.join('、') + '集' : '全局'}

## 项目背景

- **项目名称**: ${project.name || '未命名'}
- **剧本类型**: ${project.type || '未指定'}
- **总集数**: ${project.episodeCount || 60}集
- **已完成**: ${completedEpisodes.value.length}集

## 任务要求

请作为专业短剧编剧，针对上述整体性问题，提供**可直接应用的修改方案**。

### ⚠️ 重要：输出格式要求

必须返回一个JSON对象，包含以下字段：

\`\`\`json
{
  "explanation": "解决方案的总体说明，尽可能详细地阐述问题分析、解决思路和修改要点",
  "suggestedEpisodes": [
    {
      "number": 1,
      "title": "第1集标题",
      "修改说明": "说明对本集的具体调整",
      "content": {
        "summary": "修改后的概要",
        "scenes": [
          {
            "number": 1,
            "location": "场景地点",
            "time": "时间",
            "atmosphere": "氛围",
            "content": "场景详细内容，符合短剧常规字数要求"
          }
        ],
        "keyDialogues": ["关键对白1", "关键对白2"],
        "cliffhanger": "结尾悬念",
        "notes": "备注"
      }
    }
  ]
}
\`\`\`

### 解决方案应包含：

1. **explanation** (必填)：
   - 问题分析：深入分析问题的根本原因
   - 解决思路：提出推荐方案及其理由
   - 修改要点：总结需要调整的关键点
   - 尽可能详细，充分说明

2. **suggestedEpisodes** (必填数组)：
   - 只包含**需要修改**的剧集
   - 每个剧集必须包含完整的 content 结构
   - 如果问题涉及多个剧集，请全部列出
   - 如果不需要修改具体剧集（纯理论建议），返回空数组 []

### 剧集内容要求：

- **summary**: 剧集概要，清晰简洁
- **scenes**: 场景数组，至少包含1个场景，每个场景包含：
  - number: 场景编号
  - location: 场景地点（如"办公室"、"咖啡厅"）
  - time: 时间（如"白天"、"夜晚"）
  - atmosphere: 氛围（如"紧张"、"温馨"）
  - content: 场景详细内容，符合短剧常规字数要求即可
- **keyDialogues**: 关键对白数组（可选）
- **cliffhanger**: 结尾悬念（可选）
- **notes**: 备注（可选）

### 输出要求：

1. **只输出JSON对象**，不要包含任何其他文本
2. **JSON格式规范**：确保双引号正确，content字段中如有对话，用单引号
3. **具体可执行**：建议的剧集内容应该具体、可直接使用
4. **保持原风格**：修改建议应该符合${project.type || ''}类型短剧的特点

现在请开始生成解决方案JSON。`;
};

// 从位置文本中提取剧集编号
const extractEpisodeNumbers = (locationText) => {
  if (!locationText) return [];

  const matches = locationText.match(/第(\d+)[-到至~](\d+)集/);
  if (matches) {
    // 范围：第X-Y集
    const start = parseInt(matches[1]);
    const end = parseInt(matches[2]);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  const singleMatch = locationText.match(/第(\d+)集/);
  if (singleMatch) {
    // 单集
    return [parseInt(singleMatch[1])];
  }

  return [];
};

// ========================================
// 解决方案查看对话框方法
// ========================================

const viewSolutionDialog = (issue) => {
  if (!issue.solution || !issue.solution.suggestedEpisodes) {
    ElMessage.warning('暂无解决方案');
    return;
  }

  // 准备对话框数据
  currentViewSolution.value = {
    issue,
    explanation: issue.solution.explanation,
    suggestedEpisodes: issue.solution.suggestedEpisodes
  };

  // 重置状态
  selectedEpisodeIndex.value = 0;
  displayMode.value = 'formatted';
  suggestionDisplayMode.value = 'formatted';
  isEditingSuggestion.value = false;

  // 初始化编辑内容和备份
  editedSuggestionContent.value = getSuggestedEpisodeContent();
  originalSuggestionBackup.value = JSON.parse(JSON.stringify(issue.solution.suggestedEpisodes));

  // 打开对话框
  showSolutionViewDialog.value = true;
};

// 当前选中的剧集
const currentSelectedEpisode = computed(() => {
  if (!currentViewSolution.value || !currentViewSolution.value.suggestedEpisodes) {
    return null;
  }
  return currentViewSolution.value.suggestedEpisodes[selectedEpisodeIndex.value];
});

// 获取原剧集内容
const getOriginalEpisodeContent = () => {
  if (!currentSelectedEpisode.value) return '';

  const episodeNumber = currentSelectedEpisode.value.number;
  const originalEpisode = props.project.episodes?.find(ep => ep.number === episodeNumber);

  if (!originalEpisode) {
    return `未找到第${episodeNumber}集的原始内容`;
  }

  if (displayMode.value === 'json') {
    // JSON模式：返回完整的episode对象
    return JSON.stringify(originalEpisode, null, 2);
  } else {
    // Formatted模式：格式化显示
    return formatEpisodeContent(originalEpisode);
  }
};

// 获取AI建议剧集内容
const getSuggestedEpisodeContent = () => {
  if (!currentSelectedEpisode.value) return '';

  if (suggestionDisplayMode.value === 'json') {
    // JSON模式：返回完整的建议剧集对象
    return JSON.stringify(currentSelectedEpisode.value, null, 2);
  } else {
    // Formatted模式：格式化显示
    return formatEpisodeContent(currentSelectedEpisode.value);
  }
};

// 监听显示模式和选中剧集变化，更新编辑内容
watch([suggestionDisplayMode, selectedEpisodeIndex], () => {
  if (!isEditingSuggestion.value) {
    editedSuggestionContent.value = getSuggestedEpisodeContent();
  }
});

// 开始编辑AI建议
const startEditingSuggestion = () => {
  if (suggestionDisplayMode.value !== 'json') {
    ElMessage.warning('只能在JSON模式下编辑');
    return;
  }

  // 进入编辑模式，内容已经在editedSuggestionContent中
  isEditingSuggestion.value = true;
  ElMessage.info('进入编辑模式，修改后请点击"保存"');
};

// 取消编辑
const cancelEditingSuggestion = () => {
  isEditingSuggestion.value = false;
  // 恢复到当前剧集的原始内容
  editedSuggestionContent.value = getSuggestedEpisodeContent();
  ElMessage.info('已取消编辑');
};

// 恢复原始内容
const restoreSuggestion = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复到最初的AI建议内容吗？当前的所有修改将丢失。',
      '确认恢复',
      {
        confirmButtonText: '确认恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 从备份恢复
    if (originalSuggestionBackup.value && currentSelectedEpisode.value) {
      const originalEpisode = originalSuggestionBackup.value.find(
        ep => ep.number === currentSelectedEpisode.value.number
      );

      if (originalEpisode) {
        editedSuggestionContent.value = JSON.stringify(originalEpisode, null, 2);
        ElMessage.success('已恢复到原始内容');
      } else {
        ElMessage.error('未找到原始内容');
      }
    }
  } catch (error) {
    // 用户取消
  }
};

// 保存编辑
const saveSuggestionEdit = async () => {
  try {
    // 解析JSON
    const editedEpisode = JSON.parse(editedSuggestionContent.value);

    // 验证必需字段
    if (!editedEpisode.number || !editedEpisode.content) {
      throw new Error('剧集数据缺少必需字段（number, content）');
    }

    // 更新当前选中的剧集
    const index = selectedEpisodeIndex.value;
    currentViewSolution.value.suggestedEpisodes[index] = editedEpisode;

    // 保存到后端
    currentViewSolution.value.issue.solution.suggestedEpisodes = currentViewSolution.value.suggestedEpisodes;
    await saveAIDiagnosis(props.project._id, 'overall', issues.value);

    ElMessage.success('修改已保存');
    isEditingSuggestion.value = false;
  } catch (error) {
    console.error('保存失败:', error);
    if (error instanceof SyntaxError) {
      ElMessage.error('JSON格式错误，请检查语法');
    } else {
      ElMessage.error('保存失败：' + error.message);
    }
  }
};

// 格式化剧集内容为人类可读文本
const formatEpisodeContent = (episode) => {
  if (!episode) return '';

  let text = `第${episode.number}集`;
  if (episode.title) {
    text += `：${episode.title}`;
  }
  text += '\n\n';

  if (episode.content) {
    // 概要
    if (episode.content.summary) {
      text += `【概要】\n${episode.content.summary}\n\n`;
    }

    // 场景
    if (episode.content.scenes && episode.content.scenes.length > 0) {
      text += `【场景列表】\n`;
      episode.content.scenes.forEach((scene, index) => {
        text += `\n场景${scene.number || index + 1}`;
        if (scene.location) {
          text += `：${scene.location}`;
        }
        text += '\n';

        if (scene.time) {
          text += `时间：${scene.time}\n`;
        }
        if (scene.atmosphere) {
          text += `氛围：${scene.atmosphere}\n`;
        }
        if (scene.content) {
          text += `\n${scene.content}\n`;
        }
      });
      text += '\n';
    } else if (episode.content.script) {
      text += `【剧本内容】\n${episode.content.script}\n\n`;
    }

    // 关键对白
    if (episode.content.keyDialogues && episode.content.keyDialogues.length > 0) {
      text += `【关键对白】\n`;
      episode.content.keyDialogues.forEach((dialogue, index) => {
        text += `${index + 1}. ${dialogue}\n`;
      });
      text += '\n';
    }

    // 结尾悬念
    if (episode.content.cliffhanger) {
      text += `【结尾悬念】\n${episode.content.cliffhanger}\n\n`;
    }

    // 备注
    if (episode.content.notes) {
      text += `【备注】\n${episode.content.notes}\n`;
    }
  }

  return text;
};

const handleSolutionViewClose = () => {
  showSolutionViewDialog.value = false;
  currentViewSolution.value = null;
  selectedEpisodeIndex.value = 0;
};

const regenerateFromView = () => {
  if (!currentViewSolution.value) return;

  // 关闭查看对话框
  handleSolutionViewClose();

  // 重新打开生成对话框
  generateSolution(currentViewSolution.value.issue);
};

const confirmApplySolution = async () => {
  if (!currentViewSolution.value || !currentSelectedEpisode.value) {
    ElMessage.error('未选择剧集');
    return;
  }

  try {
    const episodeNumber = currentSelectedEpisode.value.number;
    const suggestedContent = currentSelectedEpisode.value.content;

    await ElMessageBox.confirm(
      `确定要将AI建议方案应用到第${episodeNumber}集吗？原剧集内容将被覆盖。`,
      '确认替换',
      {
        confirmButtonText: '确认替换',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 找到目标剧集
    const targetEpisode = props.project.episodes.find(ep => ep.number === episodeNumber);
    if (!targetEpisode) {
      throw new Error(`未找到第${episodeNumber}集`);
    }

    // 替换content和title（如果AI建议中包含新标题）
    targetEpisode.content = suggestedContent;
    if (currentSelectedEpisode.value.title) {
      targetEpisode.title = currentSelectedEpisode.value.title;
    }

    // 通知父组件保存
    emit('content-updated', {
      field: 'episodes',
      value: props.project.episodes
    });

    ElMessage.success(`第${episodeNumber}集已应用AI建议方案`);

    // 不自动标记为完成，等待用户手动标记
    // （因为可能有多个剧集需要修改）

    // 关闭对话框
    handleSolutionViewClose();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('应用解决方案失败:', error);
      ElMessage.error('应用失败：' + error.message);
    }
  }
};

// 兼容旧版本的viewSolution（纯文本方案）
const viewSolution = (issue) => {
  if (issue.solution &&
      Array.isArray(issue.solution.suggestedEpisodes) &&
      issue.solution.suggestedEpisodes.length > 0) {
    // 新版本：有结构化数据（非空数组），使用对比对话框
    viewSolutionDialog(issue);
    return;
  }

  // 旧版本：纯文本方案，使用简单对话框
  if (!issue.solution || !issue.solution.explanation) {
    ElMessage.warning('暂无解决方案');
    return;
  }

  const htmlContent = `
    <div style="max-height: 500px; overflow-y: auto; padding: 10px;">
      <div style="background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <span style="display: inline-block; padding: 4px 12px; background: ${issue.severity === 'critical' ? '#f56c6c' : issue.severity === 'medium' ? '#e6a23c' : '#909399'}; color: white; border-radius: 4px; font-size: 12px;">
            ${getIssueSeverityText(issue.severity)}
          </span>
          <span style="display: inline-block; padding: 4px 12px; background: #409eff; color: white; border-radius: 4px; font-size: 12px;">
            ${issue.dimension}
          </span>
        </div>
        <h4 style="margin: 8px 0; color: #303133;">${issue.title}</h4>
        <p style="margin: 0; color: #606266; font-size: 13px;">${issue.description}</p>
      </div>
      <div style="white-space: pre-wrap; line-height: 1.8; color: #303133; font-size: 14px;">
        ${issue.solution.explanation}
      </div>
      ${issue.solution.generatedAt ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dcdfe6; color: #909399; font-size: 12px;">
          生成时间：${new Date(issue.solution.generatedAt).toLocaleString('zh-CN')}
        </div>
      ` : ''}
    </div>
  `;

  ElMessageBox({
    title: '查看解决方案',
    message: htmlContent,
    dangerouslyUseHTMLString: true,
    confirmButtonText: '关闭',
    type: 'success',
    customStyle: {
      width: '750px'
    }
  });
};

const markAsCompleted = async (issue) => {
  try {
    await ElMessageBox.confirm(
      '确定将此问题标记为已完成吗？',
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    );

    // 更新状态
    issue.status = 'completed';

    // 保存到后端
    await saveAIDiagnosis(props.project._id, 'overall', issues.value);

    ElMessage.success('已标记为完成');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记完成失败:', error);
      ElMessage.error('操作失败');
    }
  }
};

const ignoreIssue = async (issue) => {
  try {
    await ElMessageBox.confirm(
      '确定忽略此问题吗？',
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 更新状态
    issue.status = 'ignored';

    // 保存到后端
    await saveAIDiagnosis(props.project._id, 'overall', issues.value);

    ElMessage.success('已忽略此问题');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('忽略问题失败:', error);
      ElMessage.error('操作失败');
    }
  }
};

const restoreIssue = async (issue) => {
  try {
    // 恢复为待处理状态
    issue.status = 'pending';

    // 保存到后端
    await saveAIDiagnosis(props.project._id, 'overall', issues.value);

    ElMessage.success('已恢复问题');
  } catch (error) {
    console.error('恢复问题失败:', error);
    ElMessage.error('操作失败');
  }
};

// 暴露方法供父组件调用
defineExpose({
  openOverallAIWorkflow
});
</script>

<style scoped lang="scss">
.overall-check {
  .range-selector-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    .range-info {
      margin-bottom: 20px;
    }

    .range-options {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin: 20px 0;

      .radio-label {
        font-weight: 500;
        margin-right: 10px;
      }

      .range-hint {
        color: var(--el-text-color-secondary);
        font-size: 13px;
        margin-left: 8px;
      }
    }

    .custom-range-inputs {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 15px;
      padding-left: 30px;

      .range-separator {
        color: var(--el-text-color-secondary);
      }

      .range-tag {
        margin-left: 8px;
      }
    }
  }

  .action-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .issues-card {
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;

      .ml-2 {
        margin-left: 8px;
      }
    }

    .dimension-issues-container {
      padding: 20px 0;
    }

    .ai-issue-item {
      padding: 20px;
      background: var(--el-fill-color-lighter);
      border-radius: 8px;
      margin-bottom: 16px;
      transition: all 0.3s ease;

      &:last-child {
        margin-bottom: 0;
      }

      &.ignored {
        opacity: 0.6;
        background: var(--el-fill-color-light);
      }

      &:hover:not(.ignored) {
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      }

      .ai-issue-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;

        .ai-issue-number {
          font-size: 14px;
          color: var(--el-text-color-secondary);
          font-weight: 500;
        }

        .ml-2 {
          margin-left: 8px;
        }
      }

      .ai-issue-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin: 0 0 12px 0;
      }

      .ai-issue-desc {
        font-size: 14px;
        color: var(--el-text-color-regular);
        line-height: 1.6;
        margin: 0 0 12px 0;
      }

      .ai-issue-location {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
        margin-bottom: 16px;
      }

      .ai-issue-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
    }
  }

  .mt-3 {
    margin-top: 16px;
  }

  .ml-1 {
    margin-left: 4px;
  }

  .ml-2 {
    margin-left: 8px;
  }

  // 对话框样式
  .workflow-content {
    .step-content {
      min-height: 400px;
    }

    .mb-4 {
      margin-bottom: 16px;
    }

    .mt-4 {
      margin-top: 16px;
    }

    .material-section {
      margin-bottom: 20px;

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
      }

      .prompt-textarea {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
      }
    }

    .instruction-list {
      margin: 8px 0;
      padding-left: 24px;

      li {
        margin: 8px 0;
        line-height: 1.6;
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footer-right {
      display: flex;
      gap: 10px;
    }
  }

  // 解决方案对话框样式
  .issue-info-card {
    background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
    border: 1px solid #e4e7ed;

    .issue-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .issue-title {
      margin: 12px 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .issue-desc {
      margin: 0;
      font-size: 14px;
      color: var(--el-text-color-regular);
      line-height: 1.6;
    }
  }

  .solution-workflow-content {
    .step-content {
      min-height: 350px;
    }

    .ai-platforms-card {
      margin-top: 16px;

      .platforms-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .platform-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 6px;
        transition: all 0.3s;

        &:hover {
          background: #ecf5ff;
          transform: translateX(4px);
        }

        strong {
          color: var(--el-text-color-primary);
          font-size: 14px;
        }

        span {
          color: var(--el-text-color-secondary);
          font-size: 13px;
        }
      }
    }

    .solution-preview {
      padding: 12px;
      background: #f5f7fa;
      border-radius: 6px;
      border: 1px solid #e4e7ed;

      p {
        margin: 0 0 8px 0;
        color: var(--el-text-color-regular);
        font-size: 13px;
        line-height: 1.6;
      }
    }
  }

  // 解决方案查看对话框样式
  .solution-view-container {
    .mb-3 {
      margin-bottom: 12px;
    }

    .mb-4 {
      margin-bottom: 16px;
    }

    .episode-selector {
      text-align: center;
    }

    .solution-compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;

      .solution-section {
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          h4 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
          }

          .header-controls {
            display: flex;
            align-items: center;
            gap: 12px;

            .edit-controls {
              display: flex;
              gap: 8px;
            }
          }
        }

        .content-textarea {
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.6;

          &.json-mode {
            font-size: 12px;
            color: #2c3e50;
          }

          &.suggested {
            background: #f0f9ff;
          }

          &.editing {
            background: #fffbeb;
            border-color: #fbbf24;

            &:focus {
              border-color: #f59e0b;
              box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
            }
          }
        }
      }
    }

    .solution-explanation {
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;
      border: 1px solid #e4e7ed;

      h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
      }

      p {
        margin: 4px 0;
        line-height: 1.8;
        color: var(--el-text-color-regular);
      }

      strong {
        color: var(--el-text-color-primary);
      }
    }
  }
}
</style>
