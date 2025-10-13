<template>
  <div class="drama-script-generator">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">🎬</span>
          AI短剧脚本生成器
        </h1>
        <div class="header-actions">
          <el-button
            type="primary"
            size="large"
            :icon="Plus"
            @click="handleCreateProject"
          >
            新建项目
          </el-button>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索项目名称、描述..."
        :prefix-icon="Search"
        clearable
        class="search-input"
        @input="handleSearch"
      />
      
      <el-select
        v-model="filterStatus"
        placeholder="状态筛选"
        clearable
        class="filter-select"
        @change="handleFilter"
      >
        <el-option label="全部状态" value="" />
        <el-option label="设定中" value="设定中" />
        <el-option label="大纲中" value="大纲中" />
        <el-option label="剧本中" value="剧本中" />
        <el-option label="已完成" value="已完成" />
      </el-select>
      
      <el-select
        v-model="filterType"
        placeholder="类型筛选"
        clearable
        class="filter-select"
        @change="handleFilter"
      >
        <el-option label="全部类型" value="" />
        <el-option label="霸道总裁" value="霸道总裁" />
        <el-option label="悬疑推理" value="悬疑推理" />
        <el-option label="甜宠日常" value="甜宠日常" />
        <el-option label="复仇爽剧" value="复仇爽剧" />
        <el-option label="古装穿越" value="古装穿越" />
        <el-option label="职场励志" value="职场励志" />
      </el-select>
      
      <el-select
        v-model="sortBy"
        placeholder="排序方式"
        class="filter-select"
        @change="handleSort"
      >
        <el-option label="修改时间降序" value="updatedAt-desc" />
        <el-option label="修改时间升序" value="updatedAt-asc" />
        <el-option label="创建时间降序" value="createdAt-desc" />
        <el-option label="创建时间升序" value="createdAt-asc" />
        <el-option label="进度降序" value="progress-desc" />
        <el-option label="进度升序" value="progress-asc" />
      </el-select>
      
      <div class="filter-result">
        <el-tag type="info" size="small">
          显示 {{ filteredProjects.length }} / {{ projects.length }} 个项目
        </el-tag>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-container">
      <el-row :gutter="16">
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #FF6B6B, #EE5A6F); color: white;">
              📁
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.total }}</div>
              <div class="stat-label">总项目数</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #51CF66, #37B24D); color: white;">
              ✅
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.completed }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #FFA94D, #FF922B); color: white;">
              ⏳
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.inProgress }}</div>
              <div class="stat-label">进行中</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #FF8787, #FA5252); color: white;">
              📝
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.totalEpisodes }}</div>
              <div class="stat-label">总集数</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 项目列表 -->
    <ProjectList
      :projects="filteredProjects"
      :loading="loading"
      @create="handleCreateProject"
      @open="handleOpenProject"
      @edit="handleEditProject"
      @delete="handleDeleteProject"
      @export="handleExportProject"
      @refresh="loadProjects"
    />

    <!-- 导出对话框 -->
    <ExportDialog
      ref="exportDialogRef"
      v-model="exportDialogVisible"
      :project-id="currentExportProject?._id || currentExportProject?.id || ''"
      :project-name="currentExportProject?.name || ''"
      :project-data="currentExportProjectData"
      @confirm="handleConfirmExport"
    />

    <!-- 创建/编辑项目对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="projectForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input
            v-model="projectForm.name"
            placeholder="例如：霸道总裁的百日契约"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="剧本类型" prop="type">
          <el-select
            v-model="projectForm.type"
            placeholder="选择短剧类型"
            style="width: 100%"
          >
            <el-option label="霸道总裁" value="霸道总裁">
              <span>👔 霸道总裁</span>
            </el-option>
            <el-option label="悬疑推理" value="悬疑推理">
              <span>🔍 悬疑推理</span>
            </el-option>
            <el-option label="甜宠日常" value="甜宠日常">
              <span>💕 甜宠日常</span>
            </el-option>
            <el-option label="复仇爽剧" value="复仇爽剧">
              <span>⚔️ 复仇爽剧</span>
            </el-option>
            <el-option label="古装穿越" value="古装穿越">
              <span>🏯 古装穿越</span>
            </el-option>
            <el-option label="职场励志" value="职场励志">
              <span>💼 职场励志</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="计划集数" prop="episodeCount">
          <el-input-number
            v-model="projectForm.episodeCount"
            :min="1"
            :max="100"
            :step="1"
            style="width: 100%"
          />
          <div class="form-tip">建议 30-80 集，每集 1-3 分钟</div>
        </el-form-item>

        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            :rows="4"
            placeholder="简要描述你的短剧创意、核心冲突、主要角色等..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditMode ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import ProjectList from './components/ProjectList.vue';
import ExportDialog from './components/ExportDialog.vue';
import {
  getDramaProjects,
  getDramaProject,
  createDramaProject,
  updateDramaProject,
  deleteDramaProject,
  getDramaStatistics,
  exportDramaProject
} from '@/api/drama';
import { downloadBlob, generateFilename } from '@/utils/download';

const router = useRouter();

// 数据状态
const loading = ref(false);
const projects = ref([]);

// 搜索和筛选状态
const searchKeyword = ref('');
const filterStatus = ref('');
const filterType = ref('');
const sortBy = ref('updatedAt-desc');

// 对话框状态
const dialogVisible = ref(false);
const submitting = ref(false);
const isEditMode = ref(false);
const currentProjectId = ref(null);

// 导出对话框状态
const exportDialogVisible = ref(false);
const exportDialogRef = ref(null);
const currentExportProject = ref(null);
const currentExportProjectData = ref(null);

// 表单
const formRef = ref(null);
const projectForm = reactive({
  name: '',
  type: '',
  episodeCount: 60,
  description: ''
});

const formRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '项目名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择剧本类型', trigger: 'change' }
  ],
  episodeCount: [
    { required: true, message: '请输入计划集数', trigger: 'blur' },
    { type: 'number', min: 1, max: 100, message: '集数范围 1-100', trigger: 'blur' }
  ]
};

// 筛选和排序后的项目列表
const filteredProjects = computed(() => {
  let result = [...projects.value];
  
  // 1. 搜索过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(project => {
      const name = (project.name || '').toLowerCase();
      const description = (project.description || '').toLowerCase();
      const type = (project.type || '').toLowerCase();
      return name.includes(keyword) || description.includes(keyword) || type.includes(keyword);
    });
  }
  
  // 2. 状态筛选
  if (filterStatus.value) {
    result = result.filter(project => project.status === filterStatus.value);
  }
  
  // 3. 类型筛选
  if (filterType.value) {
    result = result.filter(project => project.type === filterType.value);
  }
  
  // 4. 排序
  const [sortField, sortOrder] = sortBy.value.split('-');
  result.sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // 处理日期字段
    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    // 处理数字字段
    if (sortField === 'progress') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    }
    
    if (sortOrder === 'desc') {
      return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
    } else {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    }
  });
  
  return result;
});

// 搜索处理
const handleSearch = () => {
  // 计算属性会自动触发
};

// 筛选处理
const handleFilter = () => {
  // 计算属性会自动触发
};

// 排序处理
const handleSort = () => {
  // 计算属性会自动触发
};

// 统计数据（后端提供）
const statistics = ref({
  total: 0,
  completed: 0,
  inProgress: 0,
  totalEpisodes: 0
});

const loadStatistics = async () => {
  try {
    const response = await getDramaStatistics();
    if (response.code === 200) {
      statistics.value = response.data;
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

// 对话框标题
const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑项目' : '新建项目';
});

// 加载项目列表
const loadProjects = async () => {
  loading.value = true;
  try {
    const response = await getDramaProjects();
    if (response.code === 200) {
      projects.value = response.data.items;
      // 加载后端统计，保持口径一致
      await loadStatistics();
    } else {
      throw new Error(response.message || '加载失败');
    }
  } catch (error) {
    console.error('加载项目列表失败:', error);
    ElMessage.error(error.message || '加载项目列表失败');
  } finally {
    loading.value = false;
  }
};

// 创建项目
const handleCreateProject = () => {
  isEditMode.value = false;
  currentProjectId.value = null;
  resetForm();
  dialogVisible.value = true;
};

// 打开项目（进入工作台）
const handleOpenProject = (project) => {
  router.push({
    name: 'DramaWorkbench',
    params: { id: project._id || project.id }
  });
};

// 编辑项目
const handleEditProject = (project) => {
  isEditMode.value = true;
  currentProjectId.value = project._id || project.id;
  Object.assign(projectForm, {
    name: project.name,
    type: project.type,
    episodeCount: project.episodeCount,
    description: project.description || ''
  });
  dialogVisible.value = true;
};

// 删除项目
const handleDeleteProject = async (project) => {
  try {
    const response = await deleteDramaProject(project._id || project.id);
if (response.code === 200) {
      projects.value = projects.value.filter(p => (p._id || p.id) !== (project._id || project.id));
      // 删除后刷新统计
      await loadStatistics();
      ElMessage.success('项目已删除');
    } else {
      throw new Error(response.message || '删除失败');
    }
  } catch (error) {
    console.error('删除项目失败:', error);
    ElMessage.error(error.message || '删除项目失败');
  }
};

// 导出项目
const handleExportProject = async (project) => {
  try {
    // 获取完整项目数据
    const response = await getDramaProject(project._id || project.id);
    if (response.code === 200) {
      currentExportProject.value = project;
      currentExportProjectData.value = response.data;
      exportDialogVisible.value = true;
    } else {
      throw new Error(response.message || '获取项目数据失败');
    }
  } catch (error) {
    console.error('获取项目数据失败:', error);
    ElMessage.error(error.message || '无法获取项目数据，请稍后再试');
  }
};

// 确认导出
const handleConfirmExport = async (options) => {
  if (!currentExportProject.value) return;
  
  // 设置导出中状态
  if (exportDialogRef.value) {
    exportDialogRef.value.setExporting(true);
  }

  try {
    const projectId = currentExportProject.value._id || currentExportProject.value.id;
    const blob = await exportDramaProject(projectId, options);
    
    // 生成文件名
    const ext = options.format === 'markdown' ? 'md' : 'txt';
    const filename = generateFilename(currentExportProject.value.name, ext);
    
    // 下载文件
    downloadBlob(blob, filename);
    
    ElMessage.success('导出成功');
    exportDialogVisible.value = false;
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error(error.message || '导出失败，请稍后再试');
  } finally {
    // 恢复状态
    if (exportDialogRef.value) {
      exportDialogRef.value.setExporting(false);
    }
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (isEditMode.value) {
        const response = await updateDramaProject(currentProjectId.value, projectForm);
        if (response.code === 200) {
          const index = projects.value.findIndex(p => (p._id || p.id) === currentProjectId.value);
          if (index !== -1) {
            projects.value[index] = response.data;
          }
          ElMessage.success('项目已更新');
        } else {
          throw new Error(response.message || '更新失败');
        }
      } else {
        const response = await createDramaProject(projectForm);
        if (response.code === 201) {
          projects.value.unshift(response.data);
          ElMessage.success('项目创建成功');
          
          // 创建后直接进入工作台
          setTimeout(() => {
            handleOpenProject(response.data);
          }, 500);
        } else {
          throw new Error(response.message || '创建失败');
        }
      }
      
      dialogVisible.value = false;
      resetForm();
    } catch (error) {
      console.error('操作失败:', error);
      ElMessage.error(error.message || (isEditMode.value ? '更新项目失败' : '创建项目失败'));
    } finally {
      submitting.value = false;
    }
  });
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  Object.assign(projectForm, {
    name: '',
    type: '',
    episodeCount: 60,
    description: ''
  });
};

// 初始化
onMounted(() => {
  loadProjects();
});
</script>

<style scoped>
.drama-script-generator {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  background: white;
  border-radius: 8px;
  padding: 16px 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #303133;
}

.title-icon {
  font-size: 28px;
}

.header-actions {
  flex-shrink: 0;
}

/* 筛选栏样式 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  width: 160px;
}

.filter-result {
  margin-left: auto;
}

.stats-container {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .drama-script-generator {
    padding: 16px;
  }

  .page-header {
    padding: 24px 20px;
  }

  .page-title {
    font-size: 24px;
  }

  .title-icon {
    font-size: 28px;
  }

  .page-description {
    font-size: 14px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-button {
    width: 100%;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>
