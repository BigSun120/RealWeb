<template>
  <div class="comment-list">
    <!-- 评论统计 -->
    <div class="comment-header">
      <h3 class="comment-title">
        评论 <span class="comment-count">({{ totalComments }})</span>
      </h3>

      <div class="comment-controls">
        <div class="sort-buttons">
          <el-button-group size="small">
            <el-button
              :type="sortBy === 'createdAt' ? 'primary' : ''"
              @click="handleSortChange('createdAt')"
              :icon="sortBy === 'createdAt' ? Check : undefined"
            >
              最新
            </el-button>
            <el-button
              :type="sortBy === 'likeCount' ? 'primary' : ''"
              @click="handleSortChange('likeCount')"
              :icon="sortBy === 'likeCount' ? Check : undefined"
            >
              最热
            </el-button>
            <el-button
              :type="sortBy === 'createdAt_asc' ? 'primary' : ''"
              @click="handleSortChange('createdAt_asc')"
              :icon="sortBy === 'createdAt_asc' ? Check : undefined"
            >
              最早
            </el-button>
          </el-button-group>
        </div>
      </div>
    </div>

    <!-- 评论编辑器 -->
    <div class="comment-editor-wrapper" v-if="showEditor">
      <CommentEditor
        :article-id="articleId"
        placeholder="写下你的评论..."
        @submit="handleCommentSubmit"
      />
    </div>

    <!-- 登录提示 -->
    <div class="login-prompt" v-else>
      <el-alert
        title="请登录后发表评论"
        type="info"
        show-icon
        :closable="false"
      >
        <template #default>
          <el-button type="primary" size="small" @click="goToLogin">
            立即登录
          </el-button>
        </template>
      </el-alert>
    </div>

    <!-- 评论列表 -->
    <div class="comments-container" v-loading="loading">
      <div v-if="comments.length === 0 && !loading" class="empty-comments">
        <el-empty description="暂无评论，快来发表第一条评论吧！" />
      </div>

      <div v-else class="comments-list">
        <CommentItem
          v-for="comment in comments"
          :key="comment._id"
          :comment="comment"
          :article-id="articleId"
          :highlight-comment-id="highlightCommentId"
          @like="handleCommentLike"
          @reply="handleCommentReply"
          @edit="handleCommentEdit"
          @delete="handleCommentDelete"
        />
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMore && comments.length > 0">
        <el-button
          @click="loadMore"
          :loading="loadingMore"
          type="primary"
          plain
        >
          加载更多评论
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Check } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import CommentEditor from './CommentEditor.vue';
import CommentItem from './CommentItem.vue';
import commentApi from '@/api/comments';

export default {
  name: 'CommentList',
  components: {
    CommentEditor,
    CommentItem
  },
  props: {
    articleId: {
      type: String,
      required: true
    },
    highlightCommentId: {
      type: String,
      default: null
    },
    targetPage: {
      type: Number,
      default: 1
    }
  },
  emits: ['comments-loaded'],
  setup(props, { emit }) {
    const router = useRouter();
    const userStore = useUserStore();



    // 响应式数据
    const comments = ref([]);
    const loading = ref(false);
    const loadingMore = ref(false);
    const sortBy = ref('createdAt');
    const currentPage = ref(1);
    const totalComments = ref(0);
    const hasMore = ref(false);

    // 计算属性
    const showEditor = computed(() =>
      userStore.isLoggedIn &&
      (userStore.isAdmin || (userStore.user?.permissions && userStore.user.permissions.includes('comment:create')))
    );

    // 加载评论列表
    const loadComments = async (reset = false) => {
      if (reset) {
        loading.value = true;
        currentPage.value = 1;
        comments.value = [];
      } else {
        loadingMore.value = true;
      }

      try {
        // 处理排序参数
        let actualSortBy = sortBy.value;
        let sortOrder = -1; // 默认倒序（最新在前）

        if (sortBy.value === 'createdAt_asc') {
          actualSortBy = 'createdAt';
          sortOrder = 1; // 正序（最早在前）
        } else if (sortBy.value === 'likeCount') {
          sortOrder = -1; // 点赞数倒序（最多在前）
        }

        const response = await commentApi.getArticleComments(props.articleId, {
          page: currentPage.value,
          limit: 20,
          sortBy: actualSortBy,
          sortOrder: sortOrder,
          level: 1 // 只获取根评论
        });

        const newComments = response.data.data;

        if (reset) {
          comments.value = newComments;
        } else {
          comments.value.push(...newComments);
        }

        totalComments.value = response.data.pagination.total;
        hasMore.value = currentPage.value < response.data.pagination.pages;

        // 通知父组件评论已加载
        emit('comments-loaded');
      } catch (error) {
        console.error('加载评论失败:', error);
        ElMessage.error('加载评论失败');
      } finally {
        loading.value = false;
        loadingMore.value = false;
      }
    };

    // 加载更多评论
    const loadMore = () => {
      currentPage.value += 1;
      loadComments(false);
    };

    // 处理排序变化
    const handleSortChange = (newSortBy) => {
      if (newSortBy && newSortBy !== sortBy.value) {
        sortBy.value = newSortBy;
        loadComments(true);
      }
    };

    // 处理评论提交
    const handleCommentSubmit = async (data) => {
      try {
        const response = await commentApi.createComment(data.data);

        const newComment = response.data.data;

        // 设置新评论的默认状态
        newComment.isLiked = false;
        newComment.replyCount = 0;

        // 将新评论添加到列表顶部
        comments.value.unshift(newComment);
        totalComments.value += 1;

        ElMessage.success('发表评论成功');

        // 通知编辑器清空内容
        data.onSuccess?.();
      } catch (error) {
        console.error('发表评论失败:', error);

        // 显示具体的错误信息
        const errorMessage = error.response?.data?.message || error.message || '发表评论失败';
        ElMessage.error(errorMessage);

        // 通知编辑器提交失败
        data.onError?.(error);
      }
    };

    // 处理评论点赞
    const handleCommentLike = (data) => {
      const comment = findCommentById(data.commentId);
      if (comment) {
        comment.likeCount = data.likeCount;
        comment.isLiked = data.isLiked;
      }
    };

    // 处理评论回复
    const handleCommentReply = () => {
      // 由于CommentItem组件已经处理了回复逻辑，这里只需要处理一些全局状态
      // 比如更新总评论数等
      totalComments.value += 1;
    };

    // 处理评论编辑
    const handleCommentEdit = async (data) => {
      try {
        const response = await commentApi.updateComment(data.commentId, data.data);
        const updatedComment = response.data.data;

        // 更新评论内容
        const comment = findCommentById(data.commentId);
        if (comment) {
          comment.content = updatedComment.content;
          comment.editedAt = updatedComment.editedAt;
          comment.editCount = updatedComment.editCount;
        }

        ElMessage.success('编辑评论成功');
      } catch (error) {
        console.error('编辑评论失败:', error);
        ElMessage.error(error.response?.data?.message || '编辑评论失败');
      }
    };

    // 处理评论删除
    const handleCommentDelete = async (data) => {
      try {
        await commentApi.deleteComment(data.commentId);

        // 从列表中移除评论
        const index = comments.value.findIndex(c => c._id === data.commentId);
        if (index !== -1) {
          comments.value.splice(index, 1);
          totalComments.value -= 1;
        }

        ElMessage.success('删除评论成功');
      } catch (error) {
        console.error('删除评论失败:', error);
        ElMessage.error(error.response?.data?.message || '删除评论失败');
      }
    };

    // 查找评论
    const findCommentById = (commentId) => {
      return comments.value.find(c => c._id === commentId);
    };



    // 跳转到登录页
    const goToLogin = () => {
      router.push('/auth/login');
    };

    // 监听文章ID变化
    watch(() => props.articleId, () => {
      if (props.articleId) {
        loadComments(true);
      }
    }, { immediate: true });

    // 监听目标页面变化
    watch(() => props.targetPage, (newPage, oldPage) => {
      if (newPage && newPage > 1 && newPage !== oldPage && props.articleId) {
        console.log('需要加载到页面:', newPage, '当前页面:', currentPage.value);
        // 只有当目标页面大于当前页面时才需要加载更多
        if (newPage > currentPage.value) {
          loadCommentsToPage(newPage);
        }
      }
    }, { immediate: true });

    // 加载评论到指定页面
    const loadCommentsToPage = async (targetPage) => {
      if (loading.value || loadingMore.value) {
        console.log('正在加载中，跳过重复请求');
        return;
      }

      try {
        // 如果目标页面就是第1页，直接重新加载
        if (targetPage === 1) {
          loadComments(true);
          return;
        }

        loading.value = true;
        console.log(`开始加载评论到第${targetPage}页`);

        // 重置评论列表
        comments.value = [];
        currentPage.value = 1;

        // 逐页加载到目标页面
        for (let page = 1; page <= targetPage; page++) {
          console.log(`正在加载第${page}页...`);

          const response = await commentApi.getArticleComments(props.articleId, {
            page,
            limit: 10,
            sortBy: sortBy.value,
            sortOrder: -1
          });

          if (response.data.success) {
            comments.value.push(...response.data.data);
            totalComments.value = response.data.pagination.total;
            hasMore.value = page < response.data.pagination.pages;
            currentPage.value = page;

            console.log(`已加载第${page}页，共${response.data.data.length}条评论`);
          } else {
            console.error(`加载第${page}页失败`);
            break;
          }
        }

        console.log(`完成加载，共${comments.value.length}条评论`);

        // 通知父组件评论已加载
        emit('comments-loaded');
      } catch (error) {
        console.error('加载评论到指定页面失败:', error);
        ElMessage.error('加载评论失败');
      } finally {
        loading.value = false;
      }
    };



    // 组件挂载时加载评论
    onMounted(() => {
      if (props.articleId) {
        loadComments(true);
      }
    });

    return {
      comments,
      loading,
      loadingMore,
      sortBy,
      totalComments,
      hasMore,
      showEditor,
      loadMore,
      handleSortChange,
      handleCommentSubmit,
      handleCommentLike,
      handleCommentReply,
      handleCommentEdit,
      handleCommentDelete,
      goToLogin,
      Check
    };
  }
};
</script>

<style scoped>
.comment-list {
  margin-top: 32px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.comment-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.comment-count {
  color: #909399;
  font-weight: normal;
}

.comment-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sort-buttons {
  display: flex;
  align-items: center;
}

.sort-buttons .el-button-group {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.sort-buttons .el-button {
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.sort-buttons .el-button:not(.el-button--primary):hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.comment-editor-wrapper {
  margin-bottom: 24px;
}

.login-prompt {
  margin-bottom: 24px;
}

.comments-container {
  min-height: 200px;
}

.empty-comments {
  padding: 40px 0;
}

.comments-list {
  background: #fff;
  border-radius: 8px;
  padding: 0 24px;
}

.load-more {
  text-align: center;
  padding: 24px 0;
}
</style>
