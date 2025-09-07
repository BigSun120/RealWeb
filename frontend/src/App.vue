<template>
  <div id="app" class="page-container">
    <!-- 管理员页面和认证页面使用独立布局 -->
    <template v-if="isAdminRoute || isAuthRoute">
      <router-view />
    </template>

    <!-- 普通页面使用默认布局 -->
    <template v-else>
      <AppHeader />
      <!-- 公告横幅（显示位置由管理端设置控制，默认展示） -->
      <PublicNoticeBanner :placements="uiPlacements" />
      <!-- 邮箱验证横幅 -->
      <EmailVerificationBanner />
      <main class="main-content content-wrapper">
        <router-view />
      </main>
      <!-- 公告预览大弹窗（全局） -->
      <PublicNoticeViewer />

      <AppFooter />
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

export default {
  name: 'App',
  components: {
    AppHeader,
    AppFooter,
    EmailVerificationBanner,
    PublicNoticeBanner,
    PublicNoticeViewer
  },
  setup() {
    const route = useRoute();

    // 判断是否为管理员路由
    const isAdminRoute = computed(() => route.path.startsWith('/admin'));
    // 判断是否为认证路由（登录、注册、验证等页面）
    const isAuthRoute = computed(() => route.path.startsWith('/auth'));

    // 公告展示位置设置（公开读接口）
    const uiPlacements = computed(() => window.__PUBLIC_NOTICE_PLACEMENTS__ || ['banner','dropdown']);

    return {
      isAdminRoute,
      isAuthRoute,
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
    width: 100vw;
    margin-left: calc(-50vw + 50%);
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
