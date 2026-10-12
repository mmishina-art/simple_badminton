import { describe, expect, it } from 'vitest';
import { calculateMVP } from '../../src/core/mvp';
import { match, player, round } from './helpers';

const p1 = player('p1', 'male', 'advanced');
const p2 = player('p2', 'female', 'beginner');
const p3 = player('p3', 'male', 'intermediate');
const p4 = player('p4', 'female', 'intermediate');
const players = [p1, p2, p3, p4];

/** p1・p2 が、毎回勝つ */
const winsFor12 = (n: number) => Array.from({ length: n }, (_, i) => round(i + 1, [match(1, ['p1', 'p2'], ['p3', 'p4'], 'team1')]));

describe('calculateMVP', () => {
  it('勝敗が記録された試合が3試合未満のあいだは、選出待機中', () => {
    const result = calculateMVP(players, winsFor12(2));
    expect(result.isReady).toBe(false);
    expect(result.totalDecided).toBe(2);
    expect(result.mvp).toBeNull();
    expect(result.requiredMatches).toBe(3);
  });

  it('勝敗なしの試合は、数えない', () => {
    const history = [...winsFor12(2), round(3, [match(1, ['p1', 'p2'], ['p3', 'p4'], null)])];
    expect(calculateMVP(players, history).totalDecided).toBe(2);
  });

  it('3試合以上で、MVP・準MVP が決まる(資格: 2試合以上かつ1勝以上)', () => {
    const result = calculateMVP(players, winsFor12(3));
    expect(result.isReady).toBe(true);
    // p2(初級)は、勝利 3 × 10 + 勝率 100 × 0.1 + 3 + 腕前ボーナス 3 × 3 = 52、p1(上級)は 43
    expect(result.mvp).toMatchObject({ id: 'p2', score: 52, levelBonus: 9, wins: 3, winRate: 100 });
    expect(result.runnerUp).toMatchObject({ id: 'p1', score: 43, levelBonus: 0 });
    expect(result.third).toBeNull(); // p3・p4 は勝っていないので、資格がない
  });

  it('初級が2勝以上なら、ジャイアントキリングのコメントになる', () => {
    expect(calculateMVP(players, winsFor12(3)).mvp?.reasonText).toBe('🌱 初級から大金星連発！本日のジャイアントキリングMVP！');
  });

  it('コメントは、勝率100% → 3勝以上 → それ以外、の順で決まる', () => {
    // p1(上級)だけが 100% (3勝)
    const hundred = calculateMVP([p1, { ...p2, level: 'advanced' }, p3, p4], winsFor12(3));
    expect(hundred.mvp?.reasonText).toBe('🔥 無敗の勝率100%達成！圧倒的な勝負強さで文句なしのMVP！');

    // 3勝 1敗(勝率 75%): 3勝以上
    const history = [...winsFor12(3), round(4, [match(1, ['p1', 'p2'], ['p3', 'p4'], 'team2')])];
    const threeWins = calculateMVP([p1, { ...p2, level: 'advanced' }, p3, p4], history);
    expect(threeWins.mvp?.reasonText).toBe('🏆 最多勝利＆高勝率！チームを勝利に導き続けた本日のMVP！');

    // 2勝(勝率 66%): それ以外
    const other = calculateMVP([p1, { ...p2, level: 'advanced' }, p3, p4], [
      ...winsFor12(2),
      round(3, [match(1, ['p1', 'p2'], ['p3', 'p4'], 'team2')]),
    ]);
    expect(other.mvp?.reasonText).toBe('🌟 素晴らしい試合運びと安定した実力で本日のMVPを獲得！');
  });

  it('スコアの同点は、勝利数 → 勝率 の順で決める', () => {
    const result = calculateMVP(players, winsFor12(3));
    expect(result.candidates.map((c) => c.id)).toEqual(['p2', 'p1', expect.any(String), expect.any(String)]);
    expect(result.candidates[2].wins).toBe(0);
  });

  it('資格のない人(1試合しか出ていない人)は、MVP にならない', () => {
    // p3 は 1 試合だけ勝った
    const history = [
      round(1, [match(1, ['p3', 'p4'], ['p1', 'p2'], 'team1')]),
      round(2, [match(1, ['p1', 'p2'], ['p3', 'p4'], 'team1')]),
      round(3, [match(1, ['p1', 'p2'], ['p3', 'p4'], 'team1')]),
    ];
    const result = calculateMVP(players, history);
    expect(result.mvp?.id).not.toBe('p3');
  });
});
