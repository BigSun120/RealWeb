<template>
  <div class="admin-settings">
    <div class="settings-header">
      <h1>网站设置</h1>
      <p>管理网站的基本配置和信息</p>
    </div>

    <div class="settings-content">
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <span>网站信息</span>
          </div>
        </template>

        <el-form :model="siteInfo" label-width="120px">
          <el-form-item label="网站标题">
            <el-input v-model="siteInfo.title" placeholder="请输入网站标题" />
          </el-form-item>

          <el-form-item label="网站描述">
            <el-input
              v-model="siteInfo.description"
              type="textarea"
              :rows="3"
              placeholder="请输入网站描述"
            />
          </el-form-item>

          <el-form-item label="关键词">
            <el-input v-model="siteInfo.keywords" placeholder="请输入关键词，用逗号分隔" />
          </el-form-item>

          <el-form-item label="联系邮箱">
            <el-input v-model="siteInfo.contactEmail" placeholder="请输入联系邮箱" />
          </el-form-item>

          <el-form-item label="联系电话">
            <el-input v-model="siteInfo.contactPhone" placeholder="请输入联系电话" />
          </el-form-item>

          <el-form-item label="联系地址">
            <el-input v-model="siteInfo.address" placeholder="请输入联系地址" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveSiteInfo">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-card>



      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <span>网站统计</span>
          </div>
        </template>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">{{ stats.totalArticles }}</div>
            <div class="stat-label">总文章数</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.publishedArticles }}</div>
            <div class="stat-label">已发布</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.draftArticles }}</div>
            <div class="stat-label">草稿</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.totalViews }}</div>
            <div class="stat-label">总浏览量</div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';
import api from '@/api';
import { updateSiteSettings, getSiteSettings } from '@/api/admin';

export default {
  name: 'AdminSettings',
  setup() {
    const userStore = useUserStore();

    const siteInfo = ref({
      title: '个人博客',
      description: '分享技术与生活',
      keywords: '博客,技术,生活,分享',
      logo: '',
      contactEmail: 'admin@example.com',
      contactPhone: '',
      address: ''
    });

    const stats = ref({
      totalArticles: 0,
      publishedArticles: 0,
      draftArticles: 0,
      totalViews: 0
    });

    // 保存网站信息
    const saveSiteInfo = async () => {
      try {
        await updateSiteSettings(siteInfo.value);
        ElMessage.success('网站信息保存成功');
      } catch (error) {
        console.error('保存网站信息失败:', error);
        ElMessage.error('保存网站信息失败');
      }
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('zh-CN');
    };

    // 加载统计数据
    const loadStats = async () => {
      try {
        const response = await api.get('/articles/my');
        const articles = response.data.data || [];

        stats.value.totalArticles = articles.length;
        stats.value.publishedArticles = articles.filter(a => a.status === 'published').length;
        stats.value.draftArticles = articles.filter(a => a.status === 'draft').length;
        stats.value.totalViews = articles.reduce((total, article) => total + (article.viewCount || 0), 0);
      } catch (error) {
        console.error('加载统计数据失败:', error);
      }
    };

    // 加载网站设置
    const loadSiteSettings = async () => {
      try {
        const response = await getSiteSettings();
        if (response.data.data) {
          Object.assign(siteInfo.value, response.data.data);
        }
      } catch (error) {
        console.error('加载网站设置失败:', error);
        // 使用默认值，不显示错误消息
      }
    };

    onMounted(() => {
      loadStats();
      loadSiteSettings();
    });

    return {
      userStore,
      siteInfo,
      stats,
      saveSiteInfo,
      formatDate
    };
  }
};
</script>

<style scoped>
.admin-settings {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.settings-header {
  text-align: center;
  margin-bottom: 32px;
}

.settings-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
}

.settings-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
}

.settings-content {
  max-width: 800px;
  margin: 0 auto;
}

.settings-card {
  margin-bottom: 24px;
}

.card-header {
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
}

.admin-info {
  margin-top: 16px;
}

.admin-actions {
  margin-top: 20px;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e8ed;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .admin-settings {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .stat-number {
    font-size: 24px;
  }
}
</style>
