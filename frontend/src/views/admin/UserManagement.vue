<template>
  <div class="user-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>用户管理</h1>
      <p>管理系统中的所有用户账户</p>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="search-card" shadow="never">
      <div class="search-header">
        <span class="search-title">用户搜索</span>
        <el-button
          text
          type="primary"
          @click="toggleAdvancedSearch"
        >
          {{ showAdvancedSearch ? '收起高级搜索' : '展开高级搜索' }}
          <el-icon>
            <component :is="showAdvancedSearch ? 'ArrowUp' : 'ArrowDown'" />
          </el-icon>
        </el-button>
      </div>

      <!-- 基础搜索 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="关键词搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="输入用户名、邮箱或ID"
            clearable
            style="width: 280px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="用户状态">
          <el-select
            v-model="searchForm.status"
            placeholder="选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>

        <el-form-item label="用户角色">
          <el-select
            v-model="searchForm.role"
            placeholder="选择角色"
            clearable
            style="width: 120px"
          >
            <el-option label="全部" value="" />
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 高级搜索 -->
      <el-collapse-transition>
        <div v-show="showAdvancedSearch" class="advanced-search">
          <el-divider content-position="left">高级搜索选项</el-divider>

          <el-form :model="searchForm" :inline="false" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="注册时间">
                  <el-date-picker
                    v-model="searchForm.dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="最后登录">
                  <el-date-picker
                    v-model="searchForm.lastLoginRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="排序方式">
                  <el-select
                    v-model="searchForm.sortBy"
                    placeholder="选择排序"
                    style="width: 100%"
                  >
                    <el-option label="注册时间(新到旧)" value="createdAt_desc" />
                    <el-option label="注册时间(旧到新)" value="createdAt_asc" />
                    <el-option label="最后登录(新到旧)" value="lastLoginAt_desc" />
                    <el-option label="最后登录(旧到新)" value="lastLoginAt_asc" />
                    <el-option label="用户名(A-Z)" value="username_asc" />
                    <el-option label="用户名(Z-A)" value="username_desc" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="邮箱域名">
                  <el-input
                    v-model="searchForm.emailDomain"
                    placeholder="如: @gmail.com"
                    clearable
                  />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="登录次数">
                  <el-input-number
                    v-model="searchForm.minLoginCount"
                    placeholder="最少登录次数"
                    :min="0"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="搜索范围">
                  <el-checkbox-group v-model="searchForm.searchFields">
                    <el-checkbox label="username">用户名</el-checkbox>
                    <el-checkbox label="email">邮箱</el-checkbox>
                    <el-checkbox label="bio">个人简介</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row>
              <el-col :span="24">
                <el-form-item>
                  <el-button type="primary" @click="handleAdvancedSearch">
                    <el-icon><Search /></el-icon>
                    高级搜索
                  </el-button>
                  <el-button @click="handleResetAdvanced">
                    <el-icon><Refresh /></el-icon>
                    重置高级选项
                  </el-button>
                  <el-button type="success" @click="handleSaveSearchTemplate">
                    <el-icon><Collection /></el-icon>
                    保存搜索模板
                  </el-button>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-collapse-transition>

      <!-- 搜索模板 -->
      <div v-if="searchTemplates.length > 0" class="search-templates">
        <el-divider content-position="left">搜索模板</el-divider>
        <div class="template-list">
          <el-tag
            v-for="template in searchTemplates"
            :key="template.id"
            class="template-tag"
            closable
            @click="applySearchTemplate(template)"
            @close="removeSearchTemplate(template.id)"
          >
            {{ template.name }}
          </el-tag>
        </div>
      </div>

      <!-- 搜索结果统计 -->
      <div v-if="searchResultStats.total > 0" class="search-stats">
        <el-alert
          :title="`搜索结果: 共找到 ${searchResultStats.total} 个用户`"
          type="info"
          :closable="false"
        >
          <template #default>
            <div class="stats-detail">
              <span>管理员: {{ searchResultStats.adminCount }}</span>
              <span>普通用户: {{ searchResultStats.userCount }}</span>
              <span>正常状态: {{ searchResultStats.activeCount }}</span>
              <span>禁用状态: {{ searchResultStats.inactiveCount }}</span>
            </div>
          </template>
        </el-alert>
      </div>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">用户列表</span>
          <div class="header-actions">
            <el-dropdown
              v-if="selectedUsers.length > 0"
              @command="handleBatchAction"
              style="margin-right: 8px;"
            >
              <el-button type="warning">
                批量操作 ({{ selectedUsers.length }})
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="activate">批量启用</el-dropdown-item>
                  <el-dropdown-item command="deactivate">批量禁用</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>批量删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button
              type="primary"
              :icon="Plus"
              @click="handleAddUser"
            >
              添加用户
            </el-button>

            <el-dropdown @command="handleExportCommand">
              <el-button :icon="Download">
                导出数据<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="current">导出当前页</el-dropdown-item>
                  <el-dropdown-item command="all">导出全部数据</el-dropdown-item>
                  <el-dropdown-item command="selected" :disabled="selectedUsers.length === 0">
                    导出选中用户 ({{ selectedUsers.length }})
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button
              type="success"
              :icon="Upload"
              @click="handleImportUser"
            >
              导入用户
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="tableLoading"
        :data="userList"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column label="用户信息" min-width="200">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :src="row.avatar" :size="40">
                {{ row.username?.charAt(0) }}
              </el-avatar>
              <div class="user-details">
                <div class="username">{{ row.username }}</div>
                <div class="email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isAdmin ? 'danger' : 'primary'" size="small">
              {{ row.isAdmin ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.isActive ? 'success' : 'danger'"
              size="small"
            >
              {{ row.isActive ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="最后登录" width="160">
          <template #default="{ row }">
            {{ formatDate(row.lastLoginAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              text
              @click="handleViewUser(row)"
            >
              查看
            </el-button>
            <el-button
              type="warning"
              size="small"
              text
              @click="handleEditUser(row)"
            >
              编辑
            </el-button>
            <el-button
              :type="row.isActive ? 'danger' : 'success'"
              size="small"
              text
              @click="handleToggleStatus(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>

            <el-dropdown @command="(command) => handleUserAction(command, row)">
              <el-button size="small" text>
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    :command="`role:${row._id}`"
                    :disabled="row._id === userStore.user?._id"
                  >
                    {{ row.isAdmin ? '取消管理员' : '设为管理员' }}
                  </el-dropdown-item>
                  <el-dropdown-item :command="`password:${row._id}`">
                    重置密码
                  </el-dropdown-item>
                  <el-dropdown-item
                    :command="`delete:${row._id}`"
                    :disabled="row._id === userStore.user?._id"
                    divided
                  >
                    删除用户
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 用户详情对话框 -->
    <UserDetailDialog
      v-model="showDetailDialog"
      :user-id="currentUser?._id"
      @edit="handleEditUser"
    />

    <!-- 用户编辑对话框 -->
    <UserEditDialog
      v-model="showEditDialog"
      :user-data="currentUser"
      @success="handleEditSuccess"
    />

    <!-- 用户导入对话框 -->
    <UserImportDialog
      v-model="showImportDialog"
      @success="handleDialogSuccess"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  Plus,
  Download,
  ArrowDown,
  ArrowUp,
  Upload,
  Collection
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import {
  getUsers,
  updateUserStatus,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  batchUserOperation
} from '@/api/admin';

// 导入组件
import UserDetailDialog from '@/components/admin/user/UserDetailDialog.vue';
import UserEditDialog from '@/components/admin/user/UserEditDialog.vue';
import UserImportDialog from '@/components/admin/user/UserImportDialog.vue';

export default {
  name: 'UserManagement',
  components: {
    Search,
    Refresh,
    Plus,
    Download,
    ArrowDown,
    ArrowUp,
    Upload,
    Collection,
    UserDetailDialog,
    UserEditDialog,
    UserImportDialog
  },
  setup() {
    const userStore = useUserStore();
    const tableLoading = ref(false);
    const userList = ref([]);
    const selectedUsers = ref([]);

    // 对话框状态
    const showDetailDialog = ref(false);
    const showEditDialog = ref(false);
    const showImportDialog = ref(false);
    const currentUser = ref(null);

    // 搜索表单
    const searchForm = reactive({
      keyword: '',
      status: '',
      role: '',
      dateRange: [],
      lastLoginRange: [],
      sortBy: 'createdAt_desc',
      emailDomain: '',
      minLoginCount: null,
      searchFields: ['username', 'email']
    });

    // 搜索相关状态
    const showAdvancedSearch = ref(false);
    const searchTemplates = ref([]);
    const searchResultStats = ref({
      total: 0,
      adminCount: 0,
      userCount: 0,
      activeCount: 0,
      inactiveCount: 0
    });

    // 分页信息
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    });

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '--';
      return new Date(dateString).toLocaleString('zh-CN');
    };

    // 构建搜索参数
    const buildSearchParams = () => {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchForm.keyword,
        status: searchForm.status,
        role: searchForm.role
      };

      // 高级搜索参数
      if (searchForm.dateRange && searchForm.dateRange.length === 2) {
        params.startDate = searchForm.dateRange[0];
        params.endDate = searchForm.dateRange[1];
      }

      if (searchForm.lastLoginRange && searchForm.lastLoginRange.length === 2) {
        params.lastLoginStart = searchForm.lastLoginRange[0];
        params.lastLoginEnd = searchForm.lastLoginRange[1];
      }

      if (searchForm.sortBy) {
        const [field, order] = searchForm.sortBy.split('_');
        params.sortField = field;
        params.sortOrder = order;
      }

      if (searchForm.emailDomain) {
        params.emailDomain = searchForm.emailDomain;
      }

      if (searchForm.minLoginCount !== null && searchForm.minLoginCount >= 0) {
        params.minLoginCount = searchForm.minLoginCount;
      }

      if (searchForm.searchFields && searchForm.searchFields.length > 0) {
        params.searchFields = searchForm.searchFields.join(',');
      }

      return params;
    };

    // 加载用户列表
    const loadUsers = async () => {
      try {
        tableLoading.value = true;

        const params = buildSearchParams();
        const response = await getUsers(params);

        userList.value = response.data.data.users;
        pagination.total = response.data.data.pagination.total;

        // 更新搜索结果统计
        if (response.data.data.stats) {
          searchResultStats.value = response.data.data.stats;
        } else {
          updateSearchStats(response.data.data.users);
        }

      } catch (error) {
        console.error('加载用户列表失败:', error);
        ElMessage.error('加载用户列表失败');
      } finally {
        tableLoading.value = false;
      }
    };

    // 更新搜索结果统计
    const updateSearchStats = (users) => {
      searchResultStats.value = {
        total: pagination.total,
        adminCount: users.filter(user => user.isAdmin).length,
        userCount: users.filter(user => !user.isAdmin).length,
        activeCount: users.filter(user => user.isActive).length,
        inactiveCount: users.filter(user => !user.isActive).length
      };
    };

    // 搜索用户
    const handleSearch = () => {
      pagination.page = 1;
      loadUsers();
    };

    // 重置搜索
    const handleReset = () => {
      Object.assign(searchForm, {
        keyword: '',
        status: '',
        role: '',
        dateRange: [],
        lastLoginRange: [],
        sortBy: 'createdAt_desc',
        emailDomain: '',
        minLoginCount: null,
        searchFields: ['username', 'email']
      });
      pagination.page = 1;
      searchResultStats.value = {
        total: 0,
        adminCount: 0,
        userCount: 0,
        activeCount: 0,
        inactiveCount: 0
      };
      loadUsers();
    };

    // 切换高级搜索
    const toggleAdvancedSearch = () => {
      showAdvancedSearch.value = !showAdvancedSearch.value;
    };

    // 高级搜索
    const handleAdvancedSearch = () => {
      pagination.page = 1;
      loadUsers();
    };

    // 重置高级搜索选项
    const handleResetAdvanced = () => {
      Object.assign(searchForm, {
        dateRange: [],
        lastLoginRange: [],
        sortBy: 'createdAt_desc',
        emailDomain: '',
        minLoginCount: null,
        searchFields: ['username', 'email']
      });
    };

    // 保存搜索模板
    const handleSaveSearchTemplate = async () => {
      try {
        const { value: templateName } = await ElMessageBox.prompt(
          '请输入搜索模板名称',
          '保存搜索模板',
          {
            confirmButtonText: '保存',
            cancelButtonText: '取消',
            inputPattern: /\S+/,
            inputErrorMessage: '模板名称不能为空'
          }
        );

        const template = {
          id: Date.now(),
          name: templateName,
          searchForm: { ...searchForm }
        };

        searchTemplates.value.push(template);

        // 保存到本地存储
        localStorage.setItem('userSearchTemplates', JSON.stringify(searchTemplates.value));

        ElMessage.success('搜索模板保存成功');

      } catch (error) {
        // 用户取消操作
      }
    };

    // 应用搜索模板
    const applySearchTemplate = (template) => {
      Object.assign(searchForm, template.searchForm);
      pagination.page = 1;
      loadUsers();
      ElMessage.success(`已应用搜索模板: ${template.name}`);
    };

    // 删除搜索模板
    const removeSearchTemplate = (templateId) => {
      const index = searchTemplates.value.findIndex(t => t.id === templateId);
      if (index > -1) {
        const template = searchTemplates.value[index];
        searchTemplates.value.splice(index, 1);

        // 更新本地存储
        localStorage.setItem('userSearchTemplates', JSON.stringify(searchTemplates.value));

        ElMessage.success(`已删除搜索模板: ${template.name}`);
      }
    };

    // 加载搜索模板
    const loadSearchTemplates = () => {
      try {
        const saved = localStorage.getItem('userSearchTemplates');
        if (saved) {
          searchTemplates.value = JSON.parse(saved);
        }
      } catch (error) {
        console.error('加载搜索模板失败:', error);
      }
    };

    // 选择变化
    const handleSelectionChange = (selection) => {
      selectedUsers.value = selection;
    };

    // 分页大小变化
    const handleSizeChange = (size) => {
      pagination.limit = size;
      pagination.page = 1;
      loadUsers();
    };

    // 当前页变化
    const handleCurrentChange = (page) => {
      pagination.page = page;
      loadUsers();
    };

    // 查看用户
    const handleViewUser = (user) => {
      currentUser.value = user;
      showDetailDialog.value = true;
    };

    // 编辑用户
    const handleEditUser = (user) => {
      currentUser.value = user;
      showEditDialog.value = true;
    };

    // 切换用户状态
    const handleToggleStatus = async (user) => {
      const newStatus = !user.isActive;
      const action = newStatus ? '启用' : '禁用';

      try {
        await ElMessageBox.confirm(
          `确定要${action}用户 "${user.username}" 吗？`,
          '确认操作',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await updateUserStatus(user._id, newStatus);
        user.isActive = newStatus;
        ElMessage.success(`${action}成功`);

      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || `${action}失败`);
        }
        // 用户取消操作或API错误
      }
    };

    // 添加用户
    const handleAddUser = () => {
      currentUser.value = null;
      showEditDialog.value = true;
    };

    // 导入用户
    const handleImportUser = () => {
      showImportDialog.value = true;
    };

    // 导出命令处理
    const handleExportCommand = (command) => {
      switch (command) {
        case 'current':
          exportUsers(userList.value, '当前页用户数据');
          break;
        case 'all':
          exportAllUsers();
          break;
        case 'selected':
          exportUsers(selectedUsers.value, '选中用户数据');
          break;
      }
    };

    // 导出用户数据
    const exportUsers = (users, filename = '用户数据') => {
      if (!users || users.length === 0) {
        ElMessage.warning('没有可导出的数据');
        return;
      }

      // 准备导出数据
      const exportData = [
        ['用户名', '邮箱', '角色', '状态', '个人简介', '注册时间', '最后登录']
      ];

      users.forEach(user => {
        exportData.push([
          user.username,
          user.email,
          user.isAdmin ? '管理员' : '普通用户',
          user.isActive ? '正常' : '禁用',
          user.bio || '',
          formatDate(user.createdAt),
          formatDate(user.lastLoginAt)
        ]);
      });

      // 创建CSV内容
      const csvContent = exportData.map(row =>
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;'
      });

      // 下载文件
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      ElMessage.success(`导出成功：${users.length} 条数据`);
    };

    // 导出全部用户
    const exportAllUsers = async () => {
      try {
        // 这里应该调用API获取全部用户数据
        ElMessage.info('正在导出全部用户数据...');

        // 模拟API调用
        setTimeout(() => {
          exportUsers(userList.value, '全部用户数据');
        }, 1000);

      } catch (error) {
        ElMessage.error('导出失败');
      }
    };

    // 批量操作
    const handleBatchAction = async (command) => {
      if (selectedUsers.value.length === 0) {
        ElMessage.warning('请先选择用户');
        return;
      }

      const userIds = selectedUsers.value.map(user => user._id);
      let actionText = '';

      switch (command) {
        case 'activate':
          actionText = '启用';
          break;
        case 'deactivate':
          actionText = '禁用';
          break;
        case 'delete':
          actionText = '删除';
          break;
      }

      try {
        await ElMessageBox.confirm(
          `确定要${actionText} ${selectedUsers.value.length} 个用户吗？`,
          '批量操作确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await batchUserOperation(userIds, command);
        ElMessage.success(`批量${actionText}成功`);
        loadUsers();

      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || `批量${actionText}失败`);
        }
        // 用户取消操作或API错误
      }
    };

    // 用户操作菜单
    const handleUserAction = async (command, user) => {
      const [action, userId] = command.split(':');

      switch (action) {
        case 'role':
          await handleToggleRole(user);
          break;
        case 'password':
          await handleResetPassword(user);
          break;
        case 'delete':
          await handleDeleteUser(user);
          break;
      }
    };

    // 切换用户角色
    const handleToggleRole = async (user) => {
      const newRole = !user.isAdmin;
      const roleText = newRole ? '管理员' : '普通用户';

      try {
        await ElMessageBox.confirm(
          `确定要将用户 "${user.username}" 设置为${roleText}吗？`,
          '角色变更确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await updateUserRole(user._id, newRole);
        user.isAdmin = newRole;
        ElMessage.success(`用户角色更新成功`);

      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || '角色更新失败');
        }
        // 用户取消操作或API错误
      }
    };

    // 重置密码
    const handleResetPassword = async (user) => {
      try {
        const { value: newPassword } = await ElMessageBox.prompt(
          `为用户 "${user.username}" 设置新密码`,
          '重置密码',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPattern: /.{6,}/,
            inputErrorMessage: '密码长度不能少于6位',
            inputType: 'password'
          }
        );

        await resetUserPassword(user._id, newPassword);
        ElMessage.success('密码重置成功');

      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || '密码重置失败');
        }
        // 用户取消操作或API错误
      }
    };

    // 删除用户
    const handleDeleteUser = async (user) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
          '删除用户确认',
          {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'error'
          }
        );

        await deleteUser(user._id);
        ElMessage.success('用户删除成功');
        loadUsers();

      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || '用户删除失败');
        }
        // 用户取消操作或API错误
      }
    };

    // 对话框成功处理
    const handleDialogSuccess = () => {
      loadUsers(); // 重新加载用户列表
    };

    // 编辑对话框成功处理
    const handleEditSuccess = () => {
      loadUsers(); // 重新加载用户列表
      ElMessage.success('操作成功');
    };

    onMounted(() => {
      loadSearchTemplates();
      loadUsers();
    });

    return {
      userStore,
      tableLoading,
      userList,
      selectedUsers,
      searchForm,
      pagination,
      // 搜索相关状态
      showAdvancedSearch,
      searchTemplates,
      searchResultStats,
      // 对话框状态
      showDetailDialog,
      showEditDialog,
      showImportDialog,
      currentUser,
      // 基础功能
      formatDate,
      handleSearch,
      handleReset,
      handleSelectionChange,
      handleSizeChange,
      handleCurrentChange,
      // 高级搜索功能
      toggleAdvancedSearch,
      handleAdvancedSearch,
      handleResetAdvanced,
      handleSaveSearchTemplate,
      applySearchTemplate,
      removeSearchTemplate,
      // 用户操作
      handleViewUser,
      handleEditUser,
      handleToggleStatus,
      handleAddUser,
      handleImportUser,
      handleExportCommand,
      handleBatchAction,
      handleUserAction,
      handleToggleRole,
      handleResetPassword,
      handleDeleteUser,
      // 对话框处理
      handleDialogSuccess,
      handleEditSuccess
    };
  }
};
</script>

<style scoped>
.user-management {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.page-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.search-card {
  margin-bottom: 16px;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.search-form {
  margin-bottom: 0;
}

.advanced-search {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.search-templates {
  margin-top: 16px;
}

.template-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.template-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-stats {
  margin-top: 16px;
}

.stats-detail {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.stats-detail span {
  padding: 4px 8px;
  background: #f0f2f5;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.table-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.username {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.email {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .user-info {
    gap: 8px;
  }

  .pagination-wrapper {
    overflow-x: auto;
  }
}
</style>
