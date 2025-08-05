import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';

// 全局样式 - 按顺序引入
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/main.scss';

// 引入动画库
import 'animate.css';
import AOS from 'aos';
import 'aos/dist/aos.css';

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

app.mount('#app');
