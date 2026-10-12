import { describe, expect, it } from 'vitest';
import { SAMPLE_MEMBERS_TEXT, exportMembersText, parseMembers, rosterSummary } from '../../src/core/players';
import { player } from './helpers';

describe('parseMembers(一括登録・テキストからの復元)', () => {
  it('「名前 性別 腕前」を読み取る', () => {
    expect(parseMembers('佐藤 男 上級')).toEqual([{ name: '佐藤', gender: 'male', level: 'advanced' }]);
    expect(parseMembers('鈴木 女 初級')).toEqual([{ name: '鈴木', gender: 'female', level: 'beginner' }]);
  });

  it('カッコの中の性別・腕前を読み取る', () => {
    expect(parseMembers('田中(女・初級)')).toEqual([{ name: '田中', gender: 'female', level: 'beginner' }]);
    expect(parseMembers('佐藤（男 上級）')).toEqual([{ name: '佐藤', gender: 'male', level: 'advanced' }]);
  });

  it('区切りがなく、末尾にくっついていても読み取る(例: 田中女初級)', () => {
    expect(parseMembers('田中女初級')).toEqual([{ name: '田中', gender: 'female', level: 'beginner' }]);
    expect(parseMembers('高橋男上級')).toEqual([{ name: '高橋', gender: 'male', level: 'advanced' }]);
  });

  it('英字・略称も読み取る', () => {
    expect(parseMembers('山田 f 初')).toEqual([{ name: '山田', gender: 'female', level: 'beginner' }]);
    expect(parseMembers('Taro male advanced')).toEqual([{ name: 'Taro', gender: 'male', level: 'advanced' }]);
  });

  it('書かれていない項目は、既定値になる', () => {
    expect(parseMembers('伊藤')).toEqual([{ name: '伊藤', gender: 'male', level: 'intermediate' }]);
    expect(parseMembers('伊藤', 'female', 'beginner')).toEqual([{ name: '伊藤', gender: 'female', level: 'beginner' }]);
  });

  it('改行と「、」「,」で区切られた複数名を、入力の順に読み取り、空行は飛ばす', () => {
    const members = parseMembers('佐藤 男 上級\n\n鈴木 女 中級、高橋 男 初級,田中 女');
    expect(members.map((m) => m.name)).toEqual(['佐藤', '鈴木', '高橋', '田中']);
    expect(members[3]).toEqual({ name: '田中', gender: 'female', level: 'intermediate' });
  });

  it('空の文字列からは、何も読み取らない', () => {
    expect(parseMembers('')).toEqual([]);
    expect(parseMembers('  \n  ')).toEqual([]);
  });

  it('サンプルの8名は、男女各4名・上級2名・中級4名・初級2名', () => {
    const members = parseMembers(SAMPLE_MEMBERS_TEXT);
    expect(members).toHaveLength(8);
    expect(members.filter((m) => m.gender === 'male')).toHaveLength(4);
    expect(members.filter((m) => m.gender === 'female')).toHaveLength(4);
    expect(members.filter((m) => m.level === 'advanced')).toHaveLength(2);
    expect(members.filter((m) => m.level === 'intermediate')).toHaveLength(4);
    expect(members.filter((m) => m.level === 'beginner')).toHaveLength(2);
  });
});

describe('exportMembersText(メンバーの保存)', () => {
  it('書き出したテキストを、そのまま読み戻せる', () => {
    const players = [player('a', 'female', 'advanced'), player('b', 'male', 'beginner')];
    players[0].name = '渡辺';
    players[1].name = '山本';
    const text = exportMembersText(players);
    expect(text).toBe('渡辺 女 上級\n山本 男 初級');
    expect(parseMembers(text)).toEqual([
      { name: '渡辺', gender: 'female', level: 'advanced' },
      { name: '山本', gender: 'male', level: 'beginner' },
    ]);
  });
});

describe('rosterSummary(参加人数の内訳)', () => {
  const players = (n: number, inactive = 0) => Array.from({ length: n }, (_, i) => player(`p${i}`, 'male', 'intermediate', i >= inactive));

  it('足りているとき: 試合の人数と、休憩の人数', () => {
    expect(rosterSummary(players(10), 2)).toMatchObject({ activeCount: 10, required: 8, shortage: 0, bench: 2, maxPossibleCourts: 2 });
  });

  it('ぴったりのとき: 休憩なし', () => {
    expect(rosterSummary(players(8), 2)).toMatchObject({ shortage: 0, bench: 0 });
  });

  it('足りないとき: 不足の人数と、使える最大のコート数', () => {
    expect(rosterSummary(players(7), 2)).toMatchObject({ shortage: 1, bench: 0, maxPossibleCourts: 1 });
  });

  it('お休み中の人は、参加人数に数えない', () => {
    expect(rosterSummary(players(10, 3), 1)).toMatchObject({ activeCount: 7, bench: 3 });
  });
});
