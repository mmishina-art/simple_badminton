import { tabStore } from '../state/ui';
import { useStore } from '../state/createStore';
import { Nav } from './Nav';

const selectTab = (t: ReturnType<typeof tabStore.get>) => t;

export function App() {
  const tab = useStore(tabStore, selectTab);
  return (
    <>
      <main class="app-main" id="tab-content" data-tab={tab}>
        <section class="panel" aria-live="polite">
          <p class="muted">準備中です(タブ: {tab})</p>
        </section>
      </main>
      <Nav />
    </>
  );
}
