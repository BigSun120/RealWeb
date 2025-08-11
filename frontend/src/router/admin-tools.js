/**
 * 后台工具管理路由配置
 */

export default {
  path: 'tools',
  name: 'AdminTools',
  meta: {
    title: '工具管理',
    icon: 'tools',
    requiresAuth: true,
    requiresAdmin: true
  },
  children: [
    {
      path: '',
      name: 'AdminToolsOverview',
      component: () => import('@/views/admin/tools/ToolsOverview.vue'),
      meta: {
        title: '工具概览',
        description: '工具使用统计和概览信息'
      }
    },
    {
      path: 'management',
      name: 'AdminToolsManagement',
      component: () => import('@/views/admin/tools/ToolsManagement.vue'),
      meta: {
        title: '工具管理',
        description: '工具的增删改查和配置管理'
      }
    },
    {
      path: 'categories',
      name: 'AdminToolsCategories',
      component: () => import('@/views/admin/tools/CategoriesManagement.vue'),
      meta: {
        title: '分类管理',
        description: '工具分类的管理和配置'
      }
    },
    {
      path: 'analytics',
      name: 'AdminToolsAnalytics',
      component: () => import('@/views/admin/tools/ToolsAnalytics.vue'),
      meta: {
        title: '使用分析',
        description: '工具使用数据分析和报表'
      }
    },
    {
      path: 'settings',
      name: 'AdminToolsSettings',
      component: () => import('@/views/admin/tools/ToolsSettings.vue'),
      meta: {
        title: '工具设置',
        description: '工具箱全局设置和配置'
      }
    },
    {
      path: 'logs',
      name: 'AdminToolsLogs',
      component: () => import('@/views/admin/tools/ToolsLogs.vue'),
      meta: {
        title: '操作日志',
        description: '工具使用和管理操作日志'
      }
    },
    {
      path: 'edit/:id?',
      name: 'AdminToolEdit',
      component: () => import('@/views/admin/tools/ToolEdit.vue'),
      meta: {
        title: '编辑工具',
        description: '编辑工具信息和配置',
        hidden: true // 在菜单中隐藏
      }
    }
  ]
};
