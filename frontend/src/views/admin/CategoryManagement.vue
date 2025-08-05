<template>
  <div class="category-management">
    <div class="page-header">
      <h1>分类管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建分类
      </el-button>
    </div>

    <!-- 分类列表 -->
    <el-card>
      <el-table v-loading="loading" :data="categories" style="width: 100%">
        <el-table-column prop="name" label="分类名称" width="150">
          <template #default="{ row }">
            <div class="category-name">
              <span class="category-icon">{{ row.icon }}</span>
              {{ row.name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="color" label="颜色" width="100">
          <template #default="{ row }">
            <div class="color-preview" :style="{ backgroundColor: row.color }"></div>
          </template>
        </el-table-column>
        <el-table-column prop="articleCount" label="文章数" width="100" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button size="small" @click="editCategory(row)">编辑</el-button>
            <el-button size="small" type="info" @click="updateCount(row)">更新数量</el-button>
            <el-button
              v-if="row.articleCount > 0"
              size="small"
              type="warning"
              @click="viewCategoryArticles(row)"
            >
              查看文章({{ row.articleCount }})
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteCategory(row)"
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
      :title="editingCategory ? '编辑分类' : '新建分类'"
      width="500px"
    >
      <el-form :model="categoryForm" :rules="categoryRules" ref="categoryFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="categoryForm.description" type="textarea" placeholder="请输入分类描述" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="categoryForm.icon" placeholder="请输入emoji图标" />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <el-color-picker v-model="categoryForm.color" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="categoryForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="categoryForm.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看分类文章对话框 -->
    <el-dialog
      v-model="showArticlesDialog"
      :title="`分类「${currentCategory?.name}」的文章列表`"
      width="800px"
    >
      <el-table v-loading="articlesLoading" :data="categoryArticles" style="width: 100%">
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
import { Plus } from '@element-plus/icons-vue';
import api from '@/api';

export default {
  name: 'CategoryManagement',
  components: {
    Plus
  },
  setup() {
    const loading = ref(false);
    const categories = ref([]);
    const showCreateDialog = ref(false);
    const showArticlesDialog = ref(false);
    const editingCategory = ref(null);
    const currentCategory = ref(null);
    const categoryFormRef = ref();
    const articlesLoading = ref(false);
    const categoryArticles = ref([]);

    const categoryForm = ref({
      name: '',
      description: '',
      icon: '📁',
      color: '#3B82F6',
      sort: 0,
      isActive: true
    });

    const categoryRules = {
      name: [
        { required: true, message: '请输入分类名称', trigger: 'blur' },
        { max: 50, message: '分类名称最多50个字符', trigger: 'blur' }
      ]
    };

    // 获取分类列表
    const fetchCategories = async () => {
      loading.value = true;
      try {
        const response = await api.get('/categories', { params: { admin: true } });
        categories.value = response.data.data || [];
      } catch (error) {
        console.error('获取分类列表失败:', error);
        ElMessage.error('获取分类列表失败');
      } finally {
        loading.value = false;
      }
    };

    // 编辑分类
    const editCategory = (category) => {
      editingCategory.value = category;
      categoryForm.value = { ...category };
      showCreateDialog.value = true;
    };

    // 保存分类
    const saveCategory = async () => {
      try {
        await categoryFormRef.value.validate();

        if (editingCategory.value) {
          await api.put(`/categories/${editingCategory.value._id}`, categoryForm.value);
          ElMessage.success('更新分类成功');
        } else {
          await api.post('/categories', categoryForm.value);
          ElMessage.success('创建分类成功');
        }

        showCreateDialog.value = false;
        editingCategory.value = null;
        categoryForm.value = {
          name: '',
          description: '',
          icon: '📁',
          color: '#3B82F6',
          sort: 0,
          isActive: true
        };
        fetchCategories();
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '保存失败');
      }
    };

    // 删除分类
    const deleteCategory = async (category) => {
      if (category.articleCount > 0) {
        ElMessage.warning(`无法删除分类，还有 ${category.articleCount} 篇文章正在使用此分类`);
        return;
      }

      try {
        await ElMessageBox.confirm(
          `确定要删除分类"${category.name}"吗？`,
          '确认删除',
          { type: 'warning' }
        );

        await api.delete(`/categories/${category._id}`);
        ElMessage.success('删除成功');
        fetchCategories();
      } catch (error) {
        if (error !== 'cancel') {
          const message = error.response?.data?.message || '删除失败';
          ElMessage.error(message);
        }
      }
    };

    // 查看分类文章
    const viewCategoryArticles = async (category) => {
      currentCategory.value = category;
      articlesLoading.value = true;
      showArticlesDialog.value = true;

      try {
        const response = await api.get(`/categories/${category._id}/articles`);
        categoryArticles.value = response.data.data.articles;
      } catch (error) {
        ElMessage.error('获取文章列表失败');
        categoryArticles.value = [];
      } finally {
        articlesLoading.value = false;
      }
    };

    // 编辑文章
    const editArticle = (article) => {
      // 跳转到文章编辑页面
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

        // 刷新文章列表和分类数据
        viewCategoryArticles(currentCategory.value);
        fetchCategories();
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

        // 刷新文章列表和分类数据
        viewCategoryArticles(currentCategory.value);
        fetchCategories();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败');
        }
      }
    };

    // 批量下架文章
    const batchUnpublishArticles = async () => {
      const publishedArticles = categoryArticles.value.filter(a => a.status === 'published');

      if (publishedArticles.length === 0) {
        ElMessage.info('没有已发布的文章需要下架');
        return;
      }

      try {
        await ElMessageBox.confirm(
          `确定要下架该分类下的所有 ${publishedArticles.length} 篇已发布文章吗？`,
          '批量下架确认',
          { type: 'warning' }
        );

        // 批量下架
        const promises = publishedArticles.map(article =>
          api.put(`/articles/${article._id}`, { status: 'draft' })
        );

        await Promise.all(promises);
        ElMessage.success(`成功下架 ${publishedArticles.length} 篇文章`);

        // 刷新数据
        viewCategoryArticles(currentCategory.value);
        fetchCategories();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量下架失败');
        }
      }
    };

    // 更新文章数量
    const updateCount = async (category) => {
      try {
        await api.post(`/categories/${category._id}/update-count`);
        ElMessage.success('更新成功');
        fetchCategories();
      } catch (error) {
        ElMessage.error('更新失败');
      }
    };



    onMounted(() => {
      fetchCategories();
    });

    return {
      loading,
      categories,
      showCreateDialog,
      showArticlesDialog,
      editingCategory,
      currentCategory,
      categoryForm,
      categoryRules,
      categoryFormRef,
      articlesLoading,
      categoryArticles,
      editCategory,
      saveCategory,
      deleteCategory,
      updateCount,
      viewCategoryArticles,
      editArticle,
      unpublishArticle,
      deleteArticle,
      batchUnpublishArticles
    };
  }
};
</script>

<style scoped>
.category-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.category-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-icon {
  font-size: 18px;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style>
