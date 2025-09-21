// Common permissions label map and helpers

export const PERMISSION_LABELS = {
  'blog:create': '创建博客',
  'blog:edit': '编辑博客',
  'blog:delete': '删除博客',
  'blog:publish': '发布博客',
  'comment:create': '发表评论',
  'comment:edit': '编辑评论',
  'comment:delete': '删除评论',
  'profile:edit': '编辑个人资料',
  'file:upload': '上传文件'
};

export function toPermissionOptions(values = []) {
  return values.map(v => ({ value: v, label: PERMISSION_LABELS[v] || v }));
}

export function groupPermissionOptions(options = []) {
  return {
    blog: options.filter(o => o.value.startsWith('blog:')),
    comment: options.filter(o => o.value.startsWith('comment:')),
    other: options.filter(o => o.value.startsWith('profile:') || o.value.startsWith('file:'))
  };
}

