import { rosterSummary } from '../core/players';
import type { Player, Round } from '../core/types';

/** ヘッダーに出す、人数とコートの状況 */
export function badgeText(players: Player[], courts: number, round: Round | null): { text: string; tone: 'ok' | 'warn' } {
  const r = rosterSummary(players, courts);
  const base = `参加中${r.activeCount}名 / コート${courts}面(要${r.required}名)`;
  if (r.shortage > 0) return { text: `${base} あと${r.shortage}名不足`, tone: 'warn' };
  if (r.bench === 0) return { text: `${base} 全員出場`, tone: 'ok' };
  void round;
  return { text: `${base} 試合${r.required}名/休憩${r.bench}名`, tone: 'ok' };
}
