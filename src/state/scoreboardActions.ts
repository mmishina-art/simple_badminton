// 得点板の操作。状態を変えて保存し、バイブ・音声を鳴らす。
import { addScore as addScoreCore, changeEnds, decrementScore, gameStatus, importMatch, markReflected, renameTeam, resetScore, resolveReflectWinner, setDeuce, setServer, setTarget, toggleVoice, toggleWakeLock, undoScore, type ReflectError, type ScoreboardState, type TargetScore, type Team } from '../core/scoreboard';
import { HAPTIC, vibrate } from '../platform/haptics';
import { speak } from '../platform/speech';
import { appStore, update } from './app';
import { toast } from './toast';

const sb = () => appStore.get().scoreboard;
const setSb = (fn: (s: ScoreboardState) => ScoreboardState) => update((a) => ({ ...a, scoreboard: fn(a.scoreboard) }));

function voice(text: string) {
  if (sb().voiceEnabled) speak(text);
}

export function score(team: Team): void {
  const { state, blocked } = addScoreCore(sb(), team);
  if (blocked) {
    toast('ゲーム終了です。リセットしてください');
    return;
  }
  setSb(() => state);
  const st = gameStatus(state);
  if (st.isGameOver) {
    vibrate(HAPTIC.gameover);
    voice(`${state.scoreA}対${state.scoreB}。ゲームセット。${st.winnerName}の勝ちです`);
  } else if (st.isMatchPoint) {
    vibrate(HAPTIC.matchpoint);
    voice(`${state.scoreA}対${state.scoreB}。マッチポイント`);
  } else {
    vibrate(HAPTIC.score);
    voice(`${state.scoreA}対${state.scoreB}`);
  }
}

export const minus = (team: Team) => {
  vibrate(HAPTIC.minus);
  setSb((s) => decrementScore(s, team));
};
export const undo = () => {
  vibrate(HAPTIC.undo);
  setSb(undoScore);
};
export const swapEnds = () => {
  vibrate(HAPTIC.changeEnds);
  setSb(changeEnds);
};
export const serve = (team: Team) => {
  vibrate(HAPTIC.serve);
  setSb((s) => setServer(s, team));
};
export const reset = () => setSb(resetScore);
export const rename = (team: Team, name: string) => setSb((s) => renameTeam(s, team, name));
export const target = (t: TargetScore) => setSb((s) => setTarget(s, t));
export const deuce = (on: boolean) => setSb((s) => setDeuce(s, on));
export const flipVoice = () => setSb(toggleVoice);
export const flipWakeLock = () => setSb(toggleWakeLock);

// ---- 試合連動 ----
export function loadCourt(courtNumber: number): void {
  const a = appStore.get();
  const names = new Map(a.players.map((p) => [p.id, p.name]));
  const next = importMatch(sb(), a.currentRound, courtNumber, (id) => names.get(id) ?? '?');
  if (!next) {
    toast('コートを読み込めません');
    return;
  }
  setSb(() => next);
}

const REFLECT_MESSAGE: Record<ReflectError, string> = {
  'not-imported': 'コートを読み込んでいません',
  'no-round': '進行中の試合がありません',
  'round-changed': '試合が進んだため、反映できません',
  'no-court': '対応するコートがありません',
  'not-finished': 'まだ決着していません',
};

/** 決着した結果を、試合タブの勝敗に反映する */
export function reflectResult(): void {
  const a = appStore.get();
  const r = resolveReflectWinner(a.scoreboard, a.currentRound);
  if ('error' in r) {
    toast(REFLECT_MESSAGE[r.error]);
    return;
  }
  const court = a.scoreboard.importedMatch?.courtNumber;
  update((cur) => {
    if (!cur.currentRound) return cur;
    const matches = cur.currentRound.matches.map((m) => (m.courtNumber === court ? { ...m, winner: r.winner } : m));
    return { ...cur, currentRound: { ...cur.currentRound, matches }, scoreboard: markReflected(cur.scoreboard, r.winner) };
  });
  toast('試合タブに反映しました');
}
