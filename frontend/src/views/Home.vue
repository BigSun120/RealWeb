<template>
  <div class="home">
    <!-- 英雄区域 - 突破容器限制实现全屏 -->
    <section class="hero fullscreen-hero">
      <div class="hero-background">
        <div class="hero-particles"></div>
        <div class="hero-gradient"></div>
      </div>

      <div class="hero-content">
        <div class="hero-avatar">
          <img v-if="settingsStore.siteLogo" :src="settingsStore.siteLogo" :alt="settingsStore.siteTitle" class="animate__animated animate__bounceIn" />
          <div v-else class="avatar-placeholder animate__animated animate__bounceIn">
            <i class="avatar-icon">👨‍💻</i>
          </div>
        </div>

        <h1 class="hero-title">
          <span class="title-main">{{ settingsStore.siteTitle || '个人技术博客' }}</span>
          <span class="title-accent">Developer & Creator</span>
        </h1>

        <p class="hero-subtitle">{{ settingsStore.siteDescription || '分享技术文章，记录编程之路' }}</p>

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
          <el-button type="primary" size="large" class="primary-btn animate__animated animate__heartBeat" @click="$router.push('/blog')">
            <i class="btn-icon">📚</i>
            浏览博客
          </el-button>
          <el-button size="large" class="secondary-btn" @click="scrollToContact">
            <i class="btn-icon">💬</i>
            联系我
          </el-button>
        </div>

        <div class="hero-social">
          <a v-if="settingsStore.socialLinks?.github" :href="settingsStore.socialLinks.github" target="_blank" class="social-link">
            <i class="social-icon">🐙</i>
            <span>GitHub</span>
          </a>
          <a v-if="settingsStore.contactEmail" :href="`mailto:${settingsStore.contactEmail}`" class="social-link">
            <i class="social-icon">📧</i>
            <span>Email</span>
          </a>
          <a v-if="settingsStore.socialLinks?.weibo" :href="settingsStore.socialLinks.weibo" target="_blank" class="social-link">
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
          <router-link to="/blog" class="view-more-btn">
            查看更多 →
          </router-link>
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
        <div v-else class="articles-list">
          <article
            v-for="article in latestArticles"
            :key="article._id"
            class="article-item"
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
            <div class="article-info">
              <h3 class="article-title">{{ article.title }}</h3>
              <p class="article-summary">{{ article.excerpt || getExcerpt(article.content) }}</p>

              <div class="article-footer">
                <div class="article-author">
                  <span class="author-name">{{ article.author?.username || '匿名' }}</span>
                  <span class="publish-date">{{ formatDate(article.createdAt) }}</span>
                </div>
                <div class="article-stats">
                  <span class="view-count">{{ article.viewCount || 0 }} 阅读</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>


  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import api from '@/api';

export default {
  name: 'Home',
  setup() {
    const settingsStore = useSettingsStore();
    const latestArticles = ref([]);
    const articlesLoading = ref(false);
    const articleCount = ref(0);
    const totalViews = ref(0);

    const fetchLatestArticles = async () => {
      articlesLoading.value = true;
      try {
        const response = await api.get('/articles?limit=6');
        latestArticles.value = response.data.data.articles;

        // 获取统计数据
        articleCount.value = response.data.data.total || latestArticles.value.length;
        totalViews.value = latestArticles.value.reduce((sum, article) => sum + (article.viewCount || 0), 0);
      } catch (error) {
        console.error('获取最新文章失败:', error);
      } finally {
        articlesLoading.value = false;
      }
    };



    const getExcerpt = (content) => {
      if (!content) return '';
      const text = content.replace(/[#*`]/g, '').substring(0, 100);
      return text.length > 100 ? text + '...' : text;
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('zh-CN');
    };

    const scrollToContact = () => {
      // 滚动到页面底部的联系方式
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    };

    onMounted(() => {
      fetchLatestArticles();
      // 加载设置
      if (!settingsStore.loaded) {
        settingsStore.loadSettings();
      }
    });

    return {
      settingsStore,
      latestArticles,
      articlesLoading,
      articleCount,
      totalViews,
      getExcerpt,
      formatDate,
      scrollToContact
    };
  }
};
</script>

<style lang="scss" scoped>
.home {
  // 全屏Hero区域
  .fullscreen-hero {
    position: relative;
    width: 100vw;
    height: 100vh;
    margin-left: calc(-50vw + 50%);
    margin-top: -20px;
    margin-bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    .hero-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1;

      .hero-particles {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.4) 0%, transparent 60%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.4) 0%, transparent 60%),
          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.4) 0%, transparent 60%),
          radial-gradient(circle at 60% 70%, rgba(255, 206, 84, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 90% 90%, rgba(139, 69, 19, 0.2) 0%, transparent 40%);
        animation: float 8s ease-in-out infinite, pulse 4s ease-in-out infinite alternate;
      }

      .hero-gradient {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
          linear-gradient(135deg,
            rgba(102, 126, 234, 0.95) 0%,
            rgba(118, 75, 162, 0.9) 30%,
            rgba(64, 158, 255, 0.9) 60%,
            rgba(159, 122, 234, 0.95) 100%),
          linear-gradient(45deg,
            rgba(255, 119, 198, 0.1) 0%,
            transparent 50%,
            rgba(120, 219, 255, 0.1) 100%);
        animation: gradientShift 10s ease-in-out infinite;
      }
    }

    .hero-content {
      position: relative;
      z-index: 2;
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
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    position: relative;

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
        color: #1a202c;
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

      .article-item {
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        height: fit-content;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);

          .article-image img {
            transform: scale(1.03);
          }

          .article-title {
            color: #409eff;
          }
        }

        .article-image {
          height: 160px;
          overflow: hidden;
          background: #f7fafc;
          flex-shrink: 0;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
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

        .article-info {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;

          .article-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 10px;
            line-height: 1.4;
            transition: color 0.3s ease;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 50px;
          }

          .article-summary {
            color: #4a5568;
            line-height: 1.5;
            margin-bottom: 16px;
            font-size: 14px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 42px;
          }

          .article-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid #f1f5f9;

            .article-author {
              display: flex;
              flex-direction: column;
              gap: 2px;

              .author-name {
                font-size: 12px;
                font-weight: 500;
                color: #2d3748;
              }

              .publish-date {
                font-size: 11px;
                color: #718096;
              }
            }

            .article-stats {
              .view-count {
                font-size: 11px;
                color: #409eff;
                font-weight: 500;
                background: #f0f8ff;
                padding: 2px 8px;
                border-radius: 12px;
              }
            }
          }
        }
      }
    }
  }

}

// 动画效果
@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  33% {
    transform: translateY(-15px) rotate(1deg) scale(1.02);
  }
  66% {
    transform: translateY(8px) rotate(-1deg) scale(0.98);
  }
}

@keyframes pulse {
  0% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
}

@keyframes gradientShift {
  0%, 100% {
    filter: hue-rotate(0deg);
  }
  50% {
    filter: hue-rotate(20deg);
  }
}

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

          img, .avatar-placeholder {
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

          .primary-btn, .secondary-btn {
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
  }
}
</style>
