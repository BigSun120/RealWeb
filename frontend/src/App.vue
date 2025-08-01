<template>
  <div id="app">
    <!-- 管理员页面使用独立布局 -->
    <template v-if="isAdminRoute">
      <router-view />
    </template>

    <!-- 普通页面使用默认布局 -->
    <template v-else>
      <AppHeader />
      <main class="main-content">
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

export default {
  name: 'App',
  components: {
    AppHeader,
    AppFooter
  },
  setup() {
    const route = useRoute();

    // 判断是否为管理员路由
    const isAdminRoute = computed(() => {
      return route.path.startsWith('/admin');
    });

    return {
      isAdminRoute
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
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .main-content {
    padding: 10px;
  }
}
</style>
