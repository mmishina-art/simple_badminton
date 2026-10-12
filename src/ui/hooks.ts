import { appStore } from '../state/app';
import type { AppState } from '../state/app';
import { useStore } from '../state/createStore';

const identity = (s: AppState) => s;

/** アプリ全体の状態を読む */
export const useApp = (): AppState => useStore(appStore, identity);
