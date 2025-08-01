<template>
  <div class="game-list">
    <h1>小游戏</h1>
    <div v-loading="loading" class="games">
      <div v-for="game in games" :key="game._id" class="game-card" @click="$router.push(`/games/${game._id}`)">
        <div class="game-thumbnail">
          <img :src="game.thumbnail" :alt="game.name" />
        </div>
        <div class="game-info">
          <h3>{{ game.name }}</h3>
          <p>{{ game.description }}</p>
          <div class="meta">
            <span>{{ game.category }}</span>
            <span>{{ game.playCount }} 次游玩</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '@/api';

export default {
  name: 'GameList',
  setup() {
    const games = ref([]);
    const loading = ref(false);

    const fetchGames = async () => {
      loading.value = true;
      try {
        const response = await api.get('/games');
        games.value = response.data.data.games;
      } catch (error) {
        console.error('获取游戏失败:', error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchGames();
    });

    return {
      games,
      loading
    };
  }
};
</script>

<style scoped>
.game-list {
  padding: 20px;
}

.games {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.game-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.game-card:hover {
  transform: translateY(-4px);
}

.game-thumbnail {
  height: 200px;
  overflow: hidden;
}

.game-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-info {
  padding: 20px;
}

.meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}
</style>
