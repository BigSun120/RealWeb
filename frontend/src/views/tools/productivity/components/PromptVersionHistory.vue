<template>
  <div class="prompt-version-history">
    <el-card v-loading="loading">
      <!-- 头部 -->
      <template #header>
        <div class="version-header">
          <div class="header-title">
            <i class="el-icon-time"></i>
            <span>版本历史</span>
          </div>
          <div class="header-actions">
            <el-tag type="success" size="small" class="mr-8">
              当前版本：{{ currentVersion }}
            </el-tag>
            <el-button
              type="primary"
              size="small"
              :disabled="selectedForCompare.length !== 2"
              @click="showPairDiff()"
            >
              对比选中版本
            </el-button>
          </div>
        </div>
      </template>

      <!-- 版本时间轴 -->
      <el-timeline v-if="versions.length > 0">
        <el-timeline-item
          v-for="version in versions"
          :key="version._id"
          :timestamp="formatTime(version.createdAt)"
          placement="top"
          :color="isCurrentVersion(version.version) ? '#67C23A' : '#409EFF'"
        >
          <el-card class="version-card" shadow="hover">
            <!-- 版本头部 -->
            <div class="version-card-header">
<div class="version-info">
                <el-checkbox
                  v-if="!isCurrentVersion(version.version)"
                  :model-value="isSelected(version._id)"
                  @change="(val)=>toggleSelect(version._id,val)"
                  size="small"
                  class="select-checkbox"
                />
                <el-tag
                  :type="isCurrentVersion(version.version) ? 'success' : 'info'"
                  size="small"
                >
                  v{{ version.version }}
                </el-tag>
                <span class="version-title">{{ version.title }}</span>
              </div>
              <div class="version-actions">
                <el-button
                  type="text"
                  size="small"
                  @click="toggleVersionDetail(version._id)"
                >
                  {{ expandedVersions.has(version._id) ? '收起' : '展开' }}
                  <i :class="expandedVersions.has(version._id) ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                </el-button>
                <el-button
                  v-if="!isCurrentVersion(version.version)"
                  type="primary"
                  size="small"
                  @click="handleRestore(version)"
                >
                  <i class="el-icon-refresh-left"></i>
                  恢复此版本
                </el-button>
              </div>
            </div>

            <!-- 版本元信息 -->
            <div class="version-meta">
              <div class="meta-item">
                <el-avatar
                  :size="24"
                  :src="version.createdBy?.avatar"
                  icon="el-icon-user"
                />
                <span class="meta-text">{{ version.createdBy?.username || '未知用户' }}</span>
              </div>
              <div class="meta-item">
                <i class="el-icon-edit-outline"></i>
                <span class="meta-text">{{ version.changeLog || '无更新说明' }}</span>
              </div>
            </div>

            <!-- 展开的详细内容 -->
            <div v-if="expandedVersions.has(version._id)" class="version-details">
              <el-divider></el-divider>

              <!-- 标题 -->
              <div class="detail-section">
                <div class="detail-label">标题：</div>
                <div class="detail-content">{{ version.title }}</div>
              </div>

              <!-- 描述 -->
              <div v-if="version.description" class="detail-section">
                <div class="detail-label">描述：</div>
                <div class="detail-content">{{ version.description }}</div>
              </div>

              <!-- 内容 -->
              <div class="detail-section">
                <div class="detail-label">
                  内容：
                  <el-button
                    v-if="!isCurrentVersion(version.version)"
                    type="text"
                    size="small"
                    @click="showDiff(version)"
                  >
                    <i class="el-icon-view"></i>
                    对比差异
                  </el-button>
                </div>
                <div class="detail-content content-preview">
                  <pre>{{ version.content }}</pre>
                </div>
              </div>

              <!-- 变量 -->
              <div v-if="version.variables && version.variables.length > 0" class="detail-section">
                <div class="detail-label">变量（{{ version.variables.length }}个）：</div>
                <div class="detail-content">
                  <el-tag
                    v-for="(variable, idx) in version.variables"
                    :key="idx"
                    size="small"
                    class="variable-tag"
                  >
                    {{ variable.name }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- 空状态 -->
      <el-empty v-else description="暂无版本历史"></el-empty>
    </el-card>

    <!-- 差异对比对话框 -->
    <el-dialog
      title="版本差异对比"
      v-model="diffDialogVisible"
      width="80%"
      :close-on-click-modal="false"
    >
      <div class="diff-container">
        <div class="diff-header">
          <div class="diff-version-label">
            <el-tag type="success" size="small">v{{ leftVersionLabel }}</el-tag>
          </div>
          <div class="diff-version-label">
            <el-tag type="info" size="small">v{{ rightVersionLabel }}</el-tag>
          </div>
        </div>
        
        <div class="diff-content">
          <!-- 标题差异 -->
          <div v-if="diffData.title" class="diff-section">
            <div class="diff-label">标题变化：</div>
            <div class="diff-comparison">
              <div class="diff-left">
                <div class="diff-text" v-html="diffData.title.currentHtml"></div>
              </div>
              <div class="diff-right">
                <div class="diff-text deleted" v-html="diffData.title.oldHtml"></div>
              </div>
            </div>
          </div>

          <!-- 内容差异 -->
          <div class="diff-section">
            <div class="diff-label">内容变化：</div>
            <div class="diff-comparison">
              <div class="diff-left">
                <div class="diff-text-area">
                  <div class="diff-html" v-html="diffData.content.currentHtml"></div>
                </div>
              </div>
              <div class="diff-right">
                <div class="diff-text-area deleted">
                  <div class="diff-html" v-html="diffData.content.oldHtml"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 变量差异 -->
          <div v-if="diffData.variables" class="diff-section">
            <div class="diff-label">变量变化：</div>
            <div class="diff-comparison">
              <div class="diff-left">
                <el-tag
                  v-for="(variable, idx) in diffData.variables.current"
                  :key="idx"
                  size="small"
                  class="variable-tag"
                >
                  {{ variable.name }}
                </el-tag>
              </div>
              <div class="diff-right">
                <el-tag
                  v-for="(variable, idx) in diffData.variables.old"
                  :key="idx"
                  size="small"
                  type="info"
                  class="variable-tag"
                >
                  {{ variable.name }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed, inject } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  name: 'PromptVersionHistory',
  props: {
    promptId: {
      type: String,
      required: true
    }
  },
  emits: ['version-restored'],
  setup(props, { emit }) {
    const promptService = inject('promptService');
    
    const loading = ref(false);
    const versions = ref([]);
    const currentVersion = ref('');
    const expandedVersions = ref(new Set());
    const diffDialogVisible = ref(false);
    const selectedVersion = ref(null);
    const currentPrompt = ref(null);

    // 比较模式与选择
    const selectedForCompare = ref([]); // 最多两个versionId

    const diffData = reactive({
      title: null,
      content: { currentHtml: '', oldHtml: '' },
      variables: null
    });

    const ensureCurrentPromptLoaded = async () => {
      if (currentPrompt.value) return;
      try {
        const promptResponse = await promptService.getPromptById(props.promptId);
        if (promptResponse && promptResponse.code === 200) {
          currentPrompt.value = promptResponse.data;
        } else {
          currentPrompt.value = promptResponse; // 直接是数据对象
        }
      } catch (e) {
        console.error('获取当前提示词失败:', e);
      }
    };

    // 加载版本历史
    const loadVersionHistory = async () => {
      loading.value = true;
      try {
        const response = await promptService.getVersionHistory(props.promptId);
        if (response.code === 200) {
          versions.value = response.data.versions;
          currentVersion.value = response.data.currentVersion;
          await ensureCurrentPromptLoaded();
        }
      } catch (error) {
        console.error('加载版本历史失败:', error);
        ElMessage.error('加载版本历史失败');
      } finally {
        loading.value = false;
      }
    };

    // 判断是否为当前版本
    const isCurrentVersion = (version) => {
      return version === currentVersion.value;
    };

    // 切换版本详情展开/收起
    const toggleVersionDetail = (versionId) => {
      if (expandedVersions.value.has(versionId)) {
        expandedVersions.value.delete(versionId);
      } else {
        expandedVersions.value.add(versionId);
      }
      // 触发响应式更新
      expandedVersions.value = new Set(expandedVersions.value);
    };

    // 格式化时间
    const formatTime = (time) => {
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;
      
      // 小于1分钟
      if (diff < 60000) {
        return '刚刚';
      }
      // 小于1小时
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`;
      }
      // 小于1天
      if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`;
      }
      // 小于7天
      if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)}天前`;
      }
      
      // 超过7天，显示具体日期
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // 辅助：获取版本详情（若服务支持），否则从列表中取
    const getVersionDetail = async (versionId) => {
      if (typeof promptService.getVersionDetail === 'function') {
        try {
          const resp = await promptService.getVersionDetail(props.promptId, versionId);
          if (resp && resp.code === 200) return resp.data;
        } catch (e) { /* 忽略 */ }
      }
      return versions.value.find(v => v._id === versionId) || null;
    };

    // 简易LCS实现（用于行级和词级）
    const lcsMatrix = (a, b) => {
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
      return dp;
    };
    const backtrackDiff = (dp, a, b) => {
      let i = a.length, j = b.length;
      const ops = [];
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
          ops.push({ type: 'equal', value: a[i - 1] });
          i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          ops.push({ type: 'insert', value: b[j - 1] });
          j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
          ops.push({ type: 'delete', value: a[i - 1] });
          i--;
        }
      }
      return ops.reverse();
    };
    const escapeHtml = (s) => (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 词级对比（用于单行）
    const diffWordsHtml = (leftLine, rightLine) => {
      const a = (leftLine || '').split(/(\s+)/);
      const b = (rightLine || '').split(/(\s+)/);
      const dp = lcsMatrix(a, b);
      const ops = backtrackDiff(dp, a, b);
      let leftHtml = '', rightHtml = '';
      for (const op of ops) {
        if (op.type === 'equal') {
          const token = escapeHtml(op.value);
          leftHtml += token; rightHtml += token;
        } else if (op.type === 'insert') {
          rightHtml += `<ins class="diff-ins">${escapeHtml(op.value)}</ins>`;
        } else if (op.type === 'delete') {
          leftHtml += `<del class="diff-del">${escapeHtml(op.value)}</del>`;
        }
      }
      return { leftHtml, rightHtml };
    };

    // 行级+词级
    const diffTextToHtml = (left, right) => {
      const leftLines = (left || '').split(/\r?\n/);
      const rightLines = (right || '').split(/\r?\n/);
      const dp = lcsMatrix(leftLines, rightLines);
      const ops = backtrackDiff(dp, leftLines, rightLines);
      let leftHtml = '', rightHtml = '';
      const showLine = (s) => (s === '' ? '&nbsp;' : s);
      for (const op of ops) {
        if (op.type === 'equal') {
          const esc = escapeHtml(op.value);
          leftHtml += `${esc}<br/>`; rightHtml += `${esc}<br/>`;
        } else if (op.type === 'insert') {
          const { rightHtml: rh } = diffWordsHtml('', op.value);
          leftHtml += `${showLine('')}<br/>`;
          rightHtml += `<span class="line-ins">${showLine(rh)}</span><br/>`;
        } else if (op.type === 'delete') {
          const { leftHtml: lh } = diffWordsHtml(op.value, '');
          leftHtml += `<span class="line-del">${showLine(lh)}</span><br/>`;
          rightHtml += `${showLine('')}<br/>`;
        }
      }
      return { leftHtml, rightHtml };
    };

    const buildDiff = (leftObj, rightObj) => {
      // 标题
      if ((leftObj.title || '') !== (rightObj.title || '')) {
        const { leftHtml, rightHtml } = diffWordsHtml(leftObj.title || '', rightObj.title || '');
        diffData.title = { currentHtml: leftHtml, oldHtml: rightHtml };
      } else {
        const esc = escapeHtml(leftObj.title || '');
        diffData.title = { currentHtml: esc, oldHtml: esc };
      }
      // 内容
      const { leftHtml, rightHtml } = diffTextToHtml(leftObj.content || '', rightObj.content || '');
      diffData.content.currentHtml = leftHtml;
      diffData.content.oldHtml = rightHtml;
      // 变量
      const leftVars = leftObj.variables || [];
      const rightVars = rightObj.variables || [];
      if (JSON.stringify(leftVars) !== JSON.stringify(rightVars)) {
        diffData.variables = { current: leftVars, old: rightVars };
      } else {
        diffData.variables = null;
      }
    };

    // 单版本与当前版本对比
    const showDiff = async (version) => {
      await ensureCurrentPromptLoaded();
      if (!currentPrompt.value) {
        ElMessage.warning('无法获取当前版本信息');
        return;
      }
      selectedVersion.value = version;
      buildDiff(currentPrompt.value, version);
      diffDialogVisible.value = true;
    };

    // 勾选对比
    const isSelected = (id) => selectedForCompare.value.includes(id);
    const toggleSelect = (id, val) => {
      const set = new Set(selectedForCompare.value);
      if (val) set.add(id); else set.delete(id);
      const arr = Array.from(set);
      if (arr.length > 2) arr.shift();
      selectedForCompare.value = arr;
    };

    // 对比选中的两个版本
    const showPairDiff = async () => {
      if (selectedForCompare.value.length !== 2) return;
      const [leftId, rightId] = selectedForCompare.value;
      const left = await getVersionDetail(leftId);
      const right = await getVersionDetail(rightId);
      if (!left || !right) {
        ElMessage.error('无法获取选中版本详情');
        return;
      }
      selectedVersion.value = left;
      buildDiff(left, right);
      diffDialogVisible.value = true;
    };

    const leftVersionLabel = computed(() => {
      if (selectedForCompare.value.length === 2) {
        const left = versions.value.find(v => v._id === selectedForCompare.value[0]);
        return left?.version || '';
      }
      return currentVersion.value || '';
    });

    const rightVersionLabel = computed(() => {
      if (selectedForCompare.value.length === 2) {
        const right = versions.value.find(v => v._id === selectedForCompare.value[1]);
        return right?.version || '';
      }
      return selectedVersion.value?.version || '';
    });

    // 恢复版本
    const handleRestore = async (version) => {
      try {
        await ElMessageBox.confirm(
          `确定要恢复到版本 ${version.version} 吗？当前内容将被保存为新版本。`,
          '恢复版本确认',
          {
            confirmButtonText: '确定恢复',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        loading.value = true;
        const response = await promptService.restoreVersion(props.promptId, version._id);
        
        if (response.code === 200) {
          ElMessage.success('版本恢复成功');
          emit('version-restored', response.data);
          await loadVersionHistory();
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('恢复版本失败:', error);
          ElMessage.error('恢复版本失败');
        }
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadVersionHistory();
    });

    return {
      loading,
      versions,
      currentVersion,
      expandedVersions,
      diffDialogVisible,
      selectedVersion,
      currentPrompt,
      diffData,
      selectedForCompare,
      isCurrentVersion,
      isSelected,
      toggleSelect,
      toggleVersionDetail,
      formatTime,
      showDiff,
      showPairDiff,
      leftVersionLabel,
      rightVersionLabel,
      handleRestore
    };
  }
};
</script>

<style scoped lang="scss">
.prompt-version-history {
  .version-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;

      i {
        font-size: 20px;
        color: #409EFF;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .mr-8 { margin-right: 8px; }
    }
  }

  .version-card {
    margin-top: 8px;

    .version-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .version-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .select-checkbox {
          margin-right: 6px;
        }

        .version-title {
          font-size: 15px;
          font-weight: 500;
          color: #303133;
        }
      }

      .version-actions {
        display: flex;
        gap: 8px;
      }
    }

    .version-meta {
      display: flex;
      gap: 24px;
      color: #606266;
      font-size: 13px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;

        .meta-text {
          line-height: 1;
        }
      }
    }

    .version-details {
      margin-top: 16px;

      .detail-section {
        margin-bottom: 16px;

        &:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #606266;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .detail-content {
          color: #303133;
          font-size: 14px;
          line-height: 1.6;

          &.content-preview {
            max-height: 300px;
            overflow-y: auto;
            background: #f5f7fa;
            border-radius: 4px;
            padding: 12px;

            pre {
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
              font-size: 13px;
              line-height: 1.5;
            }
          }

          .variable-tag {
            margin-right: 8px;
            margin-bottom: 8px;
          }
        }
      }
    }
  }

  // 差异对比样式
  .diff-container {
    .diff-header {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #EBEEF5;

      .diff-version-label {
        font-size: 14px;
        font-weight: 600;
      }
    }

    .diff-content {
      .diff-section {
        margin-bottom: 24px;

.diff-label {
          font-weight: 600;
          color: #606266;
          margin-bottom: 12px;
          font-size: 14px;
        }

        /* 行/词级高亮样式 */
        .diff-ins { background: #e6ffed; color: #22863a; text-decoration: none; }
        .diff-del { background: #ffeef0; color: #b31d28; text-decoration: line-through; }
        .line-ins { background: #f0fff4; display: inline; }
        .line-del { background: #fff5f5; display: inline; }

        .diff-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;

          .diff-left,
          .diff-right {
            border: 1px solid #DCDFE6;
            border-radius: 4px;
            padding: 12px;
            background: #F5F7FA;
          }

          .diff-right {
            background: #FEF0F0;
            border-color: #F56C6C;

            .deleted {
              text-decoration: line-through;
              opacity: 0.7;
            }
          }

          .diff-text {
            font-size: 14px;
            line-height: 1.6;
            word-break: break-all;
          }

.diff-text-area {
            max-height: 400px;
            overflow-y: auto;
          }

          .diff-html {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.5;
          }

          .variable-tag {
            margin-right: 8px;
            margin-bottom: 8px;
          }
        }
      }
    }
  }
}
</style>
