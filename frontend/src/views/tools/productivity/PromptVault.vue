<template>
  <div class="prompt-vault">
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-text">
        <h1 class="title">AI 提示词管理</h1>
        <p class="description">集中管理你的 AI 提示词模板，支持变量替换、分类组织和使用统计</p>
        <div class="stats-line">
          <span>共 {{ stats.total }} 个提示词</span>
          <span>{{ stats.folders }} 个文件夹</span>
          <span>使用 {{ stats.totalUsage }} 次</span>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" :icon="Plus" @click="openCreatePrompt">新建提示词</el-button>
        <el-button :icon="FolderAdd" @click="openCreateFolder">新建文件夹</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
      </div>
    </section>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧文件夹树 -->
      <aside class="sidebar">
        <el-card shadow="hover">
          <template #header>
            <div class="sidebar-header">
              <span>文件夹</span>
              <el-button link :icon="FolderAdd" @click="openCreateFolder" />
            </div>
          </template>

          <el-tree
            ref="folderTreeRef"
            :data="folderTree"
            :props="{ label: 'name', children: 'children' }"
            node-key="id"
            :current-node-key="currentFolderId"
            :highlight-current="true"
            :expand-on-click-node="false"
            default-expand-all
            @node-click="handleFolderClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <span class="node-icon">{{ data.icon || '📁' }}</span>
                <span class="node-label">{{ node.label }}</span>
                <span class="node-count">({{ data.promptCount || 0 }})</span>
                <div class="node-actions">
                  <el-icon @click.stop="editFolder(data)"><Edit /></el-icon>
                  <el-icon @click.stop="deleteFolder(data)"><Delete /></el-icon>
                </div>
              </div>
            </template>
          </el-tree>

          <div class="sidebar-footer">
            <el-button link @click="currentFolderId = null; loadPrompts()">
              <el-icon><Folder /></el-icon>
              全部提示词
            </el-button>
          </div>
        </el-card>
      </aside>

      <!-- 右侧提示词列表 -->
      <main class="content">
        <!-- 筛选栏 -->
        <el-card class="filter-card" shadow="never">
          <div class="filter-grid">
            <el-input
              v-model="filters.search"
              placeholder="搜索标题、内容或标签"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>

            <el-select v-model="filters.category" clearable placeholder="分类" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="写作" value="writing" />
              <el-option label="编程" value="coding" />
              <el-option label="翻译" value="translation" />
              <el-option label="分析" value="analysis" />
              <el-option label="创意" value="creative" />
              <el-option label="其他" value="other" />
            </el-select>

            <el-select v-model="filters.aiModel" clearable placeholder="AI模型" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="GPT-4" value="gpt-4" />
              <el-option label="GPT-3.5" value="gpt-3.5" />
              <el-option label="Claude" value="claude" />
              <el-option label="通用" value="general" />
            </el-select>

            <el-select v-model="filters.sortBy" @change="handleSearch">
              <el-option label="创建时间" value="createdAt" />
              <el-option label="更新时间" value="updatedAt" />
              <el-option label="使用次数" value="usageCount" />
              <el-option label="评分" value="rating" />
            </el-select>

            <el-select v-model="filters.sortOrder" @change="handleSearch">
              <el-option label="降序" value="desc" />
              <el-option label="升序" value="asc" />
            </el-select>
          </div>
        </el-card>

        <!-- 提示词卡片列表 -->
        <div v-loading="loading" class="prompt-list">
          <el-empty v-if="!loading && prompts.length === 0" description="暂无提示词" />

          <el-card
            v-for="prompt in prompts"
            :key="prompt.id"
            class="prompt-card"
            shadow="hover"
            @click="openPromptDetail(prompt)"
          >
            <div class="prompt-header">
              <div class="prompt-title-row">
                <h3 class="prompt-title">{{ prompt.title }}</h3>
                <el-tag v-if="prompt.category" size="small">{{ getCategoryLabel(prompt.category) }}</el-tag>
              </div>
              <div class="prompt-meta">
                <el-tag v-if="prompt.aiModel" size="small" type="info">{{ prompt.aiModel }}</el-tag>
                <span class="prompt-stats">
                  <el-icon><View /></el-icon> {{ prompt.viewCount || 0 }}
                </span>
                <span class="prompt-stats">
                  <el-icon><ChatDotRound /></el-icon> {{ prompt.usageCount || 0 }}
                </span>
                <el-rate v-model="prompt.rating" disabled show-score text-color="#ff9900" size="small" />
              </div>
            </div>

            <p class="prompt-description">{{ prompt.description || '暂无描述' }}</p>

            <div class="prompt-content-preview">
              <el-text line-clamp="2" class="content-text">{{ prompt.content }}</el-text>
            </div>

            <div class="prompt-tags" v-if="prompt.tags && prompt.tags.length">
              <el-tag v-for="tag in prompt.tags.slice(0, 5)" :key="tag" size="small" effect="plain">
                {{ tag }}
              </el-tag>
            </div>

            <div class="prompt-footer">
              <span class="prompt-date">{{ formatDate(prompt.updatedAt) }}</span>
              <div class="prompt-actions" @click.stop>
                <el-button link type="primary" :icon="CopyDocument" @click="usePrompt(prompt)">
                  使用
                </el-button>
                <el-button link :icon="Edit" @click="editPrompt(prompt)">编辑</el-button>
                <el-button link :icon="Share" @click="sharePrompt(prompt)">分享</el-button>
                <el-dropdown @command="(cmd) => handlePromptAction(cmd, prompt)">
                  <el-button link :icon="More" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="fork" :icon="DocumentCopy">
                        复制
                      </el-dropdown-item>
                      <el-dropdown-item command="move" :icon="FolderOpened">
                        移动
                      </el-dropdown-item>
                      <el-dropdown-item command="stats" :icon="DataAnalysis">
                        统计
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" :icon="Delete" divided>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 分页 -->
        <div class="pagination" v-if="pagination.total > 0">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :total="pagination.total"
            :page-sizes="[12, 24, 48, 96]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSearch"
            @current-change="handleSearch"
          />
        </div>
      </main>
    </div>

    <!-- 创建/编辑提示词对话框 -->
    <PromptEditor
      v-model:visible="editorVisible"
      :prompt="currentPrompt"
      :folders="flatFolders"
      @saved="handlePromptSaved"
    />

    <!-- 使用提示词对话框 -->
    <PromptUsage
      v-model:visible="usageVisible"
      :prompt="currentPrompt"
      @used="handlePromptUsed"
    />

    <!-- 创建/编辑文件夹对话框 -->
    <FolderEditor
      v-model:visible="folderEditorVisible"
      :folder="currentFolder"
      :parent-folders="flatFolders"
      @saved="handleFolderSaved"
    />

    <!-- 分享对话框 -->
    <ShareDialog
      v-model:visible="shareVisible"
      :prompt="currentPrompt"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus, FolderAdd, Refresh, Search, Edit, Delete, Share, More,
  CopyDocument, DocumentCopy, FolderOpened, DataAnalysis, Folder,
  View, ChatDotRound
} from '@element-plus/icons-vue';
import promptService from '@/services/promptService';
import PromptEditor from './components/PromptEditor.vue';
import PromptUsage from './components/PromptUsage.vue';
import FolderEditor from './components/FolderEditor.vue';
import ShareDialog from './components/ShareDialog.vue';
import dayjs from 'dayjs';
import { trackView, trackSearch, trackEdit, trackShare } from '@/utils/promptTracking';

// 数据
const loading = ref(false);
const prompts = ref([]);
const folderTree = ref([]);
const currentFolderId = ref(null);
const currentPrompt = ref(null);
const currentFolder = ref(null);

// 对话框状态
const editorVisible = ref(false);
const usageVisible = ref(false);
const folderEditorVisible = ref(false);
const shareVisible = ref(false);

// 筛选条件
const filters = reactive({
  search: '',
  category: '',
  aiModel: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});

// 分页
const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0
});

// 统计数据
const stats = reactive({
  total: 0,
  folders: 0,
  totalUsage: 0
});

// 计算属性：扁平化文件夹列表
const flatFolders = computed(() => {
  const flatten = (nodes, result = []) => {
    nodes.forEach(node => {
      result.push(node);
      if (node.children && node.children.length) {
        flatten(node.children, result);
      }
    });
    return result;
  };
  return flatten(folderTree.value);
});

// 生命周期
onMounted(() => {
  loadData();
});

// 方法
async function loadData() {
  await Promise.all([
    loadPrompts(),
    loadFolders()
  ]);
}

async function loadPrompts() {
  const searchStartTime = Date.now();
  try {
    loading.value = true;
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      folderId: currentFolderId.value,
      search: filters.search,
      category: filters.category,
      aiModel: filters.aiModel,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };

    const response = await promptService.getPrompts(params);
    prompts.value = response.data.prompts;
    pagination.total = response.data.pagination.total;
    stats.total = response.data.pagination.total;
    stats.totalUsage = response.data.prompts.reduce((sum, p) => sum + (p.usageCount || 0), 0);
    
    // 埋点: 如果是搜索操作，记录搜索事件
    if (filters.search) {
      const searchDuration = Date.now() - searchStartTime;
      trackSearch({
        keyword: filters.search,
        category: filters.category,
        aiModel: filters.aiModel,
        resultCount: response.data.pagination.total,
        duration: searchDuration
      });
    }
  } catch (error) {
    ElMessage.error('加载提示词失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

async function loadFolders() {
  try {
    const response = await promptService.getFolderTree();
    folderTree.value = response.data;
    stats.folders = flatFolders.value.length;
  } catch (error) {
    ElMessage.error('加载文件夹失败: ' + error.message);
  }
}

function handleSearch() {
  pagination.page = 1;
  loadPrompts();
}

function handleFolderClick(folder) {
  currentFolderId.value = folder.id;
  loadPrompts();
}

function openCreatePrompt() {
  currentPrompt.value = null;
  editorVisible.value = true;
}

function openCreateFolder() {
  currentFolder.value = null;
  folderEditorVisible.value = true;
}

async function editPrompt(prompt) {
  try {
    // 埋点: 记录编辑事件
    trackEdit(prompt.id, {
      isNew: false,
      prompt: prompt
    });
    
    // 从服务器获取最新的提示词数据，确保文件夹信息是最新的
    loading.value = true;
    const response = await promptService.getPromptById(prompt.id);
    
    if (response && response.data) {
      currentPrompt.value = response.data;
      editorVisible.value = true;
    } else {
      // 降级方案：如果获取失败，使用列表中的数据
      currentPrompt.value = prompt;
      editorVisible.value = true;
    }
  } catch (error) {
    console.error('获取提示词详情失败:', error);
    // 降级方案：使用列表中的数据
    currentPrompt.value = prompt;
    editorVisible.value = true;
    ElMessage.warning('获取最新数据失败，显示的可能不是最新信息');
  } finally {
    loading.value = false;
  }
}

function editFolder(folder) {
  currentFolder.value = folder;
  folderEditorVisible.value = true;
}

function usePrompt(prompt) {
  // 埋点: 记录查看事件
  trackView(prompt.id, {
    source: 'list',
    prompt: prompt
  });
  
  currentPrompt.value = prompt;
  usageVisible.value = true;
}

function sharePrompt(prompt) {
  // 埋点: 记录分享事件
  trackShare(prompt.id, {
    prompt: prompt
  });
  
  currentPrompt.value = prompt;
  shareVisible.value = true;
}

function openPromptDetail(prompt) {
  // 埋点: 记录查看详情事件
  trackView(prompt.id, {
    source: filters.search ? 'search' : 'list',
    prompt: prompt
  });
  
  currentPrompt.value = prompt;
  usageVisible.value = true;
}

async function deleteFolder(folder) {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹"${folder.name}"吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    );

    await promptService.deleteFolder(folder.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message);
    }
  }
}

async function handlePromptAction(command, prompt) {
  switch (command) {
    case 'fork':
      await forkPrompt(prompt);
      break;
    case 'move':
      await movePrompt(prompt);
      break;
    case 'stats':
      await showStats(prompt);
      break;
    case 'delete':
      await deletePrompt(prompt);
      break;
  }
}

async function forkPrompt(prompt) {
  try {
    await promptService.forkPrompt(prompt.id);
    ElMessage.success('复制成功');
    loadPrompts();
  } catch (error) {
    ElMessage.error('复制失败: ' + error.message);
  }
}

async function movePrompt(prompt) {
  // TODO: 实现移动对话框
  ElMessage.info('移动功能开发中');
}

async function showStats(prompt) {
  // TODO: 实现统计对话框
  ElMessage.info('统计功能开发中');
}

async function deletePrompt(prompt) {
  try {
    await ElMessageBox.confirm(
      `确定要删除提示词"${prompt.title}"吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    );

    await promptService.deletePrompt(prompt.id);
    ElMessage.success('删除成功');
    loadPrompts();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message);
    }
  }
}

async function handlePromptSaved(updatedPrompt) {
  editorVisible.value = false;
  // 重新加载数据以确保文件夹计数和提示词列表同步
  await loadData();
  
  // 如果提示词的文件夹发生了变化，需要特殊处理
  if (updatedPrompt && currentPrompt.value) {
    const oldFolderId = currentPrompt.value.folderId;
    const newFolderId = updatedPrompt.folderId;
    
    // 如果文件夹发生变化且当前正在查看某个文件夹
    if (oldFolderId !== newFolderId && currentFolderId.value) {
      // 如果当前查看的是旧文件夹或新文件夹，刷新列表
      if (currentFolderId.value === oldFolderId || currentFolderId.value === newFolderId) {
        await loadPrompts();
      }
    }
  }
}

function handlePromptUsed() {
  loadPrompts();
}

function handleFolderSaved() {
  folderEditorVisible.value = false;
  loadData();
}

function getCategoryLabel(category) {
  const labels = {
    writing: '写作',
    coding: '编程',
    translation: '翻译',
    analysis: '分析',
    creative: '创意',
    other: '其他'
  };
  return labels[category] || category;
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}
</script>

<style scoped lang="scss">
.prompt-vault {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 32px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  .header-text {
    flex: 1;

    .title {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #1a202c;
    }

    .description {
      margin: 0 0 12px;
      color: #2d3748;
    }

    .stats-line {
      display: flex;
      gap: 20px;
      font-size: 14px;
      color: #4a5568;
    }
  }

  .actions {
    display: flex;
    gap: 12px;
  }
}

.main-content {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
}

.sidebar {
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #2d3748;

    .node-icon {
      font-size: 16px;
    }

    .node-label {
      flex: 1;
    }

    .node-count {
      color: #4a5568;
      font-size: 12px;
    }

    .node-actions {
      display: none;
      gap: 4px;

      .el-icon {
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;

        &:hover {
          background: #f5f7fa;
        }
      }
    }

    &:hover .node-actions {
      display: flex;
    }
  }

  .sidebar-footer {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
  }
}

.content {
  min-height: 600px;
}

.filter-card {
  margin-bottom: 20px;

  .filter-grid {
    display: grid;
    grid-template-columns: 2fr repeat(4, 1fr);
    gap: 12px;
  }
}

.prompt-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.prompt-card {
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
  }

  .prompt-header {
    margin-bottom: 12px;

    .prompt-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;

      .prompt-title {
        flex: 1;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
    }

    .prompt-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: #4a5568;

      .prompt-stats {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .prompt-description {
    margin: 0 0 12px;
    color: #2d3748;
    font-size: 14px;
    line-height: 1.6;
  }

  .prompt-content-preview {
    padding: 12px;
    background: #f7fafc;
    border-radius: 6px;
    margin-bottom: 12px;
    border: 1px solid #e2e8f0;

    .content-text {
      font-size: 13px;
      color: #2d3748;
      font-family: monospace;
    }
  }

  .prompt-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .prompt-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;

    .prompt-date {
      font-size: 12px;
      color: #4a5568;
    }

    .prompt-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    order: 2; /* 移动端将侧边栏移到下方 */
  }
  
  .page-header {
    flex-direction: column;
    gap: 20px;
    padding: 24px 20px;
    
    .actions {
      width: 100%;
      flex-direction: column;
      
      .el-button {
        width: 100%;
      }
    }
  }
}

@media (max-width: 768px) {
  .prompt-vault {
    padding: 0;
  }
  
  .page-header {
    padding: 20px 16px;
    margin-bottom: 16px;
    border-radius: 12px;
    
    .header-text {
      .title {
        font-size: 22px;
      }
      
      .stats-line {
        flex-direction: column;
        gap: 8px;
      }
    }
  }
  
  .prompt-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
