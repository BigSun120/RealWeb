import request from '@/utils/request';

export const getMailMemoEntries = (params = {}) => {
  return request({
    url: '/tools/mail-memo/entries',
    method: 'get',
    params
  });
};

export const createMailMemoEntry = data => {
  return request({
    url: '/tools/mail-memo/entries',
    method: 'post',
    data
  });
};

export const updateMailMemoEntry = (id, data) => {
  return request({
    url: `/tools/mail-memo/entries/${id}`,
    method: 'put',
    data
  });
};

export const deleteMailMemoEntry = id => {
  return request({
    url: `/tools/mail-memo/entries/${id}`,
    method: 'delete'
  });
};

export const toggleFavoriteMailMemoEntry = id => {
  return request({
    url: `/tools/mail-memo/entries/${id}/favorite`,
    method: 'patch'
  });
};

export const getMailMemoMeta = () => {
  return request({
    url: '/tools/mail-memo/meta',
    method: 'get'
  });
};

export const importMailMemoEntries = formData => {
  return request({
    url: '/tools/mail-memo/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const exportMailMemoEntries = params => {
  return request({
    url: '/tools/mail-memo/export',
    method: 'get',
    params,
    responseType: 'blob'
  });
};

export default {
  getMailMemoEntries,
  createMailMemoEntry,
  updateMailMemoEntry,
  deleteMailMemoEntry,
  toggleFavoriteMailMemoEntry,
  getMailMemoMeta,
  importMailMemoEntries,
  exportMailMemoEntries
};
