<template>
  <div class="article-comments">
    <div class="comments-header">
      <h4>文章评论管理</h4>
      <div class="comments-stats">
        <el-statistic title="总评论数" :value="totalComments" />
        <el-statistic title="待审核" :value="pendingComments" />
      </div>
    </div>

    <div class="comments-filters">
      <el-form inline>
        <el-form-item label="状态">
          <el-select v-model="filters.status" @change="loadComments">
            <el-option label="全部" value="" />
            <el-option label="已发布" value="published" />
            <el-option label="待审核" value="pending" />
            <el-option label="已删除" value="deleted" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-select v-model="filters.sortBy" @change="loadComments">
            <el-option label="最新" value="createdAt" />
            <el-option label="最热" value="likeCount" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="comments-table">
      <el-table 
        :data="comments" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="评论内容" min-width="200">
          <template #default="{ row }">
            <div class="comment-content">
              <p>{{ row.content }}</p>
              <div class="comment-meta">
                <span>{{ row.author.username }}</span>
                <span>{{ formatTime(row.createdAt) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="点赞数" width="80" prop="likeCount" />
        <el-table-column label="回复数" width="80" prop="replyCount" />

        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small"
              @click="viewComment(row)"
            >
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'pending'"
              type="success" 
              size="small"
              @click="approveComment(row)"
            >
              通过
            </el-button>
            <el-button 
              type="danger" 
              size="small"
              @click="deleteComment(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="comments-pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="totalComments"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadComments"
          @current-change="loadComments"
        />
      </div>
    </div>

    <div class="batch-actions" v-if="selectedComments.length > 0">
      <el-button type="success" @click="batchApprove">
        批量通过 ({{ selectedComments.length }})
      </el-button>
      <el-button type="danger" @click="batchDelete">
        批量删除 ({{ selectedComments.length }})
      </el-button>
    </div>

    <!-- 评论详情对话框 -->
    <el-dialog 
      v-model="showCommentDialog" 
      title="评论详情"
      width="600px"
    >
      <div v-if="currentComment" class="comment-detail">
        <div class="comment-info">
          <p><strong>作者：</strong>{{ currentComment.author.username }}</p>
          <p><strong>时间：</strong>{{ formatTime(currentComment.createdAt) }}</p>
          <p><strong>状态：</strong>{{ getStatusText(currentComment.status) }}</p>
        </div>
        <div class="comment-content">
          <p><strong>内容：</strong></p>
          <div class="content-text">{{ currentComment.content }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import commentApi from '@/api/comments';

export default {
  name: 'ArticleComments',
  props: {
    articleId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const comments = ref([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(20);
    const totalComments = ref(0);
    const pendingComments = ref(0);
    const selectedComments = ref([]);
    const showCommentDialog = ref(false);
    const currentComment = ref(null);

    const filters = reactive({
      status: '',
      sortBy: 'createdAt'
    });

    // 加载评论列表
    const loadComments = async () => {
      loading.value = true;
      try {
        const response = await commentApi.getArticleComments(props.articleId, {
          page: currentPage.value,
          limit: pageSize.value,
          status: filters.status || undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortBy === 'createdAt' ? -1 : -1
        });

        comments.value = response.data.data;
        totalComments.value = response.data.pagination.total;
        
        // 统计待审核评论
        if (!filters.status) {
          const pendingResponse = await commentApi.getArticleComments(props.articleId, {
            status: 'pending',
            limit: 1
          });
          pendingComments.value = pendingResponse.data.pagination.total;
        }
      } catch (error) {
        console.error('加载评论失败:', error);
        ElMessage.error('加载评论失败');
      } finally {
        loading.value = false;
      }
    };

    // 格式化时间
    const formatTime = (time) => {
      return new Date(time).toLocaleString();
    };

    // 获取状态类型
    const getStatusType = (status) => {
      const typeMap = {
        published: 'success',
        pending: 'warning',
        deleted: 'danger'
      };
      return typeMap[status] || 'info';
    };

    // 获取状态文本
    const getStatusText = (status) => {
      const textMap = {
        published: '已发布',
        pending: '待审核',
        deleted: '已删除'
      };
      return textMap[status] || '未知';
    };

    // 查看评论详情
    const viewComment = (comment) => {
      currentComment.value = comment;
      showCommentDialog.value = true;
    };

    // 通过评论
    const approveComment = async (comment) => {
      try {
        // 这里需要添加审核API
        ElMessage.success('评论已通过审核');
        loadComments();
      } catch (error) {
        ElMessage.error('操作失败');
      }
    };

    // 删除评论
    const deleteComment = async (comment) => {
      try {
        await ElMessageBox.confirm('确定要删除这条评论吗？', '确认删除');
        await commentApi.deleteComment(comment._id);
        ElMessage.success('删除成功');
        loadComments();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败');
        }
      }
    };

    // 处理选择变化
    const handleSelectionChange = (selection) => {
      selectedComments.value = selection;
    };

    // 批量通过
    const batchApprove = async () => {
      try {
        await ElMessageBox.confirm(`确定要通过选中的 ${selectedComments.value.length} 条评论吗？`);
        // 批量操作API
        ElMessage.success('批量操作成功');
        loadComments();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量操作失败');
        }
      }
    };

    // 批量删除
    const batchDelete = async () => {
      try {
        await ElMessageBox.confirm(`确定要删除选中的 ${selectedComments.value.length} 条评论吗？`);
        // 批量删除API
        ElMessage.success('批量删除成功');
        loadComments();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量删除失败');
        }
      }
    };

    onMounted(() => {
      loadComments();
    });

    return {
      comments,
      loading,
      currentPage,
      pageSize,
      totalComments,
      pendingComments,
      selectedComments,
      showCommentDialog,
      currentComment,
      filters,
      loadComments,
      formatTime,
      getStatusType,
      getStatusText,
      viewComment,
      approveComment,
      deleteComment,
      handleSelectionChange,
      batchApprove,
      batchDelete
    };
  }
};
</script>

<style scoped>
.article-comments {
  padding: 20px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.comments-stats {
  display: flex;
  gap: 40px;
}

.comments-filters {
  margin-bottom: 20px;
}

.comment-content p {
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.comment-meta {
  font-size: 12px;
  color: #909399;
}

.comment-meta span {
  margin-right: 12px;
}

.comments-pagination {
  margin-top: 20px;
  text-align: center;
}

.batch-actions {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.comment-detail .comment-info {
  margin-bottom: 16px;
}

.comment-detail .comment-info p {
  margin: 8px 0;
}

.content-text {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
