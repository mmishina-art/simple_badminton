import { tabStore } from '../state/ui';
import { useStore } from '../state/createStore';
import { MatchesTab } from './MatchesTab';
import { Nav } from './Nav';
import { PlayersTab } from './PlayersTab';
import { StatsTab } from './StatsTab';
import { Toasts } from './Toasts';

const selectTab = (t: ReturnType<typeof tabStore.get>) => t;

export function App() {
  const tab = useStore(tabStore, selectTab);
  return (
    <>
      <main class="app-main" id="tab-content" data-tab={tab}>
        {tab === 'matches' && <MatchesTab />}
        {tab === 'players' && <PlayersTab />}
        {tab === 'stats' && <StatsTab />}
        {(tab === 'scoreboard' || tab === 'settings' || tab === 'help') && (
          <section class="panel" aria-live="polite">
            <p class="muted">準備中です(タブ: {tab})</p>
          </section>
        )}
      </main>
      <Nav />
      <Toasts />
    </>
  );
}
