<template>
  <div class="ai-connections-container">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Connection /></el-icon>
            我的AI连接
          </span>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            添加连接
          </el-button>
        </div>
      </template>
      
      <el-alert
        v-if="!connections.length"
        title="还没有配置AI连接"
        type="info"
        description="您可以添加自己的AI API密钥，或使用平台提供的免费服务。配置后即可使用AI生成功能。"
        :closable="false"
        show-icon
      />

      <!-- 使用统计 - 只显示AI平台返回的Token参数 -->
      <div v-if="stats && stats.totalTokens > 0" class="stats-section">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-statistic title="总Token数" :value="stats.totalTokens" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="输入Token" :value="stats.promptTokens || 0" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="输出Token" :value="stats.completionTokens || 0" />
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 连接列表 -->
    <el-row :gutter="20" class="connections-list">
      <el-col
        v-for="connection in connections"
        :key="connection._id"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
      >
        <el-card class="connection-card" :class="{ 'is-default': connection.isDefault }">
          <template #header>
            <div class="connection-header">
              <span class="provider-name">{{ connection.name }}</span>
              <el-tag v-if="connection.isDefault" type="success" size="small">默认</el-tag>
              <el-tag v-if="!connection.isActive" type="info" size="small">已禁用</el-tag>
            </div>
          </template>

          <div class="connection-info">
            <div class="info-item">
              <span class="label">提供商:</span>
              <el-tag>{{ providerLabels[connection.provider] || connection.provider }}</el-tag>
            </div>
            
            <div class="info-item api-key-item">
              <span class="label">API密钥:</span>
              <div class="api-key-display">
                <code v-if="showApiKey[connection._id]">{{ connection.apiKey || '****' }}</code>
                <code v-else>{{ '****' }}</code>
                <el-button 
                  text 
                  size="small" 
                  @click="toggleApiKeyVisibility(connection._id)"
                  class="toggle-btn"
                >
                  <el-icon v-if="showApiKey[connection._id]"><Hide /></el-icon>
                  <el-icon v-else><View /></el-icon>
                </el-button>
                <el-button 
                  v-if="showApiKey[connection._id] && connection.apiKey"
                  text 
                  size="small" 
                  @click="copyApiKey(connection.apiKey)"
                  class="copy-btn"
                >
                  复制
                </el-button>
              </div>
            </div>

            <div class="info-item">
              <span class="label">默认模型:</span>
              <span>{{ connection.defaultModel }}</span>
            </div>

            <div class="info-item">
              <span class="label">验证状态:</span>
              <el-tag 
                :type="connection.validation?.isVerified ? 'success' : 'warning'"
                size="small"
              >
                {{ connection.validation?.isVerified ? '已验证' : '未验证' }}
              </el-tag>
            </div>

            <!-- 使用统计 - 只显示AI平台返回的参数 -->
            <div class="usage-stats" v-if="connection.usage?.totalTokens > 0">
              <el-divider />
              <div class="stat-item">
                <span>总 Token:</span>
                <span>{{ connection.usage.totalTokens }}</span>
              </div>
              <div class="stat-item">
                <span>输入 Token:</span>
                <span>{{ connection.usage.promptTokens || 0 }}</span>
              </div>
              <div class="stat-item">
                <span>输出 Token:</span>
                <span>{{ connection.usage.completionTokens || 0 }}</span>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="connection-actions">
              <el-button size="small" @click="validateConnection(connection._id)" :loading="validating[connection._id]">
                <el-icon><CircleCheck /></el-icon>
                验证
              </el-button>
              <el-button size="small" @click="editConnection(connection)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="deleteConnection(connection._id)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑AI连接' : '添加AI连接'"
      width="600px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="form.name" placeholder="例如: 我的OpenAI" />
        </el-form-item>

        <el-form-item label="提供商" prop="provider">
          <el-select v-model="form.provider" placeholder="请选择" @change="handleProviderChange">
            <el-option label="OpenAI" value="openai" />
            <el-option label="DeepSeek" value="deepseek" />
            <el-option label="Anthropic (Claude)" value="anthropic" />
            <el-option label="Google (Gemini)" value="google" />
            <el-option label="Perplexity" value="perplexity" />
            <el-option label="其他/自定义" value="custom" />
          </el-select>
        </el-form-item>

        <el-form-item label="基础URL" prop="baseURL">
          <el-input v-model="form.baseURL" placeholder="https://api.openai.com" />
        </el-form-item>

        <el-form-item :label="form.provider === 'perplexity' ? 'Session Token' : 'API密钥'" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            :placeholder="isEditing ? '保持不变则不填' : (form.provider === 'perplexity' ? '__Secure-next-auth.session-token' : 'sk-...')"
          />
          <div v-if="form.provider === 'perplexity'" style="color: #e6a23c; font-size: 12px; margin-top: 5px;">
            <el-icon><InfoFilled /></el-icon>
            请填写你的 Perplexity Pro 账号的 Session Token，可在浏览器 Cookie 中查看 __Secure-next-auth.session-token
          </div>
          <div v-else-if="isEditing" style="color: #909399; font-size: 12px; margin-top: 5px;">
            <el-icon><InfoFilled /></el-icon>
            留空则不修改API密钥，填写则更新为新密钥
          </div>
        </el-form-item>

        <el-form-item label="默认模型" prop="defaultModel">
          <el-input v-model="form.defaultModel" placeholder="gpt-3.5-turbo" />
        </el-form-item>

        <el-form-item label="温度" prop="temperature">
          <el-slider v-model="form.requestParams.temperature" :min="0" :max="2" :step="0.1" show-input />
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            <el-icon><InfoFilled /></el-icon>
            控制输出的随机性：0.0-0.3(保守/准确) | 0.4-0.9(平衡/推荐) | 1.0-2.0(创意/多样)
          </div>
        </el-form-item>

        <el-form-item label="最大Tokens" prop="maxTokens">
          <el-input-number v-model="form.requestParams.maxTokens" :min="1" :max="128000" />
        </el-form-item>

        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>

        <el-form-item label="私有连接" v-if="form.provider === 'perplexity'">
          <el-switch v-model="form.isPrivate" />
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            <el-icon><InfoFilled /></el-icon>
            开启后，只有你可以使用这个 Perplexity 连接
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEditing ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Connection, Plus, Edit, Delete, CircleCheck, InfoFilled, View, Hide } from '@element-plus/icons-vue';
import request from '@/utils/request';

// 数据
const connections = ref([]);
const stats = ref(null);
const dialogVisible = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const validating = reactive({});
const formRef = ref(null);
const showApiKey = reactive({}); // 记录每个连接的API密钥显示状态

const providerLabels = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  anthropic: 'Anthropic',
  google: 'Google',
  perplexity: 'Perplexity',
  custom: '自定义',
  other: '其他'
};

const providerDefaults = {
  openai: {
    baseURL: 'https://api.openai.com',
    defaultModel: 'gpt-3.5-turbo'
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat'
  },
  anthropic: {
    baseURL: 'https://api.anthropic.com',
    defaultModel: 'claude-3-sonnet-20240229'
  },
  google: {
    baseURL: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-pro'
  },
  perplexity: {
    baseURL: 'https://www.perplexity.ai',
    defaultModel: 'pplx_alpha'
  },
  custom: {
    baseURL: '',
    defaultModel: ''
  }
};

const form = reactive({
  name: '',
  provider: 'openai',
  baseURL: '',
  apiKey: '',
  defaultModel: '',
  requestParams: {
    temperature: 0.8,
    maxTokens: 4000
  },
  isDefault: false,
  isPrivate: false
});

// 响应式验证规则 - 根据isEditing动态调整
const rules = computed(() => ({
  name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择提供商', trigger: 'change' }],
  baseURL: [{ required: true, message: '请输入基础URL', trigger: 'blur' }],
  apiKey: [
    { 
      required: !isEditing.value, // 创建时必填，编辑时可选
      message: '请输入API密钥', 
      trigger: 'blur' 
    }
  ],
  defaultModel: [{ required: true, message: '请输入默认模型', trigger: 'blur' }]
}));

// 方法
const loadConnections = async () => {
  try {
    const response = await request.get('/ai/connections');
    connections.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    ElMessage.error('获取连接列表失败');
    connections.value = [];
  }
};

const loadStats = async () => {
  try {
    const response = await request.get('/ai/stats/user');
    stats.value = response.data;
  } catch (error) {
    // 静默失败，不影响主功能
  }
};

const handleProviderChange = (provider) => {
  const defaults = providerDefaults[provider];
  if (defaults) {
    form.baseURL = defaults.baseURL;
    form.defaultModel = defaults.defaultModel;
  }
};

const showCreateDialog = () => {
  isEditing.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 对话框关闭时的处理
const handleDialogClose = () => {
  resetForm();
};

const editConnection = (connection) => {
  isEditing.value = true;
  Object.assign(form, {
    id: connection._id,
    name: connection.name,
    provider: connection.provider,
    baseURL: connection.baseURL,
    apiKey: connection.apiKey || '', // 显示完整的API密钥
    defaultModel: connection.defaultModel,
    requestParams: { ...connection.requestParams },
    isDefault: connection.isDefault,
    isPrivate: connection.isPrivate || false
  });
  dialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    provider: 'openai',
    baseURL: 'https://api.openai.com',
    apiKey: '',
    defaultModel: 'gpt-3.5-turbo',
    requestParams: {
      temperature: 0.8,
      maxTokens: 4000
    },
    isDefault: false,
    isPrivate: false
  });
  formRef.value?.clearValidate();
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (isEditing.value) {
        // 编辑模式
        const updateData = { ...form };
        delete updateData.id;
        // 如果没有修改密钥，不发送空密钥
        if (!updateData.apiKey) {
          delete updateData.apiKey;
        }
        await request.put(`/ai/connections/${form.id}`, updateData);
        ElMessage.success('更新成功');
      } else {
        // 创建模式 - 清理多余字段
        const createData = { ...form };
        delete createData.id; // 删除id字段
        await request.post('/ai/connections', createData);
        ElMessage.success('创建成功');
      }
      
      dialogVisible.value = false;
      // 不在这里调用 resetForm()，由 handleDialogClose 统一处理
      await loadConnections();
      await loadStats();
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

const deleteConnection = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个连接吗？', '提示', {
      type: 'warning'
    });
    
    await request.delete(`/ai/connections/${id}`);
    ElMessage.success('删除成功');
    await loadConnections();
    await loadStats();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const validateConnection = async (id) => {
  validating[id] = true;
  try {
    // Perplexity 验证需要更长时间，设置 60 秒超时
    const response = await request.post(`/ai/connections/${id}/validate`, {}, {
      timeout: 60000
    });
    // response 已经是解析后的数据 { code, message, data }
    // 直接访问 response.data 获取验证结果
    if (response.data.valid) {
      ElMessage.success('验证成功');
    } else {
      ElMessage.error(`验证失败: ${response.data.error || '未知错误'}`);
    }
    await loadConnections();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '验证失败');
  } finally {
    validating[id] = false;
  }
};

// 切换API密钥显示/隐藏
const toggleApiKeyVisibility = (connectionId) => {
  showApiKey[connectionId] = !showApiKey[connectionId];
};

// 复制API密钥
const copyApiKey = async (apiKey) => {
  try {
    await navigator.clipboard.writeText(apiKey);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    // 如果浏览器不支持clipboard API，使用传统方法
    const textArea = document.createElement('textarea');
    textArea.value = apiKey;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      ElMessage.success('已复制到剪贴板');
    } catch (err) {
      ElMessage.error('复制失败');
    }
    document.body.removeChild(textArea);
  }
};

// 生命周期
onMounted(() => {
  loadConnections();
  loadStats();
});
</script>

<style scoped lang="scss">
.ai-connections-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 20px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .stats-section {
    margin-top: 20px;
  }
}

.connections-list {
  margin-top: 20px;
}

.connection-card {
  margin-bottom: 20px;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  &.is-default {
    border: 2px solid #67c23a;
  }

  .connection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;

    .provider-name {
      font-weight: 600;
      flex: 1;
    }
  }

  .connection-info {
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .label {
        color: #909399;
        font-size: 14px;
      }

      code {
        background: #f5f7fa;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #606266;
      }

      &.api-key-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;

        .api-key-display {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;

          code {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .toggle-btn,
          .copy-btn {
            padding: 4px 8px;
            font-size: 12px;

            .el-icon {
              font-size: 14px;
            }
          }
        }
      }
    }

    .usage-stats {
      .stat-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 13px;
        color: #606266;

        span:first-child {
          color: #909399;
        }

        span:last-child {
          font-weight: 500;
        }
      }
    }
  }

  .connection-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
