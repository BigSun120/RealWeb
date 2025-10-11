<template>
  <div class="prompt-vault">
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-text">
        <h1 class="title">AI 提示词管理</h1>
        <div class="stats-line">
          <span>共 {{ stats.total }} 个提示词</span>
          <span>{{ stats.folders }} 个文件夹</span>
          <span>使用 {{ stats.totalUsage }} 次</span>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" :icon="Plus" @click="openCreatePrompt">新建提示词</el-button>
        <el-button :icon="FolderAdd" @click="openCreateFolder">新建文件夹</el-button>
        <el-dropdown @command="handleImportExport" trigger="click">
          <el-button :icon="DocumentCopy">
            导入/导出<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="export" :icon="Download">
                导出提示词
              </el-dropdown-item>
              <el-dropdown-item command="import" :icon="Upload">
                导入提示词
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button :icon="Setting" @click="openOptionsManager">管理选项</el-button>
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
              <div class="header-actions">
                <el-button link size="small" @click="expandAllFolders">全部展开</el-button>
                <el-button link size="small" @click="collapseAllFolders">全部折叠</el-button>
                <el-button link :icon="FolderAdd" @click="openCreateFolder" />
              </div>
            </div>
          </template>

          <el-tree ref="folderTreeRef" v-if="folderTree.length > 0" :data="folderTree"
            :props="{ label: 'name', children: 'children' }" node-key="id" :current-node-key="currentFolderId"
            :highlight-current="true" :expand-on-click-node="false" :default-expand-all="defaultExpandAll"
            @node-click="handleFolderClick">
            <template #default="{ node, data }">
              <el-popover placement="right" :width="140" trigger="hover" :show-after="300"
                popper-class="folder-actions-popover">
                <template #reference>
                  <div class="tree-node">
                    <span class="node-icon">{{ data.icon || '📁' }}</span>
                    <el-tooltip :content="node.label" placement="top" :disabled="node.label.length <= 12">
                      <span class="node-label">{{ node.label }}</span>
                    </el-tooltip>
                    <span class="node-count">({{ data.promptCount || 0 }})</span>
                  </div>
                </template>
                <div class="folder-actions-menu" @click.stop>
                  <div class="action-item" @click="editFolder(data)">
                    <el-icon>
                      <Edit />
                    </el-icon>
                    <span>编辑文件夹</span>
                  </div>
                  <div class="action-item danger" @click="deleteFolder(data)">
                    <el-icon>
                      <Delete />
                    </el-icon>
                    <span>删除文件夹</span>
                  </div>
                </div>
              </el-popover>
            </template>
          </el-tree>
          <el-empty v-else description="暂无文件夹" :image-size="80" />

          <div class="sidebar-footer">
            <el-button link @click="currentFolderId = null; loadPrompts()">
              <el-icon>
                <Folder />
              </el-icon>
              全部提示词
            </el-button>
          </div>
        </el-card>
      </aside>

      <!-- 右侧提示词列表 -->
      <main class="content">
        <!-- 筛选栏 -->
        <el-card class="filter-card" shadow="never">
          <!-- 第一行：快捷筛选 + 搜索 -->
          <div class="filter-row-primary">
            <div class="quick-filters">
              <el-button-group>
                <el-button :type="quickFilter === 'all' ? 'primary' : ''" @click="setQuickFilter('all')">
                  全部
                </el-button>
                <el-button :type="quickFilter === 'favorite' ? 'primary' : ''" @click="setQuickFilter('favorite')">
                  <el-icon>
                    <Star />
                  </el-icon>
                  <span class="btn-text">收藏</span>
                </el-button>
                <el-button :type="quickFilter === 'recent' ? 'primary' : ''" @click="setQuickFilter('recent')">
                  <el-icon>
                    <Clock />
                  </el-icon>
                  <span class="btn-text">最近</span>
                </el-button>
                <el-button :type="quickFilter === 'mine' ? 'primary' : ''" @click="setQuickFilter('mine')">
                  <el-icon>
                    <User />
                  </el-icon>
                  <span class="btn-text">我的</span>
                </el-button>
              </el-button-group>
            </div>

            <div class="search-wrapper">
              <el-input v-model="filters.search" placeholder="搜索提示词..." clearable class="search-input"
                @keyup.enter="handleSearch">
                <template #prefix>
                  <el-icon>
                    <Search />
                  </el-icon>
                </template>
                <template #append>
                  <el-button-group>
                    <el-tooltip :content="searchMode === 'fuzzy' ? '当前：模糊搜索，点击切换为精确搜索' : '当前：精确搜索，点击切换为模糊搜索'"
                      placement="top">
                      <el-button @click="toggleSearchMode" :type="searchMode === 'exact' ? 'primary' : 'default'">
                        {{ searchMode === 'fuzzy' ? '模糊' : '精确' }}
                      </el-button>
                    </el-tooltip>
                    <el-button @click="handleSearch" type="primary">
                      <el-icon>
                        <Search />
                      </el-icon>
                      搜索
                    </el-button>
                  </el-button-group>
                </template>
              </el-input>
            </div>

            <el-button v-if="hasActiveFilters" @click="resetFilters" class="reset-btn">
              <el-icon>
                <CircleClose />
              </el-icon>
              <span class="btn-text">重置</span>
            </el-button>
          </div>

          <!-- 第二行：详细筛选 -->
          <div class="filter-row-secondary">
            <el-select v-model="filters.category" clearable placeholder="分类" @change="handleSearch"
              class="filter-select">
              <el-option label="全部分类" value="" />
              <el-option-group label="预设分类">
                <el-option label="写作" value="写作" />
                <el-option label="编程" value="编程" />
                <el-option label="翻译" value="翻译" />
                <el-option label="分析" value="分析" />
                <el-option label="创意" value="创意" />
                <el-option label="客户服务" value="客户服务" />
                <el-option label="产品文档" value="产品文档" />
                <el-option label="市场营销" value="市场营销" />
                <el-option label="教育培训" value="教育培训" />
                <el-option label="其他" value="其他" />
              </el-option-group>
              <el-option-group label="自定义分类" v-if="customCategories.length > 0">
                <el-option v-for="category in customCategories" :key="category" :label="category" :value="category" />
              </el-option-group>
            </el-select>

            <el-select v-model="filters.aiModel" clearable placeholder="AI模型" @change="handleSearch"
              class="filter-select">
              <el-option label="全部模型" value="" />

              <!-- 预设模型 -->
              <el-option-group label="预设模型">
                <el-option label="通用" value="general" />
                <el-option label="GPT-4" value="gpt-4" />
                <el-option label="GPT-4 Turbo" value="gpt-4-turbo" />
                <el-option label="GPT-3.5" value="gpt-3.5" />
                <el-option label="Claude 3 Opus" value="claude-3-opus" />
                <el-option label="Claude 3 Sonnet" value="claude-3-sonnet" />
                <el-option label="Claude 3 Haiku" value="claude-3-haiku" />
                <el-option label="Gemini Pro" value="gemini-pro" />
                <el-option label="Gemini Ultra" value="gemini-ultra" />
                <el-option label="文心一言" value="wenxin" />
                <el-option label="通义千问" value="tongyi" />
                <el-option label="ChatGLM" value="chatglm" />
                <el-option label="讯飞星火" value="xinghuo" />
              </el-option-group>

              <!-- 自定义模型 -->
              <el-option-group label="自定义模型" v-if="customAIModels.length > 0">
                <el-option v-for="model in customAIModels" :key="model" :label="model" :value="model" />
              </el-option-group>
            </el-select>

            <el-select v-model="filters.tags" clearable placeholder="标签" @change="handleSearch" class="filter-select">
              <el-option label="全部标签" value="" />
              <el-option v-for="tag in allTags" :key="tag" :label="tag" :value="tag" />
            </el-select>

            <el-select v-model="filters.sort" @change="handleSearch" class="filter-select">
              <el-option label="最新创建" value="createdAt-desc" />
              <el-option label="最早创建" value="createdAt-asc" />
              <el-option label="最近更新" value="updatedAt-desc" />
              <el-option label="最早更新" value="updatedAt-asc" />
              <el-option label="使用最多" value="usageCount-desc" />
              <el-option label="使用最少" value="usageCount-asc" />
            </el-select>

            <div class="filter-stats">
              <span class="stats-text">共 {{ pagination.total }} 个结果</span>
            </div>
          </div>
        </el-card>

        <!-- 批量操作工具栏 -->
        <el-card v-if="selectedPrompts.length > 0" class="bulk-actions-card" shadow="never">
          <div class="bulk-actions">
            <div class="bulk-info">
              <el-icon>
                <Check />
              </el-icon>
              <span>已选中 {{ selectedPrompts.length }} 个提示词</span>
            </div>
            <div class="bulk-buttons">
              <el-button size="small" @click="selectAll">全选</el-button>
              <el-button size="small" @click="clearSelection">取消选中</el-button>
              <el-button size="small" type="primary" :icon="Download" @click="handleImportExport('export')">
                导出选中
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 提示词卡片列表 -->
        <div v-loading="loading" class="prompt-list">
          <el-empty v-if="!loading && prompts.length === 0" description="暂无提示词" />

          <el-card v-for="prompt in prompts" :key="prompt.id" class="prompt-card" shadow="hover"
            :class="{ 'is-selected': isPromptSelected(prompt) }" @click="openPromptDetail(prompt)">
            <div class="prompt-header">
              <el-checkbox :model-value="isPromptSelected(prompt)" @change="togglePromptSelection(prompt, $event)"
                @click.stop class="prompt-checkbox" />
              <div class="prompt-title-row">
                <h3 class="prompt-title">{{ prompt.title }}</h3>
                <el-tag v-if="prompt.category" size="small">{{ prompt.category }}</el-tag>
              </div>
              <div class="prompt-meta">
                <el-tag v-if="prompt.aiModel" size="small" type="info">{{ prompt.aiModel }}</el-tag>
                <span class="prompt-stats">
                  <el-icon>
                    <View />
                  </el-icon> {{ prompt.viewCount || 0 }}
                </span>
                <span class="prompt-stats">
                  <el-icon>
                    <ChatDotRound />
                  </el-icon> {{ prompt.usageCount || 0 }}
                </span>
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
              <div class="footer-left">
                <el-button link :icon="prompt.isFavorited ? 'StarFilled' : 'Star'"
                  :type="prompt.isFavorited ? 'warning' : ''" @click.stop="toggleFavorite(prompt)" class="favorite-btn">
                  {{ prompt.isFavorited ? '已收藏' : '收藏' }}
                </el-button>
                <span class="prompt-date">{{ formatDate(prompt.updatedAt) }}</span>
              </div>
              <div class="prompt-actions" @click.stop>
                <el-button link type="primary" :icon="CopyDocument" @click="usePrompt(prompt)">
                  使用
                </el-button>
                <el-button link :icon="Edit" @click="editPrompt(prompt)">编辑</el-button>
                <el-dropdown @command="(cmd) => handlePromptAction(cmd, prompt)" trigger="click">
                  <el-button link :icon="More">更多</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="stats" :icon="DataAnalysis">
                        使用统计
                      </el-dropdown-item>
                      <el-dropdown-item command="versions" :icon="Clock">
                        版本历史
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
          <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.limit"
            :total="pagination.total" :page-sizes="[12, 24, 48, 96]" layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSearch" @current-change="handleSearch" />
        </div>
      </main>
    </div>

    <!-- 对话框组件 -->
    <div v-show="editorVisible">
      <PromptEditor v-model:visible="editorVisible" :prompt="currentPrompt" :folders="flatFolders"
        @saved="handlePromptSaved" />
    </div>

    <div v-show="usageVisible">
      <PromptUsage v-model:visible="usageVisible" :prompt="currentPrompt" @used="handlePromptUsed" />
    </div>

    <div v-show="folderEditorVisible">
      <FolderEditor v-model:visible="folderEditorVisible" :folder="currentFolder" :parent-folders="flatFolders"
        @saved="handleFolderSaved" />
    </div>

    <div v-show="optionsManagerVisible">
      <CustomOptionsManager v-model:visible="optionsManagerVisible" @saved="handleOptionsSaved" />
    </div>

    <!-- 使用统计对话框 -->
    <el-dialog v-model="statsVisible" title="使用统计" width="900px" destroy-on-close>
      <PromptStatistics v-if="currentPrompt && statsVisible" :prompt-id="currentPrompt.id" />
    </el-dialog>

    <!-- 版本历史对话框 -->
    <el-dialog v-model="versionsVisible" title="版本历史" width="900px" destroy-on-close>
      <PromptVersionHistory v-if="currentPrompt && versionsVisible" :prompt-id="currentPrompt.id"
        @version-restored="handleVersionRestored" />
    </el-dialog>

    <!-- 导入导出对话框 -->
    <ImportExportDialog v-model:visible="importExportVisible" :mode="importExportMode"
      :current-folder-id="currentFolderId" :selected-prompts="selectedPrompts" @import-success="handleImportSuccess"
      @export-success="handleExportSuccess" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, provide, h } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '@/stores/user';
import {
  Plus, FolderAdd, Refresh, Search, Edit, Delete,
  CopyDocument, Folder, View, ChatDotRound, Star, StarFilled,
  Clock, User, CircleClose, Setting, More, DataAnalysis,
  DocumentCopy, Download, Upload, ArrowDown, Aim, Check
} from '@element-plus/icons-vue';
import request from '@/utils/request';
import PromptEditor from './components/PromptEditor.vue';
import PromptUsage from './components/PromptUsage.vue';
import FolderEditor from './components/FolderEditor.vue';
import CustomOptionsManager from './components/CustomOptionsManager.vue';
import PromptStatistics from './components/PromptStatistics.vue';
import PromptVersionHistory from './components/PromptVersionHistory.vue';
import ImportExportDialog from './components/ImportExportDialog.vue';

// 直接在这里定义 promptService，避免导入问题
const promptService = {
  async getPrompts(params = {}) {
    const response = await request({
      url: '/tools/prompt-vault/prompts',
      method: 'get',
      params
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取提示词列表失败');
  },

  async getFolderTree() {
    const response = await request({
      url: '/tools/prompt-vault/folders/tree',
      method: 'get'
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取文件夹树失败');
  },

  async deletePrompt(id) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}`,
      method: 'delete'
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '删除提示词失败');
  },

  async getPromptById(id) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}`,
      method: 'get'
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取提示词详情失败');
  },

  async createPrompt(data) {
    const response = await request({
      url: '/tools/prompt-vault/prompts',
      method: 'post',
      data
    });
    if (response.code === 201 || response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '创建提示词失败');
  },

  async updatePrompt(id, data) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}`,
      method: 'put',
      data
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '更新提示词失败');
  },

  async recordUsage(id, data) {
    const response = await request({
      url: `/prompts/${id}/usage`,
      method: 'post',
      data
    });
    if (response.code === 201 || response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '记录使用失败');
  },

  async updateFeedback(logId, feedback) {
    const response = await request({
      url: `/prompts/usage/${logId}/feedback`,
      method: 'patch',
      data: feedback
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '更新反馈失败');
  },

  async createFolder(data) {
    const response = await request({
      url: '/tools/prompt-vault/folders',
      method: 'post',
      data
    });
    if (response.code === 201 || response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '创建文件夹失败');
  },

  async updateFolder(id, data) {
    const response = await request({
      url: `/tools/prompt-vault/folders/${id}`,
      method: 'put',
      data
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '更新文件夹失败');
  },

  async deleteFolder(id, options = {}) {
    const response = await request({
      url: `/tools/prompt-vault/folders/${id}`,
      method: 'delete',
      data: options
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '删除文件夹失败');
  },

  parseVariables(content) {
    if (!content) return [];
    const variableRegex = /\{\{(\w+)(?::([^}]*))?\}\}/g;
    const variables = [];
    const seen = new Set();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const varName = match[1];
      const varOptions = match[2];

      if (!seen.has(varName)) {
        seen.add(varName);
        const variable = {
          name: varName,
          type: 'text',
          required: true,
          options: []
        };

        if (varOptions) {
          const parts = varOptions.split(':');
          parts.forEach(part => {
            if (part.includes('|')) {
              variable.type = 'select';
              variable.options = part.split('|').map(o => o.trim());
            } else if (part.startsWith('default=')) {
              variable.default = part.substring(8);
              variable.required = false;
            } else if (part === 'textarea') {
              variable.type = 'textarea';
            } else if (part === 'number') {
              variable.type = 'number';
            } else if (part === 'date') {
              variable.type = 'date';
            }
          });
        }
        variables.push(variable);
      }
    }
    return variables;
  },

  renderPrompt(content, values = {}) {
    if (!content) return '';
    let rendered = content;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}(?::[^}]*)?\\}\\}`, 'g');
      rendered = rendered.replace(regex, value || '');
    });
    return rendered;
  },

  async generateShareLink(id) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}/share`,
      method: 'post'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '生成分享链接失败');
  },

  async toggleFavorite(id, isFavorited) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}/favorite`,
      method: 'post',
      data: { isFavorited: !isFavorited }
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '操作失败');
  },

  async getStatistics(id, params = {}) {
    const response = await request({
      url: `/prompts/${id}/usage/statistics`,
      method: 'get',
      params
    });
    if (response.code === 200) {
      return response.data;
    }
    throw new Error(response.message || '获取统计数据失败');
  },

  async getVersionHistory(id) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}/versions`,
      method: 'get'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '获取版本历史失败');
  },

  async getVersionDetail(id, versionId) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}/versions/${versionId}`,
      method: 'get'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '获取版本详情失败');
  },

  async restoreVersion(id, versionId) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${id}/versions/${versionId}/restore`,
      method: 'post'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '恢复版本失败');
  },

  // ====================  评论相关 ====================
  async getComments(promptId, params = {}) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${promptId}/comments`,
      method: 'get',
      params
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '获取评论失败');
  },

  async getCommentStats(promptId) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${promptId}/comments/stats`,
      method: 'get'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '获取评论统计失败');
  },

  async createComment(promptId, data) {
    const response = await request({
      url: `/tools/prompt-vault/prompts/${promptId}/comments`,
      method: 'post',
      data
    });
    if (response.code === 201) {
      return response;
    }
    throw new Error(response.message || '创建评论失败');
  },

  async updateComment(commentId, data) {
    const response = await request({
      url: `/tools/prompt-vault/comments/${commentId}`,
      method: 'put',
      data
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '更新评论失败');
  },

  async deleteComment(commentId) {
    const response = await request({
      url: `/tools/prompt-vault/comments/${commentId}`,
      method: 'delete'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '删除评论失败');
  },

  async toggleCommentLike(commentId) {
    const response = await request({
      url: `/tools/prompt-vault/comments/${commentId}/like`,
      method: 'post'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '点赞操作失败');
  },

  // ====================  导入导出 ====================
  async exportPrompts(params = {}) {
    const response = await request({
      url: '/tools/prompt-vault/export',
      method: 'get',
      params
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '导出失败');
  },

  async importPrompts(data) {
    const response = await request({
      url: '/tools/prompt-vault/import',
      method: 'post',
      data
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '导入失败');
  },

  // ====================  模板引擎 ====================
  async renderTemplate(content, variables) {
    const response = await request({
      url: '/tools/prompt-vault/template/render',
      method: 'post',
      data: { content, variables }
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '模板渲染失败');
  },

  async extractTemplateVariables(content) {
    const response = await request({
      url: '/tools/prompt-vault/template/extract-variables',
      method: 'post',
      data: { content }
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '变量提取失败');
  },

  async getTemplateHelpers() {
    const response = await request({
      url: '/tools/prompt-vault/template/helpers',
      method: 'get'
    });
    if (response.code === 200) {
      return response;
    }
    throw new Error(response.message || '获取辅助函数失败');
  }
};

// 提供 promptService 和 userStore 给子组件
const userStore = useUserStore();
provide('promptService', promptService);
provide('userStore', userStore);

// 数据
const loading = ref(false);
const prompts = ref([]);
const folderTree = ref([]);
const folderTreeRef = ref(null);
const defaultExpandAll = ref(true);
const currentFolderId = ref(null);
const currentPrompt = ref(null);
const currentFolder = ref(null);
const selectedPrompts = ref([]); // 已选中的提示词

// 对话框状态
const editorVisible = ref(false);
const usageVisible = ref(false);
const folderEditorVisible = ref(false);
const optionsManagerVisible = ref(false);
const statsVisible = ref(false);
const versionsVisible = ref(false);
const importExportVisible = ref(false);
const importExportMode = ref('export');

// 快捷筛选
const quickFilter = ref('all');

// 自定义分类列表（从服务器读取）
const customCategories = ref([]);

// 自定义AI模型列表（从服务器读取）
const customAIModels = ref([]);

// 所有标签列表（从服务器读取）
const allTags = ref([]);

// 搜索模式：fuzzy(模糊) 或 exact(精确)
const searchMode = ref('fuzzy');

// 从服务器加载自定义分类
async function loadCustomCategories() {
  try {
    const response = await request({
      url: '/tools/prompt-vault/options',
      method: 'get'
    });

    if (response.code === 200) {
      customCategories.value = response.data.categories || [];
    }
  } catch (error) {
    console.error('加载自定义分类失败:', error);
  }
}

// 从服务器加载自定义AI模型
async function loadCustomAIModels() {
  try {
    const response = await request({
      url: '/tools/prompt-vault/custom-models',
      method: 'get'
    });

    if (response.code === 200) {
      customAIModels.value = response.data.models || [];
    }
  } catch (error) {
    console.error('加载自定义AI模型失败:', error);
  }
}

// 从服务器加载所有标签
async function loadAllTags() {
  try {
    const response = await request({
      url: '/tools/prompt-vault/all-tags',
      method: 'get'
    });

    if (response.code === 200) {
      allTags.value = response.data.tags || [];
    }
  } catch (error) {
    console.error('加载标签列表失败:', error);
  }
}

// 切换搜索模式
function toggleSearchMode() {
  searchMode.value = searchMode.value === 'fuzzy' ? 'exact' : 'fuzzy';
  // 如果有搜索内容，重新搜索
  if (filters.search) {
    handleSearch();
  }
}

// 筛选条件
const filters = reactive({
  search: '',
  category: '',
  aiModel: '',
  tags: '', // 标签筛选
  sort: 'updatedAt-desc' // 合并排序方式和顺序
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
  loadCustomCategories();
  loadCustomAIModels();
  loadAllTags();
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
  try {
    loading.value = true;
    // 解析排序参数
    const [sortBy, sortOrder] = filters.sort.split('-');

    // 处理搜索模式
    let searchParam = filters.search;
    if (searchParam && searchMode.value === 'exact') {
      // 精确搜索：用双引号包裹
      searchParam = `"${searchParam}"`;
    }

    const params = {
      page: pagination.page,
      limit: pagination.limit,
      folderId: currentFolderId.value,
      search: searchParam,
      category: filters.category,
      aiModel: filters.aiModel,
      tags: filters.tags, // 添加标签筛选
      sortBy: sortBy,
      sortOrder: sortOrder,
      viewMode: quickFilter.value // 使用快捷筛选代替 viewMode
    };

    const response = await promptService.getPrompts(params);
    prompts.value = response.prompts || [];
    pagination.total = response.pagination?.total || 0;
    stats.total = response.pagination?.total || 0;
    stats.totalUsage = (response.prompts || []).reduce((sum, p) => sum + (p.usageCount || 0), 0);
  } catch (error) {
    console.error('加载提示词失败:', error);
    ElMessage.error('加载提示词失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

async function loadFolders() {
  try {
    const response = await promptService.getFolderTree();
    folderTree.value = response || [];
    stats.folders = flatFolders.value.length;
  } catch (error) {
    console.error('加载文件夹失败:', error);
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

function setQuickFilter(filter) {
  quickFilter.value = filter;
  pagination.page = 1;
  loadPrompts();
}

function resetFilters() {
  filters.search = '';
  filters.category = '';
  filters.aiModel = '';
  filters.tags = '';
  filters.sort = 'updatedAt-desc';
  quickFilter.value = 'all';
  currentFolderId.value = null;
  pagination.page = 1;
  loadPrompts();
}

// 检查是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return filters.search || filters.category || filters.aiModel || filters.tags ||
    quickFilter.value !== 'all' || currentFolderId.value;
});

async function toggleFavorite(prompt) {
  try {
    const result = await promptService.toggleFavorite(prompt.id, prompt.isFavorited);

    // 更新本地状态
    prompt.isFavorited = !prompt.isFavorited;

    ElMessage.success(prompt.isFavorited ? '已添加到收藏' : '已取消收藏');

    // 如果当前是收藏筛选，需要刷新列表
    if (quickFilter.value === 'favorite') {
      loadPrompts();
    }
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message);
  }
}

function openCreatePrompt() {
  currentPrompt.value = null;
  editorVisible.value = true;
}

function openCreateFolder() {
  currentFolder.value = null;
  folderEditorVisible.value = true;
}

function editPrompt(prompt) {
  currentPrompt.value = prompt;
  editorVisible.value = true;
}

function usePrompt(prompt) {
  currentPrompt.value = prompt;
  usageVisible.value = true;
}

async function openPromptDetail(prompt) {
  try {
    // 调用后端API获取详情，后端会自动增加查看次数
    const detailData = await promptService.getPromptById(prompt.id);
    currentPrompt.value = detailData;
    usageVisible.value = true;

    // 更新列表中的查看次数
    const index = prompts.value.findIndex(p => p.id === prompt.id);
    if (index !== -1) {
      prompts.value[index].viewCount = detailData.viewCount;
    }
  } catch (error) {
    ElMessage.error('打开提示词失败: ' + error.message);
  }
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

function handlePromptSaved() {
  editorVisible.value = false;
  // 重新加载自定义分类和模型，确保新添加的选项在筛选器中可用
  loadCustomCategories();
  loadData();
}

function handlePromptUsed() {
  loadPrompts();
}

function handleFolderSaved() {
  folderEditorVisible.value = false;
  loadData();
}

function openOptionsManager() {
  // 打开管理器前，先重新加载自定义分类，确保显示最新数据
  loadCustomCategories();
  optionsManagerVisible.value = true;
}

function handleOptionsSaved() {
  // 重新加载自定义分类，更新筛选器
  loadCustomCategories();
  loadData();
}

function editFolder(folder) {
  currentFolder.value = folder;
  folderEditorVisible.value = true;
}

// 处理提示词下拉菜单操作
function handlePromptAction(command, prompt) {
  switch (command) {
    case 'stats':
      showStats(prompt);
      break;
    case 'versions':
      showVersions(prompt);
      break;
    case 'delete':
      deletePrompt(prompt);
      break;
  }
}

// 显示统计
function showStats(prompt) {
  currentPrompt.value = prompt;
  statsVisible.value = true;
}

// 显示版本历史
function showVersions(prompt) {
  currentPrompt.value = prompt;
  versionsVisible.value = true;
}

// 处理版本恢复
function handleVersionRestored(restoredPrompt) {
  versionsVisible.value = false;
  ElMessage.success('版本恢复成功，已刷新列表');
  loadData();
}

// 处理导入导出
function handleImportExport(command) {
  importExportMode.value = command;
  importExportVisible.value = true;
}

// 处理导入成功
function handleImportSuccess(result) {
  loadData();
}

// 处理导出成功
function handleExportSuccess() {
  // 导出成功后清空选中
  selectedPrompts.value = [];
}

// 提示词多选功能
function isPromptSelected(prompt) {
  return selectedPrompts.value.some(p => p.id === prompt.id);
}

function togglePromptSelection(prompt, selected) {
  if (selected) {
    if (!isPromptSelected(prompt)) {
      selectedPrompts.value.push(prompt);
    }
  } else {
    selectedPrompts.value = selectedPrompts.value.filter(p => p.id !== prompt.id);
  }
}

function clearSelection() {
  selectedPrompts.value = [];
}

function selectAll() {
  selectedPrompts.value = [...prompts.value];
}

async function deleteFolder(folder) {
  try {
    // 检查文件夹内是否有内容
    if (folder.promptCount && folder.promptCount > 0) {
      // 有内容时，询问用户如何处理
      const action = await ElMessageBox.confirm(
        h('div', { style: 'line-height: 1.8' }, [
          h('p', { style: 'margin-bottom: 12px' }, `文件夹"${folder.name}"中有 ${folder.promptCount} 个提示词`),
          h('p', { style: 'margin-bottom: 8px; font-weight: 500' }, '请选择处理方式：'),
          h('p', '• 点击"全部删除"：删除文件夹及其所有提示词'),
          h('p', '• 点击"迁移到根目录"：将提示词移到根目录后删除文件夹')
        ]),
        '删除文件夹',
        {
          confirmButtonText: '全部删除',
          cancelButtonText: '迁移到根目录',
          type: 'warning',
          distinguishCancelAndClose: true,
          closeOnClickModal: false
        }
      );

      // 用户点击"全部删除"
      await promptService.deleteFolder(folder._id, { deletePrompts: true });
      ElMessage.success('文件夹及其内容已删除');
      loadData();
    } else {
      // 空文件夹，直接删除
      await ElMessageBox.confirm(
        `确定要删除文件夹"${folder.name}"吗？`,
        '删除确认',
        {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消'
        }
      );

      await promptService.deleteFolder(folder._id);
      ElMessage.success('删除成功');
      loadData();
    }
  } catch (error) {
    if (error === 'cancel') {
      // 用户选择迁移
      try {
        await promptService.deleteFolder(folder._id, { migrateToFolderId: null });
        ElMessage.success('已将提示词迁移到根目录并删除文件夹');
        loadData();
      } catch (err) {
        ElMessage.error('迁移失败: ' + err.message);
      }
    } else if (error !== 'close') {
      ElMessage.error('删除失败: ' + error.message);
    }
  }
}

// 不再需要这个函数，因为现在直接使用中文分类
// function getCategoryLabel(category) {
//   const labels = {
//     writing: '写作',
//     coding: '编程',
//     translation: '翻译',
//     analysis: '分析',
//     creative: '创意',
//     other: '其他'
//   };
//   return labels[category] || category;
// }

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 展开所有文件夹
function expandAllFolders() {
  if (folderTreeRef.value) {
    // 获取所有节点的key
    const expandKeys = [];
    const collectKeys = (nodes) => {
      nodes.forEach(node => {
        expandKeys.push(node.id);
        if (node.children && node.children.length) {
          collectKeys(node.children);
        }
      });
    };
    collectKeys(folderTree.value);

    // 展开所有节点
    expandKeys.forEach(key => {
      folderTreeRef.value.store.nodesMap[key]?.expand();
    });
  }
}

// 折叠所有文件夹
function collapseAllFolders() {
  if (folderTreeRef.value) {
    // 获取所有节点的key
    const collapseKeys = [];
    const collectKeys = (nodes) => {
      nodes.forEach(node => {
        collapseKeys.push(node.id);
        if (node.children && node.children.length) {
          collectKeys(node.children);
        }
      });
    };
    collectKeys(folderTree.value);

    // 折叠所有节点
    collapseKeys.forEach(key => {
      folderTreeRef.value.store.nodesMap[key]?.collapse();
    });
  }
}
</script>

<style scoped lang="scss">
.prompt-vault {
  padding: 20px;
  /* 移除 max-width 限制，完全利用容器宽度 */
  width: 100%;
  background: #ffffff;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 32px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  .header-text {
    flex: 1;

    .title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #1a202c;
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
    align-items: center;
  }
}

.main-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;

  /* 超宽屏幕优化 */
  @media (min-width: 1920px) {
    grid-template-columns: 320px 1fr;
    gap: 32px;
  }
}

.sidebar {
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  // 减少树节点缩进距离
  :deep(.el-tree-node__content) {
    padding-left: 10px !important;
  }

  :deep(.el-tree-node__expand-icon) {
    padding: 4px;
  }

  .tree-node {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #2d3748;
    cursor: pointer;
    padding: 4px 0;

    .node-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .node-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .node-count {
      color: #2d3748;
      font-size: 12px;
      flex-shrink: 0;
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

  :deep(.el-card__body) {
    padding: 20px;
  }

  .filter-row-primary {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;

    .quick-filters {
      flex-shrink: 0;

      .el-button {
        padding: 8px 16px;

        .el-icon {
          margin-right: 4px;
        }

        .btn-text {
          @media (max-width: 768px) {
            display: none;
          }
        }
      }
    }

    .search-wrapper {
      flex: 1;
      min-width: 0; // 防止 flex 子项溢出

      .search-input {
        width: 100%;
      }
    }

    .reset-btn {
      flex-shrink: 0;

      .el-icon {
        margin-right: 4px;
      }

      .btn-text {
        @media (max-width: 768px) {
          display: none;
        }
      }
    }
  }

  .filter-row-secondary {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    .filter-select {
      min-width: 140px;
      flex: 1;
      max-width: 180px;

      @media (max-width: 768px) {
        min-width: 120px;
        max-width: 150px;
      }
    }

    .filter-stats {
      margin-left: auto;
      flex-shrink: 0;

      .stats-text {
        font-size: 14px;
        color: #606266;
        font-weight: 500;
      }

      @media (max-width: 768px) {
        display: none;
      }
    }
  }

  // 响应式优化
  @media (max-width: 1024px) {
    .filter-row-primary {
      flex-wrap: wrap;

      .quick-filters {
        order: 1;
        width: 100%;
        margin-bottom: 12px;

        .el-button-group {
          width: 100%;
          display: flex;

          .el-button {
            flex: 1;
          }
        }
      }

      .search-wrapper {
        order: 2;
        flex: 1;
      }

      .reset-btn {
        order: 3;
      }
    }
  }

  @media (max-width: 768px) {
    :deep(.el-card__body) {
      padding: 16px;
    }

    .filter-row-secondary {
      .filter-select {
        flex: 1 1 calc(50% - 6px);
        max-width: none;
      }
    }
  }
}

.prompt-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  margin-bottom: 20px;

  /* 响应式卡片布局优化 */
  @media (min-width: 1400px) and (max-width: 1919px) {
    /* 1400-1919px: 3-4列 */
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  @media (min-width: 1920px) and (max-width: 2559px) {
    /* 1920-2559px: 4-5列 */
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }

  @media (min-width: 2560px) {
    /* 2560px+: 5-6列 */
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 24px;
  }
}

.bulk-actions-card {
  margin-bottom: 16px;
  border: 2px solid #409eff;
  background: #ecf5ff;

  :deep(.el-card__body) {
    padding: 12px 16px;
  }

  .bulk-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .bulk-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #409eff;

      .el-icon {
        font-size: 18px;
      }
    }

    .bulk-buttons {
      display: flex;
      gap: 8px;
    }
  }
}

.prompt-card {
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  height: 100%;

  :deep(.el-card__body) {
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  &:hover {
    transform: translateY(-4px);
  }

  &.is-selected {
    border: 2px solid #409eff;
    background: #ecf5ff;
  }

  .prompt-header {
    margin-bottom: 10px;
    position: relative;

    .prompt-checkbox {
      position: absolute;
      top: -5px; // 与标题垂直对齐
      left: 0;
      z-index: 1;
    }

    .prompt-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
      padding-left: 32px; // 为复选框预留空间

      .prompt-title {
        flex: 1;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1a202c;
      }
    }

    .prompt-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #2d3748;

      .prompt-stats {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .prompt-description {
    margin: 0 0 10px;
    color: #2d3748;
    font-size: 13px;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .prompt-content-preview {
    padding: 10px;
    background: #f7fafc;
    border-radius: 4px;
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
    flex: 1;
    min-height: 60px;
    max-height: 100px;
    overflow: hidden;

    .content-text {
      font-size: 12px;
      color: #2d3748;
      font-family: monospace;
    }
  }

  .prompt-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
    min-height: 28px;
    max-height: 28px;
    overflow: hidden;
  }

  .prompt-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    margin-top: 10px;
    border-top: 1px solid #e2e8f0;
    flex-shrink: 0; // 防止压缩

    .footer-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .favorite-btn {
        font-size: 12px;
      }
    }

    .prompt-date {
      font-size: 11px;
      color: #2d3748;
    }

    .prompt-actions {
      display: flex;
      gap: 6px;
    }
  }
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0;

  :deep(.el-pagination) {

    .el-pagination__total,
    .el-pagination__jump {
      color: #2d3748;
      font-weight: 500;
    }

    .el-input__inner {
      color: #2d3748;
    }

    .btn-prev,
    .btn-next {
      background: white;
      border: 1px solid #e2e8f0;
      color: #2d3748;

      &:hover:not(:disabled) {
        color: #409eff;
        border-color: #409eff;
      }
    }

    .el-pager li {
      background: white;
      color: #2d3748;
      border: 1px solid #e2e8f0;
      margin: 0 4px;
      font-weight: 500;

      &:hover {
        color: #409eff;
        border-color: #409eff;
      }

      &.is-active {
        background: #409eff;
        color: white;
        border-color: #409eff;
      }
    }
  }
}

// 文件夹操作菜单样式
.folder-actions-menu {
  .action-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    color: #2d3748;
    transition: all 0.2s;

    &:hover {
      background: #f5f7fa;
    }

    &.danger {
      color: #f56c6c;

      &:hover {
        background: #fef0f0;
      }
    }

    .el-icon {
      font-size: 16px;
    }
  }
}
</style>
