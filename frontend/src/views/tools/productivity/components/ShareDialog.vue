<template>
  <el-dialog
    v-model="dialogVisible"
    title="分享提示词"
    width="600px"
    :close-on-click-modal="false"
    :lock-scroll="true"
    :modal-append-to-body="true"
    :append-to-body="true"
    @open="handleOpen"
    @close="handleClose"
  >
    <div class="share-dialog" v-if="prompt">
      <div class="prompt-info">
        <h3>{{ prompt.title }}</h3>
        <p>{{ prompt.description }}</p>
      </div>

      <el-alert
        v-if="prompt.visibility === 'private'"
        title="提示"
        type="info"
        :closable="false"
        show-icon
      >
        此提示词当前为私有状态，生成分享链接后将自动变为"不公开"状态（仅知道链接的人可访问）
      </el-alert>

      <div class="share-options">
        <div v-if="shareUrl" v-loading="generating" class="share-result">
          <div class="result-header">
            <h4>分享链接</h4>
            <el-button type="primary" size="small" :icon="CopyDocument" @click="copyShareUrl">
              复制链接
            </el-button>
          </div>
          <el-input
            v-model="shareUrl"
            readonly
            class="share-url-input"
          >
            <template #append>
              <el-button :icon="CopyDocument" @click="copyShareUrl" />
            </template>
          </el-input>

          <div class="share-actions">
            <h4>分享到</h4>
            <div class="action-buttons">
              <el-button @click="shareToWeChat">
                <span class="share-icon">💬</span>
                微信
              </el-button>
              <el-button @click="shareToQQ">
                <span class="share-icon">🐧</span>
                QQ
              </el-button>
              <el-button @click="shareToWeibo">
                <span class="share-icon">📱</span>
                微博
              </el-button>
              <el-button @click="shareToTwitter">
                <span class="share-icon">🐦</span>
                Twitter
              </el-button>
            </div>
          </div>

          <div class="qrcode-section">
            <h4>二维码</h4>
            <div class="qrcode-container" ref="qrcodeRef"></div>
            <p class="qrcode-tip">扫描二维码直接访问</p>
          </div>
        </div>

        <div v-else class="generate-section">
          <el-button type="primary" @click="generateShareLink" :loading="generating">
            生成分享链接
          </el-button>
        </div>
      </div>

      <div class="share-settings">
        <el-divider />
        <h4>分享设置</h4>
        <div class="setting-item">
          <span class="setting-label">可见性：</span>
          <el-tag :type="getVisibilityType(prompt.visibility)">
            {{ getVisibilityLabel(prompt.visibility) }}
          </el-tag>
        </div>
        <div class="setting-item">
          <span class="setting-label">允许复制：</span>
          <el-tag :type="prompt.allowFork ? 'success' : 'info'">
            {{ prompt.allowFork ? '是' : '否' }}
          </el-tag>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument } from '@element-plus/icons-vue';
import { useClipboard } from '@vueuse/core';
import QRCode from 'qrcode';

const promptService = inject('promptService');

const props = defineProps({
  visible: Boolean,
  prompt: Object
});

const emit = defineEmits(['update:visible']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const generating = ref(false);
const shareUrl = ref('');
const qrcodeRef = ref(null);

const { copy, copied } = useClipboard();

// 监听复制状态
watch(copied, (isCopied) => {
  if (isCopied) {
    ElMessage.success('已复制到剪贴板');
  }
});

// 监听对话框打开
watch(() => props.visible, (visible) => {
  if (visible && props.prompt) {
    shareUrl.value = '';
    // 如果已有分享token，直接显示链接
    if (props.prompt.shareToken) {
      generateShareUrl(props.prompt.shareToken);
    }
  }
});

async function generateShareLink() {
  try {
    generating.value = true;
    const response = await promptService.generateShareLink(props.prompt.id);
    const token = response.data.shareToken;
    generateShareUrl(token);
  } catch (error) {
    ElMessage.error('生成分享链接失败: ' + error.message);
  } finally {
    generating.value = false;
  }
}

function generateShareUrl(token) {
  const baseUrl = window.location.origin;
  shareUrl.value = `${baseUrl}/tools/prompt-vault/share/${token}`;

  // 生成二维码
  nextTick(() => {
    generateQRCode();
  });
}

async function generateQRCode() {
  if (!qrcodeRef.value || !shareUrl.value) return;

  try {
    // 清空之前的二维码
    qrcodeRef.value.innerHTML = '';

    // 生成新的二维码
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, shareUrl.value, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    qrcodeRef.value.appendChild(canvas);
  } catch (error) {
    console.error('生成二维码失败:', error);
  }
}

function copyShareUrl() {
  copy(shareUrl.value);
}

function shareToWeChat() {
  // 微信分享需要通过二维码或复制链接
  ElMessage.info('请复制链接或扫描二维码分享到微信');
  copyShareUrl();
}

function shareToQQ() {
  const url = encodeURIComponent(shareUrl.value);
  const title = encodeURIComponent(props.prompt.title);
  const desc = encodeURIComponent(props.prompt.description || '');
  window.open(
    `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&desc=${desc}`,
    '_blank'
  );
}

function shareToWeibo() {
  const url = encodeURIComponent(shareUrl.value);
  const title = encodeURIComponent(`${props.prompt.title} - ${props.prompt.description || ''}`);
  window.open(
    `https://service.weibo.com/share/share.php?url=${url}&title=${title}`,
    '_blank'
  );
}

function shareToTwitter() {
  const url = encodeURIComponent(shareUrl.value);
  const text = encodeURIComponent(`${props.prompt.title} - ${props.prompt.description || ''}`);
  window.open(
    `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    '_blank'
  );
}

function getVisibilityLabel(visibility) {
  const labels = {
    private: '私有',
    unlisted: '不公开',
    public: '公开'
  };
  return labels[visibility] || visibility;
}

function getVisibilityType(visibility) {
  const types = {
    private: 'danger',
    unlisted: 'warning',
    public: 'success'
  };
  return types[visibility] || 'info';
}

function handleOpen() {
  // 当对话框打开时，使用更强大的滚动锁定
  document.documentElement.classList.add('dialog-open');
  document.body.classList.add('dialog-open');
}

function handleClose() {
  // 当对话框关闭时，恢复滚动
  document.documentElement.classList.remove('dialog-open');
  document.body.classList.remove('dialog-open');

  dialogVisible.value = false;
}
</script>

<style scoped lang="scss">
.share-dialog {
  .prompt-info {
    margin-bottom: 20px;

    h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      color: #606266;
      line-height: 1.6;
    }
  }

  .el-alert {
    margin-bottom: 20px;
  }

  .share-options {
    min-height: 200px;

    .generate-section {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .share-result {
      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
      }

      .share-url-input {
        margin-bottom: 24px;
      }

      .share-actions {
        margin-bottom: 24px;

        h4 {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;

          .share-icon {
            margin-right: 6px;
            font-size: 18px;
          }
        }
      }

      .qrcode-section {
        text-align: center;

        h4 {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .qrcode-container {
          display: inline-block;
          padding: 12px;
          background: white;
          border: 1px solid #ebeef5;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .qrcode-tip {
          margin: 0;
          font-size: 13px;
          color: #909399;
        }
      }
    }
  }

  .share-settings {
    margin-top: 20px;

    h4 {
      margin: 16px 0 12px;
      font-size: 16px;
      font-weight: 600;
    }

    .setting-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;

      .setting-label {
        min-width: 80px;
        color: #606266;
      }
    }
  }
}
</style>
