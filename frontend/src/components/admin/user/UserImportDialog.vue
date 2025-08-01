<template>
  <el-dialog
    v-model="visible"
    title="导入用户"
    width="600px"
    :before-close="handleClose"
  >
    <div class="import-content">
      <!-- 步骤指示器 -->
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择文件" />
        <el-step title="数据预览" />
        <el-step title="导入完成" />
      </el-steps>

      <!-- 步骤1: 文件上传 -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="upload-area">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :show-file-list="false"
            accept=".csv,.xlsx,.xls"
            :on-change="handleFileChange"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 CSV、Excel 格式，文件大小不超过 10MB
              </div>
            </template>
          </el-upload>
        </div>

        <div v-if="selectedFile" class="file-info">
          <el-alert
            :title="`已选择文件: ${selectedFile.name}`"
            type="success"
            :closable="false"
          />
        </div>

        <div class="template-download">
          <el-divider content-position="left">模板下载</el-divider>
          <p>请下载模板文件，按照模板格式填写用户数据：</p>
          <el-button type="primary" plain @click="downloadTemplate">
            <el-icon><Download /></el-icon>
            下载模板
          </el-button>
        </div>
      </div>

      <!-- 步骤2: 数据预览 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="preview-info">
          <el-alert
            :title="`共解析到 ${previewData.length} 条用户数据`"
            type="info"
            :closable="false"
          />
        </div>

        <div class="preview-table">
          <el-table :data="previewData.slice(0, 10)" border max-height="300">
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="email" label="邮箱" width="180" />
            <el-table-column prop="isAdmin" label="角色" width="80">
              <template #default="{ row }">
                {{ row.isAdmin ? '管理员' : '普通用户' }}
              </template>
            </el-table-column>
            <el-table-column prop="isActive" label="状态" width="80">
              <template #default="{ row }">
                {{ row.isActive ? '正常' : '禁用' }}
              </template>
            </el-table-column>
            <el-table-column prop="bio" label="个人简介" show-overflow-tooltip />
          </el-table>
        </div>

        <div v-if="previewData.length > 10" class="preview-tip">
          <el-alert
            title="仅显示前10条数据预览"
            type="warning"
            :closable="false"
          />
        </div>
      </div>

      <!-- 步骤3: 导入结果 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="import-result">
          <el-result
            :icon="importResult.success ? 'success' : 'error'"
            :title="importResult.title"
            :sub-title="importResult.message"
          >
            <template #extra>
              <div v-if="importResult.details" class="result-details">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="总数据量">
                    {{ importResult.details.total }}
                  </el-descriptions-item>
                  <el-descriptions-item label="成功导入">
                    {{ importResult.details.success }}
                  </el-descriptions-item>
                  <el-descriptions-item label="导入失败">
                    {{ importResult.details.failed }}
                  </el-descriptions-item>
                  <el-descriptions-item label="重复跳过">
                    {{ importResult.details.skipped }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-result>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ currentStep === 2 ? '关闭' : '取消' }}
        </el-button>
        <el-button
          v-if="currentStep === 0"
          type="primary"
          :disabled="!selectedFile"
          @click="handleNext"
        >
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 1"
          @click="handlePrevious"
        >
          上一步
        </el-button>
        <el-button
          v-if="currentStep === 1"
          type="primary"
          :loading="importing"
          @click="handleImport"
        >
          开始导入
        </el-button>
        <el-button
          v-if="currentStep === 2"
          type="primary"
          @click="handleClose"
        >
          完成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled, Download } from '@element-plus/icons-vue';

export default {
  name: 'UserImportDialog',
  components: {
    UploadFilled,
    Download
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'success'],
  setup(props, { emit }) {
    const visible = ref(false);
    const currentStep = ref(0);
    const selectedFile = ref(null);
    const previewData = ref([]);
    const importing = ref(false);
    const importResult = ref({});

    // 监听显示状态
    watch(() => props.modelValue, (newVal) => {
      visible.value = newVal;
      if (newVal) {
        resetDialog();
      }
    });

    // 监听visible变化
    watch(visible, (newVal) => {
      emit('update:modelValue', newVal);
    });

    // 重置对话框
    const resetDialog = () => {
      currentStep.value = 0;
      selectedFile.value = null;
      previewData.value = [];
      importing.value = false;
      importResult.value = {};
    };

    // 文件选择
    const handleFileChange = (file) => {
      selectedFile.value = file;
    };

    // 下载模板
    const downloadTemplate = () => {
      // 创建模板数据
      const templateData = [
        ['用户名', '邮箱', '密码', '个人简介', '是否管理员', '是否启用'],
        ['user001', 'user001@example.com', '123456', '这是用户简介', 'false', 'true'],
        ['admin001', 'admin001@example.com', '123456', '管理员账户', 'true', 'true']
      ];

      // 创建CSV内容
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // 下载文件
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = '用户导入模板.csv';
      link.click();
      
      ElMessage.success('模板下载成功');
    };

    // 下一步
    const handleNext = () => {
      if (!selectedFile.value) {
        ElMessage.warning('请先选择文件');
        return;
      }

      // 解析文件
      parseFile();
    };

    // 上一步
    const handlePrevious = () => {
      currentStep.value = 0;
    };

    // 解析文件
    const parseFile = () => {
      // 模拟解析文件数据
      previewData.value = [
        {
          username: 'user001',
          email: 'user001@example.com',
          bio: '普通用户',
          isAdmin: false,
          isActive: true
        },
        {
          username: 'user002',
          email: 'user002@example.com',
          bio: '测试用户',
          isAdmin: false,
          isActive: true
        },
        {
          username: 'admin001',
          email: 'admin001@example.com',
          bio: '管理员用户',
          isAdmin: true,
          isActive: true
        }
      ];

      currentStep.value = 1;
    };

    // 开始导入
    const handleImport = async () => {
      try {
        importing.value = true;

        // 模拟导入过程
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 模拟导入结果
        importResult.value = {
          success: true,
          title: '导入成功',
          message: '用户数据已成功导入系统',
          details: {
            total: previewData.value.length,
            success: previewData.value.length - 1,
            failed: 1,
            skipped: 0
          }
        };

        currentStep.value = 2;
        emit('success');

      } catch (error) {
        importResult.value = {
          success: false,
          title: '导入失败',
          message: error.message || '导入过程中发生错误'
        };
        currentStep.value = 2;
      } finally {
        importing.value = false;
      }
    };

    // 关闭对话框
    const handleClose = () => {
      visible.value = false;
    };

    return {
      visible,
      currentStep,
      selectedFile,
      previewData,
      importing,
      importResult,
      handleFileChange,
      downloadTemplate,
      handleNext,
      handlePrevious,
      handleImport,
      handleClose
    };
  }
};
</script>

<style scoped>
.import-content {
  padding: 20px 0;
}

.step-content {
  margin-top: 30px;
  min-height: 200px;
}

.upload-area {
  margin-bottom: 20px;
}

.file-info {
  margin-bottom: 20px;
}

.template-download {
  margin-top: 20px;
}

.template-download p {
  margin: 10px 0;
  color: #606266;
}

.preview-info {
  margin-bottom: 16px;
}

.preview-table {
  margin-bottom: 16px;
}

.preview-tip {
  margin-top: 16px;
}

.import-result {
  text-align: center;
}

.result-details {
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
