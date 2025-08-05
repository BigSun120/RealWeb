<template>
  <div class="mention-input-wrapper mention-input">
    <el-input
      ref="inputRef"
      v-model="inputValue"
      type="textarea"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :show-word-limit="showWordLimit"
      resize="vertical"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="hideSuggestions"
    />

    <!-- @用户建议列表 -->
    <div
      v-if="showSuggestions && suggestions.length > 0"
      class="mention-suggestions"
      :style="suggestionsStyle"
    >
      <div
        v-for="(user, index) in suggestions"
        :key="user._id"
        class="suggestion-item"
        :class="{ active: selectedIndex === index }"
        @mousedown.prevent="selectUser(user)"
        @mouseenter="selectedIndex = index"
      >
        <el-avatar
          :size="24"
          :src="user.avatar"
          class="user-avatar"
        >
          {{ user.username.charAt(0).toUpperCase() }}
        </el-avatar>
        <span class="username">{{ user.username }}</span>
        <span v-if="user.bio" class="user-bio">{{ user.bio }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { searchUsers } from '@/api/users';
import { debounce } from 'lodash-es';

export default {
  name: 'MentionInput',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '请输入内容...'
    },
    rows: {
      type: Number,
      default: 4
    },
    maxlength: {
      type: Number,
      default: 500
    },
    showWordLimit: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue', 'mention'],
  setup(props, { emit }) {
    const inputRef = ref(null);
    const inputValue = ref(props.modelValue);
    const showSuggestions = ref(false);
    const suggestions = ref([]);
    const selectedIndex = ref(0);
    const mentionStart = ref(-1);
    const suggestionsStyle = ref({});

    // 监听输入值变化
    const handleInput = (value) => {
      inputValue.value = value;
      emit('update:modelValue', value);

      // 检查是否输入了@符号
      checkMention(value);
    };

    // 检查@提及
    const checkMention = (value) => {
      console.log('检测@用户输入:', value);

      // 简化逻辑：只要包含@就显示用户列表
      if (value.includes('@')) {
        console.log('发现@符号，开始搜索用户');
        const lastAtIndex = value.lastIndexOf('@');
        const textAfterAt = value.substring(lastAtIndex + 1);

        // 如果@后面没有空格，就搜索
        if (!textAfterAt.includes(' ')) {
          mentionStart.value = lastAtIndex;
          console.log('搜索查询:', textAfterAt);

          // 只有输入了字符才搜索，否则不显示
          if (textAfterAt.length > 0) {
            searchUsersDebounced(textAfterAt);
          } else {
            hideSuggestions();
          }
          return;
        }
      }

      // 没有@或@后有空格，隐藏建议
      hideSuggestions();
    };

    // 防抖搜索用户
    const searchUsersDebounced = debounce(async (query) => {
      try {
        console.log('搜索用户:', query);

        // 必须有查询内容才搜索
        if (!query || query.trim().length === 0) {
          hideSuggestions();
          return;
        }

        const response = await searchUsers(query, 8);
        console.log('搜索结果:', response);

        console.log('检查响应:', response.data?.success, response.data?.data);
        if (response.data?.success && response.data?.data && response.data.data.length > 0) {
          suggestions.value = response.data.data;
          selectedIndex.value = 0;
          showSuggestions.value = true;

          console.log('显示建议:', showSuggestions.value, suggestions.value);

          await nextTick();
          updateSuggestionsPosition();
        } else {
          console.log('没有找到匹配的用户');
          hideSuggestions();
        }
      } catch (error) {
        console.error('搜索用户失败:', error);
        suggestions.value = [];
        showSuggestions.value = false;
      }
    }, 300);

    // 更新建议列表位置
    const updateSuggestionsPosition = () => {
      const textarea = inputRef.value?.textarea || inputRef.value?.input;
      console.log('更新位置，textarea:', textarea);
      if (!textarea) {
        console.log('未找到textarea，使用默认位置');
        suggestionsStyle.value = {
          position: 'absolute',
          top: '100%',
          left: '0',
          width: '100%',
          zIndex: 9999
        };
        return;
      }

      const rect = textarea.getBoundingClientRect();
      console.log('textarea位置:', rect);
      suggestionsStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 5}px`,
        left: `${rect.left}px`,
        width: `${Math.min(rect.width, 300)}px`,
        zIndex: 9999
      };
      console.log('设置下拉框样式:', suggestionsStyle.value);
    };

    // 键盘事件处理
    const handleKeydown = (event) => {
      if (!showSuggestions.value || suggestions.value.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          selectedIndex.value = Math.min(selectedIndex.value + 1, suggestions.value.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
          break;
        case 'Enter':
          if (showSuggestions.value) {
            event.preventDefault();
            selectUser(suggestions.value[selectedIndex.value]);
          }
          break;
        case 'Escape':
          hideSuggestions();
          break;
      }
    };

    // 选择用户
    const selectUser = (user) => {
      const textarea = inputRef.value?.textarea || inputRef.value?.input;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const value = inputValue.value;

      // 替换@用户名
      const beforeMention = value.substring(0, mentionStart.value);
      const afterCursor = value.substring(cursorPos);
      const newValue = `${beforeMention}@${user.username} ${afterCursor}`;

      inputValue.value = newValue;
      emit('update:modelValue', newValue);
      emit('mention', user);

      hideSuggestions();

      // 设置光标位置
      nextTick(() => {
        const newCursorPos = mentionStart.value + user.username.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      });
    };

    // 隐藏建议列表
    const hideSuggestions = () => {
      showSuggestions.value = false;
      suggestions.value = [];
      selectedIndex.value = 0;
    };

    // 监听窗口大小变化
    const handleResize = () => {
      if (showSuggestions.value) {
        updateSuggestionsPosition();
      }
    };

    onMounted(() => {
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
    });

    return {
      inputRef,
      inputValue,
      showSuggestions,
      suggestions,
      selectedIndex,
      suggestionsStyle,
      handleInput,
      handleKeydown,
      selectUser,
      hideSuggestions
    };
  }
};
</script>

<style scoped>
.mention-input-wrapper {
  position: relative;
}

.mention-suggestions {
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 9999;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover,
.suggestion-item.active {
  background-color: #f5f7fa;
}

.user-avatar {
  margin-right: 8px;
  flex-shrink: 0;
}

.username {
  font-weight: 500;
  color: #303133;
  margin-right: 8px;
}

.user-bio {
  font-size: 12px;
  color: #909399;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
