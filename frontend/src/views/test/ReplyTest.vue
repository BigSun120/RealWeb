<template>
  <div class="reply-test">
    <h2>回复功能测试</h2>
    
    <div class="test-instructions">
      <h3>测试步骤：</h3>
      <ol>
        <li>发表一条根评论</li>
        <li>对根评论进行回复（1级回复）</li>
        <li>不展开回复列表，直接对1级回复进行回复（2级回复）</li>
        <li>验证：回复成功后应该能看到所有回复，包括之前的1级回复和新的2级回复</li>
      </ol>
      
      <div class="test-scenarios">
        <h4>测试场景：</h4>
        <ul>
          <li><strong>场景1</strong>：回复列表未展开时直接回复</li>
          <li><strong>场景2</strong>：回复列表已展开时回复</li>
          <li><strong>场景3</strong>：多级回复嵌套</li>
        </ul>
      </div>
    </div>

    <!-- 评论组件 -->
    <CommentList article-id="reply-test-article" />
  </div>
</template>

<script>
import CommentList from '@/components/CommentList.vue';

export default {
  name: 'ReplyTest',
  components: {
    CommentList
  }
};
</script>

<style scoped>
.reply-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.test-instructions {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.test-instructions h3,
.test-instructions h4 {
  margin-top: 0;
  color: #0369a1;
}

.test-instructions ol,
.test-instructions ul {
  margin: 12px 0;
  padding-left: 20px;
}

.test-instructions li {
  margin: 8px 0;
  line-height: 1.5;
}

.test-scenarios {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #bae6fd;
}
</style>
