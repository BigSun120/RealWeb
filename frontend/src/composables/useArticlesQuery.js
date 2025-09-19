// Route-synced state for the blog articles list page
import { reactive, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export function useArticlesQuery(initial = {}) {
  const route = useRoute();
  const router = useRouter();

  const state = reactive({
    q: '',
    tag: '全部',
    cat: '全部',
    page: 1,
    size: 12,
    view: 'list',
    ...initial
  });

  onMounted(() => {
    const q = route.query;
    state.q = typeof q.q === 'string' ? q.q : state.q;
    state.tag = typeof q.tag === 'string' ? q.tag : state.tag;
    state.cat = typeof q.cat === 'string' ? q.cat : state.cat;
    state.page = q.page ? Number(q.page) : state.page;
    state.size = q.size ? Number(q.size) : state.size;
    state.view = typeof q.view === 'string' ? q.view : state.view;
  });

  watch(
    state,
    s => {
      router.replace({
        query: {
          q: s.q || undefined,
          tag: s.tag !== '全部' ? s.tag : undefined,
          cat: s.cat !== '全部' ? s.cat : undefined,
          page: s.page !== 1 ? s.page : undefined,
          size: s.size !== 12 ? s.size : undefined,
          view: s.view !== 'list' ? s.view : undefined
        }
      });
    },
    { deep: true }
  );

  return state;
}

