<template>
  <div class="markdown-editor">
    <div class="editor-header">
      <div class="editor-tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'edit' }]"
          @click="activeTab = 'edit'"
        >
          <el-icon><Edit /></el-icon>
          编辑
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'preview' }]"
          @click="activeTab = 'preview'"
        >
          <el-icon><View /></el-icon>
          预览
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'split' }]"
          @click="activeTab = 'split'"
        >
          <el-icon><Grid /></el-icon>
          分屏
        </button>
      </div>
      <div class="editor-tools">
        <el-button size="small" @click="insertMarkdown('**', '**')" title="粗体">
          <strong>B</strong>
        </el-button>
        <el-button size="small" @click="insertMarkdown('*', '*')" title="斜体">
          <em>I</em>
        </el-button>
        <el-button size="small" @click="insertMarkdown('# ', '')" title="标题">
          H
        </el-button>
        <el-button size="small" @click="insertMarkdown('> ', '')" title="引用">
          <el-icon><ChatLineSquare /></el-icon>
        </el-button>
        <el-button size="small" @click="insertMarkdown('`', '`')" title="代码">
          &lt;/&gt;
        </el-button>
        <el-button size="small" @click="insertMarkdown('[', '](url)')" title="链接">
          <el-icon><Link /></el-icon>
        </el-button>
        <el-button size="small" @click="insertMarkdown('![', '](url)')" title="图片链接">
          <el-icon><Picture /></el-icon>
        </el-button>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileSelect"
          accept="image/*"
          style="display: inline-block;"
        >
          <el-button size="small" title="上传图片" :loading="uploading">
            📷
          </el-button>
        </el-upload>
        <el-button size="small" @click="insertMarkdown('- ', '')" title="列表">
          ≡
        </el-button>
        <el-button size="small" @click="insertMarkdown('1. ', '')" title="有序列表">
          1.
        </el-button>
        <el-button size="small" @click="insertMarkdown('```\n', '\n```')" title="代码块">
          { }
        </el-button>
        <el-divider direction="vertical" />
        <el-button size="small" @click="showImageHelper = !showImageHelper" title="图片助手">
          🖼️
        </el-button>
      </div>
    </div>

    <div class="editor-content" :class="`mode-${activeTab}`">
      <!-- 编辑区域 -->
      <div v-show="activeTab === 'edit' || activeTab === 'split'" class="edit-pane">
        <textarea
          ref="textareaRef"
          v-model="content"
          @input="handleInput"
          @scroll="syncScroll"
          @dragover.prevent
          @drop="handleDrop"
          placeholder="请输入Markdown内容...&#10;&#10;💡 提示：&#10;• 可以直接拖拽图片到此处上传&#10;• 使用工具栏快速插入Markdown语法&#10;• 支持实时预览和同步滚动"
          class="markdown-textarea"
        ></textarea>
      </div>

      <!-- 预览区域 -->
      <div v-show="activeTab === 'preview' || activeTab === 'split'" class="preview-pane">
        <div
          ref="previewRef"
          class="markdown-preview"
          v-html="htmlContent"
        ></div>
      </div>
    </div>

    <!-- 图片助手面板 -->
    <div v-if="showImageHelper" class="image-helper">
      <div class="helper-header">
        <h4>图片助手</h4>
        <el-button size="small" text @click="showImageHelper = false">
          ✕
        </el-button>
      </div>
      <div class="helper-content">
        <div class="upload-tips">
          <p><strong>上传方式：</strong></p>
          <ul>
            <li>点击 📷 按钮选择图片</li>
            <li>直接拖拽图片到编辑区</li>
            <li>支持 JPG、PNG、GIF、WebP 格式</li>
            <li>单个文件最大 5MB</li>
          </ul>
        </div>
        <div class="markdown-tips">
          <p><strong>Markdown 图片语法：</strong></p>
          <code>![图片描述](图片链接)</code>
          <p class="tip-note">💡 图片描述会在图片无法显示时作为替代文字</p>
        </div>
      </div>
    </div>

    <div class="editor-footer">
      <div class="editor-stats">
        <span>字符: {{ content.length }}</span>
        <span>行数: {{ lineCount }}</span>
        <span>字数: {{ wordCount }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { ElMessage } from 'element-plus';
import { uploadArticleImage } from '@/api/articles';
import {
  Edit, View, Grid, ChatLineSquare, Link, Picture
} from '@element-plus/icons-vue';

export default {
  name: 'MarkdownEditor',
  components: {
    Edit, View, Grid, ChatLineSquare, Link, Picture
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: '500px'
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const textareaRef = ref();
    const previewRef = ref();
    const uploadRef = ref();
    const activeTab = ref('split');
    const content = ref(props.modelValue);
    const uploading = ref(false);
    const showImageHelper = ref(false);

    // 配置marked
    onMounted(() => {
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              console.error('Highlight error:', err);
            }
          }
          return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
      });
    });

    // 渲染HTML内容
    const htmlContent = computed(() => {
      try {
        return marked(content.value);
      } catch (error) {
        console.error('Markdown parsing error:', error);
        return '<p>Markdown解析错误</p>';
      }
    });

    // 统计信息
    const lineCount = computed(() => {
      return content.value.split('\n').length;
    });

    const wordCount = computed(() => {
      return content.value.replace(/\s+/g, ' ').trim().split(' ').filter(word => word.length > 0).length;
    });

    // 插入Markdown语法
    const insertMarkdown = (before, after = '') => {
      const textarea = textareaRef.value;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.value.substring(start, end);

      const newText = before + selectedText + after;
      content.value = content.value.substring(0, start) + newText + content.value.substring(end);

      nextTick(() => {
        textarea.focus();
        const newPosition = start + before.length + selectedText.length;
        textarea.setSelectionRange(newPosition, newPosition);
      });
    };

    // 处理输入
    const handleInput = () => {
      emit('update:modelValue', content.value);
    };

    // 同步滚动
    const syncScroll = () => {
      if (activeTab.value === 'split' && previewRef.value && textareaRef.value) {
        const textarea = textareaRef.value;
        const preview = previewRef.value;
        const scrollRatio = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1);
        preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight || 1);
      }
    };

    // 图片上传配置已移除，统一使用API函数

    // 上传前验证
    const beforeUpload = (file) => {
      const isImage = file.type.startsWith('image/');
      const isLt5M = file.size / 1024 / 1024 < 5;

      if (!isImage) {
        ElMessage.error('只能上传图片文件!');
        return false;
      }
      if (!isLt5M) {
        ElMessage.error('图片大小不能超过 5MB!');
        return false;
      }

      uploading.value = true;
      return true;
    };

    // 处理文件选择（el-upload组件）
    const handleFileSelect = async (file) => {
      if (!beforeUpload(file.raw)) {
        return;
      }

      try {
        const response = await uploadArticleImage(file.raw);

        if (response.data.code === 200) {
          const imageUrl = response.data.data.url;
          const imageMarkdown = `![图片描述](${imageUrl})`;

          // 插入图片Markdown语法
          const textarea = textareaRef.value;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            content.value = content.value.substring(0, start) + imageMarkdown + content.value.substring(end);

            // 通知父组件内容已更新
            emit('update:modelValue', content.value);

            nextTick(() => {
              textarea.focus();
              const newPosition = start + imageMarkdown.length;
              textarea.setSelectionRange(newPosition, newPosition);
            });
          }

          ElMessage.success('图片上传成功');
        } else {
          ElMessage.error('图片上传失败：' + response.data.message);
        }
      } catch (error) {
        console.error('图片上传失败:', error);
        ElMessage.error('图片上传失败：' + (error.response?.data?.message || error.message));
      } finally {
        uploading.value = false;
      }
    };

    // 处理拖拽上传
    const handleDrop = async (event) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        ElMessage.warning('请拖拽图片文件');
        return;
      }

      // 处理多个图片文件
      for (const file of imageFiles) {
        if (!beforeUpload(file)) {
          continue;
        }

        try {
          const response = await uploadArticleImage(file);

          if (response.data.code === 200) {
            const imageUrl = response.data.data.url;
            const imageMarkdown = `![${file.name}](${imageUrl})\n`;

            // 在当前光标位置插入图片
            const textarea = textareaRef.value;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              content.value = content.value.substring(0, start) + imageMarkdown + content.value.substring(end);

              // 通知父组件内容已更新
              emit('update:modelValue', content.value);

              nextTick(() => {
                textarea.focus();
                const newPosition = start + imageMarkdown.length;
                textarea.setSelectionRange(newPosition, newPosition);
              });
            }
          } else {
            ElMessage.error(`${file.name} 上传失败：${response.data.message}`);
          }
        } catch (error) {
          console.error('拖拽上传失败:', error);
          ElMessage.error(`${file.name} 上传失败：${error.response?.data?.message || error.message}`);
        }
      }

      uploading.value = false;
    };

    // 监听props变化
    watch(() => props.modelValue, (newValue) => {
      content.value = newValue;
    });

    return {
      textareaRef,
      previewRef,
      uploadRef,
      activeTab,
      content,
      uploading,
      showImageHelper,
      htmlContent,
      lineCount,
      wordCount,
      insertMarkdown,
      handleInput,
      syncScroll,
      beforeUpload,
      handleFileSelect,
      handleDrop
    };
  }
};
</script>

<style scoped>
.markdown-editor {
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-bottom: 1px solid #e1e8ed;
}

.editor-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.tab-btn.active {
  background: #667eea;
  color: white;
}

.editor-tools {
  display: flex;
  gap: 4px;
}

.editor-content {
  display: flex;
  height: v-bind(height);
}

.mode-edit .edit-pane {
  width: 100%;
}

.mode-preview .preview-pane {
  width: 100%;
}

.mode-split .edit-pane,
.mode-split .preview-pane {
  width: 50%;
}

.edit-pane {
  border-right: 1px solid #e1e8ed;
}

.markdown-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 20px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  background: #fafbfc;
  color: #2c3e50;
  transition: all 0.3s ease;
}

.markdown-textarea::placeholder {
  color: #95a5a6;
  font-size: 13px;
  line-height: 1.4;
}

.markdown-textarea:focus {
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(102, 126, 234, 0.2);
}

.markdown-textarea:hover {
  background: #ffffff;
}

.preview-pane {
  overflow-y: auto;
  background: white;
}

.markdown-preview {
  padding: 20px;
  line-height: 1.7;
  color: #2c3e50;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.editor-footer {
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e1e8ed;
  font-size: 12px;
  color: #7f8c8d;
}

.editor-stats {
  display: flex;
  gap: 20px;
}

/* 图片助手面板 */
.image-helper {
  background: #f8f9fa;
  border-top: 1px solid #e1e8ed;
  border-bottom: 1px solid #e1e8ed;
}

.helper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e1e8ed;
  background: #ffffff;
}

.helper-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.helper-content {
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.upload-tips,
.markdown-tips {
  background: white;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e1e8ed;
}

.upload-tips p,
.markdown-tips p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #2c3e50;
}

.upload-tips ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.upload-tips li {
  margin: 4px 0;
  font-size: 13px;
  color: #666;
}

.markdown-tips code {
  display: block;
  background: #f1f3f4;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  margin: 8px 0;
  color: #e83e8c;
}

.tip-note {
  font-size: 12px !important;
  color: #95a5a6 !important;
  margin-top: 8px !important;
}

/* 预览区域样式 */
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin: 24px 0 16px 0;
  font-weight: 600;
  line-height: 1.25;
  color: #2c3e50;
}

.markdown-preview :deep(h1) {
  font-size: 28px;
  border-bottom: 2px solid #e1e8ed;
  padding-bottom: 8px;
}

.markdown-preview :deep(h2) {
  font-size: 24px;
}

.markdown-preview :deep(h3) {
  font-size: 20px;
}

.markdown-preview :deep(p) {
  margin: 16px 0;
}

.markdown-preview :deep(code) {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  color: #e83e8c;
}

.markdown-preview :deep(pre) {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  border-left: 4px solid #667eea;
  margin: 16px 0;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.markdown-preview :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 20px;
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  color: #7f8c8d;
  font-style: italic;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 24px;
  margin: 16px 0;
}

.markdown-preview :deep(li) {
  margin: 8px 0;
}

.markdown-preview :deep(a) {
  color: #667eea;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.markdown-preview :deep(a:hover) {
  border-bottom-color: #667eea;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.markdown-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  overflow: hidden;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e1e8ed;
}

.markdown-preview :deep(th) {
  background: #f8f9fa;
  font-weight: 600;
}

@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .editor-tabs {
    justify-content: center;
  }

  .mode-split .editor-content {
    flex-direction: column;
  }

  .mode-split .edit-pane,
  .mode-split .preview-pane {
    width: 100%;
    height: 50%;
  }

  .edit-pane {
    border-right: none;
    border-bottom: 1px solid #e1e8ed;
  }
}
</style>
