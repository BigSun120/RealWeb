<template>
  <div class="admin-settings">
    <div class="settings-header">
      <h1>系统设置</h1>
      <p>管理网站的基本配置和个人信息</p>
    </div>

    <div class="settings-content">
      <!-- 网站基本信息 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon><Setting /></el-icon>
            <span>网站基本信息</span>
          </div>
        </template>

        <el-form :model="siteInfo" label-width="100px" class="settings-form">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="网站名称">
                <el-input v-model="siteInfo.name" placeholder="我的个人网站" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系邮箱">
                <el-input v-model="siteInfo.email" placeholder="admin@example.com" />
                <div class="field-tip">网站的主要联系邮箱，显示在页面底部</div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="网站描述">
            <el-input
              v-model="siteInfo.description"
              type="textarea"
              :rows="3"
              placeholder="简单介绍一下你的网站..."
            />
          </el-form-item>

          <el-form-item label="网站Logo">
            <div class="logo-upload">
              <el-upload
                class="logo-uploader"
                :action="uploadUrl"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleLogoSuccess"
                :before-upload="beforeLogoUpload"
                name="image"
                accept="image/*"
              >
                <img v-if="siteInfo.logo" :src="siteInfo.logo" class="logo-preview" />
                <el-icon v-else class="logo-uploader-icon"><Plus /></el-icon>
              </el-upload>
              <div class="logo-tips">
                <p>建议尺寸：200x60px，支持 JPG、PNG 格式</p>
              </div>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveSiteInfo" :loading="saving">
              保存网站信息
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 个人信息 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>个人信息</span>
          </div>
        </template>

        <el-form :model="personalInfo" label-width="100px" class="settings-form">
          <el-form-item label="个人简介">
            <el-input
              v-model="personalInfo.bio"
              type="textarea"
              :rows="4"
              placeholder="介绍一下你自己..."
            />
          </el-form-item>

          <el-form-item label="社交链接">
            <div class="social-links">
              <div class="social-item">
                <el-icon><Link /></el-icon>
                <span class="social-label">GitHub:</span>
                <el-input v-model="personalInfo.github" placeholder="https://github.com/username" />
              </div>
              <div class="social-item">
                <el-icon><Link /></el-icon>
                <span class="social-label">微博:</span>
                <el-input v-model="personalInfo.weibo" placeholder="https://weibo.com/username" />
              </div>
              <div class="social-item">
                <el-icon><Link /></el-icon>
                <span class="social-label">个人邮箱:</span>
                <el-input v-model="personalInfo.email" placeholder="personal@email.com（可选，如与联系邮箱不同）" />
              </div>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="savePersonalInfo" :loading="saving">
              保存个人信息
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 博客设置 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>博客设置</span>
          </div>
        </template>

        <el-form :model="blogSettings" label-width="100px" class="settings-form">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="默认分类">
                <el-select v-model="blogSettings.defaultCategory" placeholder="选择默认分类">
                  <el-option label="技术分享" value="tech" />
                  <el-option label="生活随笔" value="life" />
                  <el-option label="学习笔记" value="study" />
                  <el-option label="项目经验" value="project" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="每页文章数">
                <el-input-number v-model="blogSettings.pageSize" :min="5" :max="50" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="功能开关">
            <div class="feature-switches">
              <el-switch
                v-model="blogSettings.enableComments"
                active-text="开启评论"
                inactive-text="关闭评论"
              />
              <el-switch
                v-model="blogSettings.enableLikes"
                active-text="开启点赞"
                inactive-text="关闭点赞"
              />
              <el-switch
                v-model="blogSettings.enableShare"
                active-text="开启分享"
                inactive-text="关闭分享"
              />
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveBlogSettings" :loading="saving">
              保存博客设置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>


    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Setting, User, Document, Plus, Link
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import api from '@/api';

export default {
  name: 'AdminSettings',
  components: {
    Setting, User, Document, Plus, Link
  },
  setup() {
    const userStore = useUserStore();
    const saving = ref(false);

    // 网站基本信息
    const siteInfo = ref({
      name: '我的个人网站',
      description: '分享技术与生活的个人博客',
      email: 'admin@example.com',
      logo: ''
    });

    // 个人信息
    const personalInfo = ref({
      bio: '',
      github: '',
      weibo: '',
      email: ''
    });

    // 博客设置
    const blogSettings = ref({
      defaultCategory: 'other',
      pageSize: 10,
      enableComments: true,
      enableLikes: true,
      enableShare: true
    });



    // 上传配置
    const uploadUrl = computed(() => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      return `${baseUrl}/articles/upload-image`;
    });
    const uploadHeaders = computed(() => ({
      'Authorization': `Bearer ${userStore.token}`
    }));

    // 保存网站信息
    const saveSiteInfo = async () => {
      saving.value = true;
      try {
        // 处理数据，确保不发送空字符串
        const dataToSave = {
          name: siteInfo.value.name || '我的个人网站',
          description: siteInfo.value.description || '分享技术与生活的个人博客',
          email: siteInfo.value.email || '',
          logo: siteInfo.value.logo || ''
        };

        await api.put('/admin/settings/site', dataToSave);
        ElMessage.success('网站信息保存成功');
      } catch (error) {
        console.error('保存网站信息失败:', error);
        ElMessage.error('保存网站信息失败：' + (error.response?.data?.message || error.message));
      } finally {
        saving.value = false;
      }
    };

    // 保存个人信息
    const savePersonalInfo = async () => {
      saving.value = true;
      try {
        // 处理数据，确保格式正确
        const dataToSave = {
          bio: personalInfo.value.bio || '',
          github: personalInfo.value.github || '',
          weibo: personalInfo.value.weibo || '',
          email: personalInfo.value.email || ''
        };

        await api.put('/admin/settings/personal', dataToSave);
        ElMessage.success('个人信息保存成功');
      } catch (error) {
        console.error('保存个人信息失败:', error);
        ElMessage.error('保存个人信息失败：' + (error.response?.data?.message || error.message));
      } finally {
        saving.value = false;
      }
    };

    // 保存博客设置
    const saveBlogSettings = async () => {
      saving.value = true;
      try {
        // 处理数据，确保格式正确
        const dataToSave = {
          defaultCategory: blogSettings.value.defaultCategory || 'other',
          pageSize: Number(blogSettings.value.pageSize) || 10,
          enableComments: Boolean(blogSettings.value.enableComments),
          enableLikes: Boolean(blogSettings.value.enableLikes),
          enableShare: Boolean(blogSettings.value.enableShare)
        };

        await api.put('/admin/settings/blog', dataToSave);
        ElMessage.success('博客设置保存成功');
      } catch (error) {
        console.error('保存博客设置失败:', error);
        ElMessage.error('保存博客设置失败：' + (error.response?.data?.message || error.message));
      } finally {
        saving.value = false;
      }
    };

    // Logo上传成功
    const handleLogoSuccess = (response) => {
      if (response.code === 200) {
        siteInfo.value.logo = response.data.url;
        ElMessage.success('Logo上传成功');
      } else {
        ElMessage.error('Logo上传失败');
      }
    };

    // Logo上传前验证
    const beforeLogoUpload = (file) => {
      const isImage = file.type.startsWith('image/');
      const isLt2M = file.size / 1024 / 1024 < 2;

      if (!isImage) {
        ElMessage.error('只能上传图片文件!');
        return false;
      }
      if (!isLt2M) {
        ElMessage.error('图片大小不能超过 2MB!');
        return false;
      }
      return true;
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('zh-CN');
    };



    // 加载所有设置
    const loadAllSettings = async () => {
      try {
        const response = await api.get('/admin/settings');
        const settings = response.data.data;

        // 更新各个设置
        if (settings.site) {
          Object.assign(siteInfo.value, settings.site);
        }
        if (settings.personal) {
          Object.assign(personalInfo.value, settings.personal);
        }
        if (settings.blog) {
          Object.assign(blogSettings.value, settings.blog);
        }
      } catch (error) {
        console.error('加载设置失败:', error);
        // 使用默认值，不显示错误消息
      }
    };

    onMounted(() => {
      loadAllSettings();
    });

    return {
      userStore,
      siteInfo,
      personalInfo,
      blogSettings,
      saving,
      uploadUrl,
      uploadHeaders,
      saveSiteInfo,
      savePersonalInfo,
      saveBlogSettings,
      handleLogoSuccess,
      beforeLogoUpload,
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
  max-width: 1000px;
  margin: 0 auto;
}

.settings-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
}

.settings-form {
  padding: 8px 0;
}

/* Logo上传样式 */
.logo-upload {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.logo-uploader {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.logo-uploader:hover {
  border-color: #409eff;
}

.logo-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-preview {
  width: 120px;
  height: 60px;
  object-fit: contain;
  display: block;
}

.logo-tips {
  flex: 1;
}

.logo-tips p {
  margin: 0;
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

/* 社交链接样式 */
.social-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.social-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.social-label {
  min-width: 60px;
  font-size: 14px;
  color: #666;
}

/* 功能开关样式 */
.feature-switches {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 字段提示样式 */
.field-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  line-height: 1.4;
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
