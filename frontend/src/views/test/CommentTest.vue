<template>
  <div class="comment-test">
    <h2>评论功能测试页面</h2>

    <div class="test-article">
      <h3>测试文章标题</h3>
      <p>这是一篇用于测试评论功能的文章。你可以在下面测试@用户功能和评论审核功能。</p>
    </div>

    <!-- @用户功能测试 -->
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>@用户功能测试</span>
          <el-tag type="success" v-if="mentionTestPassed">测试通过</el-tag>
        </div>
      </template>

      <div class="test-section">
        <h4>1. 用户搜索测试</h4>
        <el-input
          v-model="searchQuery"
          placeholder="输入用户名搜索..."
          @input="handleSearch"
          style="width: 300px; margin-bottom: 16px;"
        />

        <div v-if="searchResults.length > 0" class="search-results">
          <h5>搜索结果：</h5>
          <div v-for="user in searchResults" :key="user._id" class="user-item">
            <el-avatar :size="24" :src="user.avatar">
              {{ user.username.charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="username">{{ user.username }}</span>
            <span v-if="user.bio" class="bio">{{ user.bio }}</span>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h4>2. @用户输入测试</h4>
        <p>在下面的输入框中输入 @ 符号，然后输入用户名进行测试：</p>
        <MentionInput
          v-model="testContent"
          placeholder="试试输入 @用户名..."
          :rows="4"
          @mention="handleMention"
        />

        <div v-if="mentionedUsers.length > 0" class="mentioned-users">
          <h5>已@的用户：</h5>
          <el-tag
            v-for="user in mentionedUsers"
            :key="user._id"
            type="primary"
            style="margin-right: 8px;"
          >
            @{{ user.username }}
          </el-tag>
        </div>
      </div>

      <div class="test-section">
        <h4>3. 评论渲染测试</h4>
        <p>预览@用户的渲染效果：</p>
        <div class="preview-content" v-html="renderedContent"></div>
      </div>
    </el-card>

    <!-- 评论组件 -->
    <CommentList article-id="test-article-id" />
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { debounce } from 'lodash-es';
import CommentList from '@/components/CommentList.vue';
import MentionInput from '@/components/MentionInput.vue';
import { searchUsers } from '@/api/users';
import { renderMentions } from '@/utils/mention';

export default {
  name: 'CommentTest',
  components: {
    CommentList,
    MentionInput
  },
  setup() {
    const searchQuery = ref('');
    const searchResults = ref([]);
    const testContent = ref('');
    const mentionedUsers = ref([]);

    // 计算属性
    const mentionTestPassed = computed(() => {
      return mentionedUsers.value.length > 0 && testContent.value.includes('@');
    });

    const renderedContent = computed(() => {
      if (!testContent.value) return '';
      return renderMentions(testContent.value, mentionedUsers.value);
    });

    // 搜索用户（防抖）
    const handleSearch = debounce(async (query) => {
      if (!query || query.length < 2) {
        searchResults.value = [];
        return;
      }

      try {
        const response = await searchUsers(query, 5);
        if (response.success) {
          searchResults.value = response.data;
        }
      } catch (error) {
        console.error('搜索用户失败:', error);
        searchResults.value = [];
      }
    }, 300);

    // 处理@用户
    const handleMention = (user) => {
      if (!mentionedUsers.value.find(u => u._id === user._id)) {
        mentionedUsers.value.push(user);
      }
    };

    return {
      searchQuery,
      searchResults,
      testContent,
      mentionedUsers,
      mentionTestPassed,
      renderedContent,
      handleSearch,
      handleMention
    };
  }
};
</script>

<style scoped>
.comment-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.test-article {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.test-article h3 {
  margin: 0 0 16px 0;
  color: #303133;
}

.test-article p {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}

.test-card {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-section {
  margin-bottom: 24px;
}

.test-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
}

.test-section h5 {
  margin: 12px 0 8px 0;
  color: #606266;
  font-size: 14px;
}

.search-results {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.user-item:last-child {
  border-bottom: none;
}

.username {
  font-weight: 500;
  color: #303133;
}

.bio {
  font-size: 12px;
  color: #909399;
  flex: 1;
}

.mentioned-users {
  margin-top: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
}

.preview-content {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
  min-height: 60px;
  line-height: 1.6;
}

.preview-content :deep(.mention-user) {
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}
</style>
