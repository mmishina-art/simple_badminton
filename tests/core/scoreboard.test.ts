import { describe, expect, it } from 'vitest';
import {
  type ScoreboardState,
  addScore,
  changeEnds,
  decrementScore,
  gameStatus,
  importMatch,
  initialScoreboard,
  markReflected,
  maxCapOf,
  renameTeam,
  resetScore,
  resolveReflectWinner,
  setDeuce,
  setTarget,
  undoScore,
} from '../../src/core/scoreboard';
import { match, round } from './helpers';

const at = (scoreA: number, scoreB: number, over: Partial<ScoreboardState> = {}): ScoreboardState => ({ ...initialScoreboard(), scoreA, scoreB, ...over });

describe('初期状態', () => {
  it('既定は、15点先取・デュースなし・音声なし・常時点灯あり', () => {
    expect(initialScoreboard()).toMatchObject({ targetScore: 15, deuceEnabled: false, voiceEnabled: false, wakeLockEnabled: true, server: 'A', scoreA: 0, scoreB: 0 });
  });
});

describe('gameStatus: デュースなし(打ち切り)', () => {
  it('目標点数に届いたら、その時点で決着', () => {
    expect(gameStatus(at(15, 0))).toMatchObject({ isGameOver: true, winner: 'A', winnerName: 'チーム A' });
    expect(gameStatus(at(3, 15))).toMatchObject({ isGameOver: true, winner: 'B', winnerName: 'チーム B' });
    expect(gameStatus(at(15, 14))).toMatchObject({ isGameOver: true, winner: 'A' });
  });

  it('あと1点で、マッチポイント。同点なら、両チーム', () => {
    expect(gameStatus(at(14, 10))).toMatchObject({ isGameOver: false, isMatchPoint: true, matchPointTeam: 'A' });
    expect(gameStatus(at(14, 14))).toMatchObject({ isMatchPoint: true, matchPointTeam: 'BOTH', matchPointTeamName: '両チーム（次の得点で決着！）' });
  });

  it('途中では、何も出ない', () => {
    expect(gameStatus(at(7, 8))).toMatchObject({ isGameOver: false, isMatchPoint: false, isDeuce: false });
  });

  it('目標点数を変えると、それに従う', () => {
    expect(gameStatus(at(11, 5, { targetScore: 11 })).isGameOver).toBe(true);
    expect(gameStatus(at(20, 5, { targetScore: 21 })).isMatchPoint).toBe(true);
    expect(gameStatus(at(21, 5, { targetScore: 21 })).isGameOver).toBe(true);
  });
});

describe('gameStatus: デュースあり', () => {
  const d = (a: number, b: number, target: 11 | 15 | 21 = 15) => gameStatus(at(a, b, { deuceEnabled: true, targetScore: target }));

  it('目標点数に届いても、2点差がつくまでは続く', () => {
    expect(d(15, 13).isGameOver).toBe(true);
    expect(d(15, 14).isGameOver).toBe(false);
    expect(d(16, 14).isGameOver).toBe(true);
  });

  it('お互いに、目標点数 - 1 以上なら、デュース', () => {
    expect(d(14, 14)).toMatchObject({ isDeuce: true, isGameOver: false });
    expect(d(15, 14)).toMatchObject({ isDeuce: true, isMatchPoint: true, matchPointTeam: 'A' });
    expect(d(10, 14).isDeuce).toBe(false);
  });

  it('デュースでなく、あと1点なら、マッチポイント', () => {
    expect(d(14, 10)).toMatchObject({ isMatchPoint: true, isDeuce: false, matchPointTeam: 'A' });
  });

  it('上限の点数に届いたら、2点差がなくても決着(11 → 15、15 → 20、21 → 30)', () => {
    expect([11, 15, 21].map((t) => maxCapOf(t as 11 | 15 | 21))).toEqual([15, 20, 30]);
    expect(d(20, 19)).toMatchObject({ isGameOver: true, winner: 'A' });
    expect(d(19, 20)).toMatchObject({ isGameOver: true, winner: 'B' });
    expect(d(15, 14, 11)).toMatchObject({ isGameOver: true });
    expect(d(30, 29, 21)).toMatchObject({ isGameOver: true });
    expect(d(29, 29, 21).isGameOver).toBe(false);
  });

  it('上限の1点前は、マッチポイント', () => {
    expect(d(19, 18)).toMatchObject({ isMatchPoint: true, matchPointTeam: 'A', isGameOver: false });
  });
});

describe('addScore / decrementScore / undoScore', () => {
  it('得点したチームにサーブ権が移る', () => {
    const { state } = addScore(initialScoreboard(), 'B');
    expect(state).toMatchObject({ scoreA: 0, scoreB: 1, server: 'B' });
    expect(addScore(state, 'A').state).toMatchObject({ scoreA: 1, scoreB: 1, server: 'A' });
  });

  it('決着ずみなら、加点できない', () => {
    const over = at(15, 3);
    const result = addScore(over, 'B');
    expect(result.blocked).toBe(true);
    expect(result.state).toBe(over);
  });

  it('元の状態を書き換えない', () => {
    const before = initialScoreboard();
    addScore(before, 'A');
    expect(before.scoreA).toBe(0);
    expect(before.history).toHaveLength(0);
  });

  it('1手戻すと、点数とサーブ権が戻る', () => {
    let s = initialScoreboard();
    s = addScore(s, 'A').state;
    s = addScore(s, 'B').state;
    expect(s).toMatchObject({ scoreA: 1, scoreB: 1, server: 'B' });
    s = undoScore(s);
    expect(s).toMatchObject({ scoreA: 1, scoreB: 0, server: 'A' });
    s = undoScore(s);
    expect(s).toMatchObject({ scoreA: 0, scoreB: 0, server: 'A' });
    expect(undoScore(s)).toBe(s); // 履歴がなければ、何もしない
  });

  it('マイナスは0点より下がらず、1手戻すで元に戻せる', () => {
    expect(decrementScore(initialScoreboard(), 'A')).toMatchObject({ scoreA: 0 });
    let s = at(5, 3);
    s = decrementScore(s, 'A');
    expect(s.scoreA).toBe(4);
    expect(undoScore(s).scoreA).toBe(5);
  });

  it('1手戻す の履歴は、最大50件', () => {
    let s = initialScoreboard();
    s = setTarget(s, 21);
    s = setDeuce(s, true);
    for (let i = 0; i < 60; i++) s = addScore(s, i % 2 ? 'A' : 'B').state;
    expect(s.history).toHaveLength(50);
  });
});

describe('changeEnds / resetScore / renameTeam', () => {
  it('チェンジエンドで、点数・名前・サーブ権が入れ替わる', () => {
    let s = at(7, 3, { nameA: '佐藤・鈴木', nameB: '高橋・田中', server: 'A' });
    s = changeEnds(s);
    expect(s).toMatchObject({ scoreA: 3, scoreB: 7, nameA: '高橋・田中', nameB: '佐藤・鈴木', server: 'B' });
  });

  it('リセットは、点数・サーブ・履歴を戻し、名前と設定は残す', () => {
    let s = at(7, 3, { nameA: '佐藤', targetScore: 21, deuceEnabled: true });
    s = addScore(s, 'A').state;
    s = resetScore(s);
    expect(s).toMatchObject({ scoreA: 0, scoreB: 0, server: 'A', nameA: '佐藤', targetScore: 21, deuceEnabled: true });
    expect(s.history).toEqual([]);
  });

  it('チーム名の変更: 空の名前は無視し、前後の空白は削る', () => {
    expect(renameTeam(initialScoreboard(), 'A', '  ペア1  ').nameA).toBe('ペア1');
    expect(renameTeam(initialScoreboard(), 'B', '   ').nameB).toBe('チーム B');
  });
});

describe('試合連動(進行中のコートの選手を読み込み、結果を反映する)', () => {
  const names: Record<string, string> = { a: '佐藤', b: '鈴木', c: '高橋', d: '田中' };
  const nameOf = (id: string) => names[id];
  const current = round(4, [match(1, ['a', 'b'], ['c', 'd']), match(2, ['a', 'c'], ['b', 'd'])]);

  it('コートの選手を読み込む', () => {
    const s = importMatch(initialScoreboard(), current, 2, nameOf)!;
    expect(s).toMatchObject({ nameA: '佐藤・高橋', nameB: '鈴木・田中', scoreA: 0, scoreB: 0 });
    expect(s.importedMatch).toEqual({ roundNumber: 4, courtNumber: 2, team1Side: 'A', team2Side: 'B', reflected: false });
  });

  it('存在しないコート・試合なしのときは、読み込めない', () => {
    expect(importMatch(initialScoreboard(), current, 9, nameOf)).toBeNull();
    expect(importMatch(initialScoreboard(), null, 1, nameOf)).toBeNull();
  });

  it('決着したら、勝者を試合タブの team1 / team2 として求められる', () => {
    let s = importMatch(initialScoreboard(), current, 1, nameOf)!;
    s = { ...s, scoreA: 15, scoreB: 9 };
    expect(resolveReflectWinner(s, current)).toEqual({ winner: 'team1' });
    s = { ...s, scoreA: 9, scoreB: 15 };
    expect(resolveReflectWinner(s, current)).toEqual({ winner: 'team2' });
  });

  it('チェンジエンドしたあとも、勝ったペアを正しく求める', () => {
    let s = importMatch(initialScoreboard(), current, 1, nameOf)!;
    s = { ...s, scoreA: 5, scoreB: 3 };
    s = changeEnds(s); // 左右が入れ替わる: team1 は B 側に
    s = { ...s, scoreB: 15 }; // B 側（= team1）が勝つ
    expect(resolveReflectWinner(s, current)).toEqual({ winner: 'team1' });
  });

  it('反映できない理由を返す', () => {
    const imported = importMatch(initialScoreboard(), current, 1, nameOf)!;
    expect(resolveReflectWinner(initialScoreboard(), current)).toEqual({ error: 'not-imported' });
    expect(resolveReflectWinner(imported, null)).toEqual({ error: 'no-round' });
    expect(resolveReflectWinner(imported, { ...current, roundNumber: 5 })).toEqual({ error: 'round-changed' });
    expect(resolveReflectWinner(imported, round(4, [match(2, ['a', 'c'], ['b', 'd'])]))).toEqual({ error: 'no-court' });
    expect(resolveReflectWinner(imported, current)).toEqual({ error: 'not-finished' });
  });

  it('反映したことを記録し、リセットすると、記録も戻る', () => {
    let s = importMatch(initialScoreboard(), current, 1, nameOf)!;
    s = markReflected(s, 'team1');
    expect(s.importedMatch).toMatchObject({ reflected: true, reflectedWinner: 'team1' });
    expect(resetScore(s).importedMatch).toMatchObject({ reflected: false });
  });
});
