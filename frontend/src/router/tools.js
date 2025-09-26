/**
 * 工具箱路由配置
 */

export default {
  path: '/tools',
  name: 'Tools',
  component: () => import('@/layouts/ToolsLayout.vue'),
  meta: {
    title: '工具箱',
    icon: 'tools',
    requiresAuth: false
  },
  children: [
    {
      path: '',
      name: 'ToolsIndex',
      component: () => import('@/views/tools/ToolsIndex.vue'),
      meta: {
        title: '工具箱首页',
        description: '实用的在线工具集合'
      }
    },
    // 网页工具分类
    {
      path: 'web',
      name: 'WebTools',
      meta: {
        title: '网页工具',
        category: 'web'
      },
      children: [
        // 分类默认页：展示网页工具列表
        {
          path: '',
          name: 'WebToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '网页工具',
            category: 'web'
          }
        },
        {
          path: 'seo-analyzer',
          name: 'SeoAnalyzer',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: 'SEO分析工具',
            description: '分析网站SEO优化情况'
          }
        }
      ]
    },
    // 文本工具分类
    {
      path: 'text',
      name: 'TextTools',
      meta: {
        title: '文本工具',
        category: 'text'
      },
      children: [
        // 分类默认页：展示文本工具列表
        {
          path: '',
          name: 'TextToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '文本工具',
            category: 'text'
          }
        },
        {
          path: 'text-counter',
          name: 'TextCounter',
          component: () => import('@/views/tools/text/TextCounter.vue'),
          meta: {
            title: '文本计数器',
            description: '统计文本的字符数、单词数、行数等信息'
          }
        },
        {
          path: 'json-formatter',
          name: 'JsonFormatter',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: 'JSON格式化',
            description: 'JSON数据格式化和验证'
          }
        },
        {
          path: 'markdown-editor',
          name: 'MarkdownEditor',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: 'Markdown编辑器',
            description: '在线Markdown编辑和预览'
          }
        }
      ]
    },
    {
      path: 'productivity',
      name: 'ProductivityTools',
      meta: {
        title: '效率工具',
        category: 'productivity'
      },
      children: [
        {
          path: '',
          name: 'ProductivityToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '效率工具',
            category: 'productivity'
          }
        },
        {
          path: 'mail-memo',
          name: 'MailMemo',
          component: () => import('@/views/tools/productivity/MailMemo.vue'),
          meta: {
            title: '邮箱备忘录',
            description: '集中整理个人邮箱地址与备注，支持标签筛选',
            requiresAuth: true
          }
        }
      ]
    },
    // 图片工具分类
    {
      path: 'image',
      name: 'ImageTools',
      meta: {
        title: '图片工具',
        category: 'image'
      },
      children: [
        // 分类默认页：展示图片工具列表
        {
          path: '',
          name: 'ImageToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '图片工具',
            category: 'image'
          }
        },
        {
          path: 'compressor',
          name: 'ImageCompressor',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '图片压缩',
            description: '在线图片压缩优化'
          }
        },
        {
          path: 'converter',
          name: 'ImageConverter',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '图片格式转换',
            description: '支持多种图片格式转换'
          }
        }
      ]
    },
    // 开发工具分类
    {
      path: 'dev',
      name: 'DevTools',
      meta: {
        title: '开发工具',
        category: 'dev'
      },
      children: [
        // 分类默认页：展示开发工具列表
        {
          path: '',
          name: 'DevToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '开发工具',
            category: 'dev'
          }
        },
        {
          path: 'color-picker',
          name: 'ColorPicker',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '颜色选择器',
            description: '在线颜色选择和调色板'
          }
        },
        {
          path: 'qr-generator',
          name: 'QrGenerator',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '二维码生成器',
            description: '生成各种类型的二维码'
          }
        },
        {
          path: 'augment-token-manager',
          name: 'AugmentTokenManager',
          component: () => import('@/views/tools/dev/AugmentTokenManager.vue'),
          meta: {
            title: 'Augment 令牌管理器',
            description: '管理 Augment Code 访问令牌',
            requiresAuth: true
          }
        }
      ]
    },
    {
      path: 'token-pool-manager',
      name: 'TokenPoolManager',
      component: () => import('@/views/tools/dev/TokenPoolManager.vue'),
      meta: {
        title: 'Augment 令牌池',
        description: '共享令牌池，上传和领取 Augment Code 访问令牌',
        requiresAuth: true
      }
    },
    // 小游戏分类
    {
      path: 'games',
      name: 'GameTools',
      meta: {
        title: '小游戏',
        category: 'games'
      },
      children: [
        {
          path: '',
          name: 'GameToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '小游戏',
            category: 'games'
          }
        },
        {
          path: 'gomoku',
          name: 'Gomoku',
          component: () => import('@/views/tools/games/Gomoku.vue'),
          meta: {
            title: '五子棋对战',
            description: '与 AI 对弈的五子棋小游戏'
          }
        }
      ]
    },
    // 实用工具分类
    {
      path: 'utility',
      name: 'UtilityTools',
      meta: {
        title: '实用工具',
        category: 'utility'
      },
      children: [
        // 分类默认页：展示实用工具列表
        {
          path: '',
          name: 'UtilityToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '实用工具',
            category: 'utility'
          }
        },
        {
          path: 'timestamp-converter',
          name: 'TimestampConverter',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '时间戳转换',
            description: '时间戳与日期格式转换'
          }
        },
        {
          path: 'unit-converter',
          name: 'UnitConverter',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '单位换算器',
            description: '各种单位之间的换算'
          }
        },
        // 动态路由 - 捕获所有未定义的工具路由
        {
          path: ':toolId',
          name: 'DynamicUtilityTool',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '工具',
            description: '工具详情'
          }
        }
      ]
    },
    // 媒体工具分类
    {
      path: 'media',
      name: 'MediaTools',
      meta: {
        title: '媒体工具',
        category: 'media'
      },
      children: [
        // 分类默认页：展示媒体工具列表
        {
          path: '',
          name: 'MediaToolsIndex',
          component: () => import('@/views/tools/CategoryIndex.vue'),
          meta: {
            title: '媒体工具',
            category: 'media'
          }
        },
        {
          path: 'video-downloader',
          name: 'VideoDownloader',
          component: () => import('@/views/tools/media/VideoDownloader.vue'),
          meta: {
            title: '视频下载器',
            description: '支持YouTube、Bilibili等平台的视频下载'
          }
        },
        // 动态路由 - 捕获所有未定义的工具路由
        {
          path: ':toolId',
          name: 'DynamicMediaTool',
          component: () => import('@/views/tools/ToolPlaceholder.vue'),
          meta: {
            title: '工具',
            description: '工具详情'
          }
        }
      ]
    }
  ]
};


