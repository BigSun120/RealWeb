<template>
  <div class="gomoku-page">
    <PageHeader
      title="五子棋对战"
      subtitle="与 AI 对弈，挑战不同难度并冲击排行榜"
      :show-filters="false"
    />

    <div class="gomoku-layout">
      <section class="gomoku-board-section">
        <header class="board-toolbar">
          <div class="status-text" :class="`status-${statusState}`">
            <el-tag v-if="statusMessage" :type="statusTagType" effect="plain">
              {{ statusMessage }}
            </el-tag>
          </div>
          <div class="board-actions">
            <el-button
              type="primary"
              :disabled="aiThinking"
              @click="handleRestart"
            >
              {{ isGameActive ? '重新开始' : '开始对局' }}
            </el-button>
            <el-tooltip content="每局最多悔棋三次" placement="bottom">
              <el-button
                :disabled="!canUndo"
                @click="handleUndo"
              >
                悔棋 ({{ undoCount }}/{{ MAX_UNDO }})
              </el-button>
            </el-tooltip>
          </div>
        </header>

        <div
          class="board-wrapper"
          ref="boardWrapper"
          role="application"
          aria-label="五子棋棋盘"
        >
          <div
            class="board-grid"
            role="grid"
            :aria-disabled="aiThinking"
          >
            <button
              v-for="cell in boardCells"
              :key="`cell-${cell.row}-${cell.col}`"
              class="board-cell"
              :class="cellClass(cell.row, cell.col)"
              :data-cell="`${cell.row}-${cell.col}`"
              type="button"
              :disabled="isCellDisabled(cell.row, cell.col)"
              :aria-label="getCellAriaLabel(cell.row, cell.col)"
              @click="handleCellClick(cell.row, cell.col)"
              @keydown="handleCellKey(cell.row, cell.col, $event)"
            ></button>
          </div>
        </div>
      </section>

      <aside class="gomoku-sidebar">
        <div class="panel">
          <h3 class="panel-title">对局设置</h3>
          <el-radio-group
            v-model="currentDifficulty"
            class="difficulty-group"
            :disabled="isGameActive"
          >
            <el-radio-button
              v-for="item in difficulties"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
          <p class="hint">选择难度后点击“开始对局”，你将先手落子。</p>
          <el-alert
            class="auth-hint"
            v-if="!isLoggedIn"
            title="登录即可记录胜负并参与排行榜"
            type="info"
            show-icon
          />
        </div>

        <div class="panel">
          <h3 class="panel-title">我的战绩</h3>
          <div v-if="!isLoggedIn" class="panel-empty">
            <el-empty description="登录后完成首局即可解锁战绩统计" />
          </div>
          <div v-else-if="myStats.length === 0" class="panel-empty">
            <el-skeleton :rows="3" animated />
          </div>
          <div v-else class="stats-list">
            <div
              v-for="item in myStats"
              :key="item.difficulty"
              class="stats-item"
              :class="{ 'is-current': item.difficulty === currentDifficulty }"
            >
              <div class="stats-difficulty">
                {{ getDifficultyLabel(item.difficulty) }}
              </div>
              <div class="stats-values">
                <span>胜：{{ item.wins }}</span>
                <span>负：{{ item.losses }}</span>
                <span>胜率：{{ item.winRate }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">排行榜（{{ currentDifficultyLabel }}）</h3>
            <el-button
              link
              size="small"
              :disabled="rankingLoading"
              @click="loadRankings({ forceReload: true })"
            >
              刷新
            </el-button>
          </div>
          <div v-if="rankingLoading" class="panel-loading">
            <el-skeleton :rows="4" animated />
          </div>
          <div v-else-if="rankings.length === 0" class="panel-empty">
            <el-empty description="尚无上榜玩家，快来夺得首胜吧" />
          </div>
          <ol v-else class="ranking-list">
            <li v-for="item in rankings" :key="item.rank" class="ranking-item">
              <span class="rank">#{{ item.rank }}</span>
              <span class="player" :title="item.displayName">{{ item.displayName }}</span>
              <span class="score">胜：{{ item.wins }}（胜率 {{ item.winRate }}%）</span>
            </li>
          </ol>
        </div>
      </aside>
    </div>

    <el-dialog
      v-model="resultDialog.visible"
      :title="resultDialog.title"
      width="360px"
      destroy-on-close
    >
      <p>{{ resultDialog.message }}</p>
      <template #footer>
        <el-button @click="resultDialog.visible = false">稍后再战</el-button>
        <el-button type="primary" @click="handleDialogRestart">再来一局</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageHeader from '@/components/common/PageHeader.vue';
import toolsService from '@/services/toolsService';
import { useUserStore } from '@/stores/user';

const BOARD_SIZE = 15;
const PLAYER = 1;
const AI = -1;
const MAX_UNDO = 3;
const directions = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 }
];

const difficulties = [
  { label: '入门', value: 'easy' },
  { label: '进阶', value: 'medium' },
  { label: '高手', value: 'hard' }
];

const userStore = useUserStore();
const isLoggedIn = computed(() => userStore.isLoggedIn);

const board = ref(createEmptyBoard());
const history = ref([]);
const currentDifficulty = ref('easy');
const currentTurn = ref('player');
const isGameActive = ref(false);
const aiThinking = ref(false);
const undoCount = ref(0);
const statusMessage = ref('选择难度并点击开始对局');
const statusState = ref('idle');
const lastMove = ref(null);
const winningLine = ref([]);
const rankings = ref([]);
const rankingLoading = ref(false);
const myStats = ref([]);
const resultDialog = reactive({ visible: false, title: '', message: '' });
const boardWrapper = ref(null);

const statusTagType = computed(() => {
  if (statusState.value === 'success') return 'success';
  if (statusState.value === 'danger') return 'danger';
  if (statusState.value === 'warning') return 'warning';
  return 'info';
});

const currentDifficultyLabel = computed(() => getDifficultyLabel(currentDifficulty.value));
const canUndo = computed(() => isGameActive.value && history.value.length >= 2 && undoCount.value < MAX_UNDO && !aiThinking.value);
const boardCells = computed(() =>
  board.value.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => ({ row: rowIndex, col: colIndex, value }))
  )
);

function isCellDisabled(row, col) {
  if (!isGameActive.value) return true;
  if (aiThinking.value) return true;
  if (currentTurn.value !== 'player') return true;
  return board.value[row][col] !== 0;
}

function getCellAriaLabel(row, col) {
  const piece = board.value[row][col];
  if (piece === PLAYER) return `玩家棋子，位置 ${row + 1} 行 ${col + 1} 列`;
  if (piece === AI) return `AI 棋子，位置 ${row + 1} 行 ${col + 1} 列`;
  return `空位，${row + 1} 行 ${col + 1} 列`;
}

function cellClass(rowIndex, colIndex) {
  const value = board.value[rowIndex][colIndex];
  return {
    'is-player': value === PLAYER,
    'is-ai': value === AI,
    'is-last': lastMove.value?.row === rowIndex && lastMove.value?.col === colIndex,
    'is-winning': winningLine.value.some((pos) => pos.row === rowIndex && pos.col === colIndex)
}

}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function resetBoardState() {
  board.value = createEmptyBoard();
  history.value = [];
  currentTurn.value = 'player';
  isGameActive.value = true;
  aiThinking.value = false;
  undoCount.value = 0;
  statusMessage.value = '轮到你落子';
  statusState.value = 'active';
  lastMove.value = null;
  winningLine.value = [];
}

async function startGame() {
  resetBoardState();
  await focusBoard();
}

async function handleRestart() {
  if (isGameActive.value && history.value.length > 0) {
    try {
      await ElMessageBox.confirm('当前对局将被重置，是否继续？', '确认重新开始', {
        type: 'warning',
        confirmButtonText: '重新开始',
        cancelButtonText: '取消'
      });
    } catch (error) {
      return;
    }
  }
  await startGame();
}

function handleCellClick(rowIndex, colIndex) {
  if (!isGameActive.value || aiThinking.value) return;
  if (board.value[rowIndex][colIndex] !== 0) return;
  if (currentTurn.value !== 'player') return;

  placeStone(rowIndex, colIndex, PLAYER);
  history.value.push({ row: rowIndex, col: colIndex, role: PLAYER });
  lastMove.value = { row: rowIndex, col: colIndex, role: PLAYER };

  const result = evaluateBoardState(rowIndex, colIndex, PLAYER);
  if (result.winner) {
    return finishGame(result);
  }

  currentTurn.value = 'ai';
  statusMessage.value = 'AI 思考中…';
  statusState.value = 'thinking';
  triggerAiMove();
}

async function triggerAiMove() {
  aiThinking.value = true;
  await nextTick();

  const { row, col } = decideAIMove(board.value, currentDifficulty.value);
  // 保险：如果 AI 无法找到位置（理论上不会发生）
  if (row == null || col == null) {
    aiThinking.value = false;
    return finishGame({ winner: 'draw' });
  }

  placeStone(row, col, AI);
  history.value.push({ row, col, role: AI });
  lastMove.value = { row, col, role: AI };

  const result = evaluateBoardState(row, col, AI);
  aiThinking.value = false;

  if (result.winner) {
    return finishGame(result);
  }

  currentTurn.value = 'player';
  statusMessage.value = '轮到你落子';
  statusState.value = 'active';
}

function placeStone(row, col, role) {
  board.value[row][col] = role;
}

function evaluateBoardState(row, col, role) {
  if (checkWin(board.value, row, col, role)) {
    const winner = role === PLAYER ? 'player' : 'ai';
    return { winner, line: collectWinningLine(board.value, row, col, role) };
  }

  const isDraw = board.value.every((line) => line.every((cell) => cell !== 0));
  if (isDraw) {
    return { winner: 'draw' };
  }

  return { winner: null };
}

async function finishGame({ winner, line = [] }) {
  isGameActive.value = false;
  winningLine.value = line;

  if (winner === 'player') {
    statusMessage.value = '恭喜，你获胜了！';
    statusState.value = 'success';
    showResultDialog('你赢了！', '胜利属于你，排行榜已更新。');
    await submitBattleResult('win');
  } else if (winner === 'ai') {
    statusMessage.value = '很遗憾，AI 赢了这局。';
    statusState.value = 'danger';
    showResultDialog('AI 获胜', '再接再厉，换个策略继续挑战吧。');
    await submitBattleResult('lose');
  } else {
    statusMessage.value = '本局平局，两位旗鼓相当！';
    statusState.value = 'warning';
    showResultDialog('平局', '双方棋逢对手，欢迎继续挑战。');
  }

  currentTurn.value = 'player';
  await loadRankings({ forceReload: true });
  if (isLoggedIn.value) {
    loadMyStats({ forceReload: true });
  }
}

function handleUndo() {
  if (!canUndo.value) return;
  // 悔棋：移除最近的两步（AI + 玩家）
  for (let i = 0; i < 2; i += 1) {
    const last = history.value.pop();
    if (!last) break;
    board.value[last.row][last.col] = 0;
  }
  undoCount.value += 1;
  lastMove.value = history.value[history.value.length - 1] || null;
  winningLine.value = [];
  currentTurn.value = 'player';
  statusMessage.value = '悔棋成功，请继续落子';
  statusState.value = 'active';
}

async function submitBattleResult(result) {
  if (!isLoggedIn.value) {
    if (result === 'win') {
      ElMessage.info('登录可记录胜负并进入排行榜');
    }
    return;
  }

  try {
    await toolsService.submitGomokuResult({ difficulty: currentDifficulty.value, result });
    ElMessage.success('胜负已更新');
  } catch (error) {
    if (error.message?.includes('登录')) {
      ElMessage.info('请重新登录以记录胜负');
    } else {
      ElMessage.warning(error.message || '记录胜负失败');
    }
  }
}

function showResultDialog(title, message) {
  resultDialog.title = title;
  resultDialog.message = message;
  resultDialog.visible = true;
}

function handleDialogRestart() {
  resultDialog.visible = false;
  handleRestart();
}

async function loadRankings({ forceReload = false } = {}) {
  try {
    rankingLoading.value = true;
    const data = await toolsService.getGomokuRankings({ difficulty: currentDifficulty.value, forceReload }).catch(() => []);
    rankings.value = data;
  } finally {
    rankingLoading.value = false;
  }
}

async function loadMyStats({ forceReload = false } = {}) {
  if (!isLoggedIn.value) {
    myStats.value = [];
    return;
  }
  try {
    const data = await toolsService.getMyGomokuStats({ forceReload });
    myStats.value = data;
  } catch (error) {
    myStats.value = [];
  }
}

function getDifficultyLabel(difficulty) {
  return difficulties.find((item) => item.value === difficulty)?.label || difficulty;
}

function handleCellKey(rowIndex, colIndex, event) {
  const keyMap = {
    ArrowUp: { row: -1, col: 0 },
    ArrowDown: { row: 1, col: 0 },
    ArrowLeft: { row: 0, col: -1 },
    ArrowRight: { row: 0, col: 1 }
  };

  if (keyMap[event.key]) {
    event.preventDefault();
    const target = findNextCell(rowIndex, colIndex, keyMap[event.key]);
    focusCell(target.row, target.col);
    return;
  }

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    handleCellClick(rowIndex, colIndex);
  }
}

function findNextCell(row, col, delta) {
  let newRow = row + delta.row;
  let newCol = col + delta.col;

  if (newRow < 0) newRow = BOARD_SIZE - 1;
  if (newRow >= BOARD_SIZE) newRow = 0;
  if (newCol < 0) newCol = BOARD_SIZE - 1;
  if (newCol >= BOARD_SIZE) newCol = 0;

  return { row: newRow, col: newCol };
}

async function focusCell(row, col) {
  await nextTick();
  const button = boardWrapper.value?.querySelector(
    `[data-cell="${row}-${col}"]`
  );
  button?.focus();
}

async function focusBoard() {
  await focusCell(Math.floor(BOARD_SIZE / 2), Math.floor(BOARD_SIZE / 2));
}

function checkWin(currentBoard, row, col, role) {
  return directions.some(({ dx, dy }) => countContinuous(currentBoard, row, col, dx, dy, role) >= 5);
}

function collectWinningLine(currentBoard, row, col, role) {
  for (const { dx, dy } of directions) {
    const count = countContinuous(currentBoard, row, col, dx, dy, role);
    if (count >= 5) {
      const line = [];
      let r = row;
      let c = col;
      line.push({ row, col });
      for (let step = 1; step <= 4; step += 1) {
        const nr = row + dx * step;
        const nc = col + dy * step;
        if (!isInside(nr, nc) || currentBoard[nr][nc] !== role) break;
        line.push({ row: nr, col: nc });
      }
      for (let step = 1; step <= 4; step += 1) {
        const nr = row - dx * step;
        const nc = col - dy * step;
        if (!isInside(nr, nc) || currentBoard[nr][nc] !== role) break;
        line.push({ row: nr, col: nc });
      }
      return line;
    }
  }
  return [];
}

function countContinuous(currentBoard, row, col, dx, dy, role) {
  let count = 1;

  let nr = row + dx;
  let nc = col + dy;
  while (isInside(nr, nc) && currentBoard[nr][nc] === role) {
    count += 1;
    nr += dx;
    nc += dy;
  }

  nr = row - dx;
  nc = col - dy;
  while (isInside(nr, nc) && currentBoard[nr][nc] === role) {
    count += 1;
    nr -= dx;
    nc -= dy;
  }

  return count;
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function decideAIMove(currentBoard, difficulty) {
  const candidateMoves = [];
  let bestScore = -Infinity;
  let bestMove = null;

  // 首先检查是否有立即获胜或必须防守的位置
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (currentBoard[row][col] !== 0) continue;

      if (!hasNeighbor(currentBoard, row, col, 2) && history.value.length > 0) {
        continue;
      }

      if (wouldWin(currentBoard, row, col, AI)) {
        return { row, col };
      }

      if (difficulty !== 'easy' && wouldWin(currentBoard, row, col, PLAYER)) {
        return { row, col };
      }

      const offense = evaluatePoint(currentBoard, row, col, AI);
      const defense = evaluatePoint(currentBoard, row, col, PLAYER);
      let score = offense + defense * 0.9;

      if (difficulty === 'easy') {
        score += Math.random() * 30;
      } else if (difficulty === 'medium') {
        score += defense * 0.2;
      } else {
        const centerBias = 14 - (Math.abs(row - 7) + Math.abs(col - 7));
        score += centerBias;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = { row, col, score };
      }
      candidateMoves.push({ row, col, score });
    }
  }

  if (!bestMove) {
    return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
  }

  if (difficulty === 'easy') {
    const sorted = candidateMoves.sort((a, b) => b.score - a.score).slice(0, 6);
    return sorted[Math.floor(Math.random() * sorted.length)] || bestMove;
  }

  if (difficulty === 'medium') {
    const threshold = bestScore * 0.9;
    const filtered = candidateMoves.filter((item) => item.score >= threshold);
    return filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : bestMove;
  }

  return bestMove;
}

function hasNeighbor(currentBoard, row, col, distance = 1) {
  for (let dr = -distance; dr <= distance; dr += 1) {
    for (let dc = -distance; dc <= distance; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (isInside(nr, nc) && currentBoard[nr][nc] !== 0) {
        return true;
      }
    }
  }
  return false;
}

function wouldWin(currentBoard, row, col, role) {
  currentBoard[row][col] = role;
  const result = checkWin(currentBoard, row, col, role);
  currentBoard[row][col] = 0;
  return result;
}

function evaluatePoint(currentBoard, row, col, role) {
  let score = 0;
  directions.forEach(({ dx, dy }) => {
    const lineScore = evaluateLine(currentBoard, row, col, dx, dy, role);
    score += lineScore;
  });
  return score;
}

function evaluateLine(currentBoard, row, col, dx, dy, role) {
  let count = 1;
  let openEnds = 0;

  let nr = row + dx;
  let nc = col + dy;
  while (isInside(nr, nc) && currentBoard[nr][nc] === role) {
    count += 1;
    nr += dx;
    nc += dy;
  }
  if (isInside(nr, nc) && currentBoard[nr][nc] === 0) {
    openEnds += 1;
  }

  nr = row - dx;
  nc = col - dy;
  while (isInside(nr, nc) && currentBoard[nr][nc] === role) {
    count += 1;
    nr -= dx;
    nc -= dy;
  }
  if (isInside(nr, nc) && currentBoard[nr][nc] === 0) {
    openEnds += 1;
  }

  return scoreByPattern(count, openEnds);
}

function scoreByPattern(count, openEnds) {
  if (count >= 5) return 100000;
  if (count === 4) {
    if (openEnds === 2) return 50000;
    if (openEnds === 1) return 15000;
  }
  if (count === 3) {
    if (openEnds === 2) return 8000;
    if (openEnds === 1) return 2000;
  }
  if (count === 2) {
    if (openEnds === 2) return 1200;
    if (openEnds === 1) return 300;
  }
  if (count === 1) {
    return openEnds >= 1 ? 100 : 10;
  }
  return 5;
}

onMounted(async () => {
  await Promise.all([loadRankings(), loadMyStats()]);
  await focusBoard();
});

watch(currentDifficulty, () => {
  loadRankings({ forceReload: true });
});

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    loadMyStats({ forceReload: true });
  } else {
    myStats.value = [];
  }
});


</script>

<style scoped>
.gomoku-page {
  --board-line-color: #b88933;
  --board-surface: #f7e4c0;
  --player-piece: radial-gradient(circle at 30% 30%, #f9fafb 0%, #101112 80%);
  --ai-piece: radial-gradient(circle at 35% 35%, #fff8dc 0%, #8b4513 80%);
  --panel-bg: rgba(255, 255, 255, 0.82);
  --panel-blur: blur(18px);
  padding: 28px min(5vw, 48px) 48px;
  min-height: calc(100vh - 140px);
  background: radial-gradient(120% 140% at 20% 20%, #f7f5ff 0%, #eef3ff 45%, #e3f4ff 70%, #f4f7ff 100%);
}

.gomoku-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
  gap: 28px;
  align-items: start;
}

.board-grid::before {
  content: '';
  position: absolute;
  width: clamp(6px, 1.2vw, 10px);
  height: clamp(6px, 1.2vw, 10px);
  border-radius: 50%;
  background: rgba(44, 45, 51, 0.45);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow:
    calc(-4 * 100% / 15) calc(-4 * 100% / 15) 0 0 rgba(44, 45, 51, 0.45),
    calc(4 * 100% / 15) calc(-4 * 100% / 15) 0 0 rgba(44, 45, 51, 0.45),
    calc(-4 * 100% / 15) calc(4 * 100% / 15) 0 0 rgba(44, 45, 51, 0.45),
    calc(4 * 100% / 15) calc(4 * 100% / 15) 0 0 rgba(44, 45, 51, 0.45),
    0 0 0 0 rgba(44, 45, 51, 0.45);
}

@media (max-width: 1200px) {
  .gomoku-layout {
    grid-template-columns: 1fr;
  }
}

.gomoku-board-section {
  background: var(--panel-bg);
  border-radius: 24px;
  padding: clamp(18px, 3vw, 28px);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: var(--panel-blur);
  border: 1px solid rgba(148, 163, 184, 0.18);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.board-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.status-text {
  min-height: 32px;
}

.status-success .el-tag {
  --el-tag-border-color: #16a34a;
}

.status-danger .el-tag {
  --el-tag-border-color: #dc2626;
}

.status-warning .el-tag {
  --el-tag-border-color: #f97316;
}

.board-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.board-actions :deep(.el-button) {
  border-radius: 999px;
  padding: 10px 22px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.board-actions :deep(.el-button--primary) {
  box-shadow: 0 14px 30px rgba(59, 130, 246, 0.25);
}

.board-actions :deep(.el-button--primary:hover) {
  box-shadow: 0 16px 36px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.board-actions :deep(.el-button--default:hover) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.18);
}

.board-wrapper {
  --board-padding: clamp(14px, 2.5vw, 22px);
  position: relative;
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.85), rgba(238, 244, 255, 0.85));
  padding: var(--board-padding);
  box-shadow: inset 0 10px 22px rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(560px, 100%);
  margin: 0 auto;
}

.board-grid {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  grid-template-rows: repeat(15, 1fr);
  background-color: var(--board-surface);
  background-image:
    linear-gradient(var(--board-line-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--board-line-color) 1px, transparent 1px);
  background-size: calc(100% / 15) calc(100% / 15);
  background-position: center;
  border-radius: 16px;
  box-shadow: inset 0 0 0 2px rgba(44, 45, 51, 0.18);
}

.board-grid::after {
  content: '';
  position: absolute;
  inset: calc(100% / 15 * 2.5);
  border-radius: 50%;
  pointer-events: none;
  box-shadow:
    0 0 0 6px rgba(0, 0, 0, 0.04),
    0 0 0 12px rgba(0, 0, 0, 0.02);
}

.board-cell {
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  outline: none;
}

.board-cell::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(18px, 4vw, 36px);
  height: clamp(18px, 4vw, 36px);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.28);
  opacity: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease;
}

.board-cell.is-player::after {
  background: var(--player-piece);
  opacity: 1;
}

.board-cell.is-ai::after {
  background: var(--ai-piece);
  opacity: 1;
}

.board-cell.is-last::before {
  content: '';
  position: absolute;
  width: clamp(8px, 1.6vw, 14px);
  height: clamp(8px, 1.6vw, 14px);
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.8);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.7);
}

.board-cell.is-winning::before {
  background: rgba(16, 185, 129, 0.9);
}

.board-cell:focus-visible {
  outline: none;
}

.board-cell:focus-visible::after {
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.5), inset 0 4px 8px rgba(0, 0, 0, 0.28);
  transform: translate(-50%, -50%) scale(1.05);
  opacity: 1;
}

.board-cell:disabled {
  cursor: default;
}

.gomoku-sidebar {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.panel {
  background: var(--panel-bg);
  border-radius: 20px;
  padding: clamp(18px, 2.8vw, 26px);
  border: 1px solid rgba(148, 163, 184, 0.16);
  backdrop-filter: var(--panel-blur);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
}

.panel-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.panel-header :deep(.el-button.is-link) {
  font-weight: 500;
  color: #2563eb;
  transition: color 0.2s ease;
}

.panel-header :deep(.el-button.is-link:hover) {
  color: #1d4ed8;
}

.panel-header :deep(.el-button.is-link:disabled) {
  color: rgba(148, 163, 184, 0.8);
}

.difficulty-group {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0 10px;
}

.difficulty-group :deep(.el-radio-button__inner) {
  width: 100%;
  justify-content: center;
  border-radius: 12px !important;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(241, 245, 255, 0.9);
  color: #1f2937;
  padding: 10px 0;
  transition: all 0.2s ease;
}

.difficulty-group :deep(.el-radio-button__inner:hover) {
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.12);
}

.difficulty-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(59, 130, 246, 0.32));
  border-color: rgba(59, 130, 246, 0.45);
  color: #0f172a;
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.22);
}

.hint {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
}

.auth-hint {
  margin-top: 18px;
}

.panel-empty,
.panel-loading {
  padding: 14px 0;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(244, 247, 255, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stats-item.is-current {
  background: rgba(59, 130, 246, 0.12);
  box-shadow: 0 12px 30px rgba(59, 130, 246, 0.12);
  transform: translateX(4px);
}

.stats-values {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #374151;
}

.ranking-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(241, 245, 249, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.ranking-item .rank {
  font-weight: 600;
  color: #1f2937;
}

.ranking-item .player {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;
}

.ranking-item .score {
  white-space: nowrap;
  color: #475569;
  font-size: 13px;
}

.ranking-item:nth-child(1) {
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(245, 158, 11, 0.18));
  border-color: rgba(251, 191, 36, 0.35);
}

.ranking-item:nth-child(2) {
  background: linear-gradient(135deg, rgba(191, 219, 254, 0.25), rgba(147, 197, 253, 0.2));
}

.ranking-item:nth-child(3) {
  background: linear-gradient(135deg, rgba(252, 165, 165, 0.25), rgba(248, 113, 113, 0.18));
}

@media (max-width: 768px) {
  .gomoku-page {
    padding: 20px 16px 32px;
  }

  .board-wrapper {
    width: 100%;
  }

  .gomoku-board-section {
    padding: 18px;
  }

  .board-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .ranking-item {
    grid-template-columns: 32px 1fr;
    grid-template-rows: auto auto;
  }

  .ranking-item .score {
    grid-column: span 2;
  }
}
</style>




