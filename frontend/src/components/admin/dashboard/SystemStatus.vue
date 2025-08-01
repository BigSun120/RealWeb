<template>
  <el-card class="system-status" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="title">系统状态</span>
        <el-button text @click="refreshStatus">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </template>

    <div v-loading="loading" class="status-content">
      <div class="status-grid">
        <div
          v-for="item in statusItems"
          :key="item.key"
          class="status-item"
        >
          <div class="status-header">
            <div class="status-icon">
              <el-icon :color="getStatusColor(item.status)" :size="20">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <div class="status-info">
              <div class="status-name">{{ item.name }}</div>
              <div class="status-value">{{ item.value }}</div>
            </div>
          </div>

          <div class="status-indicator">
            <el-tag
              :type="getStatusTagType(item.status)"
              size="small"
              effect="plain"
            >
              {{ getStatusText(item.status) }}
            </el-tag>
          </div>
        </div>
      </div>

      <div class="system-info">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="服务器时间">
            {{ serverTime }}
          </el-descriptions-item>
          <el-descriptions-item label="运行时长">
            {{ uptime }}
          </el-descriptions-item>
          <el-descriptions-item label="Node.js版本">
            {{ systemInfo.nodeVersion }}
          </el-descriptions-item>
          <el-descriptions-item label="内存使用">
            {{ systemInfo.memoryUsage }}
          </el-descriptions-item>
          <el-descriptions-item label="CPU使用率">
            {{ systemInfo.cpuUsage }}
          </el-descriptions-item>
          <el-descriptions-item label="磁盘使用">
            {{ systemInfo.diskUsage }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </el-card>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Refresh,
  Monitor,
  Connection,
  Cpu,
  FolderOpened
} from '@element-plus/icons-vue';
import { getSystemStatus } from '@/api/admin';

export default {
  name: 'SystemStatus',
  components: {
    Refresh,
    Monitor,
    Connection,
    Cpu,
    FolderOpened
  },
  setup() {
    const loading = ref(false);
    const serverTime = ref('');
    const uptime = ref('');
    const systemInfo = ref({
      nodeVersion: '--',
      memoryUsage: '--',
      cpuUsage: '--',
      diskUsage: '--'
    });

    const statusItems = ref([
      {
        key: 'server',
        name: '服务器',
        icon: 'Monitor',
        status: 'online',
        value: '正常运行'
      },
      {
        key: 'database',
        name: '数据库',
        icon: 'Connection',
        status: 'online',
        value: 'MongoDB 连接正常'
      },
      {
        key: 'memory',
        name: '内存',
        icon: 'Cpu',
        status: 'normal',
        value: '使用率 65%'
      },
      {
        key: 'disk',
        name: '磁盘',
        icon: 'FolderOpened',
        status: 'normal',
        value: '剩余空间 2.5GB'
      }
    ]);

    let timeInterval = null;

    // 获取状态颜色
    const getStatusColor = (status) => {
      const colorMap = {
        'online': '#67c23a',
        'offline': '#f56c6c',
        'normal': '#409eff',
        'warning': '#e6a23c',
        'error': '#f56c6c'
      };
      return colorMap[status] || '#909399';
    };

    // 获取状态标签类型
    const getStatusTagType = (status) => {
      const tagMap = {
        'online': 'success',
        'offline': 'danger',
        'normal': 'primary',
        'warning': 'warning',
        'error': 'danger'
      };
      return tagMap[status] || 'info';
    };

    // 获取状态文本
    const getStatusText = (status) => {
      const textMap = {
        'online': '在线',
        'offline': '离线',
        'normal': '正常',
        'warning': '警告',
        'error': '错误'
      };
      return textMap[status] || '未知';
    };

    // 格式化运行时长
    const formatUptime = (seconds) => {
      if (!seconds) return '--';

      const days = Math.floor(seconds / (24 * 3600));
      const hours = Math.floor((seconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (days > 0) {
        return `${days}天 ${hours}小时 ${minutes}分钟`;
      } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟`;
      } else {
        return `${minutes}分钟`;
      }
    };

    // 格式化内存使用
    const formatMemoryUsage = (usage) => {
      if (!usage) return '--';

      const { used, total } = usage;
      const usedMB = Math.round(used / 1024 / 1024);
      const totalMB = Math.round(total / 1024 / 1024);
      const percentage = Math.round((used / total) * 100);

      return `${usedMB}MB / ${totalMB}MB (${percentage}%)`;
    };

    // 更新服务器时间
    const updateServerTime = () => {
      serverTime.value = new Date().toLocaleString('zh-CN');
    };

    // 加载系统状态
    const loadSystemStatus = async () => {
      try {
        loading.value = true;
        const response = await getSystemStatus();
        const data = response.data.data;

        // 更新系统信息
        systemInfo.value = {
          nodeVersion: data.nodeVersion || '--',
          memoryUsage: formatMemoryUsage(data.memory),
          cpuUsage: data.cpuUsage ? `${data.cpuUsage}%` : '--',
          diskUsage: data.diskUsage ? `${data.diskUsage}%` : '--'
        };

        // 更新运行时长
        uptime.value = formatUptime(data.uptime);

        // 更新状态项
        statusItems.value.forEach(item => {
          switch (item.key) {
            case 'server':
              item.status = data.serverStatus || 'online';
              item.value = data.serverStatus === 'online' ? '正常运行' : '服务异常';
              break;
            case 'database':
              item.status = data.databaseStatus || 'online';
              item.value = data.databaseStatus === 'online' ? 'MongoDB 连接正常' : 'MongoDB 连接异常';
              break;
            case 'memory':
              const memUsage = data.memory ? Math.round((data.memory.used / data.memory.total) * 100) : 0;
              item.status = memUsage > 80 ? 'warning' : 'normal';
              item.value = `使用率 ${memUsage}%`;
              break;
            case 'disk':
              const diskUsage = data.diskUsage || 0;
              item.status = diskUsage > 80 ? 'warning' : 'normal';
              item.value = `使用率 ${diskUsage}%`;
              break;
          }
        });

      } catch (error) {
        console.error('加载系统状态失败:', error);
        ElMessage.error('加载系统状态失败');

        // 模拟数据用于开发测试
        systemInfo.value = {
          nodeVersion: 'v18.17.0',
          memoryUsage: '256MB / 512MB (50%)',
          cpuUsage: '25%',
          diskUsage: '45%'
        };
        uptime.value = '2天 5小时 30分钟';
      } finally {
        loading.value = false;
      }
    };

    // 刷新状态
    const refreshStatus = () => {
      loadSystemStatus();
    };

    onMounted(() => {
      loadSystemStatus();
      updateServerTime();

      // 每秒更新服务器时间
      timeInterval = setInterval(updateServerTime, 1000);
    });

    onUnmounted(() => {
      if (timeInterval) {
        clearInterval(timeInterval);
      }
    });

    return {
      loading,
      serverTime,
      uptime,
      systemInfo,
      statusItems,
      getStatusColor,
      getStatusTagType,
      getStatusText,
      refreshStatus
    };
  }
};
</script>

<style scoped>
.system-status {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.status-content {
  min-height: 300px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.status-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s;
}

.status-item:hover {
  border-color: #409eff;
  background: #fff;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-info {
  flex: 1;
}

.status-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.status-value {
  font-size: 14px;
  color: #606266;
}

.status-indicator {
  text-align: right;
}

.system-info {
  margin-top: 24px;
}

@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .status-item {
    padding: 12px;
  }

  .status-header {
    gap: 8px;
  }

  .status-icon {
    width: 32px;
    height: 32px;
  }
}
</style>
