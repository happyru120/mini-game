# 설계 문서: 기록 등록 & 리더보드 시스템

> **Feature**: leaderboard
> **Date**: 2026-03-27
> **Status**: Draft

---

## 1. 목표 & 비전

PRD 핵심 OKR과 직결:
- **7일 재방문율 30%** → 내 기록 경쟁 & 순위 업데이트로 재방문 동기 부여
- **카카오톡/Discord 바이럴** → 점수 공유 텍스트 + 이모지 복사 기능
- **Zero Friction** → 회원가입 없이 닉네임만으로 기록 등록

---

## 2. 아키텍처: Dual-Layer

```
┌─────────────────────────────────────────────────┐
│  Layer 2: Cloud (Optional / Pluggable)           │
│  - Supabase / bkend.ai / Firebase                │
│  - 글로벌 랭킹, 실시간 업데이트                   │
│  - 미연결 시 Layer 1으로 폴백                     │
└─────────────────────────────────────────────────┘
         ↕ BackendAdapter (interface)
┌─────────────────────────────────────────────────┐
│  Layer 1: LocalStorage (Always-On)               │
│  - 내 기록 보존 (오프라인 지원)                   │
│  - 로컬 랭킹 (같은 기기 내)                      │
│  - ScoreManager 확장                             │
└─────────────────────────────────────────────────┘
```

**Phase 1 (현재 구현)**: Layer 1만 구현 — localStorage 기반 로컬 랭킹
**Phase 2 (향후)**: BackendAdapter 구현체 교체로 클라우드 연동

---

## 3. 데이터 모델

### 3.1 LocalStorage 스키마

```js
// Key: 'rage_game_stats' (기존 ScoreManager와 공유)
{
  nickname: "김대리",          // 닉네임 (최초 1회 설정)
  totalAngerScore: 45000,
  gamesPlayed: 23,
  bestScores: {
    "dish-smash": 12500,
    "stress-ball": 8400,
    // ...
  },
  history: [                   // NEW: 게임 기록 히스토리 (최근 50개)
    {
      gameId: "dish-smash",
      score: 12500,
      timestamp: "2026-03-27T10:30:00Z",
      nickname: "김대리"
    }
  ]
}
```

### 3.2 로컬 랭킹 (LocalStorage)

```js
// Key: 'rage_leaderboard'
{
  "dish-smash": [
    { rank: 1, nickname: "김대리", score: 12500, timestamp: "..." },
    { rank: 2, nickname: "이팀장", score: 11200, timestamp: "..." },
    // 최대 50개 유지
  ]
}
```

> **Note**: Phase 1에서는 같은 기기에서 여러 닉네임이 기록될 수 있음 (실제 사용에서는 자기 기록이 대부분)

### 3.3 Cloud 스키마 (Phase 2 설계)

```sql
-- Supabase / bkend.ai 테이블
CREATE TABLE leaderboard (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     TEXT NOT NULL,           -- 'dish-smash'
  nickname    TEXT NOT NULL,           -- '김대리'
  score       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- 닉네임별 best score만 유지 (UPSERT 전략)
  UNIQUE (game_id, nickname)           -- 닉네임 당 게임별 최고점만 보관
);

CREATE INDEX idx_leaderboard_game_score ON leaderboard (game_id, score DESC);
```

---

## 4. UI/UX 플로우

### 4.1 기록 등록 플로우

```
게임 종료
    │
    ▼
[게임 결과 카드]
  - 점수: 12,500
  - 최고 기록 갱신 여부
  - [기록 등록] [랭킹 보기] [다시 하기] [허브로]
    │
    ▼ (기록 등록 클릭)
[닉네임 확인]
  ┌─────────────────────────────────┐
  │ 닉네임이 설정되지 않은 경우:     │
  │ → 닉네임 입력 모달 표시          │
  │ 이미 설정된 경우:                │
  │ → 즉시 기록 등록 처리            │
  └─────────────────────────────────┘
    │
    ▼
[기록 등록 완료]
  - "🎉 내 순위: 3위" 토스트 메시지
  - 공유 버튼 활성화
```

### 4.2 닉네임 모달

```
┌────────────────────────────────────┐
│  🎮 닉네임을 정해줘!                │
│                                    │
│  [________________]  최대 10자     │
│  예: 열받은직장인, 분노의김대리      │
│                                    │
│  [설정하기]                         │
│                                    │
│  * 회원가입 불필요, 이 기기에 저장  │
└────────────────────────────────────┘
```

### 4.3 리더보드 모달

```
┌────────────────────────────────────┐
│  🏆 접시 날려라 — 랭킹              │
│  ─────────────────────────────     │
│  1위  🥇  김대리        12,500     │
│  2위  🥈  화가난곰      11,200     │
│  3위  🥉  분노의이부장  10,800     │
│  4위      직장탈출꿈    9,500      │
│  ─────────────────────────────     │
│  내 최고 기록: 12,500 (1위!)        │
│                                    │
│  [공유하기] [닫기]                  │
└────────────────────────────────────┘
```

### 4.4 공유 텍스트 템플릿

```
🔥 미니게임 컬렉션
🍽️ 접시 날려라 — 12,500점
🏆 랭킹 3위 달성!
나도 해봐 → [URL]
```

---

## 5. 컴포넌트 설계

### 5.1 RecordSystem (shared/ui/RecordSystem.js)

```js
class RecordSystem {
  // 닉네임 관리
  getNickname()
  setNickname(name)
  hasNickname()

  // 기록 저장
  submitScore(gameId, score)  // → 로컬 저장 + 선택적 클라우드 push

  // 랭킹 조회
  getLeaderboard(gameId, limit = 10)  // → [{rank, nickname, score}]
  getMyRank(gameId)

  // UI 트리거
  showNicknameModal()
  showLeaderboard(gameId)
  showSubmitFlow(gameId, score)  // 전체 플로우 (닉네임 체크 → 등록 → 결과)

  // 공유
  copyShareText(gameId, score)
}
```

### 5.2 BackendAdapter (interface, Phase 2)

```js
// 구현체를 교체하여 클라우드 연동
class LocalBackendAdapter {
  async push(gameId, nickname, score) { /* localStorage */ }
  async fetchTop(gameId, limit) { /* localStorage read */ }
}

class SupabaseBackendAdapter {
  async push(gameId, nickname, score) { /* Supabase upsert */ }
  async fetchTop(gameId, limit) { /* Supabase select */ }
}
```

---

## 6. 각 게임 연동 방법

각 게임의 `endGame()` 함수에 아래 코드 추가:

```js
import { recordSystem } from '../../shared/ui/RecordSystem.js';

function endGame(finalScore) {
  // 기존 게임 종료 로직 ...

  // 기록 시스템 연동
  recordSystem.showSubmitFlow('dish-smash', finalScore);
}
```

---

## 7. Phase 별 구현 계획

### Phase 1 (현재) — localStorage 기반

| 항목 | 내용 |
|------|------|
| 닉네임 | localStorage 저장, 최초 1회 입력 |
| 기록 저장 | localStorage (ScoreManager 확장) |
| 랭킹 | 로컬 기기 내 멀티 닉네임 지원 |
| 공유 | 텍스트 클립보드 복사 |

### Phase 2 (향후) — 클라우드 연동

| 항목 | 내용 |
|------|------|
| 백엔드 | Supabase Free Tier (or bkend.ai) |
| 랭킹 | 글로벌 실시간 랭킹 |
| 닉네임 중복 | 닉네임 + 기기 fingerprint로 소유권 |
| 공유 URL | 점수 링크 생성 (동적 OG 이미지) |

---

## 8. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 응답성 | 기록 등록 UI 렌더링 < 100ms |
| 오프라인 | localStorage만으로 완전 동작 |
| 접근성 | 모바일 터치 우선, 키보드 지원 |
| 닉네임 | 최대 10자, 특수문자 일부 허용 (이모지 포함) |
| 랭킹 보존 | 로컬: 게임별 최대 50개, 히스토리 최대 50개 |
