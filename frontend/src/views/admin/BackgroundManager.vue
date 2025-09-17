<template>
  <div class="background-manager">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon class="title-icon"><Picture /></el-icon>
            页面背景配置管理
          </h1>
          <p class="page-description">
            <span class="description-highlight">通过路径匹配为不同页面配置背景图片，支持精确匹配、前缀匹配、通配符和正则表达式</span>
          </p>
        </div>
        <div class="header-right">
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-number">{{ total }}</div>
              <div class="stat-label">总配置数</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ activeCount }}</div>
              <div class="stat-label">激活配置</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" size="default" @click="showCreateDialog = true">
            <el-icon><plus /></el-icon>
            新增配置
          </el-button>

          <el-button type="success" size="default" @click="testCurrentPath" v-if="currentTestPath">
            <el-icon><View /></el-icon>
            测试当前路径 ({{ currentTestPath }})
          </el-button>
        </div>

        <div class="toolbar-right">
          <div class="search-group">
            <el-input
              v-model="searchQuery"
              placeholder="搜索路径、描述..."
              style="width: 280px"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><search /></el-icon>
              </template>
            </el-input>

            <el-select
              v-model="filterActive"
              placeholder="状态筛选"
              style="width: 130px"
              clearable
              @change="loadConfigs"
            >
              <el-option label="全部" :value="null" />
              <el-option label="激活" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>

            <el-button @click="loadConfigs" :loading="loading">
              <el-icon><refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 配置列表 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <span class="table-title">配置列表</span>
          <el-tag v-if="configs.length > 0" type="info" size="small">
            共 {{ total }} 条记录
          </el-tag>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="configs"
        stripe
        style="width: 100%"
        :empty-text="configs.length === 0 ? '暂无配置数据，点击新增配置开始使用' : '暂无数据'"
        class="config-table"
      >
        
        <el-table-column label="路径配置" min-width="200">
          <template #default="{ row }">
            <div class="path-config">
              <div class="path">
                <el-tag :type="getMatchTypeTagType(row.pathConfig.matchType)" size="small">
                  {{ getMatchTypeLabel(row.pathConfig.matchType) }}
                </el-tag>
                <code class="path-text">{{ row.pathConfig.path }}</code>
              </div>
              <div class="description" v-if="row.pathConfig.description">
                {{ row.pathConfig.description }}
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="背景图片" width="120">
          <template #default="{ row }">
            <div class="image-preview" v-if="row.backgroundImage?.url">
              <el-image
                :src="getImageUrl(row.backgroundImage.url)"
                :preview-src-list="[getImageUrl(row.backgroundImage.url)]"
                fit="cover"
                style="width: 80px; height: 45px; border-radius: 4px"
                :preview-teleported="true"
              />
            </div>
            <span v-else class="no-image">无图片</span>
          </template>
        </el-table-column>
        
        <el-table-column label="优先级" width="80" sortable prop="pathConfig.priority">
          <template #default="{ row }">
            <el-tag size="small">{{ row.pathConfig.priority }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              v-model="row.isActive"
              @change="toggleActive(row)"
              :loading="row._updating"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="创建时间" width="160" sortable prop="createdAt">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editConfig(row)">
              <el-icon><edit /></el-icon>
              编辑
            </el-button>
            
            <el-button size="small" type="info" @click="previewConfig(row)">
              <el-icon><view /></el-icon>
              预览
            </el-button>
            
            <el-popconfirm
              title="确定要删除这个配置吗？"
              @confirm="deleteConfig(row._id)"
            >
              <template #reference>
                <el-button size="small" type="danger">
                  <el-icon><delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadConfigs"
          @current-change="loadConfigs"
        />
      </div>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <background-config-dialog
      v-model="showCreateDialog"
      :config="editingConfig"
      @success="handleDialogSuccess"
    />
    
    <!-- 预览对话框 -->
    <background-preview-dialog
      v-model="showPreviewDialog"
      :config="previewingConfig"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import {
  Plus, Delete, Search, Refresh, Edit, View, Picture
} from '@element-plus/icons-vue';
import {
  getBackgroundConfigs,
  getBackgroundByPath,
  deleteBackgroundConfig,
  updateBackgroundConfig,
  getImageUrl,
  getMatchTypeLabel
} from '@/api/backgrounds';
import BackgroundConfigDialog from '@/components/admin/BackgroundConfigDialog.vue';
import BackgroundPreviewDialog from '@/components/admin/BackgroundPreviewDialog.vue';

// 响应式数据
const loading = ref(false);
const configs = ref([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const searchQuery = ref('');
const filterActive = ref(null);

// 对话框状态
const showCreateDialog = ref(false);
const showPreviewDialog = ref(false);
const editingConfig = ref(null);
const previewingConfig = ref(null);

// 路由和测试
const route = useRoute();
const currentTestPath = computed(() => {
  return route.path.startsWith('/admin') ? '/auth/login' : route.path;
});

// 统计数据
const activeCount = computed(() => {
  return configs.value.filter(config => config.isActive).length;
});

// 搜索防抖
let searchTimeout = null;

// 方法
const loadConfigs = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value || undefined,
      isActive: filterActive.value
    };
    
    const response = await getBackgroundConfigs(params);
    
    if (response.data.success) {
      configs.value = response.data.data.configs;
      total.value = response.data.data.pagination.total;
    }
  } catch (error) {
    console.error('加载配置列表失败:', error);
    ElMessage.error('加载配置列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadConfigs();
  }, 500);
};



const editConfig = (config) => {
  editingConfig.value = { ...config };
  showCreateDialog.value = true;
};

const previewConfig = (config) => {
  previewingConfig.value = config;
  showPreviewDialog.value = true;
};

const toggleActive = async (config) => {
  config._updating = true;
  try {
    await updateBackgroundConfig(config._id, {
      isActive: config.isActive
    });
    
    ElMessage.success(`配置已${config.isActive ? '激活' : '停用'}`);
  } catch (error) {
    console.error('更新配置状态失败:', error);
    config.isActive = !config.isActive; // 回滚状态
    ElMessage.error('更新配置状态失败');
  } finally {
    config._updating = false;
  }
};

const deleteConfig = async (id) => {
  try {
    await deleteBackgroundConfig(id);
    ElMessage.success('配置删除成功');
    loadConfigs();
  } catch (error) {
    console.error('删除配置失败:', error);
    ElMessage.error('删除配置失败');
  }
};

const testCurrentPath = async () => {
  try {
    const response = await getBackgroundByPath(currentTestPath.value);
    if (response.data.success && response.data.data) {
      ElMessage.success(`路径 "${currentTestPath.value}" 匹配到配置: ${response.data.data.pathConfig.path}`);
    } else {
      ElMessage.warning(`路径 "${currentTestPath.value}" 未匹配到任何配置`);
    }
  } catch (error) {
    console.error('测试路径失败:', error);
    ElMessage.error('测试路径失败');
  }
};



const handleDialogSuccess = () => {
  showCreateDialog.value = false;
  editingConfig.value = null;
  loadConfigs();
};

// 工具方法
const getMatchTypeTagType = (matchType) => {
  const types = {
    exact: 'success',
    prefix: 'primary',
    wildcard: 'warning',
    regex: 'danger'
  };
  return types[matchType] || 'info';
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN');
};

// 生命周期
onMounted(() => {
  loadConfigs();
});
</script>

<style scoped>
.background-manager {
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 32px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
  opacity: 0.9;
}

.page-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.9;
  max-width: 600px;
}

.description-highlight {
  color: white;
  font-weight: 500;
}

.header-right {
  margin-left: 32px;
}

.stats-cards {
  display: flex;
  gap: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  min-width: 120px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.toolbar-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.search-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.table-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.config-table {
  border-radius: 8px;
  overflow: hidden;
}

.path-config .path {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.path-text {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.description {
  font-size: 12px;
  color: #666;
}

.image-preview {
  display: flex;
  justify-content: center;
}

.no-image {
  color: #999;
  font-size: 12px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
