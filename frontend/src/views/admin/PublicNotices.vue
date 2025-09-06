<template>
  <div class="public-notices-page">
    <el-card class="mb-16">
      <template #header>
        <div class="card-header">
          <span>公告管理</span>
          <el-button type="primary" @click="openCreate">新建公告</el-button>
        </div>
      </template>
      <el-table :data="list" stripe>
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column prop="level" label="级别" width="100" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.published ? 'success' : 'info'">{{ row.published ? '已发布' : '草稿' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="240">
          <template #default="{ row }">
            <span>{{ formatTime(row.startsAt) }} ~ {{ row.expiresAt ? formatTime(row.expiresAt) : '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="togglePublish(row)">{{ row.published ? '下线' : '发布' }}</el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '新建公告'"
      width="1200px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-tabs class="dialog-tabs" v-model="activeTab">
        <el-tab-pane label="编辑" name="edit">
          <el-form :model="form" label-width="100px" class="notice-form">
            <el-row :gutter="20">
              <el-col :span="16">
                <el-form-item label="标题"><el-input v-model="form.title" placeholder="请输入公告标题" /></el-form-item>
                <el-form-item label="级别">
                  <el-radio-group v-model="form.level">
                    <el-radio label="info">信息</el-radio>
                    <el-radio label="warning">警告</el-radio>
                    <el-radio label="critical">严重</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="正文">
                  <MarkdownEditor v-model="form.bodyMarkdown" height="560px" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-card shadow="never" class="side-card">
                  <template #header><span>展示设置</span></template>
                  <el-form-item label="按钮文案"><el-input v-model="form.ctaText" placeholder="查看详情(可选)" /></el-form-item>
                  <el-form-item label="开始时间"><el-date-picker v-model="form.startsAt" type="datetime" style="width: 100%" /></el-form-item>
                  <el-form-item label="结束时间"><el-date-picker v-model="form.expiresAt" type="datetime" style="width: 100%" /></el-form-item>
                  <el-form-item>
                    <el-checkbox v-model="form.published">保存后立即发布</el-checkbox>
                  </el-form-item>
                </el-card>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="预览" name="preview">
          <div class="preview-pane">
            <h3 class="preview-title">{{ form.title || '（无标题）' }}</h3>
            <div class="preview-meta">
              <el-tag :type="form.level==='critical'?'danger':(form.level==='warning'?'warning':'info')">
                {{ form.level }}
              </el-tag>
            </div>
            <div class="preview-body" v-html="previewHtml"></div>
            <div class="preview-footer">
              <el-button type="primary" size="small">{{ form.ctaText || '查看详情' }}</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import { marked } from 'marked';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  adminListPublicNotices,
  adminCreatePublicNotice,
  adminUpdatePublicNotice,
  adminPublishPublicNotice,
  adminDeletePublicNotice
} from '@/api/publicNotices';

export default {
  name: 'AdminPublicNotices',
  components: { MarkdownEditor },
  setup() {
    const list = ref([]);
    const dialogVisible = ref(false);
    const isEdit = ref(false);
    const editingId = ref(null);
    const activeTab = ref('edit');
    const form = ref({
      title: '', level: 'info', bodyMarkdown: '', link: '', ctaText: '', published: false,
      startsAt: new Date(), expiresAt: null
    });

    const formatTime = (t) => t ? new Date(t).toLocaleString() : '';

    const load = async () => {
      const res = await adminListPublicNotices();
      if (res.data?.success) list.value = res.data.data || [];
    };

    const openCreate = () => {
      isEdit.value = false; editingId.value = null;
      Object.assign(form.value, { title: '', level: 'info', bodyMarkdown: '', link: '', ctaText: '', published: false, startsAt: new Date(), expiresAt: null });
      dialogVisible.value = true;
    };
    const openEdit = (row) => {
      isEdit.value = true; editingId.value = row._id;
      Object.assign(form.value, {
        title: row.title, level: row.level, bodyMarkdown: row.bodyMarkdown || '', link: row.link || '', ctaText: row.ctaText || '',
        published: !!row.published, startsAt: row.startsAt ? new Date(row.startsAt) : new Date(), expiresAt: row.expiresAt ? new Date(row.expiresAt) : null
      });
      dialogVisible.value = true;


    const previewHtml = computed(() => marked.parse(form.value.bodyMarkdown || ''));

    };

    const submit = async () => {
      const payload = { ...form.value };
      // ISO 字符串传给后端
      if (payload.startsAt) payload.startsAt = new Date(payload.startsAt).toISOString();
      if (payload.expiresAt) payload.expiresAt = new Date(payload.expiresAt).toISOString();

      // 简单校验
      if (!payload.title?.trim()) return ElMessage.warning('请填写标题');
      if (!payload.bodyMarkdown?.trim()) return ElMessage.warning('请填写正文');

      if (isEdit.value && editingId.value) {
        await adminUpdatePublicNotice(editingId.value, payload);
      } else {
        await adminCreatePublicNotice(payload);
      }
      dialogVisible.value = false;
      await load();
      // 广播前台立即刷新
      window.dispatchEvent(new Event('refresh-public-notices'));
    };

    const togglePublish = async (row) => {
      await adminPublishPublicNotice(row._id, !row.published);
      await load();
      // 广播前台立即刷新
      window.dispatchEvent(new Event('refresh-public-notices'));

    };

    const remove = async (row) => {
      try {
        await ElMessageBox.confirm(`确认删除公告《${row.title}》？`, '确认删除', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        });
        await adminDeletePublicNotice(row._id);
        ElMessage.success('删除成功');
        await load();
      } catch (e) {
        // 取消
      }
        // 广播前台立即刷新
        window.dispatchEvent(new Event('refresh-public-notices'));

    };

    onMounted(load);

    return { list, dialogVisible, isEdit, form, openCreate, openEdit, submit, togglePublish, remove, formatTime };
  }
};
</script>

<style scoped>
.mb-16{ margin-bottom:16px; }
.card-header{ display:flex; justify-content:space-between; align-items:center; }
</style>

