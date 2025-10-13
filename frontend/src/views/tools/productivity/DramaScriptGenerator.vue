<template>
  <div class="drama-script-generator">
    <el-card class="welcome-card" shadow="hover">
      <div class="welcome-content">
        <div class="icon">🎬</div>
        <h1>AI短剧剧本生成工具</h1>
        <p class="description">
          智能辅助创作短剧剧本，支持向导模式、角色管理、大纲创作、剧本编辑、版本控制、多格式导出
        </p>
        
        <div class="status-notice">
          <el-alert
            title="功能开发中"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>本工具正在开发中，敬请期待！</p>
              <p class="features">
                <strong>即将推出的功能：</strong><br>
                ✨ 7步向导模式，轻松创建剧本<br>
                📝 智能提示词生成器<br>
                👥 角色库管理<br>
                📋 大纲与剧本编辑<br>
                💾 版本控制系统<br>
                📤 多格式导出（Markdown/Word/PDF）
              </p>
            </template>
          </el-alert>
        </div>

        <div class="actions">
          <el-button type="primary" size="large" disabled>
            开始创作
          </el-button>
          <el-button size="large" @click="viewDocs">
            查看文档
          </el-button>
        </div>

        <div class="tech-stack">
          <h3>技术栈</h3>
          <el-tag v-for="tech in techStack" :key="tech" type="info" size="small">
            {{ tech }}
          </el-tag>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

const techStack = ref([
  'Vue 3',
  'Element Plus',
  'Monaco Editor',
  'Pinia',
  'IndexedDB'
]);

const viewDocs = () => {
  ElMessage.info('文档正在整理中...');
  // TODO: 打开文档页面
};
</script>

<style scoped>
.drama-script-generator {
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.welcome-card {
  max-width: 800px;
  width: 100%;
}

.welcome-content {
  text-align: center;
  padding: 40px 20px;
}

.icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

h1 {
  font-size: 32px;
  color: #303133;
  margin-bottom: 16px;
  font-weight: 600;
}

.description {
  font-size: 16px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 30px;
}

.status-notice {
  margin: 30px 0;
}

.features {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.8;
  text-align: left;
}

.actions {
  margin: 40px 0;
  display: flex;
  gap: 16px;
  justify-content: center;
}

.tech-stack {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #EBEEF5;
}

.tech-stack h3 {
  font-size: 16px;
  color: #606266;
  margin-bottom: 16px;
}

.tech-stack .el-tag {
  margin: 4px;
}
</style>
