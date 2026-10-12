// ごく小さな状態の入れ物。値が変わると、購読している画面（Preact）が描き直される。
import { useEffect, useState } from 'preact/hooks';

export interface Store<T> {
  get(): T;
  set(next: T | ((current: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? (next as (current: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** ストアの値（の一部）を読む。値が変わると、この部品が描き直される。 */
export function useStore<T, S>(store: Store<T>, select: (state: T) => S): S {
  const [value, setValue] = useState(() => select(store.get()));
  useEffect(() => {
    const update = () => setValue(() => select(store.get()));
    update(); // 描画から購読までの間に変わった分を拾う
    return store.subscribe(update);
  }, [store, select]);
  return value;
}
