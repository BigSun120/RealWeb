/**
 * 分集检查 Composable
 * 用于ScriptAnalysis.vue的分集检查功能
 */

import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { generateAIContent } from '@/api/ai';
import { saveAIDiagnosis, getAIDiagnosis } from '@/api/drama';
import { UpdateStrategyFactory } from '../services/UpdateStrategyFactory';
import { generateEpisodeSolutionPrompt } from '../utils/episodeCheckPrompts';

export function useEpisodeCheck(project, emit) {
  // ========================================
  // 状态管理
  // ========================================
  const episodeCheckState = ref({
    selectedEpisode: null,
    issues: [],
    loading: false,
    externalWorkflowVisible: false,
    solutionDialogVisible: false,
    currentIssue: null // 当前正在生成解决方案的问题
  });

  // ========================================
  // 计算属性
  // ========================================
  const availableEpisodes = computed(() => {
    if (!project.value || !project.value.episodes) return [];
    
    return project.value.episodes
      .filter(ep => ep.status === 'completed' || ep.status === 'reviewed')
      .sort((a, b) => a.number - b.number);
  });

  const issuesByEpisode = computed(() => {
    const grouped = {};
    
    episodeCheckState.value.issues.forEach(issue => {
      const episodeNum = issue.location?.episodeNumber || 0;
      if (!grouped[episodeNum]) {
        grouped[episodeNum] = [];
      }
      grouped[episodeNum].push(issue);
    });
    
    return grouped;
  });

  // ========================================
  // 方法
  // ========================================

  /**
   * 加载已保存的分集检查问题
   */
  const loadEpisodesIssues = async () => {
    if (!project.value?._id) return;
    
    try {
      episodeCheckState.value.loading = true;
      
      const response = await getAIDiagnosis(project.value._id, 'episodes');
      
      // 处理API返回的数据结构：{code: 200, data: {issues: [...], stage: 'episodes'}}
      const data = response.data || response;
      const issues = data.issues || [];
      
      if (Array.isArray(issues) && issues.length > 0) {
        episodeCheckState.value.issues = issues.map(issue => ({
          ...issue,
          // 确保每个issue都有episodeNumber字段
          location: {
            ...issue.location,
            episodeNumber: issue.location.episodeNumber || 
              parseInt((issue.location.field || '').match(/\d+/)?.[0] || 0)
          },
          // 初始化显示模式
          _displayMode: issue._displayMode || 'formatted',
          _displayContent: issue._displayContent || issue.solution?.suggestedContent
        }));
        
        console.log(`✅ 已加载 ${episodeCheckState.value.issues.length} 个分集检查问题`);
      } else {
        console.log('ℹ️ 服务器上暂无分集检查数据');
        episodeCheckState.value.issues = [];
      }
    } catch (error) {
      console.error('加载分集问题失败:', error);
      ElMessage.error('加载分集问题失败');
    } finally {
      episodeCheckState.value.loading = false;
    }
  };

  /**
   * 打开外部AI工作流对话框
   */
  const openExternalAIWorkflow = () => {
    if (!episodeCheckState.value.selectedEpisode) {
      ElMessage.warning('请先选择要检查的剧集');
      return;
    }
    
    episodeCheckState.value.externalWorkflowVisible = true;
  };

  /**
   * 处理导入的分集问题
   */
  const handleImportEpisodeIssues = async (importedIssues) => {
    try {
      // 合并新导入的问题到现有问题列表
      // 如果是同一集的诊断，替换该集的问题；否则追加
      const newIssueEpisodes = new Set(
        importedIssues.map(issue => issue.location.episodeNumber)
      );
      
      // 过滤掉被替换集数的旧问题
      const filteredOldIssues = episodeCheckState.value.issues.filter(
        issue => !newIssueEpisodes.has(issue.location.episodeNumber)
      );
      
      // 合并问题列表
      const mergedIssues = [...filteredOldIssues, ...importedIssues];
      
      // 保存到后端
      await saveAIDiagnosis(project.value._id, 'episodes', mergedIssues);
      
      // 更新本地状态
      episodeCheckState.value.issues = mergedIssues;
      
      ElMessage.success(`成功导入 ${importedIssues.length} 个问题`);
      
      // 刷新父组件项目数据
      emit('content-updated');
    } catch (error) {
      console.error('保存分集问题失败:', error);
      ElMessage.error('保存失败：' + error.message);
    }
  };

  /**
   * 打开外部AI解决方案对话框
   */
  const generateEpisodeSolution = (issue) => {
    episodeCheckState.value.currentIssue = issue;
    episodeCheckState.value.solutionDialogVisible = true;
  };
  
  /**
   * 处理外部AI返回的解决方案
   * 导入后打开对比弹窗，而不是直接应用
   */
  const handleSolutionImported = async (solution) => {
    const issue = episodeCheckState.value.currentIssue;
    if (!issue) {
      ElMessage.error('未找到目标问题');
      return;
    }

    try {
      // 解析suggestedContent - 如果是字符串需要转成对象
      let suggestedContentObj;
      if (typeof solution.suggestedContent === 'string') {
        try {
          suggestedContentObj = JSON.parse(solution.suggestedContent);
        } catch (e) {
          // 如果无法解析，直接使用字符串
          suggestedContentObj = solution.suggestedContent;
        }
      } else {
        suggestedContentObj = solution.suggestedContent;
      }

      // 更新issue - 将完整的episode.content对象转成JSON字符串存储
      issue.solution = {
        suggestedContent: JSON.stringify(suggestedContentObj, null, 2),
        explanation: solution.explanation,
        generatedAt: solution.generatedAt
      };
      issue.status = 'solution_ready';
      
      // 初始化显示模式
      if (!issue._displayMode) {
        issue._displayMode = 'formatted';
      }
      if (!issue._displayContent) {
        issue._displayContent = issue.solution.suggestedContent;
      }

      // 保存到后端
      await saveAIDiagnosis(project.value._id, 'episodes', episodeCheckState.value.issues);

      ElMessage.success('解决方案已导入，请在对比弹窗中查看并应用');
      
      // 关闭导入对话框
      episodeCheckState.value.solutionDialogVisible = false;
      
      // 触发打开对比弹窗的事件（不清空currentIssue，供父组件使用）
      return issue; // 返回issue对象，供父组件打开viewEpisodeSolution
    } catch (error) {
      console.error('保存解决方案失败:', error);
      ElMessage.error('保存失败：' + error.message);
      throw error;
    }
  };

  /**
   * 应用分集问题的解决方案
   */
  const applyEpisodeSolution = async (issue) => {
    if (!issue.solution?.suggestedContent) {
      ElMessage.warning('没有可应用的解决方案');
      return;
    }

    try {
      await ElMessageBox.confirm(
        `确认将AI生成的解决方案应用到"${issue.location.field}"吗？此操作将覆盖现有内容。`,
        '确认应用',
        {
          confirmButtonText: '应用',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      // 使用 UpdateStrategyFactory 应用修改
      const episodeNumber = issue.location.episodeNumber;
      const message = await UpdateStrategyFactory.apply(
        project.value,
        'episodes',
        issue.location.field,
        issue.solution.suggestedContent,
        null,
        episodeNumber
      );

      // 标记问题为已解决
      issue.status = 'solved';
      await saveAIDiagnosis(project.value._id, 'episodes', episodeCheckState.value.issues);

      ElMessage.success(message || '修改已应用');
      emit('content-updated');
    } catch (error) {
      if (error !== 'cancel') {
        console.error('应用解决方案失败:', error);
        ElMessage.error('应用失败：' + error.message);
      }
    }
  };

  /**
   * 初始化分集检查（切换到episodes阶段时调用）
   */
  const initEpisodeCheck = () => {
    loadEpisodesIssues();
    
    // 默认选择第一个可用剧集
    if (!episodeCheckState.value.selectedEpisode && availableEpisodes.value.length > 0) {
      episodeCheckState.value.selectedEpisode = availableEpisodes.value[0].number;
    }
  };

  // ========================================
  // 数据持久化：监听问题列表变化，防抖后保存
  // ========================================
  let saveTimer = null;
  watch(
    () => episodeCheckState.value.issues,
    () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        if (episodeCheckState.value.issues.length > 0 && project.value?._id) {
          try {
            await saveAIDiagnosis(project.value._id, 'episodes', episodeCheckState.value.issues);
            console.log('✅ 分集检查问题已自动保存到服务器', {
              issuesCount: episodeCheckState.value.issues.length
            });
          } catch (error) {
            console.error('自动保存分集问题失败:', error);
            // 不阻塞用户操作
          }
        }
      }, 1000); // 防抖 1 秒
    },
    { deep: true }
  );

  return {
    // 状态
    episodeCheckState,
    availableEpisodes,
    issuesByEpisode,
    
    // 方法
    loadEpisodesIssues,
    openExternalAIWorkflow,
    handleImportEpisodeIssues,
    generateEpisodeSolution,
    handleSolutionImported,
    applyEpisodeSolution,
    initEpisodeCheck
  };
}
