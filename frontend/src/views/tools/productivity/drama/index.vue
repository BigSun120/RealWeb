<template>
  <div class="drama-script-generator">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">🎬</span>
            AI短剧脚本生成器
          </h1>
          <p class="page-description">
            智能生成短剧剧本，从世界观设定到分集剧本，一站式创作助手
          </p>
        </div>
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
      :projects="projects"
      :loading="loading"
      @create="handleCreateProject"
      @open="handleOpenProject"
      @edit="handleEditProject"
      @delete="handleDeleteProject"
      @export="handleExportProject"
      @refresh="loadProjects"
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
import { Plus } from '@element-plus/icons-vue';
import ProjectList from './components/ProjectList.vue';
import {
  getDramaProjects,
  createDramaProject,
  updateDramaProject,
  deleteDramaProject,
  getDramaStatistics
} from '@/api/drama';

const router = useRouter();

// 数据状态
const loading = ref(false);
const projects = ref([]);

// 对话框状态
const dialogVisible = ref(false);
const submitting = ref(false);
const isEditMode = ref(false);
const currentProjectId = ref(null);

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
const handleExportProject = (project) => {
  ElMessage.info('导出功能开发中...');
  // TODO: 实现导出功能
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  color: white;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 40px;
}

.page-description {
  font-size: 16px;
  margin: 0;
  opacity: 0.95;
}

.header-actions {
  flex-shrink: 0;
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
