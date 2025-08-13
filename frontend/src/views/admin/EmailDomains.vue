<template>
  <div class="email-domains-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>📧 邮箱域名管理</h2>
          <el-button type="primary" @click="showAddDialog">
            添加域名
          </el-button>
        </div>
      </template>

      <!-- 域名列表 -->
      <div class="domains-list">
        <el-alert
          title="域名优先级说明"
          description="域名按列表顺序使用，排在前面的域名优先级更高。可以拖拽调整顺序。"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-table 
          :data="domains" 
          v-loading="loading"
          empty-text="暂无域名"
          row-key="domain"
        >
          <el-table-column label="排序" width="60">
            <template #default="{ $index }">
              <span class="priority-number">{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="domain" label="域名">
            <template #default="{ row, $index }">
              <el-tag 
                :type="$index === 0 ? 'success' : 'primary'"
                size="large"
              >
                {{ row }}
                <span v-if="$index === 0" style="margin-left: 5px">⭐</span>
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag type="success" size="small">活跃</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row, $index }">
              <el-button 
                size="small" 
                @click="moveUp($index)"
                :disabled="$index === 0"
              >
                上移
              </el-button>
              <el-button 
                size="small" 
                @click="moveDown($index)"
                :disabled="$index === domains.length - 1"
              >
                下移
              </el-button>
              <el-button 
                type="danger" 
                size="small"
                @click="deleteDomain(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 配置信息 -->
      <div class="config-info" style="margin-top: 20px">
        <el-descriptions title="配置信息" :column="2" border>
          <el-descriptions-item label="域名总数">
            {{ domains.length }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatDate(lastUpdated) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <!-- 添加域名对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加邮箱域名"
      width="500px"
    >
      <el-form :model="newDomain" :rules="domainRules" ref="domainForm">
        <el-form-item label="域名" prop="domain">
          <el-input 
            v-model="newDomain.domain" 
            placeholder="例如: example.com"
            clearable
          />
          <div class="form-tip">
            <p>• 请输入有效的域名格式</p>
            <p>• 建议使用你拥有的域名</p>
            <p>• 新域名将添加到列表末尾</p>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addDomain" :loading="adding">
          添加
        </el-button>
      </template>
    </el-dialog>

    <!-- DNS配置提示 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <h3>🌐 DNS配置指南</h3>
      </template>
      
      <el-alert
        title="重要提醒"
        description="添加域名后，需要配置相应的DNS记录才能正常接收邮件"
        type="warning"
        :closable="false"
        style="margin-bottom: 15px"
      />
      
      <div class="dns-guide">
        <h4>⚠️ 重要：DNS配置在域名注册商管理面板中操作，不是在代码中！</h4>

        <el-steps :active="4" align-center style="margin: 20px 0">
          <el-step title="登录域名管理" description="访问域名注册商网站" />
          <el-step title="找到DNS管理" description="域名解析/DNS设置" />
          <el-step title="添加记录" description="按下表添加DNS记录" />
          <el-step title="等待生效" description="通常5-30分钟" />
        </el-steps>

        <h4>需要添加的DNS记录表格：</h4>
        <el-table :data="dnsRecords" border style="margin: 15px 0">
          <el-table-column prop="type" label="记录类型" width="80" />
          <el-table-column prop="name" label="主机记录" width="100" />
          <el-table-column prop="value" label="记录值" />
          <el-table-column prop="priority" label="优先级" width="80" />
          <el-table-column prop="ttl" label="TTL" width="80" />
          <el-table-column prop="description" label="说明" />
        </el-table>

        <el-alert
          title="示例：如果你的域名是 godaug.fun，服务器IP是 123.456.789.100"
          type="info"
          :closable="false"
          style="margin: 15px 0"
        />

        <el-table :data="exampleRecords" border>
          <el-table-column prop="type" label="类型" width="60" />
          <el-table-column prop="name" label="名称" width="80" />
          <el-table-column prop="value" label="值" />
          <el-table-column prop="priority" label="优先级" width="80" />
        </el-table>

        <div style="margin-top: 20px">
          <h4>🔧 常见域名注册商配置入口：</h4>
          <ul>
            <li><strong>Namecheap:</strong> Domain List → Manage → Advanced DNS</li>
            <li><strong>GoDaddy:</strong> 我的产品 → 域名 → DNS管理</li>
            <li><strong>阿里云:</strong> 控制台 → 域名 → 解析设置</li>
            <li><strong>腾讯云:</strong> 控制台 → 域名注册 → 解析</li>
            <li><strong>Cloudflare:</strong> Dashboard → 域名 → DNS</li>
          </ul>
        </div>

        <el-alert
          title="💡 提示：配置完成后，可以使用 nslookup 或在线工具检查DNS是否生效"
          type="success"
          :closable="false"
          style="margin-top: 15px"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/index'

// 响应式数据
const loading = ref(false)
const domains = ref([])
const lastUpdated = ref('')
const addDialogVisible = ref(false)
const adding = ref(false)

const newDomain = ref({
  domain: ''
})

// 表单验证规则
const domainRules = {
  domain: [
    { required: true, message: '请输入域名', trigger: 'blur' },
    { 
      pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, 
      message: '请输入有效的域名格式', 
      trigger: 'blur' 
    }
  ]
}

const domainForm = ref()

// DNS记录数据
const dnsRecords = ref([
  {
    type: 'A',
    name: '@',
    value: '你的服务器IP',
    priority: '-',
    ttl: '3600',
    description: '主域名指向服务器'
  },
  {
    type: 'A',
    name: 'mail',
    value: '你的服务器IP',
    priority: '-',
    ttl: '3600',
    description: '邮件服务器指向'
  },
  {
    type: 'MX',
    name: '@',
    value: 'mail.yourdomain.com',
    priority: '10',
    ttl: '3600',
    description: '邮件交换记录'
  },
  {
    type: 'TXT',
    name: '@',
    value: 'v=spf1 a mx ~all',
    priority: '-',
    ttl: '3600',
    description: 'SPF记录（可选）'
  }
])

const exampleRecords = ref([
  {
    type: 'A',
    name: '@',
    value: '123.456.789.100',
    priority: '-'
  },
  {
    type: 'A',
    name: 'mail',
    value: '123.456.789.100',
    priority: '-'
  },
  {
    type: 'MX',
    name: '@',
    value: 'mail.godaug.fun',
    priority: '10'
  },
  {
    type: 'TXT',
    name: '@',
    value: 'v=spf1 a mx ~all',
    priority: '-'
  }
])

// 加载域名列表
const loadDomains = async () => {
  try {
    loading.value = true
    const response = await request.get('/admin/email-domains')
    
    if (response.data.success) {
      domains.value = response.data.data.domains
      lastUpdated.value = response.data.data.lastUpdated
    }
  } catch (error) {
    console.error('加载域名列表失败:', error)
    ElMessage.error('加载域名列表失败')
  } finally {
    loading.value = false
  }
}

// 显示添加对话框
const showAddDialog = () => {
  newDomain.value.domain = ''
  addDialogVisible.value = true
}

// 添加域名
const addDomain = async () => {
  try {
    await domainForm.value.validate()
    
    adding.value = true
    const response = await request.post('/admin/email-domains/add', {
      domain: newDomain.value.domain
    })
    
    if (response.data.success) {
      ElMessage.success('域名添加成功')
      addDialogVisible.value = false
      loadDomains()
    }
  } catch (error) {
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('添加域名失败')
    }
  } finally {
    adding.value = false
  }
}

// 删除域名
const deleteDomain = async (domain) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除域名 "${domain}" 吗？删除后该域名将无法接收邮件。`,
      '确认删除',
      { type: 'warning' }
    )
    
    const response = await request.delete(`/admin/email-domains/${domain}`)
    
    if (response.data.success) {
      ElMessage.success('域名删除成功')
      loadDomains()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除域名失败')
    }
  }
}

// 上移域名
const moveUp = async (index) => {
  if (index === 0) return
  
  const newDomains = [...domains.value]
  const temp = newDomains[index]
  newDomains[index] = newDomains[index - 1]
  newDomains[index - 1] = temp
  
  await updateDomainOrder(newDomains)
}

// 下移域名
const moveDown = async (index) => {
  if (index === domains.value.length - 1) return
  
  const newDomains = [...domains.value]
  const temp = newDomains[index]
  newDomains[index] = newDomains[index + 1]
  newDomains[index + 1] = temp
  
  await updateDomainOrder(newDomains)
}

// 更新域名顺序
const updateDomainOrder = async (newDomains) => {
  try {
    const response = await request.post('/admin/email-domains/reorder', {
      domains: newDomains
    })
    
    if (response.data.success) {
      domains.value = newDomains
      ElMessage.success('域名顺序更新成功')
    }
  } catch (error) {
    ElMessage.error('更新域名顺序失败')
    loadDomains() // 重新加载以恢复原顺序
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 组件挂载时加载数据
onMounted(() => {
  loadDomains()
})
</script>

<style scoped>
.email-domains-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  color: #409eff;
}

.priority-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #f0f0f0;
  border-radius: 50%;
  font-weight: bold;
  color: #666;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.form-tip p {
  margin: 2px 0;
}

.dns-guide h4 {
  color: #409eff;
  margin-bottom: 10px;
}

.dns-guide pre {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
