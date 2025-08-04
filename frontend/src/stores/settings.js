import { defineStore } from 'pinia';
import { getAllPublicSettings } from '@/api/settings';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // 网站基本信息
    site: {
      name: '个人网站',
      description: '分享技术与生活',
      logo: '',
      email: ''
    },
    
    // 个人信息
    personal: {
      bio: '',
      github: '',
      weibo: '',
      email: ''
    },
    
    // 博客设置
    blog: {
      pageSize: 10,
      enableComments: true,
      enableLikes: true,
      enableShare: true
    },
    
    // 加载状态
    loading: false,
    loaded: false
  }),

  getters: {
    // 获取网站标题
    siteTitle: (state) => state.site.name,
    
    // 获取网站描述
    siteDescription: (state) => state.site.description,
    
    // 获取网站Logo
    siteLogo: (state) => state.site.logo,
    
    // 获取联系邮箱
    contactEmail: (state) => state.site.email || state.personal.email,
    
    // 获取个人简介
    personalBio: (state) => state.personal.bio,
    
    // 获取社交链接
    socialLinks: (state) => ({
      github: state.personal.github,
      weibo: state.personal.weibo,
      email: state.personal.email
    }),
    
    // 获取博客配置
    blogConfig: (state) => state.blog,
    
    // 是否已加载
    isLoaded: (state) => state.loaded
  },

  actions: {
    // 加载所有设置
    async loadSettings() {
      if (this.loading) return;
      
      this.loading = true;
      try {
        const response = await getAllPublicSettings();
        const settings = response.data.data;
        
        // 更新状态
        this.site = { ...this.site, ...settings.site };
        this.personal = { ...this.personal, ...settings.personal };
        this.blog = { ...this.blog, ...settings.blog };
        
        this.loaded = true;
      } catch (error) {
        console.error('加载设置失败:', error);
        // 保持默认值
      } finally {
        this.loading = false;
      }
    },
    
    // 更新网站信息
    updateSiteInfo(siteInfo) {
      this.site = { ...this.site, ...siteInfo };
    },
    
    // 更新个人信息
    updatePersonalInfo(personalInfo) {
      this.personal = { ...this.personal, ...personalInfo };
    },
    
    // 更新博客设置
    updateBlogSettings(blogSettings) {
      this.blog = { ...this.blog, ...blogSettings };
    },
    
    // 重置设置
    resetSettings() {
      this.site = {
        name: '个人网站',
        description: '分享技术与生活',
        logo: '',
        email: ''
      };
      this.personal = {
        bio: '',
        github: '',
        weibo: '',
        email: ''
      };
      this.blog = {
        pageSize: 10,
        enableComments: true,
        enableLikes: true,
        enableShare: true
      };
      this.loaded = false;
    }
  }
});
