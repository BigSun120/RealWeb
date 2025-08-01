<template>
  <div class="article-edit">
    <div class="edit-header">
      <div class="header-left">
        <el-button @click="goBack" icon="ArrowLeft">返回</el-button>
        <h1>{{ isEdit ? '编辑文章' : '创建文章' }}</h1>
      </div>
      <div class="header-right">
        <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="publishArticle" :loading="publishing">
          {{ isEdit ? '更新文章' : '发布文章' }}
        </el-button>
      </div>
    </div>

    <div class="edit-content">
      <div class="article-meta">
        <el-form :model="article" label-position="top">
          <div class="meta-row">
            <el-form-item label="文章标题" class="title-item">
              <el-input
                v-model="article.title"
                placeholder="请输入文章标题"
                size="large"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
          </div>

          <div class="meta-row">
            <el-form-item label="文章摘要" class="summary-item">
              <el-input
                v-model="article.summary"
                type="textarea"
                :rows="3"
                placeholder="请输入文章摘要（可选）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </div>

          <div class="meta-row">
            <el-form-item label="分类" class="category-item">
              <el-select
                v-model="article.category"
                placeholder="选择分类"
                style="width: 200px"
              >
                <el-option
                  v-for="category in categories"
                  :key="category.value"
                  :label="category.label"
                  :value="category.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="标签" class="tags-item">
              <el-select
                v-model="article.tags"
                multiple
                filterable
                allow-create
                placeholder="选择或创建标签"
                style="width: 300px"
              >
                <el-option
                  v-for="tag in availableTags"
                  :key="tag"
                  :label="tag"
                  :value="tag"
                />
              </el-select>
            </el-form-item>
          </div>
        </el-form>
      </div>

      <div class="editor-section">
        <MarkdownEditor
          v-model="article.content"
          height="600px"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import api from '@/api';

export default {
  name: 'ArticleEdit',
  components: {
    MarkdownEditor,
    ArrowLeft
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const saving = ref(false);
    const publishing = ref(false);
    const isEdit = ref(false);

    const article = ref({
      title: '',
      summary: '',
      content: '',
      category: '',
      tags: [],
      status: 'draft'
    });

    const categories = ref([
      { label: '技术分享', value: 'tech' },
      { label: '生活随笔', value: 'life' },
      { label: '学习笔记', value: 'study' },
      { label: '项目经验', value: 'project' },
      { label: '其他', value: 'other' }
    ]);

    const availableTags = ref([
      'JavaScript', 'Vue.js', 'React', 'Node.js', 'Python',
      'Java', 'Go', 'Docker', 'Kubernetes', 'MongoDB',
      'MySQL', 'Redis', 'Nginx', 'Linux', 'Git',
      '前端', '后端', '全栈', '算法', '数据结构'
    ]);

    // 返回上一页
    const goBack = async () => {
      if (hasUnsavedChanges()) {
        try {
          await ElMessageBox.confirm(
            '您有未保存的更改，确定要离开吗？',
            '提示',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning'
            }
          );
        } catch {
          return;
        }
      }
      router.back();
    };

    // 检查是否有未保存的更改
    const hasUnsavedChanges = () => {
      return article.value.title || article.value.content || article.value.summary;
    };

    // 保存草稿
    const saveDraft = async () => {
      if (!article.value.title.trim()) {
        ElMessage.warning('请输入文章标题');
        return;
      }

      saving.value = true;
      try {
        const data = {
          ...article.value,
          status: 'draft'
        };

        if (isEdit.value) {
          await api.put(`/articles/${route.params.id}`, data);
          ElMessage.success('草稿保存成功');
        } else {
          const response = await api.post('/articles', data);
          article.value.id = response.data.data.id;
          isEdit.value = true;
          ElMessage.success('草稿保存成功');
        }
      } catch (error) {
        ElMessage.error('保存失败：' + (error.response?.data?.message || error.message));
      } finally {
        saving.value = false;
      }
    };

    // 发布文章
    const publishArticle = async () => {
      if (!article.value.title.trim()) {
        ElMessage.warning('请输入文章标题');
        return;
      }

      if (!article.value.content.trim()) {
        ElMessage.warning('请输入文章内容');
        return;
      }

      publishing.value = true;
      try {
        const data = {
          ...article.value,
          status: 'published'
        };

        if (isEdit.value) {
          await api.put(`/articles/${route.params.id}`, data);
          ElMessage.success('文章更新成功');
        } else {
          await api.post('/articles', data);
          ElMessage.success('文章发布成功');
        }

        router.push('/articles');
      } catch (error) {
        ElMessage.error('发布失败：' + (error.response?.data?.message || error.message));
      } finally {
        publishing.value = false;
      }
    };

    // 加载文章数据（编辑模式）
    const loadArticle = async () => {
      if (route.params.id) {
        isEdit.value = true;
        try {
          const response = await api.get(`/articles/${route.params.id}/edit`);
          const data = response.data.data;
          article.value = {
            id: data._id,
            title: data.title,
            summary: data.excerpt || '',
            content: data.content,
            category: data.category,
            tags: data.tags || [],
            status: data.status
          };
        } catch (error) {
          ElMessage.error('加载文章失败：' + (error.response?.data?.message || error.message));
          router.push('/articles');
        }
      }
    };

    onMounted(() => {
      loadArticle();
    });

    return {
      article,
      categories,
      availableTags,
      saving,
      publishing,
      isEdit,
      goBack,
      saveDraft,
      publishArticle
    };
  }
};
</script>

<style scoped>
.article-edit {
  min-height: 100vh;
  background: #f8f9fa;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e1e8ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.header-right {
  display: flex;
  gap: 12px;
}

.edit-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.article-meta {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.meta-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.meta-row:last-child {
  margin-bottom: 0;
}

.title-item {
  flex: 1;
}

.summary-item {
  flex: 1;
}

.category-item {
  flex: 0 0 auto;
}

.tags-item {
  flex: 1;
}

.editor-section {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .edit-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left {
    justify-content: space-between;
  }

  .header-right {
    justify-content: center;
  }

  .edit-content {
    padding: 16px;
  }

  .meta-row {
    flex-direction: column;
    gap: 0;
  }

  .article-meta {
    padding: 16px;
  }
}
</style>
