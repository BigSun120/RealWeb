<template>
  <div
    class="comment-item"
    :class="{ 'is-reply': isReply, 'comment-highlighted': isHighlighted }"
    :id="`comment-${comment._id}`"
    :data-comment-id="comment._id"
  >
    <div class="comment-avatar">
      <el-avatar
        :size="isReply ? 32 : 40"
        :src="comment.author?.avatar || ''"
        :alt="comment.author?.displayName || comment.author?.username || '用户'"
      >
        {{ (comment.author?.username || 'U').charAt(0).toUpperCase() }}
      </el-avatar>
    </div>

    <div class="comment-content">
      <div class="comment-header">
        <div class="author-info">
          <span class="author-name">{{
            comment.author.displayName || comment.author.username
          }}</span>
          <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
          <el-tag v-if="comment.isTop" size="small" type="warning">置顶</el-tag>
          <span v-if="comment.editedAt" class="edited-mark">(已编辑)</span>
        </div>

        <div class="comment-actions" v-if="showActions">
          <el-button
            type="text"
            size="small"
            @click="handleReply"
            v-if="canReply"
            class="action-btn reply-btn"
          >
            回复
          </el-button>
          <el-button
            type="text"
            size="small"
            @click="handleEdit"
            v-if="canEdit"
            class="action-btn edit-btn"
          >
            编辑
          </el-button>
          <el-button
            type="text"
            size="small"
            @click="handleDelete"
            v-if="canDelete"
            class="action-btn delete-btn"
          >
            删除
          </el-button>
        </div>
      </div>

      <div class="comment-body">
        <div v-if="!isEditing" class="comment-text" v-html="renderedContent"></div>
        <CommentEditor
          v-else
          :article-id="articleId"
          :edit-comment="comment"
          :rows="3"
          :show-tips="false"
          @submit="handleEditSubmit"
          @cancel="cancelEdit"
        />
      </div>

      <div class="comment-footer">
        <div class="comment-stats">
          <el-button
            v-if="settingsStore?.blogConfig?.enableLikes !== false"
            type="text"
            size="small"
            :class="{ 'is-liked': comment.isLiked }"
            @click="handleLike"
            :loading="liking"
          >
            👍
            <span v-if="comment.likeCount > 0">{{ comment.likeCount }}</span>
          </el-button>

          <el-button type="text" size="small" @click="toggleReplies" v-if="comment.replyCount > 0">
            💬 {{ comment.replyCount }} 条回复
          </el-button>
        </div>

        <div class="quick-actions">
          <el-button type="text" size="small" @click="handleReply" v-if="canReply && !isReply">
            回复
          </el-button>

          <!-- 收藏按钮 -->
          <BookmarkButton
            v-if="!isReply"
            target-type="comment"
            :target-id="comment._id"
            :initial-bookmarked="comment.isBookmarked || false"
            :initial-bookmark-count="comment.bookmarkCount || 0"
            size="small"
            :show-text="false"
            :show-count="false"
            @bookmark-changed="handleBookmarkChange"
          />
        </div>
      </div>

      <!-- 回复编辑器 -->
      <div v-if="showReplyEditor" class="reply-editor">
        <CommentEditor
          :article-id="articleId"
          :reply-to="comment"
          :rows="3"
          :show-tips="false"
          @submit="handleReplySubmit"
          @cancel-reply="cancelReply"
        />
      </div>

      <!-- 回复列表 -->
      <div v-if="showReplies && replies.length > 0" class="replies-list">
        <CommentItem
          v-for="reply in replies"
          :key="reply._id"
          :comment="reply"
          :article-id="articleId"
          :is-reply="true"
          :max-level="maxLevel"
          :highlight-comment-id="highlightCommentId"
          @like="handleReplyLike"
          @reply="$emit('reply', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />

        <!-- 加载更多回复 -->
        <div v-if="hasMoreReplies" class="load-more-replies">
          <el-button type="text" size="small" @click="loadMoreReplies" :loading="loadingReplies">
            查看更多回复
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { useSettingsStore } from '@/stores/settings';
import CommentEditor from './CommentEditor.vue';
import BookmarkButton from './social/BookmarkButton.vue';
import commentApi from '@/api/comments';
import { renderMentions } from '@/utils/mention';

export default {
  name: 'CommentItem',
  components: {
    CommentEditor,
    BookmarkButton
  },
  props: {
    comment: {
      type: Object,
      required: true
    },
    articleId: {
      type: String,
      required: true
    },
    isReply: {
      type: Boolean,
      default: false
    },
    maxLevel: {
      type: Number,
      default: 3
    },
    highlightCommentId: {
      type: String,
      default: null
    }
  },
  emits: ['like', 'reply', 'edit', 'delete'],
  setup(props, { emit }) {
    const userStore = useUserStore();
    const settingsStore = useSettingsStore();

    const isEditing = ref(false);
    const showReplyEditor = ref(false);
    const showReplies = ref(false);
    const replies = ref([]);
    const liking = ref(false);
    const loadingReplies = ref(false);
    const hasMoreReplies = ref(false);
    const repliesPage = ref(1);

    // 计算属性
    const showActions = computed(() => userStore.isLoggedIn);
    const canReply = computed(
      () =>
        userStore.isLoggedIn &&
        props.comment.level < props.maxLevel &&
        (userStore.isAdmin ||
          (userStore.user?.permissions && userStore.user.permissions.includes('comment:create')))
    );
    const canEdit = computed(
      () =>
        userStore.isLoggedIn &&
        userStore.user?._id === props.comment.authorId &&
        canEditComment(props.comment)
    );
    const canDelete = computed(
      () =>
        userStore.isLoggedIn &&
        (userStore.user?._id === props.comment.authorId || userStore.isAdmin)
    );

    // 是否高亮显示
    const isHighlighted = computed(() => props.highlightCommentId === props.comment._id);

    // 渲染评论内容
    const renderedContent = computed(() => {
      if (!props.comment.content) return '';
      try {
        // 转义HTML字符，但保持换行
        let content = props.comment.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>'); // 换行转换为<br>

        // 渲染@用户
        const html = renderMentions(content, props.comment.mentionedUsers || []);
        return html;
      } catch (error) {
        return props.comment.content.replace(/\n/g, '<br>');
      }
    });

    // 检查评论是否可以编辑（30分钟内）
    const canEditComment = comment => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      return new Date(comment.createdAt) > thirtyMinutesAgo;
    };

    // 格式化时间
    const formatTime = time => {
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) {
        // 1分钟内
        return '刚刚';
      } else if (diff < 3600000) {
        // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`;
      } else if (diff < 86400000) {
        // 1天内
        return `${Math.floor(diff / 3600000)}小时前`;
      } else if (diff < 2592000000) {
        // 30天内
        return `${Math.floor(diff / 86400000)}天前`;
      } else {
        return date.toLocaleDateString();
      }
    };

    // 处理点赞
    const handleLike = async () => {
      if (!userStore.isLoggedIn) {
        ElMessage.warning('请先登录');
        return;
      }

      liking.value = true;
      try {
        const result = await commentApi.toggleCommentLike(props.comment._id);
        emit('like', {
          commentId: props.comment._id,
          action: result.data.data.action,
          likeCount: result.data.data.likeCount,
          isLiked: result.data.data.isLiked
        });
      } catch (error) {
        console.error('点赞失败:', error);
      } finally {
        liking.value = false;
      }
    };

    // 处理回复
    const handleReply = () => {
      showReplyEditor.value = true;
    };

    // 取消回复
    const cancelReply = () => {
      showReplyEditor.value = false;
    };

    // 处理回复提交
    const handleReplySubmit = async data => {
      try {
        // 发送回复请求
        const response = await commentApi.createComment(data.data);
        const newReply = response.data.data;

        // 检查用户是否已登录，设置点赞状态
        if (userStore.isLoggedIn) {
          newReply.isLiked = false; // 新回复默认未点赞
        }

        // 调试信息
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[CommentItem] 新回复提交 - 父评论ID: ${props.comment._id}, 新回复ID: ${newReply._id}`
          );
          console.log(
            `[CommentItem] 当前回复列表状态 - 展开: ${showReplies.value}, 数量: ${replies.value.length}`
          );
        }

        // 立即更新本地回复列表
        if (showReplies.value && replies.value.length > 0) {
          // 如果回复列表已展开且有内容，检查是否已存在该回复，避免重复
          const existingReply = replies.value.find(r => r._id === newReply._id);
          if (!existingReply) {
            replies.value.unshift(newReply);
          }
        } else {
          // 如果回复列表未展开或为空，需要先加载现有回复
          if (!showReplies.value || replies.value.length === 0) {
            // 先加载现有回复（不自动显示）
            await loadReplies(false);
          }

          // 检查新回复是否已存在，避免重复添加
          const existingReply = replies.value.find(r => r._id === newReply._id);
          if (!existingReply) {
            // 将新回复添加到列表顶部
            replies.value.unshift(newReply);

            // 设置新回复的默认状态（新回复默认未收藏）
            newReply.isBookmarked = false;
            newReply.bookmarkCount = 0;
          }

          // 展开回复列表
          showReplies.value = true;
        }

        // 更新回复数量（只有在成功添加回复后才更新）
        props.comment.replyCount += 1;

        // 关闭回复编辑器
        showReplyEditor.value = false;

        // 向上传递事件（用于更新父组件状态）
        emit('reply', data);

        // 滚动到新回复位置（延迟执行确保DOM更新完成）
        nextTick(() => {
          setTimeout(() => {
            const newReplyElement = document.querySelector(`[data-comment-id="${newReply._id}"]`);
            if (newReplyElement) {
              newReplyElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
              });
            }
          }, 200); // 增加延迟时间确保DOM完全更新
        });

        ElMessage.success('回复成功');
      } catch (error) {
        console.error('回复失败:', error);
        ElMessage.error(error.response?.data?.message || '回复失败');
      }
    };

    // 处理编辑
    const handleEdit = () => {
      isEditing.value = true;
    };

    // 取消编辑
    const cancelEdit = () => {
      isEditing.value = false;
    };

    // 处理编辑提交
    const handleEditSubmit = data => {
      emit('edit', data);
      isEditing.value = false;
    };

    // 处理删除
    const handleDelete = async () => {
      try {
        await ElMessageBox.confirm('确定要删除这条评论吗？删除后无法恢复。', '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'comment-delete-confirm'
        });

        emit('delete', { commentId: props.comment._id });
      } catch (error) {
        // 用户取消删除
      }
    };

    // 切换回复显示
    const toggleReplies = () => {
      showReplies.value = !showReplies.value;
      if (showReplies.value && replies.value.length === 0) {
        loadReplies(false); // 不自动显示，因为已经设置了showReplies
      }
    };

    // 加载回复
    const loadReplies = async (autoShow = false) => {
      loadingReplies.value = true;
      try {
        const response = await commentApi.getCommentReplies(props.comment._id, {
          page: 1,
          limit: 5,
          sortBy: 'createdAt',
          sortOrder: -1 // 倒序，最新回复在前
        });
        // 确保回复数据的唯一性
        const uniqueReplies = response.data.data.filter(
          (newReply, index, arr) => arr.findIndex(r => r._id === newReply._id) === index
        );

        // 调试信息
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[CommentItem] 加载回复 - 评论ID: ${props.comment._id}, 回复数量: ${uniqueReplies.length}`
          );
        }

        replies.value = uniqueReplies;
        hasMoreReplies.value = response.data.pagination.pages > 1;
        repliesPage.value = 1;

        // 如果指定了autoShow，则自动显示回复列表
        if (autoShow) {
          showReplies.value = true;
        }
      } catch (error) {
        console.error('加载回复失败:', error);
      } finally {
        loadingReplies.value = false;
      }
    };

    // 加载更多回复
    const loadMoreReplies = async () => {
      loadingReplies.value = true;
      try {
        const response = await commentApi.getCommentReplies(props.comment._id, {
          page: repliesPage.value + 1,
          limit: 5
        });

        // 过滤掉已存在的回复，避免重复
        const newReplies = response.data.data.filter(
          newReply => !replies.value.some(existingReply => existingReply._id === newReply._id)
        );

        replies.value.push(...newReplies);
        repliesPage.value += 1;
        hasMoreReplies.value = repliesPage.value < response.data.pagination.pages;
      } catch (error) {
        console.error('加载更多回复失败:', error);
      } finally {
        loadingReplies.value = false;
      }
    };

    // 处理回复的点赞
    const handleReplyLike = data => {
      // 更新回复列表中的点赞状态
      const reply = replies.value.find(r => r._id === data.commentId);
      if (reply) {
        reply.likeCount = data.likeCount;
        reply.isLiked = data.isLiked;
      }
      // 向上传递事件
      emit('like', data);
    };



    // 处理收藏状态变化
    const handleBookmarkChange = (data) => {
      console.log('评论收藏状态变化:', data);
      // 这里可以添加一些UI反馈
    };

    return {
      settingsStore,
      isEditing,
      showReplyEditor,
      showReplies,
      replies,
      liking,
      loadingReplies,
      hasMoreReplies,
      showActions,
      canReply,
      canEdit,
      canDelete,
      isHighlighted,
      renderedContent,
      formatTime,
      handleLike,
      handleReply,
      cancelReply,
      handleReplySubmit,
      handleEdit,
      cancelEdit,
      handleEditSubmit,
      handleDelete,
      toggleReplies,
      loadMoreReplies,
      handleReplyLike,
      handleBookmarkChange
    };
  }
};
</script>

<style scoped>
.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #eef2f7;
}

.comment-item.is-reply {
  padding: 12px 0;
  margin-left: 20px;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.comment-item:hover .comment-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 8px !important;
  font-size: 12px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.reply-btn:hover {
  background-color: #e1f5fe;
  color: #0277bd;
}

.edit-btn:hover {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.delete-btn:hover {
  background-color: #ffebee;
  color: #d32f2f;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-weight: 600;
  color: #1f2937;
}

.comment-time {
  font-size: 12px;
  color: #6b7280;
}

.edited-mark {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.comment-body {
  margin-bottom: 12px;
}

.comment-text {
  line-height: 1.7;
  color: #374151;
  word-break: break-word;
}

.comment-text :deep(p) {
  margin: 0 0 8px 0;
}

.comment-text :deep(p:last-child) {
  margin-bottom: 0;
}

.comment-text :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.comment-text :deep(.mention-user) {
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-text :deep(.mention-user:hover) {
  background: #dbeafe;
  color: #1d4ed8;
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-stats {
  display: flex;
  gap: 16px;
}

.comment-stats .el-button.is-liked {
  color: #f56c6c;
}

.reply-editor {
  margin-top: 12px;
}

.replies-list {
  margin-top: 12px;
  border-left: 2px solid #eef2f7;
  padding-left: 16px;
}

.load-more-replies {
  padding: 8px 0;
  text-align: center;
}

/* 高亮评论样式 */
.comment-highlighted {
  background: linear-gradient(90deg, #fffaf0 0%, #ffffff 100%);
  border-left: 4px solid #f59e0b;
  border-radius: 10px;
  padding: 16px;
  margin: 8px 0;
  animation: highlight-fade 3s ease-out;
}

@keyframes highlight-fade {
  0% {
    background: linear-gradient(90deg, #fff7ed 0%, #ffffff 50%);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
  }
  100% {
    background: linear-gradient(90deg, #fffaf0 0%, #ffffff 100%);
    box-shadow: none;
  }
}
</style>
