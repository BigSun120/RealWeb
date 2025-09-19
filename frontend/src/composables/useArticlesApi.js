// Lightweight API wrapper for blog articles list page
import api from '@/api';

export function useArticlesApi() {
  const getArticles = (params = {}) => api.get('/articles', { params });
  const getFilterOptions = () => api.get('/articles/filter-options');
  return { getArticles, getFilterOptions };
}

