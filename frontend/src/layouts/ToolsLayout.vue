<template>
  <div class="tools-layout">
    <!-- 工具箱头部 -->
    <div class="tools-header">
      <div class="container">
        <div class="header-content">
          <div class="header-left">
            <router-link to="/tools" class="logo">
              <span class="logo-icon">🧰</span>
              <span class="logo-text">工具箱</span>
            </router-link>
            <div class="breadcrumb">
              <el-breadcrumb separator="/">
                <el-breadcrumb-item :to="{ path: '/tools' }">工具箱</el-breadcrumb-item>
                <el-breadcrumb-item v-if="currentCategory">
                  {{ currentCategory.name }}
                </el-breadcrumb-item>
                <el-breadcrumb-item v-if="currentTool">
                  {{ currentTool.name }}
                </el-breadcrumb-item>
              </el-breadcrumb>
            </div>
          </div>
          <div class="header-right">
            <el-button type="text" @click="goBack" v-if="$route.name !== 'ToolsIndex'">
              <el-icon>
                <ArrowLeft />
              </el-icon>
              返回
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具箱主体内容 -->
    <div class="tools-main">
      <div :class="['container', { 'full-width': isFullWidth }]">
        <router-view />
      </div>
    </div>

    <!-- 工具箱底部 -->
    <div class="tools-footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-info">
            <p>💡 提示：所有工具均在浏览器本地运行，保护您的隐私安全</p>
          </div>
          <div class="footer-links">
            <router-link to="/tools">工具首页</router-link>
            <a href="#" @click.prevent="showFeedback">意见反馈</a>
            <a href="#" @click.prevent="showHelp">使用帮助</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import toolsService from '@/services/toolsService'

export default {
  name: 'ToolsLayout',
  components: {
    ArrowLeft
  },
  setup() {
    const route = useRoute()
    const router = useRouter()

    // 检测是否需要全宽布局
    const isFullWidth = computed(() => {
      return route.meta?.fullWidth === true || route.meta?.noContainer === true
    })

    // 当前分类信息
    const currentCategory = computed(() => {
      const categoryId = route.meta?.category
      return categoryId ? toolsService.getCategoryById(categoryId) : null
    })

    // 当前工具信息
    const currentTool = computed(() => {
      // 从路由名称推断工具ID
      const routeName = route.name
      if (routeName && routeName !== 'ToolsIndex') {
        // 将路由名称转换为工具ID格式
        const toolId = routeName.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1)
        return toolsService.getToolById(toolId)
      }
      return null
    })

    // 返回上一页
    const goBack = () => {
      if (window.history.length > 1) {
        router.go(-1)
      } else {
        router.push('/tools')
      }
    }

    // 显示反馈弹窗
    const showFeedback = () => {
      // TODO: 实现反馈功能
      console.log('显示反馈弹窗')
    }

    // 显示帮助
    const showHelp = () => {
      // TODO: 实现帮助功能
      console.log('显示帮助')
    }

    return {
      isFullWidth,
      currentCategory,
      currentTool,
      goBack,
      showFeedback,
      showHelp
    }
  }
}
</script>

<style scoped>
.tools-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  /* 改为透明，让背景图片显示 */
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  transition: max-width 0.3s ease, padding 0.3s ease;
}

/* 全宽模式 */
.container.full-width {
  max-width: 100% !important;
  padding: 0 40px;
}

/* 超宽屏幕时的优化 */
@media (min-width: 2560px) {
  .container.full-width {
    padding: 0 80px;
  }
}

/* 头部样式 */
.tools-header {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #303133;
  font-weight: 600;
  font-size: 18px;
}

.logo-icon {
  font-size: 24px;
}

.logo:hover {
  color: #409eff;
}

.breadcrumb {
  margin-left: 20px;
  padding-left: 20px;
  border-left: 1px solid #e4e7ed;
}

/* 主体内容 */
.tools-main {
  flex: 1;
  padding: 0px 0;
}

/* 底部样式 */
.tools-footer {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  padding: 20px 0;
  margin-top: auto;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #909399;
}

.footer-info p {
  margin: 0;
}

.footer-links {
  display: flex;
  gap: 20px;
}

.footer-links a {
  color: #909399;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: #409eff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }

  .container.full-width {
    padding: 0 20px;
  }

  .header-content {
    height: 50px;
  }

  .logo-text {
    display: none;
  }

  .breadcrumb {
    margin-left: 10px;
    padding-left: 10px;
  }

  .footer-content {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .footer-links {
    gap: 15px;
  }
}
</style>
