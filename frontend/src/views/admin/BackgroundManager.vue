<template>
  <div class="background-manager">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon class="title-icon">
              <Picture />
            </el-icon>
            页面背景配置管理
          </h1>
          <p class="page-description">
            <span class="description-highlight">通过路径匹配为不同页面配置背景图片，支持精确匹配、前缀匹配、通配符和正则表达式</span>
          </p>
        </div>
        <div class="header-right">
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-number">{{ total }}</div>
              <div class="stat-label">总配置数</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ activeCount }}</div>
              <div class="stat-label">激活配置</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" size="default" @click="showCreateDialog = true">
            <el-icon>
              <plus />
            </el-icon>
            新增配置
          </el-button>

          <el-button type="success" size="default" @click="testCurrentPath" v-if="currentTestPath">
            <el-icon>
              <View />
            </el-icon>
            测试当前路径 ({{ currentTestPath }})
          </el-button>
        </div>

        <div class="toolbar-right">
          <div class="search-group">
            <el-input v-model="searchQuery" placeholder="搜索路径、描述..." style="width: 280px" clearable
              @input="handleSearch">
              <template #prefix>
                <el-icon>
                  <search />
                </el-icon>
              </template>
            </el-input>

            <el-select v-model="filterActive" placeholder="状态筛选" style="width: 130px" clearable @change="loadConfigs">
              <el-option label="全部" :value="null" />
              <el-option label="激活" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>

            <el-dropdown @command="handleCreateCommand">
              <el-button type="primary">
                <el-icon>
                  <Plus />
                </el-icon>
                新增配置
                <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="single">
                    <el-icon>
                      <Plus />
                    </el-icon>
                    单个新增
                  </el-dropdown-item>
                  <el-dropdown-item command="batch">
                    <el-icon>
                      <DocumentAdd />
                    </el-icon>
                    批量新增
                  </el-dropdown-item>
                  <el-dropdown-item command="import">
                    <el-icon>
                      <Upload />
                    </el-icon>
                    导入配置
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button @click="loadConfigs" :loading="loading">
              <el-icon>
                <refresh />
              </el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 配置列表 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <div class="table-title-section">
            <el-icon class="title-icon">
              <Grid />
            </el-icon>
            <span class="table-title">配置列表</span>
          </div>
          <div class="table-stats">
            <el-tag v-if="configs.length > 0" type="primary" size="small" effect="light">
              <el-icon>
                <Document />
              </el-icon>
              共 {{ total }} 条记录
            </el-tag>
            <el-tag v-if="configs.filter(c => c.isActive).length > 0" type="success" size="small" effect="light">
              <el-icon>
                <Check />
              </el-icon>
              {{configs.filter(c => c.isActive).length}} 条启用
            </el-tag>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="configs" stripe style="width: 100%"
        :empty-text="configs.length === 0 ? '暂无配置数据，点击新增配置开始使用' : '暂无数据'" class="config-table"
        :row-class-name="getRowClassName" @row-click="handleRowClick" @selection-change="handleSelectionChange"
        ref="tableRef">
        <!-- 选择列 -->
        <el-table-column type="selection" width="55" :selectable="isRowSelectable" />

        <el-table-column label="路径配置" min-width="220">
          <template #default="{ row }">
            <div class="path-config">
              <div class="path">
                <el-tag :type="getMatchTypeTagType(row.pathConfig.matchType)" size="small" effect="light"
                  class="match-type-tag">
                  <el-icon>
                    <Link />
                  </el-icon>
                  {{ getMatchTypeLabel(row.pathConfig.matchType) }}
                </el-tag>
                <code class="path-text">{{ row.pathConfig.path }}</code>
              </div>
              <div class="description" v-if="row.pathConfig.description">
                <el-icon class="desc-icon">
                  <InfoFilled />
                </el-icon>
                {{ row.pathConfig.description }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="背景图片" width="140">
          <template #default="{ row }">
            <div class="image-preview" v-if="row.backgroundImage?.url">
              <div class="image-container">
                <el-image :src="getImageUrl(row.backgroundImage.url)"
                  :preview-src-list="[getImageUrl(row.backgroundImage.url)]" fit="cover" class="preview-image"
                  :preview-teleported="true" loading="lazy" />
                <div class="image-overlay">
                  <el-icon class="preview-icon">
                    <ZoomIn />
                  </el-icon>
                </div>
              </div>
            </div>
            <div v-else class="no-image">
              <el-icon>
                <Picture />
              </el-icon>
              <span>无图片</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="优先级" width="100" sortable prop="pathConfig.priority">
          <template #default="{ row }">
            <div class="priority-cell">
              <el-tag :type="getPriorityTagType(row.pathConfig.priority)" size="small" effect="light"
                class="priority-tag">
                <el-icon>
                  <Sort />
                </el-icon>
                {{ row.pathConfig.priority }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <div class="status-cell">
              <el-switch v-model="row.isActive" @change="toggleActive(row)" :loading="row._updating" size="small"
                :active-icon="Check" :inactive-icon="Close" active-color="#67c23a" inactive-color="#f56c6c" />
              <span class="status-text" :class="{ active: row.isActive }">
                {{ row.isActive ? '启用' : '禁用' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="180" sortable prop="createdAt">
          <template #default="{ row }">
            <div class="time-cell">
              <el-icon class="time-icon">
                <Clock />
              </el-icon>
              <div class="time-info">
                <div class="date">{{ formatDate(row.createdAt) }}</div>
                <div class="relative-time">{{ getRelativeTime(row.createdAt) }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" type="primary" @click="editConfig(row)" class="action-btn">
                <el-icon>
                  <Edit />
                </el-icon>
                编辑
              </el-button>

              <el-button size="small" type="success" @click="previewConfig(row)" class="action-btn">
                <el-icon>
                  <View />
                </el-icon>
                预览
              </el-button>

              <el-popconfirm title="确定要删除这个配置吗？" @confirm="deleteConfig(row._id)" confirm-button-text="确定删除"
                cancel-button-text="取消" confirm-button-type="danger" :icon="WarningFilled" icon-color="#f56c6c">
                <template #reference>
                  <el-button size="small" type="danger" class="action-btn">
                    <el-icon>
                      <Delete />
                    </el-icon>
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 批量操作工具栏 -->
      <transition name="batch-toolbar-fade">
        <div v-if="selectedConfigs.length > 0" class="batch-toolbar">
          <div class="batch-info">
            <div class="batch-icon-wrapper">
              <el-icon class="batch-icon"><Select /></el-icon>
            </div>
            <div class="batch-text">
              <span class="batch-label">已选择</span>
              <strong class="batch-count">{{ selectedConfigs.length }}</strong>
              <span class="batch-unit">项配置</span>
            </div>
          </div>

          <div class="batch-actions">
            <div class="action-group primary-actions">
              <el-button size="small" @click="batchEnable" :disabled="!canBatchEnable" class="batch-btn enable-btn">
                <el-icon>
                  <Check />
                </el-icon>
                <span>启用</span>
              </el-button>
              <el-button size="small" @click="batchDisable" :disabled="!canBatchDisable" class="batch-btn disable-btn">
                <el-icon>
                  <Close />
                </el-icon>
                <span>禁用</span>
              </el-button>
              <el-button size="small" @click="openBatchEditDialog" class="batch-btn edit-btn">
                <el-icon>
                  <Edit />
                </el-icon>
                <span>编辑</span>
              </el-button>
            </div>

            <div class="action-group secondary-actions">
              <el-button size="small" type="danger" @click="batchDelete" class="batch-btn delete-btn">
                <el-icon>
                  <Delete />
                </el-icon>
                <span>删除</span>
              </el-button>
              <el-button size="small" @click="clearSelection" class="batch-btn cancel-btn">
                <el-icon>
                  <RefreshLeft />
                </el-icon>
                <span>取消</span>
              </el-button>
            </div>
          </div>
        </div>
      </transition>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" @size-change="loadConfigs"
          @current-change="loadConfigs" />
      </div>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <background-config-dialog v-model="showCreateDialog" :config="editingConfig" @success="handleDialogSuccess" />

    <!-- 预览对话框 -->
    <background-preview-dialog v-model="showPreviewDialog" :config="previewingConfig" />

    <!-- 批量编辑对话框 -->
    <batch-edit-dialog v-model="showBatchEditDialog" :selected-configs="selectedConfigs"
      @success="handleBatchEditSuccess" />

    <!-- 批量新增对话框 -->
    <batch-create-dialog v-model="showBatchCreateDialog" @success="handleBatchCreateSuccess" />

    <!-- 导入配置对话框 -->
    <import-config-dialog v-model="showImportDialog" @success="handleImportSuccess" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';
import {
  Plus, Delete, Search, Refresh, Edit, View, Picture,
  Grid, Document, Check, Link, InfoFilled, ZoomIn,
  Sort, Close, Clock, WarningFilled, ArrowDown,
  DocumentAdd, Upload, CopyDocument, Select, Download,
  RefreshLeft
} from '@element-plus/icons-vue';
import {
  getBackgroundConfigs,
  getBackgroundByPath,
  deleteBackgroundConfig,
  updateBackgroundConfig,
  getMatchTypeLabel,
  batchToggleBackgroundConfigs,
  batchDeleteBackgroundConfigs
} from '@/api/backgrounds';
import { getImageUrl } from '@/utils/imageUrl';
import BackgroundConfigDialog from '@/components/admin/BackgroundConfigDialog.vue';
import BackgroundPreviewDialog from '@/components/admin/BackgroundPreviewDialog.vue';
import BatchEditDialog from '@/components/admin/BatchEditDialog.vue';
import BatchCreateDialog from '@/components/admin/BatchCreateDialog.vue';
import ImportConfigDialog from '@/components/admin/ImportConfigDialog.vue';

// 响应式数据
const loading = ref(false);
const configs = ref([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const searchQuery = ref('');
const filterActive = ref(null);

// 对话框状态
const showCreateDialog = ref(false);
const showPreviewDialog = ref(false);
const editingConfig = ref(null);
const previewingConfig = ref(null);

// 批量操作相关
const selectedConfigs = ref([]);
const tableRef = ref(null);
const showBatchEditDialog = ref(false);
const showBatchCreateDialog = ref(false);
const showImportDialog = ref(false);

// 路由和测试
const route = useRoute();
const currentTestPath = computed(() => {
  return route.path.startsWith('/admin') ? '/auth/login' : route.path;
});

// 统计数据
const activeCount = computed(() => {
  return configs.value.filter(config => config.isActive).length;
});

// 批量操作计算属性
const canBatchEnable = computed(() => {
  return selectedConfigs.value.some(config => !config.isActive);
});

const canBatchDisable = computed(() => {
  return selectedConfigs.value.some(config => config.isActive);
});

// 搜索防抖
let searchTimeout = null;

// 方法
const loadConfigs = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value || undefined,
      isActive: filterActive.value
    };

    const response = await getBackgroundConfigs(params);

    if (response.data.success) {
      configs.value = response.data.data.configs;
      total.value = response.data.data.pagination.total;
    }
  } catch (error) {
    ElMessage.error('加载配置列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadConfigs();
  }, 500);
};



const editConfig = (config) => {
  if (!config) {
    ElMessage.error('配置数据无效');
    return;
  }

  // 深拷贝配置对象，避免引用问题
  editingConfig.value = JSON.parse(JSON.stringify(config));
  showCreateDialog.value = true;
};

const previewConfig = (config) => {
  if (!config) {
    ElMessage.error('配置数据无效');
    return;
  }

  // 深拷贝配置对象，避免引用问题
  previewingConfig.value = JSON.parse(JSON.stringify(config));
  showPreviewDialog.value = true;
};

const toggleActive = async (config) => {
  config._updating = true;
  try {
    await updateBackgroundConfig(config._id, {
      isActive: config.isActive
    });

    ElMessage.success(`配置已${config.isActive ? '激活' : '停用'}`);
  } catch (error) {
    config.isActive = !config.isActive; // 回滚状态
    ElMessage.error('更新配置状态失败');
  } finally {
    config._updating = false;
  }
};

const deleteConfig = async (id) => {
  try {
    await deleteBackgroundConfig(id);
    ElMessage.success('配置删除成功');
    loadConfigs();
  } catch (error) {
    ElMessage.error('删除配置失败');
  }
};

const testCurrentPath = async () => {
  try {
    const response = await getBackgroundByPath(currentTestPath.value);
    if (response.data.success && response.data.data) {
      ElMessage.success(`路径 "${currentTestPath.value}" 匹配到配置: ${response.data.data.pathConfig.path}`);
    } else {
      ElMessage.warning(`路径 "${currentTestPath.value}" 未匹配到任何配置`);
    }
  } catch (error) {
    ElMessage.error('测试路径失败');
  }
};



const handleDialogSuccess = () => {
  showCreateDialog.value = false;
  editingConfig.value = null;
  loadConfigs();
};

// 工具方法
const getMatchTypeTagType = (matchType) => {
  const types = {
    exact: 'success',
    prefix: 'primary',
    wildcard: 'warning',
    regex: 'danger'
  };
  return types[matchType] || 'info';
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPriorityTagType = (priority) => {
  if (priority >= 90) return 'danger';
  if (priority >= 70) return 'warning';
  if (priority >= 50) return 'primary';
  return 'info';
};

const getRowClassName = ({ row }) => {
  return row.isActive ? 'active-row' : 'inactive-row';
};

const handleRowClick = (row) => {
  // 可以添加行点击事件，比如展开详情
};

const getRelativeTime = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
};

// 批量操作方法
const handleSelectionChange = (selection) => {
  selectedConfigs.value = selection;
};

const isRowSelectable = (row) => {
  return true; // 所有行都可选择
};

const clearSelection = () => {
  if (tableRef.value) {
    tableRef.value.clearSelection();
  }
  selectedConfigs.value = [];
};

const handleCreateCommand = (command) => {
  switch (command) {
    case 'single':
      showCreateDialog.value = true;
      editingConfig.value = null; // 确保是新增模式
      break;
    case 'batch':
      showBatchCreateDialog.value = true;
      break;
    case 'import':
      showImportDialog.value = true;
      break;
  }
};

const batchEnable = async () => {
  const disabledConfigs = selectedConfigs.value.filter(config => !config.isActive);
  if (disabledConfigs.length === 0) {
    ElMessage.warning('没有需要启用的配置');
    return;
  }

  try {
    const ids = disabledConfigs.map(config => config._id);
    const response = await batchToggleBackgroundConfigs(ids, true);

    if (response.data.success) {
      ElMessage.success(`已启用 ${response.data.data.updated} 个配置`);
      loadConfigs();
    } else {
      ElMessage.error(response.data.message || '批量启用失败');
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '批量启用失败');
  }
};

const batchDisable = async () => {
  const enabledConfigs = selectedConfigs.value.filter(config => config.isActive);
  if (enabledConfigs.length === 0) {
    ElMessage.warning('没有需要禁用的配置');
    return;
  }

  try {
    const ids = enabledConfigs.map(config => config._id);
    const response = await batchToggleBackgroundConfigs(ids, false);

    if (response.data.success) {
      ElMessage.success(`已禁用 ${response.data.data.updated} 个配置`);
      loadConfigs();
    } else {
      ElMessage.error(response.data.message || '批量禁用失败');
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '批量禁用失败');
  }
};



const batchDelete = async () => {
  if (selectedConfigs.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedConfigs.value.length} 个配置吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );

    const ids = selectedConfigs.value.map(config => config._id);
    const response = await batchDeleteBackgroundConfigs(ids);

    if (response.data.success) {
      ElMessage.success(`已删除 ${response.data.data.deleted} 个配置`);
      loadConfigs();
      clearSelection();
    } else {
      ElMessage.error(response.data.message || '批量删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '批量删除失败');
    }
  }
};

const handleBatchEditSuccess = () => {
  loadConfigs();
  showBatchEditDialog.value = false;
};

const handleBatchCreateSuccess = () => {
  loadConfigs();
  showBatchCreateDialog.value = false;
};

const handleImportSuccess = () => {
  loadConfigs();
  showImportDialog.value = false;
};

const openBatchEditDialog = () => {
  if (selectedConfigs.value.length === 0) {
    ElMessage.warning('请先选择要编辑的配置');
    return;
  }
  showBatchEditDialog.value = true;
};

// 生命周期
onMounted(() => {
  loadConfigs();
});
</script>

<style scoped>
.background-manager {
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 24px;
  background: linear-gradient(135deg, #e55a4f 0%, #d2691e 100%);
  border-radius: 12px;
  padding: 32px;
  color: white;
  box-shadow: 0 8px 32px rgba(229, 90, 79, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
  opacity: 0.9;
}

.page-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.9;
  max-width: 600px;
}

.description-highlight {
  color: white;
  font-weight: 500;
}

.header-right {
  margin-left: 32px;
}

.stats-cards {
  display: flex;
  gap: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  min-width: 120px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.toolbar-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.search-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.table-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #409eff;
  font-size: 20px;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.table-stats {
  display: flex;
  gap: 8px;
  align-items: center;
}

.config-table {
  border-radius: 8px;
  overflow: hidden;
}

.config-table :deep(.el-table__row) {
  transition: all 0.3s ease;
}

.config-table :deep(.el-table__row:hover) {
  background-color: #f8f9ff !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.config-table :deep(.active-row) {
  background-color: #f0f9ff;
}

.config-table :deep(.inactive-row) {
  background-color: #fafafa;
  opacity: 0.8;
}

.path-config .path {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.match-type-tag {
  font-weight: 500;
}

.path-text {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  border: 1px solid #dee2e6;
  color: #495057;
  font-weight: 500;
}

.description {
  font-size: 12px;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 4px;
}

.desc-icon {
  color: #6c757d;
  font-size: 12px;
}

.image-preview {
  display: flex;
  justify-content: center;
}

.image-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.image-container:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.preview-image {
  width: 90px;
  height: 50px;
  border-radius: 8px;
  cursor: pointer;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .image-overlay {
  opacity: 1;
}

.preview-icon {
  color: white;
  font-size: 20px;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #999;
  font-size: 12px;
  padding: 16px 8px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #dee2e6;
}

.priority-cell {
  display: flex;
  justify-content: center;
}

.priority-tag {
  font-weight: 600;
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.status-text {
  font-size: 12px;
  color: #909399;
  transition: color 0.3s ease;
}

.status-text.active {
  color: #67c23a;
  font-weight: 500;
}

.time-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-icon {
  color: #909399;
  font-size: 14px;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.relative-time {
  font-size: 11px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.action-btn {
  transition: all 0.3s ease;
  border-radius: 6px;
  font-weight: 500;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 批量操作栏动画 */
.batch-toolbar-fade-enter-active,
.batch-toolbar-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.batch-toolbar-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.batch-toolbar-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #e55a4f 0%, #d2691e 100%);
  border-radius: 16px;
  margin: 20px 0;
  color: white;
  box-shadow: 0 8px 32px rgba(229, 90, 79, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
}

.batch-toolbar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.batch-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.batch-icon {
  font-size: 20px;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.batch-text {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.batch-label {
  font-weight: 400;
  opacity: 0.9;
}

.batch-count {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.batch-unit {
  font-weight: 400;
  opacity: 0.9;
}

.batch-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.action-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.primary-actions {
  padding-right: 16px;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.batch-btn {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: white !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  font-weight: 500 !important;
  border-radius: 10px !important;
  padding: 8px 16px !important;
  backdrop-filter: blur(10px) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  min-width: 80px !important;
}

.batch-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
}

.batch-btn.is-disabled {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.4) !important;
  transform: none !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
}

.batch-btn .el-icon {
  margin-right: 6px;
}

.enable-btn:hover {
  background: rgba(103, 194, 58, 0.3) !important;
  border-color: rgba(103, 194, 58, 0.5) !important;
}

.disable-btn:hover {
  background: rgba(245, 108, 108, 0.3) !important;
  border-color: rgba(245, 108, 108, 0.5) !important;
}

.edit-btn:hover {
  background: rgba(64, 158, 255, 0.3) !important;
  border-color: rgba(64, 158, 255, 0.5) !important;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.2) !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.4) !important;
  border-color: rgba(239, 68, 68, 0.6) !important;
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3) !important;
}

.cancel-btn:hover {
  background: rgba(144, 147, 153, 0.3) !important;
  border-color: rgba(144, 147, 153, 0.5) !important;
}

.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  padding: 16px 0;
  background: #fafbfc;
  border-radius: 8px;
  margin-left: -24px;
  margin-right: -24px;
}
</style>
