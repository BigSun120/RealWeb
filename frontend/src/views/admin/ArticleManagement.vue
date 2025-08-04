<template>
  <div class="article-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>文章管理</h1>
      <p>管理系统中的所有文章内容</p>
    </div>

    <!-- 状态统计 -->
    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :span="5">
          <el-card class="stat-card" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
            <div class="stat-content">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">全部文章</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="5">
          <el-card class="stat-card" :class="{ active: activeTab === 'published' }" @click="activeTab = 'published'">
            <div class="stat-content">
              <div class="stat-number">{{ stats.published }}</div>
              <div class="stat-label">已发布</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="5">
          <el-card class="stat-card" :class="{ active: activeTab === 'draft' }" @click="activeTab = 'draft'">
            <div class="stat-content">
              <div class="stat-number">{{ stats.draft }}</div>
              <div class="stat-label">草稿</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="5">
          <el-card class="stat-card" :class="{ active: activeTab === 'archived' }" @click="activeTab = 'archived'">
            <div class="stat-content">
              <div class="stat-number">{{ stats.archived }}</div>
              <div class="stat-label">已下架</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card class="stat-card deleted-card" :class="{ active: activeTab === 'deleted' }" @click="activeTab = 'deleted'">
            <div class="stat-content">
              <div class="stat-number">{{ stats.deleted }}</div>
              <div class="stat-label">已删除</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="search-card" shadow="never">
      <div class="search-header">
        <span class="search-title">文章搜索</span>
        <div class="header-actions">
          <el-button
            text
            type="primary"
            @click="toggleAdvancedSearch"
          >
            {{ showAdvancedSearch ? '收起高级搜索' : '展开高级搜索' }}
            <el-icon>
              <component :is="showAdvancedSearch ? 'ArrowUp' : 'ArrowDown'" />
            </el-icon>
          </el-button>
          <el-button type="primary" @click="$router.push('/articles/new')">
            <el-icon><EditPen /></el-icon>
            写文章
          </el-button>
        </div>
      </div>

      <!-- 基础搜索 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="关键词搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="输入文章标题或内容"
            clearable
            style="width: 280px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="搜索类型">
          <el-select
            v-model="searchForm.searchType"
            placeholder="选择类型"
            clearable
            style="width: 120px"
          >
            <el-option label="全部" value="all" />
            <el-option label="标题" value="title" />
            <el-option label="内容" value="content" />
            <el-option label="作者" value="author" />
          </el-select>
        </el-form-item>

        <el-form-item label="选择作者">
          <el-select
            v-model="searchForm.authorId"
            placeholder="选择作者"
            clearable
            filterable
            style="width: 150px"
          >
            <el-option
              v-for="author in authorList"
              :key="author.id"
              :label="author.username"
              :value="author.id"
            >
              <div class="author-option">
                <el-avatar :src="author.avatar" :size="20">
                  {{ author.username?.charAt(0) }}
                </el-avatar>
                <span style="margin-left: 8px">{{ author.username }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 高级搜索 -->
      <el-collapse-transition>
        <div v-show="showAdvancedSearch" class="advanced-search">
          <el-divider content-position="left">高级搜索选项</el-divider>

          <el-form :model="searchForm" :inline="false" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="时间类型">
                  <el-select
                    v-model="searchForm.timeType"
                    placeholder="选择时间类型"
                    style="width: 100%"
                  >
                    <el-option label="创建时间" value="created" />
                    <el-option label="更新时间" value="updated" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="时间范围">
                  <el-date-picker
                    v-model="searchForm.dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="快捷时间">
                  <el-select
                    v-model="quickTimeFilter"
                    placeholder="选择时间范围"
                    style="width: 100%"
                    @change="handleQuickTimeFilter"
                  >
                    <el-option label="今天" value="today" />
                    <el-option label="昨天" value="yesterday" />
                    <el-option label="本周" value="thisWeek" />
                    <el-option label="上周" value="lastWeek" />
                    <el-option label="本月" value="thisMonth" />
                    <el-option label="上月" value="lastMonth" />
                    <el-option label="最近7天" value="last7Days" />
                    <el-option label="最近30天" value="last30Days" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-collapse-transition>
    </el-card>

    <!-- 文章列表 -->
    <el-card class="content-card" shadow="never">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="filteredArticles.length === 0" class="empty-container">
        <el-empty description="暂无文章">
          <el-button type="primary" @click="$router.push('/articles/new')">
            创建第一篇文章
          </el-button>
        </el-empty>
      </div>

      <div v-else class="articles-table">
        <!-- 批量操作栏 -->
        <div v-if="activeTab === 'deleted' && selectedArticles.length > 0" class="batch-actions">
          <span class="selected-count">已选择 {{ selectedArticles.length }} 篇文章</span>
          <el-button type="success" @click="batchRestore">
            批量恢复
          </el-button>
          <el-button type="danger" @click="batchPermanentDelete">
            批量永久删除
          </el-button>
        </div>

        <el-table
          :data="filteredArticles"
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column
            v-if="activeTab === 'deleted'"
            type="selection"
            width="55"
          />

          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <div class="article-title-cell">
                <span class="title-text" @click="editArticle(row)">
                  {{ row.title || '无标题' }}
                </span>
                <el-tag
                  :type="getStatusTagType(row.status)"
                  size="small"
                  style="margin-left: 8px"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="author" label="作者" width="120">
            <template #default="{ row }">
              <div class="author-cell">
                <el-avatar :src="row.author?.avatar" :size="24">
                  {{ row.author?.username?.charAt(0) }}
                </el-avatar>
                <span style="margin-left: 8px">{{ row.author?.username }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="category" label="分类" width="100">
            <template #default="{ row }">
              {{ getCategoryName(row.category) }}
            </template>
          </el-table-column>

          <el-table-column prop="updatedAt" label="更新时间" width="120">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <!-- 已删除文章的操作 -->
              <template v-if="activeTab === 'deleted'">
                <el-button
                  size="small"
                  type="success"
                  @click="restoreArticle(row)"
                >
                  恢复
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="permanentDeleteArticle(row)"
                >
                  永久删除
                </el-button>
              </template>

              <!-- 正常文章的操作 -->
              <template v-else>
                <el-button size="small" @click="editArticle(row)">
                  编辑
                </el-button>

                <el-button
                  v-if="row.status === 'draft'"
                  size="small"
                  type="success"
                  @click="publishArticle(row)"
                >
                  发布
                </el-button>

                <el-button
                  v-if="row.status === 'published'"
                  size="small"
                  type="warning"
                  @click="archiveArticle(row)"
                >
                  下架
                </el-button>

                <el-button
                  v-if="row.status === 'archived'"
                  size="small"
                  type="success"
                  @click="publishArticle(row)"
                >
                  重新发布
                </el-button>

                <el-button
                  size="small"
                  type="danger"
                  @click="deleteArticle(row)"
                >
                  删除
                </el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  EditPen, Search, Refresh, ArrowUp, ArrowDown
} from '@element-plus/icons-vue';
import api from '@/api';

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default {
  name: 'ArticleManagement',
  components: {
    EditPen, Search, Refresh, ArrowUp, ArrowDown
  },
  setup() {
    const router = useRouter();
    const loading = ref(true);
    const activeTab = ref('all');
    const articles = ref([]);
    const authorList = ref([]);
    const currentPage = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const showAdvancedSearch = ref(false);
    const quickTimeFilter = ref('');
    const selectedArticles = ref([]);

    const statsData = ref({
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
      deleted: 0
    });

    // 搜索表单
    const searchForm = ref({
      keyword: '',
      searchType: 'all',
      authorId: '',
      timeType: 'created',
      dateRange: []
    });

    const categories = {
      tech: '技术分享',
      life: '生活随笔',
      study: '学习笔记',
      project: '项目经验',
      other: '其他'
    };

    // 统计信息 - 使用独立的统计数据，不依赖当前列表
    const stats = computed(() => {
      return statsData.value;
    });

    // 过滤文章 - 直接使用后端返回的数据，不需要前端再次过滤
    const filteredArticles = computed(() => {
      return articles.value;
    });

    // 获取分类名称
    const getCategoryName = (category) => {
      return categories[category] || category || '未分类';
    };

    // 获取状态文本
    const getStatusText = (status) => {
      const statusMap = {
        'draft': '草稿',
        'published': '已发布',
        'archived': '已下架'
      };
      return statusMap[status] || status;
    };

    // 获取状态标签类型
    const getStatusTagType = (status) => {
      const typeMap = {
        'draft': 'info',
        'published': 'success',
        'archived': 'warning'
      };
      return typeMap[status] || 'info';
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // 编辑文章
    const editArticle = (article) => {
      router.push(`/articles/${article.id}/edit`);
    };

    // 发布文章
    const publishArticle = async (article) => {
      try {
        await api.put(`/articles/${article.id}`, {
          ...article,
          status: 'published'
        });
        article.status = 'published';
        ElMessage.success('文章发布成功');
        await loadStats();
      } catch (error) {
        ElMessage.error('发布失败：' + (error.response?.data?.message || error.message));
      }
    };

    // 下架文章
    const archiveArticle = async (article) => {
      try {
        await ElMessageBox.confirm(
          `确定要下架文章"${article.title || '无标题'}"吗？下架后用户将无法访问此文章。`,
          '确认下架',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await api.put(`/articles/${article.id}`, {
          ...article,
          status: 'archived'
        });
        article.status = 'archived';
        ElMessage.success('文章已下架');
        await loadStats();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('下架失败：' + (error.response?.data?.message || error.message));
        }
      }
    };

    // 删除文章（软删除）
    const deleteArticle = async (article) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除文章"${article.title || '无标题'}"吗？删除后可在已删除列表中恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );

        await api.delete(`/articles/${article.id}`);
        await loadArticles();
        await loadStats();
        ElMessage.success('文章已删除');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败：' + (error.response?.data?.message || error.message));
        }
      }
    };

    // 恢复文章
    const restoreArticle = async (article) => {
      try {
        await ElMessageBox.confirm(
          `确定要恢复文章"${article.title || '无标题'}"吗？`,
          '确认恢复',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'success'
          }
        );

        await api.put(`/admin/articles/${article.id}/restore`);
        await loadArticles();
        await loadStats();
        ElMessage.success('文章恢复成功');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('恢复失败：' + (error.response?.data?.message || error.message));
        }
      }
    };

    // 永久删除文章
    const permanentDeleteArticle = async (article) => {
      try {
        await ElMessageBox.confirm(
          `确定要永久删除文章"${article.title || '无标题'}"吗？此操作不可恢复！`,
          '确认永久删除',
          {
            confirmButtonText: '永久删除',
            cancelButtonText: '取消',
            type: 'error',
            confirmButtonClass: 'el-button--danger'
          }
        );

        await api.delete(`/admin/articles/${article.id}/permanent`);
        await loadArticles();
        await loadStats();
        ElMessage.success('文章已永久删除');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('永久删除失败：' + (error.response?.data?.message || error.message));
        }
      }
    };

    // 选择变化处理
    const handleSelectionChange = (selection) => {
      selectedArticles.value = selection;
    };

    // 批量恢复
    const batchRestore = async () => {
      if (selectedArticles.value.length === 0) {
        ElMessage.warning('请选择要恢复的文章');
        return;
      }

      try {
        await ElMessageBox.confirm(
          `确定要恢复选中的 ${selectedArticles.value.length} 篇文章吗？`,
          '批量恢复确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'success'
          }
        );

        // 并行恢复所有选中的文章
        const promises = selectedArticles.value.map(article =>
          api.put(`/admin/articles/${article.id}/restore`)
        );

        await Promise.all(promises);

        selectedArticles.value = [];
        await loadArticles();
        await loadStats();
        ElMessage.success(`成功恢复 ${promises.length} 篇文章`);
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量恢复失败：' + (error.response?.data?.message || error.message));
        }
      }
    };

    // 批量永久删除
    const batchPermanentDelete = async () => {
      if (selectedArticles.value.length === 0) {
        ElMessage.warning('请选择要永久删除的文章');
        return;
      }

      try {
        await ElMessageBox.confirm(
          `确定要永久删除选中的 ${selectedArticles.value.length} 篇文章吗？此操作不可恢复！`,
          '批量永久删除确认',
          {
            confirmButtonText: '永久删除',
            cancelButtonText: '取消',
            type: 'error',
            confirmButtonClass: 'el-button--danger'
          }
        );

        // 并行删除所有选中的文章
        const promises = selectedArticles.value.map(article =>
          api.delete(`/admin/articles/${article.id}/permanent`)
        );

        await Promise.all(promises);

        selectedArticles.value = [];
        await loadArticles();
        await loadStats();
        ElMessage.success(`成功永久删除 ${promises.length} 篇文章`);
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量永久删除失败：' + (error.response?.data?.message || error.message));
        }
      }
    };

    // 切换高级搜索
    const toggleAdvancedSearch = () => {
      showAdvancedSearch.value = !showAdvancedSearch.value;
    };

    // 搜索处理
    const handleSearch = () => {
      currentPage.value = 1;
      loadArticles();
    };

    // 重置搜索
    const handleReset = () => {
      searchForm.value = {
        keyword: '',
        searchType: 'all',
        authorId: '',
        timeType: 'created',
        dateRange: []
      };
      quickTimeFilter.value = '';
      currentPage.value = 1;
      loadArticles();
    };

    // 快捷时间筛选处理
    const handleQuickTimeFilter = (command) => {
      const today = new Date();
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };

      switch (command) {
        case 'today':
          searchForm.value.dateRange = [formatDate(today), formatDate(today)];
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          searchForm.value.dateRange = [formatDate(yesterday), formatDate(yesterday)];
          break;
        case 'thisWeek':
          const thisWeekStart = new Date(today);
          thisWeekStart.setDate(today.getDate() - today.getDay());
          searchForm.value.dateRange = [formatDate(thisWeekStart), formatDate(today)];
          break;
        case 'lastWeek':
          const lastWeekEnd = new Date(today);
          lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
          const lastWeekStart = new Date(lastWeekEnd);
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
          searchForm.value.dateRange = [formatDate(lastWeekStart), formatDate(lastWeekEnd)];
          break;
        case 'thisMonth':
          const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          searchForm.value.dateRange = [formatDate(thisMonthStart), formatDate(today)];
          break;
        case 'lastMonth':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          searchForm.value.dateRange = [formatDate(lastMonthStart), formatDate(lastMonthEnd)];
          break;
        case 'last7Days':
          const last7Days = new Date(today);
          last7Days.setDate(today.getDate() - 6);
          searchForm.value.dateRange = [formatDate(last7Days), formatDate(today)];
          break;
        case 'last30Days':
          const last30Days = new Date(today);
          last30Days.setDate(today.getDate() - 29);
          searchForm.value.dateRange = [formatDate(last30Days), formatDate(today)];
          break;
      }

      currentPage.value = 1;
      loadArticles();
    };

    // 分页处理
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize;
      currentPage.value = 1;
      loadArticles();
    };

    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage;
      loadArticles();
    };

    // 加载统计数据
    const loadStats = async () => {
      try {
        // 并行获取各状态的文章数量
        const [allResponse, publishedResponse, draftResponse, archivedResponse, deletedResponse] = await Promise.all([
          api.get('/admin/articles', { params: { limit: 1 } }),
          api.get('/admin/articles', { params: { status: 'published', limit: 1 } }),
          api.get('/admin/articles', { params: { status: 'draft', limit: 1 } }),
          api.get('/admin/articles', { params: { status: 'archived', limit: 1 } }),
          api.get('/admin/articles', { params: { status: 'deleted', limit: 1 } })
        ]);

        statsData.value = {
          total: allResponse.data.pagination?.total || 0,
          published: publishedResponse.data.pagination?.total || 0,
          draft: draftResponse.data.pagination?.total || 0,
          archived: archivedResponse.data.pagination?.total || 0,
          deleted: deletedResponse.data.pagination?.total || 0
        };
      } catch (error) {
        console.error('加载统计数据失败:', error);
      }
    };

    // 加载作者列表
    const loadAuthors = async () => {
      try {
        const response = await api.get('/admin/users', {
          params: { limit: 1000 }
        });
        // 后端返回的数据结构是 { data: { users: [...] } }
        const users = response.data.data?.users || [];
        authorList.value = users.map(user => ({
          id: user._id,
          username: user.username,
          avatar: user.avatar
        }));
      } catch (error) {
        console.error('加载作者列表失败:', error);
      }
    };

    // 加载文章列表
    const loadArticles = async () => {
      loading.value = true;
      try {
        const params = {
          page: currentPage.value,
          limit: pageSize.value
        };

        // 添加搜索参数
        if (searchForm.value.keyword) {
          params.search = searchForm.value.keyword;
        }

        // 添加作者筛选
        if (searchForm.value.authorId) {
          params.authorId = searchForm.value.authorId;
        }

        // 添加状态筛选
        if (activeTab.value !== 'all') {
          params.status = activeTab.value;
        }

        // 添加时间筛选
        if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
          params.startDate = searchForm.value.dateRange[0];
          params.endDate = searchForm.value.dateRange[1];
          params.timeType = searchForm.value.timeType;
        }

        const response = await api.get('/admin/articles', { params });
        const data = response.data.data || [];

        // 转换数据格式
        articles.value = data.map(article => ({
          id: article._id,
          title: article.title,
          summary: article.excerpt,
          content: article.content,
          category: article.category,
          tags: article.tags || [],
          status: article.status,
          author: article.author ? {
            id: article.author._id,
            username: article.author.username,
            avatar: article.author.avatar
          } : null,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt
        }));

        total.value = response.data.pagination?.total || 0;
      } catch (error) {
        ElMessage.error('加载文章列表失败：' + (error.response?.data?.message || error.message));
      } finally {
        loading.value = false;
      }
    };

    // 监听activeTab变化
    watch(activeTab, () => {
      currentPage.value = 1;
      loadArticles();
    });

    onMounted(() => {
      loadStats();
      loadArticles();
      loadAuthors();
    });

    return {
      loading,
      activeTab,
      articles,
      authorList,
      currentPage,
      pageSize,
      total,
      showAdvancedSearch,
      quickTimeFilter,
      searchForm,
      selectedArticles,
      stats,
      filteredArticles,
      getCategoryName,
      getStatusText,
      getStatusTagType,
      formatDate,
      editArticle,
      publishArticle,
      archiveArticle,
      deleteArticle,
      restoreArticle,
      permanentDeleteArticle,
      handleSelectionChange,
      batchRestore,
      batchPermanentDelete,
      toggleAdvancedSearch,
      handleSearch,
      handleReset,
      handleQuickTimeFilter,
      handleSizeChange,
      handleCurrentChange
    };
  }
};
</script>

<style scoped>
.article-management {
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* 页面标题 */
.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
}

.page-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

/* 状态统计卡片 */
.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card.active {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.stat-content {
  text-align: center;
  padding: 8px 0;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.deleted-card {
  border-color: #f56c6c;
}

.deleted-card .stat-number {
  color: #f56c6c;
}

.deleted-card.active {
  border-color: #f56c6c;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.2);
}

/* 搜索卡片 */
.search-card {
  margin-bottom: 24px;
  border: 1px solid #e4e7ed;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-form {
  margin-bottom: 0;
}

.search-form .el-form-item {
  margin-bottom: 16px;
}

.advanced-search {
  padding-top: 16px;
}

.author-option {
  display: flex;
  align-items: center;
}

/* 内容卡片 */
.content-card {
  border: 1px solid #e4e7ed;
}

.loading-container,
.empty-container {
  padding: 40px;
  text-align: center;
}

.articles-table {
  margin-top: 16px;
}

.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 16px;
}

.selected-count {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.batch-actions .el-button {
  margin-left: 12px;
}

.article-title-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.title-text {
  cursor: pointer;
  color: #409eff;
  text-decoration: none;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-text:hover {
  text-decoration: underline;
}

.author-cell {
  display: flex;
  align-items: center;
}

.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

/* 表格样式 */
:deep(.el-table__row:hover) {
  background-color: #f8f9fa;
}

:deep(.el-tag) {
  font-weight: 500;
}

:deep(.el-table__fixed-right) {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-cards .el-col {
    margin-bottom: 16px;
  }

  .search-form {
    flex-direction: column;
    align-items: stretch;
  }

  .search-form .el-form-item {
    width: 100%;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}

@media (max-width: 768px) {
  .article-management {
    padding: 16px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .stat-number {
    font-size: 24px;
  }

  .articles-table {
    overflow-x: auto;
  }
}
</style>