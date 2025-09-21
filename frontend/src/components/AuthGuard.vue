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
    console.warn('Token无效或即将过期')
    
    // 尝试静默刷新
    const refreshSuccess = await userStore.silentRefresh()
    if (!refreshSuccess) {
      console.warn('静默刷新失败，用户需要重新登录')
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
    console.log('用户登录状态丢失')
    
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
    if (e.key === 'token') {
      if (!e.newValue && userStore.token) {
        // token被其他标签页清除
        console.log('Token被其他标签页清除')
        userStore.logout()
      } else if (e.newValue && !userStore.token) {
        // 其他标签页登录了
        console.log('其他标签页登录了')
        userStore.token = e.newValue
        userStore.fetchUserInfo()
      }
    }
  }
  
  window.addEventListener('storage', handleStorageChange)

  // 监听网络状态变化
  const handleOnline = () => {
    console.log('网络连接恢复')
    if (userStore.token) {
      checkAuthStatus()
    }
  }

  const handleOffline = () => {
    console.log('网络连接断开')
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
