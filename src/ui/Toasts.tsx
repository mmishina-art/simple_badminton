import { useStore } from '../state/createStore';
import { toastStore } from '../state/toast';

const select = (t: ReturnType<typeof toastStore.get>) => t;

export function Toasts() {
  const list = useStore(toastStore, select);
  return (
    <div class="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} class="toast">{t.text}</div>
      ))}
    </div>
  );
}
