import { TABS, switchTab, tabStore } from '../state/ui';
import { useStore } from '../state/createStore';

const selectTab = (t: ReturnType<typeof tabStore.get>) => t;

/** 下に固定した、6つのタブ */
export function Nav() {
  const current = useStore(tabStore, selectTab);
  return (
    <nav class="bottom-nav" aria-label="メニュー">
      <div class="bottom-nav__inner">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            id={`nav-${t.id}`}
            class={`bottom-nav__item${current === t.id ? ' is-active' : ''}`}
            aria-current={current === t.id ? 'page' : undefined}
            onClick={() => switchTab(t.id)}
          >
            <span class="bottom-nav__icon" aria-hidden="true">{t.icon}</span>
            <span class="bottom-nav__label">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
