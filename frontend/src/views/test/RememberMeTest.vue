<template>
  <div class="remember-me-test">
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>记住我功能测试</span>
        </div>
      </template>
      
      <div class="test-section">
        <h3>当前状态</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="登录状态">
            <el-tag :type="userStore.isLoggedIn ? 'success' : 'danger'">
              {{ userStore.isLoggedIn ? '已登录' : '未登录' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户信息">
            {{ userStore.user?.username || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="localStorage Token">
            <el-tag :type="localStorageToken ? 'success' : 'info'">
              {{ localStorageToken ? '存在' : '不存在' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="sessionStorage Token">
            <el-tag :type="sessionStorageToken ? 'success' : 'info'">
              {{ sessionStorageToken ? '存在' : '不存在' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="test-section">
        <h3>Token信息</h3>
        <div v-if="tokenInfo">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Token类型">
              {{ tokenInfo.rememberMe ? '记住我 (30天)' : '普通 (7天)' }}
            </el-descriptions-item>
            <el-descriptions-item label="过期时间">
              {{ new Date(tokenInfo.exp * 1000).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item label="剩余时间">
              {{ getTimeRemaining(tokenInfo.exp) }}
            </el-descriptions-item>
            <el-descriptions-item label="用户ID">
              {{ tokenInfo.userId }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <el-empty v-else description="无Token信息" />
      </div>

      <div class="test-section">
        <h3>测试操作</h3>
        <el-space wrap>
          <el-button @click="refreshStatus" type="primary">刷新状态</el-button>
          <el-button @click="clearLocalStorage" type="warning">清除localStorage</el-button>
          <el-button @click="clearSessionStorage" type="warning">清除sessionStorage</el-button>
          <el-button @click="clearAllStorage" type="danger">清除所有存储</el-button>
          <el-button @click="simulateReload" type="info">模拟页面重载</el-button>
        </el-space>
      </div>

      <div class="test-section">
        <h3>测试日志</h3>
        <el-scrollbar height="200px">
          <div class="log-container">
            <div v-for="(log, index) in logs" :key="index" class="log-item">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </el-scrollbar>
        <el-button @click="clearLogs" size="small" style="margin-top: 10px;">清除日志</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

// 响应式数据
const localStorageToken = ref('')
const sessionStorageToken = ref('')
const tokenInfo = ref(null)
const logs = ref([])

// 计算属性
const currentToken = computed(() => {
  return localStorageToken.value || sessionStorageToken.value
})

// 方法
const addLog = (message) => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message
  })
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

const refreshStatus = () => {
  localStorageToken.value = localStorage.getItem('token') || ''
  sessionStorageToken.value = sessionStorage.getItem('token') || ''
  
  // 解析token信息
  if (currentToken.value) {
    try {
      const payload = JSON.parse(atob(currentToken.value.split('.')[1]))
      tokenInfo.value = payload
      addLog(`Token解析成功: ${payload.rememberMe ? '记住我模式' : '普通模式'}`)
    } catch (error) {
      tokenInfo.value = null
      addLog(`Token解析失败: ${error.message}`)
    }
  } else {
    tokenInfo.value = null
    addLog('未找到Token')
  }
}

const getTimeRemaining = (exp) => {
  const now = Math.floor(Date.now() / 1000)
  const remaining = exp - now
  
  if (remaining <= 0) return '已过期'
  
  const days = Math.floor(remaining / (24 * 60 * 60))
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((remaining % (60 * 60)) / 60)
  
  return `${days}天 ${hours}小时 ${minutes}分钟`
}

const clearLocalStorage = () => {
  localStorage.removeItem('token')
  addLog('已清除localStorage中的token')
  refreshStatus()
}

const clearSessionStorage = () => {
  sessionStorage.removeItem('token')
  addLog('已清除sessionStorage中的token')
  refreshStatus()
}

const clearAllStorage = () => {
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
  userStore.logout()
  addLog('已清除所有存储中的token并登出')
  refreshStatus()
}

const simulateReload = () => {
  addLog('模拟页面重载...')
  // 重新初始化userStore
  userStore.token = userStore.getStoredToken()
  if (userStore.token) {
    userStore.fetchUserInfo()
    addLog('页面重载后自动恢复登录状态')
  } else {
    addLog('页面重载后未找到token')
  }
  refreshStatus()
}

const clearLogs = () => {
  logs.value = []
}

// 监听存储变化
const handleStorageChange = (e) => {
  if (e.key === 'token') {
    addLog(`存储变化: ${e.storageArea === localStorage ? 'localStorage' : 'sessionStorage'}`)
    refreshStatus()
  }
}

// 生命周期
onMounted(() => {
  refreshStatus()
  addLog('测试页面已加载')
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<style scoped>
.remember-me-test {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.test-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-section {
  margin-bottom: 30px;
}

.test-section h3 {
  margin-bottom: 15px;
  color: #409eff;
}

.log-container {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.log-item {
  display: flex;
  margin-bottom: 5px;
  font-family: monospace;
  font-size: 12px;
}

.log-time {
  color: #909399;
  margin-right: 10px;
  min-width: 80px;
}

.log-message {
  color: #303133;
}
</style>
