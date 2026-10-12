import { describe, expect, it } from 'vitest';
import { NotEnoughPlayersError, analyzeHistory, createRound, generateMatches, selectPlayers } from '../../src/core/matchmaker';
import { parseMembers, SAMPLE_MEMBERS_TEXT, createPlayers } from '../../src/core/players';
import { seededRng } from '../../src/core/rng';
import type { Player, Round } from '../../src/core/types';
import { match, player, round } from './helpers';

const samplePlayers = (): Player[] => createPlayers(parseMembers(SAMPLE_MEMBERS_TEXT), 0, seededRng(1));

describe('analyzeHistory(履歴の集計)', () => {
  const players = ['a', 'b', 'c', 'd', 'e'].map((id) => player(id));
  const history: Round[] = [
    round(1, [match(1, ['a', 'b'], ['c', 'd'], 'team1')], ['e']),
    round(2, [match(1, ['a', 'c'], ['b', 'e'], 'team2')], ['d']),
  ];
  const { stats, pairCount, vsCount } = analyzeHistory(players, history);

  it('出場・休憩・連続休みを数える', () => {
    expect(stats.a).toMatchObject({ playedCount: 2, restCount: 0, consecutiveRest: 0 });
    expect(stats.e).toMatchObject({ playedCount: 1, restCount: 1, consecutiveRest: 0 }); // 2回戦で出場して、連続休みが戻る
    expect(stats.d).toMatchObject({ playedCount: 1, restCount: 1, consecutiveRest: 1 });
  });

  it('勝敗を数える(勝敗なしの試合は数えない)', () => {
    expect(stats.a).toMatchObject({ wins: 1, losses: 1 });
    expect(stats.c).toMatchObject({ wins: 0, losses: 2 }); // 1戦目は負け、2戦目は a とペアで負け
    expect(stats.b).toMatchObject({ wins: 2, losses: 0 });
  });

  it('ペアと対戦の回数を、両方向に数える', () => {
    expect(pairCount.a.b).toBe(1);
    expect(pairCount.b.a).toBe(1);
    expect(pairCount.a.d).toBe(0);
    expect(vsCount.a.c).toBe(1);
    expect(vsCount.c.a).toBe(1);
    expect(vsCount.a.d).toBe(1);
  });

  it('壊れた履歴が混ざっていても、落ちない', () => {
    expect(() => analyzeHistory(players, [null, { matches: null }] as unknown as Round[])).not.toThrow();
  });
});

describe('selectPlayers(出場者の選出)', () => {
  it('参加人数が足りないとき、人数不足のエラーになる', () => {
    const players = ['a', 'b', 'c'].map((id) => player(id));
    expect(() => selectPlayers(players, [], 1, seededRng(1))).toThrow(NotEnoughPlayersError);
    expect(() => selectPlayers(players, [], 1, seededRng(1))).toThrow('人数が不足しています');
  });

  it('お休み中(active = false)の人は、選ばれない', () => {
    const players = ['a', 'b', 'c', 'd', 'e'].map((id, i) => player(id, 'male', 'intermediate', i !== 4));
    const { selected, resting } = selectPlayers(players, [], 1, seededRng(1));
    expect(selected.map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(resting).toEqual([]);
  });

  it('出場回数が少ない人を、優先する', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => player(id));
    const history = [round(1, [match(1, ['a', 'b'], ['c', 'd'])], ['e', 'f'])];
    const { selected } = selectPlayers(players, history, 1, seededRng(3));
    // e, f は出場 0 回なので、必ず入る
    expect(selected.map((p) => p.id)).toEqual(expect.arrayContaining(['e', 'f']));
    expect(selected).toHaveLength(4);
  });

  it('出場回数が同じなら、連続で休んでいる人を優先する', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => player(id));
    // 1回戦: e, f, g が休み → 2回戦: a,b,c,d のうち... 全員 出場 1回 or 0回
    const history = [
      round(1, [match(1, ['a', 'b'], ['c', 'd'])], ['e', 'f', 'g']),
      round(2, [match(1, ['e', 'f'], ['g', 'a'])], ['b', 'c', 'd']),
    ];
    // 出場: a=2, b=1, c=1, d=1, e=1, f=1, g=1。b,c,d は 2回戦を休んだ（連続休み 1）ので、e,f,g（連続休み 0）より先に入る
    const { selected } = selectPlayers(players, history, 1, seededRng(2));
    const ids = selected.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['b', 'c', 'd']));
    expect(ids.filter((id) => ['e', 'f', 'g'].includes(id))).toHaveLength(1);
  });

  it('同じ優先度の境界では、男女が 1:1 に近づくように選ぶ', () => {
    // 男 4 名・女 4 名が、全員同じ優先度。1 面 → 男 2 名・女 2 名が選ばれる
    const players = [
      ...['m1', 'm2', 'm3', 'm4'].map((id) => player(id, 'male')),
      ...['f1', 'f2', 'f3', 'f4'].map((id) => player(id, 'female')),
    ];
    for (let seed = 1; seed <= 20; seed++) {
      const { selected } = selectPlayers(players, [], 1, seededRng(seed));
      expect(selected.filter((p) => p.gender === 'male')).toHaveLength(2);
      expect(selected.filter((p) => p.gender === 'female')).toHaveLength(2);
    }
  });
});

describe('generateMatches(組み合わせの生成)', () => {
  it.each([1, 2, 3, 4])('%i 面: 全員が、ちょうど1回ずつ、いずれかのコートに入る', (courts) => {
    const players = Array.from({ length: courts * 4 }, (_, i) => player(`p${i}`, i % 2 ? 'female' : 'male'));
    const matches = generateMatches(players, [], courts, players, seededRng(courts));
    expect(matches).toHaveLength(courts);
    const ids = matches.flatMap((m) => [...m.team1, ...m.team2]).sort();
    expect(ids).toEqual(players.map((p) => p.id).sort());
    expect(matches.map((m) => m.courtNumber)).toEqual(Array.from({ length: courts }, (_, i) => i + 1));
  });

  it('男2・女2 のときは、ミックス(男女ペア対男女ペア)を選ぶ', () => {
    const players = [player('m1', 'male'), player('m2', 'male'), player('f1', 'female'), player('f2', 'female')];
    for (let seed = 1; seed <= 10; seed++) {
      const [m] = generateMatches(players, [], 1, players, seededRng(seed));
      expect(m.isMixed).toBe(true);
    }
  });

  it('腕前が、上級2・初級2 のときは、上級と初級を組ませて、互角にする', () => {
    const players = [player('a1', 'male', 'advanced'), player('a2', 'male', 'advanced'), player('b1', 'male', 'beginner'), player('b2', 'male', 'beginner')];
    for (let seed = 1; seed <= 10; seed++) {
      const [m] = generateMatches(players, [], 1, players, seededRng(seed));
      expect(m.skillDiff).toBe(0);
      expect(m.team1Skill).toBe(4);
      expect(m.team2Skill).toBe(4);
    }
  });

  it('組んだことのあるペアを、避ける', () => {
    const players = ['a', 'b', 'c', 'd'].map((id) => player(id));
    // a-b, c-d は何度も組んでいる。a-c / a-d / b-c / b-d の組み方になるはず
    const history = [1, 2, 3].map((n) => round(n, [match(1, ['a', 'b'], ['c', 'd'])]));
    for (let seed = 1; seed <= 10; seed++) {
      const [m] = generateMatches(players, history, 1, players, seededRng(seed));
      const pairs = [m.team1, m.team2].map((t) => [...t].sort().join(''));
      expect(pairs).not.toContain('ab');
      expect(pairs).not.toContain('cd');
    }
  });
});

describe('同じ種の乱数なら、同じ結果になる(テストの再現性)', () => {
  it('createRound', () => {
    const players = samplePlayers();
    const a = createRound(players, [], 1, 1, seededRng(42), 1000);
    const b = createRound(players, [], 1, 1, seededRng(42), 1000);
    expect(a).toEqual(b);
    expect(a.roundNumber).toBe(1);
    expect(a.timestamp).toBe(1000);
  });
});

describe('複数ラウンドの連続シミュレーション(既存の test_simulation.py と同じ性質)', () => {
  function simulate(players: Player[], courts: number, rounds: number, seed: number) {
    const rng = seededRng(seed);
    const history: Round[] = [];
    for (let r = 1; r <= rounds; r++) history.push(createRound(players, history, courts, r, rng, r));
    return history;
  }

  it('1面・8名(男4・女4、上級2・中級4・初級2)・6ラウンド: 全員がちょうど3回出場し、ミックスが半数以上で、実力差の平均が 1.5 以下', () => {
    const players = samplePlayers();
    for (let seed = 1; seed <= 40; seed++) {
      const history = simulate(players, 1, 6, seed);
      const { stats } = analyzeHistory(players, history);
      const played = Object.values(stats).map((s) => s.playedCount);
      expect(played, `種 ${seed}: 出場回数`).toEqual(Array(8).fill(3));

      const matches = history.flatMap((h) => h.matches);
      expect(matches.filter((m) => m.isMixed).length, `種 ${seed}: ミックスの数`).toBeGreaterThanOrEqual(3);
      const avgDiff = matches.reduce((sum, m) => sum + m.skillDiff, 0) / matches.length;
      expect(avgDiff, `種 ${seed}: 実力差の平均`).toBeLessThanOrEqual(1.5);
    }
  });

  it('2面・10名・5ラウンド: 全員の出場回数がちょうど4回で、2回連続で休む人がいない', () => {
    const players = Array.from({ length: 10 }, (_, i) => player(`p${i}`, i % 2 ? 'female' : 'male', (['beginner', 'intermediate', 'advanced'] as const)[i % 3]));
    for (let seed = 1; seed <= 30; seed++) {
      const history = simulate(players, 2, 5, seed);
      const { stats } = analyzeHistory(players, history);
      expect(Object.values(stats).map((s) => s.playedCount), `種 ${seed}`).toEqual(Array(10).fill(4));
      // 休みが、連続していないこと
      for (const p of players) {
        const rested = history.map((h) => h.restingPlayerIds.includes(p.id));
        for (let i = 1; i < rested.length; i++) expect(rested[i] && rested[i - 1], `種 ${seed} ${p.id}: 連続休み`).toBe(false);
      }
    }
  });

  it('途中から、お休みに切り替えた人は、次のラウンドから除外される', () => {
    const players = samplePlayers();
    const history = simulate(players, 1, 2, 7);
    const sitOut = players.map((p, i) => (i === 0 ? { ...p, active: false } : p));
    const next = createRound(sitOut, history, 1, 3, seededRng(9), 3);
    const inRound = [...next.matches.flatMap((m) => [...m.team1, ...m.team2]), ...next.restingPlayerIds];
    expect(inRound).not.toContain(players[0].id);
  });
});
