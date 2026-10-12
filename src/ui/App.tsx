import { tabStore } from '../state/ui';
import { useStore } from '../state/createStore';
import { MatchesTab } from './MatchesTab';
import { HelpTab } from './HelpTab';
import { Nav } from './Nav';
import { PlayersTab } from './PlayersTab';
import { ScoreboardTab } from './ScoreboardTab';
import { SettingsTab } from './SettingsTab';
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
        {tab === 'scoreboard' && <ScoreboardTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'help' && <HelpTab />}
      </main>
      <Nav />
      <Toasts />
    </>
  );
}
