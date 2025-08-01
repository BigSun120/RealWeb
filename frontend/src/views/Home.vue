<template>
  <div class="home">
    <!-- 英雄区域 -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">欢迎来到我的个人网站</h1>
        <p class="hero-subtitle">分享技术文章，探索有趣的小游戏</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="$router.push('/blog')">
            浏览博客
          </el-button>
          <el-button size="large" @click="$router.push('/games')">
            体验游戏
          </el-button>
        </div>
      </div>
    </section>

    <!-- 最新文章 -->
    <section class="latest-articles">
      <div class="section-header">
        <h2>最新文章</h2>
        <router-link to="/blog" class="more-link">查看更多</router-link>
      </div>

      <div class="articles-grid" v-loading="articlesLoading">
        <div
          v-for="article in latestArticles"
          :key="article._id"
          class="article-card"
          @click="$router.push(`/blog/${article._id}`)"
        >
          <div class="article-cover" v-if="article.coverImage">
            <img :src="article.coverImage" :alt="article.title" />
          </div>
          <div class="article-content">
            <h3 class="article-title">{{ article.title }}</h3>
            <p class="article-excerpt">{{ getExcerpt(article.content) }}</p>
            <div class="article-meta">
              <span class="author">{{ article.author?.username }}</span>
              <span class="date">{{ formatDate(article.createdAt) }}</span>
              <span class="views">{{ article.viewCount }} 阅读</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 热门游戏 -->
    <section class="popular-games">
      <div class="section-header">
        <h2>热门游戏</h2>
        <router-link to="/games" class="more-link">查看更多</router-link>
      </div>

      <div class="games-grid" v-loading="gamesLoading">
        <div
          v-for="game in popularGames"
          :key="game._id"
          class="game-card"
          @click="$router.push(`/games/${game._id}`)"
        >
          <div class="game-thumbnail">
            <img :src="game.thumbnail" :alt="game.name" />
            <div class="play-overlay">
              <el-icon class="play-icon"><VideoPlay /></el-icon>
            </div>
          </div>
          <div class="game-info">
            <h3 class="game-name">{{ game.name }}</h3>
            <p class="game-description">{{ game.description }}</p>
            <div class="game-stats">
              <span class="play-count">{{ game.playCount }} 次游玩</span>
              <span class="category">{{ game.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '@/api';

export default {
  name: 'Home',
  setup() {
    const latestArticles = ref([]);
    const popularGames = ref([]);
    const articlesLoading = ref(false);
    const gamesLoading = ref(false);

    const fetchLatestArticles = async () => {
      articlesLoading.value = true;
      try {
        const response = await api.get('/articles?limit=6');
        latestArticles.value = response.data.data.articles;
      } catch (error) {
        console.error('获取最新文章失败:', error);
      } finally {
        articlesLoading.value = false;
      }
    };

    const fetchPopularGames = async () => {
      gamesLoading.value = true;
      try {
        const response = await api.get('/games?limit=6');
        popularGames.value = response.data.data.games;
      } catch (error) {
        console.error('获取热门游戏失败:', error);
      } finally {
        gamesLoading.value = false;
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

    onMounted(() => {
      fetchLatestArticles();
      fetchPopularGames();
    });

    return {
      latestArticles,
      popularGames,
      articlesLoading,
      gamesLoading,
      getExcerpt,
      formatDate
    };
  }
};
</script>

<style lang="scss" scoped>
.home {
  .hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 80px 0;
    text-align: center;
    margin: -20px -20px 40px -20px;

    .hero-content {
      max-width: 600px;
      margin: 0 auto;
      padding: 0 20px;

      .hero-title {
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 20px;
        line-height: 1.2;
      }

      .hero-subtitle {
        font-size: 20px;
        margin-bottom: 40px;
        opacity: 0.9;
      }

      .hero-actions {
        display: flex;
        gap: 20px;
        justify-content: center;
      }
    }
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;

    h2 {
      font-size: 28px;
      color: #333;
    }

    .more-link {
      color: #409eff;
      font-size: 16px;
    }
  }

  .latest-articles {
    margin-bottom: 60px;

    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;

      .article-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: transform 0.3s, box-shadow 0.3s;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .article-cover {
          height: 200px;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .article-content {
          padding: 20px;

          .article-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
            line-height: 1.4;
          }

          .article-excerpt {
            color: #666;
            line-height: 1.6;
            margin-bottom: 15px;
          }

          .article-meta {
            display: flex;
            gap: 15px;
            font-size: 14px;
            color: #999;

            span {
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }
  }

  .popular-games {
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;

      .game-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: transform 0.3s, box-shadow 0.3s;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

          .play-overlay {
            opacity: 1;
          }
        }

        .game-thumbnail {
          position: relative;
          height: 180px;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .play-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s;

            .play-icon {
              font-size: 48px;
              color: white;
            }
          }
        }

        .game-info {
          padding: 20px;

          .game-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
          }

          .game-description {
            color: #666;
            margin-bottom: 15px;
            line-height: 1.5;
          }

          .game-stats {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #999;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .home {
    .hero {
      padding: 60px 0;
      margin: -10px -10px 30px -10px;

      .hero-content {
        .hero-title {
          font-size: 36px;
        }

        .hero-subtitle {
          font-size: 18px;
        }

        .hero-actions {
          flex-direction: column;
          align-items: center;
        }
      }
    }

    .articles-grid,
    .games-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
