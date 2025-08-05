<template>
  <footer class="app-footer" data-aos="fade-up" data-aos-duration="1000">
    <div class="footer-background">
      <div class="footer-particles"></div>
      <div class="footer-gradient"></div>
    </div>

    <div class="container">
      <div class="footer-content">
        <div class="footer-info" data-aos="fade-up" data-aos-delay="100">
          <h3>{{ settingsStore.siteTitle }}</h3>
          <p>{{ settingsStore.siteDescription }}</p>
        </div>

        <div class="footer-links">
          <div class="link-group" data-aos="fade-up" data-aos-delay="200">
            <h4>导航</h4>
            <ul>
              <li><router-link to="/">首页</router-link></li>
              <li><router-link to="/blog">博客</router-link></li>
              <li><router-link to="/about">关于</router-link></li>
            </ul>
          </div>

          <div class="link-group" data-aos="fade-up" data-aos-delay="300">
            <h4>联系方式</h4>
            <ul>
              <li v-if="settingsStore.contactEmail">
                <a :href="`mailto:${settingsStore.contactEmail}`">
                  <i class="contact-icon">📧</i>
                  {{ settingsStore.contactEmail }}
                </a>
              </li>
              <li v-if="settingsStore.socialLinks.github">
                <a :href="settingsStore.socialLinks.github" target="_blank">
                  <i class="contact-icon">🐙</i>
                  {{ getGitHubUsername(settingsStore.socialLinks.github) }}
                </a>
              </li>
              <li v-if="settingsStore.socialLinks.weibo">
                <a :href="settingsStore.socialLinks.weibo" target="_blank">
                  <i class="contact-icon">🐦</i>
                  {{ getWeiboUsername(settingsStore.socialLinks.weibo) }}
                </a>
              </li>
              <li v-if="settingsStore.socialLinks.email && settingsStore.socialLinks.email !== settingsStore.contactEmail">
                <a :href="`mailto:${settingsStore.socialLinks.email}`">
                  <i class="contact-icon">✉️</i>
                  {{ settingsStore.socialLinks.email }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer-bottom" data-aos="fade-up" data-aos-delay="400">
        <p>&copy; {{ new Date().getFullYear() }} {{ settingsStore.siteTitle }}. All rights reserved.</p>
        <p>
          <a href="#" target="_blank">隐私政策</a> |
          <a href="#" target="_blank">使用条款</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script>
import { onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';

export default {
  name: 'AppFooter',
  setup() {
    const settingsStore = useSettingsStore();

    // 组件挂载时加载设置
    onMounted(() => {
      if (!settingsStore.isLoaded) {
        settingsStore.loadSettings();
      }
    });

    // 提取GitHub用户名
    const getGitHubUsername = (url) => {
      if (!url) return 'GitHub';
      try {
        const match = url.match(/github\.com\/([^\/]+)/);
        return match ? `@${match[1]}` : 'GitHub';
      } catch {
        return 'GitHub';
      }
    };

    // 提取微博用户名
    const getWeiboUsername = (url) => {
      if (!url) return '微博';
      try {
        const match = url.match(/weibo\.com\/([^\/\?]+)/);
        return match ? `@${match[1]}` : '微博';
      } catch {
        return '微博';
      }
    };

    return {
      settingsStore,
      getGitHubUsername,
      getWeiboUsername
    };
  }
};
</script>

<style lang="scss" scoped>
.app-footer {
  position: relative;
  // background: linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #1a202c 100%);
  color: #e2e8f0;
  margin-top: auto;
  overflow: hidden;

  .footer-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;

    .footer-particles {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      // background:
      //   radial-gradient(circle at 20% 20%, rgba(64, 158, 255, 0.1) 0%, transparent 50%),
      //   radial-gradient(circle at 80% 80%, rgba(102, 126, 234, 0.1) 0%, transparent 50%);
      // animation: footerFloat 8s ease-in-out infinite;
    }

    .footer-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      // background: linear-gradient(180deg,
      //   rgba(64, 158, 255, 0.05) 0%,
      //   transparent 50%,
      //   rgba(102, 126, 234, 0.05) 0%);
    }
  }

  .footer-content {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    padding: 60px 20px 40px;
    // border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .footer-info {
      flex: 1;
      max-width: 400px;

      h3 {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 16px;
        background: linear-gradient(45deg, #409eff, #667eea);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      p {
        color: #cbd5e0;
        line-height: 1.6;
        font-size: 16px;
        opacity: 0.9;
      }
    }

    .footer-links {
      display: flex;
      gap: 80px;

      .link-group {
        h4 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #f7fafc;
          position: relative;

          &::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 30px;
            height: 2px;
            background: linear-gradient(45deg, #409eff, #667eea);
            border-radius: 1px;
          }
        }

        ul {
          list-style: none;

          li {
            margin-bottom: 12px;

            a {
              color: #cbd5e0;
              text-decoration: none;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 4px 0;
              font-size: 14px;

              &:hover {
                color: #409eff;
                transform: translateX(4px);
              }

              .contact-icon {
                font-style: normal;
                font-size: 16px;
                opacity: 0.8;
              }
            }
          }
        }
      }
    }
  }

  .footer-bottom {
    position: relative;
    z-index: 2;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30px 20px;
    font-size: 14px;
    color: #a0aec0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    a {
      color: #a0aec0;
      text-decoration: none;
      margin: 0 8px;
      transition: all 0.3s ease;
      padding: 4px 8px;
      border-radius: 4px;

      &:hover {
        color: #409eff;
        background: rgba(64, 158, 255, 0.1);
      }
    }
  }
}

// Footer动画效果
@keyframes footerFloat {
  0%, 100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-5px) scale(1.02);
  }
}

@media (max-width: 768px) {
  .app-footer {
    .footer-content {
      flex-direction: column;
      gap: 30px;

      .footer-links {
        gap: 30px;
      }
    }

    .footer-bottom {
      flex-direction: column;
      gap: 10px;
      text-align: center;
    }
  }
}
</style>
