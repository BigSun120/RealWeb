<template>
  <div class="json-formatter">
    <!-- 工具头部 -->
    <div class="tool-header">
      <div class="tool-info">
        <h1 class="tool-title">
          <el-icon><Document /></el-icon>
          JSON格式化工具
        </h1>
        <p class="tool-description">
          格式化、压缩和验证JSON数据，支持语法高亮和错误检测
        </p>
      </div>
      <div class="tool-actions">
        <el-button @click="clearInput">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
        <el-button type="primary" @click="copyOutput">
          <el-icon><CopyDocument /></el-icon>
          复制结果
        </el-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <el-row :gutter="20">
      <!-- 输入区域 -->
      <el-col :span="12">
        <el-card class="input-section">
          <template #header>
            <div class="section-header">
              <el-icon><EditPen /></el-icon>
              <span>输入JSON</span>
              <div class="header-actions">
                <el-button size="small" @click="formatJson">格式化</el-button>
                <el-button size="small" @click="compressJson">压缩</el-button>
              </div>
            </div>
          </template>
          
          <el-input
            v-model="inputJson"
            type="textarea"
            :rows="20"
            placeholder="请输入JSON数据..."
            @input="validateJson"
          />
          
          <!-- 错误提示 -->
          <div v-if="error" class="error-message">
            <el-icon><WarningFilled /></el-icon>
            {{ error }}
          </div>
        </el-card>
      </el-col>

      <!-- 输出区域 -->
      <el-col :span="12">
        <el-card class="output-section">
          <template #header>
            <div class="section-header">
              <el-icon><Document /></el-icon>
              <span>格式化结果</span>
              <div class="status-indicator" :class="{ valid: isValid, invalid: !isValid && inputJson }">
                {{ isValid ? '✓ 有效JSON' : (inputJson ? '✗ 无效JSON' : '') }}
              </div>
            </div>
          </template>
          
          <el-input
            v-model="outputJson"
            type="textarea"
            :rows="20"
            readonly
            placeholder="格式化后的JSON将显示在这里..."
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 统计信息 -->
    <el-card class="stats-section" v-if="stats.size > 0">
      <template #header>
        <div class="section-header">
          <el-icon><DataAnalysis /></el-icon>
          <span>JSON统计</span>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ stats.size }}</div>
            <div class="stat-label">字符数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ stats.lines }}</div>
            <div class="stat-label">行数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ stats.objects }}</div>
            <div class="stat-label">对象数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ stats.arrays }}</div>
            <div class="stat-label">数组数</div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Document,
  Delete,
  CopyDocument,
  EditPen,
  DataAnalysis,
  WarningFilled
} from '@element-plus/icons-vue';
import { useToolAnalytics } from '@/composables/useToolAnalytics';

export default {
  name: 'JsonFormatter',
  components: {
    Document,
    Delete,
    CopyDocument,
    EditPen,
    DataAnalysis,
    WarningFilled
  },
  setup() {
    // 使用工具统计
    const { recordUsage } = useToolAnalytics('json-formatter');
    
    const inputJson = ref('');
    const outputJson = ref('');
    const error = ref('');
    const isValid = ref(false);
    
    const stats = reactive({
      size: 0,
      lines: 0,
      objects: 0,
      arrays: 0
    });

    // 验证JSON
    const validateJson = () => {
      if (!inputJson.value.trim()) {
        error.value = '';
        isValid.value = false;
        outputJson.value = '';
        resetStats();
        return;
      }

      try {
        const parsed = JSON.parse(inputJson.value);
        error.value = '';
        isValid.value = true;
        updateStats(parsed);
      } catch (e) {
        error.value = `JSON语法错误: ${e.message}`;
        isValid.value = false;
        resetStats();
      }
    };

    // 格式化JSON
    const formatJson = () => {
      if (!inputJson.value.trim()) {
        ElMessage.warning('请输入JSON数据');
        return;
      }

      try {
        const parsed = JSON.parse(inputJson.value);
        outputJson.value = JSON.stringify(parsed, null, 2);
        ElMessage.success('JSON格式化成功');
        
        // 记录格式化操作
        recordUsage('use', {
          action: 'format_json',
          inputSize: inputJson.value.length,
          outputSize: outputJson.value.length
        });
      } catch (e) {
        ElMessage.error(`格式化失败: ${e.message}`);
      }
    };

    // 压缩JSON
    const compressJson = () => {
      if (!inputJson.value.trim()) {
        ElMessage.warning('请输入JSON数据');
        return;
      }

      try {
        const parsed = JSON.parse(inputJson.value);
        outputJson.value = JSON.stringify(parsed);
        ElMessage.success('JSON压缩成功');
        
        // 记录压缩操作
        recordUsage('use', {
          action: 'compress_json',
          inputSize: inputJson.value.length,
          outputSize: outputJson.value.length
        });
      } catch (e) {
        ElMessage.error(`压缩失败: ${e.message}`);
      }
    };

    // 清空输入
    const clearInput = () => {
      inputJson.value = '';
      outputJson.value = '';
      error.value = '';
      isValid.value = false;
      resetStats();
      ElMessage.success('已清空');
    };

    // 复制输出
    const copyOutput = async () => {
      if (!outputJson.value) {
        ElMessage.warning('没有可复制的内容');
        return;
      }

      try {
        await navigator.clipboard.writeText(outputJson.value);
        ElMessage.success('已复制到剪贴板');
        
        // 记录复制操作
        recordUsage('use', {
          action: 'copy_result',
          dataSize: outputJson.value.length
        });
      } catch (error) {
        ElMessage.error('复制失败');
      }
    };

    // 更新统计信息
    const updateStats = (data) => {
      stats.size = JSON.stringify(data).length;
      stats.lines = JSON.stringify(data, null, 2).split('\n').length;
      stats.objects = countObjects(data);
      stats.arrays = countArrays(data);
    };

    // 重置统计信息
    const resetStats = () => {
      stats.size = 0;
      stats.lines = 0;
      stats.objects = 0;
      stats.arrays = 0;
    };

    // 计算对象数量
    const countObjects = (obj) => {
      let count = 0;
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        count = 1;
        for (const key in obj) {
          count += countObjects(obj[key]);
        }
      } else if (Array.isArray(obj)) {
        for (const item of obj) {
          count += countObjects(item);
        }
      }
      return count;
    };

    // 计算数组数量
    const countArrays = (obj) => {
      let count = 0;
      if (Array.isArray(obj)) {
        count = 1;
        for (const item of obj) {
          count += countArrays(item);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          count += countArrays(obj[key]);
        }
      }
      return count;
    };

    return {
      inputJson,
      outputJson,
      error,
      isValid,
      stats,
      validateJson,
      formatJson,
      compressJson,
      clearInput,
      copyOutput
    };
  }
};
</script>

<style scoped>
.json-formatter {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.tool-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-description {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-actions {
  margin-left: auto;
}

.status-indicator {
  margin-left: auto;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.valid {
  color: #67c23a;
}

.status-indicator.invalid {
  color: #f56c6c;
}

.error-message {
  margin-top: 10px;
  padding: 10px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  color: #f56c6c;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-section {
  margin-top: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}
</style>
