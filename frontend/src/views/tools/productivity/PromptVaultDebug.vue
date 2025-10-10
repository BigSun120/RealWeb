<template>
  <div class="prompt-vault">
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-text">
        <h1 class="title">AI 提示词管理 (调试模式)</h1>
        <p class="description">集中管理你的 AI 提示词模板，支持变量替换、分类组织和使用统计</p>
        <div class="stats-line">
          <span>共 {{ stats.total }} 个提示词</span>
          <span>加载状态: {{ loading ? '加载中...' : '已完成' }}</span>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" @click="loadData">刷新数据</el-button>
        <el-button @click="testAPI">测试API</el-button>
      </div>
    </section>

    <!-- 调试信息 -->
    <el-card class="debug-card" shadow="never">
      <h3>调试信息</h3>
      <div class="debug-info">
        <p><strong>API调用次数:</strong> {{ apiCallCount }}</p>
        <p><strong>最后响应:</strong></p>
        <pre>{{ JSON.stringify(lastResponse, null, 2) }}</pre>
        <p><strong>最后错误:</strong> {{ lastError || '无' }}</p>
      </div>
    </el-card>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <el-card>
        <h3>提示词列表 ({{ prompts.length }} 条)</h3>

        <div v-loading="loading" class="prompt-list">
          <el-empty v-if="!loading && prompts.length === 0" description="暂无提示词数据" />

          <el-card
            v-for="(prompt, index) in prompts"
            :key="prompt.id || index"
            class="prompt-card"
            shadow="hover"
          >
            <h4>{{ prompt.title || '无标题' }}</h4>
            <p>{{ prompt.description || '无描述' }}</p>
            <el-tag size="small">{{ prompt.category }}</el-tag>
          </el-card>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import promptService from '@/services/promptService';

// 数据
const loading = ref(false);
const prompts = ref([]);
const apiCallCount = ref(0);
const lastResponse = ref(null);
const lastError = ref('');

// 统计数据
const stats = reactive({
  total: 0,
  folders: 0,
  totalUsage: 0
});

// 生命周期
onMounted(() => {
  console.log('🚀 组件已挂载，开始加载数据...');
  loadData();
});

// 方法
async function loadData() {
  console.log('📥 loadData 被调用');
  await loadPrompts();
}

async function loadPrompts() {
  try {
    loading.value = true;
    apiCallCount.value++;
    lastError.value = '';

    const params = {
      page: 1,
      limit: 12,
      search: '',
      category: '',
      aiModel: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };

    console.log('📡 发送API请求，参数:', params);
    console.log('📍 请求URL: /api/tools/prompt-vault/prompts');

    const response = await promptService.getPrompts(params);

    console.log('✅ 收到响应:', response);
    lastResponse.value = response;

    if (response && response.prompts) {
      prompts.value = response.prompts;
      stats.total = response.pagination?.total || 0;
      console.log('✨ 成功加载', prompts.value.length, '条提示词');
    } else {
      console.warn('⚠️ 响应格式异常:', response);
      prompts.value = [];
    }

    if (prompts.value.length === 0) {
      ElMessage.info('暂无提示词数据（数据库可能为空）');
    } else {
      ElMessage.success(`成功加载 ${prompts.value.length} 条提示词`);
    }
  } catch (error) {
    console.error('❌ API调用失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      response: error.response
    });

    lastError.value = error.message;
    lastResponse.value = { error: error.message };

    ElMessage.error('加载失败: ' + error.message);
  } finally {
    loading.value = false;
    console.log('🏁 加载完成');
  }
}

async function testAPI() {
  console.log('🧪 测试API连接...');
  try {
    const result = await fetch('/api/health');
    const data = await result.json();
    console.log('✅ 健康检查响应:', data);
    ElMessage.success('API连接正常');
  } catch (error) {
    console.error('❌ API连接失败:', error);
    ElMessage.error('API连接失败');
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

.debug-card {
  margin-bottom: 24px;

  h3 {
    margin: 0 0 16px;
    color: #1a202c;
  }

  .debug-info {
    p {
      margin: 8px 0;
      color: #2d3748;
    }

    pre {
      background: #f7fafc;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
    }
  }
}

.main-content {
  h3 {
    margin: 0 0 16px;
    color: #1a202c;
  }
}

.prompt-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.prompt-card {
  h4 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: #1a202c;
  }

  p {
    margin: 0 0 8px;
    color: #2d3748;
    font-size: 14px;
  }
}
</style>
