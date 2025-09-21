<template>
  <div class="categories-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><FolderOpened /></el-icon>
          分类管理
        </h1>
        <p class="page-description">管理工具分类的层级结构和配置</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新增分类
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 分类树形表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="categories"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :default-expand-all="false"
      >
        <el-table-column label="分类信息" min-width="250">
          <template #default="{ row }">
            <div class="category-info">
              <div class="category-icon" :style="{ color: row.color }">
                {{ row.icon }}
              </div>
              <div class="category-details">
                <div class="category-name">{{ row.name }}</div>
                <div class="category-description">{{ row.description }}</div>
                <div class="category-path">{{ row.path }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="ID" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.id }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="工具数量" width="100">
          <template #default="{ row }">
            <el-badge
              :value="row.toolCount ?? row.tools?.length ?? 0"
              :show-zero="true"
              :offset="[8, 6]"
              class="tool-count-badge"
            >
              <el-icon><Tools /></el-icon>
            </el-badge>
          </template>
        </el-table-column>

        <el-table-column label="排序" width="80">
          <template #default="{ row }">
            {{ row.sortOrder }}
          </template>
        </el-table-column>

        <el-table-column label="显示菜单" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.showInMenu" @change="updateShowInMenu(row)" />
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editCategory(row)"> 编辑 </el-button>
            <el-button size="small" @click="addSubCategory(row)"> 添加子分类 </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteCategory(row)"
              :disabled="row.children && row.children.length > 0"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑分类对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="分类ID" prop="id">
          <el-input v-model="form.id" :disabled="isEdit" placeholder="唯一标识符，如：web、text" />
          <div class="form-tip">只能包含小写字母、数字和连字符</div>
        </el-form-item>

        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="分类显示名称" />
        </el-form-item>

        <el-form-item label="分类描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="分类功能描述"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="图标" prop="icon">
              <el-input v-model="form.icon" placeholder="🔧">
                <template #append>
                  <el-button @click="showIconPicker">选择</el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="颜色" prop="color">
              <el-color-picker v-model="form.color" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序权重" prop="sortOrder">
              <el-input-number v-model="form.sortOrder" :min="0" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="父分类" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="categoryTreeOptions"
            :props="{ label: 'name', value: 'id' }"
            placeholder="选择父分类（可选）"
            clearable
            check-strictly
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item>
              <el-checkbox v-model="form.showInMenu">在菜单中显示</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio label="active">启用</el-radio>
                <el-radio label="inactive">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 图标选择器对话框 -->
    <el-dialog v-model="iconPickerVisible" title="选择图标" width="500px">
      <div class="icon-grid">
        <div
          v-for="icon in commonIcons"
          :key="icon"
          class="icon-item"
          :class="{ active: form.icon === icon }"
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
import { FolderOpened, Plus, Refresh, Tools } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { categoriesAPI } from '@/api/admin/tools';

export default {
  name: 'CategoriesManagement',
  components: {
    FolderOpened,
    Plus,
    Refresh,
    Tools
  },
  setup() {
    const formRef = ref(null);

    // 响应式数据
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const iconPickerVisible = ref(false);
    const isEdit = ref(false);

    const categories = ref([]);
    const selectedIcon = ref('');

    // 常用图标
    const commonIcons = ref([
      '🌐',
      '✏️',
      '🖼️',
      '⚙️',
      '🔧',
      '📁',
      '📊',
      '🎨',
      '📱',
      '💻',
      '🔗',
      '📝',
      '🗜️',
      '🔄',
      '⏰',
      '🧮',
      '📄',
      '🎯',
      '🔍',
      '📦'
    ]);

    // 表单数据
    const form = reactive({
      id: '',
      name: '',
      description: '',
      icon: '📁',
      color: '#409EFF',
      parentId: null,
      sortOrder: 0,
      showInMenu: true,
      status: 'active'
    });

    // 表单验证规则
    const formRules = {
      id: [
        { required: true, message: '请输入分类ID', trigger: 'blur' },
        { pattern: /^[a-z0-9-]+$/, message: 'ID只能包含小写字母、数字和连字符', trigger: 'blur' }
      ],
      name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
      description: [{ required: true, message: '请输入分类描述', trigger: 'blur' }]
    };

    // 计算属性
    const categoryTreeOptions = computed(() => {
      const buildTree = (items, parentId = null) => {
        return items
          .filter(item => item.parentId === parentId && item.id !== form.id)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id)
          }));
      };
      return buildTree(categories.value);
    });

    // 方法
    const loadCategories = async () => {
      loading.value = true;
      try {
        const response = await categoriesAPI.getCategories({
          includeCounts: true,
          includeTools: true
        });
        categories.value = buildCategoryTree(response.data.categories);
      } catch (error) {
        ElMessage.error('加载分类列表失败');
      } finally {
        loading.value = false;
      }
    };

    const buildCategoryTree = items => {
      const itemMap = new Map();
      const rootItems = [];

      // 创建映射
      items.forEach(item => {
        itemMap.set(item.id, { ...item, children: [] });
      });

      // 构建树结构
      items.forEach(item => {
        const itemData = itemMap.get(item.id);
        if (item.parentId) {
          const parent = itemMap.get(item.parentId);
          if (parent) {
            parent.children.push(itemData);
          }
        } else {
          rootItems.push(itemData);
        }
      });

      return rootItems;
    };

    const refreshData = () => {
      loadCategories();
    };

    const formatDate = date => {
      return new Date(date).toLocaleString();
    };

    const showCreateDialog = () => {
      isEdit.value = false;
      dialogVisible.value = true;
      resetForm();
    };

    const addSubCategory = parent => {
      isEdit.value = false;
      dialogVisible.value = true;
      resetForm();
      form.parentId = parent.id;
    };

    const editCategory = category => {
      isEdit.value = true;
      dialogVisible.value = true;
      Object.assign(form, {
        ...category,
        parentId: category.parentId || null
      });
    };

    const resetForm = () => {
      if (formRef.value) {
        formRef.value.resetFields();
      }
      Object.assign(form, {
        id: '',
        name: '',
        description: '',
        icon: '📁',
        color: '#409EFF',
        parentId: null,
        sortOrder: 0,
        showInMenu: true,
        status: 'active'
      });
    };

    const submitForm = async () => {
      if (!formRef.value) return;

      try {
        await formRef.value.validate();
        submitting.value = true;

        if (isEdit.value) {
          await categoriesAPI.updateCategory(form._id, form);
          ElMessage.success('分类更新成功');
        } else {
          await categoriesAPI.createCategory(form);
          ElMessage.success('分类创建成功');
        }

        dialogVisible.value = false;
        loadCategories();
      } catch (error) {
        if (error.errors) {
          return;
        }
        ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
      } finally {
        submitting.value = false;
      }
    };

    const updateShowInMenu = async category => {
      try {
        await categoriesAPI.updateCategory(category._id, {
          showInMenu: category.showInMenu
        });
        ElMessage.success('设置已更新');
      } catch (error) {
        ElMessage.error('更新失败');
        category.showInMenu = !category.showInMenu; // 回滚
      }
    };

    const deleteCategory = async category => {
      try {
        await ElMessageBox.confirm(
          `确定要删除分类"${category.name}"吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await categoriesAPI.deleteCategory(category._id);
        ElMessage.success('删除成功');
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

    const selectIcon = icon => {
      selectedIcon.value = icon;
    };

    const confirmIcon = () => {
      form.icon = selectedIcon.value;
      iconPickerVisible.value = false;
    };

    onMounted(() => {
      loadCategories();
    });

    return {
      // 响应式数据
      loading,
      submitting,
      dialogVisible,
      iconPickerVisible,
      isEdit,
      categories,
      commonIcons,
      form,
      formRules,
      formRef,
      selectedIcon,

      // 计算属性
      categoryTreeOptions,

      // 方法
      refreshData,
      formatDate,
      showCreateDialog,
      addSubCategory,
      editCategory,
      resetForm,
      submitForm,
      updateShowInMenu,
      deleteCategory,
      showIconPicker,
      selectIcon,
      confirmIcon
    };
  }
};
</script>

<style scoped>
.categories-management {
  padding: 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
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
}

/* 表格卡片 */
.table-card {
  margin-bottom: 20px;
}

/* 分类信息 */
.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-icon {
  font-size: 24px;
  width: 32px;
  text-align: center;
}

.category-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.category-description {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.category-path {
  font-size: 11px;
  color: #c0c4cc;
  font-family: monospace;
}

/* 工具数量徽章 */
.tool-count-badge {
  cursor: pointer;
}

/* 表单提示 */
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 图标选择器 */
.icon-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.icon-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.icon-item:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.icon-item.active {
  border-color: #409eff;
  background-color: #409eff;
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .category-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .category-icon {
    width: auto;
  }

  .icon-grid {
    grid-template-columns: repeat(8, 1fr);
  }
}
</style>
