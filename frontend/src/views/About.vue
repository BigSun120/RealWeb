<template>
  <div class="about-page">
    <!-- 浮动粒子背景 -->
    <div class="floating-particles">
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="hero-avatar" v-if="settingsStore.siteLogo">
          <img :src="settingsStore.siteLogo" :alt="settingsStore.siteTitle || '网站'" />
        </div>
        <h1 class="page-title">{{ settingsStore.siteTitle || '逍遥散仙' }}</h1>
        <p class="page-subtitle">{{ settingsStore.siteDescription || '欢迎来到仙界第一洞天福地，这里有最玄妙的修仙秘法！' }}</p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ stats.totalArticles }}</span>
            <span class="stat-label">篇仙录</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.totalTools }}</span>
            <span class="stat-label">件法宝</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ formatNumber(stats.totalViews) }}</span>
            <span class="stat-label">次参悟</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧内容 -->
      <div class="content-left">
        <!-- 个人简介 -->
        <div class="section intro-section" data-aos="fade-up" data-aos-delay="100">
          <div class="section-header">
            <h2 class="section-title">
              仙人传记
            </h2>
            <p class="section-description">了解本座的修行经历和仙缘</p>
          </div>
          <div class="section-content">
            <p class="intro-text">
              {{ settingsStore.personalBio || defaultBio }}
            </p>
            <div class="intro-highlights">
              <div class="highlight-item">
                <span class="highlight-text">传说中的逍遥散仙</span>
              </div>
              <div class="highlight-item">
                <span class="highlight-text">渡劫期的天劫克星</span>
              </div>
              <div class="highlight-item">
                <span class="highlight-text">仙界第一炼丹宗师</span>
              </div>
              <div class="highlight-item">
                <span class="highlight-text">九天玄女的传承者</span>
              </div>
              <div class="highlight-item">
                <span class="highlight-text">太上老君的关门弟子</span>
              </div>
              <div class="highlight-item">
                <span class="highlight-text">三界无敌的飞升真仙</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 修仙历程 -->
        <div class="section timeline-section" data-aos="fade-up" data-aos-delay="200">
          <div class="section-header">
            <h2 class="section-title">
              修仙历程
            </h2>
            <p class="section-description">本座的飞升轨迹</p>
          </div>
          <div class="section-content">
            <div class="timeline">
              <div v-for="(item, index) in timeline" :key="item.time + item.title" class="timeline-item"
                :class="{ 'timeline-item-active': index === 0 }">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <div class="timeline-time">{{ item.time }}</div>
                  <h4 class="timeline-title">{{ item.title }}</h4>
                  <p class="timeline-desc">{{ item.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="content-right">
        <!-- 技能栈 -->
        <div class="section skills-section" data-aos="fade-up" data-aos-delay="300">
          <div class="section-header">
            <h2 class="section-title">
              仙法神通
            </h2>
            <p class="section-description">本座修炼的仙家法术</p>
          </div>
          <div class="section-content">
            <div class="skills-grid">
              <div v-for="(category, categoryName) in skillCategories" :key="categoryName" class="skill-category">
                <h4 class="skill-category-title">{{ categoryName }}</h4>
                <div class="skill-tags">
                  <span v-for="skill in category" :key="skill" class="skill-tag">
                    {{ skill }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 联系方式 -->
        <div class="section contact-section" data-aos="fade-up" data-aos-delay="400">
          <div class="section-header">
            <h2 class="section-title">
              传音入密
            </h2>
            <p class="section-description">欢迎道友前来论道</p>
          </div>
          <div class="section-content">
            <div class="contact-list">
              <a v-if="settingsStore.contactEmail" :href="`mailto:${settingsStore.contactEmail}`" class="contact-item">
                <span class="contact-text">{{ settingsStore.contactEmail }}</span>
              </a>
              <a v-if="settingsStore.socialLinks.github" :href="settingsStore.socialLinks.github" target="_blank"
                rel="noopener" class="contact-item">
                <span class="contact-text">GitHub</span>
              </a>
              <a v-if="settingsStore.socialLinks.weibo" :href="settingsStore.socialLinks.weibo" target="_blank"
                rel="noopener" class="contact-item">
                <span class="contact-text">微博</span>
              </a>
            </div>
          </div>
        </div>

        <!-- 仙府导览 -->
        <div class="section navigation-section" data-aos="fade-up" data-aos-delay="500">
          <div class="section-header">
            <h2 class="section-title">
              仙府导览
            </h2>
            <p class="section-description">探索仙府各处洞天</p>
          </div>
          <div class="section-content">
            <div class="nav-buttons">
              <router-link to="/blog" class="nav-button">
                <span class="nav-button-text">修仙典籍</span>
                <span class="nav-button-arrow">→</span>
              </router-link>
              <router-link to="/tools" class="nav-button">
                <span class="nav-button-text">法宝殿堂</span>
                <span class="nav-button-arrow">→</span>
              </router-link>
              <router-link to="/temp-email" class="nav-button">
                <span class="nav-button-text">飞鸽传书</span>
                <span class="nav-button-arrow">→</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useRoute } from 'vue-router';
import api from '@/api';

const settingsStore = useSettingsStore();
const route = useRoute();

// 默认简介（当未配置个人简介时展示）
const defaultBio = '欢迎来到本座的无上仙府！贫道乃是传说中的逍遥散仙，专修天地玄妙之术！白天参悟天道至理，夜晚炼制仙丹法宝。此处记录着本座飞升成仙的修行感悟，以及那些让人顿悟的玄妙机缘。若是有缘的道友，欢迎一同在这仙境福地中论道修行！';

// 统计数据
const stats = ref({
  totalArticles: 0,
  totalTools: 0,
  totalViews: 0
});

// 格式化数字显示
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// 获取统计数据
const fetchStats = async () => {
  try {
    // 获取文章统计
    const articlesRes = await api.get('/articles/filter-options');
    if (articlesRes.data.code === 200) {
      stats.value.totalArticles = articlesRes.data.data.stats.totalArticles || 0;
    }

    // 获取工具统计
    const toolsRes = await api.get('/tools');
    if (toolsRes.data.code === 200) {
      stats.value.totalTools = toolsRes.data.data.tools?.length || 0;
    }

    // 获取访问量统计（从管理员仪表板API获取）
    try {
      const dashboardRes = await api.get('/admin/dashboard/stats');
      if (dashboardRes.data.code === 200) {
        stats.value.totalViews = dashboardRes.data.data.totalViews || 0;
      }
    } catch (error) {
      // 如果没有管理员权限，使用默认值
      stats.value.totalViews = 2500;
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
    // 使用默认值
    stats.value = {
      totalArticles: 12,
      totalTools: 8,
      totalViews: 2500
    };
  }
};

// 技能分类
const skillCategories = ref({
  '天罡三十六变': ['幻象呈现术', '心神交感法', '千变万化术', '分身召唤术', '瞬息万里法', '神识管理大法', '形态变化术', '乾坤构建术'],
  '地煞七十二术': ['灵兽驯化术', '阵法布置', '丹药炼制术', '符箓封印术', '神通召唤', '千里传音法', '灵气优化秘籍', '洞府布置神功'],
  '法宝炼制之道': ['时光回溯神器', '空间封印法宝', '阴阳平衡术', '五行轮转法', '神识探查神功', '灵力测试术', '天眼查错大法'],
  '无上仙法绝学': ['天地操控术', '因果循环阵', '众生统筹术', '天书传道法', '太极八卦天眼通', '灵力淬体术', '涅槃重生术', '业障消除驱魔术']
});

// 时间线示例（可替换为真实经历）
const timeline = ref([
  {
    time: '2025 - 至今',
    title: '开宗立派，创建仙府',
    desc: '在三界之中建立了自己的仙府洞天，统治着典籍宝库和法宝殿堂！'
  },
  {
    time: '2024年末',
    title: '收徒传道，桃李满天下',
    desc: '开始广收门徒，传授仙法，门下弟子遍布三界，声名远扬！'
  },
  {
    time: '2024年中',
    title: '炼制九转金丹，名震仙界',
    desc: '成功炼制出传说中的九转金丹，一时间仙界震动，各路仙家纷纷前来求丹！'
  },
  {
    time: '2024年初',
    title: '渡劫飞升，证道成仙',
    desc: '历经九九八十一道天劫，终于飞升上界，成就真仙之位！'
  },
  {
    time: '2023年末',
    title: '大乘期圆满，准备渡劫',
    desc: '修为达到大乘期巅峰，开始闭关准备迎接飞升天劫！'
  },
  {
    time: '2023年中',
    title: '合体期突破，神通大成',
    desc: '成功突破合体期，掌握了分身千万、移山填海等无上神通！'
  },
  {
    time: '2023年初',
    title: '筑基成功，踏入仙途',
    desc: '完成了从凡人到修仙者的华丽蜕变，正式踏上长生之路！'
  },
  {
    time: '2022年末',
    title: '练气九层，寻求突破',
    desc: '练气期修为达到巅峰，开始寻找筑基丹和突破契机！'
  },
  {
    time: '2022年中',
    title: '获得传承，修为大进',
    desc: '意外获得上古仙人传承，修炼速度突飞猛进，一日千里！'
  },
  {
    time: '2022年初',
    title: '初入仙门，拜师学艺',
    desc: '第一次接触到神奇的修仙之法，从此踏上求仙问道之路！'
  },
  {
    time: '2000年左右',
    title: '仙胎降世，天生异象',
    desc: '一个注定要飞升成仙的仙胎降临人间，天降祥瑞！'
  },
  {
    time: '138亿年前',
    title: '混沌初开，天地始分',
    desc: '盘古开天辟地，为了本座的诞生，天道开始了漫长的布局！'
  }
]);

// 小彩蛋逻辑：默认隐藏，仅当用户在 /about 且点击“站点彩蛋”按钮时显示
// 组件挂载时获取统计数据
onMounted(() => {
  fetchStats();
});
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  padding: 0;
  position: relative;
  overflow-x: hidden;
}

/* 全局背景样式 - 覆盖整个页面 */
.about-page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 25%, #f8b500 50%, #ff6b9d 75%, #e056fd 100%);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
  z-index: -2;
  pointer-events: none;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

/* 额外的装饰层 */
.about-page::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(255, 107, 157, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(224, 86, 253, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(248, 181, 0, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 60% 60%, rgba(196, 69, 105, 0.3) 0%, transparent 50%);
  z-index: -1;
  pointer-events: none;
}

/* 浮动粒子效果 */
.floating-particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

.particle {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

.particle:nth-child(1) {
  width: 4px;
  height: 4px;
  left: 10%;
  animation-delay: 0s;
}

.particle:nth-child(2) {
  width: 6px;
  height: 6px;
  left: 20%;
  animation-delay: 1s;
}

.particle:nth-child(3) {
  width: 3px;
  height: 3px;
  left: 30%;
  animation-delay: 2s;
}

.particle:nth-child(4) {
  width: 5px;
  height: 5px;
  left: 40%;
  animation-delay: 3s;
}

.particle:nth-child(5) {
  width: 4px;
  height: 4px;
  left: 50%;
  animation-delay: 4s;
}

.particle:nth-child(6) {
  width: 7px;
  height: 7px;
  left: 60%;
  animation-delay: 5s;
}

.particle:nth-child(7) {
  width: 3px;
  height: 3px;
  left: 70%;
  animation-delay: 0.5s;
}

.particle:nth-child(8) {
  width: 5px;
  height: 5px;
  left: 80%;
  animation-delay: 1.5s;
}

.particle:nth-child(9) {
  width: 4px;
  height: 4px;
  left: 90%;
  animation-delay: 2.5s;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  90% {
    opacity: 1;
  }

  50% {
    transform: translateY(-10vh) rotate(180deg);
    opacity: 0.8;
  }
}

/* 页面头部 */
.page-header {
  text-align: center;
  padding: 140px 20px 60px;
  position: relative;
  z-index: 1;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-avatar {
  margin-bottom: 24px;
}

.hero-avatar img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.hero-avatar img:hover {
  transform: scale(1.05);
}

.page-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px 0;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.8),
    0 0 20px rgba(255, 107, 157, 0.6),
    0 0 30px rgba(224, 86, 253, 0.4);
  animation: titleGlow 3s ease-in-out infinite alternate;
}

@keyframes titleGlow {
  from {
    text-shadow:
      0 0 10px rgba(255, 255, 255, 0.8),
      0 0 20px rgba(255, 107, 157, 0.6),
      0 0 30px rgba(224, 86, 253, 0.4);
  }

  to {
    text-shadow:
      0 0 15px rgba(255, 255, 255, 1),
      0 0 25px rgba(255, 107, 157, 0.8),
      0 0 35px rgba(224, 86, 253, 0.6);
  }
}

.page-subtitle {
  font-size: 1.2rem;
  color: #fff;
  margin: 0 0 40px 0;
  line-height: 1.6;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  font-weight: 500;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  color: #fff;
  transition: transform 0.3s ease;
}

.stat-item:hover {
  transform: scale(1.1);
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: #fff;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.8),
    0 0 20px rgba(248, 181, 0, 0.6);
}

.stat-label {
  font-size: 0.9rem;
  color: #fff;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 主内容区域 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 80px;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 40px;
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 0 16px 60px;
  }

  .page-title {
    font-size: 2.5rem;
  }

  .hero-stats {
    gap: 20px;
  }
}

/* 通用卡片样式 */
.section {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
  box-shadow:
    0 8px 32px rgba(255, 107, 157, 0.2),
    0 4px 16px rgba(224, 86, 253, 0.1);
}

.section:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 16px 48px rgba(255, 107, 157, 0.3),
    0 8px 24px rgba(224, 86, 253, 0.2);
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
}

.section-header {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px 0;
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.section-icon {
  font-size: 1.8rem;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
}

.section-description {
  color: #fff;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.section-content {
  color: #fff;
  line-height: 1.7;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 个人简介样式 */
.intro-text {
  font-size: 1.1rem;
  margin-bottom: 24px;
  color: #000 !important;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.intro-highlights {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.1);
}

.highlight-item:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(6px) scale(1.02);
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.highlight-icon {
  font-size: 1.2rem;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));
}

.highlight-text {
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 时间线样式 */
.timeline {
  position: relative;
  padding-left: 24px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom,
      rgba(255, 255, 255, 0.8),
      rgba(255, 107, 157, 0.6),
      rgba(224, 86, 253, 0.6),
      rgba(248, 181, 0, 0.6));
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -22px;
  top: 8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(45deg, #fff, #ff6b9d, #e056fd);
  border: 3px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  box-shadow:
    0 0 12px rgba(255, 255, 255, 0.6),
    0 0 24px rgba(255, 107, 157, 0.4);
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.2);
  box-shadow:
    0 0 16px rgba(255, 255, 255, 0.8),
    0 0 32px rgba(255, 107, 157, 0.6);
}

.timeline-content {
  padding-left: 8px;
}

.timeline-time {
  font-size: 0.85rem;
  color: #fff;
  font-weight: 600;
  margin-bottom: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  background: linear-gradient(45deg, #ff6b9d, #e056fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.timeline-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px 0;
  text-shadow:
    0 0 6px rgba(255, 255, 255, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.timeline-desc {
  color: #fff;
  margin: 0;
  line-height: 1.6;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 技能栈样式 */
.skills-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skill-category {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.1);
}

.skill-category:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.2);
}

.skill-category-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 12px 0;
  text-shadow:
    0 0 6px rgba(255, 255, 255, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  background: linear-gradient(45deg, rgba(255, 107, 157, 0.3), rgba(224, 86, 253, 0.3));
  color: #fff;
  padding: 8px 16px;
  border-radius: 25px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.2);
}

.skill-tag:hover {
  background: linear-gradient(45deg, rgba(255, 107, 157, 0.5), rgba(224, 86, 253, 0.5));
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.4);
  border-color: rgba(255, 255, 255, 0.6);
}

/* 联系方式样式 */
.contact-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(45deg, rgba(255, 107, 157, 0.2), rgba(224, 86, 253, 0.2));
  border-radius: 12px;
  color: #fff;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.2);
}

.contact-item:hover {
  background: linear-gradient(45deg, rgba(255, 107, 157, 0.4), rgba(224, 86, 253, 0.4));
  transform: translateX(6px) scale(1.02);
  color: #fff;
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.contact-icon {
  font-size: 1.2rem;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));
}

.contact-text {
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 导航按钮样式 */
.nav-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: linear-gradient(45deg, rgba(255, 107, 157, 0.25), rgba(224, 86, 253, 0.25));
  border-radius: 15px;
  color: #fff;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.2);
}

.nav-button:hover {
  background: linear-gradient(45deg, rgba(255, 107, 157, 0.4), rgba(224, 86, 253, 0.4));
  transform: translateY(-4px) scale(1.02);
  color: #fff;
  box-shadow: 0 8px 32px rgba(255, 107, 157, 0.4);
  border-color: rgba(255, 255, 255, 0.5);
}

.nav-button-icon {
  font-size: 1.4rem;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
}

.nav-button-text {
  font-weight: 700;
  flex: 1;
  margin-left: 12px;
  text-align: left;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.nav-button-arrow {
  font-size: 1.3rem;
  transition: transform 0.3s ease;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));
}

.nav-button:hover .nav-button-arrow {
  transform: translateX(6px) scale(1.1);
}
</style>
