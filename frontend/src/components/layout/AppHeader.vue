<template>
  <header
    class="app-header"
    :class="{ 'header-hidden': isAtTop && isHomePage, 'header-visible': !isAtTop || !isHomePage }"
    data-aos="fade-down"
    data-aos-duration="1000"
  >
    <div class="container">
      <div class="header-content">
        <!-- Logo -->
        <div class="logo">
          <router-link to="/" class="logo-link">
            <img
              v-if="settingsStore.siteLogo"
              :src="settingsStore.siteLogo"
              :alt="settingsStore.siteTitle || '网站'"
              class="logo-image"
            />
            <h1 v-else>{{ settingsStore.siteTitle || '网站' }}</h1>
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
            <el-menu-item index="/tools">
              <el-icon><Tools /></el-icon>
              工具箱
            </el-menu-item>
            <el-menu-item v-if="userStore.isLoggedIn" index="/temp-email">
              <el-icon><Message /></el-icon>
              临时邮箱
            </el-menu-item>
            <el-menu-item index="/about">关于</el-menu-item>
            <el-menu-item
              v-if="userStore.isAdmin || (userStore.user && userStore.user.canPublishBlog)"
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
            <!-- 通知 -->
            <NotificationDropdown />

            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :src="avatarUrl" :size="32">
                  {{ userStore.user && userStore.user.username && userStore.user.username.charAt(0) || 'U' }}
                </el-avatar>
                <span class="username">{{ userStore.user && userStore.user.username || '用户' }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item v-if="userStore.isAdmin" command="admin"
                    >管理后台</el-dropdown-item
                  >
                  <el-dropdown-item v-if="userStore.isAdmin" command="articles"
                    >我的文章</el-dropdown-item
                  >
                  <el-dropdown-item v-if="userStore.isAdmin" command="settings"
                    >网站设置</el-dropdown-item
                  >
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
        <router-link to="/tools" @click="showMobileMenu = false">工具箱</router-link>
        <router-link v-if="userStore.isLoggedIn" to="/temp-email" @click="showMobileMenu = false">临时邮箱</router-link>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useSettingsStore } from '@/stores/settings';
import { ElMessage } from 'element-plus';
import { EditPen, Tools, Message } from '@element-plus/icons-vue';
import NotificationDropdown from '@/components/NotificationDropdown.vue';

export default {
  name: 'AppHeader',
  components: {
    EditPen,
    Tools,
    Message,
    NotificationDropdown
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const settingsStore = useSettingsStore();
    const showMobileMenu = ref(false);

    // 滚动检测相关
    const isAtTop = ref(true);
    const isHomePage = computed(() => route.path === '/');

    // 滚动监听
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const shouldHide = route.path === '/' && scrollY < 50;
      isAtTop.value = shouldHide;
    };

    // 组件挂载时加载设置
    onMounted(() => {
      if (!settingsStore.isLoaded) {
        settingsStore.loadSettings();
      }

      // 立即检查初始状态
      const initialCheck = () => {
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        const shouldHide = route.path === '/' && scrollY < 50;
        isAtTop.value = shouldHide;

        // 开发环境下的调试信息
        if (process.env.NODE_ENV === 'development') {
          console.log('Header check:', {
            path: route.path,
            scrollY,
            isAtTop: isAtTop.value,
            shouldHide
          });
        }
      };

      // 立即执行一次
      initialCheck();

      // 添加滚动监听
      window.addEventListener('scroll', handleScroll, { passive: true });

      // 多次检查确保状态正确
      setTimeout(initialCheck, 50);
      setTimeout(initialCheck, 150);
      setTimeout(initialCheck, 300);

      // 页面完全加载后的最终检查
      if (document.readyState === 'complete') {
        setTimeout(initialCheck, 100);
      } else {
        window.addEventListener(
          'load',
          () => {
            setTimeout(initialCheck, 100);
          },
          { once: true }
        );
      }
    });

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
    });

    // 监听路由变化，确保状态正确
    watch(
      () => route.path,
      newPath => {
        // 路由变化时立即检查
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        const shouldHide = newPath === '/' && scrollY < 50;
        isAtTop.value = shouldHide;

        // 开发环境下的调试信息
        if (process.env.NODE_ENV === 'development') {
          console.log('Route change header check:', {
            newPath,
            scrollY,
            isAtTop: isAtTop.value,
            shouldHide
          });
        }
      },
      { immediate: true }
    );

    const activeIndex = computed(() => route.path || '/');

    const avatarUrl = computed(() => {
      const avatar = userStore.user?.avatar;
      if (avatar && avatar.startsWith('/uploads/')) {
        return `http://localhost:8000${avatar}`;
      }
      return avatar || '';
    });

    const handleSelect = key => {
      if (key && key !== route.path) {
        router.push(key);
      }
    };

    const handleCommand = command => {
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
      settingsStore,
      activeIndex,
      avatarUrl,
      showMobileMenu,
      handleSelect,
      handleCommand,
      handleLogout,
      isAtTop,
      isHomePage
    };
  }
};
</script>

<style lang="scss" scoped>
.app-header {
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  height: 70px;
}

.app-header.header-hidden {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

.app-header.header-visible {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

/* 深色主题样式 */
.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 51, 234, 0.1) 50%,
    rgba(236, 72, 153, 0.1) 100%
  );
  pointer-events: none;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  padding: 0 30px;
  position: relative;
  z-index: 1;
}

.app-header .logo {
  .logo-link {
    color: white;
    text-decoration: none;
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;

    &:hover {
      color: #60a5fa;
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .logo-image {
      height: 36px;
      width: 36px;
      object-fit: cover;
      margin-right: 12px;
      border-radius: 8px;
    }

    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
}

.app-header .nav-menu {
  flex: 1;
  margin: 0 40px;

  :deep(.el-menu) {
    border-bottom: none;
    background: transparent;

    .el-menu-item {
      border-radius: 8px;
      margin: 0 4px;
      transition: all 0.3s ease;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #60a5fa;
        transform: translateY(-1px);
      }

      &.is-active {
        background: linear-gradient(45deg, #60a5fa, #a78bfa);
        color: white !important;
        box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
        font-weight: 600;
      }
    }
  }
}

.app-header .user-actions {
  display: flex;
  align-items: center;
  gap: 12px;

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 10px 16px;
    border-radius: 12px;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    .username {
      font-size: 14px;
      color: white;
      font-weight: 500;
    }
  }

  .write-btn {
    background: linear-gradient(45deg, #60a5fa, #a78bfa);
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
    backdrop-filter: blur(10px);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(96, 165, 250, 0.4);
      background: linear-gradient(45deg, #3b82f6, #8b5cf6);
    }

    .btn-icon {
      margin-right: 6px;
    }
  }
}

.app-header .mobile-menu-btn {
  display: none;
  cursor: pointer;
  padding: 10px;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
  }
}

.app-header .mobile-menu {
  display: none;
  background: rgba(15, 23, 42, 0.98);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;

  .mobile-menu-items {
    display: flex;
    flex-direction: column;
    gap: 16px;

    a {
      color: rgba(255, 255, 255, 0.9);
      text-decoration: none;
      padding: 12px 16px;
      border-radius: 8px;
      transition: all 0.3s ease;
      background: rgba(255, 255, 255, 0.05);

      &:hover {
        color: #60a5fa;
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(4px);
      }
    }

    .mobile-user-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);

      a {
        color: rgba(255, 255, 255, 0.9);
        text-decoration: none;
        padding: 8px 0;
        display: block;

        &:hover {
          color: #60a5fa;
        }
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
