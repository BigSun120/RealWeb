<template>
  <div class="worldview-editor">
    <div class="editor-header">
      <h3 class="section-title">
        <el-icon><Document /></el-icon>
        世界观设定
      </h3>
      <div class="header-actions">
        <!-- AI自动生成按钮（新增）-->
        <el-dropdown 
          split-button 
          type="primary"
          :loading="aiGenerating"
          :disabled="aiGenerating"
          @click="handleAIAutoGenerate"
          @command="handleAICommand"
        >
          <el-icon><MagicStick /></el-icon>
          {{ aiGenerating ? 'AI生成中...' : 'AI自动生成' }}
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="auto-generate">
                <el-icon><MagicStick /></el-icon>
                自动生成并填充
              </el-dropdown-item>
              <el-dropdown-item command="generate-prompt" divided>
                <el-icon><Document /></el-icon>
                生成提示词（手动）
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <el-button 
          type="warning" 
          :icon="Upload"
          @click="handlePasteAI"
        >
          粘贴AI回答
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
      <!-- AI生成状态提示 -->
      <el-alert
        v-if="aiGenerating"
        type="info"
        :closable="false"
        class="ai-generating-tip"
      >
        <template #title>
          <div class="generating-header">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>AI正在生成世界观设定，请稍候...</span>
          </div>
        </template>
        <el-progress 
          :percentage="generateProgress" 
          :indeterminate="generateProgress < 10"
        />
        <div class="generating-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>预计需要20-60秒，请耐心等待（根据AI模型和内容复杂度）</span>
        </div>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        label-position="top"
        class="worldview-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="📜 故事背景">
              <el-input
                v-model="formData.background"
                type="textarea"
                :rows="4"
                :placeholder="getPlaceholder('background')"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.background.length > 500 }">
                💡 提示：包括时代、地点、社会结构等基本信息 
                <span v-if="formData.background.length > 0">
                  (当前 {{ formData.background.length }} 字<span v-if="formData.background.length > 500" class="warning-text">，建议不超过500字</span>)
                </span>
              </div>
              <div v-if="getExample('background')" class="field-example">
                📝 示例：{{ getExample('background') }}
              </div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="🌍 世界设定">
              <el-input
                v-model="formData.setting"
                type="textarea"
                :rows="4"
                :placeholder="getPlaceholder('setting')"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.setting.length > 500 }">
                💡 提示：世界的独特规则、价值观、特殊设定
                <span v-if="formData.setting.length > 0">
                  (当前 {{ formData.setting.length }} 字<span v-if="formData.setting.length > 500" class="warning-text">，建议不超过500字</span>)
                </span>
              </div>
              <div v-if="getExample('setting')" class="field-example">
                📝 示例：{{ getExample('setting') }}
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item label="🎯 核心主题">
              <el-input
                v-model="formData.theme"
                type="textarea"
                :rows="3"
                :placeholder="getPlaceholder('theme')"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.theme.length > 200 }">
                💡 提示：故事的核心理念和价值观
                <span v-if="formData.theme.length > 0">
                  (当前 {{ formData.theme.length }} 字<span v-if="formData.theme.length > 200" class="warning-text">，建议不超过200字</span>)
                </span>
              </div>
              <div v-if="getExample('theme')" class="field-example">
                📝 示例：{{ getExample('theme') }}
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item label="⚔️ 主要冲突">
              <el-input
                v-model="formData.conflict"
                type="textarea"
                :rows="3"
                :placeholder="getPlaceholder('conflict')"
              />
              <div class="field-tip" :class="{ 'field-warning': formData.conflict.length > 200 }">
                💡 提示：推动剧情发展的核心矛盾
                <span v-if="formData.conflict.length > 0">
                  (当前 {{ formData.conflict.length }} 字<span v-if="formData.conflict.length > 200" class="warning-text">，建议不超过200字</span>)
                </span>
              </div>
              <div v-if="getExample('conflict')" class="field-example">
                📝 示例：{{ getExample('conflict') }}
              </div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="🎨 情感基调">
              <el-radio-group v-model="formData.tone" size="large">
                <el-radio-button label="轻松幽默">😄 轻松幽默</el-radio-button>
                <el-radio-button label="紧张悬疑">🔥 紧张悬疑</el-radio-button>
                <el-radio-button label="浪漫甜蜜">💕 浪漫甜蜜</el-radio-button>
                <el-radio-button label="热血励志">💪 热血励志</el-radio-button>
                <el-radio-button label="虐心催泪">😢 虐心催泪</el-radio-button>
                <el-radio-button label="爽快打脸">😎 爽快打脸</el-radio-button>
                <el-radio-button value="custom">✏️ 自定义</el-radio-button>
              </el-radio-group>
              
              <!-- 自定义输入框 -->
              <el-input
                v-if="showCustomTone"
                v-model="customTone"
                placeholder="请输入自定义的情感基调..."
                maxlength="20"
                show-word-limit
                style="margin-top: 12px;"
                @blur="handleCustomToneBlur"
              />
              
              <div class="field-tip">
                💡 提示：选择剧本的整体情感氛围，或自定义输入
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 预览卡片 -->
      <div v-if="hasContent" class="preview-card">
        <div class="preview-header">
          <el-icon><View /></el-icon>
          <span>世界观概览</span>
        </div>
        <div class="preview-content">
          <div v-if="formData.background" class="preview-item">
            <strong>背景：</strong>{{ formData.background }}
          </div>
          <div v-if="formData.setting" class="preview-item">
            <strong>设定：</strong>{{ formData.setting }}
          </div>
          <div v-if="formData.theme" class="preview-item">
            <strong>主题：</strong>{{ formData.theme }}
          </div>
          <div v-if="formData.conflict" class="preview-item">
            <strong>冲突：</strong>{{ formData.conflict }}
          </div>
          <div v-if="formData.tone" class="preview-item">
            <strong>基调：</strong>{{ formData.tone }}
          </div>
        </div>
      </div>
    </div>

    <!-- 提示词对话框 -->
    <PromptDialog
      v-model="showPromptDialog"
      :prompt="generatedPrompt"
      title="世界观设定提示词"
    />

    <!-- AI回答解析器 -->
    <AIResponseParser
      v-model="showAIParser"
      mode="worldview"
      @confirm="handleAIParseConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  Document, 
  MagicStick, 
  Check, 
  View,
  Upload,
  Loading,
  InfoFilled
} from '@element-plus/icons-vue';
import PromptDialog from './PromptDialog.vue';
import AIResponseParser from './AIResponseParser.vue';
import { generateWorldviewPrompt } from '../utils/promptTemplates';
import { parseWorldviewResponse } from '../utils/aiResponseParser';
import { generateAIContent } from '@/api/ai';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      background: '',
      setting: '',
      theme: '',
      conflict: '',
      tone: ''
    })
  },
  projectInfo: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'save']);

const formRef = ref(null);
const saving = ref(false);
const showPromptDialog = ref(false);
const generatedPrompt = ref('');
const showAIParser = ref(false);
const customTone = ref('');

// AI自动生成相关状态
const aiGenerating = ref(false);
const generateProgress = ref(0);

// 是否显示自定义输入框
const showCustomTone = computed(() => {
  return formData.value.tone === 'custom';
});

// 表单数据
const formData = ref({
  background: props.modelValue?.background || '',
  setting: props.modelValue?.setting || '',
  theme: props.modelValue?.theme || '',
  conflict: props.modelValue?.conflict || '',
  tone: props.modelValue?.tone || ''
});

// 是否有内容
const hasContent = computed(() => {
  return formData.value.background || 
         formData.value.setting || 
         formData.value.theme || 
         formData.value.conflict || 
         formData.value.tone;
});

// 监听数据变化
watch(formData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });

// 监听props变化（只在初始化时或外部数据真正变化时更新）
watch(() => props.modelValue, (newVal, oldVal) => {
  // 避免循环更新：只在外部数据真正改变时更新
  if (newVal && JSON.stringify(newVal) !== JSON.stringify(formData.value)) {
    formData.value = {
      background: newVal.background || '',
      setting: newVal.setting || '',
      theme: newVal.theme || '',
      conflict: newVal.conflict || '',
      tone: newVal.tone || ''
    };
  }
}, { deep: true });

// 保存
const handleSave = async () => {
  if (!hasContent.value) {
    ElMessage.warning('请至少填写一项世界观设定');
    return;
  }

  saving.value = true;
  try {
    emit('save', formData.value);
  } finally {
    saving.value = false;
  }
};

// 处理自定义基调失焦
const handleCustomToneBlur = () => {
  if (customTone.value.trim()) {
    formData.value.tone = customTone.value.trim();
  } else {
    // 如果没有输入，恢复到默认选项
    formData.value.tone = '';
  }
};

// 根据项目类型获取字段提示文本
const getPlaceholder = (field) => {
  const projectType = props.projectInfo?.type || '';
  
  const placeholders = {
    '霸道总裁': {
      background: '描述故事发生的时代背景、社会环境等...\n例如：现代都市，某顶级跨国集团总部，豪华写字楼里的权力游戏',
      setting: '描述这个世界的特殊规则、独特设定等...\n例如：豪门世家的等级制度、契约婚姻的社会惯例、商场规则',
      theme: '故事想表达的核心主题...\n例如：从契约到真爱、爱情与自我成长、破除偏见找到真爱',
      conflict: '故事的主要矛盾和冲突点...\n例如：男女主的身份地位悬殊、家族利益冲突、契约限制与真心'
    },
    '悬疑推理': {
      background: '描述故事发生的时代背景、社会环境等...\n例如：现代城市，一个阐蓝的滘江小镇，连续发生神秘案件',
      setting: '描述这个世界的特殊规则、独特设定等...\n例如：封闭的社交圈层、错综复杂的人际关系、隐藏的秘密',
      theme: '故事想表达的核心主题...\n例如：真相与谎言、人性的黑暗面、正义与复仇',
      conflict: '故事的主要矛盾和冲突点...\n例如：错综复杂的案情真相、多方势力的博弈、主角的信任危机'
    },
    '甜宠日常': {
      background: '描述故事发生的时代背景、社会环境等...\n例如：现代城市，一个充满活力的大学校园或温馨小镇',
      setting: '描述这个世界的特殊规则、独特设定等...\n例如：轻松愉快的生活氛围、简单纯粹的人际关系、小美好不断',
      theme: '故事想表达的核心主题...\n例如：纯粹的爱情、疅0的美好、陇伴与成长',
      conflict: '故事的主要矛盾和冲突点...\n例如：小误会小矛盾、性格差异的磨合、外界的小干扰'
    },
    '复仇爽剧': {
      background: '描述故事发生的时代背景、社会环境等...\n例如：现代都市，上流社会的权势交锣、利益博弈',
      setting: '描述这个世界的特殊规则、独特设定等...\n例如：弱肉强食的丛林法则、复仇者的成长体系、打脸设定',
      theme: '故事想表达的核心主题...\n例如：复仇与正义、凤凰涅槃、绝地反击爽文',
      conflict: '故事的主要矛盾和冲突点...\n例如：深仇大恨、地位悬殊的对抗、步步为营的复仇计划'
    },
    '古装穿越': {
      background: '描述故事发生的时代背景、社会环境等...\n例如：架空古代王朝，皇宫权谋与江湖义气交织',
      setting: '描述这个世界的特殊规则、独特设定等...\n例如：穿越者的金手指能力、古代礼仪制度、皇宫权力结构',
      theme: '故事想表达的核心主题...\n例如：现代思想与古代碰撞、命运改变、爱情超越时空',
      conflict: '故事的主要矛盾和冲突点...\n例如：现代人的身份秘密、皇宫权力斗争、历史轨迹的改变'
    },
    '职场励志': {
      background: '描述故事发生的时代背景、社会环境等...\n例如：现代都市，竞争激烈的某行业（金融、传媒、科技）',
      setting: '描述这个世界的特殊规则、独特设定等...\n例如：职场潜规则、行业特有文化、成功的标准与代价',
      theme: '故事想表达的核心主题...\n例如：奋斗与梦想、自我价值实现、职场与生活平衡',
      conflict: '故事的主要矛盾和冲突点...\n例如：职场竞争与合作、个人梦想与现实压力、职场陷阱与险恶'
    }
  };
  
  // 默认提示文本
const defaultPlaceholders = {
    background: '描述故事发生的时代背景、社会环境等...\n例如：现代都市，某顶级跨国集团总部大楼',
    setting: '描述这个世界的特殊规则、独特设定等...\n例如：豪门世家的等级制度、契约婚姻的社会背景',
    theme: '故事想表达的核心主题...\n例如：爱情与自我救赎、从契约到真爱',
    conflict: '故事的主要矛盾和冲突点...\n例如：男女主的身份差距、家族恩怨、契约限制'
  };
  
  return placeholders[projectType]?.[field] || defaultPlaceholders[field] || '';
};

// 获取示例文本
const getExample = (field) => {
  const projectType = props.projectInfo?.type || '';
  
  const examples = {
    '霸道总裁': {
      background: 'A市的经济中心，盛天集团总部占据了整栋88层的摩天大楼，掌控着城市的经济命脉',
      setting: '商界精英阶层以利益为先，婚姻契约是家族联盟的常见手段，但真爱难觅',
      theme: '在利益交换的冰冷契约中，逐渐解冻心防，发现真爱的可贵',
      conflict: '男主是高冷总裁，女主是普通职员，因契约结婚，但面对家族反对和身份鸿沟'
    },
    '悬疑推理': {
      background: '滘江小镇，夜雨绵绵，连续三起密室谋杀案震惊全镇',
      setting: '小镇社交圈层错综复杂，每个人都有秘密，真相被层层谎言掩盖',
      theme: '揭露人性黑暗面，探索真相背后的动机与代价',
      conflict: '探员与凶手的智力博弈，真相逼近时的危险与考验'
    }
  };
  
  return examples[projectType]?.[field] || '';
};

// 生成提示词
const handleGeneratePrompt = () => {
  if (!hasContent.value) {
    ElMessage.warning('请先填写世界观设定内容');
    return;
  }

  try {
    generatedPrompt.value = generateWorldviewPrompt({
      ...formData.value,
      projectType: props.projectInfo.type,
      projectName: props.projectInfo.name
    });
    showPromptDialog.value = true;
  } catch (error) {
    console.error('生成提示词失败:', error);
    ElMessage.error('生成提示词失败');
  }
};

// 打开AI回答解析器
const handlePasteAI = () => {
  showAIParser.value = true;
};

// 处理AI解析结果
const handleAIParseConfirm = (parsedData) => {
  // 填充表单数据
  if (parsedData.background) formData.value.background = parsedData.background;
  if (parsedData.setting) formData.value.setting = parsedData.setting;
  if (parsedData.theme) formData.value.theme = parsedData.theme;
  if (parsedData.conflict) formData.value.conflict = parsedData.conflict;
  if (parsedData.tone) {
    // 检查是否是预设基调
    const presetTones = ['轻松幽默', '紧张悬疑', '浪漫甜蜜', '热血励志', '虐心催泪', '爽快打脸'];
    if (presetTones.includes(parsedData.tone)) {
      formData.value.tone = parsedData.tone;
    } else {
      // 自定义基调
      customTone.value = parsedData.tone;
      formData.value.tone = 'custom';
    }
  }
  
  ElMessage.success('已从AI回答中提取并填充内容');
};

// ==================== AI自动生成功能 ====================

// AI自动生成（主按钮点击）
const handleAIAutoGenerate = () => {
  handleAICommand('auto-generate');
};

// AI命令处理
const handleAICommand = async (command) => {
  switch (command) {
    case 'auto-generate':
      await performAIGenerate();
      break;
    case 'generate-prompt':
      handleGeneratePrompt();
      break;
  }
};

// 执行AI生成
const performAIGenerate = async () => {
  // 1. 检查是否有基础内容
  const hasBasicInfo = formData.value.background || 
                       formData.value.setting || 
                       formData.value.theme;
  
  if (!hasBasicInfo) {
    try {
      await ElMessageBox.confirm(
        '建议先填写部分世界观内容（如背景、主题等），AI会根据这些信息生成更符合预期的设定。是否继续？',
        '提示',
        {
          confirmButtonText: '继续生成',
          cancelButtonText: '去填写',
          type: 'warning'
        }
      );
    } catch {
      return; // 用户取消
    }
  }

  // 2. 生成提示词
  const prompt = generateWorldviewPrompt({
    ...formData.value,
    projectType: props.projectInfo.type,
    projectName: props.projectInfo.name
  });

  const messages = [
    { role: 'system', content: '你是专业的编剧助手，擅长创作短剧世界观设定。请严格按照要求的格式输出，使用【】标记字段。' },
    { role: 'user', content: prompt }
  ];

  aiGenerating.value = true;
  generateProgress.value = 0;

  try {
    // 执行AI生成
    await performNormalGenerate(messages);
  } catch (error) {
    console.error('AI生成失败:', error);
    
    // 错误处理
    if (error.response?.data?.code === 500 && error.response?.data?.message?.includes('未找到')) {
      try {
        await ElMessageBox.confirm(
          '未找到可用的AI连接。您可以：\n1. 前往【个人中心】配置自己的AI密钥（推荐）\n2. 联系管理员配置平台AI服务\n3. 使用手动模式生成提示词',
          '需要配置AI',
          {
            confirmButtonText: '去配置',
            cancelButtonText: '手动模式',
            type: 'warning'
          }
        );
        // 跳转到AI配置页面（需要根据实际路由调整）
        window.open('/#/profile/ai-settings', '_blank');
      } catch {
        // 用户选择手动模式
        handleGeneratePrompt();
      }
    } else {
      ElMessage.error(error.response?.data?.message || error.message || 'AI生成失败，请稍后重试');
    }
  } finally {
    aiGenerating.value = false;
    generateProgress.value = 0;
  }
};

// 普通AI生成
const performNormalGenerate = async (messages) => {
  // 记录开始时间
  const startTime = Date.now();
  
  // 模拟进度
  const progressInterval = setInterval(() => {
    if (generateProgress.value < 90) {
      generateProgress.value += 10;
    }
  }, 500);

  try {
    const response = await generateAIContent(messages, {
      temperature: 0.8,
      maxTokens: 2000
    });

    clearInterval(progressInterval);
    generateProgress.value = 100;
    
    const duration = Date.now() - startTime;

    if (response.code === 200 && response.data?.content) {
      const { content, usage, finishReason, latency } = response.data;
      
      // 解析AI回答并填充
      const parsedData = parseWorldviewResponse(content);
      
      // 填充数据
      Object.keys(parsedData).forEach(key => {
        if (parsedData[key]) {
          if (key === 'tone') {
            // 处理情感基调
            const presetTones = ['轻松幽默', '紧张悬疑', '浪漫甜蜜', '热血励志', '虐心催泪', '爽快打脸'];
            if (presetTones.includes(parsedData[key])) {
              formData.value.tone = parsedData[key];
            } else {
              customTone.value = parsedData[key];
              formData.value.tone = 'custom';
            }
          } else {
            formData.value[key] = parsedData[key];
          }
        }
      });

      // 根据finishReason显示不同的提示
      handleGenerationComplete(finishReason, usage, duration, parsedData);
      
      // 显示生成统计信息
      console.log('📊 AI生成统计:', {
        '耗时': `${(duration/1000).toFixed(1)}秒`,
        'Token使用': usage?.total_tokens || 0,
        '输入Token': usage?.prompt_tokens || 0,
        '输出Token': usage?.completion_tokens || 0,
        '完成原因': finishReason || 'unknown',
        '响应时间': latency ? `${latency}ms` : '-'
      });
    } else {
      throw new Error(response.message || '生成失败');
    }
  } finally {
    clearInterval(progressInterval);
  }
};

// 处理生成完成后的提示
const handleGenerationComplete = (finishReason, usage, duration, parsedData) => {
  // 检查内容完整性
  const completenessCheck = {
    hasBackground: parsedData.background && parsedData.background.length > 10,
    hasSetting: parsedData.setting && parsedData.setting.length > 10,
    hasTheme: parsedData.theme && parsedData.theme.length > 5,
    hasConflict: parsedData.conflict && parsedData.conflict.length > 5,
    hasTone: !!parsedData.tone
  };
  
  const completedFields = Object.values(completenessCheck).filter(Boolean).length;
  const totalFields = Object.keys(completenessCheck).length;
  const completenessRate = (completedFields / totalFields * 100).toFixed(0);
  
  // 根据finishReason和完整性显示不同提示
  if (finishReason === 'stop') {
    // AI正常完成
    if (completedFields === totalFields) {
      ElMessage.success({
        message: `✅ AI生成成功！已自动填充所有字段（耗时${(duration/1000).toFixed(1)}秒）`,
        duration: 3000
      });
    } else {
      ElMessage.success({
        message: `✅ AI生成完成，已填充${completedFields}/${totalFields}个字段，请检查并补充`,
        duration: 4000
      });
    }
  } else if (finishReason === 'length') {
    // 达到Token限制
    ElMessage.warning({
      message: `⚠️ AI生成达到长度限制（${usage?.completion_tokens || 0} tokens），内容可能不完整。已填充${completedFields}/${totalFields}个字段。`,
      duration: 5000
    });
    console.warn('⚠️ 建议：增加maxTokens参数或简化提示词');
  } else if (finishReason === 'content_filter') {
    // 内容被过滤
    ElMessage.error({
      message: '🚫 生成内容触发了内容策略，请调整提示词后重试',
      duration: 5000
    });
  } else {
    // 其他情况或未知finishReason
    if (completedFields >= totalFields * 0.8) {
      ElMessage.success({
        message: `✅ AI生成完成，已填充${completedFields}/${totalFields}个字段（完整度${completenessRate}%）`,
        duration: 3000
      });
    } else if (completedFields >= totalFields * 0.5) {
      ElMessage.warning({
        message: `⚠️ AI生成部分完成，已填充${completedFields}/${totalFields}个字段，请检查并补充`,
        duration: 4000
      });
    } else {
      ElMessage.error({
        message: `❌ AI生成内容不完整（仅${completedFields}/${totalFields}个字段），建议重新生成`,
        duration: 5000
      });
    }
  }
};

</script>

<style scoped>
.worldview-editor {
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

.worldview-form {
  margin-bottom: 24px;
}

.field-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.field-tip.field-warning {
  color: #E6A23C;
}

.warning-text {
  color: #F56C6C;
  font-weight: 600;
}

.field-example {
  font-size: 12px;
  color: #67C23A;
  margin-top: 6px;
  padding: 8px 12px;
  background: #F0F9FF;
  border-left: 3px solid #409EFF;
  border-radius: 4px;
  line-height: 1.6;
}

.preview-card {
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF0F6 100%);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #FFE0E6;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #FF6B6B;
  margin-bottom: 16px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

.preview-item strong {
  color: #FF6B6B;
  margin-right: 8px;
}

/* AI生成状态样式 */
.ai-generating-tip {
  margin-bottom: 20px;
}

.generating-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.generating-header .el-icon {
  font-size: 18px;
}

.generating-tip {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #409eff;
}

.generating-tip .el-icon {
  font-size: 14px;
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
}
</style>
