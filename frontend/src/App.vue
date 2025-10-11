<template>
  <div id="app" class="page-container">
    <!-- 管理员页面使用独立布局 -->
    <template v-if="isAdminRoute">
      <router-view />
    </template>

    <!-- 认证页面使用背景管理器但无头尾 -->
    <template v-else-if="isAuthRoute">
      <GlobalBackgroundManager>
        <router-view />
      </GlobalBackgroundManager>
    </template>

    <!-- 普通页面使用默认布局 -->
    <template v-else>
      <!-- 全局背景管理器 -->
      <GlobalBackgroundManager>
        <!-- 认证状态监控 -->
        <AuthGuard />
        <AppHeader />
        <!-- 公告横幅（显示位置由管理端设置控制，默认展示） -->
        <PublicNoticeBanner :placements="uiPlacements" />
        <!-- 邮箱验证横幅 - 只在特定页面显示 -->
        <EmailVerificationBanner v-if="shouldShowEmailVerificationBanner" />
        <main class="main-content content-wrapper"
          :class="{ 'tools-page': isToolsRoute, 'blog-list': isBlogListRoute }">
          <router-view />
        </main>
        <!-- 公告预览大弹窗（全局） -->
        <PublicNoticeViewer />

        <AppFooter />
      </GlobalBackgroundManager>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import EmailVerificationBanner from '@/components/EmailVerificationBanner.vue';
import PublicNoticeBanner from '@/components/PublicNoticeBanner.vue';
import PublicNoticeViewer from '@/components/PublicNoticeViewer.vue';
import GlobalBackgroundManager from '@/components/GlobalBackgroundManager.vue';
import AuthGuard from '@/components/AuthGuard.vue';

export default {
  name: 'App',
  components: {
    AppHeader,
    AppFooter,
    EmailVerificationBanner,
    PublicNoticeBanner,
    PublicNoticeViewer,
    GlobalBackgroundManager,
    AuthGuard
  },
  setup() {
    const route = useRoute();

    // 判断是否为管理员路由
    const isAdminRoute = computed(() => route.path.startsWith('/admin'));
    // 判断是否为认证路由（登录、注册、验证等页面）
    const isAuthRoute = computed(() => route.path.startsWith('/auth'));
    // 判断是否为工具页面
    const isToolsRoute = computed(() => route.path.startsWith('/tools'));
    // 判断是否为博客列表页面
    const isBlogListRoute = computed(() => route.path === '/blog' || route.path.startsWith('/blog?'));

    // 判断是否应该显示邮箱验证横幅
    // 只在需要邮箱验证的功能页面显示，不在首页显示
    const shouldShowEmailVerificationBanner = computed(() => {
      const currentPath = route.path;
      const showOnPaths = [
        '/articles/create',  // 创建文章
        '/articles/edit',    // 编辑文章
        '/profile',          // 个人资料
        '/tools',            // 工具页面
        '/temp-email'        // 临时邮箱
      ];

      return showOnPaths.some(path => currentPath.startsWith(path));
    });

    // 公告展示位置设置（公开读接口）
    const uiPlacements = computed(() => window.__PUBLIC_NOTICE_PLACEMENTS__ || ['banner', 'dropdown']);

    return {
      isAdminRoute,
      isAuthRoute,
      isToolsRoute,
      isBlogListRoute,
      shouldShowEmailVerificationBanner,
      uiPlacements
    };
  }
};
</script>

<style lang="scss">
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  width: 100%;
}

/* 全局弹窗滚动锁定 - 更强大的解决方案 */
body.el-popup-parent--hidden {
  overflow: hidden !important;
  padding-right: 0px !important;
}

/* 确保当弹窗打开时，html和body都不可滚动 */
html.dialog-open,
body.dialog-open {
  overflow: hidden !important;
  position: fixed !important;
  width: 100% !important;
  height: 100% !important;
}

/* 工具页面特殊样式 - 确保背景透明以显示毛玻璃效果 */
.main-content.tools-page {
  background: transparent !important;
}

/* 工具页面的页面容器也要透明 */
.page-container:has(.tools-page) {
  background: transparent !important;
}

/* 全宽布局页面样式 */
body.layout-full-width {
  .main-content {
    max-width: 100% !important;
    padding: 0;
  }
  
  .content-wrapper {
    max-width: 100% !important;
    padding: 0;
  }
}

// Profile页面特殊样式
body.profile-page {
  background: linear-gradient(135deg, #c8e6c8 0%, #d4e6d4 100%);

  #app {
    background: transparent;
  }

  .main-content {
    background: transparent;
    padding: 0;
    margin: 0;
    min-height: auto;
    max-width: none;
    width: 100%;
  }

  .app-footer {
    background: linear-gradient(135deg, #c8e6c8 0%, #d4e6d4 100%);

    .footer-background {
      display: none;
    }

    .container {
      background: transparent;
    }

    // 修改字体颜色为深色
    .footer-content {
      .footer-info {
        h3 {
          color: #2c3e50 !important;
          background: none !important;
          -webkit-text-fill-color: #2c3e50 !important;
        }

        p {
          color: #4a5568 !important;
        }
      }

      .footer-links {
        .link-group {
          h4 {
            color: #2c3e50 !important;
          }

          ul li a {
            color: #4a5568 !important;

            &:hover {
              color: #2c3e50 !important;
            }
          }
        }
      }
    }

    .footer-bottom {
      color: #4a5568 !important;

      a {
        color: #4a5568 !important;

        &:hover {
          color: #2c3e50 !important;
        }
      }
    }
  }
}
</style>
