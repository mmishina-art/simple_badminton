import { createStore } from './createStore';

export interface Toast {
  id: number;
  text: string;
}

export const toastStore = createStore<Toast[]>([]);
let nextId = 1;

/** 画面の下に短いお知らせを出す(2.6秒で消える) */
export function toast(text: string): void {
  const id = nextId++;
  toastStore.set((list) => [...list.slice(-2), { id, text }]);
  window.setTimeout(() => toastStore.set((list) => list.filter((t) => t.id !== id)), 2600);
}
