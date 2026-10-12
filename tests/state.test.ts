import { describe, expect, it } from 'vitest';
import { sanitize } from '../src/state/app';

describe('sanitize(保存された値を安全な形に直す)', () => {
  it('何もない・壊れた値でも、初期状態になる', () => {
    for (const raw of [null, undefined, 'x', 42, [], {}]) {
      const s = sanitize(raw);
      expect(s.players).toEqual([]);
      expect(s.history).toEqual([]);
      expect(s.currentRound).toBeNull();
      expect(s.settings).toEqual({ courtsCount: 2, autoSpeak: false, scoreboardSync: false });
      expect(s.scoreboard.targetScore).toBe(15);
    }
  });

  it('メンバーの不正な項目を直し、id や名前のないものは捨てる', () => {
    const s = sanitize({ players: [{ id: 'a', name: '佐藤', gender: '??', level: '??' }, { name: 'idなし' }, null, { id: 'b', name: '鈴木', gender: 'female', level: 'advanced', active: false }] });
    expect(s.players).toEqual([
      { id: 'a', name: '佐藤', gender: 'male', level: 'intermediate', active: true },
      { id: 'b', name: '鈴木', gender: 'female', level: 'advanced', active: false },
    ]);
  });

  it('コート数が範囲外なら、既定に戻す', () => {
    expect(sanitize({ settings: { courtsCount: 9 } }).settings.courtsCount).toBe(2);
    expect(sanitize({ settings: { courtsCount: 3 } }).settings.courtsCount).toBe(3);
  });

  it('試合の形でない履歴は、捨てる', () => {
    const round = { roundNumber: 1, timestamp: 0, matches: [], restingPlayerIds: [] };
    expect(sanitize({ history: [round, { foo: 1 }, 'x'], currentRound: { bad: true } }).history).toEqual([round]);
    expect(sanitize({ currentRound: { bad: true } }).currentRound).toBeNull();
  });
});
