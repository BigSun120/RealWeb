<template>
  <!-- 这个组件不渲染任何内容，只负责监控认证状态 -->
  <div style="display: none;"></div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

let authCheckInterval = null
let visibilityChangeHandler = null

// 检查认证状态
const checkAuthStatus = async () => {
  if (!userStore.token) return

  // 检查token有效性
  if (!userStore.checkTokenValidity()) {
    // 尝试静默刷新
    const refreshSuccess = await userStore.silentRefresh()
    if (!refreshSuccess) {
      // 不在这里强制登出，让具体的API请求处理401错误
    }
  }
}

// 页面可见性变化处理
const handleVisibilityChange = () => {
  if (!document.hidden && userStore.token) {
    // 页面重新可见时检查认证状态
    checkAuthStatus()
  }
}

// 路由变化时检查认证状态
const handleRouteChange = () => {
  if (userStore.token) {
    checkAuthStatus()
  }
}

// 监听用户状态变化
watch(() => userStore.isLoggedIn, (newValue, oldValue) => {
  if (oldValue && !newValue) {
    // 用户从登录状态变为未登录状态
    // 如果当前不在登录相关页面，跳转到登录页
    const currentPath = route.path
    if (!currentPath.includes('/auth/')) {
      router.push('/auth/login')
    }
  }
})

// 监听路由变化
watch(() => route.path, handleRouteChange)

onMounted(() => {
  // 初始检查
  if (userStore.token) {
    checkAuthStatus()
  }

  // 设置定期检查（每2分钟）
  authCheckInterval = setInterval(checkAuthStatus, 2 * 60 * 1000)

  // 监听页面可见性变化
  visibilityChangeHandler = handleVisibilityChange
  document.addEventListener('visibilitychange', visibilityChangeHandler)

  // 监听存储变化（多标签页同步）
  const handleStorageChange = (e) => {
    // 根据环境确定token存储键名
    const isDev = import.meta.env.DEV || import.meta.env.VITE_API_BASE_URL?.includes('localhost');
    const tokenKey = isDev ? 'dev_token' : 'token';

    if (e.key === tokenKey) {
      // 获取当前存储的token（检查两个位置）
      const currentStoredToken = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey) || '';

      if (!currentStoredToken && userStore.token) {
        // token被其他标签页清除
        userStore.logout()
      } else if (currentStoredToken && !userStore.token) {
        // 其他标签页登录了
        userStore.token = currentStoredToken
        userStore.fetchUserInfo()
      } else if (currentStoredToken !== userStore.token) {
        // token发生了变化
        userStore.token = currentStoredToken
        if (currentStoredToken) {
          userStore.fetchUserInfo()
        } else {
          userStore.logout()
        }
      }
    }
  }
  
  window.addEventListener('storage', handleStorageChange)

  // 监听网络状态变化
  const handleOnline = () => {
    if (userStore.token) {
      checkAuthStatus()
    }
  }

  const handleOffline = () => {
    // 网络断开处理
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // 清理函数
  onUnmounted(() => {
    if (authCheckInterval) {
      clearInterval(authCheckInterval)
    }
    
    if (visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', visibilityChangeHandler)
    }
    
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })
})

onUnmounted(() => {
  if (authCheckInterval) {
    clearInterval(authCheckInterval)
  }
  
  if (visibilityChangeHandler) {
    document.removeEventListener('visibilitychange', visibilityChangeHandler)
  }
})
</script>

<style scoped>
/* 无样式，这个组件不渲染任何可见内容 */
</style>
