<template>
  <div class="home">
    <!-- 全页面背景 -->
    <div class="page-background">
      <MillipedeBackground
        :enabled="!prefersReducedMotion"
        :count="millipedeCount"
        :opacity="0.15"
        :interaction="true"
        :show-controls="isDev"
      />
      <div class="page-gradient"></div>
    </div>

    <!-- 英雄区域 - 突破容器限制实现全屏 -->
    <section class="hero fullscreen-hero">
      <div class="hero-content">
        <div class="hero-avatar">
          <img
            v-if="settingsStore.siteLogo"
            :src="settingsStore.siteLogo"
            :alt="settingsStore.siteTitle"
            class="animate__animated animate__bounceIn"
          />
          <div v-else class="avatar-placeholder animate__animated animate__bounceIn">
            <i class="avatar-icon">👨‍💻</i>
          </div>
        </div>

        <h1 class="hero-title">
          <span class="title-main">{{ settingsStore.siteTitle || '个人技术博客' }}</span>
          <span class="title-accent">Developer & Creator</span>
        </h1>

        <p class="hero-subtitle">
          {{ settingsStore.siteDescription || '分享技术文章，记录编程之路' }}
        </p>

        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-number">{{ articleCount }}+</div>
            <div class="stat-label">技术文章</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ totalViews }}+</div>
            <div class="stat-label">总阅读量</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">3+</div>
            <div class="stat-label">年经验</div>
          </div>
        </div>

        <div class="hero-actions">
          <button
            class="btn btn-primary btn-lg animate__animated animate__heartBeat"
            @click="$router.push('/blog')"
          >
            <i class="btn-icon">📚</i>
            浏览博客
          </button>
          <button class="btn btn-secondary btn-lg" @click="$router.push('/about')">
            <i class="btn-icon">��</i>
            联系我
          </button>
          <button
            class="btn btn-primary btn-lg animate__animated animate__heartBeat"
            @click="$router.push('/tools')"
          >
            <i class="btn-icon">🧰</i>
            前往工具箱
          </button>
        </div>

        <div class="hero-social">
          <a
            v-if="settingsStore.socialLinks?.github"
            :href="settingsStore.socialLinks.github"
            target="_blank"
            class="social-link"
          >
            <i class="social-icon">🐙</i>
            <span>GitHub</span>
          </a>
          <a
            v-if="settingsStore.contactEmail"
            :href="`mailto:${settingsStore.contactEmail}`"
            class="social-link"
          >
            <i class="social-icon">📧</i>
            <span>Email</span>
          </a>
          <a
            v-if="settingsStore.socialLinks?.weibo"
            :href="settingsStore.socialLinks.weibo"
            target="_blank"
            class="social-link"
          >
            <i class="social-icon">🐦</i>
            <span>微博</span>
          </a>
        </div>
      </div>
    </section>

    <!-- 最新文章 -->
    <section class="latest-articles-section">
      <div class="articles-container">
        <div class="articles-header">
          <h2 class="articles-title">最新文章</h2>
          <router-link to="/blog" class="btn btn-ghost"> 查看更多 → </router-link>
        </div>

        <!-- 加载状态 -->
        <div v-if="articlesLoading" class="loading-state">
          <div class="loading-spinner">加载中...</div>
        </div>

        <!-- 无文章状态 -->
        <div v-else-if="latestArticles.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>暂无文章</h3>
          <p>还没有发布任何文章，敬请期待...</p>
        </div>

        <!-- 文章列表 -->
        <div v-else class="articles-list grid grid-cols-3">
          <article
            v-for="article in latestArticles"
            :key="article._id"
            class="article-item card"
            @click="$router.push(`/blog/${article._id}`)"
          >
            <!-- 文章封面 -->
            <div class="article-image" v-if="article.coverImage">
              <img :src="article.coverImage" :alt="article.title" />
            </div>
            <div class="article-image-placeholder" v-else>
              <div class="placeholder-content">
                <i class="placeholder-icon">📄</i>
                <span class="placeholder-text">{{ article.title.charAt(0) }}</span>
              </div>
            </div>

            <!-- 文章内容 -->
            <div class="card-body">
              <h3 class="article-title">{{ article.title }}</h3>
              <p class="article-summary">{{ article.excerpt || getExcerpt(article.content) }}</p>
            </div>

            <div class="card-footer">
              <div class="article-author">
                <div class="author-avatar" :style="getAuthorAvatarStyle(article.author?.avatar)">
                  <span class="avatar-fallback">{{
                    (article.author?.username || '匿名').charAt(0)
                  }}</span>
                </div>
                <div class="author-info">
                  <span class="author-name">{{ article.author?.username || '匿名' }}</span>
                  <span class="publish-date">{{ formatDate(article.createdAt) }}</span>
                </div>
              </div>
              <div class="article-stats">
                <span class="badge badge-gray">{{ article.viewCount || 0 }} 阅读</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import api from '@/api';
import MillipedeBackground from '@/components/MillipedeBackground.vue';

export default {
  name: 'Home',
  components: {
    MillipedeBackground
  },
  setup() {
    const settingsStore = useSettingsStore();
    const latestArticles = ref([]);
    const articlesLoading = ref(false);
    const articleCount = ref(0);
    const totalViews = ref(0);

    // 千足虫背景相关
    const prefersReducedMotion = ref(false);
    const millipedeCount = ref(3);
    const isDev = process.env.NODE_ENV === 'development';

    // 检测用户动画偏好
    const checkMotionPreference = () => {
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotion.value = mediaQuery.matches;

        mediaQuery.addEventListener('change', e => {
          prefersReducedMotion.value = e.matches;
        });
      }
    };

    // 根据设备性能调整千足虫数量
    const adjustMillipedeCount = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const area = window.innerWidth * window.innerHeight;

      if (isMobile) {
        millipedeCount.value = Math.min(2, Math.floor(area / 300000));
      } else {
        millipedeCount.value = Math.min(4, Math.floor(area / 200000));
      }

      // 至少保证有1个
      millipedeCount.value = Math.max(1, millipedeCount.value);
    };

    const fetchLatestArticles = async () => {
      articlesLoading.value = true;
      try {
        const response = await api.get('/articles', {
          params: {
            limit: 6,
            sortBy: 'publishedAt',
            sortOrder: 'desc',
            _: Date.now() // 防缓存
          }
        });
        latestArticles.value = response.data.data.articles;

        // 获取统计数据
        articleCount.value = response.data.data.total || latestArticles.value.length;
        totalViews.value = latestArticles.value.reduce(
          (sum, article) => sum + (article.viewCount || 0),
          0
        );
      } catch (error) {
        console.error('获取最新文章失败:', error);
      } finally {
        articlesLoading.value = false;
      }
    };

    const getExcerpt = content => {
      if (!content) return '';
      const text = content.replace(/[#*`]/g, '').substring(0, 100);
      return text.length > 100 ? text + '...' : text;
    };

    const formatDate = date => {
      return new Date(date).toLocaleDateString('zh-CN');
    };

    const scrollToContact = () => {
      // 滚动到页面底部的联系方式
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    };

    // 根据作者头像URL生成背景图样式，加载失败时显示首字母
    const getAuthorAvatarStyle = avatarUrl => {
      if (avatarUrl) {
        return {
          backgroundImage: `url(${avatarUrl})`
        };
      }
      return {};
    };

    onMounted(() => {
      fetchLatestArticles();
      // 加载设置
      if (!settingsStore.loaded) {
        settingsStore.loadSettings();
      }
      // 初始化千足虫背景
      checkMotionPreference();
      adjustMillipedeCount();
      // 窗口聚焦时刷新最新文章
      window.addEventListener('focus', fetchLatestArticles);
    });

    onUnmounted(() => {
      window.removeEventListener('focus', fetchLatestArticles);
    });

    return {
      settingsStore,
      latestArticles,
      articlesLoading,
      articleCount,
      totalViews,
      getExcerpt,
      formatDate,
      scrollToContact,
      getAuthorAvatarStyle,
      // 千足虫背景相关
      prefersReducedMotion,
      millipedeCount,
      isDev
    };
  }
};
</script>

<style lang="scss" scoped>
.home {
  // 首页移除body的padding-top，实现真正的全屏
  margin-top: -70px;
  position: relative;
  min-height: 100vh;

  // 全页面背景
  .page-background {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0; /* 修改为0，确保在页面内容下方但可见 */
    width: 100vw;
    height: 100vh;

    .page-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        135deg,
        rgba(15, 23, 42, 0.85) 0%,
        rgba(30, 41, 59, 0.75) 30%,
        rgba(51, 65, 85, 0.65) 60%,
        rgba(71, 85, 105, 0.55) 100%
      );
      z-index: 10; /* 确保渐变在背景Canvas之上 */
    }
  }

  // 全屏Hero区域
  .fullscreen-hero {
    position: relative;
    width: 100vw;
    height: 100vh;
    margin-left: calc(-50vw + 50%);
    margin-top: 0;
    margin-bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    .hero-content {
      position: relative;
      z-index: 20; /* 确保内容在所有背景之上 */
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
      text-align: center;
      color: white;

      .hero-avatar {
        margin-bottom: 30px;
        animation: fadeInUp 1s ease-out 0.2s both;

        img {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease;

          &:hover {
            transform: scale(1.05) rotate(5deg);
          }
        }

        .avatar-placeholder {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 4px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          backdrop-filter: blur(10px);

          .avatar-icon {
            font-size: 48px;
          }
        }
      }

      .hero-title {
        margin-bottom: 20px;

        .title-main {
          display: block;
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          background: linear-gradient(45deg, #fff, #f0f8ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: fadeInUp 1s ease-out 0.4s both;
        }

        .title-accent {
          display: block;
          font-size: 24px;
          font-weight: 300;
          opacity: 0.9;
          letter-spacing: 2px;
          text-transform: uppercase;
          animation: fadeInUp 1s ease-out 0.6s both;
        }
      }

      .hero-subtitle {
        font-size: 20px;
        margin-bottom: 40px;
        opacity: 0.9;
        line-height: 1.6;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        animation: fadeInUp 1s ease-out 0.8s both;
      }

      .hero-stats {
        display: flex;
        justify-content: center;
        gap: 40px;
        margin-bottom: 40px;
        flex-wrap: wrap;
        animation: fadeInUp 1s ease-out 1s both;

        .stat-item {
          text-align: center;

          .stat-number {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 5px;
            background: linear-gradient(45deg, #fff, #f0f8ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .stat-label {
            font-size: 14px;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
        }
      }

      .hero-actions {
        display: flex;
        gap: 20px;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 40px;
        animation: fadeInUp 1s ease-out 1.2s both;

        .primary-btn {
          background: linear-gradient(45deg, #667eea, #764ba2);
          border: none;
          padding: 15px 30px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 50px;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(102, 126, 234, 0.6);
          }

          .btn-icon {
            margin-right: 8px;
            font-style: normal;
          }
        }

        .secondary-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 13px 28px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 50px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
          }

          .btn-icon {
            margin-right: 8px;
            font-style: normal;
          }
        }
      }

      .hero-social {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
        animation: fadeInUp 1s ease-out 1.4s both;

        .social-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 25px;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.4);
            transform: translateY(-2px);
          }

          .social-icon {
            font-style: normal;
            font-size: 16px;
          }
        }
      }
    }
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 50px;

    h2 {
      font-size: 36px;
      font-weight: 700;
      color: #1a202c;
      margin: 0;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 0;
        width: 60px;
        height: 4px;
        background: linear-gradient(45deg, #409eff, #667eea);
        border-radius: 2px;
      }
    }

    .more-link {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #409eff;
      text-decoration: none;
      font-weight: 600;
      padding: 12px 24px;
      border: 2px solid #409eff;
      border-radius: 25px;
      transition: all 0.3s ease;
      background: rgba(64, 158, 255, 0.05);

      &:hover {
        background: #409eff;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(64, 158, 255, 0.3);

        .arrow-icon {
          transform: translateX(4px);
        }
      }

      .arrow-icon {
        font-style: normal;
        transition: transform 0.3s ease;
      }
    }
  }

  // 最新文章区域
  .latest-articles-section {
    width: 100vw;
    margin-left: calc(-50vw + 50%);
    padding: 80px 0;
    background: transparent; // 移除背景，让银河背景透过
    position: relative;
    overflow: hidden; // 防止子元素溢出导致滚动条

    .articles-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }

    .articles-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 48px;

      .articles-title {
        font-size: 36px;
        font-weight: 800;
        color: #6579e1;
        margin: 0;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 60px;
          height: 4px;
          background: linear-gradient(90deg, #409eff 0%, #667eea 100%);
          border-radius: 2px;
        }
      }

      .view-more-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #409eff;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        padding: 12px 24px;
        border: 2px solid #409eff;
        border-radius: 50px;
        transition: all 0.3s ease;
        background: transparent;

        &:hover {
          background: #409eff;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(64, 158, 255, 0.3);
        }
      }
    }

    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;

      .loading-spinner {
        font-size: 18px;
        color: #409eff;
        font-weight: 500;
      }
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #718096;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      h3 {
        font-size: 24px;
        margin-bottom: 8px;
        color: #4a5568;
      }

      p {
        font-size: 16px;
        opacity: 0.8;
      }
    }

    .articles-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      contain: layout; // 防止子元素影响外部布局

      .article-item {
        background: rgba(255, 255, 255, 0.08); // 更柔和的半透明背景
        backdrop-filter: blur(12px); // 稍强的毛玻璃效果
        border-radius: 16px;
        overflow: hidden; // 确保所有内容都被裁剪在卡片内
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        display: flex;
        flex-direction: column;
        height: fit-content;
        will-change: transform;
        contain: layout style paint; // 严格的CSS containment
        isolation: isolate; // 创建新的堆叠上下文

        &:hover {
          transform: translateY(-6px) translateZ(0);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.26);

          .article-image {
            // 确保图片容器在hover时也不会溢出
            overflow: hidden;

            img {
              transform: scale(1.03) translateZ(0);
              // 确保缩放不会影响文档流
              position: relative;
              z-index: 1;
            }
            &::after {
              opacity: 0.9;
            }
          }

          .article-title {
            color: #8ec8ff;
          }
        }

        .article-image {
          height: 160px;
          overflow: hidden; // 关键：确保缩放的图片不会溢出容器
          background: #f7fafc;
          flex-shrink: 0;
          position: relative;
          contain: layout style paint; // CSS containment 优化性能和防止布局影响
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);

          &::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 70px;
            background: linear-gradient(
              180deg,
              rgba(0, 0, 0, 0) 0%,
              rgba(2, 6, 23, 0.28) 60%,
              rgba(2, 6, 23, 0.42) 100%
            );
            transition: opacity 0.3s ease;
            opacity: 0.75;
            z-index: 1;
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform;
            backface-visibility: hidden;
            transform-origin: center center; // 确保从中心缩放
          }
        }

        .article-image-placeholder {
          height: 160px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);

          .placeholder-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: white;

            .placeholder-icon {
              font-size: 32px;
              opacity: 0.8;
            }

            .placeholder-text {
              font-size: 24px;
              font-weight: 700;
              opacity: 0.9;
            }
          }
        }

        /* 适配模板结构：card-body / card-footer */
        .card-body {
          padding: 18px 18px 6px 18px;
        }

        .article-title {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff; // 改为白色，在透明背景上可见
          margin: 0 0 8px 0;
          line-height: 1.4;
          transition: color 0.3s ease;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 48px;
          word-wrap: break-word;
          word-break: break-word;
        }

        .article-summary {
          color: rgba(255, 255, 255, 0.82); // 半透明白色
          line-height: 1.6;
          margin: 0 0 12px 0;
          font-size: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 42px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 18px 16px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);

          .article-author {
            display: flex;
            align-items: center;
            gap: 10px;
            .author-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background-color: rgba(255, 255, 255, 0.16);
              background-size: cover;
              background-position: center;
              border: 1px solid rgba(255, 255, 255, 0.22);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .avatar-fallback {
              color: #fff;
              font-weight: 700;
            }

            .author-info {
              display: flex;
              flex-direction: column;
              line-height: 1.2;

              .author-name {
                font-size: 12px;
                font-weight: 500;
                color: hotpink; // 提高对比度
              }

              .publish-date {
                font-size: 11px;
                color: #1a1a1a;
              }
            }
          }

          .article-stats {
            .badge {
              border-radius: 999px;
              padding: 4px 10px;
              font-size: 12px;
              background: rgba(64, 158, 255, 0.15);
              color: #8ec8ff;
              border: 1px solid rgba(64, 158, 255, 0.25);
            }
          }
        }
      }
    }
  }
}

// 动画效果

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .home {
    .hero {
      min-height: 80vh;
      margin: -10px -10px 30px -10px;

      .hero-content {
        padding: 0 15px;

        .hero-avatar {
          margin-bottom: 20px;

          img,
          .avatar-placeholder {
            width: 80px;
            height: 80px;
          }

          .avatar-placeholder .avatar-icon {
            font-size: 32px;
          }
        }

        .hero-title {
          .title-main {
            font-size: 32px;
            margin-bottom: 8px;
          }

          .title-accent {
            font-size: 18px;
            letter-spacing: 1px;
          }
        }

        .hero-subtitle {
          font-size: 16px;
          margin-bottom: 30px;
        }

        .hero-stats {
          gap: 20px;
          margin-bottom: 30px;

          .stat-item .stat-number {
            font-size: 24px;
          }
        }

        .hero-actions {
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin-bottom: 30px;

          .primary-btn,
          .secondary-btn {
            width: 200px;
            padding: 12px 24px;
            font-size: 14px;
          }
        }

        .hero-social {
          gap: 15px;

          .social-link {
            padding: 8px 16px;
            font-size: 12px;
          }
        }
      }
    }

    .articles-grid {
      grid-template-columns: 1fr;
    }

    .article-item {
      .article-title {
        font-size: 16px;
        line-height: 1.4;
        min-height: 44px;
        -webkit-line-clamp: 3;
      }
    }
  }
}
</style>
