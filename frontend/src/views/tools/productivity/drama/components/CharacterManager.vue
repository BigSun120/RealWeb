<template>
  <div class="character-manager">
    <div class="manager-header">
      <h3 class="section-title">
        <el-icon>
          <User />
        </el-icon>
        角色管理
      </h3>
      
      <!-- 标签页切换 -->
      <el-tabs v-model="activeTab" class="manager-tabs">
        <el-tab-pane label="角色列表" name="list">
          <template #label>
            <span class="tab-label">
              <el-icon><User /></el-icon>
              角色列表
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="关系图谱" name="graph">
          <template #label>
            <span class="tab-label">
              <el-icon><Share /></el-icon>
              关系图谱
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
      
      <div class="header-actions" v-if="activeTab === 'list'">
        <!-- AI批量生成下拉菜单 -->
        <el-dropdown split-button type="success" :icon="MagicStick" @click="handleAIBatchGenerate"
          :loading="batchGenerating">
          {{ batchGenerating ? 'AI生成中...' : 'AI批量生成' }}
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="MagicStick" @click="handleAIBatchGenerate">
                AI直接生成（内置AI）
              </el-dropdown-item>
              <el-dropdown-item :icon="DocumentCopy" @click="handleBatchGenerate">
                生成提示词（外部AI）
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="warning" :icon="DocumentCopy" @click="handleBatchImport">
          批量导入
        </el-button>
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          添加角色
        </el-button>
        <el-button type="primary" :icon="Check" @click="handleSave" :loading="saving">
          {{ saving ? '保存中...' : '保存' }}
        </el-button>
      </div>
    </div>

    <!-- 角色列表标签页 -->
    <div v-show="activeTab === 'list'" class="tab-content">
      <!-- 空状态 -->
      <el-empty v-if="characters.length === 0" description="还没有角色，快来添加第一个角色吧" :image-size="120">
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          添加角色
        </el-button>
      </el-empty>

      <!-- 角色列表 -->
      <div v-else class="character-list">
      <TransitionGroup name="list">
        <div v-for="character in characters" :key="character._id || character.id || character.name"
          class="character-card" :class="{ 'incomplete': isCharacterIncomplete(character) }">
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
            <el-tag v-for="tag in character.tags.slice(0, 3)" :key="tag" size="small" effect="plain">
              {{ tag }}
            </el-tag>
            <el-tag v-if="character.tags.length > 3" size="small" effect="plain">
              +{{ character.tags.length - 3 }}
            </el-tag>
          </div>

          <div class="card-footer">
            <div class="left-actions">
              <!-- 不完整角色：显示AI补全 + 下拉菜单 -->
              <template v-if="isCharacterIncomplete(character)">
                <el-dropdown split-button size="small" type="success" @click="handleAIComplete(character)"
                  :loading="completingCharacter === character._id || completingCharacter === character.id">
                  <el-icon>
                    <MagicStick />
                  </el-icon>
                  AI补全
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :icon="MagicStick" @click="handleAIComplete(character)">
                        AI直接补全
                      </el-dropdown-item>
                      <el-dropdown-item :icon="DocumentCopy" @click="handleGeneratePrompt(character)">
                        生成提示词
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
              <!-- 完整角色：只显示生成提示词 -->
              <el-button v-else size="small" type="primary" link :icon="MagicStick"
                @click="handleGeneratePrompt(character)">
                生成提示词
              </el-button>
            </div>
            <div class="action-buttons">
              <el-button size="small" link :icon="Edit" @click="handleEdit(character)">
                编辑
              </el-button>
              <el-button size="small" type="danger" link :icon="Delete" @click="handleDelete(character)">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </TransitionGroup>
      </div>
    </div>
    
    <!-- 关系图谱标签页 -->
    <div v-show="activeTab === 'graph'" class="tab-content graph-tab">
      <RelationshipGraph
        v-if="activeTab === 'graph'"
        :characters="characters"
        :worldview="worldview"
        :project-info="projectInfo"
        @relationships-changed="handleRelationshipsChanged"
        @relationships-save="handleRelationshipsSave"
      />
    </div>

    <!-- 角色编辑对话框 -->
    <CharacterDialog v-model="showDialog" :character="currentCharacter" :project-info="projectInfo"
      :worldview="worldview" @submit="handleSubmit" />

    <!-- 提示词对话框 -->
    <PromptDialog v-model="showPromptDialog" :prompt="generatedPrompt" title="角色设定提示词" />

    <!-- 批量生成提示词对话框 -->
    <PromptDialog v-model="showBatchPromptDialog" :prompt="batchGeneratedPrompt" title="批量角色生成提示词（用于外部AI）"
      description="📝 复制以下提示词到外部AI工具（如ChatGPT、Claude、文心一言等）生成角色列表，然后使用【批量导入】功能导入生成的内容。\n\n✨ 如果你已配置了内置AI，也可以直接点击「AI直接生成」按钮，无需手动复制粘贴。" />

    <!-- 批量导入对话框 -->
    <AIResponseParser v-model="showBatchImportDialog" mode="batch-characters" title="批量导入角色"
      description="粘贴AI生成的角色列表内容，系统将自动解析并添加角色" @parsed="handleBatchParsed" />
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
  Check,
  Share
} from '@element-plus/icons-vue';
import CharacterDialog from './CharacterDialog.vue';
import PromptDialog from './PromptDialog.vue';
import AIResponseParser from './AIResponseParser.vue';
import RelationshipGraph from './RelationshipGraph.vue';
import { generateAIContent } from '@/api/ai';
import {
  generateCharacterPrompt,
  generateBatchCharactersPrompt,
  parseCharacterResponse
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

const emit = defineEmits(['update:modelValue', 'save', 'relationships-save']);

// 标签页状态
const activeTab = ref('list');

const characters = ref(props.modelValue || []);
const showDialog = ref(false);
const currentCharacter = ref(null);
const showPromptDialog = ref(false);
const generatedPrompt = ref('');
const showBatchPromptDialog = ref(false);
const batchGeneratedPrompt = ref('');
const showBatchImportDialog = ref(false);
const saving = ref(false);

// AI生成相关状态
const completingCharacter = ref(null); // 当前正在补全的角色ID
const batchGenerating = ref(false); // 批量生成中
const batchGenerateCount = ref(6); // 批量生成数量

// 监听父组件数据变化
watch(() => props.modelValue, (newVal) => {
  characters.value = newVal || [];
}, { deep: true });

// 处理关系图谱自动变化（AI生成/导入/清空）
const handleRelationshipsChanged = (payload) => {
  const { data, isAutoSave } = payload;
  console.log('🔗 关系图谱变化', data.length, '条关系', isAutoSave ? '(自动)' : '(手动)');
  // 触发事件，让workbench保存到版本历史
  emit('relationships-save', { data, isAutoSave });
};

// 处理关系图谱手动保存
const handleRelationshipsSave = (payload) => {
  const { data, isAutoSave } = payload;
  console.log('💾 关系图谱手动保存', data.length, '条关系');
  // 触发事件，让workbench保存到版本历史
  emit('relationships-save', { data, isAutoSave });
};

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

// 生成批量提示词的具体逻辑（用于外部AI）
const generateBatchPrompt = async () => {
  // 检查是否有世界观数据
  if (!props.worldview || Object.keys(props.worldview).length === 0) {
    const confirmed = await ElMessageBox.confirm(
      '建议先完善世界观设定，这样生成的提示词能更符合剧本背景。是否继续？',
      '提示',
      {
        confirmButtonText: '继续生成',
        cancelButtonText: '去完善世界观',
        type: 'warning'
      }
    ).catch(() => false);

    if (!confirmed) return;
  }

  // 让用户选择生成数量
  try {
    await ElMessageBox.prompt(
      '请输入需要生成的角色数量（建议4-8个）',
      '生成批量角色提示词',
      {
        confirmButtonText: '生成提示词',
        cancelButtonText: '取消',
        inputPattern: /^[1-9]\d*$/,
        inputErrorMessage: '请输入有效的数字',
        inputValue: String(batchGenerateCount.value)
      }
    ).then(({ value }) => {
      const count = parseInt(value);
      batchGeneratedPrompt.value = generateBatchCharactersPrompt({
        projectType: props.projectInfo.type,
        projectName: props.projectInfo.name,
        worldview: props.worldview,
        recommendedCount: count,
        existingCharacters: characters.value
      });
      showBatchPromptDialog.value = true;
    });
  } catch {
    // 用户取消
  }
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

// AI补全单个角色
const handleAIComplete = async (character) => {
  if (!character.name || !character.role) {
    ElMessage.warning('角色缺少姓名或定位，无法补全');
    return;
  }
  
  const characterId = character._id || character.id;
  completingCharacter.value = characterId;
  
  // 立即显示加载提示
  const loadingMessage = ElMessage({
    message: `🤖 正在为AI角色「${character.name}」补全信息...，请稍候`,
    type: 'info',
    duration: 0, // 不自动关闭
    iconClass: 'el-icon-loading'
  });

  try {
    // 生成提示词
    const prompt = generateCharacterPrompt({
      name: character.name,
      role: character.role,
      age: character.age,
      gender: character.gender,
      personality: character.personality,
      background: character.background,
      motivation: character.motivation,
      relationships: character.relationships,
      projectType: props.projectInfo.type,
      projectName: props.projectInfo.name,
      worldview: props.worldview
    });

    console.log('🤖 AI补全角色:', character.name);

    // 调用AI
    const response = await generateAIContent(
      [{ role: 'user', content: prompt }],
      { temperature: 0.8, maxTokens: 2000 }
    );

    if (response.code === 200 && response.data?.content) {
      const parsedData = parseCharacterResponse(response.data.content);

      // 找到对应角色并更新
      const index = characters.value.findIndex(
        c => (c._id && c._id === characterId) || (c.id && c.id === characterId)
      );

      if (index > -1) {
        // 只更新缺失的字段
        const updated = { ...characters.value[index] };

        if (!updated.age && parsedData.age) updated.age = parsedData.age;
        if (!updated.gender && parsedData.gender) updated.gender = parsedData.gender;
        if (!updated.description && parsedData.description) updated.description = parsedData.description;
        if (!updated.personality && parsedData.personality) updated.personality = parsedData.personality;
        if (!updated.background && parsedData.background) updated.background = parsedData.background;
        if (!updated.motivation && parsedData.motivation) updated.motivation = parsedData.motivation;
        if (!updated.relationships && parsedData.relationships) updated.relationships = parsedData.relationships;

        characters.value[index] = updated;
        emit('update:modelValue', characters.value);
        
        // 关闭加载提示
        loadingMessage.close();
        
        ElMessage.success(`✅ 角色「${character.name}」已补全，请点击保存按钮`);
      }
    } else {
      throw new Error(response.message || 'AI补全失败');
    }
  } catch (error) {
    console.error('❌ AI补全失败:', error);
    // 关闭加载提示
    loadingMessage.close();
    ElMessage.error(error.message || `补全角色「${character.name}」失败`);
  } finally {
    completingCharacter.value = null;
  }
};

// AI批量生成角色（直接生成，不是提示词）
const handleAIBatchGenerate = async () => {
  // 检查是否有世界观数据
  if (!props.worldview || Object.keys(props.worldview).length === 0) {
    const confirmed = await ElMessageBox.confirm(
      '建议先完善世界观设定，这样AI能生成更符合剧本背景的角色。是否继续？',
      '提示',
      {
        confirmButtonText: '继续生成',
        cancelButtonText: '去完善世界观',
        type: 'warning'
      }
    ).catch(() => false);

    if (!confirmed) return;
  }

  // 让用户选择生成数量
  try {
    await ElMessageBox.prompt(
      '请输入需要生成的角色数量（建议4-8个）',
      'AI批量生成角色',
      {
        confirmButtonText: '开始生成',
        cancelButtonText: '取消',
        inputPattern: /^[1-9]\d*$/,
        inputErrorMessage: '请输入有效的数字',
        inputValue: String(batchGenerateCount.value)
      }
    ).then(({ value }) => {
      batchGenerateCount.value = parseInt(value);
      performBatchGenerate();
    });
  } catch {
    // 用户取消
  }
};

// 执行批量生成
const performBatchGenerate = async () => {
  batchGenerating.value = true;
  
  // 立即显示加载提示
  const loadingMessage = ElMessage({
    message: `🤖 正在生成${batchGenerateCount.value}个角色...，预计需要${Math.ceil(batchGenerateCount.value * 2)}-${Math.ceil(batchGenerateCount.value * 3)}秒`,
    type: 'info',
    duration: 0,
    iconClass: 'el-icon-loading'
  });
  
  try {
    // 生成提示词
    const prompt = generateBatchCharactersPrompt({
      projectType: props.projectInfo.type,
      projectName: props.projectInfo.name,
      worldview: props.worldview,
      recommendedCount: batchGenerateCount.value,
      existingCharacters: characters.value
    });

    console.log(`🤖 AI批量生成${batchGenerateCount.value}个角色...`);

    // 调用AI
    const response = await generateAIContent(
      [{ role: 'user', content: prompt }],
      { temperature: 0.9, maxTokens: 4000 } // 批量生成需要更多token
    );

    if (response.code === 200 && response.data?.content) {
      // 解析批量角色数据
      const parsedCharacters = parseBatchCharactersResponse(response.data.content);
      
      if (parsedCharacters.length === 0) {
        loadingMessage.close();
        ElMessage.warning('未能从 AI 回答中解析到有效的角色数据，请检查AI回答格式');
        return;
      }

      // 去重：检查名字是否已存在
      const existingNames = new Set(characters.value.map(c => c.name));
      const newCharacters = [];
      let duplicateCount = 0;

      parsedCharacters.forEach(char => {
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
        loadingMessage.close();
        ElMessage.warning(`所有生成的角色都已存在（${duplicateCount}个重复），未添加任何新角色`);
        return;
      }

      // 添加到现有角色列表
      characters.value.push(...newCharacters);
      emit('update:modelValue', characters.value);
      
      // 关闭加载提示
      loadingMessage.close();
      
      // 显示结果
      let message = `✅ 成功生成 ${newCharacters.length} 个角色`;
      if (duplicateCount > 0) {
        message += `（已自动去重 ${duplicateCount} 个）`;
      }
      message += '，请点击「保存」按钮同步到服务器';
      
      ElMessage.success({
        message,
        duration: 4000
      });
      
      console.log('✅ AI批量生成成功:', newCharacters.map(c => c.name).join('、'));
    } else {
      throw new Error(response.message || 'AI批量生成失败');
    }
  } catch (error) {
    console.error('❌ AI批量生成失败:', error);
    // 关闭加载提示
    loadingMessage.close();
    ElMessage.error(error.message || 'AI批量生成失败，请稍后重试');
  } finally {
    batchGenerating.value = false;
  }
};

// 解析批量角色响应
const parseBatchCharactersResponse = (content) => {
  // 清理AI思考标签和无关内容
  let cleanedContent = content
    .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/think>/gi, '')
    .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const characters = [];

  // 使用【角色N】标记分割
  const characterBlocks = cleanedContent.split(/【角色\d+】/).filter(block => block.trim());

  characterBlocks.forEach(block => {
    const char = {};

    // 提取各个字段
    const nameMatch = block.match(/姓名[:：]\s*([^\n]+)/);
    if (nameMatch) char.name = nameMatch[1].trim();

    const ageMatch = block.match(/年龄[:：]\s*(\d+)/);
    if (ageMatch) char.age = parseInt(ageMatch[1]);

    const genderMatch = block.match(/性别[:：]\s*([^\n]+)/);
    if (genderMatch) {
      const gender = genderMatch[1].trim();
      if (gender.includes('女')) char.gender = '女';
      else if (gender.includes('男')) char.gender = '男';
      else char.gender = '其他';
    }

    const roleMatch = block.match(/角色定位[:：]\s*([^\n]+)/);
    if (roleMatch) char.role = roleMatch[1].trim();

    const descMatch = block.match(/描述[:：]\s*([\s\S]*?)(?=性格特点[:：]|$)/);
    if (descMatch) char.description = descMatch[1].trim();

    const personalityMatch = block.match(/性格特点[:：]\s*([\s\S]*?)(?=角色背景[:：]|$)/);
    if (personalityMatch) char.personality = personalityMatch[1].trim();

    const backgroundMatch = block.match(/角色背景[:：]\s*([\s\S]*?)(?=行为动机[:：]|$)/);
    if (backgroundMatch) char.background = backgroundMatch[1].trim();

    const motivationMatch = block.match(/行为动机[:：]\s*([\s\S]*?)(?=人际关系[:：]|$)/);
    if (motivationMatch) char.motivation = motivationMatch[1].trim();

    const relationshipsMatch = block.match(/人际关系[:：]\s*([\s\S]*?)$/);
    if (relationshipsMatch) char.relationships = relationshipsMatch[1].trim();

    // 只添加有名字和定位的角色
    if (char.name && char.role) {
      characters.push(char);
    }
  });

  return characters;
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
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #EBEEF5;
  flex-wrap: wrap;
  gap: 16px;
}

.manager-tabs {
  flex: 1;
  min-width: 300px;
}

.manager-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
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

.tab-content {
  animation: fadeIn 0.3s ease-in-out;
}

.graph-tab {
  height: calc(100vh - 300px);
  min-height: 600px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.character-list {
  padding: 10px;
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

.left-actions {
  display: flex;
  gap: 4px;
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
