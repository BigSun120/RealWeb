<template>
  <div class="mail-memo">
    <section class="page-header">
      <div>
        <h1 class="title">邮箱备忘录</h1>
        <p class="description">集中管理常用邮箱，支持备注、标签筛选与批量导入导出。</p>
        <div class="stats">
          <span>总计 {{ stats.total }} 个邮箱</span>
          <span>收藏 {{ stats.favorites }} 个</span>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增邮箱</el-button>
        <el-button :icon="Upload" @click="importDialogVisible = true">批量导入</el-button>
        <el-button :icon="Download" :loading="exporting" @click="handleExport">导出</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="fetchEntries">刷新</el-button>
      </div>
    </section>

    <section class="filters">
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

      <el-select v-model="filters.usage" clearable placeholder="用途" @change="handleSearch">
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

      <el-button text type="info" @click="resetFilters">重置</el-button>
    </section>

    <el-table
      v-loading="loading"
      :data="entries"
      border
      stripe
      class="mail-table"
      height="calc(100vh - 320px)"
      @sort-change="handleTableSort"
    >
      <el-table-column type="index" width="60" label="#" />
      <el-table-column prop="email" label="邮箱" min-width="200">
        <template #default="{ row }">
          <div class="email-cell">
            <span class="email-text">{{ row.email }}</span>
            <el-tag v-if="row.isFavorite" type="warning" effect="plain" size="small">收藏</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="alias" label="别名" min-width="140" />
      <el-table-column prop="usage" label="用途" min-width="120" />
      <el-table-column label="标签" min-width="200">
        <template #default="{ row }">
          <el-tag
            v-for="tag in row.tags || []"
            :key="tag"
            size="small"
            effect="plain"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
            <span v-if="!row.tags || !row.tags.length" class="empty">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="notes" label="备注" min-width="220">
        <template #default="{ row }">
          <span class="notes" :title="row.notes">{{ row.notes || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="100" sortable="custom" />
      <el-table-column prop="lastUsedAt" label="最近使用" min-width="160">
        <template #default="{ row }">
          {{ formatDate(row.lastUsedAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" min-width="160">
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <div class="action-group">
            <el-tooltip :content="row.isFavorite ? '取消收藏' : '设为收藏'">
              <el-button
                link
                type="warning"
                :icon="row.isFavorite ? StarFilled : Star"
                @click="handleToggleFavorite(row)"
              />
            </el-tooltip>
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)" />
            <el-popconfirm title="确认删除该邮箱？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" :icon="Delete" />
              </template>
            </el-popconfirm>
          </div>
        </template>
      </el-table-column>
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
        <el-button type="primary" :loading="importLoading" @click="handleImport">导入</el-button>
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
  Search
} from '@element-plus/icons-vue';

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

const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
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
  const sample = 'personal@example.com,个人邮箱,工作,常用;待办,主要工作邮箱,1,true,2024-09-01T09:00:00.000Z';
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

onMounted(async () => {
  await refreshAll();
});
</script>

<style scoped>
.mail-memo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: var(--el-bg-color);
  min-height: 100%;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.description {
  margin: 4px 0 8px;
  color: var(--el-text-color-secondary);
}

.stats {
  display: flex;
  gap: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: center;
}

.filters .el-input,
.filters .el-select {
  width: 100%;
}

.filters .el-button {
  justify-self: flex-start;
}

.mail-table {
  border-radius: 12px;
  overflow: hidden;
}

.email-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.email-text {
  font-weight: 500;
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

.action-group {
  display: flex;
  gap: 4px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0 24px;
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
</style>