<template>
  <main class="about-professional">
    <section class="hero">
      <div class="hero__backdrop"></div>
      <div class="hero__body">
        <div class="hero__summary">
          <span class="hero__tag">ABOUT</span>
          <h1 class="hero__title">{{ heroName }}</h1>
          <p class="hero__lead">{{ heroSummary }}</p>
          <ul class="hero__points">
            <li v-for="item in profileHighlights" :key="item">
              {{ item }}
            </li>
          </ul>
          <div class="hero__actions">
            <a class="action action--primary" :href="`mailto:${primaryEmail}`">
              安排沟通
            </a>
            <router-link class="action action--ghost" to="/projects">
              查看项目合集
            </router-link>
          </div>
        </div>

        <ul class="hero__stats">
          <li v-for="metric in heroMetrics" :key="metric.label" class="hero__stat">
            <span class="hero__stat-value">{{ metric.value }}</span>
            <span class="hero__stat-label">{{ metric.label }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="panel panel--elevated">
      <header class="panel__header">
        <h2>职业视角</h2>
        <p>在快速变化的产品环境中提供稳定、可预测的交付节奏，并保障体验、效率与可持续性。</p>
      </header>
      <div class="insight-grid">
        <article v-for="insight in insightCards" :key="insight.title" class="insight-card">
          <span class="insight-card__caption">{{ insight.caption }}</span>
          <h3>{{ insight.title }}</h3>
          <ul>
            <li v-for="point in insight.points" :key="point">
              {{ point }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="panel">
      <header class="panel__header">
        <h2>核心能力</h2>
        <p>通过体系化的工程手段支撑产品策略落地，让团队始终保持清晰的节奏感与质量基线。</p>
      </header>
      <div class="strength-grid">
        <article v-for="card in strengthDeck" :key="card.title" class="strength-card">
          <h3>{{ card.title }}</h3>
          <p>{{ card.summary }}</p>
          <ul>
            <li v-for="item in card.items" :key="item">
              {{ item }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="panel">
      <header class="panel__header">
        <h2>技能矩阵</h2>
        <p>覆盖前端工程、服务端协作与体验设计的全链路能力，持续为团队创造结构化的技术资产。</p>
      </header>
      <div class="skills-grid">
        <article v-for="category in skillMatrix" :key="category.name" class="skill-card">
          <header>
            <h3>{{ category.name }}</h3>
            <span class="skill-card__meta">{{ category.meta }}</span>
          </header>
          <div class="skill-card__body">
            <span v-for="skill in category.skills" :key="skill" class="skill-chip">
              {{ skill }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="panel panel--muted">
      <header class="panel__header">
        <h2>重点案例</h2>
        <p>为不同阶段的产品构建可复制的技术方案，并与业务、运营与设计团队协同迭代。</p>
      </header>
      <div class="projects-grid">
        <article v-for="project in projectHighlights" :key="project.name" class="project-card">
          <header>
            <span class="project-card__type">{{ project.type }}</span>
            <h3>{{ project.name }}</h3>
          </header>
          <p class="project-card__summary">{{ project.summary }}</p>
          <ul>
            <li v-for="point in project.points" :key="point">
              {{ point }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="panel">
      <header class="panel__header">
        <h2>经验轨迹</h2>
        <p>在不同规模的团队中搭建可持续的研发体系，让技术能力与业务目标保持同频。</p>
      </header>
      <div class="timeline">
        <article v-for="item in experienceTimeline" :key="item.period + item.role" class="timeline__item">
          <time class="timeline__period">{{ item.period }}</time>
          <div class="timeline__content">
            <h3>{{ item.role }}</h3>
            <p>{{ item.summary }}</p>
            <ul>
              <li v-for="highlight in item.highlights" :key="highlight">
                {{ highlight }}
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <header class="panel__header">
        <h2>合作原则</h2>
        <p>打造透明、可回溯的协作流程，让团队在高效节奏中保持对品质的执着。</p>
      </header>
      <ul class="values-list">
        <li v-for="value in partnershipValues" :key="value">
          {{ value }}
        </li>
      </ul>
    </section>

    <section class="panel panel--contact">
      <header class="panel__header">
        <h2>联系与合作</h2>
        <p>欢迎围绕技术架构、产品增长、团队协作等话题展开交流。</p>
      </header>
      <div class="contact-grid">
        <a v-for="channel in contactChannels" :key="channel.label" class="contact-card" :href="channel.href"
          :target="channel.external ? '_blank' : undefined" rel="noopener">
          <span class="contact-card__label">{{ channel.label }}</span>
          <span class="contact-card__value">{{ channel.display }}</span>
        </a>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import api from '@/api';

const settingsStore = useSettingsStore();

const defaultProfile = {
  name: '专业档案',
  summary: '全栈工程师，聚焦体验设计与工程效率的平衡，擅长以体系化方法推动复杂业务落地。',
  highlights: [
    '把业务需求抽象为可复用的设计与组件体系',
    '让数据、用户反馈与实验驱动产品演进',
    '以工程化手段保障性能、质量与协作效率'
  ]
};

const defaultStats = {
  projects: 12,
  articles: 18,
  tools: 6,
  views: 2300
};

const stats = ref({
  articles: defaultStats.articles,
  tools: defaultStats.tools,
  views: defaultStats.views
});

const insightCards = [
  {
    caption: '定位',
    title: '角色定位',
    points: [
      'Web 全栈／前端架构负责人',
      '跨职能协作的产品共创伙伴',
      '关注用户旅程的体验设计实践者'
    ]
  },
  {
    caption: '方法',
    title: '工作方法',
    points: [
      '需求拆解 → 方案设计 → 验证迭代闭环',
      '组件库 + 设计系统同步演进',
      '测试／CI／监控融入日常交付流程'
    ]
  },
  {
    caption: '关注点',
    title: '研究方向',
    points: [
      'AI 辅助研发与内容创作的实战落地',
      '复杂业务的性能治理与可观测性建设',
      '团队知识体系沉淀与技能扩散'
    ]
  }
];

const strengthDeck = [
  {
    title: '体验驱动的工程化',
    summary: '把设计语言转化为可维护的代码资产，让体验一致性与交互细节得到量化保障。',
    items: [
      '规划 Design Token 与组件库协同机制',
      '构建 Storybook／Playwright 等可视化测试体系',
      '推动可访问性与多语言能力纳入发布检查'
    ]
  },
  {
    title: '高效的交付节奏',
    summary: '利用自动化工具与流程沉淀，缩短从需求到上线的周期，同时持续监测质量指标。',
    items: [
      'CI/CD + Feature Flag 保障快速灰度',
      '性能预算／Web Vitals 作为例行度量',
      '以数据看板追踪迭代效率与质量趋势'
    ]
  },
  {
    title: '跨团队协作力',
    summary: '拉通产品、运营、设计、后端的沟通链路，确保目标统一且信息同步。',
    items: [
      '建立跨部门的需求澄清与评审节奏',
      '以可视化文档同步方案与工程分工',
      '推动复盘与知识库形成持续学习机制'
    ]
  }
];

const skillMatrix = [
  {
    name: '前端工程',
    meta: 'Architect & Lead',
    skills: ['Vue 3 / Vite / Nuxt', 'TypeScript', '微前端 / 模块联邦', '组件体系设计', '性能剖析与优化', '可访问性审计']
  },
  {
    name: '服务端协作',
    meta: 'Backend Partner',
    skills: ['Node.js / NestJS', 'RESTful & GraphQL', '数据库建模', '接口契约治理', 'CI/CD 流水线', '可观察性（Prometheus / OpenTelemetry）']
  },
  {
    name: '产品体验',
    meta: 'Design Partner',
    skills: ['信息架构设计', '数据可视化', '设计系统搭建', '用户研究与洞察', 'A/B 测试设计', '内容运营协作']
  },
  {
    name: '团队赋能',
    meta: 'Team Catalyst',
    skills: ['研发流程设计', '质量规范与工具链', '技术培训与分享', '跨团队沟通协调', '敏捷实践优化', '知识库建设']
  }
];

const projectHighlights = [
  {
    name: '智能运营中台',
    type: 'B/S 平台',
    summary: '为运营团队打造数据驱动的战略执行平台，支撑多业务线的策略制定与验证。',
    points: [
      '主导 Vue 3 + Vite 架构升级与模块化拆分，迭代效率提升 35%',
      '与设计共建统一组件库与 Design Token，实现多品牌主题快速切换',
      '接入可观察性方案，关键流程错误率下降 60%'
    ]
  },
  {
    name: '创新产品官网',
    type: 'Marketing Site',
    summary: '打造面向海外市场的品牌站点，通过内容与互动体验提升线索转化。',
    points: [
      '构建渐进式静态化方案，首屏渲染时间降低到 1.2s',
      '配合运营进行数据埋点与 A/B 测试，转化率提升 2.3 倍',
      '沉淀内容发布流程，实现无代码更新与版本回溯'
    ]
  },
  {
    name: '自动化知识平台',
    type: '内部工具',
    summary: '帮助团队沉淀最佳实践，支持语义检索与 AI 助手，降低知识获取门槛。',
    points: [
      '从零搭建前后端一体化应用，引入向量检索与语义标签体系',
      '使用 Markdown + Git 进行版本化管理，保障内容可追溯',
      '设计审核与权限流程，确保知识库合规与持续更新'
    ]
  }
];

const experienceTimeline = [
  {
    period: '2023 - 至今',
    role: '资深前端工程师 · 创新业务线',
    summary: '负责核心产品体验与前端架构演进，驱动设计系统与工程体系落地。',
    highlights: [
      '搭建统一的工程模板与质量基线，跨项目复用率超过 70%',
      '引入性能预算制度，构建 Lighthouse + Web Vitals 监控闭环'
    ]
  },
  {
    period: '2021 - 2023',
    role: '全栈开发工程师 · SaaS 团队',
    summary: '在高速迭代环境中持续优化交付效率，为业务增长提供稳定支撑。',
    highlights: [
      '协同后端构建接口契约治理与代码生成流程',
      '通过自动化测试与 CI/CD 提升发布效率 3 倍'
    ]
  },
  {
    period: '2019 - 2021',
    role: '前端工程师 · 创业团队',
    summary: '从 0 到 1 搭建基础设施，快速验证产品市场匹配并支持多端体验。',
    highlights: [
      '规划多端一致的体验框架，缩短双周迭代的上线周期',
      '推动数据化决策，形成指标驱动的迭代流程'
    ]
  }
];

const partnershipValues = [
  '以用户体验与业务指标为双核心进行决策',
  '让每次交付都可追溯、可复用、可持续',
  '通过透明沟通与知识分享建立信任',
  '以数据验证灵感，用实验推动演进'
];

const defaultContact = {
  email: 'hello@example.com',
  github: '/about',
  portfolio: '/projects'
};

const heroName = computed(() => settingsStore.siteTitle || defaultProfile.name);
const heroSummary = computed(() => settingsStore.personalBio || defaultProfile.summary);
const profileHighlights = computed(() => defaultProfile.highlights);
const primaryEmail = computed(() => settingsStore.contactEmail || defaultContact.email);

const contactChannels = computed(() => {
  const channels = [
    {
      label: 'Email',
      value: settingsStore.contactEmail || defaultContact.email,
      display: settingsStore.contactEmail || defaultContact.email,
      href: `mailto:${settingsStore.contactEmail || defaultContact.email}`
    },
    {
      label: 'GitHub',
      value: settingsStore.socialLinks.github || defaultContact.github,
      display: 'GitHub',
      href: settingsStore.socialLinks.github || defaultContact.github,
      external: true
    },
    {
      label: '项目合集',
      value: defaultContact.portfolio,
      display: '浏览精选项目',
      href: defaultContact.portfolio
    }
  ];
  return channels.filter((item) => Boolean(item.value));
});

const heroMetrics = computed(() => [
  {
    label: '项目经验',
    value: `${defaultStats.projects}+`
  },
  {
    label: '技术博文',
    value: stats.value.articles
  },
  {
    label: '工具产品',
    value: stats.value.tools
  },
  {
    label: '累计访问',
    value: formatNumber(stats.value.views)
  }
]);

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const fetchStats = async () => {
  try {
    const articlesRes = await api.get('/articles/filter-options');
    if (articlesRes.data?.code === 200) {
      stats.value.articles =
        articlesRes.data.data?.stats?.totalArticles || defaultStats.articles;
    }

    const toolsRes = await api.get('/tools');
    if (toolsRes.data?.code === 200) {
      stats.value.tools = toolsRes.data.data?.tools?.length || defaultStats.tools;
    }

    try {
      const dashboardRes = await api.get('/admin/dashboard/stats');
      if (dashboardRes.data?.code === 200) {
        stats.value.views =
          dashboardRes.data.data?.totalViews || defaultStats.views;
      } else {
        stats.value.views = defaultStats.views;
      }
    } catch (error) {
      stats.value.views = defaultStats.views;
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
    stats.value = { ...defaultStats };
  }
};

onMounted(() => {
  if (!settingsStore.isLoaded) {
    settingsStore.loadSettings().catch(() => {
      /* ignore settings load failure and fall back to defaults */
    });
  }
  fetchStats();
});
</script>

<style scoped>
.about-professional {
  position: relative;
  max-width: 1160px;
  margin: 0 auto;
  padding: 96px 24px 120px;
  display: flex;
  flex-direction: column;
  gap: 48px;
  color: #101828;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%);
}

.hero {
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  padding: 48px;
  color: #e2e8f0;
  box-shadow:
    0 30px 60px -40px rgba(15, 23, 42, 0.6),
    0 20px 50px -30px rgba(37, 99, 235, 0.4);
}

.hero__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 20%, rgba(96, 165, 250, 0.55), transparent 55%),
    radial-gradient(circle at 85% 25%, rgba(59, 130, 246, 0.45), transparent 60%),
    radial-gradient(circle at 40% 80%, rgba(56, 189, 248, 0.45), transparent 65%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 64, 175, 0.95));
}

.hero__body {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 32px;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  align-items: stretch;
}

.hero__summary {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero__tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.14);
  letter-spacing: 0.32em;
  font-size: 12px;
  font-weight: 600;
  color: rgba(241, 245, 249, 0.86);
}

.hero__title {
  margin: 0;
  font-size: 44px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero__lead {
  margin: 0;
  font-size: 18px;
  line-height: 1.7;
  color: rgba(226, 232, 240, 0.85);
}

.hero__points {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.hero__points li {
  position: relative;
  padding-left: 18px;
  font-size: 15px;
  color: rgba(248, 250, 252, 0.86);
}

.hero__points li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(96, 165, 250, 1);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 26px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.action--primary {
  background: linear-gradient(135deg, #60a5fa, #6366f1);
  color: #0b1120;
  box-shadow: 0 16px 30px -20px rgba(99, 102, 241, 0.9);
}

.action--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 36px -18px rgba(59, 130, 246, 0.75);
}

.action--ghost {
  border: 1px solid rgba(203, 213, 225, 0.6);
  color: rgba(241, 245, 249, 0.9);
}

.action--ghost:hover {
  transform: translateY(-2px);
  border-color: rgba(241, 245, 249, 0.85);
  color: #f8fafc;
}

.hero__stats {
  margin: 0;
  padding: 24px;
  list-style: none;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.25);
  backdrop-filter: blur(22px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.hero__stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.hero__stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #f8fafc;
}

.hero__stat-label {
  font-size: 13px;
  letter-spacing: 0.04em;
  color: rgba(226, 232, 240, 0.7);
  text-transform: uppercase;
}

.panel {
  border-radius: 28px;
  padding: 40px 48px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 18px 40px -32px rgba(15, 23, 42, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(10px);
}

.panel--elevated {
  background: rgba(255, 255, 255, 0.95);
  box-shadow:
    0 24px 60px -40px rgba(15, 23, 42, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.panel--muted {
  background: linear-gradient(135deg, rgba(244, 247, 255, 0.82), rgba(240, 249, 255, 0.9));
}

.panel--contact {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.12), rgba(56, 189, 248, 0.18));
  border: 1px solid rgba(79, 70, 229, 0.2);
}

.panel__header h2 {
  margin: 0 0 12px;
  font-size: 28px;
  letter-spacing: -0.01em;
  color: #111827;
}

.panel__header p {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.7;
  color: #475467;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.insight-card {
  padding: 28px;
  border-radius: 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(249, 250, 251, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.insight-card__caption {
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #2563eb;
}

.insight-card h3 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}

.insight-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  color: #475467;
  font-size: 14px;
  line-height: 1.6;
}

.strength-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.strength-card {
  padding: 32px;
  border-radius: 22px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: rgba(241, 245, 249, 0.9);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 14px 30px -28px rgba(30, 64, 175, 0.4);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.strength-card h3 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}

.strength-card p {
  margin: 0;
  color: #475467;
  line-height: 1.6;
}

.strength-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  color: #475467;
  font-size: 14px;
}

.strength-card li {
  position: relative;
  padding-left: 18px;
}

.strength-card li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.7);
}

.skills-grid {
  display: grid;
  gap: 22px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.skill-card {
  padding: 26px;
  border-radius: 20px;
  background: rgba(249, 250, 251, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-card header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-card h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.skill-card__meta {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #64748b;
}

.skill-card__body {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.01em;
}

.projects-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.project-card {
  padding: 30px;
  border-radius: 24px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(255, 255, 255, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 12px 32px -28px rgba(14, 165, 233, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-card header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-card__type {
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}

.project-card h3 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.project-card__summary {
  margin: 0;
  color: #475467;
  font-size: 15px;
  line-height: 1.7;
}

.project-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  color: #475467;
  font-size: 14px;
}

.project-card li {
  position: relative;
  padding-left: 18px;
}

.project-card li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.8);
}

.timeline {
  position: relative;
  display: grid;
  gap: 28px;
  padding-left: 26px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.4), rgba(56, 189, 248, 0.4));
}

.timeline__item {
  position: relative;
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.timeline__item::before {
  content: '';
  position: absolute;
  left: -26px;
  top: 14px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.18);
}

.timeline__period {
  width: 160px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #1d4ed8;
  margin-top: 4px;
}

.timeline__content {
  flex: 1;
  padding: 22px 26px;
  border-radius: 22px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline__content h3 {
  margin: 0;
  font-size: 20px;
  color: #111827;
}

.timeline__content p {
  margin: 0;
  color: #475467;
  line-height: 1.6;
  font-size: 14px;
}

.timeline__content ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
  color: #475467;
  font-size: 14px;
}

.timeline__content li {
  position: relative;
  padding-left: 18px;
}

.timeline__content li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(79, 70, 229, 0.75);
}

.values-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 18px;
}

.values-list li {
  padding: 18px 24px;
  border-radius: 18px;
  background: rgba(226, 232, 240, 0.75);
  border: 1px solid rgba(203, 213, 225, 0.6);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
  font-size: 15px;
  color: #1f2937;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.contact-card {
  padding: 24px 28px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.94);
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    0 14px 36px -26px rgba(15, 23, 42, 0.35);
}

.contact-card:hover {
  transform: translateY(-4px);
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 18px 40px -24px rgba(59, 130, 246, 0.45);
}

.contact-card__label {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #2563eb;
  font-weight: 600;
}

.contact-card__value {
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
}

@media (max-width: 1024px) {
  .hero {
    padding: 40px;
  }

  .hero__body {
    grid-template-columns: 1fr;
  }

  .hero__stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .panel {
    padding: 36px;
  }
}

@media (max-width: 768px) {
  .about-professional {
    padding: 72px 18px 96px;
    gap: 36px;
  }

  .hero {
    padding: 36px;
  }

  .hero__title {
    font-size: 36px;
  }

  .hero__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .panel {
    padding: 28px 24px;
  }

  .timeline {
    padding-left: 0;
  }

  .timeline::before {
    left: 10px;
  }

  .timeline__item {
    flex-direction: column;
    padding-left: 20px;
  }

  .timeline__period {
    width: auto;
  }
}

@media (max-width: 520px) {
  .hero {
    padding: 28px;
  }

  .hero__stats {
    grid-template-columns: 1fr;
  }

  .hero__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .panel {
    padding: 24px 20px;
  }
}
</style>
