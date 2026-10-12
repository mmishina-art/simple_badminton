import { badgeText } from './badge';
import { useApp } from './hooks';

export function HeaderBadge() {
  const s = useApp();
  const b = badgeText(s.players, s.settings.courtsCount, s.currentRound);
  return <span class={`badge badge--${b.tone}`} id="header-badge-text">{b.text}</span>;
}
