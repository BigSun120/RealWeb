<template>
  <div class="admin-settings">
    <!-- 右侧浮窗目录 -->
    <div class="settings-nav-float" v-show="showFloatNav">
      <div class="nav-header">
        <span>快捷导航</span>
        <el-icon class="close-btn" @click="showFloatNav = false"><Close /></el-icon>
      </div>
      <div class="nav-list">
        <div
          v-for="section in navSections"
          :key="section.id"
          class="nav-item"
          :class="{ active: activeSection === section.id }"
          @click="scrollToSection(section.id)"
        >
          <el-icon>
            <component :is="section.icon" />
          </el-icon>
          <span>{{ section.title }}</span>
        </div>
      </div>
    </div>

    <!-- 浮窗切换按钮 -->
    <div class="float-nav-toggle" @click="showFloatNav = !showFloatNav">
      <el-icon><Menu /></el-icon>
    </div>

    <div class="settings-header">
      <h1>系统设置</h1>
      <p>管理网站的基本配置和个人信息</p>
    </div>

    <div class="settings-content">
      <!-- 网站基本信息 -->
      <el-card id="site-info" class="settings-card">
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
                <el-input v-model="siteInfo.name" placeholder="我的网站" />
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

      <!-- 公告展示设置 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon><Setting /></el-icon>
            <span>公告展示设置</span>
          </div>
        </template>
        <el-form label-width="120px" class="settings-form">
          <el-form-item label="前台展示位置">
            <el-checkbox-group v-model="noticePlacements">
              <el-checkbox label="banner">顶部横幅（Banner）</el-checkbox>
              <el-checkbox label="dropdown">头部下拉（Dropdown）</el-checkbox>
            </el-checkbox-group>
            <div class="field-tip">可多选；未勾选则前台不显示公告</div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingPlacements" @click="savePlacements">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 个人信息 -->
      <el-card id="personal-info" class="settings-card">
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
                <el-input
                  v-model="personalInfo.email"
                  placeholder="personal@email.com（可选，如与联系邮箱不同）"
                />
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
      <el-card id="blog-settings" class="settings-card">
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

      <!-- 文件上传设置 -->
      <el-card id="upload-settings" class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon><Upload /></el-icon>
            <span>文件上传设置</span>
          </div>
        </template>

        <el-form label-width="120px" class="settings-form">
          <el-form-item label="最大文件大小">
            <el-input-number
              v-model="uploadSettings.maxFileSize"
              :min="1"
              :max="100"
              style="width: 200px"
            />
            <span style="margin-left: 8px">MB</span>
            <div class="field-tip">单个文件的最大上传大小，影响头像、文章图片、背景图片等所有上传功能</div>
          </el-form-item>

          <el-form-item label="允许的文件类型">
            <el-select
              v-model="uploadSettings.allowedTypes"
              multiple
              placeholder="选择允许的文件类型"
              style="width: 100%"
            >
              <el-option label="图片 (JPEG)" value="image/jpeg" />
              <el-option label="图片 (PNG)" value="image/png" />
              <el-option label="图片 (GIF)" value="image/gif" />
              <el-option label="图片 (WebP)" value="image/webp" />
              <el-option label="文本文件" value="text/plain" />
              <el-option label="JSON文件" value="application/json" />
              <el-option label="PDF文件" value="application/pdf" />
            </el-select>
            <div class="field-tip">选择允许上传的文件类型</div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveUploadSettings" :loading="savingUpload">
              保存上传设置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 用户注册默认配置 -->
      <el-card id="user-defaults" class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon><UserFilled /></el-icon>
            <span>用户注册默认配置</span>
          </div>
        </template>

        <el-form label-width="120px" class="settings-form">
          <el-form-item label="默认角色">
            <el-select v-model="newUserDefaults.role" placeholder="选择角色" style="width: 260px">
              <el-option label="普通用户" value="user" />
              <el-option label="博主" value="blogger" />
              <el-option label="版主" value="moderator" />
              <el-option label="管理员" value="admin" />
            </el-select>
          </el-form-item>

          <el-form-item label="默认权限">
            <el-select
              v-model="newUserDefaults.permissions"
              multiple
              collapse-tags
              placeholder="选择权限"
              style="width: 100%"
            >
              <el-option
                v-for="perm in permissionsOptions"
                :key="perm.value"
                :label="perm.label"
                :value="perm.value"
              />
            </el-select>
            <div class="field-tip">如设置角色为管理员，权限选项将被忽略</div>
          </el-form-item>

          <el-form-item label="默认启用">
            <el-switch v-model="newUserDefaults.isActive" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveNewUserDefaults"
              >保存默认配置</el-button
            >
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Setting, User, Document, Plus, Link, UserFilled, Upload, Menu, Close } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { useSettingsStore } from '@/stores/settings';
import api from '@/api';
import configsApi from '@/api/admin/configs';

export default {
  name: 'AdminSettings',
  components: {
    Setting,
    User,
    Document,
    Plus,
    Link,
    UserFilled,
    Upload,
    Menu,
    Close
  },
  setup() {
    const userStore = useUserStore();
    const settingsStore = useSettingsStore();
    const saving = ref(false);
    const savingUpload = ref(false);

    // 浮窗导航相关
    const showFloatNav = ref(false);
    const activeSection = ref('site-info');

    // 导航栏目
    const navSections = ref([
      { id: 'site-info', title: '网站信息', icon: 'Setting' },
      { id: 'personal-info', title: '个人信息', icon: 'User' },
      { id: 'blog-settings', title: '博客设置', icon: 'Document' },
      { id: 'upload-settings', title: '上传设置', icon: 'Upload' },
      { id: 'user-defaults', title: '用户配置', icon: 'UserFilled' }
    ]);

    // 滚动到指定区域
    const scrollToSection = (sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        activeSection.value = sectionId;
        showFloatNav.value = false;
      }
    };

    // 文件上传设置
    const uploadSettings = ref({
      maxFileSize: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    // 公告展示设置
    const noticePlacements = ref(['banner','dropdown']);
    const savingPlacements = ref(false);


    // 保存公告展示位置
    const savePlacements = async () => {
      try {
        savingPlacements.value = true;
        const { savePublicNoticePlacements } = await import('@/api/admin');
        await savePublicNoticePlacements(noticePlacements.value);
        ElMessage.success('公告展示设置已保存');
      } catch (e) {
        ElMessage.error('保存失败');
      } finally {
        savingPlacements.value = false;
      }
    };

    // 读取公告展示位置配置
    const loadPlacements = async () => {
      try {
        const { getPublicNoticePlacements } = await import('@/api/admin');
        const res = await getPublicNoticePlacements();
        const val = res.data?.data?.value;
        if (Array.isArray(val) && val.length) {
          noticePlacements.value = val;
        }
      } catch (_) {}
    };

    // 网站基本信息
    const siteInfo = ref({
      name: '我的网站',
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
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      // 如果baseUrl已经包含完整URL，直接使用；否则拼接
      if (baseUrl.startsWith('http')) {
        return `${baseUrl}/articles/upload-image`;
      } else {
        return `${baseUrl}/articles/upload-image`;
      }
    });
    const uploadHeaders = computed(() => {
      // 确保使用最新的token，与API拦截器保持一致
      const token = localStorage.getItem('token') || userStore.token;
      return {
        Authorization: `Bearer ${token}`
      };
    });

    // 保存网站信息
    const saveSiteInfo = async () => {
      saving.value = true;
      try {
        // 处理数据，确保不发送空字符串
        const dataToSave = {
          name: siteInfo.value.name || '我的网站',
          description: siteInfo.value.description || '分享技术与生活的个人博客',
          email: siteInfo.value.email || '',
          logo: siteInfo.value.logo || ''
        };

        await api.put('/admin/settings/site', dataToSave);

        // 更新settingsStore，使前端页面立即显示更新后的数据
        settingsStore.updateSiteInfo(dataToSave);

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

        // 更新settingsStore
        settingsStore.updatePersonalInfo(dataToSave);

        ElMessage.success('个人信息保存成功');
      } catch (error) {
        console.error('保存个人信息失败:', error);
        ElMessage.error('保存个人信息失败：' + (error.response?.data?.message || error.message));
      } finally {
        saving.value = false;
      }
    };

    // 新用户默认配置
    const newUserDefaults = ref({
      role: 'user',
      permissions: [],
      isActive: true
    });

    const permissionsOptions = ref([]);

    const loadPermissionsOptions = async () => {
      try {
        const res = await api.get('/admin/permissions');
        const values = Array.isArray(res.data?.data) ? res.data.data : [];
        const labelMap = {
          'blog:create': '创建博客',
          'blog:edit': '编辑博客',
          'blog:delete': '删除博客',
          'blog:publish': '发布博客',
          'comment:create': '发表评论',
          'comment:edit': '编辑评论',
          'comment:delete': '删除评论',
          'profile:edit': '编辑个人资料',
          'file:upload': '上传文件'
        };
        permissionsOptions.value = values.map(v => ({ value: v, label: labelMap[v] || v }));
      } catch (e) {
        permissionsOptions.value = [];
      }
    };

    const loadNewUserDefaults = async () => {
      try {
        const [roleCfg, permCfg, activeCfg] = await Promise.all([
          api.get('/admin/configs/user.defaultRole'),
          api.get('/admin/configs/user.defaultPermissions'),
          api.get('/admin/configs/user.defaultIsActive')
        ]);
        if (roleCfg.data?.data?.value) newUserDefaults.value.role = roleCfg.data.data.value;
        if (Array.isArray(permCfg.data?.data?.value))
          newUserDefaults.value.permissions = permCfg.data.data.value;
        if (typeof activeCfg.data?.data?.value === 'boolean')
          newUserDefaults.value.isActive = activeCfg.data.data.value;
      } catch (e) {
        // 使用默认值
      }
    };

    const saveNewUserDefaults = async () => {
      try {
        saving.value = true;
        const permsToSave =
          newUserDefaults.value.role === 'admin' ? [] : newUserDefaults.value.permissions;
        await Promise.all([
          api.put('/admin/configs/user.defaultRole', {
            value: newUserDefaults.value.role,
            group: 'user'
          }),
          api.put('/admin/configs/user.defaultPermissions', { value: permsToSave, group: 'user' }),
          api.put('/admin/configs/user.defaultIsActive', {
            value: !!newUserDefaults.value.isActive,
            group: 'user'
          })
        ]);
        ElMessage.success('默认配置已保存');
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '保存失败');
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

        // 更新settingsStore
        settingsStore.updateBlogSettings(dataToSave);

        ElMessage.success('博客设置保存成功');
      } catch (error) {
        console.error('保存博客设置失败:', error);
        ElMessage.error('保存博客设置失败：' + (error.response?.data?.message || error.message));
      } finally {
        saving.value = false;
      }
    };

    // 保存文件上传设置
    const saveUploadSettings = async () => {
      savingUpload.value = true;
      try {
        // 准备配置数据
        const configs = [
          {
            key: 'upload.maxFileSize',
            value: uploadSettings.value.maxFileSize * 1024 * 1024, // 转换为字节
            type: 'number',
            group: 'upload',
            description: '最大文件上传大小（字节）'
          },
          {
            key: 'upload.allowedTypes',
            value: uploadSettings.value.allowedTypes,
            type: 'array',
            group: 'upload',
            description: '允许的文件类型'
          }
        ];

        // 批量保存配置
        await configsApi.setBatchConfigs({ configs });

        ElMessage.success('文件上传设置保存成功');
      } catch (error) {
        console.error('保存文件上传设置失败:', error);
        ElMessage.error('保存文件上传设置失败：' + (error.response?.data?.message || error.message));
      } finally {
        savingUpload.value = false;
      }
    };

    // 加载文件上传设置
    const loadUploadSettings = async () => {
      try {
        const [maxSizeRes, typesRes] = await Promise.allSettled([
          configsApi.getConfig('upload.maxFileSize'),
          configsApi.getConfig('upload.allowedTypes')
        ]);

        if (maxSizeRes.status === 'fulfilled' && maxSizeRes.value.data?.value !== undefined) {
          const sizeInBytes = maxSizeRes.value.data.value;
          // 从字节转换为MB
          uploadSettings.value.maxFileSize = Math.round(sizeInBytes / (1024 * 1024));
        } else {
          uploadSettings.value.maxFileSize = 10; // 默认10MB
        }

        if (typesRes.status === 'fulfilled' && typesRes.value.data?.value) {
          uploadSettings.value.allowedTypes = typesRes.value.data.value;
        } else {
          uploadSettings.value.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']; // 默认类型
        }
      } catch (error) {
        console.error('加载文件上传设置失败:', error);
      }
    };

    // Logo上传成功
    const handleLogoSuccess = response => {
      if (response.code === 200) {
        siteInfo.value.logo = response.data.url;

        // 立即更新settingsStore，使前端页面立即显示新Logo
        settingsStore.updateSiteInfo({ logo: response.data.url });

        ElMessage.success('Logo上传成功');
      } else {
        ElMessage.error('Logo上传失败');
      }
    };

    // Logo上传前验证
    const beforeLogoUpload = file => {
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
    const formatDate = dateString => {
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
      loadNewUserDefaults();
      loadPermissionsOptions();
      loadPlacements();
      loadUploadSettings();
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
      formatDate,
      newUserDefaults,
      permissionsOptions,
      saveNewUserDefaults,

      // 公告展示设置
      noticePlacements,
      savingPlacements,
      savePlacements,

      // 文件上传设置
      uploadSettings,
      savingUpload,
      saveUploadSettings,

      // 浮窗导航
      showFloatNav,
      activeSection,
      navSections,
      scrollToSection
    };
  }
};
</script>

<style scoped>
/* 浮窗导航样式 */
.settings-nav-float {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  width: 200px;
  max-height: 80vh; /* 限制最大高度 */
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  z-index: 1000;
  overflow: hidden;
  pointer-events: auto; /* 确保可以交互 */
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.close-btn {
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #ef4444;
}

.nav-list {
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #6b7280;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #374151;
}

.nav-item.active {
  background: #ecfdf5;
  color: #059669;
  border-right: 3px solid #10b981;
}

.nav-item .el-icon {
  font-size: 16px;
}

/* 浮窗切换按钮 */
.float-nav-toggle {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
  z-index: 999;
  transition: all 0.3s;
  pointer-events: auto; /* 确保可以交互 */
}

.float-nav-toggle:hover {
  background: #059669;
  transform: translateY(-50%) scale(1.1);
}

.float-nav-toggle .el-icon {
  color: white;
  font-size: 20px;
}

/* 主体样式 */
.admin-settings {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 20px;
  position: relative;
  overflow-x: hidden; /* 防止水平滚动条 */
}

.settings-header {
  text-align: center;
  margin-bottom: 32px;
}

.settings-header h1 {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.settings-header p {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.settings-content {
  max-width: calc(100% - 100px); /* 为浮窗留出空间 */
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-card {
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  background: #ffffff;
  transition: all 0.3s ease;
}

.settings-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.card-header .el-icon {
  font-size: 22px;
  color: #10b981;
}

.settings-form {
  padding: 24px;
}

.settings-form .el-form-item {
  margin-bottom: 24px;
}

.settings-form .el-button--primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s;
}

.settings-form .el-button--primary:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
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
  gap: 16px;
}

.social-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.social-item .el-icon {
  color: #10b981;
  font-size: 18px;
}

.social-label {
  min-width: 80px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

/* 功能开关样式 */
.feature-switches {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-switches .el-switch {
  --el-switch-on-color: #10b981;
}

/* 字段提示样式 */
.field-tip {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
  line-height: 1.5;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #10b981;
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
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .settings-content {
    max-width: calc(100% - 80px);
  }

  .settings-nav-float {
    width: 180px;
  }
}

@media (max-width: 768px) {
  .admin-settings {
    padding: 16px;
  }

  .settings-content {
    max-width: 100%;
  }

  .settings-nav-float {
    right: 10px;
    width: 160px;
  }

  .float-nav-toggle {
    right: 10px;
    width: 44px;
    height: 44px;
  }

  .settings-header h1 {
    font-size: 28px;
  }

  .card-header {
    padding: 16px 20px;
    font-size: 16px;
  }

  .settings-form {
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .stat-number {
    font-size: 24px;
  }

  .stat-item {
    padding: 20px;
  }
}
</style>
