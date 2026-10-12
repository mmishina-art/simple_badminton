import { describe, expect, it } from 'vitest';
import { generateAnnouncementText, generateLineStatsText } from '../../src/core/share';
import { match, player, round } from './helpers';

const names: Record<string, string> = { a: '佐藤', b: '鈴木', c: '高橋', d: '田中', e: '伊藤' };
const nameOf = (id: string) => names[id] ?? '不明';

describe('generateAnnouncementText(読み上げ文)', () => {
  it('組み合わせとお休みを、既存のアプリと同じ文面で読み上げる', () => {
    const r = round(3, [match(1, ['a', 'b'], ['c', 'd'])], ['e']);
    expect(generateAnnouncementText(r, nameOf)).toBe(
      '……。 第3試合の組み合わせを発表します。 コート1。 佐藤さん、鈴木さんペア、対、高橋さん、田中さんペア。 今回のお休みは、伊藤さんです。 よろしくお願いします。',
    );
  });

  it('お休みがいないときは、お休みの文を入れない', () => {
    const r = round(1, [match(1, ['a', 'b'], ['c', 'd'])]);
    expect(generateAnnouncementText(r, nameOf)).not.toContain('お休み');
  });

  it('複数コートは、コートごとに読み上げる', () => {
    const r = round(1, [match(1, ['a', 'b'], ['c', 'd']), match(2, ['e', 'a'], ['b', 'c'])]);
    const text = generateAnnouncementText(r, nameOf);
    expect(text).toContain('コート1。');
    expect(text).toContain('コート2。');
  });
});

describe('generateLineStatsText(LINE の共有テキスト)', () => {
  const players = [
    { ...player('a', 'male', 'advanced'), name: '佐藤' },
    { ...player('b', 'female', 'beginner'), name: '鈴木' },
    { ...player('c', 'male', 'intermediate'), name: '高橋' },
    { ...player('d', 'female', 'intermediate'), name: '田中' },
  ];
  const wins = (n: number) => Array.from({ length: n }, (_, i) => round(i + 1, [match(1, ['a', 'b'], ['c', 'd'], 'team1')]));
  const now = new Date(2026, 9, 5, 12, 0, 0); // 2026/10/05

  it('履歴がないときは、null', () => {
    expect(generateLineStatsText(players, [], now)).toBeNull();
  });

  it('試合数が MVP に届かないときは、MVP の節がなく、ランキングだけ', () => {
    const text = generateLineStatsText(players, wins(2), now)!;
    expect(text).toContain('📅 2026/10/05 (全 2 試合)');
    expect(text).toContain('👥 参加メンバー: 4名');
    expect(text).not.toContain('【本日のMVP】');
    expect(text).toContain('📊 【個人成績ランキング】');
    expect(text.endsWith('本日もお疲れ様でした！🏸')).toBe(true);
  });

  it('3試合以上で、MVP・準MVP と、ランキングが入る', () => {
    const text = generateLineStatsText(players, wins(3), now)!;
    expect(text).toContain('👑 【本日のMVP】');
    expect(text).toContain('1位: 鈴木さん (3勝 / 勝率100%) - 52pt');
    expect(text).toContain('🌱 初級から大金星連発！本日のジャイアントキリングMVP！');
    expect(text).toContain('🥈 準MVP: 佐藤さん (3勝 / 勝率100%) - 43pt');
    expect(text).toContain('🥇 1位: 鈴木 [3出場] 3勝0敗 (勝率100%)');
    expect(text).toContain('🥉 3位: 高橋 [3出場] 0勝3敗 (勝率0%)');
  });
});
