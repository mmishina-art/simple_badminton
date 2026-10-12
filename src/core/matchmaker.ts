// 組み合わせの生成。既存のアプリ(v2.5)の「実際のコード」の動きを移したもの（重みは CLAUDE.md を参照）。
// 乱数は引数で注入できる（テストでは、種を固定した乱数で、結果を再現できる）。
import type { Gender, Match, Player, Round } from './types';
import { LEVEL_POINTS } from './types';
import { type Rng, shuffleInPlace } from './rng';

export interface PlayerStats {
  id: string;
  name: string;
  playedCount: number;
  restCount: number;
  consecutiveRest: number;
  wins: number;
  losses: number;
}

export interface HistoryAnalysis {
  stats: Record<string, PlayerStats>;
  /** ペアを組んだ回数: pairCount[a][b] */
  pairCount: Record<string, Record<string, number>>;
  /** 対戦した回数: vsCount[a][b] */
  vsCount: Record<string, Record<string, number>>;
}

/** 過去の全履歴から、ペア・対戦の回数と、出場・休憩・勝敗の統計を数える */
export function analyzeHistory(players: Player[], history: Round[]): HistoryAnalysis {
  const stats: Record<string, PlayerStats> = {};
  const pairCount: Record<string, Record<string, number>> = {};
  const vsCount: Record<string, Record<string, number>> = {};

  const safePlayers = Array.isArray(players) ? players.filter((p) => p && p.id) : [];
  const safeHistory = Array.isArray(history) ? history.filter((h) => h && Array.isArray(h.matches)) : [];

  for (const p of safePlayers) {
    stats[p.id] = { id: p.id, name: p.name || '不明', playedCount: 0, restCount: 0, consecutiveRest: 0, wins: 0, losses: 0 };
    pairCount[p.id] = {};
    vsCount[p.id] = {};
    for (const p2 of safePlayers) {
      if (p2.id !== p.id) {
        pairCount[p.id][p2.id] = 0;
        vsCount[p.id][p2.id] = 0;
      }
    }
  }

  for (const round of safeHistory) {
    const playing = new Set<string>();

    for (const m of round.matches) {
      if (!m) continue;
      const team1 = Array.isArray(m.team1) ? m.team1 : [];
      const team2 = Array.isArray(m.team2) ? m.team2 : [];
      for (const id of [...team1, ...team2]) playing.add(id);

      for (const team of [team1, team2]) {
        if (team.length !== 2) continue;
        const [a, b] = team;
        if (pairCount[a]?.[b] !== undefined) pairCount[a][b]++;
        if (pairCount[b]?.[a] !== undefined) pairCount[b][a]++;
      }

      for (const t1 of team1) {
        for (const t2 of team2) {
          if (vsCount[t1]?.[t2] !== undefined) vsCount[t1][t2]++;
          if (vsCount[t2]?.[t1] !== undefined) vsCount[t2][t1]++;
        }
      }

      if (m.winner === 'team1' || m.winner === 'team2') {
        const winners = m.winner === 'team1' ? team1 : team2;
        const losers = m.winner === 'team1' ? team2 : team1;
        for (const id of winners) if (stats[id]) stats[id].wins++;
        for (const id of losers) if (stats[id]) stats[id].losses++;
      }
    }

    for (const p of safePlayers) {
      const s = stats[p.id];
      if (playing.has(p.id)) {
        s.playedCount++;
        s.consecutiveRest = 0;
      } else {
        s.restCount++;
        s.consecutiveRest++;
      }
    }
  }

  return { stats, pairCount, vsCount };
}

/** 参加人数が足りないときの例外（画面には、この message をそのまま出す） */
export class NotEnoughPlayersError extends Error {
  constructor() {
    super('人数が不足しています。コート数を減らすかメンバーを追加してください。');
    this.name = 'NotEnoughPlayersError';
  }
}

interface Candidate {
  player: Player;
  playedCount: number;
  consecutiveRest: number;
  restCount: number;
  gender: Gender;
  rand: number;
}

/**
 * 次のラウンドの出場者（コート数 × 4人）と、休憩する人を選ぶ。
 * 優先順: 出場回数が少ない人 → 連続で休んでいる人 → 総休みが多い人。同じ優先度の境界では、男女が 1:1 に近づくように選ぶ。
 */
export function selectPlayers(
  players: Player[],
  history: Round[],
  courtsCount: number,
  rng: Rng = Math.random,
): { selected: Player[]; resting: Player[] } {
  const activePlayers = players.filter((p) => p.active);
  const required = courtsCount * 4;
  if (activePlayers.length < required) throw new NotEnoughPlayersError();

  const { stats } = analyzeHistory(players, history);

  const candidates: Candidate[] = activePlayers.map((p) => {
    const s = stats[p.id] ?? { playedCount: 0, consecutiveRest: 0, restCount: 0 };
    return {
      player: p,
      playedCount: s.playedCount,
      consecutiveRest: s.consecutiveRest,
      restCount: s.restCount,
      gender: p.gender === 'female' ? 'female' : 'male',
      rand: rng(),
    };
  });

  candidates.sort((a, b) => {
    if (a.playedCount !== b.playedCount) return a.playedCount - b.playedCount;
    if (a.consecutiveRest !== b.consecutiveRest) return b.consecutiveRest - a.consecutiveRest;
    if (a.restCount !== b.restCount) return b.restCount - a.restCount;
    return a.rand - b.rand;
  });

  // 同じ優先度どうしを、グループにまとめる（並び順は保たれる）
  const groups = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const key = `${c.playedCount}_${c.consecutiveRest}_${c.restCount}`;
    const group = groups.get(key);
    if (group) group.push(c);
    else groups.set(key, [c]);
  }

  const selected: Player[] = [];
  let remaining = required;

  for (const group of groups.values()) {
    if (group.length <= remaining) {
      for (const c of group) selected.push(c.player);
      remaining -= group.length;
    } else {
      // 境界のグループ: 男女の人数が 1:1 に近づくほうを選ぶ
      let males = selected.filter((p) => p.gender !== 'female').length;
      let females = selected.filter((p) => p.gender === 'female').length;
      const targetPerGender = required / 2;

      const pool = [...group];
      let picked = 0;
      while (picked < remaining && pool.length > 0) {
        const preferGender: Gender = targetPerGender - females >= targetPerGender - males ? 'female' : 'male';
        let idx = pool.findIndex((c) => c.gender === preferGender);
        if (idx === -1) idx = 0;
        const chosen = pool.splice(idx, 1)[0];
        selected.push(chosen.player);
        picked++;
        if (chosen.gender === 'female') females++;
        else males++;
      }
      remaining = 0;
    }
    if (remaining <= 0) break;
  }

  const selectedIds = new Set(selected.map((p) => p.id));
  const resting = activePlayers.filter((p) => !selectedIds.has(p.id));
  return { selected, resting };
}

/** 1つの配置（全コート）の悪さ。小さいほどよい。 */
function evaluateArrangement(
  matches: Match[],
  pairCount: HistoryAnalysis['pairCount'],
  vsCount: HistoryAnalysis['vsCount'],
  playerMap: Record<string, Player>,
): number {
  let cost = 0;
  for (const match of matches) {
    const [t1a, t1b] = match.team1;
    const [t2a, t2b] = match.team2;

    // 1. 同じ人と、また組むことへの強いペナルティ
    const p1 = pairCount[t1a]?.[t1b] ?? 0;
    const p2 = pairCount[t2a]?.[t2b] ?? 0;
    cost += p1 * p1 * 50 + p1 * 20;
    cost += p2 * p2 * 50 + p2 * 20;

    // 2. 何度も対戦した相手との対戦へのペナルティ
    const v = [vsCount[t1a]?.[t2a], vsCount[t1a]?.[t2b], vsCount[t1b]?.[t2a], vsCount[t1b]?.[t2b]];
    cost += v.reduce<number>((sum, n) => sum + (n ?? 0), 0) * 5;

    // 3. 両チームの腕前の差（二乗）
    const skill = (a: string, b: string) => (LEVEL_POINTS[playerMap[a]?.level ?? 'intermediate'] ?? 2) + (LEVEL_POINTS[playerMap[b]?.level ?? 'intermediate'] ?? 2);
    const skillDiff = Math.abs(skill(t1a, t1b) - skill(t2a, t2b));
    cost += skillDiff * skillDiff * 15;

    // 4. 同性ペアへの軽いペナルティ（男女ペアを優先）
    const g = (id: string): Gender => playerMap[id]?.gender ?? 'male';
    if (g(t1a) === g(t1b)) cost += 15;
    if (g(t2a) === g(t2b)) cost += 15;
  }
  return cost;
}

/** 選ばれた出場者を、重複が最小になるように、各コートへ振り分ける（ランダムに試して、いちばんよい配置を採る） */
export function generateMatches(
  selectedPlayers: Player[],
  history: Round[],
  courtsCount: number,
  allPlayers: Player[],
  rng: Rng = Math.random,
): Match[] {
  const { pairCount, vsCount } = analyzeHistory(allPlayers, history);
  const playerMap: Record<string, Player> = {};
  for (const p of allPlayers ?? []) if (p?.id) playerMap[p.id] = p;

  const playerIds = selectedPlayers.map((p) => p.id);
  const iterations = courtsCount <= 2 ? 1200 : 2000;

  let best: Match[] | null = null;
  let minCost = Infinity;

  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffleInPlace([...playerIds], rng);
    const matches: Match[] = [];
    for (let c = 0; c < courtsCount; c++) {
      const base = c * 4;
      matches.push({
        courtNumber: c + 1,
        team1: [shuffled[base], shuffled[base + 1]],
        team2: [shuffled[base + 2], shuffled[base + 3]],
        score1: null,
        score2: null,
        winner: null,
        isMixed: false,
        skillDiff: 0,
        team1Skill: 0,
        team2Skill: 0,
      });
    }
    const cost = evaluateArrangement(matches, pairCount, vsCount, playerMap);
    if (cost < minCost) {
      minCost = cost;
      best = matches;
      if (cost === 0) break; // 未ペア・未対戦・ミックス・互角が見つかったら、すぐ終える
    }
  }

  const result = best ?? [];
  for (const m of result) {
    const level = (id: string) => LEVEL_POINTS[playerMap[id]?.level ?? 'intermediate'] ?? 2;
    const gender = (id: string): Gender => playerMap[id]?.gender ?? 'male';
    const s1 = level(m.team1[0]) + level(m.team1[1]);
    const s2 = level(m.team2[0]) + level(m.team2[1]);
    m.isMixed = gender(m.team1[0]) !== gender(m.team1[1]) && gender(m.team2[0]) !== gender(m.team2[1]);
    m.skillDiff = Math.abs(s1 - s2);
    m.team1Skill = s1;
    m.team2Skill = s2;
  }
  return result;
}

/** 新しいラウンド全体（出場者の選出 + 組み合わせ + 休憩者）を作る */
export function createRound(
  players: Player[],
  history: Round[],
  courtsCount: number,
  roundNumber: number,
  rng: Rng = Math.random,
  now: number = Date.now(),
): Round {
  const { selected, resting } = selectPlayers(players, history, courtsCount, rng);
  const matches = generateMatches(selected, history, courtsCount, players, rng);
  return { roundNumber, timestamp: now, matches, restingPlayerIds: resting.map((p) => p.id) };
}
