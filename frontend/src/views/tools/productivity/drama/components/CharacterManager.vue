<template>
  <div class="character-manager">
    <div class="manager-header">
      <h3 class="section-title">
        <el-icon><User /></el-icon>
        角色管理
      </h3>
      <div class="header-actions">
        <el-button 
          type="success" 
          :icon="MagicStick"
          @click="handleBatchGenerate"
        >
          AI批量生成
        </el-button>
        <el-button 
          type="warning" 
          :icon="DocumentCopy"
          @click="handleBatchImport"
        >
          批量导入
        </el-button>
        <el-button 
          type="primary" 
          :icon="Plus"
          @click="handleAdd"
        >
          添加角色
        </el-button>
        <el-button 
          type="primary" 
          :icon="Check"
          @click="handleSave"
          :loading="saving"
        >
          {{ saving ? '保存中...' : '保存' }}
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="characters.length === 0"
      description="还没有角色，快来添加第一个角色吧"
      :image-size="120"
    >
      <el-button type="primary" :icon="Plus" @click="handleAdd">
        添加角色
      </el-button>
    </el-empty>

    <!-- 角色列表 -->
    <div v-else class="character-list">
      <TransitionGroup name="list">
        <div
          v-for="character in characters"
          :key="character._id || character.id || character.name"
          class="character-card"
          :class="{ 'incomplete': isCharacterIncomplete(character) }"
        >
          <div class="card-header">
            <div class="character-avatar">
              {{ getRoleIcon(character.role) }}
            </div>
            <div class="character-info">
              <h4 class="character-name">{{ character.name }}</h4>
              <div class="character-meta">
                <el-tag size="small" :type="getRoleType(character.role)">
                  {{ character.role }}
                </el-tag>
                <span v-if="character.age" class="meta-item">
                  {{ character.age }}岁
                </span>
                <span v-if="character.gender" class="meta-item">
                  {{ character.gender }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="character.description" class="card-body">
            <p class="character-desc">{{ character.description }}</p>
          </div>

          <div v-if="character.tags && character.tags.length" class="card-tags">
            <el-tag
              v-for="tag in character.tags.slice(0, 3)"
              :key="tag"
              size="small"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
            <el-tag
              v-if="character.tags.length > 3"
              size="small"
              effect="plain"
            >
              +{{ character.tags.length - 3 }}
            </el-tag>
          </div>

          <div class="card-footer">
            <el-button
              size="small"
              type="primary"
              link
              :icon="MagicStick"
              @click="handleGeneratePrompt(character)"
            >
              生成提示词
            </el-button>
            <div class="action-buttons">
              <el-button
                size="small"
                link
                :icon="Edit"
                @click="handleEdit(character)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                :icon="Delete"
                @click="handleDelete(character)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 角色编辑对话框 -->
    <CharacterDialog
      v-model="showDialog"
      :character="currentCharacter"
      @submit="handleSubmit"
    />

    <!-- 提示词对话框 -->
    <PromptDialog
      v-model="showPromptDialog"
      :prompt="generatedPrompt"
      title="角色设定提示词"
    />

    <!-- 批量生成提示词对话框 -->
    <PromptDialog
      v-model="showBatchPromptDialog"
      :prompt="batchGeneratedPrompt"
      title="批量角色生成提示词"
      description="复制以下提示词到AI工具（如ChatGPT）生成角色列表，然后使用【批量导入】功能导入生成的内容"
    />

    <!-- 批量导入对话框 -->
    <AIResponseParser
      v-model="showBatchImportDialog"
      mode="batch-characters"
      title="批量导入角色"
      description="粘贴AI生成的角色列表内容，系统将自动解析并添加角色"
      @parsed="handleBatchParsed"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  User, 
  Plus, 
  Edit, 
  Delete, 
  MagicStick,
  DocumentCopy,
  Check
} from '@element-plus/icons-vue';
import CharacterDialog from './CharacterDialog.vue';
import PromptDialog from './PromptDialog.vue';
import AIResponseParser from './AIResponseParser.vue';
import { 
  generateCharacterPrompt,
  generateBatchCharactersPrompt 
} from '../utils/promptTemplates';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  },
  worldview: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

const characters = ref(props.modelValue || []);
const showDialog = ref(false);
const currentCharacter = ref(null);
const showPromptDialog = ref(false);
const generatedPrompt = ref('');
const showBatchPromptDialog = ref(false);
const batchGeneratedPrompt = ref('');
const showBatchImportDialog = ref(false);
const saving = ref(false);

// 监听父组件数据变化
watch(() => props.modelValue, (newVal) => {
  characters.value = newVal || [];
}, { deep: true });

// 检查角色信息是否不完整
const isCharacterIncomplete = (character) => {
  return !character.name || 
         !character.role || 
         !character.description || 
         !character.age || 
         !character.gender;
};

// 获取角色图标
const getRoleIcon = (role) => {
  const icons = {
    '男主角': '👨',
    '女主角': '👩',
    '男配角': '🙍‍♂️',
    '女配角': '🙍‍♀️',
    '反派': '😈',
    '龙套': '👤'
  };
  return icons[role] || '👤';
};

// 获取角色标签类型
const getRoleType = (role) => {
  const types = {
    '男主角': 'danger',
    '女主角': 'danger',
    '男配角': 'warning',
    '女配角': 'warning',
    '反派': 'info',
    '龙套': 'info'
  };
  return types[role] || 'info';
};

// 保存所有角色
const handleSave = async () => {
  if (characters.value.length === 0) {
    ElMessage.warning('没有角色数据需要保存');
    return;
  }
  
  // 数据质量检查
  const validation = validateCharactersData(characters.value);
  
  saving.value = true;
  try {
    // 保留所有字段，直接发送（MongoDB会忽略不识别的字段）
    emit('update:modelValue', characters.value);
    emit('save', characters.value);
    
    // 如果有不完整数据，显示警告
    if (validation.incomplete.length > 0) {
      showValidationWarning(validation);
    } else {
      ElMessage.success('角色数据已保存');
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 添加角色
const handleAdd = () => {
  currentCharacter.value = null;
  showDialog.value = true;
};

// 编辑角色
const handleEdit = (character) => {
  currentCharacter.value = { ...character };
  showDialog.value = true;
};

// 删除角色
const handleDelete = (character) => {
  ElMessageBox.confirm(
    `确定要删除角色「${character.name}」吗？`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  )
    .then(() => {
      const index = characters.value.findIndex(
        c => (c._id && c._id === character._id) || 
             (c.id && c.id === character.id) || 
             c.name === character.name
      );
      if (index > -1) {
        characters.value.splice(index, 1);
        emit('update:modelValue', characters.value);
        // 不自动保存，由用户手动点击保存按钮
        ElMessage.success('角色已删除，请点击保存按钮');
      }
    })
    .catch(() => {
      // 取消删除
    });
};

// 提交角色
const handleSubmit = (characterData) => {
  if (currentCharacter.value && (currentCharacter.value._id || currentCharacter.value.id)) {
    // 编辑模式 - 保留原始_id或id
    const index = characters.value.findIndex(
      c => (c._id && c._id === currentCharacter.value._id) || 
           (c.id && c.id === currentCharacter.value.id)
    );
    if (index > -1) {
      // 保留原始_id和id，更新其他字段
      const updatedCharacter = {
        ...characterData,
        _id: characters.value[index]._id, // 保留MongoDB的_id
        id: characters.value[index].id     // 保留临时id
      };
      characters.value[index] = updatedCharacter;
      ElMessage.success('角色已更新，请点击保存按钮');
    }
  } else {
    // 新增模式 - 生成临时ID
    characterData.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    characters.value.push(characterData);
    ElMessage.success('角色已添加，请点击保存按钮');
  }
  
  emit('update:modelValue', characters.value);
  // 不自动保存，由用户手动点击保存按钮
};

// 生成提示词
const handleGeneratePrompt = (character) => {
  try {
    generatedPrompt.value = generateCharacterPrompt({
      ...character,
      projectType: props.projectInfo.type,
      projectName: props.projectInfo.name,
      worldview: props.worldview
    });
    showPromptDialog.value = true;
  } catch (error) {
    console.error('生成提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 批量生成提示词
const handleBatchGenerate = () => {
  try {
    // 检查是否有世界观数据
    if (!props.worldview || Object.keys(props.worldview).length === 0) {
      ElMessageBox.confirm(
        '建议先完善世界观设定，这样AI能生成更符合剧本背景的角色。是否继续？',
        '提示',
        {
          confirmButtonText: '继续生成',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        generateBatchPrompt();
      }).catch(() => {
        // 用户取消
      });
    } else {
      generateBatchPrompt();
    }
  } catch (error) {
    console.error('生成批量提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 生成批量提示词的具体逻辑
const generateBatchPrompt = () => {
  batchGeneratedPrompt.value = generateBatchCharactersPrompt({
    projectType: props.projectInfo.type,
    projectName: props.projectInfo.name,
    worldview: props.worldview,
    existingCharacters: characters.value
  });
  showBatchPromptDialog.value = true;
};

// 打开批量导入对话框
const handleBatchImport = () => {
  showBatchImportDialog.value = true;
};

// 处理批量导入的解析结果
const handleBatchParsed = (parsedData) => {
  if (!parsedData || !parsedData.characters || parsedData.characters.length === 0) {
    ElMessage.warning('未能解析到有效的角色数据');
    return;
  }

  // 数据质量校验
  const validation = validateCharactersData(parsedData.characters);

  // 去重：检查名字是否已存在
  const existingNames = new Set(characters.value.map(c => c.name));
  const newCharacters = [];
  let duplicateCount = 0;
  
  parsedData.characters.forEach(char => {
    if (!existingNames.has(char.name)) {
      // 为每个角色生成临时ID
      newCharacters.push({
        ...char,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      });
      existingNames.add(char.name);
    } else {
      duplicateCount++;
    }
  });

  if (newCharacters.length === 0) {
    ElMessage.warning('所有角色都已存在，未导入任何新角色');
    showBatchImportDialog.value = false;
    return;
  }

  // 添加到现有角色列表
  characters.value.push(...newCharacters);
  
  emit('update:modelValue', characters.value);
  
  // 显示导入结果（不自动保存，由用户手动点击保存按钮）
  showImportResult(newCharacters.length, validation, duplicateCount);
  showBatchImportDialog.value = false;
};

// 角色数据质量校验
const validateCharactersData = (characters) => {
  const validation = {
    total: characters.length,
    noName: 0,
    noRole: 0,
    noDescription: 0,
    noAge: 0,
    noGender: 0,
    incomplete: [],
    warnings: []
  };

  characters.forEach((char, index) => {
    const missing = [];
    
    if (!char.name || char.name.trim() === '') {
      validation.noName++;
      missing.push('姓名');
    }
    
    if (!char.role) {
      validation.noRole++;
      missing.push('角色定位');
    }
    
    if (!char.description || char.description.trim() === '') {
      validation.noDescription++;
      missing.push('描述');
    }
    
    if (!char.age) {
      validation.noAge++;
      missing.push('年龄');
    }
    
    if (!char.gender) {
      validation.noGender++;
      missing.push('性别');
    }
    
    if (missing.length > 0) {
      validation.incomplete.push({
        index: index + 1,
        name: char.name || `角色${index + 1}`,
        missing
      });
    }
  });

  return validation;
};

// 显示数据验证警告
const showValidationWarning = (validation) => {
  const warnings = [];
  
  if (validation.noName > 0) warnings.push(`${validation.noName}个未填写姓名`);
  if (validation.noRole > 0) warnings.push(`${validation.noRole}个未指定角色定位`);
  if (validation.noDescription > 0) warnings.push(`${validation.noDescription}个缺少描述`);
  if (validation.noAge > 0) warnings.push(`${validation.noAge}个未填写年龄`);
  if (validation.noGender > 0) warnings.push(`${validation.noGender}个未填写性别`);
  
  const incompleteDetails = validation.incomplete
    .slice(0, 5)
    .map(item => `• ${item.name}：缺少 ${item.missing.join('、')}`)
    .join('\n');
  
  const moreText = validation.incomplete.length > 5 
    ? `\n...还有 ${validation.incomplete.length - 5} 个角色信息不完整` 
    : '';
  
  ElMessageBox.alert(
    `角色数据已保存，但有 ${validation.incomplete.length} 个角色信息不完整：\n\n${warnings.join('、')}\n\n不完整角色列表：\n${incompleteDetails}${moreText}\n\n建议手动完善这些角色信息。`,
    '数据质量提示',
    {
      confirmButtonText: '知道了',
      type: 'warning',
      dangerouslyUseHTMLString: false
    }
  );
};

// 显示批量导入结果
const showImportResult = (count, validation, duplicateCount = 0) => {
  const completeCount = count - validation.incomplete.length;
  let message = `成功导入 ${count} 个角色`;
  if (duplicateCount > 0) {
    message += `（已自动去重 ${duplicateCount} 个）`;
  }
  
  if (validation.incomplete.length === 0) {
    // 所有数据完整
    ElMessage.success(`${message}（数据完整），请点击「保存」按钮同步到服务器`);
  } else {
    // 有不完整的数据
    const warnings = [];
    
    if (validation.noName > 0) warnings.push(`${validation.noName}个未填写姓名`);
    if (validation.noRole > 0) warnings.push(`${validation.noRole}个未指定角色定位`);
    if (validation.noDescription > 0) warnings.push(`${validation.noDescription}个缺少描述`);
    if (validation.noAge > 0) warnings.push(`${validation.noAge}个未填写年龄`);
    if (validation.noGender > 0) warnings.push(`${validation.noGender}个未填写性别`);
    
    const incompleteDetails = validation.incomplete
      .slice(0, 5) // 最多显示5个
      .map(item => `• ${item.name}：缺少 ${item.missing.join('、')}`)
      .join('\n');
    
    const moreText = validation.incomplete.length > 5 
      ? `\n...还有 ${validation.incomplete.length - 5} 个角色信息不完整` 
      : '';
    
    ElMessageBox.alert(
      `${message}\n\n✅ 完整数据：${completeCount} 个\n⚠️ 不完整数据：${validation.incomplete.length} 个\n\n详细信息：\n${warnings.join('、')}\n\n不完整角色列表：\n${incompleteDetails}${moreText}\n\n建议手动完善这些角色信息。\n\n⚡ 请点击「保存」按钮同步数据到服务器。`,
      '导入完成',
      {
        confirmButtonText: '知道了',
        type: 'success',
        dangerouslyUseHTMLString: false
      }
    );
  }
};
</script>

<style scoped>
.character-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #EBEEF5;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.character-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  flex: 1;
  overflow-y: auto;
}

.character-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E4E7ED;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.character-card.incomplete {
  border: 2px solid #F56C6C;
  background: #FEF0F0;
}

.character-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-color: #FF6B6B;
}

.character-card.incomplete:hover {
  border-color: #F56C6C;
  box-shadow: 0 4px 16px rgba(245, 108, 108, 0.3);
}

.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.character-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B6B, #FF8787);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.character-info {
  flex: 1;
  min-width: 0;
}

.character-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 12px;
  color: #909399;
}

.card-body {
  margin-bottom: 12px;
  flex: 1;
}

.character-desc {
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式 */
@media (max-width: 768px) {
  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-button {
    flex: 1;
  }

  .character-list {
    grid-template-columns: 1fr;
  }
}
</style>
