<template>
  <div class="comment-editor" :data-editor-id="editorId">
    <div class="editor-header" v-if="replyTo">
      <span class="reply-info">
        回复 <strong>@{{ replyTo.author.username }}</strong>:
        <span class="reply-content">{{ replyTo.content.substring(0, 50) }}...</span>
      </span>
      <el-button
        type="text"
        size="small"
        @click="cancelReply"
        class="cancel-reply"
      >
        取消回复
      </el-button>
    </div>

    <div class="editor-body">
      <!-- 编辑输入框 -->
      <div class="editor-input">
        <MentionInput
          v-model="content"
          :placeholder="placeholder"
          :rows="rows"
          :maxlength="500"
          :show-word-limit="true"
          @mention="handleMention"
          @keydown.ctrl.enter="handleSubmit"
          @keydown.meta.enter="handleSubmit"
          @input="saveDraft"
        />
      </div>

      <div class="editor-toolbar">
        <div class="toolbar-left">
          <el-dropdown
            trigger="click"
            @command="handleEmojiSelect"
            placement="top-start"
          >
            <el-button type="text" size="small" @click.prevent.stop>
              😊 表情
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="😊">😊 微笑</el-dropdown-item>
                <el-dropdown-item command="👍">👍 赞</el-dropdown-item>
                <el-dropdown-item command="❤️">❤️ 爱心</el-dropdown-item>
                <el-dropdown-item command="😂">😂 大笑</el-dropdown-item>
                <el-dropdown-item command="🤔">🤔 思考</el-dropdown-item>
                <el-dropdown-item command="😭">😭 哭泣</el-dropdown-item>
                <el-dropdown-item command="😡">😡 生气</el-dropdown-item>
                <el-dropdown-item command="🎉">🎉 庆祝</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>


        </div>

        <div class="toolbar-right">
          <span v-if="draftSaved" class="draft-status">草稿已保存</span>
          <el-button
            v-if="isEditing"
            @click="handleCancel"
            size="small"
          >
            取消
          </el-button>
          <el-button
            type="primary"
            @click="handleSubmit"
            :loading="submitting"
            size="small"
            :disabled="!content.trim()"
          >
            {{ isEditing ? '保存' : (replyTo ? '回复' : '发表评论') }}
          </el-button>
        </div>
      </div>
    </div>

    <div class="editor-tips" v-if="showTips">
      <el-text size="small" type="info">
        输入@可以提及其他用户，Ctrl+Enter快速发布
      </el-text>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import MentionInput from './MentionInput.vue';
import { parseMentions } from '@/utils/mention';
import { searchUsers } from '@/api/users';

export default {
  name: 'CommentEditor',
  props: {
    // 文章ID
    articleId: {
      type: String,
      required: true
    },
    // 回复的评论对象
    replyTo: {
      type: Object,
      default: null
    },
    // 编辑的评论对象
    editComment: {
      type: Object,
      default: null
    },
    // 占位符文本
    placeholder: {
      type: String,
      default: '写下你的评论...'
    },
    // 文本框行数
    rows: {
      type: Number,
      default: 4
    },
    // 是否显示提示
    showTips: {
      type: Boolean,
      default: true
    }
  },
  emits: ['submit', 'cancel', 'cancel-reply'],
  setup(props, { emit }) {
    const content = ref('');
    const submitting = ref(false);
    const draftSaved = ref(false);
    const draftTimer = ref(null);
    const mentionedUsers = ref([]);
    const editorId = ref(`editor-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

    // 是否为编辑模式
    const isEditing = computed(() => !!props.editComment);

    // 草稿键名
    const draftKey = computed(() => {
      if (isEditing.value) {
        return `comment_edit_${props.editComment._id}`;
      } else if (props.replyTo) {
        return `comment_reply_${props.replyTo._id}`;
      } else {
        return `comment_new_${props.articleId}`;
      }
    });

    // 监听编辑评论变化
    watch(() => props.editComment, (newVal) => {
      if (newVal) {
        content.value = newVal.content;
      } else {
        content.value = '';
      }
    }, { immediate: true });

    // 监听回复评论变化
    watch(() => props.replyTo, (newVal) => {
      if (newVal && !isEditing.value) {
        content.value = '';
        // 聚焦到输入框
        nextTick(() => {
          const textarea = document.querySelector('.comment-editor textarea');
          if (textarea) {
            textarea.focus();
          }
        });
      }
    });

    // 加载草稿
    const loadDraft = () => {
      if (!isEditing.value) {
        const draft = localStorage.getItem(draftKey.value);
        if (draft) {
          content.value = draft;
        }
      }
    };

    // 保存草稿
    const saveDraft = () => {
      if (draftTimer.value) {
        clearTimeout(draftTimer.value);
      }

      draftTimer.value = setTimeout(() => {
        if (content.value.trim() && !isEditing.value) {
          localStorage.setItem(draftKey.value, content.value);
          draftSaved.value = true;
          setTimeout(() => {
            draftSaved.value = false;
          }, 2000);
        }
      }, 1000);
    };

    // 清除草稿
    const clearDraft = () => {
      localStorage.removeItem(draftKey.value);
      draftSaved.value = false;
    };

    // 处理表情选择
    const handleEmojiSelect = (emoji) => {
      insertEmoji(emoji);
    };

    // 获取当前编辑器的textarea元素
    const getTextarea = () => {
      // 首先尝试使用编辑器ID定位
      const editorElement = document.querySelector(`[data-editor-id="${editorId.value}"]`);
      if (editorElement) {
        const textarea = editorElement.querySelector('textarea');
        if (textarea) return textarea;
      }

      // 备用选择器
      const selectors = [
        '.comment-editor .mention-input textarea',
        '.comment-editor textarea',
        '.mention-input textarea'
      ];

      for (const selector of selectors) {
        const textarea = document.querySelector(selector);
        if (textarea) return textarea;
      }

      return null;
    };

    // 插入表情
    const insertEmoji = (emoji) => {
      const textarea = getTextarea();
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = content.value;
        content.value = text.substring(0, start) + emoji + text.substring(end);

        // 设置光标位置
        nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
          textarea.focus();
        });
      } else {
        content.value += emoji;
      }
      saveDraft();
    };



    // 提交评论
    const handleSubmit = async () => {
      if (!content.value.trim()) {
        ElMessage.warning('评论内容不能为空');
        return;
      }

      if (content.value.length > 500) {
        ElMessage.warning('评论内容不能超过500字符');
        return;
      }

      submitting.value = true;

      try {
        // 解析文本中的@用户
        const parsedMentions = parseMentions(content.value);
        console.log('解析出的@用户:', parsedMentions);

        // 合并通过组件选择的用户和文本中解析的用户
        const allMentionedUserIds = new Set();

        // 添加通过组件选择的用户
        console.log('组件选择的用户:', mentionedUsers.value);
        mentionedUsers.value.forEach(user => {
          if (user && user._id) {
            allMentionedUserIds.add(user._id);
          }
        });

        // 如果有解析出的@用户，需要查询用户ID
        if (parsedMentions.length > 0) {
          try {
            const response = await searchUsers(parsedMentions.join(' '), 50);
            console.log('查询@用户响应:', response);
            if (response.data?.success) {
              response.data.data.forEach(user => {
                if (parsedMentions.includes(user.username)) {
                  allMentionedUserIds.add(user._id);
                  console.log('添加@用户:', user.username, user._id);
                }
              });
            }
          } catch (error) {
            console.error('查询@用户失败:', error);
          }
        }

        const finalMentionedUsers = Array.from(allMentionedUserIds);
        console.log('最终@用户列表:', finalMentionedUsers);

        const data = {
          content: content.value.trim(),
          mentionedUsers: finalMentionedUsers
        };

        // 清空内容的回调函数
        const clearContent = () => {
          content.value = '';
          mentionedUsers.value = [];
          clearDraft();

          // 直接清空DOM元素
          nextTick(() => {
            const textarea = getTextarea();
            if (textarea) {
              textarea.value = '';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        };

        if (isEditing.value) {
          // 编辑评论
          emit('submit', {
            type: 'edit',
            commentId: props.editComment._id,
            data,
            onSuccess: () => {
              // 编辑成功后不清空内容，由父组件处理
            },
            onError: (error) => {
              console.error('编辑评论失败:', error);
            }
          });
        } else {
          // 新建评论或回复
          data.articleId = props.articleId;
          if (props.replyTo) {
            data.parentId = props.replyTo._id;
          }

          emit('submit', {
            type: 'create',
            data,
            onSuccess: clearContent,
            onError: (error) => {
              console.error('发表评论失败:', error);
            }
          });
        }
      } catch (error) {
        console.error('提交评论失败:', error);
      } finally {
        submitting.value = false;
      }
    };

    // 取消操作
    const handleCancel = () => {
      content.value = isEditing.value ? props.editComment.content : '';
      emit('cancel');
    };

    // 取消回复
    const cancelReply = () => {
      content.value = '';
      mentionedUsers.value = [];
      clearDraft();
      emit('cancel-reply');
    };

    // 处理@用户
    const handleMention = (user) => {
      if (!mentionedUsers.value.find(u => u._id === user._id)) {
        mentionedUsers.value.push(user);
      }
    };

    // 组件挂载时加载草稿
    onMounted(() => {
      loadDraft();
    });

    // 组件卸载时清理定时器
    onUnmounted(() => {
      if (draftTimer.value) {
        clearTimeout(draftTimer.value);
      }
    });

    return {
      content,
      submitting,
      draftSaved,
      isEditing,
      mentionedUsers,
      editorId,
      saveDraft,
      handleEmojiSelect,
      insertEmoji,
      handleSubmit,
      handleCancel,
      cancelReply,
      handleMention
    };
  },
  components: {
    MentionInput
  }
};
</script>

<style scoped>
.comment-editor {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.reply-info {
  font-size: 14px;
  color: #606266;
}

.reply-content {
  color: #909399;
  font-style: italic;
}

.cancel-reply {
  color: #f56c6c;
}

.editor-body {
  padding: 16px;
}

.editor-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.editor-tabs .el-button.active {
  color: #409eff;
  font-weight: 500;
}

.editor-preview {
  min-height: 80px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
  margin-bottom: 12px;
}

.preview-content {
  line-height: 1.6;
  color: #606266;
}

.preview-content :deep(p) {
  margin: 0 0 8px 0;
}

.preview-content :deep(p:last-child) {
  margin-bottom: 0;
}

.preview-content :deep(strong) {
  font-weight: 600;
}

.preview-content :deep(em) {
  font-style: italic;
}

.preview-content :deep(code) {
  background: #f1f3f4;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.toolbar-left {
  display: flex;
  gap: 4px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.draft-status {
  font-size: 12px;
  color: #67c23a;
  margin-right: 8px;
}

.editor-tips {
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
}

:deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  resize: vertical;
  min-height: 80px;
}

:deep(.el-textarea__inner):focus {
  border: none;
  box-shadow: none;
}
</style>
