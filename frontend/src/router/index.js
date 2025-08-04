import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('@/views/blog/BlogList.vue'),
    meta: { title: '博客' }
  },
  {
    path: '/blog/:id',
    name: 'BlogDetail',
    component: () => import('@/views/blog/BlogDetail.vue'),
    meta: { title: '文章详情' }
  },
  {
    path: '/games',
    name: 'Games',
    component: () => import('@/views/games/GameList.vue'),
    meta: { title: '小游戏' }
  },
  {
    path: '/games/:id',
    name: 'GameDetail',
    component: () => import('@/views/games/GameDetail.vue'),
    meta: { title: '游戏详情' }
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', guest: true }
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: '注册', guest: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/user/Profile.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/articles/new',
    name: 'ArticleCreate',
    component: () => import('@/views/ArticleEdit.vue'),
    meta: { requiresAuth: true, requiresBlogPermission: true }
  },
  {
    path: '/articles/:id/edit',
    name: 'ArticleEdit',
    component: () => import('@/views/ArticleEdit.vue'),
    meta: { requiresAuth: true, requiresBlogPermission: true }
  },
  {
    path: '/articles',
    name: 'ArticleList',
    component: () => import('@/views/ArticleList.vue'),
    meta: { requiresAuth: true }
  },
  // 管理员路由组
  {
    path: '/admin',
    component: () => import('@/components/admin/layout/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: '仪表板', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: { title: '用户管理', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('@/views/admin/AdminSettings.vue'),
        meta: { title: '系统设置', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'activity',
        name: 'ActivityLog',
        component: () => import('@/views/admin/ActivityLog.vue'),
        meta: { title: '活动日志', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'articles',
        name: 'AdminArticleManagement',
        component: () => import('@/views/admin/ArticleManagement.vue'),
        meta: { title: '文章管理', requiresAuth: true, requiresAdmin: true }
      }
    ]
  },

  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { title: '关于' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 个人网站` : '个人网站';

  // 如果有token但没有用户信息，尝试获取用户信息
  if (userStore.token && !userStore.user) {
    await userStore.fetchUserInfo();
  }

  // 检查认证要求
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    ElMessage.error('需要管理员权限才能访问此页面');
    next({ name: 'Home' });
  } else if (to.meta.requiresBlogPermission && !userStore.isAdmin && !userStore.user?.canPublishBlog) {
    ElMessage.error('您没有发布博客的权限，请联系管理员');
    next({ name: 'Home' });
  } else if (to.meta.guest && userStore.isLoggedIn) {
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router;
