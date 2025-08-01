<template>
  <header class="app-header">
    <div class="container">
      <div class="header-content">
        <!-- Logo -->
        <div class="logo">
          <router-link to="/" class="logo-link">
            <h1>个人网站</h1>
          </router-link>
        </div>

        <!-- 导航菜单 -->
        <nav class="nav-menu">
          <el-menu
            :default-active="activeIndex"
            mode="horizontal"
            @select="handleSelect"
            background-color="transparent"
            text-color="#333"
            active-text-color="#409eff"
          >
            <el-menu-item index="/">首页</el-menu-item>
            <el-menu-item index="/blog">博客</el-menu-item>
            <el-menu-item index="/games">小游戏</el-menu-item>
            <el-menu-item index="/about">关于</el-menu-item>
            <el-menu-item
              v-if="userStore.isAdmin"
              index="/articles/new"
              class="write-article-menu"
            >
              <el-icon><EditPen /></el-icon>
              写文章
            </el-menu-item>
          </el-menu>
        </nav>

        <!-- 用户操作区 -->
        <div class="user-actions">
          <template v-if="userStore.isLoggedIn">
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :src="avatarUrl" :size="32">
                  {{ userStore.user?.username?.charAt(0) }}
                </el-avatar>
                <span class="username">{{ userStore.user?.username }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item v-if="userStore.isAdmin" command="admin">管理后台</el-dropdown-item>
                  <el-dropdown-item v-if="userStore.isAdmin" command="articles">我的文章</el-dropdown-item>
                  <el-dropdown-item v-if="userStore.isAdmin" command="settings">网站设置</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button @click="$router.push('/auth/login')">登录</el-button>
            <el-button type="primary" @click="$router.push('/auth/register')">注册</el-button>
          </template>
        </div>

        <!-- 移动端菜单按钮 -->
        <div class="mobile-menu-btn" @click="showMobileMenu = !showMobileMenu">
          <el-icon><Menu /></el-icon>
        </div>
      </div>
    </div>

    <!-- 移动端菜单 -->
    <div v-if="showMobileMenu" class="mobile-menu">
      <div class="mobile-menu-items">
        <router-link to="/" @click="showMobileMenu = false">首页</router-link>
        <router-link to="/blog" @click="showMobileMenu = false">博客</router-link>
        <router-link to="/games" @click="showMobileMenu = false">小游戏</router-link>
        <router-link to="/about" @click="showMobileMenu = false">关于</router-link>
        <div class="mobile-user-actions">
          <template v-if="userStore.isLoggedIn">
            <router-link to="/write" @click="showMobileMenu = false">写文章</router-link>
            <router-link to="/profile" @click="showMobileMenu = false">个人中心</router-link>
            <a href="#" @click="handleLogout">退出登录</a>
          </template>
          <template v-else>
            <router-link to="/auth/login" @click="showMobileMenu = false">登录</router-link>
            <router-link to="/auth/register" @click="showMobileMenu = false">注册</router-link>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import { EditPen } from '@element-plus/icons-vue';

export default {
  name: 'AppHeader',
  components: {
    EditPen
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const showMobileMenu = ref(false);

    const activeIndex = computed(() => route.path);

    const avatarUrl = computed(() => {
      const avatar = userStore.user?.avatar;
      if (avatar && avatar.startsWith('/uploads/')) {
        return `http://localhost:8000${avatar}`;
      }
      return avatar;
    });

    const handleSelect = (key) => {
      if (key && key !== route.path) {
        router.push(key);
      }
    };

    const handleCommand = (command) => {
      switch (command) {
        case 'profile':
          router.push('/profile');
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'articles':
          router.push('/articles');
          break;
        case 'settings':
          router.push('/admin/settings');
          break;
        case 'logout':
          handleLogout();
          break;
      }
    };

    const handleLogout = () => {
      userStore.logout();
      ElMessage.success('退出登录成功');
      router.push('/');
      showMobileMenu.value = false;
    };

    return {
      userStore,
      activeIndex,
      avatarUrl,
      showMobileMenu,
      handleSelect,
      handleCommand,
      handleLogout
    };
  }
};
</script>

<style lang="scss" scoped>
.app-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
  }

  .logo {
    .logo-link {
      color: #333;
      text-decoration: none;

      h1 {
        font-size: 24px;
        font-weight: bold;
        color: #409eff;
      }
    }
  }

  .nav-menu {
    flex: 1;
    margin: 0 40px;

    :deep(.el-menu) {
      border-bottom: none;
    }
  }

  .user-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.3s;

      &:hover {
        background-color: #f5f7fa;
      }

      .username {
        font-size: 14px;
        color: #333;
      }
    }
  }

  .mobile-menu-btn {
    display: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.3s;

    &:hover {
      background-color: #f5f7fa;
    }
  }

  .mobile-menu {
    display: none;
    background: white;
    border-top: 1px solid #ebeef5;
    padding: 20px;

    .mobile-menu-items {
      display: flex;
      flex-direction: column;
      gap: 16px;

      a {
        color: #333;
        text-decoration: none;
        padding: 8px 0;
        border-bottom: 1px solid #ebeef5;

        &:hover {
          color: #409eff;
        }
      }

      .mobile-user-actions {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #ebeef5;
      }
    }
  }
}

@media (max-width: 768px) {
  .app-header {
    .nav-menu {
      display: none;
    }

    .user-actions {
      display: none;
    }

    .mobile-menu-btn {
      display: block;
    }

    .mobile-menu {
      display: block;
    }
  }
}
</style>
