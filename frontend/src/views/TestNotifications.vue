<template>
  <div class="test-notifications">
    <h2>通知测试页面</h2>
    
    <div class="test-section">
      <h3>通知API测试</h3>
      <el-button @click="testGetNotifications">获取通知列表</el-button>
      <el-button @click="testGetUnreadCount">获取未读数量</el-button>
      
      <div class="test-results">
        <h4>API响应:</h4>
        <pre>{{ apiResponse }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h3>通知列表</h3>
      <div v-if="notifications.length === 0" class="no-notifications">
        暂无通知
      </div>
      <div v-else>
        <div 
          v-for="notification in notifications" 
          :key="notification._id"
          class="notification-item"
          :class="{ unread: !notification.isRead }"
        >
          <div class="notification-header">
            <span class="type">{{ notification.type }}</span>
            <span class="time">{{ formatTime(notification.createdAt) }}</span>
          </div>
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-content">{{ notification.content }}</div>
          <div class="notification-data">
            <strong>相关数据:</strong>
            <pre>{{ JSON.stringify(notification.relatedData, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { getNotifications, getUnreadCount } from '@/api/notifications';

export default {
  name: 'TestNotifications',
  setup() {
    const notifications = ref([]);
    const apiResponse = ref('');

    const testGetNotifications = async () => {
      try {
        const response = await getNotifications();
        apiResponse.value = JSON.stringify(response, null, 2);
        
        if (response.success) {
          notifications.value = response.data;
        }
        
        console.log('通知API响应:', response);
      } catch (error) {
        apiResponse.value = `错误: ${error.message}`;
        console.error('获取通知失败:', error);
      }
    };

    const testGetUnreadCount = async () => {
      try {
        const response = await getUnreadCount();
        apiResponse.value = JSON.stringify(response, null, 2);
        console.log('未读数量API响应:', response);
      } catch (error) {
        apiResponse.value = `错误: ${error.message}`;
        console.error('获取未读数量失败:', error);
      }
    };

    const formatTime = (time) => {
      return new Date(time).toLocaleString();
    };

    return {
      notifications,
      apiResponse,
      testGetNotifications,
      testGetUnreadCount,
      formatTime
    };
  }
};
</script>

<style scoped>
.test-notifications {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.test-results {
  margin-top: 15px;
}

.test-results pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
}

.notification-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
}

.notification-item.unread {
  background-color: #f0f9ff;
  border-color: #3b82f6;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.type {
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.time {
  color: #666;
  font-size: 12px;
}

.notification-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.notification-content {
  color: #666;
  margin-bottom: 10px;
}

.notification-data pre {
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.no-notifications {
  text-align: center;
  color: #999;
  padding: 40px;
}
</style>
