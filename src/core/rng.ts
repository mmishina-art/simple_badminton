/** 0 以上 1 未満の乱数を返す関数。テストでは、種を固定した乱数に差し替えて、結果を再現できるようにする。 */
export type Rng = () => number;

/** 種を固定した乱数（mulberry32）。同じ種なら、いつも同じ並びになる。 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 配列を、その場で混ぜる（Fisher–Yates） */
export function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
  for (let j = items.length - 1; j > 0; j--) {
    const r = Math.floor(rng() * (j + 1));
    [items[j], items[r]] = [items[r], items[j]];
  }
  return items;
}
