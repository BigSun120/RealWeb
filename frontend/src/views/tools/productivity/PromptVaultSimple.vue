<template>
  <div class="prompt-vault">
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-text">
        <h1 class="title">AI 提示词管理</h1>
        <p class="description">集中管理你的 AI 提示词模板，支持变量替换、分类组织和使用统计</p>
        <div class="stats-line">
          <span>共 {{ stats.total }} 个提示词</span>
          <span>{{ stats.folders }} 个文件夹</span>
          <span>使用 {{ stats.totalUsage }} 次</span>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" :icon="Plus" @click="loadData">新建提示词</el-button>
        <el-button :icon="FolderAdd" @click="loadData">新建文件夹</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
      </div>
    </section>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧文件夹树 -->
      <aside class="sidebar">
        <el-card shadow="hover">
          <template #header>
            <div class="sidebar-header">
              <span>文件夹</span>
            </div>
          </template>
          <p>文件夹列表</p>
        </el-card>
      </aside>

      <!-- 右侧提示词列表 -->
      <main class="content">
        <!-- 筛选栏 -->
        <el-card class="filter-card" shadow="never">
          <div class="filter-grid">
            <el-input
              v-model="filters.search"
              placeholder="搜索标题、内容或标签"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </el-card>

        <!-- 提示词列表 -->
        <div v-loading="loading" class="prompt-list">
          <el-empty v-if="!loading && prompts.length === 0" description="暂无提示词" />

          <el-card
            v-for="prompt in prompts"
            :key="prompt.id"
            class="prompt-card"
            shadow="hover"
          >
            <h3>{{ prompt.title }}</h3>
            <p>{{ prompt.description }}</p>
          </el-card>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Plus, FolderAdd, Refresh, Search
} from '@element-plus/icons-vue';
import promptService from '@/services/promptService';

// 数据
const loading = ref(false);
const prompts = ref([]);

// 筛选条件
const filters = reactive({
  search: '',
  category: '',
  aiModel: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});

// 统计数据
const stats = reactive({
  total: 0,
  folders: 0,
  totalUsage: 0
});

// 生命周期
onMounted(() => {
  loadData();
});

// 方法
async function loadData() {
  await loadPrompts();
}

async function loadPrompts() {
  try {
    loading.value = true;
    const params = {
      page: 1,
      limit: 12,
      search: filters.search,
      category: filters.category,
      aiModel: filters.aiModel,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };

    const response = await promptService.getPrompts(params);
    prompts.value = response.prompts || [];
    stats.total = response.pagination?.total || 0;
    stats.totalUsage = (response.prompts || []).reduce((sum, p) => sum + (p.usageCount || 0), 0);
  } catch (error) {
    ElMessage.error('加载提示词失败: ' + error.message);
    console.error('加载失败:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.prompt-vault {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 32px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  .header-text {
    flex: 1;

    .title {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #1a202c;
    }

    .description {
      margin: 0 0 12px;
      color: #2d3748;
    }

    .stats-line {
      display: flex;
      gap: 20px;
      font-size: 14px;
      color: #4a5568;
    }
  }

  .actions {
    display: flex;
    gap: 12px;
  }
}

.main-content {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
}

.sidebar {
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.content {
  min-height: 600px;
}

.filter-card {
  margin-bottom: 20px;

  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.prompt-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.prompt-card {
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
  }

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: #1a202c;
  }

  p {
    margin: 0;
    color: #2d3748;
    font-size: 14px;
  }
}
</style>
