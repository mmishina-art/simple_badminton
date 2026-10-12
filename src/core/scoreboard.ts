// 得点板のルール。既存のアプリ(v2.5)の動きを、純粋な関数にして移したもの。
// どの関数も、受け取った状態を書き換えず、新しい状態を返す。
import type { Round, Winner } from './types';

export type Team = 'A' | 'B';
export type TargetScore = 11 | 15 | 21;
export const TARGET_SCORES: TargetScore[] = [11, 15, 21];

export interface ImportedMatch {
  roundNumber: number;
  courtNumber: number;
  /** チーム1(試合タブの上のペア)が、いま得点板のどちら側にいるか */
  team1Side: Team;
  team2Side: Team;
  reflected: boolean;
  reflectedWinner?: Winner;
}

export interface ScoreHistoryEntry {
  scoreA: number;
  scoreB: number;
  server: Team;
}

export interface ScoreboardState {
  scoreA: number;
  scoreB: number;
  nameA: string;
  nameB: string;
  server: Team;
  /** 目標点数（既定: 15点先取） */
  targetScore: TargetScore;
  /** デュース（2点差・上限あり）。既定: なし（打ち切り） */
  deuceEnabled: boolean;
  voiceEnabled: boolean;
  /** 画面の常時点灯 */
  wakeLockEnabled: boolean;
  /** 「1手戻す」用（最大50件） */
  history: ScoreHistoryEntry[];
  importedMatch: ImportedMatch | null;
}

export const DEFAULT_NAME_A = 'チーム A';
export const DEFAULT_NAME_B = 'チーム B';
const HISTORY_LIMIT = 50;

export function initialScoreboard(): ScoreboardState {
  return {
    scoreA: 0,
    scoreB: 0,
    nameA: DEFAULT_NAME_A,
    nameB: DEFAULT_NAME_B,
    server: 'A',
    targetScore: 15,
    deuceEnabled: false,
    voiceEnabled: false,
    wakeLockEnabled: true,
    history: [],
    importedMatch: null,
  };
}

export interface GameStatus {
  isGameOver: boolean;
  winner: Team | null;
  winnerName: string | null;
  isDeuce: boolean;
  isMatchPoint: boolean;
  matchPointTeam: Team | 'BOTH' | null;
  matchPointTeamName: string | null;
}

/** デュースあり のときの、上限の点数（目標 11 → 15、15 → 20、21 → 30） */
export function maxCapOf(target: TargetScore): number {
  return target === 21 ? 30 : target === 15 ? 20 : 15;
}

const ongoing = (over: Partial<GameStatus> = {}): GameStatus => ({
  isGameOver: false,
  winner: null,
  winnerName: null,
  isDeuce: false,
  isMatchPoint: false,
  matchPointTeam: null,
  matchPointTeamName: null,
  ...over,
});

/** いまの点数から、決着・デュース・マッチポイントを判定する */
export function gameStatus(s: ScoreboardState): GameStatus {
  const target = s.targetScore;
  const { scoreA, scoreB } = s;
  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);
  const lead = Math.abs(scoreA - scoreB);
  const leader: Team = scoreA > scoreB ? 'A' : 'B';
  const leaderName = scoreA > scoreB ? s.nameA : s.nameB;

  if (!s.deuceEnabled) {
    // デュースなし（打ち切り）
    if (maxScore >= target) return ongoing({ isGameOver: true, winner: leader, winnerName: leaderName });
    if (maxScore === target - 1) {
      return scoreA === scoreB
        ? ongoing({ isMatchPoint: true, matchPointTeam: 'BOTH', matchPointTeamName: '両チーム（次の得点で決着！）' })
        : ongoing({ isMatchPoint: true, matchPointTeam: leader, matchPointTeamName: leaderName });
    }
    return ongoing();
  }

  // デュースあり
  const maxCap = maxCapOf(target);
  if ((maxScore >= target && lead >= 2) || maxScore >= maxCap) {
    return ongoing({ isGameOver: true, winner: leader, winnerName: leaderName });
  }
  const isDeuce = maxScore >= target - 1 && minScore >= target - 1;
  const mp = { isMatchPoint: true, matchPointTeam: leader, matchPointTeamName: leaderName };
  if (!isDeuce && maxScore === target - 1) return ongoing(mp);
  if (isDeuce && lead === 1) return ongoing({ isDeuce, ...mp });
  if (maxScore === maxCap - 1) return ongoing({ isDeuce, ...mp });
  return ongoing({ isDeuce });
}

const snapshot = (s: ScoreboardState): ScoreHistoryEntry => ({ scoreA: s.scoreA, scoreB: s.scoreB, server: s.server });
const pushHistory = (s: ScoreboardState): ScoreHistoryEntry[] => [...s.history, snapshot(s)].slice(-HISTORY_LIMIT);

/** 1点を加える。得点したチームにサーブ権が移る。決着ずみなら、何もしない（blocked: true）。 */
export function addScore(s: ScoreboardState, team: Team): { state: ScoreboardState; blocked: boolean } {
  if (gameStatus(s).isGameOver) return { state: s, blocked: true };
  return {
    state: {
      ...s,
      history: pushHistory(s),
      scoreA: team === 'A' ? s.scoreA + 1 : s.scoreA,
      scoreB: team === 'B' ? s.scoreB + 1 : s.scoreB,
      server: team,
    },
    blocked: false,
  };
}

/** 1点減らす（0 点のときは、何もしない） */
export function decrementScore(s: ScoreboardState, team: Team): ScoreboardState {
  if (team === 'A' && s.scoreA > 0) return { ...s, history: [...s.history, snapshot(s)], scoreA: s.scoreA - 1 };
  if (team === 'B' && s.scoreB > 0) return { ...s, history: [...s.history, snapshot(s)], scoreB: s.scoreB - 1 };
  return s;
}

/** 直前の操作（得点・マイナス）を取り消す */
export function undoScore(s: ScoreboardState): ScoreboardState {
  if (s.history.length === 0) return s;
  const last = s.history[s.history.length - 1];
  return { ...s, history: s.history.slice(0, -1), scoreA: last.scoreA, scoreB: last.scoreB, server: last.server };
}

/** チェンジエンド: 左右の得点・名前・サーブ権を入れ替える */
export function changeEnds(s: ScoreboardState): ScoreboardState {
  return {
    ...s,
    scoreA: s.scoreB,
    scoreB: s.scoreA,
    nameA: s.nameB,
    nameB: s.nameA,
    server: s.server === 'A' ? 'B' : 'A',
    importedMatch: s.importedMatch
      ? { ...s.importedMatch, team1Side: s.importedMatch.team2Side, team2Side: s.importedMatch.team1Side }
      : null,
  };
}

/** 得点を 0 - 0 に戻す（名前・目標点数などの設定は残す） */
export function resetScore(s: ScoreboardState): ScoreboardState {
  return {
    ...s,
    scoreA: 0,
    scoreB: 0,
    server: 'A',
    history: [],
    importedMatch: s.importedMatch ? { ...s.importedMatch, reflected: false, reflectedWinner: undefined } : null,
  };
}

export const setServer = (s: ScoreboardState, team: Team): ScoreboardState => ({ ...s, server: team });
export const setTarget = (s: ScoreboardState, target: TargetScore): ScoreboardState => ({ ...s, targetScore: target });
export const setDeuce = (s: ScoreboardState, enabled: boolean): ScoreboardState => ({ ...s, deuceEnabled: enabled });
export const toggleVoice = (s: ScoreboardState): ScoreboardState => ({ ...s, voiceEnabled: !s.voiceEnabled });
export const toggleWakeLock = (s: ScoreboardState): ScoreboardState => ({ ...s, wakeLockEnabled: !s.wakeLockEnabled });
export const renameTeam = (s: ScoreboardState, team: Team, name: string): ScoreboardState => {
  const trimmed = name.trim();
  if (!trimmed) return s;
  return team === 'A' ? { ...s, nameA: trimmed } : { ...s, nameB: trimmed };
};

/** 進行中の試合のコートの選手を、得点板に読み込む（連動モード）。見つからなければ null。 */
export function importMatch(s: ScoreboardState, round: Round | null, courtNumber: number, nameOf: (id: string) => string): ScoreboardState | null {
  const match = round?.matches.find((m) => m.courtNumber === courtNumber);
  if (!round || !match) return null;
  return {
    ...s,
    nameA: match.team1.map(nameOf).join('・') || DEFAULT_NAME_A,
    nameB: match.team2.map(nameOf).join('・') || DEFAULT_NAME_B,
    scoreA: 0,
    scoreB: 0,
    server: 'A',
    history: [],
    importedMatch: { roundNumber: round.roundNumber, courtNumber, team1Side: 'A', team2Side: 'B', reflected: false },
  };
}

export type ReflectError = 'not-imported' | 'no-round' | 'round-changed' | 'no-court' | 'not-finished';

/** 決着した結果を、試合タブの勝敗に反映するための、勝者（team1 / team2）を求める。反映できないときは理由を返す。 */
export function resolveReflectWinner(s: ScoreboardState, round: Round | null): { winner: 'team1' | 'team2' } | { error: ReflectError } {
  const imported = s.importedMatch;
  if (!imported) return { error: 'not-imported' };
  if (!round) return { error: 'no-round' };
  if (round.roundNumber !== imported.roundNumber) return { error: 'round-changed' };
  if (!round.matches.some((m) => m.courtNumber === imported.courtNumber)) return { error: 'no-court' };
  const status = gameStatus(s);
  if (!status.isGameOver || !status.winner) return { error: 'not-finished' };
  return { winner: status.winner === imported.team1Side ? 'team1' : 'team2' };
}

/** 反映したことを、得点板の状態に記録する */
export function markReflected(s: ScoreboardState, winner: 'team1' | 'team2'): ScoreboardState {
  return s.importedMatch ? { ...s, importedMatch: { ...s.importedMatch, reflected: true, reflectedWinner: winner } } : s;
}
