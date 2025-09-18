<template>
  <div class="activation-codes-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <h2>临时邮箱激活码管理</h2>
          <div class="header-actions">
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon><Plus /></el-icon>
              创建激活码
            </el-button>
            <el-button @click="refreshCodes">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>


          </div>
        </div>
      </template>

      <!-- 统计信息 -->
      <div class="stats-section" v-if="stats">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="总激活码数" :value="stats.totalCodes">
              <template #suffix>
                <el-icon><Key /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="活跃激活码" :value="stats.activeCodes">
              <template #suffix>
                <el-icon style="color: #67c23a;"><CircleCheck /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="已过期" :value="stats.expiredCodes">
              <template #suffix>
                <el-icon style="color: #f56c6c;"><CircleClose /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="总使用次数" :value="stats.totalUses">
              <template #suffix>
                <el-icon><DataAnalysis /></el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </div>

      <!-- 搜索和筛选区域 -->
      <div class="search-filter-section">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-input
              v-model="searchQuery"
              placeholder="搜索激活码或描述"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <el-select
              v-model="statusFilter"
              placeholder="状态筛选"
              clearable
              @change="handleFilter"
            >
              <el-option label="全部" value="" />
              <el-option label="已启用" value="active" />
              <el-option label="已禁用" value="inactive" />
              <el-option label="已过期" value="expired" />
              <el-option label="已用完" value="exhausted" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select
              v-model="usageFilter"
              placeholder="使用状态筛选"
              clearable
              @change="handleFilter"
            >
              <el-option label="全部" value="" />
              <el-option label="未使用" value="unused" />
              <el-option label="已使用" value="used" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button @click="resetFilters" :icon="Refresh">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 批量操作工作栏 -->
      <div v-if="selectedCodes.length > 0" class="batch-operation-bar">
        <div class="batch-info">
          <el-icon class="batch-icon"><Select /></el-icon>
          <span class="batch-text">
            已选择 <strong>{{ selectedCodes.length }}</strong> 个激活码
            <span v-if="selectedCodes.length > codes.length" class="cross-page-hint">
              (跨页选择)
            </span>
          </span>
        </div>
        <div class="batch-actions">
          <el-button
            size="small"
            @click="handleBatchAction('enable')"
            :icon="CircleCheck"
          >
            批量启用
          </el-button>
          <el-button
            size="small"
            @click="handleBatchAction('disable')"
            :icon="CircleClose"
          >
            批量禁用
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleBatchAction('delete')"
            :icon="Delete"
          >
            批量删除
          </el-button>
          <el-button
            size="small"
            @click="clearSelection"
            :icon="Close"
          >
            取消选择
          </el-button>
        </div>
      </div>

      <!-- 激活码列表 -->
      <div class="codes-section">
        <el-table
          ref="tableRef"
          :data="codes"
          v-loading="loading"
          style="width: 100%"
          @selection-change="handleSelectionChange"
          :show-header="true"
          :border="false"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="code" label="激活码" width="200">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'">
                {{ row.code }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="description" label="描述" min-width="150" />
          
          <el-table-column label="使用情况" width="120">
            <template #default="{ row }">
              <span>{{ row.currentUses }}</span>
              <span v-if="row.maxUses > 0"> / {{ row.maxUses }}</span>
              <span v-else> / ∞</span>
            </template>
          </el-table-column>

          <el-table-column label="使用者" width="200">
            <template #default="{ row }">
              <div v-if="row.lastUsedBy" class="user-info">
                <el-avatar
                  :size="24"
                  :src="row.lastUsedBy.avatar"
                  class="user-avatar"
                >
                  {{ row.lastUsedBy.displayName?.[0] || row.lastUsedBy.username?.[0] }}
                </el-avatar>
                <div class="user-details">
                  <div class="user-name">{{ row.lastUsedBy.displayName || row.lastUsedBy.username }}</div>
                  <div class="user-email">{{ row.lastUsedBy.email }}</div>
                </div>
              </div>
              <el-tag v-else type="info" size="small">未使用</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row)">
                {{ getStatusText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="expiresAt" label="过期时间" width="180">
            <template #default="{ row }">
              <span v-if="row.expiresAt">
                {{ formatDate(row.expiresAt) }}
              </span>
              <el-tag v-else type="success" size="small">永不过期</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button
                  size="small"
                  type="primary"
                  :icon="Edit"
                  @click="editCode(row)"
                  :disabled="!row.isActive"
                  class="action-btn"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  :type="row.isActive ? 'warning' : 'success'"
                  :icon="row.isActive ? Minus : Plus"
                  @click="toggleCodeStatus(row)"
                  class="action-btn"
                >
                  {{ row.isActive ? '禁用' : '启用' }}
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  :icon="Delete"
                  @click="deleteCode(row)"
                  class="action-btn"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页器 -->
        <div class="pagination-section">

          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 创建激活码对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建激活码"
      width="600px"
      :before-close="closeCreateDialog"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="120px"
      >
        <el-form-item label="生成方式">
          <el-radio-group v-model="createForm.mode">
            <el-radio value="single">单个创建</el-radio>
            <el-radio value="batch">批量创建</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item 
          v-if="createForm.mode === 'batch'" 
          label="生成数量" 
          prop="count"
        >
          <el-input-number
            v-model="createForm.count"
            :min="1"
            :max="100"
            style="width: 200px;"
          />
        </el-form-item>

        <el-form-item 
          v-if="createForm.mode === 'single'" 
          label="激活码" 
          prop="code"
        >
          <el-input
            v-model="createForm.code"
            placeholder="留空自动生成"
            style="width: 300px;"
          >
            <template #append>
              <el-button @click="generateRandomCode">随机生成</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入激活码描述（可选，留空将使用默认描述）"
          />
        </el-form-item>

        <el-form-item label="使用次数限制">
          <el-radio-group v-model="createForm.usageType">
            <el-radio value="unlimited">无限制</el-radio>
            <el-radio value="limited">限制次数</el-radio>
          </el-radio-group>
          <el-input-number
            v-if="createForm.usageType === 'limited'"
            v-model="createForm.maxUses"
            :min="1"
            :max="1000"
            style="width: 150px; margin-left: 10px;"
          />
        </el-form-item>

        <el-form-item label="有效期">
          <el-radio-group v-model="createForm.expirationType">
            <el-radio value="never">永不过期</el-radio>
            <el-radio value="custom">自定义过期时间</el-radio>
          </el-radio-group>
          <el-date-picker
            v-if="createForm.expirationType === 'custom'"
            v-model="createForm.expiresAt"
            type="datetime"
            placeholder="选择过期时间"
            style="margin-left: 10px;"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeCreateDialog">取消</el-button>
        <el-button type="primary" @click="createCodes" :loading="creating">
          {{ creating ? '创建中...' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑激活码对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑激活码"
      width="500px"
      :before-close="closeEditDialog"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="120px"
      >
        <el-form-item label="激活码">
          <el-input v-model="editForm.code" disabled />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>

        <el-form-item label="使用次数限制">
          <el-input-number
            v-model="editForm.maxUses"
            :min="-1"
            :max="1000"
            style="width: 150px;"
          />
          <div class="form-tip">-1 表示无限制</div>
        </el-form-item>

        <el-form-item label="过期时间">
          <el-date-picker
            v-model="editForm.expiresAt"
            type="datetime"
            placeholder="选择过期时间，留空表示永不过期"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeEditDialog">取消</el-button>
        <el-button type="primary" @click="updateCode" :loading="updating">
          {{ updating ? '更新中...' : '更新' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Key,
  CircleCheck,
  CircleClose,
  DataAnalysis,
  Search,
  Select,
  Delete,
  Close,
  Edit,
  Minus
} from '@element-plus/icons-vue'
import { adminTempEmailActivationCodesApi } from '@/api/tempEmailAuth'

// 响应式数据
const loading = ref(false)
const codes = ref([])
const stats = ref(null)
const selectedCodes = ref([])

// 跨页选择管理
const selectedCodesMap = ref(new Map()) // 存储所有选中的激活码 ID -> 激活码对象
const currentPageSelectedIds = ref(new Set()) // 当前页面选中的ID
const isRestoringSelection = ref(false) // 标记是否正在恢复选择状态

// 搜索和筛选
const searchQuery = ref('')
const statusFilter = ref('')
const usageFilter = ref('')

// 分页
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0
})

// 创建对话框
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref()
const tableRef = ref()
const createForm = reactive({
  mode: 'single',
  count: 10,
  code: '',
  description: '',
  usageType: 'unlimited',
  maxUses: 10,
  expirationType: 'never',
  expiresAt: null
})

const createRules = {
  count: [
    { required: true, message: '请输入生成数量', trigger: 'blur' },
    { type: 'number', min: 1, max: 100, message: '数量必须在1-100之间', trigger: 'blur' }
  ],
  description: [
    { max: 200, message: '描述最多200个字符', trigger: 'blur' }
  ]
}

// 编辑对话框
const showEditDialog = ref(false)
const updating = ref(false)
const editFormRef = ref()
const editForm = reactive({
  id: '',
  code: '',
  description: '',
  maxUses: -1,
  expiresAt: null
})

const editRules = {
  description: [
    { required: true, message: '请输入描述', trigger: 'blur' },
    { max: 200, message: '描述最多200个字符', trigger: 'blur' }
  ]
}

// 方法
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const getStatusType = (row) => {
  if (!row.isActive) return 'danger'
  if (!row.isAvailable) return 'warning'
  return 'success'
}

const getStatusText = (row) => {
  if (!row.isActive) return '已禁用'
  if (!row.isAvailable) return '不可用'
  return '可用'
}

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  createForm.code = result
}

// API调用方法
const refreshCodes = async () => {
  try {
    loading.value = true

    // 构建查询参数
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }

    // 添加搜索条件
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }

    // 添加状态筛选
    if (statusFilter.value) {
      params.status = statusFilter.value
    }

    // 添加使用状态筛选
    if (usageFilter.value) {
      params.usage = usageFilter.value
    }



    // 获取激活码列表
    const codesResponse = await adminTempEmailActivationCodesApi.getActivationCodes(params)
    if (codesResponse.success) {
      codes.value = codesResponse.data.codes || []
      // 更新分页信息 - 支持两种数据结构
      const total = codesResponse.data.total || codesResponse.data.pagination?.total || 0
      pagination.value.total = total

      if (codesResponse.data.pagination) {
        pagination.value.page = codesResponse.data.pagination.page || pagination.value.page
        pagination.value.limit = codesResponse.data.pagination.limit || pagination.value.limit
      }

      // 恢复当前页面的选择状态
      restoreCurrentPageSelection()
    }

    // 获取统计信息
    const statsResponse = await adminTempEmailActivationCodesApi.getStats()
    if (statsResponse.success) {
      stats.value = statsResponse.data
    }

  } catch (error) {
    console.error('刷新激活码列表失败:', error)
    ElMessage.error('刷新激活码列表失败')
  } finally {
    loading.value = false
  }
}

const createCodes = async () => {
  try {
    // 表单验证
    const valid = await createFormRef.value.validate()
    if (!valid) return

    creating.value = true

    let response
    if (createForm.mode === 'batch') {
      // 批量创建
      const data = {
        count: createForm.count,
        description: createForm.description,
        maxUses: createForm.usageType === 'unlimited' ? -1 : createForm.maxUses,
        expiresAt: createForm.expirationType === 'custom' ? createForm.expiresAt : null
      }
      response = await adminTempEmailActivationCodesApi.createBatchActivationCodes(data)
    } else {
      // 单个创建
      const data = {
        code: createForm.code || undefined,
        description: createForm.description,
        maxUses: createForm.usageType === 'unlimited' ? -1 : createForm.maxUses,
        expiresAt: createForm.expirationType === 'custom' ? createForm.expiresAt : null
      }

      response = await adminTempEmailActivationCodesApi.createActivationCode(data)
    }

    if (response.success) {
      ElMessage.success(response.message)
      closeCreateDialog()
      refreshCodes()
    } else {
      ElMessage.error(response.message || '创建失败')
    }

  } catch (error) {
    console.error('创建激活码失败:', error)
    const errorMessage = error.response?.data?.message || error.message || '创建失败'
    ElMessage.error(errorMessage)
  } finally {
    creating.value = false
  }
}

const editCode = (row) => {
  editForm.id = row._id
  editForm.code = row.code
  editForm.description = row.description
  editForm.maxUses = row.maxUses
  editForm.expiresAt = row.expiresAt ? new Date(row.expiresAt) : null
  showEditDialog.value = true
}

const updateCode = async () => {
  try {
    // 表单验证
    const valid = await editFormRef.value.validate()
    if (!valid) return

    updating.value = true

    const data = {
      description: editForm.description,
      maxUses: editForm.maxUses,
      expiresAt: editForm.expiresAt
    }

    const response = await adminTempEmailActivationCodesApi.updateActivationCode(editForm.id, data)

    if (response.success) {
      ElMessage.success('激活码更新成功')
      closeEditDialog()
      refreshCodes()
    } else {
      ElMessage.error(response.message || '更新失败')
    }

  } catch (error) {
    console.error('更新激活码失败:', error)
    const errorMessage = error.response?.data?.message || error.message || '更新失败'
    ElMessage.error(errorMessage)
  } finally {
    updating.value = false
  }
}

const toggleCodeStatus = async (row) => {
  try {
    const action = row.isActive ? '禁用' : '启用'
    await ElMessageBox.confirm(`确定要${action}这个激活码吗？`, `确认${action}`, {
      type: 'warning'
    })

    const response = await adminTempEmailActivationCodesApi.toggleActivationCodeStatus(row._id)

    if (response.success) {
      ElMessage.success(response.message)
      refreshCodes()
    } else {
      ElMessage.error(response.message || `${action}失败`)
    }

  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换激活码状态失败:', error)
      const errorMessage = error.response?.data?.message || error.message || '操作失败'
      ElMessage.error(errorMessage)
    }
  }
}

const deleteCode = async (row) => {
  try {
    let confirmMessage = '确定要删除这个激活码吗？删除后无法恢复。'

    // 如果激活码是启用状态，提示会先禁用
    if (row.isActive) {
      confirmMessage = '删除前会先禁用该激活码，确定要继续吗？删除后无法恢复。'
    }

    await ElMessageBox.confirm(confirmMessage, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger'
    })

    // 如果激活码是启用状态，先禁用
    if (row.isActive) {
      ElMessage.info('正在禁用激活码...')
      await adminTempEmailActivationCodesApi.toggleActivationCodeStatus(row._id)
    }

    const response = await adminTempEmailActivationCodesApi.deleteActivationCode(row._id)

    if (response.success) {
      ElMessage.success('激活码删除成功')
      refreshCodes()
    } else {
      ElMessage.error(response.message || '删除失败')
    }

  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除激活码失败:', error)
      const errorMessage = error.response?.data?.message || error.message || '删除失败'
      ElMessage.error(errorMessage)
    }
  }
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  Object.assign(createForm, {
    mode: 'single',
    count: 10,
    code: '',
    description: '',
    usageType: 'unlimited',
    maxUses: 10,
    expirationType: 'never',
    expiresAt: null
  })
}

const closeEditDialog = () => {
  showEditDialog.value = false
  Object.assign(editForm, {
    id: '',
    code: '',
    description: '',
    maxUses: -1,
    expiresAt: null
  })
}

// 搜索和筛选方法
let searchTimeout = null
const handleSearch = () => {
  // 防抖处理
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1 // 重置到第一页
    clearSelection() // 搜索时清除选择
    refreshCodes()
  }, 500)
}

const handleFilter = () => {
  pagination.value.page = 1 // 重置到第一页
  clearSelection() // 筛选时清除选择
  refreshCodes()
}

const resetFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  usageFilter.value = ''
  pagination.value.page = 1
  clearSelection() // 重置时清除选择
  refreshCodes()
}

// 分页方法
const handlePageChange = (page) => {
  pagination.value.page = page
  // 不再清除选择，保持跨页选择状态
  refreshCodes()
}

const handleSizeChange = (size) => {
  pagination.value.limit = size
  pagination.value.page = 1
  // 页面大小变更时清除选择（因为数据结构改变）
  clearSelection()
  refreshCodes()
}

// 跨页选择管理方法
const restoreCurrentPageSelection = () => {
  // 恢复当前页面的选择状态
  nextTick(() => {
    if (!tableRef.value) return

    isRestoringSelection.value = true

    // 清除表格当前选择
    tableRef.value.clearSelection()

    // 找到当前页面中应该被选中的项
    const currentPageSelected = codes.value.filter(code =>
      selectedCodesMap.value.has(code._id)
    )

    // 设置表格选中状态
    currentPageSelected.forEach(code => {
      tableRef.value.toggleRowSelection(code, true)
    })

    // 更新当前页面选中的ID集合
    currentPageSelectedIds.value = new Set(currentPageSelected.map(code => code._id))

    // 更新全局选中列表（包含所有页面的选择）
    selectedCodes.value = Array.from(selectedCodesMap.value.values())

    isRestoringSelection.value = false
  })
}

const updateGlobalSelection = (selection) => {
  // 移除当前页面之前选中的项
  codes.value.forEach(code => {
    if (currentPageSelectedIds.value.has(code._id) && !selection.find(s => s._id === code._id)) {
      selectedCodesMap.value.delete(code._id)
    }
  })

  // 添加当前页面新选中的项
  selection.forEach(code => {
    selectedCodesMap.value.set(code._id, code)
  })

  // 更新当前页面选中的ID集合
  currentPageSelectedIds.value = new Set(selection.map(code => code._id))

  // 更新全局选中列表
  selectedCodes.value = Array.from(selectedCodesMap.value.values())
}

// 批量操作相关方法
const handleSelectionChange = (selection) => {
  // 如果正在恢复选择状态，不处理选择变更
  if (isRestoringSelection.value) return

  updateGlobalSelection(selection)
}

const clearSelection = () => {
  selectedCodes.value = []
  selectedCodesMap.value.clear()
  currentPageSelectedIds.value.clear()

  // 清除表格选择状态
  if (tableRef.value) {
    tableRef.value.clearSelection()
  }
}

const handleBatchAction = async (command) => {
  if (selectedCodes.value.length === 0) {
    ElMessage.warning('请先选择要操作的激活码')
    return
  }

  const selectedIds = selectedCodes.value.map(code => code._id)
  const actionText = {
    enable: '启用',
    disable: '禁用',
    delete: '删除'
  }[command]

  try {
    let confirmMessage = `确定要${actionText}选中的 ${selectedCodes.value.length} 个激活码吗？`

    // 批量删除时显示详细信息
    if (command === 'delete') {
      const codesList = selectedCodes.value.map(code => {
        const usedBy = code.lastUsedBy ?
          `(已被 ${code.lastUsedBy.displayName || code.lastUsedBy.username} 使用)` :
          '(未使用)'
        return `• ${code.code} ${usedBy}`
      }).join('\n')

      confirmMessage = `确定要删除以下 ${selectedCodes.value.length} 个激活码吗？\n\n${codesList}\n\n此操作不可撤销！`
    }

    await ElMessageBox.confirm(
      confirmMessage,
      `批量${actionText}`,
      {
        type: command === 'delete' ? 'error' : 'warning',
        confirmButtonClass: command === 'delete' ? 'el-button--danger' : '',
        dangerouslyUseHTMLString: false
      }
    )

    // 执行批量操作
    switch (command) {
      case 'enable':
        await batchToggleStatus(selectedIds, true)
        break
      case 'disable':
        await batchToggleStatus(selectedIds, false)
        break
      case 'delete':
        await batchDelete(selectedIds)
        break
    }

    ElMessage.success(`批量${actionText}成功`)
    clearSelection() // 操作完成后清除选择
    refreshCodes()

  } catch (error) {
    if (error !== 'cancel') {
      console.error(`批量${actionText}失败:`, error)
      ElMessage.error(`批量${actionText}失败`)
    }
  }
}

const batchToggleStatus = async (ids, isActive) => {
  await adminTempEmailActivationCodesApi.batchToggleActivationCodeStatus(ids, isActive)
}

const batchDelete = async (ids) => {
  await adminTempEmailActivationCodesApi.batchDeleteActivationCodes(ids)
}

// 组件挂载时初始化
onMounted(() => {
  refreshCodes()
})
</script>

<style scoped>
.activation-codes-container {
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-section {
  margin-bottom: 28px;
  padding: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.codes-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: #718096;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.batch-operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-icon {
  font-size: 20px;
  opacity: 0.9;
}

.batch-text {
  font-size: 15px;
  font-weight: 600;
}

.cross-page-hint {
  color: #ffd93d;
  font-weight: 700;
  margin-left: 6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.batch-actions {
  display: flex;
  gap: 12px;
}

.batch-actions .el-button {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
}

.batch-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.batch-actions .el-button.is-danger {
  background: rgba(245, 101, 101, 0.2);
  border-color: rgba(245, 101, 101, 0.4);
}

.batch-actions .el-button.is-danger:hover {
  background: rgba(245, 101, 101, 0.3);
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 16px 0;
}

/* Element Plus 组件美化 */
:deep(.el-card) {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

:deep(.el-table) {
  border-radius: 0;
  margin: 0;
  border: none;
}

:deep(.el-table__header-wrapper) {
  background: #f7fafc;
}

:deep(.el-table__header) {
  background: #f7fafc;
  margin: 0;
}

:deep(.el-table th) {
  background: #f7fafc;
  color: #4a5568;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 8px;
  border-right: none;
}

:deep(.el-table td) {
  border-bottom: 1px solid #f1f5f9;
  padding: 12px 8px;
  border-right: none;
}

:deep(.el-table__row:hover) {
  background: #f8fafc;
}

:deep(.el-table__body-wrapper) {
  border: none;
}

:deep(.el-table__empty-block) {
  display: none;
}

:deep(.el-table__append-wrapper) {
  display: none;
}

:deep(.el-table::before) {
  display: none;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  border: none;
  font-weight: 500;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  border: none;
}

:deep(.el-button--danger) {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  border: none;
}

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
  border: none;
}

:deep(.el-tag.el-tag--success) {
  background: #f0fff4;
  color: #38a169;
}

:deep(.el-tag.el-tag--danger) {
  background: #fed7d7;
  color: #e53e3e;
}

:deep(.el-tag.el-tag--warning) {
  background: #fefcbf;
  color: #d69e2e;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
}

.action-btn {
  min-width: 50px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 12px;
  padding: 4px 8px;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.action-btn.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.is-disabled:hover {
  transform: none;
  box-shadow: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .activation-codes-container {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .batch-operation-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    padding: 20px;
  }

  .batch-actions {
    justify-content: center;
  }
}
</style>
