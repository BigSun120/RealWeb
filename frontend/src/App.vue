<template>
  <div id="app" class="page-container">
    <!-- 管理员页面和认证页面使用独立布局 -->
    <template v-if="isAdminRoute || isAuthRoute">
      <router-view />
    </template>

    <!-- 普通页面使用默认布局 -->
    <template v-else>
      <AppHeader />
      <!-- 邮箱验证横幅 -->
      <EmailVerificationBanner />
      <main class="main-content content-wrapper">
        <router-view />
      </main>
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

export default {
  name: 'App',
  components: {
    AppHeader,
    AppFooter,
    EmailVerificationBanner
  },
  setup() {
    const route = useRoute();

    // 判断是否为管理员路由
    const isAdminRoute = computed(() => {
      return route.path.startsWith('/admin');
    });

    // 判断是否为认证路由（登录、注册、验证等页面）
    const isAuthRoute = computed(() => {
      return route.path.startsWith('/auth');
    });

    return {
      isAdminRoute,
      isAuthRoute
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
</style>
