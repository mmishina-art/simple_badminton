// 勝敗の記録から、MVP と順位を計算する。既存のアプリ(v2.5)の動きを移したもの。
import { analyzeHistory } from './matchmaker';
import type { Gender, Level, Player, Round } from './types';

export const REQUIRED_DECIDED_MATCHES = 3;
export const MIN_PLAYER_DECIDED = 2;

export interface MvpCandidate {
  id: string;
  name: string;
  gender: Gender;
  level: Level;
  wins: number;
  losses: number;
  /** 勝敗が記録された試合数 */
  decidedCount: number;
  playedCount: number;
  restCount: number;
  /** 勝率(%。整数) */
  winRate: number;
  levelBonus: number;
  score: number;
  isEligible: boolean;
  reasonText?: string;
}

export interface MvpResult {
  isReady: boolean;
  totalDecided: number;
  requiredMatches: number;
  minPlayerDecided: number;
  mvp: MvpCandidate | null;
  runnerUp: MvpCandidate | null;
  third: MvpCandidate | null;
  /** 全員（スコアの高い順） */
  candidates: MvpCandidate[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function calculateMVP(players: Player[], history: Round[]): MvpResult {
  const safePlayers = Array.isArray(players) ? players.filter((p) => p && p.id) : [];
  const safeHistory = Array.isArray(history) ? history.filter((h) => h && Array.isArray(h.matches)) : [];

  let totalDecided = 0;
  for (const round of safeHistory) {
    for (const m of round.matches) if (m && (m.winner === 'team1' || m.winner === 'team2')) totalDecided++;
  }

  const { stats } = analyzeHistory(safePlayers, safeHistory);

  const candidates: MvpCandidate[] = safePlayers.map((p) => {
    const s = stats[p.id] ?? { wins: 0, losses: 0, playedCount: 0, restCount: 0 };
    const decidedCount = s.wins + s.losses;
    const winRate = decidedCount > 0 ? Math.round((s.wins / decidedCount) * 100) : 0;

    // 腕前ボーナス: 初級 +3 / 中級 +1.5 / 上級 0（1勝あたり）
    const perWin = p.level === 'beginner' ? 3 : p.level === 'intermediate' ? 1.5 : 0;
    const levelBonus = round1(perWin * s.wins);

    // MVP スコア = 勝利数 × 10 + 勝率 × 0.1 + 勝敗記録のある試合数 × 1 + 腕前ボーナス
    const score = round1(s.wins * 10 + winRate * 0.1 + decidedCount * 1 + levelBonus);
    const isEligible = totalDecided >= REQUIRED_DECIDED_MATCHES && decidedCount >= MIN_PLAYER_DECIDED && s.wins > 0;

    return {
      id: p.id,
      name: p.name,
      gender: p.gender || 'male',
      level: p.level || 'intermediate',
      wins: s.wins,
      losses: s.losses,
      decidedCount,
      playedCount: s.playedCount,
      restCount: s.restCount,
      winRate,
      levelBonus,
      score,
      isEligible,
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.levelBonus !== a.levelBonus) return b.levelBonus - a.levelBonus;
    return b.decidedCount - a.decidedCount;
  });

  const isReady = totalDecided >= REQUIRED_DECIDED_MATCHES;
  const eligible = candidates.filter((c) => c.isEligible);
  const mvp = isReady && eligible.length > 0 ? eligible[0] : null;
  const runnerUp = isReady && eligible.length > 1 ? eligible[1] : null;
  const third = isReady && eligible.length > 2 ? eligible[2] : null;

  if (mvp) {
    if (mvp.level === 'beginner' && mvp.wins >= 2) mvp.reasonText = '🌱 初級から大金星連発！本日のジャイアントキリングMVP！';
    else if (mvp.winRate === 100) mvp.reasonText = '🔥 無敗の勝率100%達成！圧倒的な勝負強さで文句なしのMVP！';
    else if (mvp.wins >= 3) mvp.reasonText = '🏆 最多勝利＆高勝率！チームを勝利に導き続けた本日のMVP！';
    else mvp.reasonText = '🌟 素晴らしい試合運びと安定した実力で本日のMVPを獲得！';
  }

  return {
    isReady,
    totalDecided,
    requiredMatches: REQUIRED_DECIDED_MATCHES,
    minPlayerDecided: MIN_PLAYER_DECIDED,
    mvp,
    runnerUp,
    third,
    candidates,
  };
}
