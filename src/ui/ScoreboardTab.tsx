import { useEffect, useRef, useState } from 'preact/hooks';
import { TARGET_SCORES, gameStatus, maxCapOf, type Team } from '../core/scoreboard';
import { enterFullscreen, exitFullscreen } from '../platform/fullscreen';
import { acquireWakeLock, releaseWakeLock } from '../platform/wakelock';
import { deuce, flipVoice, flipWakeLock, loadCourt, minus, reflectResult, rename, reset, score, serve, swapEnds, target, undo } from '../state/scoreboardActions';
import { useApp } from './hooks';

/** 得点板を開いている間だけ、画面を点灯したままにする */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    void acquireWakeLock();
    const again = () => {
      if (document.visibilityState === 'visible') void acquireWakeLock();
    };
    document.addEventListener('visibilitychange', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      void releaseWakeLock();
    };
  }, [on]);
}

export function ScoreboardTab() {
  const app = useApp();
  const s = app.scoreboard;
  const st = gameStatus(s);
  const [big, setBig] = useState(false);
  const bigRef = useRef<HTMLDivElement>(null);
  useWakeLock(s.wakeLockEnabled);

  const sides: { team: Team; score: number; name: string }[] = [
    { team: 'A', score: s.scoreA, name: s.nameA },
    { team: 'B', score: s.scoreB, name: s.nameB },
  ];

  const openBig = () => {
    setBig(true);
    window.setTimeout(() => bigRef.current && void enterFullscreen(bigRef.current), 0);
  };
  const closeBig = () => {
    setBig(false);
    void exitFullscreen();
  };
  const askRename = (team: Team, current: string) => {
    const v = window.prompt('チーム名(ペア名・選手名)', current);
    if (v !== null) rename(team, v);
  };
  const askReset = () => {
    if (window.confirm('得点をリセットしますか?')) reset();
  };

  const banner = st.isGameOver ? (
    <div class="banner-state banner-state--over" id="sb-banner">🏆 GAME OVER — {st.winnerName}の勝ち!</div>
  ) : st.isDeuce ? (
    <div class="banner-state banner-state--deuce" id="sb-banner">⚡ DEUCE{st.isMatchPoint ? ` — ${st.matchPointTeamName}マッチポイント` : ''}</div>
  ) : st.isMatchPoint ? (
    <div class="banner-state banner-state--mp" id="sb-banner">🔥 MATCH POINT — {st.matchPointTeamName}</div>
  ) : null;

  const board = (isBig: boolean) => (
    <div class={`sb${isBig ? ' sb--big' : ''}`}>
      {banner}
      <div class="sb__sides">
        {sides.map(({ team, score: pts, name }) => (
          <div key={team} class={`sb__side sb__side--${team}${st.winner === team ? ' is-winner' : ''}`}>
            <div class="sb__name">
              <span>{name}</span>
              {!isBig && <button type="button" class="link" aria-label={`${name}の名前を変更`} onClick={() => askRename(team, name)}>✏️</button>}
            </div>
            <button type="button" class="sb__score" id={`score-${team}`} aria-label={`${name}に1点を加える(いま${pts}点)`} onClick={() => score(team)}>
              {pts}
            </button>
            <button type="button" class={`sb__serve${s.server === team ? ' is-on' : ''}`} aria-pressed={s.server === team} onClick={() => serve(team)}>
              🏸 {s.server === team ? 'サーブ' : 'サーブ権'}
            </button>
            {!isBig && <button type="button" class="sb__minus" id={`minus-${team}`} onClick={() => minus(team)}>−1点</button>}
          </div>
        ))}
      </div>
    </div>
  );

  if (big) {
    return (
      <div class="sb-full" ref={bigRef} id="sb-full">
        {board(true)}
        <div class="sb-full__bar">
          <button type="button" onClick={undo} disabled={s.history.length === 0}>↩️ 1手戻す</button>
          <button type="button" onClick={swapEnds}>チェンジエンド</button>
          <button type="button" onClick={closeBig}>✕ 閉じる</button>
        </div>
      </div>
    );
  }

  const imported = s.importedMatch;
  const round = app.currentRound;

  return (
    <div class="stack">
      <section class="panel stack">
        <h2 class="h2">得点板 <span class="muted small">{s.targetScore}点先取 / デュース{s.deuceEnabled ? `あり(上限${maxCapOf(s.targetScore)}点)` : 'なし'}</span></h2>
        {board(false)}
        <div class="row row--wrap">
          <button type="button" id="sb-undo" onClick={undo} disabled={s.history.length === 0}>↩️ 1手戻す</button>
          <button type="button" id="sb-ends" onClick={swapEnds}>チェンジエンド</button>
          <button type="button" id="sb-reset" onClick={askReset}>🔄 リセット</button>
        </div>
        <button type="button" class="primary" id="sb-big" onClick={openBig}>📺 巨大全画面</button>
      </section>

      {app.settings.scoreboardSync && (
        <section class="panel stack" id="sb-sync">
          <h3 class="h3">🔗 試合連動</h3>
          {round ? (
            <div class="row row--wrap">
              {round.matches.map((m) => (
                <button key={m.courtNumber} type="button" onClick={() => loadCourt(m.courtNumber)}>コート{m.courtNumber}を読込</button>
              ))}
            </div>
          ) : (
            <p class="muted small">進行中の試合がありません(試合タブで開始すると読み込めます)。</p>
          )}
          {imported && (
            <>
              <p class="small">読み込み中: 第{imported.roundNumber}試合 コート{imported.courtNumber}{imported.reflected ? '(反映ずみ)' : ''}</p>
              <button type="button" class="primary" id="sb-reflect" disabled={!st.isGameOver || imported.reflected} onClick={reflectResult}>🏆 試合タブに反映</button>
            </>
          )}
        </section>
      )}

      <section class="panel stack">
        <h3 class="h3">ルール設定</h3>
        <div class="seg" role="group" aria-label="目標点数">
          {TARGET_SCORES.map((t) => (
            <button key={t} type="button" class={s.targetScore === t ? 'is-on' : ''} aria-pressed={s.targetScore === t} onClick={() => target(t)}>{t}点</button>
          ))}
        </div>
        <div class="seg" role="group" aria-label="デュース">
          <button type="button" class={!s.deuceEnabled ? 'is-on' : ''} aria-pressed={!s.deuceEnabled} onClick={() => deuce(false)}>デュースなし</button>
          <button type="button" class={s.deuceEnabled ? 'is-on' : ''} aria-pressed={s.deuceEnabled} onClick={() => deuce(true)}>デュースあり</button>
        </div>
        <div class="seg" role="group" aria-label="音声と画面">
          <button type="button" class={s.voiceEnabled ? 'is-on' : ''} aria-pressed={s.voiceEnabled} onClick={flipVoice}>🔊 音声 {s.voiceEnabled ? 'ON' : 'OFF'}</button>
          <button type="button" class={s.wakeLockEnabled ? 'is-on' : ''} aria-pressed={s.wakeLockEnabled} onClick={flipWakeLock}>💡 常時点灯 {s.wakeLockEnabled ? 'ON' : 'OFF'}</button>
        </div>
      </section>
    </div>
  );
}
