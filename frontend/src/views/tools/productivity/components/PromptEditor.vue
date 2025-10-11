<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑提示词' : '新建提示词'"
    width="800px"
    :close-on-click-modal="false"
    :lock-scroll="true"
    :modal-append-to-body="true"
    :append-to-body="true"
    @open="handleOpen"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      label-position="left"
    >
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" placeholder="输入提示词标题" maxlength="100" show-word-limit />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="简要描述提示词的用途"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="分类" prop="category">
        <el-select 
          v-model="form.category" 
          filterable
          allow-create
          placeholder="选择或创建分类" 
          style="width: 100%"
        >
          <el-option-group label="预设分类">
            <el-option label="写作" value="写作" />
            <el-option label="编程" value="编程" />
            <el-option label="翻译" value="翻译" />
            <el-option label="分析" value="分析" />
            <el-option label="创意" value="创意" />
            <el-option label="客户服务" value="客户服务" />
            <el-option label="产品文档" value="产品文档" />
            <el-option label="市场营销" value="市场营销" />
            <el-option label="教育培训" value="教育培训" />
            <el-option label="其他" value="其他" />
          </el-option-group>
          <el-option-group label="我的自定义分类" v-if="customCategories.length > 0">
            <el-option
              v-for="category in customCategories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-option-group>
        </el-select>
        <div class="form-tip">
          可以直接输入新的分类名称，按回车键创建
        </div>
      </el-form-item>

      <el-form-item label="AI模型" prop="aiModel">
        <el-select
          v-model="form.aiModel"
          filterable
          allow-create
          placeholder="选择或输入AI模型"
          style="width: 100%"
        >
          <el-option-group label="常用模型">
            <el-option label="通用" value="general" />
            <el-option label="GPT-4" value="gpt-4" />
            <el-option label="GPT-4 Turbo" value="gpt-4-turbo" />
            <el-option label="GPT-3.5 Turbo" value="gpt-3.5" />
            <el-option label="Claude 3 Opus" value="claude-3-opus" />
            <el-option label="Claude 3 Sonnet" value="claude-3-sonnet" />
            <el-option label="Claude 3 Haiku" value="claude-3-haiku" />
            <el-option label="Gemini Pro" value="gemini-pro" />
            <el-option label="Gemini Ultra" value="gemini-ultra" />
            <el-option label="文心一言" value="wenxin" />
            <el-option label="通义千问" value="tongyi" />
            <el-option label="ChatGLM" value="chatglm" />
            <el-option label="讯飞星火" value="xinghuo" />
          </el-option-group>
          <el-option-group label="我的自定义模型" v-if="customModels.length > 0">
            <el-option
              v-for="model in customModels"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-option-group>
        </el-select>
      </el-form-item>

      <el-form-item label="文件夹">
        <el-select v-model="form.folderId" clearable placeholder="选择文件夹（可选）" style="width: 100%">
          <el-option
            v-for="folder in folders"
            :key="folder.id"
            :label="getFolderDisplayName(folder)"
            :value="folder.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="提示词内容" prop="content">
        <div class="content-editor">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            placeholder="输入提示词内容，使用 {{变量名}} 来定义可替换的变量"
            @input="parseVariables"
          />
          <div class="editor-toolbar">
            <el-button link size="small" @click="insertVariable">插入变量</el-button>
            <el-button link size="small" @click="showVariableHelp">变量语法帮助</el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="检测到的变量" v-if="detectedVariables.length > 0">
        <div class="variables-list">
          <el-tag
            v-for="variable in detectedVariables"
            :key="variable.name"
            class="variable-tag"
            type="info"
          >
            {{ variable.name }}
            <span v-if="variable.type !== 'text'" class="variable-type">
              ({{ variable.type }})
            </span>
          </el-tag>
        </div>
      </el-form-item>

      <el-form-item label="标签">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          collapse-tags
          collapse-tags-tooltip
          placeholder="添加标签（回车创建新标签）"
          style="width: 100%"
        >
          <el-option-group label="常用标签" v-if="commonTags.length > 0">
            <el-option
              v-for="tag in commonTags"
              :key="`common-${tag}`"
              :label="tag"
              :value="tag"
            />
          </el-option-group>
          <el-option-group label="最近使用" v-if="recentTags.length > 0">
            <el-option
              v-for="tag in recentTags"
              :key="`recent-${tag}`"
              :label="tag"
              :value="tag"
            />
          </el-option-group>
        </el-select>
      </el-form-item>

      <el-form-item label="可见性" prop="visibility">
        <el-radio-group v-model="form.visibility">
          <el-radio label="private">私有（仅自己可见）</el-radio>
          <el-radio label="unlisted">不公开（知道链接的人可见）</el-radio>
          <el-radio label="public">公开（所有人可见）</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="允许复制">
        <el-switch v-model="form.allowFork" />
        <span class="form-tip">允许其他用户复制这个提示词</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>

    <!-- 变量语法帮助对话框 -->
    <el-dialog
      v-model="helpVisible"
      title="变量语法帮助"
      width="600px"
      :append-to-body="true"
      :lock-scroll="false"
      :close-on-click-modal="false"
    >
      <div class="help-content" v-pre>
        <h4>基本语法</h4>
        <p>使用双花括号定义变量：<code>{{变量名}}</code></p>

        <h4>变量类型</h4>
        <ul>
          <li><code>{{name}}</code> - 普通文本（默认）</li>
          <li><code>{{content:textarea}}</code> - 多行文本</li>
          <li><code>{{count:number}}</code> - 数字</li>
          <li><code>{{date:date}}</code> - 日期</li>
          <li><code>{{lang:中文|英文|日文}}</code> - 下拉选择</li>
        </ul>

        <h4>默认值</h4>
        <p><code>{{name:default=张三}}</code> - 设置默认值</p>

        <h4>示例</h4>
        <pre class="example-code">请帮我将以下{{type:文章|邮件|报告}}翻译成{{lang:英文|中文|日文}}:

{{content:textarea}}

要求:
- 保持原文的{{style:正式|口语|学术}}风格
- 字数控制在{{wordCount:number:default=500}}字左右</pre>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, inject, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';

const promptService = inject('promptService');

const props = defineProps({
  visible: Boolean,
  prompt: Object,
  folders: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:visible', 'saved']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const isEdit = computed(() => !!props.prompt);
const formRef = ref(null);
const saving = ref(false);
const helpVisible = ref(false);
const detectedVariables = ref([]);

const form = reactive({
  title: '',
  description: '',
  category: '',
  aiModel: 'general',
  folderId: null,
  content: '',
  tags: [],
  visibility: 'private',
  allowFork: true
});

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度应在2-100字符之间', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入提示词内容', trigger: 'blur' },
    { min: 10, message: '内容至少需要10个字符', trigger: 'blur' }
  ],
  visibility: [
    { required: true, message: '请选择可见性', trigger: 'change' }
  ]
};

const commonTags = ref([
  '效率工具', '写作助手', '代码生成', '翻译',
  '数据分析', '创意灵感', 'SEO', '营销',
  '学习', '研究', '商业', '娱乐'
]);

// 自定义AI模型列表（从服务器获取）
const customModels = ref([]);
// 自定义分类列表（从服务器获取）
const customCategories = ref([]);
// 最近使用的标签（从服务器获取）
const recentTags = ref([]);

// 从服务器加载自定义选项
async function loadCustomOptions() {
  try {
    const response = await request({
      url: '/tools/prompt-vault/options',
      method: 'get'
    });

    if (response.code === 200) {
      customCategories.value = response.data.categories || [];
      customModels.value = response.data.models || [];
      recentTags.value = response.data.tags || [];
    }
  } catch (error) {
    console.error('PromptEditor: 加载自定义选项失败:', error);
  }
}

// 在对话框打开时加载自定义选项
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadCustomOptions();
  }
});

// 组件挂载时预加载自定义选项
onMounted(() => {
  loadCustomOptions();
});

// 计算属性：当前选中的文件夹对象
const selectedFolder = computed(() => {
  if (!form.folderId) return null;
  return props.folders.find(f => f.id === form.folderId) || null;
});

// 计算属性：当前选中文件夹的显示名称
const selectedFolderDisplayName = computed(() => {
  if (!selectedFolder.value) return '未分类';
  return getFolderDisplayName(selectedFolder.value);
});

// 监听prompt变化，初始化表单
watch(() => props.prompt, (newPrompt) => {
  if (newPrompt) {
    // 处理 folderId：可能是字符串 ID、ObjectId 或文件夹对象
    let folderId = null;
    if (newPrompt.folderId) {
      if (typeof newPrompt.folderId === 'object' && newPrompt.folderId.id) {
        // 如果是文件夹对象，提取其 id
        folderId = newPrompt.folderId.id;
      } else if (typeof newPrompt.folderId === 'string') {
        // 如果是字符串，直接使用
        folderId = newPrompt.folderId;
      }
    }

    Object.assign(form, {
      title: newPrompt.title,
      description: newPrompt.description || '',
      category: newPrompt.category,
      aiModel: newPrompt.aiModel || 'general',
      folderId: folderId,
      content: newPrompt.content,
      tags: newPrompt.tags || [],
      visibility: newPrompt.visibility || 'private',
      allowFork: newPrompt.allowFork !== false
    });
    parseVariables();
  } else {
    resetForm();
  }
}, { immediate: true });

function parseVariables() {
  detectedVariables.value = promptService.parseVariables(form.content);
}

function insertVariable() {
  const variable = '{{变量名}}';
  const textarea = document.querySelector('textarea');
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.content;
    form.content = text.substring(0, start) + variable + text.substring(end);

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + 3); // 选中"变量名"
    }, 0);
  }
}

function showVariableHelp() {
  helpVisible.value = true;
}

async function handleSave() {
  try {
    const valid = await formRef.value.validate();
    if (!valid) return;

    saving.value = true;

    const data = {
      ...form,
      variables: detectedVariables.value
    };

    // 保存标签到最近使用列表
    if (form.tags && form.tags.length > 0) {
      saveRecentTags(form.tags);
    }

    let result;
    if (isEdit.value) {
      result = await promptService.updatePrompt(props.prompt.id, data);
      ElMessage.success('更新成功');
    } else {
      result = await promptService.createPrompt(data);
      ElMessage.success('创建成功');
    }

    // 发出 saved 事件，带上更新后的数据（包含 folderId）
    emit('saved', {
      ...data,
      ...(result?.data || {}),
      id: props.prompt?.id || result?.data?.id
    });
    handleClose();
  } catch (error) {
    ElMessage.error(isEdit.value ? '更新失败: ' + error.message : '创建失败: ' + error.message);
  } finally {
    saving.value = false;
  }
}

// 保存最近使用的标签
function saveRecentTags(tags) {
  try {
    const stored = localStorage.getItem('prompt_recent_tags');
    let recentTags = stored ? JSON.parse(stored) : [];
    
    // 添加新标签，去重
    tags.forEach(tag => {
      if (!recentTags.includes(tag)) {
        recentTags.unshift(tag); // 添加到最前面
      }
    });
    
    // 只保留最近50个
    recentTags = recentTags.slice(0, 50);
    
    localStorage.setItem('prompt_recent_tags', JSON.stringify(recentTags));
  } catch (error) {
    console.error('保存最近标签失败:', error);
  }
}

function handleOpen() {
  // 当对话框打开时，使用更强大的滚动锁定
  document.documentElement.classList.add('dialog-open');
  document.body.classList.add('dialog-open');
}

function handleClose() {
  // 当对话框关闭时，恢复滚动
  document.documentElement.classList.remove('dialog-open');
  document.body.classList.remove('dialog-open');

  dialogVisible.value = false;
  resetForm();
}

// 获取文件夹显示名称（包含层级路径）
function getFolderDisplayName(folder) {
  if (!folder) return '未分类';
  
  // 如果传入的是ID而不是对象，尝试查找对应的文件夹对象
  if (typeof folder === 'string' || typeof folder === 'number') {
    const foundFolder = props.folders.find(f => f.id === folder || f._id === folder);
    if (foundFolder) {
      folder = foundFolder;
    } else {
      return '未知文件夹';
    }
  }
  
  // 如果有 pathName 属性（后端提供的完整路径名），直接使用
  if (folder.pathName) {
    return folder.pathName;
  }
  
  // 递归构建层级路径（使用名称而不是ID）
  if (folder.parentId) {
    const parent = props.folders.find(f => f.id === folder.parentId || f._id === folder.parentId);
    if (parent) {
      const parentPath = getFolderDisplayName(parent);
      return `${parentPath} / ${folder.name}`;
    }
  }
  
  // 否则直接返回名称
  return folder.name || '未命名文件夹';
}

function resetForm() {
  Object.assign(form, {
    title: '',
    description: '',
    category: '',
    aiModel: 'general',
    folderId: null,
    content: '',
    tags: [],
    visibility: 'private',
    allowFork: true
  });
  detectedVariables.value = [];
  formRef.value?.clearValidate();
}
</script>

<style scoped lang="scss">
.content-editor {
  width: 100%;

  .editor-toolbar {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
}

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .variable-tag {
    .variable-type {
      margin-left: 4px;
      font-size: 12px;
      opacity: 0.7;
    }
  }
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.help-content {
  h4 {
    margin: 16px 0 8px;
    font-size: 16px;
    color: #303133;

    &:first-child {
      margin-top: 0;
    }
  }

  p {
    margin: 8px 0;
    line-height: 1.6;
  }

  ul {
    margin: 8px 0;
    padding-left: 24px;

    li {
      margin: 4px 0;
      line-height: 1.6;
    }
  }

  code {
    padding: 2px 6px;
    background: #f5f7fa;
    border: 1px solid #ebeef5;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    color: #e96900;
  }

  .example-code {
    padding: 12px;
    background: #f5f7fa;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
  }
}
</style>
