<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarWidth" class="admin-sidebar">
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">
            <el-icon><Monitor /></el-icon>
          </div>
          <h2 v-show="!isCollapsed" class="logo-text">管理后台</h2>
        </div>
        <el-button
          :icon="Fold"
          text
          @click="toggleSidebar"
          class="collapse-btn"
        />
      </div>

      <el-scrollbar class="menu-scrollbar">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapsed"
          :unique-opened="true"
          router
          class="admin-menu"
          background-color="#001529"
          text-color="rgba(255, 255, 255, 0.85)"
          active-text-color="#1890ff"
        >
          <el-menu-item index="/admin/dashboard" class="menu-item">
            <el-icon class="menu-icon"><DataBoard /></el-icon>
            <template #title>
              <span class="menu-title">仪表板</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/users" class="menu-item">
            <el-icon class="menu-icon"><User /></el-icon>
            <template #title>
              <span class="menu-title">用户管理</span>
            </template>
          </el-menu-item>

          <el-sub-menu index="content" class="sub-menu">
            <template #title>
              <el-icon class="menu-icon"><Document /></el-icon>
              <span class="menu-title">内容管理</span>
            </template>
            <el-menu-item index="/admin/articles" class="sub-menu-item">
              <span class="sub-menu-title">文章管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/categories" class="sub-menu-item">
              <span class="sub-menu-title">分类管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/tags" class="sub-menu-item">
              <span class="sub-menu-title">标签管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/games" class="sub-menu-item">
              <span class="sub-menu-title">游戏管理</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="tools" class="sub-menu">
            <template #title>
              <el-icon class="menu-icon"><Tools /></el-icon>
              <span class="menu-title">工具箱管理</span>
            </template>
            <el-menu-item index="/admin/tools" class="sub-menu-item">
              <span class="sub-menu-title">工具概览</span>
            </el-menu-item>
            <el-menu-item index="/admin/tools/management" class="sub-menu-item">
              <span class="sub-menu-title">工具管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/tools/categories" class="sub-menu-item">
              <span class="sub-menu-title">分类管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/tools/analytics" class="sub-menu-item">
              <span class="sub-menu-title">使用分析</span>
            </el-menu-item>
            <el-menu-item index="/admin/tools/settings" class="sub-menu-item">
              <span class="sub-menu-title">工具箱设置</span>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item index="/admin/activity" class="menu-item">
            <el-icon class="menu-icon"><Document /></el-icon>
            <template #title>
              <span class="menu-title">活动日志</span>
            </template>
          </el-menu-item>

          <el-sub-menu index="email" class="sub-menu">
            <template #title>
              <el-icon class="menu-icon"><Message /></el-icon>
              <span class="menu-title">邮箱管理</span>
            </template>
            <el-menu-item index="/admin/email-domains" class="sub-menu-item">
              <span class="sub-menu-title">域名管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/email-management" class="sub-menu-item">
              <span class="sub-menu-title">邮件管理</span>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item index="/admin/settings" class="menu-item">
            <el-icon class="menu-icon"><Setting /></el-icon>
            <template #title>
              <span class="menu-title">系统设置</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/monitoring" class="menu-item">
            <el-icon class="menu-icon"><Monitor /></el-icon>
            <template #title>
              <span class="menu-title">系统监控</span>
            </template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>

      <!-- 侧边栏底部用户信息 -->
      <div class="sidebar-footer">
        <div v-if="!isCollapsed" class="user-info">
          <el-avatar :src="userStore.user && userStore.user.avatar" :size="32" class="user-avatar">
            {{ userStore.user && userStore.user.username && userStore.user.username.charAt(0) || 'U' }}
          </el-avatar>
          <div class="user-details">
            <div class="username">{{ userStore.user && userStore.user.username || '用户' }}</div>
            <div class="user-role">管理员</div>
          </div>
          <el-dropdown @command="handleUserCommand" class="user-dropdown">
            <el-button text class="user-menu-btn">
              <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-else class="collapsed-user">
          <el-tooltip content="用户菜单" placement="right">
            <el-dropdown @command="handleUserCommand">
              <el-avatar :src="userStore.user && userStore.user.avatar" :size="28" class="collapsed-avatar">
                {{ userStore.user && userStore.user.username && userStore.user.username.charAt(0) || 'U' }}
              </el-avatar>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-tooltip>
        </div>
      </div>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container class="admin-main">
      <!-- 顶部导航栏 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="item in breadcrumbs"
              :key="item.path"
              :to="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-tooltip content="返回主站 (Ctrl+H)" placement="bottom">
            <el-button
              type="primary"
              plain
              @click="goToMainSite"
              class="back-to-site-btn"
            >
              <el-icon><House /></el-icon>
              <span class="btn-text">返回主站</span>
            </el-button>
          </el-tooltip>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main class="admin-content">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Fold,
  DataBoard,
  User,
  Document,
  Setting,
  Monitor,
  ArrowDown,
  House,
  Tools,
  Message
} from '@element-plus/icons-vue';

export default {
  name: 'AdminLayout',
  components: {
    Fold,
    DataBoard,
    User,
    Document,
    Setting,
    Monitor,
    ArrowDown,
    House,
    Tools,
    Message
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();

    const isCollapsed = ref(false);

    // 计算侧边栏宽度
    const sidebarWidth = computed(() => {
      return isCollapsed.value ? '64px' : '200px';
    });

    // 当前激活的菜单项
    const activeMenu = computed(() => {
      return route.path;
    });

    // 面包屑导航
    const breadcrumbs = computed(() => {
      const pathArray = route.path.split('/').filter(item => item);
      const breadcrumbList = [{ title: '管理后台', path: '/admin' }];

      const menuMap = {
        'dashboard': '仪表板',
        'users': '用户管理',
        'articles': '文章管理',
        'games': '游戏管理',
        'settings': '系统设置',
        'monitoring': '系统监控'
      };

      pathArray.forEach((item, index) => {
        if (item !== 'admin' && menuMap[item]) {
          breadcrumbList.push({
            title: menuMap[item],
            path: '/' + pathArray.slice(0, index + 1).join('/')
          });
        }
      });

      return breadcrumbList;
    });

    // 切换侧边栏
    const toggleSidebar = () => {
      isCollapsed.value = !isCollapsed.value;
    };

    // 处理用户下拉菜单命令
    const handleUserCommand = async (command) => {
      switch (command) {
        case 'profile':
          router.push('/profile');
          break;
        case 'logout':
          try {
            await ElMessageBox.confirm(
              '确定要退出登录吗？',
              '提示',
              {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
              }
            );
            await userStore.logout();
            router.push('/auth/login');
            ElMessage.success('退出登录成功');
          } catch (error) {
            // 用户取消操作
          }
          break;
      }
    };

    // 返回主站
    const goToMainSite = () => {
      // 获取主站URL（去掉/admin路径）
      const mainSiteUrl = window.location.origin;

      // 在新标签页打开主站
      window.open(mainSiteUrl, '_blank');
    };

    // 添加快捷键支持
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        goToMainSite();
      }
    };

    // 组件挂载时添加快捷键监听
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
    });

    return {
      isCollapsed,
      sidebarWidth,
      activeMenu,
      breadcrumbs,
      userStore,
      toggleSidebar,
      handleUserCommand,
      goToMainSite
    };
  }
};
</script>

<style scoped>
.admin-layout {
  height: 100vh !important;
  display: flex !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 1000 !important;
  background: #f0f2f5 !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

.admin-sidebar {
  background: #001529 !important;
  border-right: none !important;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15) !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100vh !important;
  transition: width 0.3s !important;
  width: 250px !important;
  position: relative !important;
  overflow-y: auto !important;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #002140;
  min-height: 64px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #1890ff, #722ed1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.logo-text {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
  transition: all 0.3s;
}

.collapse-btn {
  color: rgba(255, 255, 255, 0.65);
  transition: all 0.3s;
}

.collapse-btn:hover {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
}

.menu-scrollbar {
  flex: 1;
  overflow: hidden;
}

.admin-menu {
  border-right: none;
  background: #001529;
  width: 100%;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: #002140;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.3s;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.08);
}

.user-avatar {
  background: linear-gradient(135deg, #1890ff, #722ed1);
  color: white;
  font-weight: 600;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-details .username {
  font-size: 14px;
  font-weight: 500;
  color: white;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.user-dropdown {
  margin-left: auto;
}

.user-menu-btn {
  color: rgba(255, 255, 255, 0.65);
  padding: 4px;
  transition: all 0.3s;
}

.user-menu-btn:hover {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
}

.collapsed-user {
  display: flex;
  justify-content: center;
  align-items: center;
}

.collapsed-avatar {
  background: linear-gradient(135deg, #1890ff, #722ed1);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.collapsed-avatar:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

/* Element Plus 菜单样式覆盖 */
.admin-menu :deep(.el-menu-item),
.admin-menu :deep(.el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
  margin: 4px 8px;
  transition: all 0.3s;
}

.admin-menu :deep(.el-menu-item:hover),
.admin-menu :deep(.el-sub-menu__title:hover) {
  background-color: rgba(24, 144, 255, 0.1) !important;
  color: #1890ff !important;
}

.admin-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #1890ff, #40a9ff) !important;
  color: white !important;
  position: relative;
}

.admin-menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #fff;
}

.admin-menu :deep(.el-sub-menu .el-menu-item) {
  height: 40px;
  line-height: 40px;
  background: rgba(255, 255, 255, 0.04);
  margin: 2px 16px;
  color: rgba(255, 255, 255, 0.75);
}

.admin-menu :deep(.el-sub-menu .el-menu-item:hover) {
  background: rgba(24, 144, 255, 0.1) !important;
  color: #1890ff !important;
}

.admin-menu :deep(.el-sub-menu .el-menu-item.is-active) {
  background: #1890ff !important;
  color: white !important;
}

.admin-main {
  flex: 1;
  background: #f0f2f5;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-header {
  background: #fff !important;
  border-bottom: 1px solid #e8eaec !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 24px !important;
  height: 64px !important;
  margin: 0 !important;
  position: relative !important;
  z-index: 100 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.back-to-site-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.back-to-site-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.2);
}

.btn-text {
  font-weight: 500;
}

.admin-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  height: 0; /* 强制flex子元素计算高度 */
}

@media (max-width: 768px) {
  .admin-sidebar {
    position: fixed;
    z-index: 1000;
    height: 100vh;
  }

  .admin-main {
    margin-left: 0;
  }

  .admin-header {
    padding: 0 16px;
  }

  .admin-content {
    padding: 16px;
  }
}
</style>
