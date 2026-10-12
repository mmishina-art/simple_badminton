import { createStore } from './createStore';
import type { Gender, Level } from '../core/types';

/** メンバー追加フォームの入力途中の値。タブを切り替えても残す。 */
export const playerDraft = createStore<{ name: string; gender: Gender; level: Level; bulk: string }>({ name: '', gender: 'male', level: 'intermediate', bulk: '' });
