<template>
  <div class="version-history">
    <!-- 头部 -->
    <div class="history-header">
      <h3 class="header-title">
        <el-icon><Clock /></el-icon>
        版本历史
      </h3>
      <div class="header-actions">
        <el-tag type="info" size="small">
          {{ filteredVersions.length }} / {{ versions.length }}
        </el-tag>
        <el-button
          size="small"
          :icon="QuestionFilled"
          @click="showAutoSaveRulesDialog = true"
        >
          自动保存规则
        </el-button>
        <el-button
          v-if="!batchMode"
          size="small"
          @click="enterBatchMode"
        >
          批量操作
        </el-button>
        <el-button
          v-else
          size="small"
          @click="exitBatchMode"
        >
          退出批量
        </el-button>
        <el-button
          size="small"
          :icon="Refresh"
          @click="loadVersions"
          :loading="loading"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <div v-if="batchMode && !loading && versions.length > 0" class="batch-toolbar">
      <div class="batch-info">
        <el-checkbox
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          已选 {{ selectedVersionIds.length }} 个
        </el-checkbox>
      </div>
      <div class="batch-actions">
        <el-button
          size="small"
          :disabled="selectedVersionIds.length !== 2"
          @click="handleCompareSelected"
        >
          对比选中版本 (2)
        </el-button>
        <el-button
          size="small"
          type="danger"
          :disabled="selectedVersionIds.length === 0"
          @click="handleBatchDelete"
        >
          批量删除 ({{ selectedVersionIds.length }})
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div v-if="!loading && versions.length > 0" class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索版本（模块名称、内容）"
        :prefix-icon="Search"
        clearable
        @clear="searchKeyword = ''"
      >
        <template #append>
          <el-select v-model="filterType" placeholder="类型" style="width: 100px">
            <el-option label="全部" value="all" />
            <el-option label="世界观" value="worldview" />
            <el-option label="角色" value="character" />
            <el-option label="大纲" value="outline" />
            <el-option label="分集" value="episode" />
          </el-select>
        </template>
      </el-input>
      
      <!-- 保存类型筛选tag -->
      <div class="save-type-filter">
        <span class="filter-label">保存类型：</span>
        <el-tag
          :type="filterSaveType === 'all' ? 'primary' : undefined"
          :effect="filterSaveType === 'all' ? 'dark' : 'plain'"
          @click="filterSaveType = 'all'"
          style="cursor: pointer; margin-right: 8px;"
        >
          全部
        </el-tag>
        <el-tag
          :type="filterSaveType === 'manual' ? 'success' : undefined"
          :effect="filterSaveType === 'manual' ? 'dark' : 'plain'"
          @click="filterSaveType = 'manual'"
          style="cursor: pointer; margin-right: 8px;"
        >
          手动保存
        </el-tag>
        <el-tag
          :type="filterSaveType === 'auto' ? 'info' : undefined"
          :effect="filterSaveType === 'auto' ? 'dark' : 'plain'"
          @click="filterSaveType = 'auto'"
          style="cursor: pointer;"
        >
          自动保存
        </el-tag>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 空状态 -->
    <div v-else-if="versions.length === 0" class="empty-state">
      <el-empty description="暂无历史版本">
        <template #description>
          <p>当前项目还没有历史版本</p>
          <p class="tip">保存世界观、角色、大纲或分集时会自动创建版本</p>
        </template>
      </el-empty>
    </div>

    <!-- 搜索无结果 -->
    <div v-else-if="filteredVersions.length === 0" class="empty-state">
      <el-empty description="未找到匹配的版本">
        <template #description>
          <p>尝试修改搜索关键词或筛选条件</p>
        </template>
        <template #default>
          <el-button @click="searchKeyword = ''; filterType = 'all'">清空筛选</el-button>
        </template>
      </el-empty>
    </div>

    <!-- 版本列表（紧凑型） -->
    <div v-else class="version-list">
      <!-- 按日期分组 -->
      <div
        v-for="(group, date) in groupedVersions"
        :key="date"
        class="version-group"
      >
        <div class="group-date-header">
          <el-icon><Calendar /></el-icon>
          {{ formatGroupDate(date) }}
          <span class="count">({{ group.length }})</span>
        </div>

        <!-- 紧凑列表 -->
        <div class="version-items">
          <div
            v-for="version in group"
            :key="version.id"
            class="version-item"
            :class="{ 'is-active': selectedVersion?.id === version.id }"
          >
            <!-- 批量选择复选框 -->
            <el-checkbox
              v-if="batchMode"
              :model-value="selectedVersionIds.includes(version.id)"
              @change="handleToggleSelect(version.id)"
              class="item-checkbox"
            />
            
            <div class="item-left" @click="handleSelectVersion(version)">
              <span class="item-icon">
                {{ getModuleIcon(version.moduleType) }}
                <el-icon v-if="version.isImportant" class="important-badge" color="#F56C6C"><Star /></el-icon>
              </span>
              <div class="item-info">
                <div class="item-name-row">
                  <span class="item-name">
                    {{ formatModuleType(version.moduleType) }}
                    <span v-if="version.moduleType === 'character' || version.moduleType === 'episode'" class="item-sub">
                      - {{ getModuleName(version) }}
                    </span>
                    <!-- 自动保存标记 -->
                    <el-tag v-if="version.isAutoSave" size="small" type="info" style="margin-left: 8px;">
                      自动
                    </el-tag>
                  </span>
                  <span class="item-time">{{ formatTime(version.createdAt) }}</span>
                </div>
                <!-- 版本注释和标签 -->
                <div v-if="version.comment || version.tags?.length > 0" class="item-meta">
                  <span v-if="version.comment" class="item-comment">{{ version.comment }}</span>
                  <div v-if="version.tags?.length > 0" class="item-tags">
                    <el-tag
                      v-for="tag in version.tags"
                      :key="tag"
                      size="small"
                      type="info"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
            <div class="item-actions">
              <el-button
                size="small"
                text
                type="primary"
                @click="handleViewVersion(version)"
              >
                查看
              </el-button>
              <el-button
                size="small"
                text
                type="success"
                @click="handleRestoreVersion(version)"
              >
                恢复
              </el-button>
              <el-button
                size="small"
                text
                type="danger"
                @click="handleDeleteVersion(version)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="版本详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <VersionDetail
        v-if="selectedVersion"
        :version="selectedVersion"
        @restore="handleRestoreConfirm"
        @close="showDetailDialog = false"
      />
    </el-dialog>

    <!-- 版本对比对话框 -->
    <el-dialog
      v-model="showCompareDialog"
      title="版本对比"
      width="900px"
      :close-on-click-modal="false"
    >
      <VersionCompare
        v-if="compareVersionA && compareVersionB"
        :version-a="compareVersionA"
        :version-b="compareVersionB"
        @restore="handleCompareRestore"
        @close="showCompareDialog = false"
      />
    </el-dialog>

    <!-- 自动保存规则对话框 -->
    <el-dialog
      v-model="showAutoSaveRulesDialog"
      title="自动保存规则说明"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="auto-save-rules">
        <el-alert
          title="自动保存功能已启用"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        >
          <template #default>
            <p>系统会在您编辑内容后自动保存，无需手动操作</p>
          </template>
        </el-alert>

        <div class="rules-section">
          <h4><el-icon><Clock /></el-icon> 保存频率</h4>
          <ul>
            <li><strong>定时检查：</strong>每 <strong class="highlight">1小时</strong> 自动检查一次</li>
            <li><strong>按需保存：</strong>仅保存有变化的模块</li>
            <li><strong>手动重置：</strong>手动保存后重置计时</li>
          </ul>
        </div>

        <div class="rules-section">
          <h4><el-icon><Document /></el-icon> 保存范围</h4>
          <ul>
            <li>✅ 世界观设定</li>
            <li>✅ 角色管理</li>
            <li>✅ 剧情大纲</li>
            <li>✅ 分集剧本</li>
          </ul>
          <p class="note">ℹ️ 提示词模板不包含在自动保存中，需手动保存</p>
        </div>

        <div class="rules-section">
          <h4><el-icon><FolderOpened /></el-icon> 版本管理</h4>
          <ul>
            <li><strong>最大保留：</strong>每个模块最多保留 <strong class="highlight">10个</strong> 自动保存版本</li>
            <li><strong>自动清理：</strong>超过限制时，自动删除最旧的版本</li>
            <li><strong>手动保存：</strong>手动保存的版本不受限制，不会被自动删除</li>
          </ul>
        </div>

        <div class="rules-section">
          <h4><el-icon><Warning /></el-icon> 注意事项</h4>
          <ul>
            <li>⏰ 每1小时自动检查一次，只有数据发生变化才会保存</li>
            <li>💾 仅保存变化的模块（世界观/角色/大纲/分集）</li>
            <li>🔄 手动保存后会重置定时器计时</li>
            <li>📦 最多保留10个自动保存版本，超出自动删除最旧版本</li>
            <li>⚠️ 重要修改建议手动保存，以便添加注释和标签</li>
          </ul>
        </div>

        <el-divider />

        <div class="tips-box">
          <strong>💡 使用建议：</strong>
          <p>1. 日常编辑依赖自动保存，无需频繁手动操作</p>
          <p>2. 完成重要阶段性工作后，手动保存并添加备注</p>
          <p>3. 定期查看版本历史，清理不需要的版本</p>
          <p>4. 长时间编辑建议定期手动保存，避免依赖1小时自动保存</p>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="showAutoSaveRulesDialog = false">
          我知道了
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Clock, Calendar, Refresh, Search, Star, QuestionFilled, Document, FolderOpened, Warning } from '@element-plus/icons-vue';
import {
  getVersions,
  deleteVersion,
  restoreVersion,
  formatModuleType,
  getModuleIcon
} from '../utils/versionManager';
import VersionDetail from './VersionDetail.vue';
import VersionCompare from './VersionCompare.vue';

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['restore']);

// 状态
const loading = ref(false);
const versions = ref([]);
const selectedVersion = ref(null);
const showDetailDialog = ref(false);
const showAutoSaveRulesDialog = ref(false);

// 批量操作
const batchMode = ref(false);
const selectedVersionIds = ref([]);
const showCompareDialog = ref(false);
const compareVersionA = ref(null);
const compareVersionB = ref(null);

// 搜索和筛选
const searchKeyword = ref('');
const filterType = ref('all');
const filterSaveType = ref('all'); // 新增：保存类型筛选

// 筛选后的版本
const filteredVersions = computed(() => {
  let result = versions.value;
  
  // 按类型筛选
  if (filterType.value !== 'all') {
    result = result.filter(v => v.moduleType === filterType.value);
  }
  
  // 按保存类型筛选
  if (filterSaveType.value !== 'all') {
    if (filterSaveType.value === 'auto') {
      // 只显示自动保存：isAutoSave 为 true
      result = result.filter(v => v.isAutoSave === true);
    } else if (filterSaveType.value === 'manual') {
      // 显示手动保存：isAutoSave 为 false 或 undefined/null
      result = result.filter(v => v.isAutoSave !== true);
    }
  }
  
  // 按关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(v => {
      // 搜索模块类型
      const moduleType = formatModuleType(v.moduleType).toLowerCase();
      if (moduleType.includes(keyword)) return true;
      
      // 搜索模块名称
      const moduleName = getModuleName(v).toLowerCase();
      if (moduleName.includes(keyword)) return true;
      
      // 搜索内容（简单搜索）
      const contentStr = JSON.stringify(v.content).toLowerCase();
      if (contentStr.includes(keyword)) return true;
      
      return false;
    });
  }
  
  return result;
});

// 按日期分组的版本
const groupedVersions = computed(() => {
  const groups = {};
  
  filteredVersions.value.forEach(version => {
    const date = new Date(version.createdAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(version);
  });
  
  return groups;
});

// 加载版本列表
const loadVersions = async () => {
  loading.value = true;
  try {
    const projectId = props.project._id || props.project.id;
    const result = await getVersions(projectId);
    versions.value = result;
  } catch (error) {
    console.error('加载版本失败:', error);
    ElMessage.error('加载版本失败');
  } finally {
    loading.value = false;
  }
};

// 选择版本
const handleSelectVersion = (version) => {
  selectedVersion.value = version;
};

// 查看版本详情
const handleViewVersion = (version) => {
  selectedVersion.value = version;
  showDetailDialog.value = true;
};

// 恢复版本
const handleRestoreVersion = async (version) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到这个版本吗？\n\n模块：${formatModuleType(version.moduleType)}\n时间：${new Date(version.createdAt).toLocaleString()}\n\n当前内容将被覆盖（会自动保存为新版本）`,
      '确认恢复',
      {
        confirmButtonText: '确认恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await handleRestoreConfirm(version);
  } catch (error) {
    // 用户取消
  }
};

// 确认恢复
const handleRestoreConfirm = async (version) => {
  try {
    const content = await restoreVersion(version.id);
    
    // 触发恢复事件，由父组件处理
    emit('restore', {
      moduleType: version.moduleType,
      moduleId: version.moduleId,
      content: content
    });
    
    ElMessage.success('版本已恢复');
    showDetailDialog.value = false;
    
    // 重新加载版本列表
    await loadVersions();
  } catch (error) {
    console.error('恢复版本失败:', error);
    ElMessage.error('恢复版本失败');
  }
};

// 删除版本
const handleDeleteVersion = async (version) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这个版本吗？\n\n模块：${formatModuleType(version.moduleType)}\n时间：${new Date(version.createdAt).toLocaleString()}\n\n此操作无法撤销`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    const success = await deleteVersion(version.id);
    if (success) {
      ElMessage.success('版本已删除');
      await loadVersions();
    }
  } catch (error) {
    // 用户取消或删除失败
  }
};

// 格式化日期分组标题
const formatGroupDate = (dateStr) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  if (dateStr === todayStr) {
    return '今天';
  } else if (dateStr === yesterdayStr) {
    return '昨天';
  } else {
    const [year, month, day] = dateStr.split('-');
    return `${year}年${month}月${day}日`;
  }
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 获取模块名称（角色或分集）
const getModuleName = (version) => {
  if (version.moduleType === 'character') {
    return version.content?.name || '未命名角色';
  } else if (version.moduleType === 'episode') {
    return version.content?.title || `第${version.content?.number || '?'}集`;
  }
  return '';
};

// 批量操作 - 全选状态
const selectAll = computed({
  get() {
    return selectedVersionIds.value.length === filteredVersions.value.length && filteredVersions.value.length > 0;
  },
  set(val) {
    // 由 handleSelectAll 处理
  }
});

// 批量操作 - 半选状态
const isIndeterminate = computed(() => {
  const selectedCount = selectedVersionIds.value.length;
  return selectedCount > 0 && selectedCount < filteredVersions.value.length;
});

// 进入批量模式
const enterBatchMode = () => {
  batchMode.value = true;
  selectedVersionIds.value = [];
};

// 退出批量模式
const exitBatchMode = () => {
  batchMode.value = false;
  selectedVersionIds.value = [];
};

// 切换选择
const handleToggleSelect = (versionId) => {
  const index = selectedVersionIds.value.indexOf(versionId);
  if (index > -1) {
    selectedVersionIds.value.splice(index, 1);
  } else {
    selectedVersionIds.value.push(versionId);
  }
};

// 全选/取消全选
const handleSelectAll = (checked) => {
  if (checked) {
    selectedVersionIds.value = filteredVersions.value.map(v => v.id);
  } else {
    selectedVersionIds.value = [];
  }
};

// 对比选中版本
const handleCompareSelected = () => {
  if (selectedVersionIds.value.length !== 2) {
    ElMessage.warning('请选择两个版本进行对比');
    return;
  }
  
  const [id1, id2] = selectedVersionIds.value;
  compareVersionA.value = versions.value.find(v => v.id === id1);
  compareVersionB.value = versions.value.find(v => v.id === id2);
  
  if (compareVersionA.value && compareVersionB.value) {
    showCompareDialog.value = true;
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedVersionIds.value.length === 0) {
    return;
  }
  
  try {
    const importantVersions = versions.value.filter(
      v => selectedVersionIds.value.includes(v.id) && v.isImportant
    );
    
    let message = `确定要删除选中的 ${selectedVersionIds.value.length} 个版本吗？`;
    if (importantVersions.length > 0) {
      message += `\n\n警告：其中包含 ${importantVersions.length} 个重要版本！`;
    }
    message += '\n\n此操作无法撤销';
    
    await ElMessageBox.confirm(message, '确认批量删除', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    // 执行删除
    let successCount = 0;
    for (const versionId of selectedVersionIds.value) {
      const success = await deleteVersion(versionId);
      if (success) successCount++;
    }
    
    ElMessage.success(`已删除 ${successCount} 个版本`);
    
    // 重置选择并刷新
    selectedVersionIds.value = [];
    await loadVersions();
  } catch (error) {
    // 用户取消
  }
};

// 处理对比恢复
const handleCompareRestore = async (version) => {
  showCompareDialog.value = false;
  await handleRestoreConfirm(version);
};

// 初始化
onMounted(() => {
  loadVersions();
});
</script>

<style scoped>
.version-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #EBEEF5;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 批量操作工具栏 */
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #FFF7E6;
  border-bottom: 1px solid #FFD591;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.search-bar {
  padding: 12px 20px;
  border-bottom: 1px solid #EBEEF5;
  background: #FAFAFA;
}

.save-type-filter {
  display: flex;
  align-items: center;
  margin-top: 12px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  margin-right: 12px;
  font-weight: 500;
}

.loading-container {
  padding: 24px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.empty-state .tip {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.version-group {
  margin-bottom: 16px;
}

.version-group:last-child {
  margin-bottom: 0;
}

/* 日期头部 */
.group-date-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  background: #F5F7FA;
  border-top: 1px solid #E4E7ED;
  border-bottom: 1px solid #E4E7ED;
}

.group-date-header .count {
  color: #909399;
  font-weight: normal;
  font-size: 12px;
}

/* 版本项列表 */
.version-items {
  display: flex;
  flex-direction: column;
}

.version-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #F0F0F0;
  transition: background-color 0.2s;
}

.item-checkbox {
  flex-shrink: 0;
}

.version-item:hover {
  background: #F5F7FA;
}

.version-item.is-active {
  background: #ECF5FF;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.item-icon {
  position: relative;
  font-size: 24px;
  flex-shrink: 0;
}

.important-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 14px;
  background: white;
  border-radius: 50%;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.item-name-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-sub {
  color: #909399;
  font-weight: normal;
  font-size: 13px;
}

.item-time {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.item-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-comment {
  font-size: 13px;
  color: #606266;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .search-bar {
    padding: 12px 16px;
  }
  
  .group-date-header {
    padding: 8px 16px;
  }
  
  .version-item {
    padding: 10px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .item-left {
    width: 100%;
  }
  
  .item-info {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
  
  .item-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* 自动保存规则对话框样式 */
.auto-save-rules {
  padding: 8px;
}

.rules-section {
  margin-bottom: 24px;
}

.rules-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
}

.rules-section ul {
  margin: 0;
  padding-left: 24px;
  list-style: disc;
}

.rules-section li {
  font-size: 14px;
  line-height: 2;
  color: #606266;
}

.rules-section .highlight {
  color: #409EFF;
  font-weight: 600;
  font-size: 15px;
}

.rules-section .note {
  margin-top: 8px;
  padding: 8px 12px;
  background: #F4F4F5;
  border-radius: 4px;
  font-size: 13px;
  color: #909399;
}

.tips-box {
  padding: 16px;
  background: linear-gradient(135deg, #FFF9E6 0%, #FFF4D6 100%);
  border-radius: 8px;
  border: 1px solid #FFE8A1;
}

.tips-box strong {
  display: block;
  font-size: 15px;
  color: #E6A23C;
  margin-bottom: 12px;
}

.tips-box p {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  margin: 0 0 8px 0;
}

.tips-box p:last-child {
  margin-bottom: 0;
}
</style>
