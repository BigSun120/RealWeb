<template>
  <div class="public-ai-connections">
    <el-card class="page-header" shadow="never">
      <div class="header-content">
        <div class="title-section">
          <h1>
            <el-icon class="title-icon">
              <Connection />
            </el-icon>
            公共API连接管理
          </h1>
          <p class="subtitle">管理全局公共的AI API连接配置，供所有用户使用</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          添加公共连接
        </el-button>
      </div>
    </el-card>

    <!-- 连接列表 -->
    <el-card class="connections-list" shadow="never">
      <el-table 
        :data="connections" 
        v-loading="loading"
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
        stripe
      >
        <el-table-column label="名称" prop="name" min-width="150">
          <template #default="{ row }">
            <div class="connection-name">
              <el-tag :type="getProviderType(row.provider)" size="small">
                {{ row.provider }}
              </el-tag>
              <span class="name-text">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="API端点" prop="endpoint" min-width="200" show-overflow-tooltip />

        <el-table-column label="模型" prop="model" min-width="120" />

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="默认" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" type="warning" size="small">默认</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" prop="createdAt" width="160" sortable>
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button 
                size="small" 
                :type="row.isActive ? 'warning' : 'success'"
                @click="handleToggleStatus(row)"
              >
                {{ row.isActive ? '禁用' : '启用' }}
              </el-button>
              <el-button 
                v-if="!row.isDefault"
                size="small" 
                type="primary"
                @click="handleSetDefault(row)"
              >
                设为默认
              </el-button>
              <el-button 
                size="small" 
                @click="handleTest(row)"
              >
                测试
              </el-button>
              <el-button 
                size="small" 
                type="primary"
                :icon="Edit"
                @click="handleEdit(row)"
              />
              <el-button 
                size="small" 
                type="danger"
                :icon="Delete"
                @click="handleDelete(row)"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchConnections"
          @current-change="fetchConnections"
        />
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入连接名称" />
        </el-form-item>

        <el-form-item label="提供商" prop="provider">
          <el-select v-model="form.provider" placeholder="请选择提供商" style="width: 100%">
            <el-option label="OpenAI" value="openai" />
            <el-option label="Claude" value="claude" />
            <el-option label="Gemini" value="gemini" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="API密钥" prop="apiKey">
          <el-input 
            v-model="form.apiKey" 
            type="password"
            show-password
            placeholder="请输入API密钥" 
          />
        </el-form-item>

        <el-form-item label="API端点" prop="endpoint">
          <el-input v-model="form.endpoint" placeholder="例如: https://api.openai.com/v1" />
        </el-form-item>

        <el-form-item label="模型" prop="model">
          <el-input v-model="form.model" placeholder="例如: gpt-4" />
        </el-form-item>

        <el-form-item label="启用状态" prop="isActive">
          <el-switch v-model="form.isActive" />
        </el-form-item>

        <el-form-item label="设为默认" prop="isDefault">
          <el-switch v-model="form.isDefault" />
          <el-alert
            v-if="form.isDefault"
            title="设置为默认后，其他连接的默认状态将被取消"
            type="warning"
            :closable="false"
            show-icon
            style="margin-top: 10px"
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入连接描述（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Connection, Plus, Edit, Delete } from '@element-plus/icons-vue';
import request from '@/utils/request';

export default {
  name: 'PublicAIConnections',
  components: {
    Connection,
    Plus,
    Edit,
    Delete
  },
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const dialogVisible = ref(false);
    const dialogTitle = ref('添加公共连接');
    const formRef = ref(null);
    const connections = ref([]);
    const editingId = ref(null);

    const pagination = reactive({
      page: 1,
      pageSize: 10,
      total: 0
    });

    const form = reactive({
      name: '',
      provider: '',
      apiKey: '',
      endpoint: '',
      model: '',
      isActive: true,
      isDefault: false,
      description: ''
    });

    // 验证规则
    const rules = {
      name: [
        { required: true, message: '请输入连接名称', trigger: 'blur' }
      ],
      provider: [
        { required: true, message: '请选择提供商', trigger: 'change' }
      ],
      apiKey: [
        { required: true, message: '请输入API密钥', trigger: 'blur' }
      ],
      endpoint: [
        { required: true, message: '请输入API端点', trigger: 'blur' },
        { type: 'url', message: '请输入有效的URL', trigger: 'blur' }
      ],
      model: [
        { required: true, message: '请输入模型名称', trigger: 'blur' }
      ]
    };

    // 获取提供商标签类型
    const getProviderType = (provider) => {
      const typeMap = {
        openai: 'success',
        claude: 'primary',
        gemini: 'warning',
        other: 'info'
      };
      return typeMap[provider] || 'info';
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    };

    // 获取连接列表
    const fetchConnections = async () => {
      loading.value = true;
      try {
        const { data } = await request.get('/admin/ai-connections/public', {
          params: {
            page: pagination.page,
            pageSize: pagination.pageSize
          }
        });
        connections.value = data.connections || [];
        pagination.total = data.total || 0;
      } catch (error) {
        console.error('获取公共连接失败:', error);
        ElMessage.error(error.response?.data?.message || '获取公共连接失败');
      } finally {
        loading.value = false;
      }
    };

    // 添加连接
    const handleAdd = () => {
      editingId.value = null;
      dialogTitle.value = '添加公共连接';
      Object.assign(form, {
        name: '',
        provider: '',
        apiKey: '',
        endpoint: '',
        model: '',
        isActive: true,
        isDefault: false,
        description: ''
      });
      dialogVisible.value = true;
    };

    // 编辑连接
    const handleEdit = (row) => {
      editingId.value = row.id;
      dialogTitle.value = '编辑公共连接';
      Object.assign(form, {
        name: row.name,
        provider: row.provider,
        apiKey: row.apiKey, // 直接显示密钥
        endpoint: row.endpoint,
        model: row.model,
        isActive: row.isActive,
        isDefault: row.isDefault,
        description: row.description || ''
      });
      dialogVisible.value = true;
    };

    // 保存连接
    const handleSave = async () => {
      if (!formRef.value) return;
      
      try {
        await formRef.value.validate();
        saving.value = true;

        const url = editingId.value
          ? `/admin/ai-connections/public/${editingId.value}`
          : '/admin/ai-connections/public';
        
        const method = editingId.value ? 'put' : 'post';

        await request[method](url, form);

        ElMessage.success(editingId.value ? '更新成功' : '添加成功');
        dialogVisible.value = false;
        fetchConnections();
      } catch (error) {
        if (error.errors) return; // 表单验证错误
        console.error('保存失败:', error);
        ElMessage.error(error.response?.data?.message || '保存失败');
      } finally {
        saving.value = false;
      }
    };

    // 切换状态
    const handleToggleStatus = async (row) => {
      try {
        await request.patch(`/admin/ai-connections/public/${row.id}/status`, {
          isActive: !row.isActive
        });
        ElMessage.success(`已${row.isActive ? '禁用' : '启用'}`);
        fetchConnections();
      } catch (error) {
        console.error('切换状态失败:', error);
        ElMessage.error(error.response?.data?.message || '切换状态失败');
      }
    };

    // 设置为默认
    const handleSetDefault = async (row) => {
      try {
        await request.patch(`/admin/ai-connections/public/${row.id}/default`);
        ElMessage.success('已设为默认连接');
        fetchConnections();
      } catch (error) {
        console.error('设置默认失败:', error);
        ElMessage.error(error.response?.data?.message || '设置默认失败');
      }
    };

    // 测试连接
    const handleTest = async (row) => {
      const loading = ElMessage({
        message: '正在测试连接...',
        type: 'info',
        duration: 0
      });

      try {
        const response = await request.post(`/admin/ai-connections/public/${row.id}/test`);
        loading.close();
        
        // 检查后端返回的success字段判断测试是否真正成功
        if (response.data && response.data.success) {
          ElMessage.success('连接测试成功');
        } else {
          // 测试失败，显示后端返回的错误信息
          const errorMsg = response.data?.error || '连接测试失败';
          ElMessage.error(errorMsg);
        }
      } catch (error) {
        loading.close();
        console.error('测试连接失败:', error);
        ElMessage.error(error.response?.data?.message || '连接测试失败');
      }
    };

    // 删除连接
    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除连接 "${row.name}" 吗？此操作不可恢复。`,
          '删除确认',
          {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await request.delete(`/admin/ai-connections/public/${row.id}`);
        ElMessage.success('删除成功');
        fetchConnections();
      } catch (error) {
        if (error === 'cancel') return;
        console.error('删除失败:', error);
        ElMessage.error(error.response?.data?.message || '删除失败');
      }
    };

    onMounted(() => {
      fetchConnections();
    });

    return {
      loading,
      saving,
      dialogVisible,
      dialogTitle,
      formRef,
      connections,
      pagination,
      form,
      rules,
      getProviderType,
      formatDate,
      fetchConnections,
      handleAdd,
      handleEdit,
      handleSave,
      handleToggleStatus,
      handleSetDefault,
      handleTest,
      handleDelete,
      Plus,
      Edit,
      Delete
    };
  }
};
</script>

<style scoped>
.public-ai-connections {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 28px;
  color: #409eff;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.connections-list {
  margin-top: 20px;
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  font-weight: 500;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-button-group) {
  display: flex;
}
</style>
