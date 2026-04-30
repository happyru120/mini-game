/**
 * RecordSystem — 기록 등록 & 리더보드 시스템
 * Phase 1: localStorage 기반 (오프라인 완전 동작)
 * Phase 2: BackendAdapter 교체로 클라우드 연동 가능
 */

const STORAGE_KEY = 'rage_game_stats';
const LEADERBOARD_KEY = 'rage_leaderboard';
const MAX_LEADERBOARD = 50;
const MAX_HISTORY = 50;

const GAME_NAMES = {
  'dish-smash': '접시 날려라',
  'stress-ball': '스트레스볼 연타',
  'rage-type': '분노의 타이핑',
  'bubble-wrap': '버블랩 터뜨리기',
  'paper-rip': '종이 찢기',
  'boss-throw': '상사한테 던지기',
  'clock-out-stamp': '퇴근 도장 난사',
  'notification-vacuum': '알림 청소기',
  'tetris': '테트리스',
  'snake': '스네이크',
  'space-shooter': '스페이스 슈터',
  'memory-match': '카드 뒤집기',
  'rps-plus': '가위바위보+',
  'lucky-roulette': '행운의 룰렛',
  'tower-defense': '타워 디펜스',
  'resource-tycoon': '자원 관리자',
};

const GAME_EMOJIS = {
  'dish-smash': '🍽️', 'stress-ball': '🔴', 'rage-type': '⌨️',
  'bubble-wrap': '🫧', 'paper-rip': '📄', 'boss-throw': '🎯',
  'clock-out-stamp': '🟥',
  'notification-vacuum': '🧹',
  'tetris': '🧱', 'snake': '🐍', 'space-shooter': '🚀',
  'memory-match': '🃏', 'rps-plus': '✊', 'lucky-roulette': '🎰',
  'tower-defense': '🏰', 'resource-tycoon': '🏘️',
};

class RecordSystem {
  constructor() {
    this._modal = null;
    this._toast = null;
    this._injectStyles();
    this._injectHTML();
  }

  // ─── Nickname ─────────────────────────────────────

  getNickname() {
    return this._loadStats().nickname || null;
  }

  setNickname(name) {
    const stats = this._loadStats();
    stats.nickname = name.trim().slice(0, 10);
    this._saveStats(stats);
  }

  hasNickname() {
    return !!this.getNickname();
  }

  // ─── Score Submission ──────────────────────────────

  submitScore(gameId, score) {
    const nickname = this.getNickname();
    if (!nickname) return null;

    const stats = this._loadStats();
    const isNewBest = !stats.bestScores[gameId] || score > stats.bestScores[gameId];
    if (isNewBest) stats.bestScores[gameId] = score;

    // 히스토리 추가
    if (!stats.history) stats.history = [];
    stats.history.unshift({ gameId, score, nickname, timestamp: new Date().toISOString() });
    if (stats.history.length > MAX_HISTORY) stats.history = stats.history.slice(0, MAX_HISTORY);

    this._saveStats(stats);

    // 리더보드 업데이트
    const lb = this._loadLeaderboard();
    if (!lb[gameId]) lb[gameId] = [];

    // 닉네임 기존 기록 찾기
    const existing = lb[gameId].findIndex(e => e.nickname === nickname);
    if (existing >= 0) {
      if (score > lb[gameId][existing].score) {
        lb[gameId][existing] = { nickname, score, timestamp: new Date().toISOString() };
      }
    } else {
      lb[gameId].push({ nickname, score, timestamp: new Date().toISOString() });
    }

    // 정렬 & 상위 MAX_LEADERBOARD 유지
    lb[gameId].sort((a, b) => b.score - a.score);
    lb[gameId] = lb[gameId].slice(0, MAX_LEADERBOARD);
    this._saveLeaderboard(lb);

    const rank = lb[gameId].findIndex(e => e.nickname === nickname) + 1;
    return { rank, isNewBest, total: lb[gameId].length };
  }

  getLeaderboard(gameId, limit = 10) {
    const lb = this._loadLeaderboard();
    return (lb[gameId] || []).slice(0, limit).map((e, i) => ({
      rank: i + 1,
      nickname: e.nickname,
      score: e.score,
      timestamp: e.timestamp,
    }));
  }

  getMyRank(gameId) {
    const nickname = this.getNickname();
    if (!nickname) return null;
    const lb = this._loadLeaderboard();
    const idx = (lb[gameId] || []).findIndex(e => e.nickname === nickname);
    return idx >= 0 ? idx + 1 : null;
  }

  // ─── UI: Full Submit Flow ──────────────────────────

  showSubmitFlow(gameId, score) {
    if (!this.hasNickname()) {
      this.showNicknameModal(() => {
        const result = this.submitScore(gameId, score);
        this._showSubmitResult(gameId, score, result);
      });
    } else {
      const result = this.submitScore(gameId, score);
      this._showSubmitResult(gameId, score, result);
    }
  }

  _showSubmitResult(gameId, score, result) {
    if (!result) return;
    const { rank, isNewBest, total } = result;
    this._showRankReveal(gameId, score, rank, isNewBest, total);
  }

  _showRankReveal(gameId, score, rank, isNewBest, total) {
    const modal = document.getElementById('rs-rank-modal');
    const medalEl = document.getElementById('rs-rank-medal');
    const rankEl = document.getElementById('rs-rank-number');
    const totalEl = document.getElementById('rs-rank-total');
    const scoreEl = document.getElementById('rs-rank-score');
    const newBestEl = document.getElementById('rs-rank-newbest');
    const viewBtn = document.getElementById('rs-rank-view-lb');

    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank <= 10 ? '🏅' : '📊';
    medalEl.textContent = medal;
    rankEl.textContent = `${rank}위`;
    totalEl.textContent = `/ ${total}명 중`;
    scoreEl.textContent = `${score.toLocaleString()}점`;
    newBestEl.style.display = isNewBest ? 'block' : 'none';

    viewBtn.onclick = () => {
      modal.classList.remove('rs-visible');
      setTimeout(() => this.showLeaderboard(gameId), 150);
    };
    document.getElementById('rs-rank-close-btn').onclick = () => {
      modal.classList.remove('rs-visible');
    };
    document.getElementById('rs-rank-close').onclick = () => {
      modal.classList.remove('rs-visible');
    };

    modal.classList.add('rs-visible');
  }

  // ─── UI: Nickname Modal ────────────────────────────

  showNicknameModal(onComplete) {
    const modal = document.getElementById('rs-nickname-modal');
    const input = document.getElementById('rs-nickname-input');
    const btn = document.getElementById('rs-nickname-btn');
    const error = document.getElementById('rs-nickname-error');

    if (this.getNickname()) input.value = this.getNickname();
    error.textContent = '';
    modal.classList.add('rs-visible');
    setTimeout(() => input.focus(), 100);

    const submit = () => {
      const val = input.value.trim();
      if (!val) { error.textContent = '닉네임을 입력해주세요!'; return; }
      if (val.length > 10) { error.textContent = '최대 10자까지 가능해요'; return; }
      this.setNickname(val);
      modal.classList.remove('rs-visible');
      this._showToast(`✅ 닉네임 설정: ${val}`, 'success');
      if (onComplete) onComplete();
    };

    btn.onclick = submit;
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };

    const close = document.getElementById('rs-nickname-close');
    close.onclick = () => {
      modal.classList.remove('rs-visible');
      if (onComplete) onComplete(); // 취소해도 플로우 계속
    };
  }

  // ─── UI: Leaderboard Modal ─────────────────────────

  showLeaderboard(gameId) {
    const modal = document.getElementById('rs-lb-modal');
    const title = document.getElementById('rs-lb-title');
    const list = document.getElementById('rs-lb-list');
    const myRankEl = document.getElementById('rs-lb-myrank');

    const entries = this.getLeaderboard(gameId, 10);
    const gameName = GAME_NAMES[gameId] || gameId;
    const gameEmoji = GAME_EMOJIS[gameId] || '🎮';
    const myRank = this.getMyRank(gameId);
    const myNickname = this.getNickname();

    title.textContent = `${gameEmoji} ${gameName} — 랭킹`;

    if (entries.length === 0) {
      list.innerHTML = '<div class="rs-lb-empty">아직 기록이 없어요. 첫 번째 도전자가 되어봐요!</div>';
    } else {
      list.innerHTML = entries.map(e => {
        const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `${e.rank}위`;
        const isMe = e.nickname === myNickname;
        return `
          <div class="rs-lb-row ${isMe ? 'rs-lb-me' : ''}">
            <span class="rs-lb-rank">${medal}</span>
            <span class="rs-lb-name">${e.nickname}${isMe ? ' ★' : ''}</span>
            <span class="rs-lb-score">${e.score.toLocaleString()}</span>
          </div>
        `;
      }).join('');
    }

    if (myRank) {
      const best = this._loadStats().bestScores?.[gameId] || 0;
      myRankEl.textContent = `내 최고 기록: ${best.toLocaleString()} (${myRank}위)`;
      myRankEl.style.display = 'block';
    } else {
      myRankEl.style.display = 'none';
    }

    // 공유 버튼
    document.getElementById('rs-lb-share').onclick = () => {
      const best = this._loadStats().bestScores?.[gameId] || 0;
      this.copyShareText(gameId, best);
    };

    document.getElementById('rs-lb-close').onclick = () => {
      modal.classList.remove('rs-visible');
    };

    modal.classList.add('rs-visible');
  }

  // ─── Share ─────────────────────────────────────────

  copyShareText(gameId, score) {
    const gameName = GAME_NAMES[gameId] || gameId;
    const gameEmoji = GAME_EMOJIS[gameId] || '🎮';
    const rank = this.getMyRank(gameId);
    const rankText = rank ? `🏆 랭킹 ${rank}위 달성!` : '';
    const text = `🔥 미니게임 컬렉션\n${gameEmoji} ${gameName} — ${score.toLocaleString()}점\n${rankText}\n나도 해봐 → ${location.origin}`;
    navigator.clipboard.writeText(text)
      .then(() => this._showToast('📋 클립보드에 복사됐어요!', 'success'))
      .catch(() => this._showToast('복사 실패. 직접 선택해서 복사해주세요.', 'error'));
  }

  // ─── Toast ─────────────────────────────────────────

  _showToast(msg, type = 'info') {
    const toast = document.getElementById('rs-toast');
    toast.textContent = msg;
    toast.className = `rs-toast rs-toast-${type} rs-toast-show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.className = 'rs-toast';
    }, 2800);
  }

  // ─── Storage ───────────────────────────────────────

  _loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  }

  _saveStats(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  _loadLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '{}');
    } catch { return {}; }
  }

  _saveLeaderboard(data) {
    try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data)); } catch {}
  }

  // ─── DOM Injection ─────────────────────────────────

  _injectHTML() {
    if (document.getElementById('rs-root')) return;
    const root = document.createElement('div');
    root.id = 'rs-root';
    root.innerHTML = `
      <!-- Nickname Modal -->
      <div class="rs-overlay" id="rs-nickname-modal">
        <div class="rs-modal">
          <button class="rs-modal-close" id="rs-nickname-close">✕</button>
          <div class="rs-modal-emoji">🎮</div>
          <h2 class="rs-modal-title">닉네임을 정해줘!</h2>
          <p class="rs-modal-desc">회원가입 없이, 이 기기에 저장돼요</p>
          <input
            class="rs-input"
            id="rs-nickname-input"
            type="text"
            placeholder="예: 열받은직장인 🔥"
            maxlength="10"
          />
          <p class="rs-input-hint">최대 10자 (이모지 포함 가능)</p>
          <p class="rs-error" id="rs-nickname-error"></p>
          <button class="rs-btn-primary" id="rs-nickname-btn">설정하기</button>
        </div>
      </div>

      <!-- Rank Reveal Modal -->
      <div class="rs-overlay" id="rs-rank-modal">
        <div class="rs-modal rs-rank-card">
          <button class="rs-modal-close" id="rs-rank-close">✕</button>
          <div class="rs-rank-newbest" id="rs-rank-newbest">🔥 신기록!</div>
          <div class="rs-rank-medal" id="rs-rank-medal">🏅</div>
          <div class="rs-rank-number" id="rs-rank-number">1위</div>
          <div class="rs-rank-total" id="rs-rank-total">/ 1명 중</div>
          <div class="rs-rank-score" id="rs-rank-score">0점</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:24px">
            <button class="rs-btn-primary" id="rs-rank-view-lb">🏆 랭킹 보기</button>
            <button class="rs-btn-ghost" id="rs-rank-close-btn">닫기</button>
          </div>
        </div>
      </div>

      <!-- Leaderboard Modal -->
      <div class="rs-overlay" id="rs-lb-modal">
        <div class="rs-modal rs-modal-lb">
          <button class="rs-modal-close" id="rs-lb-close">✕</button>
          <h2 class="rs-modal-title" id="rs-lb-title">🏆 랭킹</h2>
          <div class="rs-lb-list" id="rs-lb-list"></div>
          <p class="rs-lb-myrank" id="rs-lb-myrank" style="display:none"></p>
          <div class="rs-modal-actions">
            <button class="rs-btn-secondary" id="rs-lb-share">📤 공유하기</button>
            <button class="rs-btn-ghost" id="rs-lb-close2" onclick="document.getElementById('rs-lb-modal').classList.remove('rs-visible')">닫기</button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div class="rs-toast" id="rs-toast"></div>
    `;
    document.body.appendChild(root);
  }

  _injectStyles() {
    if (document.getElementById('rs-styles')) return;
    const style = document.createElement('style');
    style.id = 'rs-styles';
    style.textContent = `
      /* RecordSystem Styles */
      .rs-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        z-index: 9000;
        align-items: center;
        justify-content: center;
        padding: 20px;
        backdrop-filter: blur(4px);
      }
      .rs-overlay.rs-visible {
        display: flex;
        animation: rsFadeIn 0.2s ease-out;
      }
      @keyframes rsFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .rs-modal {
        background: #16213E;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 32px 28px;
        width: 100%;
        max-width: 380px;
        position: relative;
        text-align: center;
        animation: rsSlideUp 0.25s ease-out;
        font-family: 'Noto Sans KR', -apple-system, sans-serif;
        color: #fff;
      }
      .rs-modal-lb {
        max-width: 420px;
      }
      @keyframes rsSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .rs-modal-close {
        position: absolute;
        top: 14px;
        right: 16px;
        background: none;
        border: none;
        color: #A0A0B0;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 8px;
        transition: color 0.15s;
      }
      .rs-modal-close:hover { color: #fff; }
      .rs-modal-emoji {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .rs-modal-title {
        font-size: 22px;
        font-weight: 900;
        margin-bottom: 8px;
      }
      .rs-modal-desc {
        font-size: 13px;
        color: #A0A0B0;
        margin-bottom: 20px;
      }
      .rs-input {
        width: 100%;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.07);
        border: 2px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        color: #fff;
        font-family: inherit;
        font-size: 16px;
        font-weight: 700;
        text-align: center;
        outline: none;
        transition: border-color 0.2s;
        margin-bottom: 6px;
      }
      .rs-input:focus {
        border-color: #FF3B3B;
      }
      .rs-input::placeholder { color: #606070; }
      .rs-input-hint {
        font-size: 12px;
        color: #A0A0B0;
        margin-bottom: 8px;
      }
      .rs-error {
        font-size: 13px;
        color: #FF3B3B;
        min-height: 20px;
        margin-bottom: 12px;
      }
      .rs-btn-primary {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #FF3B3B, #FF8C00);
        border: none;
        border-radius: 12px;
        color: #fff;
        font-family: inherit;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .rs-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 59, 59, 0.4);
      }
      .rs-btn-primary:active { transform: scale(0.97); }

      /* Rank Reveal Card */
      .rs-rank-card {
        max-width: 320px;
        padding: 36px 28px 28px;
      }
      .rs-rank-newbest {
        background: linear-gradient(135deg, #FF3B3B, #FF8C00);
        color: #fff;
        font-size: 13px;
        font-weight: 900;
        padding: 4px 14px;
        border-radius: 100px;
        display: inline-block;
        margin-bottom: 16px;
        letter-spacing: 0.5px;
        animation: rsPulse 0.6s ease-out;
      }
      @keyframes rsPulse {
        0% { transform: scale(0.8); opacity: 0; }
        60% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      .rs-rank-medal {
        font-size: 72px;
        line-height: 1;
        margin-bottom: 8px;
        animation: rsBounce 0.5s ease-out 0.1s both;
      }
      @keyframes rsBounce {
        0% { transform: scale(0) rotate(-15deg); opacity: 0; }
        70% { transform: scale(1.15) rotate(5deg); }
        100% { transform: scale(1) rotate(0); opacity: 1; }
      }
      .rs-rank-number {
        font-size: 48px;
        font-weight: 900;
        color: #FFD700;
        line-height: 1;
        margin-bottom: 4px;
        animation: rsSlideUp 0.3s ease-out 0.2s both;
      }
      .rs-rank-total {
        font-size: 15px;
        color: #A0A0B0;
        margin-bottom: 16px;
      }
      .rs-rank-score {
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        background: rgba(255, 255, 255, 0.07);
        border-radius: 12px;
        padding: 10px 20px;
      }

      /* Leaderboard */
      .rs-lb-list {
        margin: 16px 0;
        max-height: 320px;
        overflow-y: auto;
      }
      .rs-lb-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        margin-bottom: 6px;
        background: rgba(255, 255, 255, 0.04);
        transition: background 0.15s;
      }
      .rs-lb-row.rs-lb-me {
        background: rgba(255, 59, 59, 0.15);
        border: 1px solid rgba(255, 59, 59, 0.3);
      }
      .rs-lb-rank {
        font-size: 20px;
        min-width: 40px;
        text-align: center;
      }
      .rs-lb-name {
        flex: 1;
        font-weight: 700;
        text-align: left;
        font-size: 15px;
      }
      .rs-lb-score {
        font-size: 16px;
        font-weight: 900;
        color: #FFD700;
      }
      .rs-lb-empty {
        padding: 32px 0;
        color: #A0A0B0;
        font-size: 14px;
      }
      .rs-lb-myrank {
        font-size: 14px;
        color: #FF8C00;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .rs-modal-actions {
        display: flex;
        gap: 10px;
      }
      .rs-btn-secondary {
        flex: 1;
        padding: 12px;
        background: rgba(255, 59, 59, 0.15);
        border: 1px solid rgba(255, 59, 59, 0.4);
        border-radius: 10px;
        color: #FF3B3B;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }
      .rs-btn-secondary:hover { background: rgba(255, 59, 59, 0.25); }
      .rs-btn-ghost {
        flex: 1;
        padding: 12px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        color: #A0A0B0;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }
      .rs-btn-ghost:hover { color: #fff; border-color: rgba(255, 255, 255, 0.35); }

      /* Toast */
      .rs-toast {
        position: fixed;
        bottom: -80px;
        left: 50%;
        transform: translateX(-50%);
        background: #0F3460;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        padding: 12px 24px;
        border-radius: 100px;
        font-family: 'Noto Sans KR', sans-serif;
        font-size: 14px;
        font-weight: 700;
        z-index: 9999;
        transition: bottom 0.3s ease-out;
        white-space: nowrap;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      .rs-toast.rs-toast-show {
        bottom: 32px;
      }
      .rs-toast.rs-toast-success { border-color: rgba(0, 200, 83, 0.5); }
      .rs-toast.rs-toast-error { border-color: rgba(255, 59, 59, 0.5); }

      @media (max-width: 480px) {
        .rs-modal { padding: 24px 20px; max-width: 100%; }
        .rs-modal-emoji { font-size: 36px; }
        .rs-modal-title { font-size: 18px; }
      }
    `;
    document.head.appendChild(style);
  }
}

// 싱글톤
export const recordSystem = new RecordSystem();
