<template>
  <div class="mail-memo">
    <section class="page-header">
      <div class="header-text">
        <h1 class="title">邮箱备忘录</h1>
        <p class="description">集中整理个人邮箱地址与备注，快速筛选常用联系人并完成批量导入导出。</p>
        <div class="stats-line">
          <span>共 {{ stats.total }} 个邮箱</span>
          <span>收藏 {{ stats.favorites }} 个</span>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" plain :icon="Plus" @click="openCreate">新增邮箱</el-button>
        <el-button :icon="Upload" @click="importDialogVisible = true">批量导入</el-button>
        <el-button :icon="Download" :loading="exporting" @click="handleExport">导出列表</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
      </div>
    </section>

    <section class="overview">
      <el-card v-for="metric in overviewMetrics" :key="metric.label" class="overview-card" shadow="hover">
        <div class="metric">
          <div class="metric-icon" :class="metric.type">
            <el-icon><component :is="metric.icon" /></el-icon>
          </div>
          <div class="metric-content">
            <span class="metric-label">{{ metric.label }}</span>
            <span class="metric-value">{{ metric.value }}</span>
            <span class="metric-sub">{{ metric.sub }}</span>
          </div>
        </div>
      </el-card>
    </section>

    <el-card class="filter-card" shadow="never">
      <div class="filter-grid">
        <el-input
          v-model.trim="filters.keyword"
          placeholder="搜索邮箱 / 别名 / 备注"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #suffix>
            <el-icon class="clickable" @click="handleSearch">
              <Search />
            </el-icon>
          </template>
        </el-input>

        <el-select v-model="filters.usage" clearable placeholder="用途" filterable @change="handleSearch">
          <el-option v-for="item in usageOptions" :key="item" :label="item" :value="item" />
        </el-select>

        <el-select v-model="filters.tag" clearable placeholder="标签" filterable @change="handleSearch">
          <el-option v-for="item in tagOptions" :key="item" :label="item" :value="item" />
        </el-select>

        <el-select v-model="filters.favorite" @change="handleSearch">
          <el-option label="全部" value="all" />
          <el-option label="已收藏" value="true" />
          <el-option label="未收藏" value="false" />
        </el-select>

        <el-select v-model="filters.sort" @change="handleSearch">
          <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>

        <el-select v-model="filters.order" @change="handleSearch">
          <el-option label="降序" value="desc" />
          <el-option label="升序" value="asc" />
        </el-select>

        <div class="filter-actions">
          <el-link type="primary" :underline="false" @click="resetFilters">重置筛选</el-link>
        </div>
      </div>
    </el-card>

    <el-card class="table-card" shadow="hover">
      <div class="table-toolbar">
        <div class="toolbar-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>收藏项会高亮显示，优先级 ≥ 2 视为高优。</span>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="entries"
        border
        stripe
        class="mail-table"
        height="calc(100vh - 360px)"
        @sort-change="handleTableSort"
        :row-class-name="tableRowClassName"
      >
        <el-table-column type="index" width="60" label="#" />
        <el-table-column prop="email" label="邮箱" min-width="220" sortable="custom">
          <template #default="{ row }">
            <div class="email-cell">
              <span class="email-text">{{ row.email }}</span>
              <el-tag v-if="row.isFavorite" size="small" type="warning" effect="light">收藏</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="alias" label="别名" min-width="150">
          <template #default="{ row }">
            <span class="alias" :title="row.alias">{{ row.alias || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="usage" label="用途" min-width="140">
          <template #default="{ row }">
            <el-tag v-if="row.usage" size="small" effect="plain">{{ row.usage }}</el-tag>
            <span v-else class="empty">—</span>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="220">
          <template #default="{ row }">
            <template v-if="row.tags && row.tags.length">
              <el-tag
                v-for="tag in row.tags"
                :key="tag"
                size="small"
                class="tag-item"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </template>
            <span v-else class="empty">—</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="120" sortable="custom" prop="priority">
          <template #default="{ row }">
            <el-tag :type="priorityTagType(row.priority)" effect="dark" size="small">
              {{ formatPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="240">
          <template #default="{ row }">
            <span class="notes" :title="row.notes">{{ row.notes || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastUsedAt" label="最近使用" min-width="180" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="isRecentlyUsed(row.lastUsedAt)" type="success" size="small" effect="plain">近 7 天</el-tag>
            <span class="timestamp">{{ formatDate(row.lastUsedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="180" sortable="custom">
          <template #default="{ row }">
            <span class="timestamp">{{ formatDate(row.updatedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-tooltip :content="row.isFavorite ? '取消收藏' : '设为收藏'">
                <el-button
                  circle
                  :type="row.isFavorite ? 'warning' : 'info'"
                  plain
                  :icon="row.isFavorite ? StarFilled : Star"
                  @click="handleToggleFavorite(row)"
                />
              </el-tooltip>
              <el-tooltip content="编辑">
                <el-button circle type="primary" plain :icon="Edit" @click="openEdit(row)" />
              </el-tooltip>
              <el-popconfirm title="确认删除该邮箱？" width="220" @confirm="handleDelete(row)">
                <template #reference>
                  <el-button circle type="danger" plain :icon="Delete" />
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无匹配的邮箱">
            <el-button type="primary" @click="openCreate">立即新增</el-button>
          </el-empty>
        </template>
      </el-table>

      <footer class="table-footer">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, prev, pager, next, jumper, sizes"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </footer>
    </el-card>

    <MailMemoForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model-value="editingEntry"
      :tag-options="tagOptions"
      :usage-options="usageOptions"
      :loading="formLoading"
      @submit="handleSubmit"
    />

    <el-dialog
      v-model="importDialogVisible"
      title="批量导入"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-alert
        type="info"
        show-icon
        title="支持 CSV (UTF-8) 文件，字段：email, alias, usage, tags, notes, priority, isFavorite, lastUsedAt"
        class="mb-16"
      />

      <el-upload
        drag
        :before-upload="beforeUpload"
        :auto-upload="false"
        :on-remove="onRemoveFile"
        :file-list="fileList"
        accept=".csv"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将 CSV 拖到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">每次仅导入一个文件，最大 2MB。</div>
        </template>
      </el-upload>

      <div class="import-options">
        <span>冲突策略：</span>
        <el-radio-group v-model="importStrategy">
          <el-radio-button label="skip">跳过重复</el-radio-button>
          <el-radio-button label="overwrite">覆盖重复</el-radio-button>
        </el-radio-group>
        <el-button text size="small" @click="downloadTemplate">下载模板</el-button>
      </div>

      <el-alert
        v-if="importResult"
        type="success"
        show-icon
        :title="`新增 ${importResult.summary.created} 条，更新 ${importResult.summary.updated} 条，跳过 ${importResult.summary.skipped} 条`"
        :closable="false"
        class="mt-16"
      >
        <template #default>
          <div v-if="importResult.summary.errors.length" class="error-list">
            <div v-for="item in importResult.summary.errors" :key="item.line">第 {{ item.line }} 行：{{ item.message }}</div>
          </div>
        </template>
      </el-alert>

      <template #footer>
        <el-button @click="closeImportDialog">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getMailMemoEntries,
  createMailMemoEntry,
  updateMailMemoEntry,
  deleteMailMemoEntry,
  toggleFavoriteMailMemoEntry,
  getMailMemoMeta,
  importMailMemoEntries,
  exportMailMemoEntries
} from '@/api/mailMemo';
import MailMemoForm from './components/MailMemoForm.vue';
import {
  Plus,
  Upload,
  Download,
  Refresh,
  Star,
  StarFilled,
  Edit,
  Delete,
  UploadFilled,
  Search,
  Collection,
  Timer,
  TrendCharts,
  InfoFilled
} from '@element-plus/icons-vue';

const RECENT_DAYS = 7;

const entries = ref([]);
const loading = ref(false);
const exporting = ref(false);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

const filters = reactive({
  keyword: '',
  usage: '',
  tag: '',
  favorite: 'all',
  sort: 'updatedAt',
  order: 'desc'
});

const sortOptions = [
  { label: '更新时间', value: 'updatedAt' },
  { label: '创建时间', value: 'createdAt' },
  { label: '别名', value: 'alias' },
  { label: '邮箱', value: 'email' },
  { label: '用途', value: 'usage' },
  { label: '优先级', value: 'priority' },
  { label: '最近使用', value: 'lastUsedAt' }
];

const stats = reactive({ total: 0, favorites: 0 });
const tagOptions = ref([]);
const usageOptions = ref([]);

const formVisible = ref(false);
const formMode = ref('create');
const formLoading = ref(false);
const editingEntry = ref(null);

const importDialogVisible = ref(false);
const importLoading = ref(false);
const importFile = ref(null);
const importStrategy = ref('skip');
const importResult = ref(null);

const fileList = computed(() => {
  if (!importFile.value) return [];
  return [{
    name: importFile.value.name,
    status: 'ready',
    size: importFile.value.size,
    percentage: 0,
    raw: importFile.value,
    uid: 'mail-memo-import'
  }];
});

const overviewMetrics = computed(() => {
  const total = stats.total || 0;
  const favorites = stats.favorites || 0;
  const favoriteRate = total ? Math.round((favorites / total) * 100) : 0;
  const recentThreshold = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const recentCount = entries.value.filter(item => item.lastUsedAt && new Date(item.lastUsedAt).getTime() >= recentThreshold).length;
  const highPriority = entries.value.filter(item => Number.isFinite(item.priority) && item.priority >= 2).length;

  return [
    { label: '全部邮箱', value: total, sub: `${favorites} 个收藏`, icon: Collection, type: 'primary' },
    { label: '收藏占比', value: `${favoriteRate}%`, sub: '优先常用一览', icon: StarFilled, type: 'warning' },
    { label: '最近使用', value: recentCount, sub: `近 ${RECENT_DAYS} 天`, icon: Timer, type: 'success' },
    { label: '高优条目', value: highPriority, sub: '优先级 ≥ 2', icon: TrendCharts, type: 'accent' }
  ];
});

const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const min = `${date.getMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const buildQuery = () => ({
  keyword: filters.keyword || undefined,
  usage: filters.usage || undefined,
  tag: filters.tag || undefined,
  favorite: filters.favorite === 'all' ? undefined : filters.favorite,
  sort: filters.sort,
  order: filters.order,
  page: pagination.current,
  limit: pagination.pageSize
});

const fetchMeta = async () => {
  try {
    const res = await getMailMemoMeta();
    tagOptions.value = res.data?.tags || [];
    usageOptions.value = res.data?.usages || [];
    stats.total = res.data?.stats?.total || 0;
    stats.favorites = res.data?.stats?.favorites || 0;
  } catch (error) {
    console.error(error);
  }
};

const fetchEntries = async () => {
  try {
    loading.value = true;
    const res = await getMailMemoEntries(buildQuery());
    entries.value = res.data?.items || [];
    pagination.total = res.data?.pagination?.totalItems || 0;
    pagination.current = res.data?.pagination?.current || 1;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([fetchEntries(), fetchMeta()]);
};

const handleSearch = () => {
  pagination.current = 1;
  fetchEntries();
};

const resetFilters = () => {
  filters.keyword = '';
  filters.usage = '';
  filters.tag = '';
  filters.favorite = 'all';
  filters.sort = 'updatedAt';
  filters.order = 'desc';
  pagination.current = 1;
  fetchEntries();
};

const handleTableSort = ({ prop, order }) => {
  if (!prop) return;
  filters.sort = prop;
  filters.order = order === 'ascending' ? 'asc' : 'desc';
  pagination.current = 1;
  fetchEntries();
};

const handlePageChange = page => {
  pagination.current = page;
  fetchEntries();
};

const handleSizeChange = size => {
  pagination.pageSize = size;
  pagination.current = 1;
  fetchEntries();
};

const openCreate = () => {
  formMode.value = 'create';
  editingEntry.value = null;
  formVisible.value = true;
};

const openEdit = row => {
  formMode.value = 'edit';
  editingEntry.value = { ...row };
  formVisible.value = true;
};

const handleSubmit = async payload => {
  try {
    formLoading.value = true;
    if (formMode.value === 'create') {
      await createMailMemoEntry(payload);
      ElMessage.success('新增成功');
    } else if (editingEntry.value?._id) {
      await updateMailMemoEntry(editingEntry.value._id, payload);
      ElMessage.success('更新成功');
    }
    formVisible.value = false;
    await refreshAll();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '保存失败');
  } finally {
    formLoading.value = false;
  }
};

const handleDelete = async row => {
  try {
    await deleteMailMemoEntry(row._id);
    ElMessage.success('删除成功');
    await refreshAll();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除失败');
  }
};

const handleToggleFavorite = async row => {
  try {
    await toggleFavoriteMailMemoEntry(row._id);
    await refreshAll();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const beforeUpload = file => {
  const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
  if (!isCsv) {
    ElMessage.error('仅支持 CSV 文件');
    return false;
  }
  importFile.value = file;
  importResult.value = null;
  return false;
};

const onRemoveFile = () => {
  importFile.value = null;
  importResult.value = null;
};

const closeImportDialog = () => {
  importDialogVisible.value = false;
  importLoading.value = false;
  importFile.value = null;
  importResult.value = null;
  importStrategy.value = 'skip';
};

const handleImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请选择 CSV 文件');
    return;
  }
  try {
    importLoading.value = true;
    const formData = new FormData();
    formData.append('file', importFile.value);
    formData.append('strategy', importStrategy.value);
    const res = await importMailMemoEntries(formData);
    importResult.value = res.data;
    ElMessage.success(res.message || '导入完成');
    await refreshAll();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '导入失败');
  } finally {
    importLoading.value = false;
  }
};

const downloadTemplate = () => {
  const headers = 'email,alias,usage,tags,notes,priority,isFavorite,lastUsedAt\r\n';
  const sample = 'personal@example.com,个人邮箱,工作,常用;备忘,主要使用邮箱,1,true,2024-09-01T09:00:00.000Z';
  const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mail-memo-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const handleExport = async () => {
  try {
    exporting.value = true;
    const res = await exportMailMemoEntries({
      scope:
        filters.keyword || filters.tag || filters.usage || filters.favorite !== 'all' ? 'filtered' : 'all',
      ...buildQuery()
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const disposition = res.headers['content-disposition'] || res.headers['Content-Disposition'];
    let filename = 'mail-memo.csv';
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
};

const tableRowClassName = ({ row }) => {
  if (row?.isFavorite) return 'row-favorite';
  if (Number.isFinite(row?.priority) && row.priority >= 2) return 'row-priority';
  return '';
};

const priorityTagType = priority => {
  if (priority >= 3) return 'danger';
  if (priority >= 2) return 'warning';
  if (priority === 1) return 'warning';
  if (priority <= -2) return 'info';
  return priority === 0 ? 'default' : 'info';
};

const formatPriorityLabel = priority => {
  if (!Number.isFinite(priority)) return '0';
  if (priority > 0) return `+${priority}`;
  return `${priority}`;
};

const isRecentlyUsed = value => {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  const threshold = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  return time >= threshold;
};

onMounted(async () => {
  await refreshAll();
});
</script>

<style scoped>
.mail-memo {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 40%);
  min-height: 100%;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 520px;
}

.title {
  font-size: 26px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.description {
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.stats-line {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--el-color-info);
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.overview-card {
  border-radius: 14px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-white);
}

.metric-icon.primary {
  background: var(--el-color-primary);
}

.metric-icon.warning {
  background: var(--el-color-warning);
}

.metric-icon.success {
  background: var(--el-color-success);
}

.metric-icon.accent {
  background: var(--el-color-info);
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.metric-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.metric-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.filter-card {
  border-radius: 16px;
  padding: 12px 16px 4px;
  background: rgba(255, 255, 255, 0.9);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: center;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 4px;
}

.table-card {
  border-radius: 18px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.95);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toolbar-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.mail-table {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.mail-table .el-table__header th) {
  background: #f2f6ff;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.email-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.email-text {
  font-weight: 500;
}

.alias {
  color: var(--el-text-color-secondary);
}

.tag-item {
  margin-right: 6px;
  margin-bottom: 4px;
}

.empty {
  color: var(--el-text-color-placeholder);
}

.notes {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timestamp {
  color: var(--el-text-color-secondary);
  margin-left: 6px;
}

.action-group {
  display: flex;
  gap: 6px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 4px;
}

.row-favorite :deep(td) {
  background: rgba(255, 229, 178, 0.35) !important;
}

.row-priority :deep(td) {
  background: rgba(64, 158, 255, 0.15) !important;
}

.import-options {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.error-list {
  margin-top: 12px;
  font-size: 13px;
  color: var(--el-color-danger);
  line-height: 1.6;
}

.mb-16 {
  margin-bottom: 16px;
}

.mt-16 {
  margin-top: 16px;
}

.clickable {
  cursor: pointer;
}

@media (max-width: 768px) {
  .mail-memo {
    padding: 20px;
  }

  .table-card {
    padding: 12px;
  }

  .table-footer {
    justify-content: center;
  }
}
</style>
