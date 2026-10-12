// バイブレーション(対応端末のみ。iPhone Safari は非対応なので何も起きない)
export const HAPTIC = {
  score: 40,
  gameover: [60, 50, 100],
  matchpoint: [40, 40, 50],
  minus: 25,
  undo: 25,
  changeEnds: 30,
  serve: 30,
} as const;

export function vibrate(pattern: number | readonly number[]): void {
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    // 使えなくても続行する
  }
}
