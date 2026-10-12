import { createStore } from './createStore';

export type Tab = 'matches' | 'players' | 'stats' | 'scoreboard' | 'settings' | 'help';

export const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'matches', icon: '🏸', label: '試合' },
  { id: 'players', icon: '👥', label: 'メンバー' },
  { id: 'stats', icon: '📊', label: '成績' },
  { id: 'scoreboard', icon: '🔢', label: '得点板' },
  { id: 'settings', icon: '⚙️', label: '設定' },
  { id: 'help', icon: '❓', label: 'ヘルプ' },
];

/** いま開いているタブ */
export const tabStore = createStore<Tab>('matches');

export function switchTab(tab: Tab): void {
  tabStore.set(tab);
}
