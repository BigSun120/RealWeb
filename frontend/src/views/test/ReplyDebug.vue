<template>
  <div class="reply-debug">
    <h2>回复功能调试页面</h2>
    
    <div class="debug-info">
      <h3>调试信息</h3>
      <div class="debug-panel">
        <p><strong>当前时间：</strong>{{ currentTime }}</p>
        <p><strong>用户登录状态：</strong>{{ userStore.isLoggedIn ? '已登录' : '未登录' }}</p>
        <p><strong>用户信息：</strong>{{ userStore.user?.username || '无' }}</p>
      </div>
      
      <div class="debug-actions">
        <el-button @click="refreshDebugInfo" size="small">刷新调试信息</el-button>
        <el-button @click="clearConsole" size="small">清空控制台</el-button>
      </div>
    </div>

    <div class="test-scenarios">
      <h3>测试场景说明</h3>
      <div class="scenario-list">
        <div class="scenario-item">
          <h4>🔍 重复显示问题测试</h4>
          <ol>
            <li>发表一条根评论</li>
            <li>对根评论回复一次（1级回复）</li>
            <li>不展开回复列表，再次回复根评论</li>
            <li>展开回复列表，检查是否有重复内容</li>
          </ol>
        </div>
        
        <div class="scenario-item">
          <h4>🔄 多级回复测试</h4>
          <ol>
            <li>创建根评论</li>
            <li>创建1级回复</li>
            <li>对1级回复进行回复（2级回复）</li>
            <li>验证回复层级和显示顺序</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- 评论组件 -->
    <div class="comment-section">
      <h3>评论区域</h3>
      <CommentList article-id="debug-test-article" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import CommentList from '@/components/CommentList.vue';

export default {
  name: 'ReplyDebug',
  components: {
    CommentList
  },
  setup() {
    const userStore = useUserStore();
    const currentTime = ref('');
    let timer = null;

    // 更新当前时间
    const updateTime = () => {
      currentTime.value = new Date().toLocaleString();
    };

    // 刷新调试信息
    const refreshDebugInfo = () => {
      updateTime();
      console.log('[ReplyDebug] 调试信息已刷新');
      console.log('[ReplyDebug] 用户状态:', {
        isLoggedIn: userStore.isLoggedIn,
        user: userStore.user
      });
    };

    // 清空控制台
    const clearConsole = () => {
      console.clear();
      console.log('[ReplyDebug] 控制台已清空，开始新的调试会话');
    };

    onMounted(() => {
      updateTime();
      timer = setInterval(updateTime, 1000);
      console.log('[ReplyDebug] 调试页面已加载');
    });

    onUnmounted(() => {
      if (timer) {
        clearInterval(timer);
      }
    });

    return {
      userStore,
      currentTime,
      refreshDebugInfo,
      clearConsole
    };
  }
};
</script>

<style scoped>
.reply-debug {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.debug-info {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.debug-panel {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.debug-panel p {
  margin: 4px 0;
}

.debug-actions {
  display: flex;
  gap: 8px;
}

.test-scenarios {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.scenario-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 16px;
}

.scenario-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
}

.scenario-item h4 {
  margin: 0 0 12px 0;
  color: #495057;
}

.scenario-item ol {
  margin: 0;
  padding-left: 20px;
}

.scenario-item li {
  margin: 6px 0;
  line-height: 1.4;
}

.comment-section {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.comment-section h3 {
  margin: 0 0 20px 0;
  color: #495057;
}

@media (max-width: 768px) {
  .scenario-list {
    grid-template-columns: 1fr;
  }
}
</style>
