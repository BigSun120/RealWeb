<template>
  <div class="outline-editor">
    <div class="editor-header">
      <h3 class="section-title">
        <el-icon><List /></el-icon>
        剧情大纲
      </h3>
      <div class="header-actions">
        <el-button 
          type="success" 
          :icon="MagicStick"
          @click="handleAIGenerate"
        >
          AI智能生成
        </el-button>
        <el-button 
          type="warning" 
          :icon="DocumentCopy"
          @click="handleImportOutline"
        >
          导入大纲
        </el-button>
        <el-button 
          type="primary" 
          :icon="MagicStick"
          :disabled="!hasPlotPoints"
          @click="handleGeneratePrompt"
        >
          生成提示词
        </el-button>
        <el-button 
          type="success"
          :icon="Check"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </el-button>
      </div>
    </div>

    <div class="editor-content">
      <!-- 使用指导 -->
      <el-alert
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <template #title>
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-icon><InfoFilled /></el-icon>
            <strong>大纲编写指导</strong>
          </div>
        </template>
        <template #default>
          <div class="guide-content">
            <p>🎯 <strong>三幕结构说明：</strong></p>
            <ul style="margin: 8px 0; padding-left: 24px;">
              <li><strong>第一幕（开端）：</strong>建立世界观，介绍主要角色，引发核心冲突（建议20-25%篇幅）</li>
              <li><strong>第二幕（对抗）：</strong>角色面对挑战，冲突升级，经历转折（建议50-60%篇幅）</li>
              <li><strong>第三幕（结局）：</strong>冲突解决，故事高潮，收尾（建议15-25%篇幅）</li>
            </ul>
            <p style="margin-top: 12px;">💡 <strong>建议：</strong>每一幕设置3-5个关键节点，每个节点明确事件、角色和情感变化。</p>
          </div>
        </template>
      </el-alert>

      <!-- 结构说明 -->
      <div class="structure-info">
        <el-tag type="primary" size="large">
          <el-icon><List /></el-icon>
          三幕结构
        </el-tag>
        <span class="structure-desc">经典编剧法，适合所有类型的短剧创作</span>
      </div>

      <!-- 三幕结构编辑器 -->
      <div v-if="outlineData.structure === 'three-act'" class="acts-container">
        <div
          v-for="(act, actIndex) in outlineData.acts"
          :key="act.actNumber"
          class="act-section"
        >
          <div class="act-header">
            <div class="act-title-row">
              <el-tag :type="getActTagType(act.actNumber)" size="large">
                第{{ numberToChinese(act.actNumber) }}幕
              </el-tag>
              <el-input
                v-model="act.title"
                placeholder="幕标题"
                class="act-title-input"
              />
            </div>
            <el-input
              v-model="act.description"
              type="textarea"
              :rows="2"
              placeholder="描述这一幕的整体内容和目标..."
              maxlength="200"
              show-word-limit
              class="act-description"
            />
            <div class="field-tip">
              💡 {{ getActGuidance(act.actNumber) }}
            </div>
          </div>

          <!-- 关键节点 -->
          <div class="plot-points">
            <div class="plot-points-header">
              <span class="subtitle">关键节点</span>
              <el-button
                size="small"
                :icon="Plus"
                @click="addPlotPoint(actIndex)"
              >
                添加节点
              </el-button>
            </div>

            <div
              v-for="(point, pointIndex) in act.plotPoints"
              :key="point.id"
              class="plot-point-card"
            >
              <div class="point-header">
                <el-input
                  v-model="point.name"
                  placeholder="节点名称（5-10字建议）"
                  :class="{ 'warning-border': isFieldTooLong(point.name, 50) }"
                  class="point-name"
                />
                <el-button
                  size="small"
                  type="danger"
                  text
                  :icon="Delete"
                  @click="removePlotPoint(actIndex, pointIndex)"
                >
                  删除
                </el-button>
              </div>

              <el-form label-width="80px" size="small">
                <el-form-item label="事件描述">
                  <el-input
                    v-model="point.description"
                    type="textarea"
                    :rows="3"
                    placeholder="描述在这个节点发生的关键事件...（100-200字建议）"
                    :class="{ 'warning-border': isFieldTooLong(point.description, 500) }"
                  />
                  <div class="field-tip">
                    💡 建议：描述具体发生什么事、为什么发生、产生什么影响。例如：“女主因家族债务被迫签下契约，与男主初次见面，双方都对这段婚姻抵触”
                  </div>
                </el-form-item>

                <el-row :gutter="12">
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="涉及角色">
                      <el-select
                        v-model="point.characters"
                        multiple
                        placeholder="选择角色"
                        style="width: 100%"
                      >
                        <el-option
                          v-for="char in availableCharacters"
                          :key="char"
                          :label="char"
                          :value="char"
                        />
                      </el-select>
                      <div class="field-tip" style="margin-top: 4px;">
                        👥 选择在此节点出现的主要角色
                      </div>
                    </el-form-item>
                  </el-col>

                  <el-col :xs="24" :sm="12">
                    <el-form-item label="情感变化">
                      <el-select
                        v-model="point.emotion"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        placeholder="选择或输入情感"
                        style="width: 100%"
                      >
                        <el-option label="平静" value="平静" />
                        <el-option label="好奇" value="好奇" />
                        <el-option label="紧张" value="紧张" />
                        <el-option label="兴奋" value="兴奋" />
                        <el-option label="恐惧" value="恐惧" />
                        <el-option label="愤怒" value="愤怒" />
                        <el-option label="悲伤" value="悲伤" />
                        <el-option label="喜悦" value="喜悦" />
                        <el-option label="感动" value="感动" />
                        <el-option label="震惊" value="震惊" />
                        <el-option label="尴尬" value="尴尬" />
                        <el-option label="甜蜜" value="甜蜜" />
                        <el-option label="焦虑" value="焦虑" />
                        <el-option label="激动" value="激动" />
                        <el-option label="错悄" value="错愀" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="预估集数">
                  <el-input
                    v-model="point.episodeRange"
                    placeholder="如：1-2"
                    style="width: 150px"
                  />
                </el-form-item>
              </el-form>
            </div>

            <!-- 空状态 -->
            <el-empty
              v-if="act.plotPoints.length === 0"
              description="暂无节点，点击上方按钮添加"
              :image-size="80"
            />
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="hasPlotPoints" class="outline-stats">
        <el-card shadow="hover">
          <template #header>
            <div class="stats-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>大纲统计</span>
            </div>
          </template>
          <div class="stats-content">
            <div class="stat-item">
              <span class="stat-label">总节点数：</span>
              <span class="stat-value">{{ totalPlotPoints }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">涉及角色：</span>
              <span class="stat-value">{{ uniqueCharacters.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预估总集数：</span>
              <span class="stat-value">{{ estimatedEpisodes }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 提示词对话框 -->
    <PromptDialog
      v-model="showPromptDialog"
      :prompt="generatedPrompt"
      title="剧情大纲提示词"
    />

    <!-- AI智能生成提示词对话框 -->
    <PromptDialog
      v-model="showAIPromptDialog"
      :prompt="aiGeneratedPrompt"
      title="AI智能大纲生成提示词"
      description="复制以下提示词到AI工具（如ChatGPT）生成完整的三幕式大纲，然后使用【导入大纲】功能导入生成的内容"
    />

    <!-- 大纲导入对话框 -->
    <AIResponseParser
      v-model="showImportDialog"
      mode="outline"
      title="导入大纲"
      description="粘贴AI生成的大纲内容，系统将自动解析并填充到大纲编辑器"
      @parsed="handleOutlineParsed"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  List,
  MagicStick, 
  Check,
  Plus,
  Delete,
  DataAnalysis,
  DocumentCopy,
  InfoFilled
} from '@element-plus/icons-vue';
import PromptDialog from './PromptDialog.vue';
import AIResponseParser from './AIResponseParser.vue';
import { 
  generateOutlinePrompt,
  generateCompleteOutlinePrompt 
} from '../utils/promptTemplates';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      structure: 'three-act',
      acts: []
    })
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  },
  worldview: {
    type: Object,
    default: () => ({})
  },
  characters: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

const saving = ref(false);
const showPromptDialog = ref(false);
const generatedPrompt = ref('');
const showAIPromptDialog = ref(false);
const aiGeneratedPrompt = ref('');
const showImportDialog = ref(false);

// 大纲数据
const outlineData = ref({
  structure: 'three-act',
  acts: [
    {
      actNumber: 1,
      title: '第一幕：开端',
      description: '建立世界观，介绍主要角色，引发核心冲突',
      plotPoints: []
    },
    {
      actNumber: 2,
      title: '第二幕：对抗',
      description: '角色面对挑战，冲突升级，经历转折',
      plotPoints: []
    },
    {
      actNumber: 3,
      title: '第三幕：结局',
      description: '冲突解决，故事高潮，收尾',
      plotPoints: []
    }
  ]
});

// 可用角色列表
const availableCharacters = computed(() => {
  return props.characters.map(c => c.name).filter(Boolean);
});

// 是否有节点
const hasPlotPoints = computed(() => {
  return outlineData.value.acts.some(act => act.plotPoints.length > 0);
});

// 总节点数
const totalPlotPoints = computed(() => {
  return outlineData.value.acts.reduce((sum, act) => sum + act.plotPoints.length, 0);
});

// 涉及的唯一角色
const uniqueCharacters = computed(() => {
  const chars = new Set();
  outlineData.value.acts.forEach(act => {
    act.plotPoints.forEach(point => {
      point.characters?.forEach(char => chars.add(char));
    });
  });
  return Array.from(chars);
});

// 预估总集数
const estimatedEpisodes = computed(() => {
  let max = 0;
  outlineData.value.acts.forEach(act => {
    act.plotPoints.forEach(point => {
      if (point.episodeRange) {
        const match = point.episodeRange.match(/(\d+)/g);
        if (match) {
          const nums = match.map(Number);
          max = Math.max(max, ...nums);
        }
      }
    });
  });
  return max || '未设置';
});

// 数字转中文
const numberToChinese = (num) => {
  const chinese = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return chinese[num] || num;
};

// 获取幕标签类型
const getActTagType = (actNumber) => {
  const types = ['', 'success', 'warning', 'danger'];
  return types[actNumber] || 'info';
};

// 获取幕的指导文本
const getActGuidance = (actNumber) => {
  const guidance = {
    1: '建议：包含世界观介绍、主要角色登场、日常生活展示、触发事件发生。让观众熟悉人物和环境，为后续冲突铺垫。',
    2: '建议：设置多个困难和挑战，让主角成长和变化。包括关系深化、冲突升级、转折点出现。这是故事的主体部分。',
    3: '建议：最终对决、高潮场面、冲突解决、情感升华、结局交代。给观众一个满意的结果，留下深刻印象。'
  };
  return guidance[actNumber] || '';
};

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 添加节点
const addPlotPoint = (actIndex) => {
  const newPoint = {
    id: generateId(),
    name: '',
    description: '',
    characters: [],
    emotion: [], // 修改为数组以支持多选
    episodeRange: ''
  };
  outlineData.value.acts[actIndex].plotPoints.push(newPoint);
};

// 删除节点
const removePlotPoint = (actIndex, pointIndex) => {
  outlineData.value.acts[actIndex].plotPoints.splice(pointIndex, 1);
};

// 监听数据变化
watch(outlineData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });

// 监听props变化
watch(() => props.modelValue, (newVal, oldVal) => {
  // 避免循环更新：只在内容真正不同时才同步
  if (newVal && newVal.acts && newVal.acts.length > 0) {
    const newValStr = JSON.stringify(newVal);
    const currentValStr = JSON.stringify(outlineData.value);
    
    // 只有当数据真的不同时才更新
    if (newValStr !== currentValStr) {
      outlineData.value = JSON.parse(newValStr);
    }
  }
}, { immediate: true, deep: true });

// 保存
const handleSave = async () => {
  if (!hasPlotPoints.value) {
    ElMessage.warning('请至少添加一个关键节点');
    return;
  }

  saving.value = true;
  try {
    emit('save', outlineData.value);
  } finally {
    saving.value = false;
  }
};

// 生成提示词
const handleGeneratePrompt = () => {
  if (!hasPlotPoints.value) {
    ElMessage.warning('请先添加关键节点');
    return;
  }

  try {
    generatedPrompt.value = generateOutlinePrompt({
      outline: outlineData.value,
      projectInfo: props.projectInfo,
      worldview: props.worldview,
      characters: props.characters
    });
    showPromptDialog.value = true;
  } catch (error) {
    console.error('生成提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// AI智能生成大纲
const handleAIGenerate = () => {
  try {
    // 检查是否有世界观和角色数据
    const hasWorldview = props.worldview && Object.keys(props.worldview).length > 0;
    const hasCharacters = props.characters && props.characters.length > 0;
    
    if (!hasWorldview || !hasCharacters) {
      ElMessageBox.confirm(
        '建议先完善世界观和角色设定，这样AI能生成更符合剧本背景的大纲。是否继续？',
        '提示',
        {
          confirmButtonText: '继续生成',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        generateAIPrompt();
      }).catch(() => {
        // 用户取消
      });
    } else {
      generateAIPrompt();
    }
  } catch (error) {
    console.error('生成AI提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 生成AI提示词的具体逻辑
const generateAIPrompt = () => {
  aiGeneratedPrompt.value = generateCompleteOutlinePrompt({
    projectType: props.projectInfo.type,
    projectName: props.projectInfo.name,
    worldview: props.worldview,
    characters: props.characters,
    totalEpisodes: props.projectInfo.episodeCount || 60
  });
  showAIPromptDialog.value = true;
};

// 导入大纲
const handleImportOutline = () => {
  showImportDialog.value = true;
};

// 处理解析后的大纲数据
const handleOutlineParsed = (parsedData) => {
  if (!parsedData || !parsedData.acts || parsedData.acts.length === 0) {
    ElMessage.warning('未能解析到有效的大纲数据');
    return;
  }

  // 检查是否有现有大纲内容
  const hasExistingContent = hasPlotPoints.value;
  
  if (hasExistingContent) {
    // 如果有现有内容，先确认是否覆盖
    ElMessageBox.confirm(
      `检测到已有大纲内容（共 ${totalPlotPoints.value} 个节点），导入将覆盖所有现有内容。是否继续？`,
      '确认覆盖',
      {
        confirmButtonText: '覆盖并导入',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    ).then(() => {
      performImport(parsedData);
    }).catch(() => {
      ElMessage.info('已取消导入');
    });
  } else {
    // 没有现有内容，直接导入
    performImport(parsedData);
  }
};

// 执行导入的具体逻辑
const performImport = (parsedData) => {
  try {
    // 将解析的数据转换为组件数据格式
    const convertedActs = parsedData.acts.map((act, index) => {
      const actNumber = index + 1;
      
      // 转换节点数据
      const plotPoints = (act.nodes || []).map(node => {
        // 将emotion字符串转换为数组
        let emotionArray = [];
        if (node.emotion) {
          if (Array.isArray(node.emotion)) {
            emotionArray = node.emotion;
          } else if (typeof node.emotion === 'string') {
            // 将字符串按顿号、逗号、空格或换行分隔
            emotionArray = node.emotion.split(/[、,\s\n]+/).filter(e => e.trim());
          }
        }
        
        // 过滤掉非情感词汇并去重
        const emotionSet = new Set();
        emotionArray.forEach(e => {
          const trimmed = e.trim();
          // 过滤条件：
          // 1. 不为空
          // 2. 不包含“集数”
          // 3. 不是纯数字范围（如"1-3"）
          // 4. 不以冒号开头
          // 5. 长度在2-6个字之间（情感词一般较短）
          // 6. 不包含数字和特殊符号
          if (trimmed && 
              !trimmed.includes('集数') && 
              !trimmed.match(/^\d+-\d+$/) &&
              !trimmed.match(/^：/) &&
              !trimmed.match(/[\uff1a:\d]/) && // 不包含冒号和数字
              trimmed.length >= 2 && 
              trimmed.length <= 6) {
            emotionSet.add(trimmed);
          }
        });
        
        // 转回数组
        emotionArray = Array.from(emotionSet);
        
        return {
          id: generateId(),
          name: node.title || '',
          description: node.content || '',
          characters: node.characters || [],
          emotion: emotionArray,
          episodeRange: node.episodeRange || ''
        };
      });

      return {
        actNumber,
        title: act.title || `第${numberToChinese(actNumber)}幕`,
        description: act.description || '',
        plotPoints
      };
    });

    // 数据质量校验
    const validation = validateImportedData(convertedActs);
    
    // 更新大纲数据
    outlineData.value.acts = convertedActs;
    
    // 显示导入结果和校验信息
    showImportResult(parsedData, validation);
    showImportDialog.value = false;
    
    // 自动保存
    emit('update:modelValue', outlineData.value);
    emit('save', outlineData.value);
  } catch (error) {
    console.error('导入大纲失败:', error);
    ElMessage.error('导入大纲失败，请检查数据格式');
  }
};

// 数据质量校验
const validateImportedData = (acts) => {
  const validation = {
    totalNodes: 0,
    emptyTitles: 0,
    emptyDescriptions: 0,
    noCharacters: 0,
    noEpisodeRange: 0,
    warnings: []
  };

  acts.forEach((act, actIndex) => {
    act.plotPoints.forEach((node, nodeIndex) => {
      validation.totalNodes++;
      
      if (!node.name || node.name.trim() === '') {
        validation.emptyTitles++;
        validation.warnings.push(`第${actIndex + 1}幕-节点${nodeIndex + 1}：标题为空`);
      }
      
      if (!node.description || node.description.trim() === '') {
        validation.emptyDescriptions++;
      }
      
      if (!node.characters || node.characters.length === 0) {
        validation.noCharacters++;
      }
      
      if (!node.episodeRange || node.episodeRange.trim() === '') {
        validation.noEpisodeRange++;
      }
    });
  });

  return validation;
};

// 显示导入结果
const showImportResult = (parsedData, validation) => {
  const totalNodes = getTotalNodesFromParsed(parsedData);
  
  // 基本成功消息
  let message = `成功导入大纲：${parsedData.acts.length} 幕，${totalNodes} 个节点`;
  
  // 添加校验警告
  const warnings = [];
  if (validation.emptyTitles > 0) {
    warnings.push(`${validation.emptyTitles}个节点标题为空`);
  }
  if (validation.emptyDescriptions > 0) {
    warnings.push(`${validation.emptyDescriptions}个节点描述为空`);
  }
  if (validation.noCharacters > 0) {
    warnings.push(`${validation.noCharacters}个节点未指定角色`);
  }
  if (validation.noEpisodeRange > 0) {
    warnings.push(`${validation.noEpisodeRange}个节点未指定集数`);
  }
  
  if (warnings.length > 0) {
    ElMessageBox.alert(
      `${message}\n\n⚠️ 数据质量提示：\n${warnings.map(w => `• ${w}`).join('\n')}\n\n建议手动完善这些信息以获得更好的效果。`,
      '导入完成',
      {
        confirmButtonText: '知道了',
        type: 'success',
        dangerouslyUseHTMLString: false
      }
    );
  } else {
    ElMessage.success(`${message}（数据完整）`);
  }
};

// 计算解析数据中的总节点数
const getTotalNodesFromParsed = (parsedData) => {
  return parsedData.acts.reduce((total, act) => {
    return total + (act.nodes?.length || 0);
  }, 0);
};

// 检测字段是否超长
const isFieldTooLong = (value, maxLength) => {
  if (!value) return false;
  return value.length > maxLength;
};
</script>

<style scoped>
.outline-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
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

.editor-content {
  flex: 1;
  overflow-y: auto;
}

.structure-info {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
  border-radius: 8px;
  border: 1px solid #BAE6FD;
}

.structure-info .el-tag {
  font-weight: 600;
}

.structure-desc {
  color: #606266;
  font-size: 14px;
}

.acts-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.act-section {
  background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
  border-radius: 12px;
  padding: 20px;
  border: 2px solid #BAE6FD;
}

.act-header {
  margin-bottom: 16px;
}

.act-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.act-title-input {
  flex: 1;
}

.act-description {
  margin-top: 8px;
}

.plot-points {
  margin-top: 16px;
}

.plot-points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #0284C7;
}

.plot-point-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #E0F2FE;
  transition: all 0.3s;
}

.plot-point-card:hover {
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);
  border-color: #0284C7;
}

.point-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.point-name {
  flex: 1;
  margin-right: 12px;
}

.outline-stats {
  margin-top: 24px;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.stats-content {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.stat-value {
  color: #0284C7;
  font-size: 18px;
  font-weight: 600;
}

/* 超长字段警告边框 */
:deep(.warning-border) {
  border-color: #E6A23C !important;
  box-shadow: 0 0 0 1px #E6A23C inset !important;
}

:deep(.warning-border:focus) {
  border-color: #E6A23C !important;
  box-shadow: 0 0 0 1px #E6A23C inset !important;
}

:deep(.warning-border .el-textarea__inner) {
  border-color: #E6A23C !important;
}

:deep(.warning-border .el-textarea__inner:focus) {
  border-color: #E6A23C !important;
  box-shadow: 0 0 0 1px #E6A23C inset !important;
}

/* 响应式 */
@media (max-width: 768px) {
  .editor-header {
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

  .act-title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-content {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
