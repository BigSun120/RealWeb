<template>
  <div class="prompt-comments">
    <!-- 评论统计 -->
    <div class="comments-header">
      <h3 class="title">
        <i class="el-icon-chat-dot-round"></i>
        评论 <span class="count">({{ totalComments }})</span>
      </h3>
    </div>

    <!-- 评论输入框 -->
    <div class="comment-editor" v-if="!readonly">
      <el-input
        v-model="newComment"
        type="textarea"
        :rows="3"
        placeholder="发表你的评论..."
        maxlength="1000"
        show-word-limit
        @keydown="handleKeydown"
      />
      <div class="editor-actions">
        <el-button type="primary" @click="submitComment" :loading="submitting">
          发布评论
        </el-button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-loading="loading" class="comments-list">
      <el-empty v-if="!loading && comments.length === 0" description="暂无评论，快来发表第一条评论吧！" />

      <div v-for="comment in comments" :key="comment._id" class="comment-item root-comment">
        <CommentNode
          :comment="comment"
          :current-user-id="currentUserId"
          :readonly="readonly"
          @reply="handleReply"
          @edit="handleEdit"
          @delete="handleDelete"
          @like="handleLike"
        />
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="pagination.total > pagination.limit">
      <el-pagination
        v-model:current-page="pagination.page"
        :page-size="pagination.limit"
        :total="pagination.total"
        layout="prev, pager, next"
        @current-change="loadComments"
      />
    </div>

    <!-- 编辑评论对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑评论"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="editingComment.content"
        type="textarea"
        :rows="4"
        placeholder="编辑你的评论..."
        maxlength="1000"
        show-word-limit
      />
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit" :loading="submitting">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 回复对话框 -->
    <el-dialog
      v-model="replyDialogVisible"
      :title="`回复 @${replyingTo?.userId?.username}`"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="replyContent"
        type="textarea"
        :rows="4"
        placeholder="输入回复内容..."
        maxlength="1000"
        show-word-limit
      />
      <template #footer>
        <el-button @click="replyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply" :loading="submitting">
          发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import CommentNode from './CommentNode.vue';

export default {
  name: 'PromptComments',
  components: {
    CommentNode
  },
  props: {
    promptId: {
      type: String,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const promptService = inject('promptService');
    const userStore = inject('userStore', null);
    
    const loading = ref(false);
    const submitting = ref(false);
    const comments = ref([]);
    const newComment = ref('');
    const totalComments = ref(0);

    const pagination = reactive({
      page: 1,
      limit: 10,
      total: 0
    });

    // 编辑相关
    const editDialogVisible = ref(false);
    const editingComment = reactive({
      id: null,
      content: ''
    });

    // 回复相关
    const replyDialogVisible = ref(false);
    const replyingTo = ref(null);
    const replyContent = ref('');

    // 当前用户ID
    const currentUserId = computed(() => {
      return userStore?.user?._id || null;
    });

    // 加载评论
    const loadComments = async () => {
      loading.value = true;
      try {
        const response = await promptService.getComments(props.promptId, {
          page: pagination.page,
          limit: pagination.limit
        });

        if (response.code === 200) {
          comments.value = response.data.comments;
          pagination.total = response.data.pagination.total;
          totalComments.value = response.data.pagination.total;
        }
      } catch (error) {
        console.error('加载评论失败:', error);
        ElMessage.error('加载评论失败');
      } finally {
        loading.value = false;
      }
    };

    // 处理键盘事件
    const handleKeydown = (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        submitComment();
      }
    };

    // 发布评论
    const submitComment = async () => {
      if (!newComment.value.trim()) {
        ElMessage.warning('请输入评论内容');
        return;
      }

      submitting.value = true;
      try {
        const response = await promptService.createComment(props.promptId, {
          content: newComment.value.trim()
        });

        if (response.code === 201) {
          ElMessage.success('评论成功');
          newComment.value = '';
          await loadComments();
        }
      } catch (error) {
        console.error('发布评论失败:', error);
        ElMessage.error(error.message || '发布评论失败');
      } finally {
        submitting.value = false;
      }
    };

    // 处理回复
    const handleReply = (comment) => {
      replyingTo.value = comment;
      replyContent.value = '';
      replyDialogVisible.value = true;
    };

    // 提交回复
    const submitReply = async () => {
      if (!replyContent.value.trim()) {
        ElMessage.warning('请输入回复内容');
        return;
      }

      submitting.value = true;
      try {
        const response = await promptService.createComment(props.promptId, {
          content: replyContent.value.trim(),
          parentId: replyingTo.value._id,
          replyToUserId: replyingTo.value.userId._id || replyingTo.value.userId
        });

        if (response.code === 201) {
          ElMessage.success('回复成功');
          replyDialogVisible.value = false;
          replyContent.value = '';
          await loadComments();
        }
      } catch (error) {
        console.error('回复失败:', error);
        ElMessage.error(error.message || '回复失败');
      } finally {
        submitting.value = false;
      }
    };

    // 处理编辑
    const handleEdit = (comment) => {
      editingComment.id = comment._id;
      editingComment.content = comment.content;
      editDialogVisible.value = true;
    };

    // 提交编辑
    const submitEdit = async () => {
      if (!editingComment.content.trim()) {
        ElMessage.warning('请输入评论内容');
        return;
      }

      submitting.value = true;
      try {
        const response = await promptService.updateComment(editingComment.id, {
          content: editingComment.content.trim()
        });

        if (response.code === 200) {
          ElMessage.success('更新成功');
          editDialogVisible.value = false;
          await loadComments();
        }
      } catch (error) {
        console.error('更新评论失败:', error);
        ElMessage.error(error.message || '更新评论失败');
      } finally {
        submitting.value = false;
      }
    };

    // 处理删除
    const handleDelete = async (comment) => {
      try {
        await ElMessageBox.confirm(
          '确定要删除这条评论吗？',
          '删除确认',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        const response = await promptService.deleteComment(comment._id);
        
        if (response.code === 200) {
          ElMessage.success('删除成功');
          await loadComments();
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除评论失败:', error);
          ElMessage.error(error.message || '删除评论失败');
        }
      }
    };

    // 处理点赞
    const handleLike = async (comment) => {
      try {
        const response = await promptService.toggleCommentLike(comment._id);
        
        if (response.code === 200) {
          // 更新本地点赞状态
          const updateLikeStatus = (commentList) => {
            commentList.forEach(c => {
              if (c._id === comment._id) {
                c.isLiked = response.data.liked;
                c.likeCount = response.data.likeCount;
              }
              if (c.replies && c.replies.length > 0) {
                updateLikeStatus(c.replies);
              }
            });
          };
          updateLikeStatus(comments.value);
        }
      } catch (error) {
        console.error('点赞操作失败:', error);
        ElMessage.error(error.message || '操作失败');
      }
    };

    onMounted(() => {
      loadComments();
    });

    return {
      loading,
      submitting,
      comments,
      newComment,
      totalComments,
      pagination,
      editDialogVisible,
      editingComment,
      replyDialogVisible,
      replyingTo,
      replyContent,
      currentUserId,
      handleKeydown,
      loadComments,
      submitComment,
      handleReply,
      submitReply,
      handleEdit,
      submitEdit,
      handleDelete,
      handleLike
    };
  }
};
</script>

<style scoped lang="scss">
.prompt-comments {
  .comments-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #EBEEF5;

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      margin: 0;

      i {
        font-size: 20px;
        color: #409EFF;
      }

      .count {
        color: #909399;
        font-size: 16px;
        font-weight: 400;
      }
    }
  }

  .comment-editor {
    margin-bottom: 24px;
    padding: 16px;
    background: #F5F7FA;
    border-radius: 8px;

    .editor-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }
  }

  .comments-list {
    .comment-item {
      &:not(:last-child) {
        margin-bottom: 16px;
      }
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    margin-top: 24px;
  }
}
</style>
