<template>
  <div class="tag-management">
    <div class="page-header">
      <h1>标签管理</h1>
      <div class="header-actions">
        <el-button @click="showBatchDialog = true">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新建标签
        </el-button>
      </div>
    </div>

    <!-- 标签列表 -->
    <el-card>
      <el-table v-loading="loading" :data="tags" style="width: 100%">
        <el-table-column prop="name" label="标签名称" width="150">
          <template #default="{ row }">
            <el-tag :color="row.color" style="color: white;">
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="articleCount" label="文章数" width="100" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="isHot" label="热门" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isHot ? 'danger' : 'info'" size="small">
              {{ row.isHot ? '热门' : '普通' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button size="small" @click="editTag(row)">编辑</el-button>
            <el-button size="small" type="info" @click="updateCount(row)">更新数量</el-button>
            <el-button
              v-if="row.articleCount > 0"
              size="small"
              type="warning"
              @click="viewTagArticles(row)"
            >
              查看文章({{ row.articleCount }})
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteTag(row)"
              :disabled="row.articleCount > 0"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTag ? '编辑标签' : '新建标签'"
      width="500px"
    >
      <el-form :model="tagForm" :rules="tagRules" ref="tagFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="tagForm.description" type="textarea" placeholder="请输入标签描述" />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <el-color-picker v-model="tagForm.color" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="tagForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="热门标签" prop="isHot">
          <el-switch v-model="tagForm.isHot" />
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="tagForm.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTag">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showBatchDialog" title="批量导入标签" width="500px">
      <el-form :model="batchForm" label-width="80px">
        <el-form-item label="标签列表">
          <el-input
            v-model="batchForm.tags"
            type="textarea"
            :rows="6"
            placeholder="请输入标签名称，每行一个，例如：&#10;JavaScript&#10;Vue.js&#10;React"
          />
        </el-form-item>
        <el-alert
          title="提示"
          description="每行输入一个标签名称，重复的标签会被自动跳过"
          type="info"
          :closable="false"
        />
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="batchImport">导入</el-button>
      </template>
    </el-dialog>

    <!-- 查看标签文章对话框 -->
    <el-dialog
      v-model="showArticlesDialog"
      :title="`标签「${currentTag?.name}」的文章列表`"
      width="800px"
    >
      <el-table v-loading="articlesLoading" :data="tagArticles" style="width: 100%">
        <el-table-column prop="title" label="文章标题" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'warning'">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="author.username" label="作者" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editArticle(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'published'"
              size="small"
              type="warning"
              @click="unpublishArticle(row)"
            >
              下架
            </el-button>
            <el-button size="small" type="danger" @click="deleteArticle(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showArticlesDialog = false">关闭</el-button>
        <el-button type="danger" @click="batchUnpublishArticles">批量下架</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Upload } from '@element-plus/icons-vue';
import api from '@/api';

export default {
  name: 'TagManagement',
  components: {
    Plus,
    Upload
  },
  setup() {
    const loading = ref(false);
    const tags = ref([]);
    const showCreateDialog = ref(false);
    const showBatchDialog = ref(false);
    const showArticlesDialog = ref(false);
    const editingTag = ref(null);
    const currentTag = ref(null);
    const tagFormRef = ref();
    const articlesLoading = ref(false);
    const tagArticles = ref([]);

    const tagForm = ref({
      name: '',
      description: '',
      color: '#6B7280',
      sort: 0,
      isHot: false,
      isActive: true
    });

    const batchForm = ref({
      tags: ''
    });

    const tagRules = {
      name: [
        { required: true, message: '请输入标签名称', trigger: 'blur' },
        { max: 30, message: '标签名称最多30个字符', trigger: 'blur' }
      ]
    };

    // 获取标签列表
    const fetchTags = async () => {
      loading.value = true;
      try {
        const response = await api.get('/tags', { params: { admin: true } });
        tags.value = response.data.data || [];
      } catch (error) {
        console.error('获取标签列表失败:', error);
        ElMessage.error('获取标签列表失败');
      } finally {
        loading.value = false;
      }
    };

    // 编辑标签
    const editTag = (tag) => {
      editingTag.value = tag;
      tagForm.value = { ...tag };
      showCreateDialog.value = true;
    };

    // 保存标签
    const saveTag = async () => {
      try {
        await tagFormRef.value.validate();

        if (editingTag.value) {
          await api.put(`/tags/${editingTag.value._id}`, tagForm.value);
          ElMessage.success('更新标签成功');
        } else {
          await api.post('/tags', tagForm.value);
          ElMessage.success('创建标签成功');
        }

        showCreateDialog.value = false;
        editingTag.value = null;
        tagForm.value = {
          name: '',
          description: '',
          color: '#6B7280',
          sort: 0,
          isHot: false,
          isActive: true
        };
        fetchTags();
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '保存失败');
      }
    };

    // 删除标签
    const deleteTag = async (tag) => {
      if (tag.articleCount > 0) {
        ElMessage.warning(`无法删除标签，还有 ${tag.articleCount} 篇文章正在使用此标签`);
        return;
      }

      try {
        await ElMessageBox.confirm(
          `确定要删除标签"${tag.name}"吗？`,
          '确认删除',
          { type: 'warning' }
        );

        await api.delete(`/tags/${tag._id}`);
        ElMessage.success('删除成功');
        fetchTags();
      } catch (error) {
        if (error !== 'cancel') {
          const message = error.response?.data?.message || '删除失败';
          ElMessage.error(message);
        }
      }
    };

    // 查看标签文章
    const viewTagArticles = async (tag) => {
      currentTag.value = tag;
      articlesLoading.value = true;
      showArticlesDialog.value = true;

      try {
        const response = await api.get(`/tags/${tag._id}/articles`);
        tagArticles.value = response.data.data.articles;
      } catch (error) {
        ElMessage.error('获取文章列表失败');
        tagArticles.value = [];
      } finally {
        articlesLoading.value = false;
      }
    };

    // 编辑文章
    const editArticle = (article) => {
      window.open(`/admin/articles/edit/${article._id}`, '_blank');
    };

    // 下架文章
    const unpublishArticle = async (article) => {
      try {
        await ElMessageBox.confirm(
          `确定要下架文章"${article.title}"吗？`,
          '确认下架',
          { type: 'warning' }
        );

        await api.put(`/articles/${article._id}`, { status: 'draft' });
        ElMessage.success('文章已下架');

        viewTagArticles(currentTag.value);
        fetchTags();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('下架失败');
        }
      }
    };

    // 删除文章
    const deleteArticle = async (article) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除文章"${article.title}"吗？此操作不可恢复！`,
          '确认删除',
          { type: 'warning' }
        );

        await api.delete(`/articles/${article._id}`);
        ElMessage.success('文章已删除');

        viewTagArticles(currentTag.value);
        fetchTags();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败');
        }
      }
    };

    // 批量下架文章
    const batchUnpublishArticles = async () => {
      const publishedArticles = tagArticles.value.filter(a => a.status === 'published');

      if (publishedArticles.length === 0) {
        ElMessage.info('没有已发布的文章需要下架');
        return;
      }

      try {
        await ElMessageBox.confirm(
          `确定要下架该标签下的所有 ${publishedArticles.length} 篇已发布文章吗？`,
          '批量下架确认',
          { type: 'warning' }
        );

        const promises = publishedArticles.map(article =>
          api.put(`/articles/${article._id}`, { status: 'draft' })
        );

        await Promise.all(promises);
        ElMessage.success(`成功下架 ${publishedArticles.length} 篇文章`);

        viewTagArticles(currentTag.value);
        fetchTags();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量下架失败');
        }
      }
    };

    // 更新文章数量
    const updateCount = async (tag) => {
      try {
        await api.post(`/tags/${tag._id}/update-count`);
        ElMessage.success('更新成功');
        fetchTags();
      } catch (error) {
        ElMessage.error('更新失败');
      }
    };

    // 批量导入
    const batchImport = async () => {
      if (!batchForm.value.tags.trim()) {
        ElMessage.warning('请输入标签列表');
        return;
      }

      try {
        const tagList = batchForm.value.tags
          .split('\n')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);

        if (tagList.length === 0) {
          ElMessage.warning('请输入有效的标签');
          return;
        }

        const response = await api.post('/tags/batch', { tags: tagList });
        const { created, errors } = response.data.data;

        let message = `成功导入 ${created.length} 个标签`;
        if (errors.length > 0) {
          message += `，${errors.length} 个标签导入失败`;
        }

        ElMessage.success(message);
        showBatchDialog.value = false;
        batchForm.value.tags = '';
        fetchTags();
      } catch (error) {
        ElMessage.error('批量导入失败');
      }
    };



    onMounted(() => {
      fetchTags();
    });

    return {
      loading,
      tags,
      showCreateDialog,
      showBatchDialog,
      showArticlesDialog,
      editingTag,
      currentTag,
      tagForm,
      batchForm,
      tagRules,
      tagFormRef,
      articlesLoading,
      tagArticles,
      editTag,
      saveTag,
      deleteTag,
      updateCount,
      batchImport,
      viewTagArticles,
      editArticle,
      unpublishArticle,
      deleteArticle,
      batchUnpublishArticles
    };
  }
};
</script>

<style scoped>
.tag-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style>
