<template>
  <div class="prompt-vault">
    <h1>AI 提示词管理 - 测试页面</h1>
    <p>如果你看到这个页面，说明基本路由是正常的。</p>
    <el-button type="primary" @click="test">测试按钮</el-button>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';

function test() {
  ElMessage.success('测试成功！');
}
</script>

<style scoped>
.prompt-vault {
  padding: 20px;
}
</style>
