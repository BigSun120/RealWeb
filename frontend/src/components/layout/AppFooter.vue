<template>
  <footer class="app-footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-info">
          <h3>个人网站</h3>
          <p>分享技术文章和有趣的小游戏</p>
        </div>
        
        <div class="footer-links">
          <div class="link-group">
            <h4>导航</h4>
            <ul>
              <li><router-link to="/">首页</router-link></li>
              <li><router-link to="/blog">博客</router-link></li>
              <li><router-link to="/games">小游戏</router-link></li>
              <li><router-link to="/about">关于</router-link></li>
            </ul>
          </div>
          
          <div class="link-group">
            <h4>联系方式</h4>
            <ul>
              <li><a href="mailto:your.email@example.com">邮箱联系</a></li>
              <li><a href="https://github.com/yourusername" target="_blank">GitHub</a></li>
              <li><a href="#" target="_blank">微博</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; 2023 个人网站. All rights reserved.</p>
        <p>
          <a href="#" target="_blank">隐私政策</a> | 
          <a href="#" target="_blank">使用条款</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'AppFooter'
};
</script>

<style lang="scss" scoped>
.app-footer {
  background: #2c3e50;
  color: #ecf0f1;
  margin-top: auto;

  .footer-content {
    display: flex;
    justify-content: space-between;
    padding: 40px 0;
    border-bottom: 1px solid #34495e;

    .footer-info {
      flex: 1;
      max-width: 300px;

      h3 {
        font-size: 24px;
        margin-bottom: 10px;
        color: #3498db;
      }

      p {
        color: #bdc3c7;
        line-height: 1.6;
      }
    }

    .footer-links {
      display: flex;
      gap: 60px;

      .link-group {
        h4 {
          font-size: 16px;
          margin-bottom: 15px;
          color: #ecf0f1;
        }

        ul {
          list-style: none;

          li {
            margin-bottom: 8px;

            a {
              color: #bdc3c7;
              text-decoration: none;
              transition: color 0.3s;

              &:hover {
                color: #3498db;
              }
            }
          }
        }
      }
    }
  }

  .footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;
    font-size: 14px;
    color: #95a5a6;

    a {
      color: #95a5a6;
      text-decoration: none;
      margin: 0 5px;

      &:hover {
        color: #3498db;
      }
    }
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
