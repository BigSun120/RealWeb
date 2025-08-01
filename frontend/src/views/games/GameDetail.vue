<template>
  <div class="game-detail">
    <div v-loading="loading">
      <div v-if="game" class="game">
        <h1>{{ game.name }}</h1>
        <div class="game-info">
          <img :src="game.thumbnail" :alt="game.name" class="thumbnail" />
          <div class="info">
            <p>{{ game.description }}</p>
            <div class="meta">
              <span>分类：{{ game.category }}</span>
              <span>游玩次数：{{ game.playCount }}</span>
            </div>
            <el-button type="primary" size="large" @click="playGame">
              开始游戏
            </el-button>
          </div>
        </div>
        <div v-if="showGame" class="game-container">
          <iframe :src="game.url" frameborder="0" width="100%" height="600px"></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/api';

export default {
  name: 'GameDetail',
  setup() {
    const route = useRoute();
    const game = ref(null);
    const loading = ref(false);
    const showGame = ref(false);

    const fetchGame = async () => {
      loading.value = true;
      try {
        const response = await api.get(`/games/${route.params.id}`);
        game.value = response.data.data;
      } catch (error) {
        console.error('获取游戏失败:', error);
      } finally {
        loading.value = false;
      }
    };

    const playGame = () => {
      showGame.value = true;
    };

    onMounted(() => {
      fetchGame();
    });

    return {
      game,
      loading,
      showGame,
      playGame
    };
  }
};
</script>

<style scoped>
.game-detail {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.game {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.game-info {
  display: flex;
  gap: 30px;
  margin: 30px 0;
}

.thumbnail {
  width: 300px;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}

.info {
  flex: 1;
}

.meta {
  display: flex;
  gap: 20px;
  color: #666;
  margin: 20px 0;
}

.game-container {
  margin-top: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}
</style>
