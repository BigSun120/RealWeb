<template>
  <div class="tools-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><Tools /></el-icon>
          工具管理
        </h1>
        <p class="page-description">管理工具的增删改查和配置</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="syncStaticTools" :loading="syncingStatic">
          <el-icon><Refresh /></el-icon>
          同步静态工具
        </el-button>
        <el-button @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="搜索">
          <el-input
            v-model="filterForm.search"
            placeholder="搜索工具名称、描述或标签"
            clearable
            style="width: 250px"
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="filterForm.category"
            placeholder="选择分类"
            clearable
            style="width: 150px"
            @change="handleFilter"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filterForm.status"
            placeholder="选择状态"
            clearable
            style="width: 120px"
            @change="handleFilter"
          >
            <el-option label="活跃" value="active" />
            <el-option label="即将上线" value="coming-soon" />
            <el-option label="维护中" value="maintenance" />
            <el-option label="已下线" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作 -->
    <div v-if="selectedTools.length > 0" class="batch-actions">
      <el-alert
        :title="`已选择 ${selectedTools.length} 个工具`"
        type="info"
        show-icon
        :closable="false"
      >
        <template #default>
          <div class="batch-buttons">
            <el-button size="small" @click="batchUpdateStatus('active')"> 批量启用 </el-button>
            <el-button size="small" @click="batchUpdateStatus('inactive')"> 批量禁用 </el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 工具列表 -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="tools" @selection-change="handleSelectionChange" stripe>
        <el-table-column type="selection" width="55" />
        <el-table-column label="工具信息" min-width="200">
          <template #default="{ row }">
            <div class="tool-info">
              <div class="tool-icon">{{ row.icon }}</div>
              <div class="tool-details">
                <div class="tool-name">{{ row.name }}</div>
                <div class="tool-description">{{ row.description }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getCategoryName(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推荐" width="80">
          <template #default="{ row }">
            <el-icon v-if="row.featured" color="#E6A23C">
              <Star />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column label="使用次数" width="100" sortable>
          <template #default="{ row }">
            {{ row.usageCount || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editTool(row)"> 编辑 </el-button>
            <el-button
              size="small"
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 创建/编辑工具对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑工具' : '新增工具'"
      width="800px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工具ID" prop="id">
              <el-input v-model="form.id" :disabled="isEdit" placeholder="唯一标识符" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工具名称" prop="name">
              <el-input v-model="form.name" placeholder="工具名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="工具描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="工具功能描述"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="图标" prop="icon">
              <el-input v-model="form.icon" placeholder="🔧" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分类" prop="category">
              <el-select v-model="form.category" placeholder="选择分类">
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="选择状态">
                <el-option label="活跃" value="active" />
                <el-option label="即将上线" value="coming-soon" />
                <el-option label="维护中" value="maintenance" />
                <el-option label="已下线" value="inactive" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="路由路径" prop="route">
              <el-input v-model="form.route" placeholder="/tools/category/tool" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组件路径" prop="component">
              <el-input v-model="form.component" placeholder="@/views/tools/..." />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="难度">
              <el-select v-model="form.difficulty" placeholder="选择难度">
                <el-option label="简单" value="easy" />
                <el-option label="中等" value="medium" />
                <el-option label="困难" value="hard" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预计时间">
              <el-input v-model="form.estimatedTime" placeholder="1分钟" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序权重">
              <el-input-number v-model="form.sortOrder" :min="0" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="标签">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            placeholder="添加标签"
            style="width: 100%"
          >
            <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item>
              <el-checkbox v-model="form.featured">推荐工具</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item>
              <el-checkbox v-model="form.requiresAuth">需要登录</el-checkbox>
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
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Tools, Plus, Refresh, Search, Star } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { toolsAPI } from '@/api/admin/tools';
import axios from 'axios';

export default {
  name: 'ToolsManagement',
  components: {
    Tools,
    Plus,
    Refresh,
    Search,
    Star
  },
  setup() {
    const router = useRouter();
    const formRef = ref(null);

    // 响应式数据
    const loading = ref(false);
    const submitting = ref(false);
    const syncingStatic = ref(false);
    const dialogVisible = ref(false);
    const isEdit = ref(false);
    const selectedTools = ref([]);

    const tools = ref([]);
    const categories = ref([]);
    const commonTags = ref(['JSON', '格式化', '图片', '压缩', '转换', '生成', '分析']);

    // 筛选表单
    const filterForm = reactive({
      search: '',
      category: '',
      status: ''
    });

    // 分页
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    });

    // 表单数据
    const form = reactive({
      id: '',
      name: '',
      description: '',
      icon: '🔧',
      category: '',
      status: 'coming-soon',
      route: '',
      component: '',
      difficulty: 'easy',
      estimatedTime: '1分钟',
      sortOrder: 0,
      tags: [],
      featured: false,
      requiresAuth: false
    });

    // 表单验证规则
    const formRules = {
      id: [
        { required: true, message: '请输入工具ID', trigger: 'blur' },
        { pattern: /^[a-z0-9-]+$/, message: 'ID只能包含小写字母、数字和连字符', trigger: 'blur' }
      ],
      name: [{ required: true, message: '请输入工具名称', trigger: 'blur' }],
      description: [{ required: true, message: '请输入工具描述', trigger: 'blur' }],
      category: [{ required: true, message: '请选择分类', trigger: 'change' }],
      route: [{ required: true, message: '请输入路由路径', trigger: 'blur' }],
      component: [{ required: true, message: '请输入组件路径', trigger: 'blur' }]
    };

    // 计算属性
    const getCategoryName = categoryId => {
      const category = categories.value.find(c => c.id === categoryId);
      return category ? category.name : categoryId;
    };

    const getStatusType = status => {
      const statusMap = {
        active: 'success',
        'coming-soon': 'warning',
        maintenance: 'info',
        inactive: 'danger'
      };
      return statusMap[status] || 'info';
    };

    const getStatusText = status => {
      const statusMap = {
        active: '活跃',
        'coming-soon': '即将上线',
        maintenance: '维护中',
        inactive: '已下线'
      };
      return statusMap[status] || status;
    };

    const formatDate = date => {
      return new Date(date).toLocaleString();
    };

    // 方法
    const loadTools = async () => {
      loading.value = true;
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...filterForm
        };

        const response = await toolsAPI.getTools(params);
        tools.value = response.data.tools;
        pagination.total = response.data.pagination.total;
      } catch (error) {
        ElMessage.error('加载工具列表失败');
      } finally {
        loading.value = false;
      }
    };

    const loadCategories = async () => {
      try {
        const response = await axios.get('/api/tools/categories/list');
        if (response.data.code === 200) {
          categories.value = response.data.data.map(cat => ({
            id: cat.id,
            name: cat.name
          }));
        } else {
          // 如果API调用失败，使用默认分类
          categories.value = [
            { id: 'web', name: '网页工具' },
            { id: 'text', name: '文本工具' },
            { id: 'image', name: '图片工具' },
            { id: 'dev', name: '开发工具' },
            { id: 'utility', name: '实用工具' },
            { id: 'media', name: '媒体工具' }
          ];
        }
      } catch (error) {
        console.warn('加载分类失败，使用默认分类:', error);
        // 如果API调用失败，使用默认分类
        categories.value = [
          { id: 'web', name: '网页工具' },
          { id: 'text', name: '文本工具' },
          { id: 'image', name: '图片工具' },
          { id: 'dev', name: '开发工具' },
          { id: 'utility', name: '实用工具' },
          { id: 'media', name: '媒体工具' }
        ];
      }
    };

    const syncStaticTools = async () => {
      try {
        await ElMessageBox.confirm(
          '同步静态工具会自动创建或补充写死的工具，并保留后台状态配置，是否继续？',
          '同步静态工具',
          {
            confirmButtonText: '同步',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
      } catch {
        return;
      }

      try {
        syncingStatic.value = true;
        const response = await toolsAPI.syncStaticTools();
        const result = response.data?.data || {};
        const { created = 0, updated = 0, skipped = 0 } = result;
        ElMessage.success(`同步完成：新增 ${created} 个，更新 ${updated} 个，跳过 ${skipped} 个`);
        refreshData();
      } catch (error) {
        const message = error.response?.data?.message || error.message || '同步静态工具失败';
        ElMessage.error(message);
      } finally {
        syncingStatic.value = false;
      }
    };

    const refreshData = () => {
      loadTools();
      loadCategories();
    };

    const handleSearch = () => {
      pagination.page = 1;
      loadTools();
    };

    const handleFilter = () => {
      pagination.page = 1;
      loadTools();
    };

    const resetFilter = () => {
      Object.assign(filterForm, {
        search: '',
        category: '',
        status: ''
      });
      pagination.page = 1;
      loadTools();
    };

    const handleSelectionChange = selection => {
      selectedTools.value = selection;
    };

    const handlePageChange = page => {
      pagination.page = page;
      loadTools();
    };

    const handleSizeChange = size => {
      pagination.limit = size;
      pagination.page = 1;
      loadTools();
    };

    const showCreateDialog = () => {
      isEdit.value = false;
      dialogVisible.value = true;
      resetForm();
    };

    const editTool = tool => {
      isEdit.value = true;
      dialogVisible.value = true;
      Object.assign(form, tool);
    };

    const resetForm = () => {
      if (formRef.value) {
        formRef.value.resetFields();
      }
      Object.assign(form, {
        id: '',
        name: '',
        description: '',
        icon: '🔧',
        category: '',
        status: 'coming-soon',
        route: '',
        component: '',
        difficulty: 'easy',
        estimatedTime: '1分钟',
        sortOrder: 0,
        tags: [],
        featured: false,
        requiresAuth: false
      });
    };

    const submitForm = async () => {
      if (!formRef.value) return;
      if (submitting.value) {
        console.warn('[ToolsManagement] submit blocked: submitting in progress');
        return;
      }

      try {
        submitting.value = true;
        console.group('[ToolsManagement] submitForm');
        console.log('action:', isEdit.value ? 'update' : 'create');
        console.log('raw form(before validate):', JSON.parse(JSON.stringify(form)));

        // 先进行表单验证
        await formRef.value.validate();
        console.log('form validation: passed');

        // 清理表单数据，去除空格
        const cleanForm = {
          ...form,
          id: form.id.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          route: form.route.trim(),
          component: form.component.trim(),
          icon: form.icon.trim(),
          estimatedTime: form.estimatedTime.trim()
        };
        console.log('cleanForm:', JSON.parse(JSON.stringify(cleanForm)));

        let resp;
        if (isEdit.value) {
          console.log('update id:', form._id);
          console.time('[ToolsManagement] updateTool');
          resp = await toolsAPI.updateTool(form._id, cleanForm);
          console.timeEnd('[ToolsManagement] updateTool');
          console.log('updateTool response:', resp);
          ElMessage.success('工具更新成功');
        } else {
          console.time('[ToolsManagement] createTool');
          console.log('createTool request payload:', JSON.parse(JSON.stringify(cleanForm)));
          resp = await toolsAPI.createTool(cleanForm);
          console.timeEnd('[ToolsManagement] createTool');
          console.log('createTool response:', resp);
          ElMessage.success('工具创建成功');
        }

        dialogVisible.value = false;
        loadTools();
      } catch (error) {
        console.error('提交表单错误(catch):', error);
        // 统一打印更多错误上下文
        try {
          console.error('error.response?.status:', error?.response?.status);
          console.error('error.response?.data:', error?.response?.data);
          console.error('error.message:', error?.message);
        } catch {}

        // 如果是表单验证错误，不显示错误消息
        if (error.errors) {
          console.warn('validate errors:', error.errors);
          console.groupEnd('[ToolsManagement] submitForm');
          return;
        }

        // 显示具体的错误信息
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          (isEdit.value ? '更新失败' : '创建失败');
        ElMessage.error(errorMessage);
      } finally {
        submitting.value = false;
        console.groupEnd('[ToolsManagement] submitForm');
      }
    };

    const toggleStatus = async tool => {
      const newStatus = tool.status === 'active' ? 'inactive' : 'active';
      try {
        await toolsAPI.updateTool(tool._id, { status: newStatus });
        ElMessage.success('状态更新成功');
        loadTools();
      } catch (error) {
        ElMessage.error('状态更新失败');
      }
    };

    const deleteTool = async tool => {
      try {
        await ElMessageBox.confirm(`确定要删除工具"${tool.name}"吗？此操作不可恢复。`, '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        });

        await toolsAPI.deleteTool(tool._id);
        ElMessage.success('删除成功');
        loadTools();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败');
        }
      }
    };

    const batchUpdateStatus = async status => {
      try {
        const ids = selectedTools.value.map(tool => tool._id);
        await toolsAPI.batchUpdateStatus({ ids, status });
        ElMessage.success('批量更新成功');
        selectedTools.value = [];
        loadTools();
      } catch (error) {
        ElMessage.error('批量更新失败');
      }
    };

    const batchDelete = async () => {
      try {
        await ElMessageBox.confirm(
          `确定要删除选中的 ${selectedTools.value.length} 个工具吗？此操作不可恢复。`,
          '确认批量删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        const ids = selectedTools.value.map(tool => tool._id);
        await toolsAPI.batchDeleteTools(ids);
        ElMessage.success('批量删除成功');
        selectedTools.value = [];
        loadTools();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量删除失败');
        }
      }
    };

    onMounted(() => {
      refreshData();
    });

    return {
      // 响应式状态
      loading,
      submitting,
      syncingStatic,
      dialogVisible,
      isEdit,
      selectedTools,
      tools,
      categories,
      commonTags,
      filterForm,
      pagination,
      form,
      formRules,
      formRef,

      // 便捷函数
      getCategoryName,
      getStatusType,
      getStatusText,
      formatDate,

      // 操作
      refreshData,
      syncStaticTools,
      handleSearch,
      handleFilter,
      resetFilter,
      handleSelectionChange,
      handlePageChange,
      handleSizeChange,
      showCreateDialog,
      editTool,
      resetForm,
      submitForm,
      toggleStatus,
      deleteTool,
      batchUpdateStatus,
      batchDelete
    };
  }
};
</script>

<style scoped>
.tools-management {
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

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
}

/* 批量操作 */
.batch-actions {
  margin-bottom: 20px;
}

.batch-buttons {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

/* 表格卡片 */
.table-card {
  margin-bottom: 20px;
}

/* 工具信息 */
.tool-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-icon {
  font-size: 24px;
  width: 32px;
  text-align: center;
}

.tool-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.tool-description {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

/* 分页 */
.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
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

  .tool-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .tool-icon {
    width: auto;
  }
}
</style>
