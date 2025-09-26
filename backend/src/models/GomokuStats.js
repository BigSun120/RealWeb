const mongoose = require('mongoose');

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const RESULTS = ['win', 'lose'];

/**
 * Gomoku (五子棋) user statistics model
 */
const gomokuStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      required: true,
      index: true
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    totalGames: {
      type: Number,
      default: 0
    },
    lastResult: {
      type: String,
      enum: RESULTS,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// compound unique index per user per difficulty
gomokuStatsSchema.index({ userId: 1, difficulty: 1 }, { unique: true });

/**
 * Submit single game result and return updated stats.
 */
gomokuStatsSchema.statics.recordResult = async function ({ userId, difficulty, result }) {
  if (!DIFFICULTIES.includes(difficulty)) {
    throw new Error('Invalid difficulty');
  }
  if (!RESULTS.includes(result)) {
    throw new Error('Invalid result');
  }

  const update = {
    $inc: {
      totalGames: 1,
      wins: result === 'win' ? 1 : 0,
      losses: result === 'lose' ? 1 : 0
    },
    $set: {
      lastResult: result,
      difficulty,
      updatedAt: new Date()
    }
  };

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  };

  const stats = await this.findOneAndUpdate({ userId, difficulty }, update, options).lean();
  return stats;
};

/**
 * Compute a display-friendly payload from stats document.
 */
gomokuStatsSchema.statics.formatStats = function (stats) {
  if (!stats) {
    return null;
  }
  const wins = stats.wins || 0;
  const losses = stats.losses || 0;
  const total = stats.totalGames || wins + losses;
  const winRate = total > 0 ? Number(((wins / total) * 100).toFixed(2)) : 0;

  return {
    userId: stats.userId,
    difficulty: stats.difficulty,
    wins,
    losses,
    totalGames: total,
    winRate,
    lastResult: stats.lastResult,
    updatedAt: stats.updatedAt
  };
};

module.exports = mongoose.model('GomokuStats', gomokuStatsSchema);
module.exports.DIFFICULTIES = DIFFICULTIES;
module.exports.RESULTS = RESULTS;
