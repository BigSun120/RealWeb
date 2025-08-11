<template>
  <div class="text-counter">
    <!-- 工具头部 -->
    <div class="tool-header">
      <div class="tool-info">
        <h1 class="tool-title">
          <el-icon><DataAnalysis /></el-icon>
          文本计数器
        </h1>
        <p class="tool-description">
          统计文本的字符数、单词数、行数等详细信息
        </p>
      </div>
      <div class="tool-actions">
        <el-button @click="clearText">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
        <el-button type="primary" @click="copyStats">
          <el-icon><CopyDocument /></el-icon>
          复制统计
        </el-button>
      </div>
    </div>

    <!-- 输入区域 -->
    <el-card class="input-section">
      <template #header>
        <div class="section-header">
          <el-icon><EditPen /></el-icon>
          <span>输入文本</span>
        </div>
      </template>
      
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="12"
        placeholder="请输入或粘贴要统计的文本内容..."
        @input="updateStats"
      />
    </el-card>

    <!-- 统计结果 -->
    <el-card class="stats-section">
      <template #header>
        <div class="section-header">
          <el-icon><DataAnalysis /></el-icon>
          <span>统计结果</span>
        </div>
      </template>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ stats.characters }}</div>
          <div class="stat-label">字符数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.charactersNoSpaces }}</div>
          <div class="stat-label">字符数（不含空格）</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.words }}</div>
          <div class="stat-label">单词数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.lines }}</div>
          <div class="stat-label">行数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.paragraphs }}</div>
          <div class="stat-label">段落数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.sentences }}</div>
          <div class="stat-label">句子数</div>
        </div>
      </div>
    </el-card>

    <!-- 详细分析 -->
    <el-card v-if="inputText" class="analysis-section">
      <template #header>
        <div class="section-header">
          <el-icon><PieChart /></el-icon>
          <span>详细分析</span>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="12">
          <div class="analysis-item">
            <h4>平均值</h4>
            <ul>
              <li>每行字符数：{{ averageCharsPerLine }}</li>
              <li>每段落字符数：{{ averageCharsPerParagraph }}</li>
              <li>每句子单词数：{{ averageWordsPerSentence }}</li>
            </ul>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="analysis-item">
            <h4>阅读信息</h4>
            <ul>
              <li>预计阅读时间：{{ readingTime }}</li>
              <li>最长行：{{ longestLine }} 字符</li>
              <li>最短行：{{ shortestLine }} 字符</li>
            </ul>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue';
import { 
  DataAnalysis, 
  Delete, 
  CopyDocument, 
  EditPen, 
  PieChart 
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'TextCounter',
  components: {
    DataAnalysis,
    Delete,
    CopyDocument,
    EditPen,
    PieChart
  },
  setup() {
    const inputText = ref('');
    
    const stats = reactive({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      sentences: 0
    });

    // 计算统计信息
    const updateStats = () => {
      const text = inputText.value;
      
      // 字符数
      stats.characters = text.length;
      
      // 字符数（不含空格）
      stats.charactersNoSpaces = text.replace(/\s/g, '').length;
      
      // 行数
      stats.lines = text ? text.split('\n').length : 0;
      
      // 段落数（以空行分隔）
      stats.paragraphs = text ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
      
      // 单词数
      stats.words = text.trim() ? text.trim().split(/\s+/).length : 0;
      
      // 句子数（以句号、问号、感叹号结尾）
      stats.sentences = text ? (text.match(/[.!?]+/g) || []).length : 0;
    };

    // 计算属性
    const averageCharsPerLine = computed(() => {
      return stats.lines > 0 ? Math.round(stats.characters / stats.lines) : 0;
    });

    const averageCharsPerParagraph = computed(() => {
      return stats.paragraphs > 0 ? Math.round(stats.characters / stats.paragraphs) : 0;
    });

    const averageWordsPerSentence = computed(() => {
      return stats.sentences > 0 ? Math.round(stats.words / stats.sentences) : 0;
    });

    const readingTime = computed(() => {
      const wordsPerMinute = 200; // 平均阅读速度
      const minutes = Math.ceil(stats.words / wordsPerMinute);
      return minutes > 0 ? `${minutes} 分钟` : '< 1 分钟';
    });

    const longestLine = computed(() => {
      if (!inputText.value) return 0;
      const lines = inputText.value.split('\n');
      return Math.max(...lines.map(line => line.length));
    });

    const shortestLine = computed(() => {
      if (!inputText.value) return 0;
      const lines = inputText.value.split('\n').filter(line => line.trim());
      return lines.length > 0 ? Math.min(...lines.map(line => line.length)) : 0;
    });

    // 方法
    const clearText = () => {
      inputText.value = '';
      updateStats();
      ElMessage.success('文本已清空');
    };

    const copyStats = async () => {
      const statsText = `文本统计结果：
字符数：${stats.characters}
字符数（不含空格）：${stats.charactersNoSpaces}
单词数：${stats.words}
行数：${stats.lines}
段落数：${stats.paragraphs}
句子数：${stats.sentences}
预计阅读时间：${readingTime.value}`;

      try {
        await navigator.clipboard.writeText(statsText);
        ElMessage.success('统计结果已复制到剪贴板');
      } catch (error) {
        ElMessage.error('复制失败，请手动复制');
      }
    };

    return {
      inputText,
      stats,
      averageCharsPerLine,
      averageCharsPerParagraph,
      averageWordsPerSentence,
      readingTime,
      longestLine,
      shortestLine,
      updateStats,
      clearText,
      copyStats
    };
  }
};
</script>

<style scoped>
.text-counter {
  max-width: 1200px;
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

.input-section,
.stats-section,
.analysis-section {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e9ecef;
  transition: all 0.3s ease;
}

.stat-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.analysis-item h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.analysis-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.analysis-item li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
}

.analysis-item li:last-child {
  border-bottom: none;
}
</style>
