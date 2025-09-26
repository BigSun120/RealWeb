<template>
  <div class="categories-management">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><FolderOpened /></el-icon>
          工具分类管理
        </h1>
        <p class="page-description">维护工具分类、排序权重与菜单展示状态</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建分类
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-card class="summary-card" v-if="summary.total > 0">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">分类总数</span>
          <span class="summary-value">{{ summary.total }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">启用中</span>
          <span class="summary-value success">{{ summary.active }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">隐藏于菜单</span>
          <span class="summary-value warning">{{ summary.hidden }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">关联工具</span>
          <span class="summary-value">{{ summary.toolTotal }}</span>
        </div>
      </div>
    </el-card>

    <el-card class="toolbar-card">
      <div class="filters">
        <el-input
          v-model="keyword"
          placeholder="搜索分类名称、描述或 ID"
          clearable
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" class="filter-select">
          <el-option label="全部状态" value="all" />
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
        <el-select v-model="menuFilter" class="filter-select">
          <el-option label="菜单显示" value="all" />
          <el-option label="显示在菜单" value="true" />
          <el-option label="隐藏" value="false" />
        </el-select>
        <el-button text type="primary" @click="resetFilters">重置筛选</el-button>
        <div class="filters-spacer" />
        <el-tag size="small" effect="plain">当前 {{ filteredCategories.length }} 条</el-tag>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="filteredCategories"
        row-key="id"
        stripe
        border
        empty-text="暂无分类"
      >
        <el-table-column label="分类信息" min-width="280">
          <template #default="{ row }">
            <div class="category-info">
              <div class="category-icon" :style="{ color: row.color }">{{ row.icon }}</div>
              <div class="category-details">
                <div class="category-name">{{ row.name }}</div>
                <div class="category-description">{{ row.description || '暂无描述' }}</div>
                <div class="category-meta">
                  <el-tag size="small" type="info">{{ row.id }}</el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="关联工具" width="140">
          <template #default="{ row }">
            <el-tag size="small" type="primary" effect="plain">
              <el-icon><Tools /></el-icon>
              <span class="tag-text">{{ row.toolCount ?? 0 }}</span>
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="排序权重" width="120">
          <template #default="{ row }">
            <span>{{ row.sortOrder }}</span>
          </template>
        </el-table-column>

        <el-table-column label="菜单展示" width="150">
          <template #default="{ row }">
            <el-switch
              v-model="row.showInMenu"
              inline-prompt
              active-text="显"
              inactive-text="隐"
              @change="updateShowInMenu(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="190">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="editCategory(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="deleteCategory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新建分类'"
      width="640px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类 ID" prop="id">
              <el-input v-model="form.id" :disabled="isEdit" placeholder="例如: web、text、dev" />
              <div class="form-tip">仅支持小写字母、数字与连接符</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序权重" prop="sortOrder">
              <el-input-number v-model="form.sortOrder" :min="0" :max="999" style="width: 100%" />
              <div class="form-tip">数值越小越靠前</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>

        <el-form-item label="分类描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="用于向使用者说明该分类的用途"
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="图标" prop="icon">
              <el-input v-model="form.icon" placeholder="请选择图标">
                <template #append>
                  <el-button @click="showIconPicker">选择</el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="主题色" prop="color">
              <el-color-picker v-model="form.color" show-alpha />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="菜单展示">
              <el-switch v-model="form.showInMenu" active-text="显示" inactive-text="隐藏" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ isEdit ? '保存修改' : '创建分类' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="iconPickerVisible" title="选择分类图标" width="520px">
      <div class="icon-grid">
        <div
          v-for="icon in commonIcons"
          :key="icon"
          class="icon-item"
          :class="{ active: selectedIcon === icon }"
          @click="selectIcon(icon)"
        >
          {{ icon }}
        </div>
      </div>
      <template #footer>
        <el-button @click="iconPickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmIcon">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { FolderOpened, Plus, Refresh, Tools, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { categoriesAPI } from '@/api/admin/tools';

const STATUS_TEXT = {
  active: '启用',
  inactive: '停用'
};

const STATUS_TAG = {
  active: 'success',
  inactive: 'info'
};

export default {
  name: 'CategoriesManagement',
  components: {
    FolderOpened,
    Plus,
    Refresh,
    Tools,
    Search
  },
  setup() {
    const formRef = ref(null);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const iconPickerVisible = ref(false);
    const isEdit = ref(false);
    const rawCategories = ref([]);
    const keyword = ref('');
    const statusFilter = ref('all');
    const menuFilter = ref('all');
    const selectedIcon = ref('');

    const commonIcons = ref([
      '📁',
      '⭐',
      '🛠',
      '⚙',
      '📝',
      '🧰',
      '🔧',
      '💡',
      '🚀',
      '📦',
      '📊',
      '🎯',
      '🧪',
      '🔒',
      '🌐',
      '🖥',
      '📸',
      '🗂',
      '🧠',
      '🧹'
    ]);

    const form = reactive({
      _id: '',
      id: '',
      name: '',
      description: '',
      icon: '🧰',
      color: '#409EFF',
      sortOrder: 0,
      showInMenu: true,
      status: 'active'
    });

    const formRules = {
      id: [
        { required: true, message: '请输入分类 ID', trigger: 'blur' },
        { pattern: /^[a-z0-9-]+$/, message: '仅支持小写字母、数字与连接符', trigger: 'blur' }
      ],
      name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
      description: [{ required: true, message: '请输入分类描述', trigger: 'blur' }]
    };

    const filteredCategories = computed(() => {
      const keywordValue = keyword.value.trim().toLowerCase();
      return [...rawCategories.value]
        .filter((category) => {
          if (statusFilter.value !== 'all' && category.status !== statusFilter.value) {
            return false;
          }
          if (menuFilter.value !== 'all') {
            const shouldShow = menuFilter.value === 'true';
            if (Boolean(category.showInMenu) !== shouldShow) {
              return false;
            }
          }
          if (!keywordValue) {
            return true;
          }
          const fields = [category.name, category.description, category.id]
            .filter(Boolean)
            .map((item) => String(item).toLowerCase());
          return fields.some((field) => field.includes(keywordValue));
        })
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    });

    const summary = computed(() => {
      const total = rawCategories.value.length;
      const active = rawCategories.value.filter((item) => item.status === 'active').length;
      const hidden = rawCategories.value.filter((item) => !item.showInMenu).length;
      const toolTotal = rawCategories.value.reduce((sum, item) => {
        return sum + (Number(item.toolCount) || 0);
      }, 0);
      return { total, active, hidden, toolTotal };
    });

    const loadCategories = async () => {
      loading.value = true;
      try {
        const response = await categoriesAPI.getCategories({
          includeCounts: true
        });
        const list = Array.isArray(response.data?.categories) ? response.data.categories : [];
        rawCategories.value = list.map((item) => ({
          ...item,
          toolCount: Number(item.toolCount ?? item.tools?.length ?? 0)
        }));
      } catch (error) {
        ElMessage.error('加载分类列表失败');
      } finally {
        loading.value = false;
      }
    };

    const refreshData = () => {
      loadCategories();
    };

    const formatDate = (value) => {
      if (!value) {
        return '-';
      }
      try {
        return new Date(value).toLocaleString();
      } catch (error) {
        return '-';
      }
    };

    const showCreateDialog = () => {
      resetForm();
      isEdit.value = false;
      dialogVisible.value = true;
    };

    const editCategory = (category) => {
      isEdit.value = true;
      dialogVisible.value = true;
      Object.assign(form, {
        _id: category._id,
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon || '🧰',
        color: category.color || '#409EFF',
        sortOrder: category.sortOrder ?? 0,
        showInMenu: category.showInMenu !== false,
        status: category.status || 'active'
      });
    };

    const resetForm = () => {
      if (formRef.value) {
        formRef.value.resetFields();
      }
      Object.assign(form, {
        _id: '',
        id: '',
        name: '',
        description: '',
        icon: '🧰',
        color: '#409EFF',
        sortOrder: 0,
        showInMenu: true,
        status: 'active'
      });
    };

    const buildPayload = () => ({
      id: form.id,
      name: form.name,
      description: form.description,
      icon: form.icon,
      color: form.color,
      sortOrder: form.sortOrder,
      showInMenu: form.showInMenu,
      status: form.status
    });

    const submitForm = async () => {
      if (!formRef.value) return;

      try {
        await formRef.value.validate();
        submitting.value = true;
        const payload = buildPayload();

        if (isEdit.value) {
          await categoriesAPI.updateCategory(form._id, payload);
          ElMessage.success('分类更新成功');
        } else {
          await categoriesAPI.createCategory(payload);
          ElMessage.success('分类创建成功');
        }

        dialogVisible.value = false;
        loadCategories();
      } catch (error) {
        if (error?.errors) {
          return;
        }
        ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
      } finally {
        submitting.value = false;
      }
    };

    const updateShowInMenu = async (category) => {
      const original = category.showInMenu;
      try {
        await categoriesAPI.updateCategory(category._id, {
          showInMenu: category.showInMenu
        });
        ElMessage.success('菜单展示状态已更新');
      } catch (error) {
        category.showInMenu = !original;
        ElMessage.error('更新失败');
      }
    };

    const deleteCategory = async (category) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除分类 “${category.name}” 吗？该操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await categoriesAPI.deleteCategory(category._id);
        ElMessage.success('分类已删除');
        loadCategories();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败');
        }
      }
    };

    const showIconPicker = () => {
      selectedIcon.value = form.icon;
      iconPickerVisible.value = true;
    };

    const selectIcon = (icon) => {
      selectedIcon.value = icon;
    };

    const confirmIcon = () => {
      form.icon = selectedIcon.value || form.icon;
      iconPickerVisible.value = false;
    };

    const resetFilters = () => {
      keyword.value = '';
      statusFilter.value = 'all';
      menuFilter.value = 'all';
    };

    const statusTagType = (status) => STATUS_TAG[status] || 'info';
    const statusText = (status) => STATUS_TEXT[status] || status || '未知状态';

    onMounted(() => {
      loadCategories();
    });

    return {
      loading,
      submitting,
      dialogVisible,
      iconPickerVisible,
      isEdit,
      keyword,
      statusFilter,
      menuFilter,
      selectedIcon,
      filteredCategories,
      summary,
      form,
      formRules,
      formRef,
      commonIcons,
      refreshData,
      formatDate,
      showCreateDialog,
      editCategory,
      resetForm,
      submitForm,
      updateShowInMenu,
      deleteCategory,
      showIconPicker,
      selectIcon,
      confirmIcon,
      resetFilters,
      statusTagType,
      statusText,
      Search
    };
  }
};
</script>

<style scoped>
.categories-management {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-card {
  border-radius: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.summary-item {
  background: #f9fafc;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-label {
  font-size: 13px;
  color: #909399;
}

.summary-value {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.summary-value.success {
  color: #52c41a;
}

.summary-value.warning {
  color: #fa8c16;
}

.toolbar-card {
  border-radius: 12px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  width: 160px;
}

.filters-spacer {
  flex: 1 1 auto;
}

.table-card {
  border-radius: 12px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.category-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f6fb;
  border-radius: 12px;
}

.category-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.category-description {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.category-meta {
  margin-top: 6px;
}

.tag-text {
  margin-left: 4px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  padding: 8px 4px;
}

.icon-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.icon-item.active {
  border-color: #409eff;
  background: #409eff;
  color: #fff;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-spacer {
    display: none;
  }
}
</style>
