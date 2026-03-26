const STORAGE_KEY = 'rage_game_stats';

const defaultStats = {
  totalAngerScore: 0,
  gamesPlayed: 0,
  bestScores: {},
  dishesSmashed: 0,
  bubblesPopped: 0,
  ballsSmashed: 0,
  papersRipped: 0,
  lastPlayed: null,
};

export class ScoreManager {
  constructor() {
    this.stats = this._load();
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? { ...defaultStats, ...JSON.parse(data) } : { ...defaultStats };
    } catch {
      return { ...defaultStats };
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch { /* quota exceeded */ }
  }

  addScore(gameId, score) {
    this.stats.totalAngerScore += score;
    this.stats.gamesPlayed++;
    this.stats.lastPlayed = new Date().toISOString();

    if (!this.stats.bestScores[gameId] || score > this.stats.bestScores[gameId]) {
      this.stats.bestScores[gameId] = score;
    }

    this._save();
  }

  addStat(key, amount = 1) {
    if (key in this.stats) {
      this.stats[key] += amount;
      this._save();
    }
  }

  getBest(gameId) {
    return this.stats.bestScores[gameId] || 0;
  }

  getAngerMessage(score) {
    if (score >= 50000) return '🔥 전설의 분노 지수 달성! 오늘 뭔 일 있었어요?';
    if (score >= 20000) return '이 정도면 대단한 분노야... 괜찮아요?';
    if (score >= 5000) return '오늘 진짜 열 받으셨구나. 수고했어요!';
    if (score >= 1000) return '꽤 쌓였네요. 잘 풀었어요!';
    return '오늘은 그나마 나은 날이었나요?';
  }
}
