<template>
  <el-dialog
    v-model="dialogVisible"
    title="查看自定义选项"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 分类管理 -->
      <el-tab-pane label="自定义分类" name="categories">
        <div class="options-list">
          <el-empty v-if="localCategories.length === 0" description="暂无自定义分类" />
          <div v-else class="option-items">
            <div v-for="(category, index) in localCategories" :key="index" class="option-item">
              <span class="option-name">{{ category }}</span>
              <el-button
                link
                type="danger"
                :icon="Delete"
                @click="removeCategory(index)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- AI模型管理 -->
      <el-tab-pane label="自定义AI模型" name="models">
        <div class="options-list">
          <el-empty v-if="localModels.length === 0" description="暂无自定义AI模型" />
          <div v-else class="option-items">
            <div v-for="(model, index) in localModels" :key="index" class="option-item">
              <span class="option-name">{{ model }}</span>
              <el-button
                link
                type="danger"
                :icon="Delete"
                @click="removeModel(index)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 标签管理 -->
      <el-tab-pane label="常用标签" name="tags">
        <div class="options-list">
          <div class="option-tip">
            💡 提示：这里显示您在提示词中使用过的所有标签，按使用频率排序
          </div>
          <el-empty v-if="recentTags.length === 0" description="暂无使用记录" />
          <div v-else class="option-items">
            <el-tag
              v-for="(tag, index) in recentTags"
              :key="index"
              closable
              @close="removeTag(index)"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="footer-content">
        <div class="footer-tips">
          <el-icon><InfoFilled /></el-icon>
          <span>这些选项是从您的提示词中自动提取的，删除不会影响已有提示词</span>
        </div>
        <div class="footer-actions">
          <el-button @click="handleClose">关闭</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, InfoFilled } from '@element-plus/icons-vue';

const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['update:visible', 'saved']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const activeTab = ref('categories');
const localCategories = ref([]);
const localModels = ref([]);
const recentTags = ref([]);

// 从服务器加载数据
async function loadData() {
  try {
    const request = (await import('@/utils/request')).default;
    const response = await request({
      url: '/tools/prompt-vault/options',
      method: 'get'
    });

    if (response.code === 200) {
      localCategories.value = response.data.categories || [];
      localModels.value = response.data.models || [];
      recentTags.value = response.data.tags || [];
    }
  } catch (error) {
    console.error('CustomOptionsManager: 加载数据失败:', error);
    ElMessage.error('加载数据失败');
  }
}

// 监听对话框打开，加载数据
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadData();
  }
});

// 删除分类（仅从当前显示列表移除，不影响数据库）
async function removeCategory(index) {
  try {
    await ElMessageBox.confirm(
      `删除分类"${localCategories.value[index]}"只会从当前显示列表移除，不会影响已有提示词。下次打开时如果还有提示词使用该分类，它会再次显示。`,
      '确认移除',
      {
        type: 'info',
        confirmButtonText: '移除',
        cancelButtonText: '取消'
      }
    );

    localCategories.value.splice(index, 1);
    ElMessage.success('已移除');
  } catch (error) {
    // 用户取消
  }
}

// 删除AI模型（仅从当前显示列表移除，不影响数据库）
async function removeModel(index) {
  try {
    await ElMessageBox.confirm(
      `删除模型"${localModels.value[index]}"只会从当前显示列表移除，不会影响已有提示词。下次打开时如果还有提示词使用该模型，它会再次显示。`,
      '确认移除',
      {
        type: 'info',
        confirmButtonText: '移除',
        cancelButtonText: '取消'
      }
    );

    localModels.value.splice(index, 1);
    ElMessage.success('已移除');
  } catch (error) {
    // 用户取消
  }
}

// 删除标签（仅从当前显示列表移除）
function removeTag(index) {
  recentTags.value.splice(index, 1);
  ElMessage.success('已移除');
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false;
}
</script>

<style scoped lang="scss">
.options-list {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.option-tip {
  padding: 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  color: #0369a1;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.option-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .option-name {
    font-size: 14px;
    color: #1e293b;
    font-weight: 500;
  }
}

.tag-item {
  margin: 4px;
  font-size: 13px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .footer-tips {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #64748b;

    .el-icon {
      color: #3b82f6;
    }
  }

  .footer-actions {
    display: flex;
    gap: 12px;
  }
}

:deep(.el-tabs__content) {
  padding: 16px;
}

:deep(.el-empty) {
  padding: 40px 0;
}
</style>
