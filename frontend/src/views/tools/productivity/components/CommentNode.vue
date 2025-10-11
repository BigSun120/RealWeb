<template>
  <div class="comment-node" :class="{ 'is-reply': isReply }">
    <div class="comment-main">
      <!-- 用户头像 -->
      <div class="comment-avatar">
        <el-avatar :size="isReply ? 32 : 40" :src="comment.userId?.avatar" icon="el-icon-user" />
      </div>

      <!-- 评论内容 -->
      <div class="comment-body">
        <!-- 用户信息和时间 -->
        <div class="comment-header">
          <span class="username">{{ comment.userId?.username || '未知用户' }}</span>
          <span v-if="comment.replyToUserId" class="reply-to">
            回复 @{{ comment.replyToUserId?.username }}
          </span>
          <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
          <el-tag v-if="comment.isEdited" size="small" type="info" class="edited-tag">
            已编辑
          </el-tag>
        </div>

        <!-- 评论正文 -->
        <div class="comment-content">
          {{ comment.content }}
        </div>

        <!-- 操作按钮 -->
        <div class="comment-actions">
          <el-button
            link
            size="small"
            :type="comment.isLiked ? 'primary' : ''"
            @click="$emit('like', comment)"
          >
            <i :class="comment.isLiked ? 'el-icon-thumb' : 'el-icon-thumb'"></i>
            点赞{{ comment.likeCount > 0 ? ` (${comment.likeCount})` : '' }}
          </el-button>

          <el-button
            v-if="!readonly"
            link
            size="small"
            @click="$emit('reply', comment)"
          >
            <i class="el-icon-chat-line-round"></i>
            回复
          </el-button>

          <el-button
            v-if="canEdit"
            link
            size="small"
            @click="$emit('edit', comment)"
          >
            <i class="el-icon-edit"></i>
            编辑
          </el-button>

          <el-button
            v-if="canDelete"
            link
            size="small"
            type="danger"
            @click="$emit('delete', comment)"
          >
            <i class="el-icon-delete"></i>
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 回复列表 -->
    <div v-if="comment.replies && comment.replies.length > 0" class="comment-replies">
      <CommentNode
        v-for="reply in comment.replies"
        :key="reply._id"
        :comment="reply"
        :current-user-id="currentUserId"
        :readonly="readonly"
        :is-reply="true"
        @reply="$emit('reply', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @like="$emit('like', $event)"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'CommentNode',
  props: {
    comment: {
      type: Object,
      required: true
    },
    currentUserId: {
      type: String,
      default: null
    },
    readonly: {
      type: Boolean,
      default: false
    },
    isReply: {
      type: Boolean,
      default: false
    }
  },
  emits: ['reply', 'edit', 'delete', 'like'],
  setup(props) {
    // 是否可以编辑
    const canEdit = computed(() => {
      if (props.readonly) return false;
      if (!props.currentUserId) return false;
      const userId = props.comment.userId?._id || props.comment.userId;
      return userId === props.currentUserId;
    });

    // 是否可以删除（作者可删除）
    const canDelete = computed(() => {
      if (props.readonly) return false;
      if (!props.currentUserId) return false;
      const userId = props.comment.userId?._id || props.comment.userId;
      return userId === props.currentUserId;
    });

    // 格式化时间
    const formatTime = (time) => {
      if (!time) return '';
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;

      // 小于1分钟
      if (diff < 60000) {
        return '刚刚';
      }
      // 小于1小时
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`;
      }
      // 小于1天
      if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`;
      }
      // 小于7天
      if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)}天前`;
      }

      // 超过7天，显示具体日期
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return {
      canEdit,
      canDelete,
      formatTime
    };
  }
};
</script>

<style scoped lang="scss">
.comment-node {
  &:not(:last-child) {
    margin-bottom: 16px;
  }

  .comment-main {
    display: flex;
    gap: 12px;

    .comment-avatar {
      flex-shrink: 0;
    }

    .comment-body {
      flex: 1;
      min-width: 0;

      .comment-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        flex-wrap: wrap;

        .username {
          font-weight: 600;
          color: #303133;
          font-size: 14px;
        }

        .reply-to {
          color: #909399;
          font-size: 13px;
        }

        .comment-time {
          color: #909399;
          font-size: 12px;
        }

        .edited-tag {
          margin-left: 4px;
        }
      }

      .comment-content {
        color: #606266;
        font-size: 14px;
        line-height: 1.6;
        word-wrap: break-word;
        white-space: pre-wrap;
        margin-bottom: 8px;
      }

      .comment-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
    }
  }

  .comment-replies {
    margin-top: 12px;
    margin-left: 52px;
    padding-left: 16px;
    border-left: 2px solid #EBEEF5;
  }

  &.is-reply {
    .comment-replies {
      margin-left: 44px;
    }
  }
}
</style>
