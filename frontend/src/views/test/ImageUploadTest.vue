<template>
  <div class="image-upload-test">
    <h2>图片上传测试</h2>
    
    <div class="test-section">
      <h3>1. 使用API函数上传</h3>
      <input type="file" @change="handleFileChange" accept="image/*" />
      <button @click="testApiUpload" :disabled="!selectedFile || uploading">
        {{ uploading ? '上传中...' : '测试API上传' }}
      </button>
    </div>

    <div class="test-section">
      <h3>2. 测试结果</h3>
      <div v-if="uploadResult" class="result">
        <h4>上传成功：</h4>
        <pre>{{ JSON.stringify(uploadResult, null, 2) }}</pre>
        <img v-if="uploadResult.data.url" :src="getFullUrl(uploadResult.data.url)" style="max-width: 300px;" />
      </div>
      <div v-if="uploadError" class="error">
        <h4>上传失败：</h4>
        <pre>{{ uploadError }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h3>3. MarkdownEditor测试</h3>
      <MarkdownEditor v-model="testContent" height="300px" />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { uploadArticleImage } from '@/api/articles';
import MarkdownEditor from '@/components/MarkdownEditor.vue';

export default {
  name: 'ImageUploadTest',
  components: {
    MarkdownEditor
  },
  setup() {
    const selectedFile = ref(null);
    const uploading = ref(false);
    const uploadResult = ref(null);
    const uploadError = ref(null);
    const testContent = ref('# 测试Markdown编辑器\n\n在这里测试图片上传功能。');

    const handleFileChange = (event) => {
      selectedFile.value = event.target.files[0];
      uploadResult.value = null;
      uploadError.value = null;
    };

    const testApiUpload = async () => {
      if (!selectedFile.value) {
        ElMessage.warning('请选择文件');
        return;
      }

      uploading.value = true;
      uploadResult.value = null;
      uploadError.value = null;

      try {
        console.log('开始上传文件:', selectedFile.value);
        const response = await uploadArticleImage(selectedFile.value);
        console.log('上传响应:', response);
        
        uploadResult.value = response.data;
        ElMessage.success('上传成功');
      } catch (error) {
        console.error('上传失败:', error);
        uploadError.value = error.response?.data || error.message;
        ElMessage.error('上传失败：' + (error.response?.data?.message || error.message));
      } finally {
        uploading.value = false;
      }
    };

    const getFullUrl = (url) => {
      if (url.startsWith('http')) {
        return url;
      }
      return `${window.location.origin}${url}`;
    };

    return {
      selectedFile,
      uploading,
      uploadResult,
      uploadError,
      testContent,
      handleFileChange,
      testApiUpload,
      getFullUrl
    };
  }
};
</script>

<style scoped>
.image-upload-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.result {
  background: #f0f9ff;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #0ea5e9;
}

.error {
  background: #fef2f2;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ef4444;
}

pre {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

button {
  margin-left: 10px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

input[type="file"] {
  margin-bottom: 10px;
}
</style>
