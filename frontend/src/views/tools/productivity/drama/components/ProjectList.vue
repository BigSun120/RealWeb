<template>
  <div class="project-list-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索项目..."
        clearable
        prefix-icon="Search"
        style="width: 300px"
        @input="handleSearch"
      />
      
      <div class="toolbar-actions">
        <el-select
          v-model="filterStatus"
          placeholder="状态筛选"
          clearable
          style="width: 120px"
          @change="handleFilter"
        >
          <el-option label="设定中" value="设定中" />
          <el-option label="大纲中" value="大纲中" />
          <el-option label="剧本中" value="剧本中" />
          <el-option label="已完成" value="已完成" />
        </el-select>

        <el-select
          v-model="filterType"
          placeholder="类型筛选"
          clearable
          style="width: 120px"
          @change="handleFilter"
        >
          <el-option label="霸道总裁" value="霸道总裁" />
          <el-option label="悬疑推理" value="悬疑推理" />
          <el-option label="甜宠日常" value="甜宠日常" />
          <el-option label="复仇爽剧" value="复仇爽剧" />
          <el-option label="古装穿越" value="古装穿越" />
          <el-option label="职场励志" value="职场励志" />
        </el-select>

        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="grid">
            <el-icon><Grid /></el-icon>
          </el-radio-button>
          <el-radio-button label="list">
            <el-icon><List /></el-icon>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="filteredProjects.length === 0 && !loading"
      :description="emptyDescription"
      :image-size="120"
    >
      <el-button type="primary" @click="$emit('create')">
        创建第一个项目
      </el-button>
    </el-empty>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- 项目列表（网格模式） -->
    <div v-else-if="viewMode === 'grid' && filteredProjects.length > 0" class="project-grid">
      <ProjectCard
        v-for="project in filteredProjects"
        :key="project.id"
        :project="project"
        @open="handleOpen"
        @edit="handleEdit"
        @delete="handleDelete"
        @export="handleExport"
      />
    </div>

    <!-- 项目列表（列表模式） -->
    <el-table
      v-else-if="viewMode === 'list' && filteredProjects.length > 0"
      :data="filteredProjects"
      stripe
      style="width: 100%"
      @row-click="handleOpen"
    >
      <el-table-column label="项目名称" prop="name" min-width="180">
        <template #default="{ row }">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">{{ getTypeIcon(row.type) }}</span>
            <span style="font-weight: 600;">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="类型" prop="type" width="120" />
      
      <el-table-column label="状态" prop="status" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="getStatusType(row.status)">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="集数" prop="episodeCount" width="80" align="center" />
      
      <el-table-column label="进度" prop="progress" width="150">
        <template #default="{ row }">
          <el-progress :percentage="row.progress" :stroke-width="8" />
        </template>
      </el-table-column>
      
      <el-table-column label="更新时间" prop="updatedAt" width="180">
        <template #default="{ row }">
          {{ formatTime(row.updatedAt) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click.stop="handleOpen(row)">
            打开
          </el-button>
          <el-button size="small" link @click.stop="handleEdit(row)">
            编辑
          </el-button>
          <el-button size="small" link @click.stop="handleExport(row)">
            导出
          </el-button>
          <el-button
            size="small"
            type="danger"
            link
            @click.stop="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 48, 96]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Grid, List, Search } from '@element-plus/icons-vue';
import ProjectCard from './ProjectCard.vue';

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['create', 'open', 'edit', 'delete', 'export', 'refresh']);

// 视图模式
const viewMode = ref('grid');

// 搜索和筛选
const searchQuery = ref('');
const filterStatus = ref('');
const filterType = ref('');

// 分页
const currentPage = ref(1);
const pageSize = ref(12);

// 过滤后的项目列表
const filteredProjects = computed(() => {
  let result = props.projects;

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.type.includes(query) ||
      p.status.includes(query)
    );
  }

  // 状态过滤
  if (filterStatus.value) {
    result = result.filter(p => p.status === filterStatus.value);
  }

  // 类型过滤
  if (filterType.value) {
    result = result.filter(p => p.type === filterType.value);
  }

  // 分页
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return result.slice(start, end);
});

// 总数
const total = computed(() => {
  let result = props.projects;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.type.includes(query) ||
      p.status.includes(query)
    );
  }

  if (filterStatus.value) {
    result = result.filter(p => p.status === filterStatus.value);
  }

  if (filterType.value) {
    result = result.filter(p => p.type === filterType.value);
  }

  return result.length;
});

// 空状态描述
const emptyDescription = computed(() => {
  if (searchQuery.value || filterStatus.value || filterType.value) {
    return '没有找到符合条件的项目';
  }
  return '还没有项目，创建一个开始吧！';
});

// 事件处理
const handleSearch = () => {
  currentPage.value = 1;
};

const handleFilter = () => {
  currentPage.value = 1;
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
};

const handleOpen = (project) => {
  emit('open', project);
};

const handleEdit = (project) => {
  emit('edit', project);
};

const handleDelete = (project) => {
  emit('delete', project);
};

const handleExport = (project) => {
  emit('export', project);
};

// 辅助函数
const getTypeIcon = (type) => {
  const icons = {
    '霸道总裁': '👔',
    '悬疑推理': '🔍',
    '甜宠日常': '💕',
    '复仇爽剧': '⚔️',
    '古装穿越': '🏯',
    '职场励志': '💼'
  };
  return icons[type] || '🎬';
};

const getStatusType = (status) => {
  const types = {
    '设定中': 'info',
    '大纲中': 'warning',
    '剧本中': 'primary',
    '已完成': 'success'
  };
  return types[status] || 'info';
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < 7 * day) {
    return Math.floor(diff / day) + '天前';
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};
</script>

<style scoped>
.project-list-container {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.loading-container {
  padding: 40px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 16px 0;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    flex-wrap: wrap;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
