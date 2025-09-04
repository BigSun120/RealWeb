<template>
  <div class="about-page">
    <!-- 头部：头像 + 标题 + 副标题 -->
    <section class="hero" data-aos="fade-up" data-aos-duration="800">
      <div class="hero-inner">
        <div class="hero-avatar" v-if="settingsStore.siteLogo">
          <img :src="settingsStore.siteLogo" :alt="settingsStore.siteTitle || '网站'" />
        </div>
        <div class="hero-title">
          <h1>{{ settingsStore.siteTitle || '关于我' }}</h1>
          <p class="subtitle">{{ settingsStore.siteDescription || '分享技术与生活' }}</p>
        </div>
      </div>
    </section>

    <!-- 主体：左侧简介/经历，右侧技能/联系/链接 -->
    <el-row :gutter="20" class="about-grid">
      <el-col :xs="24" :md="16">
        <el-card shadow="never" class="section" data-aos="fade-up" data-aos-delay="50">
          <template #header>
            <div class="section-header">👋 简介</div>
          </template>
          <p class="paragraph">
            {{ settingsStore.personalBio || defaultBio }}
          </p>
        </el-card>

        <el-card shadow="never" class="section" data-aos="fade-up" data-aos-delay="100">
          <template #header>
            <div class="section-header">🧭 经历与里程碑</div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="item in timeline"
              :key="item.time + item.title"
              :timestamp="item.time"
              placement="top"
            >
              <h4 class="item-title">{{ item.title }}</h4>
              <p class="item-desc">{{ item.desc }}</p>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="section" data-aos="fade-up" data-aos-delay="150">
          <template #header>
            <div class="section-header">🛠️ 技能栈</div>
          </template>
          <div class="tags">
            <el-tag v-for="tag in skills" :key="tag" class="tag" effect="plain">{{ tag }}</el-tag>
          </div>
        </el-card>

        <el-card shadow="never" class="section" data-aos="fade-up" data-aos-delay="200">
          <template #header>
            <div class="section-header">📬 联系方式</div>
          </template>
          <ul class="contact">
            <li v-if="settingsStore.contactEmail">
              <a :href="`mailto:${settingsStore.contactEmail}`"
                >📧 {{ settingsStore.contactEmail }}</a
              >
            </li>
            <li v-if="settingsStore.socialLinks.github">
              <a :href="settingsStore.socialLinks.github" target="_blank" rel="noopener"
                >🐙 GitHub</a
              >
            </li>
            <li v-if="settingsStore.socialLinks.weibo">
              <a :href="settingsStore.socialLinks.weibo" target="_blank" rel="noopener">📣 微博</a>
            </li>
          </ul>
        </el-card>

        <el-card shadow="never" class="section" data-aos="fade-up" data-aos-delay="250">
          <template #header>
            <div class="section-header">🔗 站点导航</div>
          </template>
          <div class="links">
            <router-link to="/blog">
              <el-button type="primary" text>浏览博客</el-button>
            </router-link>
            <router-link to="/tools">
              <el-button type="primary" text>工具箱</el-button>
            </router-link>
            <!-- 小彩蛋：长按触发，或连点 3 次显示 -->
            <el-popover placement="top" :width="200" trigger="click" v-if="easterEggVisible">
              <template #reference>
                <el-button type="info" link @click="goTemp">站点彩蛋</el-button>
              </template>
              <div style="text-align: center">
                <p>🎉 找到彩蛋啦！</p>
                <el-button type="primary" size="small" @click="$router.push('/temp-email')"
                  >临时邮箱</el-button
                >
              </div>
            </el-popover>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useRoute } from 'vue-router';

const settingsStore = useSettingsStore();

// 默认简介（当未配置个人简介时展示）
const defaultBio = '欢迎来到我的网站～ 这里记录我的技术、创作与思考，也分享工作中的实践与经验。';

// 技能标签（可根据实际情况调整）
const skills = ref([
  'JavaScript',
  'TypeScript',
  'Node.js',
  'Express',
  'Vue 3',
  'Pinia',
  'Vite',
  'MongoDB',
  'Docker',
  'Nginx',
  'CI/CD'
]);

// 时间线示例（可替换为真实经历）
const timeline = ref([
  { time: '2025 - 至今', title: '持续建设个人站点', desc: '创作内容、优化体验、打造工具' },
  { time: '2024', title: '全栈实践深化', desc: 'Node/Express + Vue3 + MongoDB 等项目落地' },
  { time: '更早', title: '技术积累', desc: '打磨基础能力与工程化思维' }
]);

// 小彩蛋逻辑：默认隐藏，仅当用户在 /about 且点击“站点彩蛋”按钮时显示
const route = useRoute();
const easterEggVisible = ref(true); // 若想更隐蔽，可改为 false，并用连点/长按触发

function goTemp() {
  // 这里可扩展为连点三次才显示，当前为直接点击打开气泡
  easterEggVisible.value = true;
}
</script>

<style scoped>
.about-page {
  padding: 24px 16px 60px;
}
.hero {
  display: flex;
  justify-content: center;
  margin: 12px 0 28px;
}
.hero-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}
.hero-avatar img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.hero-title h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}
.subtitle {
  margin: 6px 0 0;
  color: #606266;
}
.about-grid {
  max-width: 1160px;
  margin: 0 auto;
}
.section {
  margin-bottom: 16px;
}
.section-header {
  font-weight: 600;
}
.paragraph {
  line-height: 1.9;
  color: #303133;
}
.item-title {
  margin: 0 0 4px;
}
.item-desc {
  margin: 0;
  color: #606266;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  margin-bottom: 4px;
}
.contact {
  list-style: none;
  padding: 0;
  margin: 0;
}
.contact li {
  margin: 8px 0;
}
.links {
  display: flex;
  gap: 8px;
}
</style>
