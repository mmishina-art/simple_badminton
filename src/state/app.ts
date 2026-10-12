// アプリ全体の状態(メンバー・設定・履歴・進行中の試合・得点板)と、それを変える操作。
// 変えるたびに localStorage へ保存する。画面はこのストアを読むだけにする。
import { NotEnoughPlayersError, createRound } from '../core/matchmaker';
import { type ParsedMember, SAMPLE_MEMBERS_TEXT, createPlayers, makeId, normalizeGender, normalizeLevel, parseMembers } from '../core/players';
import { type ScoreboardState, initialScoreboard } from '../core/scoreboard';
import type { Gender, Level, Player, Round, Settings, Winner } from '../core/types';
import { load, save } from '../storage';
import { createStore } from './createStore';

export interface AppState {
  players: Player[];
  settings: Settings;
  history: Round[];
  currentRound: Round | null;
  scoreboard: ScoreboardState;
}

export const DEFAULT_SETTINGS: Settings = { courtsCount: 2, autoSpeak: false, scoreboardSync: false };

const STATE_KEY = 'state';

/** 保存された値を、安全な形に直して読む(壊れた値・古い形があっても起動できるように) */
export function sanitize(raw: unknown): AppState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppState>;
  const players = (Array.isArray(r.players) ? r.players : [])
    .filter((p): p is Player => !!p && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => ({ id: p.id, name: p.name, gender: normalizeGender(p.gender), level: normalizeLevel(p.level), active: p.active !== false }));
  const s = (r.settings ?? {}) as Partial<Settings>;
  const courts = Number(s.courtsCount);
  const settings: Settings = {
    courtsCount: Number.isInteger(courts) && courts >= 1 && courts <= 4 ? courts : DEFAULT_SETTINGS.courtsCount,
    autoSpeak: s.autoSpeak === true,
    scoreboardSync: s.scoreboardSync === true,
  };
  const isRound = (x: unknown): x is Round => !!x && typeof x === 'object' && Array.isArray((x as Round).matches) && typeof (x as Round).roundNumber === 'number';
  const history = (Array.isArray(r.history) ? r.history : []).filter(isRound);
  const currentRound = isRound(r.currentRound) ? r.currentRound : null;
  const sb = { ...initialScoreboard(), ...(r.scoreboard && typeof r.scoreboard === 'object' ? r.scoreboard : {}) };
  return { players, settings, history, currentRound, scoreboard: sb };
}

export const appStore = createStore<AppState>(sanitize(load<unknown>(STATE_KEY, null)));

/** 状態を更新して保存する */
export function update(fn: (s: AppState) => AppState): void {
  appStore.set(fn);
  save(STATE_KEY, appStore.get());
}

/** 保存しなおした値を読み込む(バックアップの復元のあとなど) */
export function reloadFromStorage(): void {
  appStore.set(sanitize(load<unknown>(STATE_KEY, null)));
}

// ---- メンバー ----
let idCounter = 0;
const newId = () => makeId(Date.now(), Math.random, idCounter++);

export function addPlayer(name: string, gender: Gender, level: Level): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  update((s) => ({ ...s, players: [...s.players, { id: newId(), name: trimmed, gender, level, active: true }] }));
  return true;
}

export function addMembers(members: ParsedMember[]): number {
  if (members.length === 0) return 0;
  update((s) => ({ ...s, players: [...s.players, ...createPlayers(members, Date.now(), Math.random)] }));
  return members.length;
}

export function addMembersFromText(text: string): number {
  return addMembers(parseMembers(text));
}

export function addSampleMembers(): number {
  return addMembersFromText(SAMPLE_MEMBERS_TEXT);
}

export function replaceMembersFromText(text: string): number {
  const members = parseMembers(text);
  if (members.length === 0) return 0;
  update((s) => ({ ...s, players: createPlayers(members, Date.now(), Math.random) }));
  return members.length;
}

const mapPlayer = (id: string, fn: (p: Player) => Player) => (s: AppState): AppState => ({ ...s, players: s.players.map((p) => (p.id === id ? fn(p) : p)) });

export const togglePlayerActive = (id: string) => update(mapPlayer(id, (p) => ({ ...p, active: !p.active })));
export const toggleGender = (id: string) => update(mapPlayer(id, (p) => ({ ...p, gender: p.gender === 'male' ? 'female' : 'male' })));
const LEVEL_CYCLE: Level[] = ['beginner', 'intermediate', 'advanced'];
export const cycleLevel = (id: string) => update(mapPlayer(id, (p) => ({ ...p, level: LEVEL_CYCLE[(LEVEL_CYCLE.indexOf(p.level) + 1) % 3] })));
export const removePlayer = (id: string) => update((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }));

// ---- 設定 ----
export const setCourts = (n: number) => update((s) => ({ ...s, settings: { ...s.settings, courtsCount: Math.min(4, Math.max(1, n)) } }));
export const setAutoSpeak = (on: boolean) => update((s) => ({ ...s, settings: { ...s.settings, autoSpeak: on } }));
export const setScoreboardSync = (on: boolean) => update((s) => ({ ...s, settings: { ...s.settings, scoreboardSync: on } }));

// ---- 試合 ----
export type StartResult = { ok: true; round: Round } | { ok: false; message: string };

/** 新しい試合を作る(まだ進行中の試合があれば、置き換える) */
export function startRound(courtsOverride?: number): StartResult {
  const s = appStore.get();
  const courts = courtsOverride ?? s.settings.courtsCount;
  const number = s.currentRound ? s.currentRound.roundNumber : s.history.length + 1;
  try {
    const round = createRound(s.players, s.history, courts, number);
    update((cur) => ({ ...cur, settings: { ...cur.settings, courtsCount: courts }, currentRound: round }));
    return { ok: true, round };
  } catch (e) {
    if (e instanceof NotEnoughPlayersError) return { ok: false, message: e.message };
    throw e;
  }
}

export const cancelRound = () => update((s) => ({ ...s, currentRound: null }));

/** 進行中の試合を履歴に入れ、次へ進める */
export function finishRound(): void {
  update((s) => (s.currentRound ? { ...s, history: [...s.history, s.currentRound], currentRound: null } : s));
}

/** コートの勝敗をタップ。同じ側をもう一度タップすると解除 */
export function setWinner(courtNumber: number, winner: 'team1' | 'team2'): void {
  update((s) => {
    if (!s.currentRound) return s;
    const matches = s.currentRound.matches.map((m) => (m.courtNumber === courtNumber ? { ...m, winner: (m.winner === winner ? null : winner) as Winner } : m));
    return { ...s, currentRound: { ...s.currentRound, matches } };
  });
}

// ---- データのリセット ----
export const resetHistory = () => update((s) => ({ ...s, history: [], currentRound: null }));
export const resetAll = () => update(() => sanitize(null));
