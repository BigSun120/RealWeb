import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import backgroundManagerPlugin from './plugins/backgroundManager';

// 全局样式 - 按顺序引入
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/main.scss';

// 引入动画库
import 'animate.css';
import AOS from 'aos';
import 'aos/dist/aos.css';

import { getPublicNoticeSettings } from './api/publicNotices';

// 预拉取公告展示设置（公开读），写入全局变量供早期组件使用
(async () => {
  try {
    const res = await getPublicNoticeSettings();
    const placements = res.data?.data?.placements;
    if (Array.isArray(placements) && placements.length) {
      window.__PUBLIC_NOTICE_PLACEMENTS__ = placements;
    }
  } catch (_) {
    window.__PUBLIC_NOTICE_PLACEMENTS__ = ['banner', 'dropdown'];
  }
})();

const app = createApp(App);

// 初始化AOS动画库
AOS.init({
  duration: 800,
  easing: 'ease-in-out',
  once: true,
  offset: 100
});

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// 注册背景管理器插件
app.use(backgroundManagerPlugin, {
  autoEnable: true,
  responsive: true,
  autoLoadOnRouteChange: true,
  applyCSSVariables: true,
  debug: process.env.NODE_ENV === 'development'
});

// 等路由就绪再挂载，避免在 /admin 刷新时短暂渲染默认布局导致闪屏
router.isReady().then(() => {
  app.mount('#app');
});
