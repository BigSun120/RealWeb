<template>
  <div class="avatar-upload">
    <div class="avatar-container">
      <el-avatar
        :size="size"
        :src="currentAvatar"
        class="avatar"
        @error="handleAvatarError"
      >
        <el-icon><User /></el-icon>
      </el-avatar>

      <div class="upload-overlay" @click="triggerUpload">
        <el-icon class="upload-icon"><Camera /></el-icon>
        <span class="upload-text">更换头像</span>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- 操作按钮 -->
    <div class="actions" v-if="showActions">
      <el-button
        type="primary"
        size="small"
        @click="triggerUpload"
        :loading="uploading"
      >
        <el-icon><Upload /></el-icon>
        上传头像
      </el-button>

      <el-button
        type="danger"
        size="small"
        @click="deleteAvatar"
        :loading="deleting"
        v-if="currentAvatar"
      >
        <el-icon><Delete /></el-icon>
        删除头像
      </el-button>
    </div>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="预览头像"
      width="500px"
      center
      modal
      :modal-class="'avatar-preview-modal'"
      :z-index="3000"
      destroy-on-close
      draggable
      append-to-body
      :lock-scroll="true"
      :close-on-click-modal="true"
    >
      <div class="preview-container">
        <div class="preview-wrapper">
          <img :src="previewUrl" alt="头像预览" class="preview-image" />
        </div>
        <div class="preview-info">
          <p class="preview-tip">
            <el-icon><InfoFilled /></el-icon>
            预览效果，确认后将替换当前头像
          </p>
        </div>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmUpload"
          :loading="uploading"
        >
          确认上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, Camera, Upload, Delete, InfoFilled } from '@element-plus/icons-vue';
import api from '@/api';

export default {
  name: 'AvatarUpload',
  components: {
    User,
    Camera,
    Upload,
    Delete,
    InfoFilled
  },
  props: {
    avatar: {
      type: String,
      default: ''
    },
    size: {
      type: Number,
      default: 100
    },
    showActions: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:avatar', 'upload-success', 'delete-success'],
  setup(props, { emit }) {
    const fileInput = ref();
    const uploading = ref(false);
    const deleting = ref(false);
    const previewVisible = ref(false);
    const previewUrl = ref('');
    const selectedFile = ref(null);

    const currentAvatar = computed(() => {
      if (props.avatar && props.avatar.startsWith('/uploads/')) {
        // 使用相对路径，让浏览器自动处理协议和域名
        return `http://localhost:8000${props.avatar}`;
      }
      return props.avatar;
    });

    const triggerUpload = () => {
      fileInput.value?.click();
    };

    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        ElMessage.error('请选择图片文件');
        return;
      }

      // 验证文件大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        ElMessage.error('图片大小不能超过5MB');
        return;
      }

      selectedFile.value = file;

      // 创建预览URL
      const reader = new FileReader();
      reader.onload = (e) => {
        previewUrl.value = e.target.result;
        previewVisible.value = true;
      };
      reader.readAsDataURL(file);
    };

    const confirmUpload = async () => {
      if (!selectedFile.value) return;

      uploading.value = true;

      try {
        const formData = new FormData();
        formData.append('avatar', selectedFile.value);

        const response = await api.post('/users/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        ElMessage.success('头像上传成功');
        emit('update:avatar', response.data.data.avatar);
        emit('upload-success', response.data.data);

        previewVisible.value = false;
        selectedFile.value = null;

        // 清空文件输入
        if (fileInput.value) {
          fileInput.value.value = '';
        }

      } catch (error) {
        console.error('头像上传失败:', error);
        ElMessage.error(error.response?.data?.message || '头像上传失败');
      } finally {
        uploading.value = false;
      }
    };

    const deleteAvatar = async () => {
      try {
        await ElMessageBox.confirm('确定要删除当前头像吗？', '确认删除', {
          type: 'warning'
        });

        deleting.value = true;

        const response = await api.delete('/users/avatar');

        ElMessage.success('头像删除成功');
        emit('update:avatar', '');
        emit('delete-success', response.data.data);

      } catch (error) {
        if (error !== 'cancel') {
          console.error('头像删除失败:', error);
          ElMessage.error(error.response?.data?.message || '头像删除失败');
        }
      } finally {
        deleting.value = false;
      }
    };

    const handleAvatarError = () => {
      console.log('头像加载失败');
    };

    return {
      fileInput,
      uploading,
      deleting,
      previewVisible,
      previewUrl,
      currentAvatar,
      triggerUpload,
      handleFileSelect,
      confirmUpload,
      deleteAvatar,
      handleAvatarError
    };
  }
};
</script>

<style scoped>
.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.avatar-container {
  position: relative;
  cursor: pointer;
}

.avatar {
  transition: all 0.3s;
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
}

.avatar-container:hover .upload-overlay {
  opacity: 1;
}

.upload-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.upload-text {
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

.preview-container {
  text-align: center;
}

.preview-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 2px dashed #e1e8ed;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.preview-image:hover {
  transform: scale(1.02);
}

.preview-info {
  margin-top: 12px;
}

.preview-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  color: #666;
  background: #f0f7ff;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #d4edda;
}

.preview-tip .el-icon {
  color: #409eff;
}

/* 对话框蒙板样式 - 全屏覆盖 */
:global(.avatar-preview-modal) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background-color: rgba(0, 0, 0, 0.75) !important;
  backdrop-filter: blur(6px) !important;
  z-index: 2999 !important;
}

/* Element Plus 对话框蒙板覆盖 */
:global(.el-overlay) {
  background-color: rgba(0, 0, 0, 0.75) !important;
  backdrop-filter: blur(6px) !important;
}

/* 对话框样式优化 */
:global(.el-dialog) {
  border-radius: 12px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
  margin: 0 !important;
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
}

/* 对话框容器 */
:global(.el-overlay-dialog) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 10px 20px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 10px 20px 20px 20px;
  border-top: 1px solid #f0f0f0;
}
</style>
