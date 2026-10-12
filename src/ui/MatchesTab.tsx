import { generateAnnouncementText } from '../core/share';
import { rosterSummary } from '../core/players';
import type { Match, Player, Round } from '../core/types';
import { cancelRound, finishRound, setWinner, startRound } from '../state/app';
import { toast } from '../state/toast';
import { speak, speechSupported, stopSpeaking } from '../platform/speech';
import { useApp } from './hooks';

export const nameMap = (players: Player[]) => {
  const map = new Map(players.map((p) => [p.id, p.name]));
  return (id: string) => map.get(id) ?? '(削除済み)';
};

function announce(round: Round, players: Player[]) {
  if (!speechSupported()) {
    toast('この端末では音声読み上げが使えません');
    return;
  }
  speak(generateAnnouncementText(round, nameMap(players)));
}

function begin(courts: number | undefined, players: Player[], autoSpeak: boolean) {
  const result = startRound(courts);
  if (!result.ok) {
    toast(result.message);
    return;
  }
  if (autoSpeak) announce(result.round, players);
}

function Court({ match, name, onWin }: { match: Match; name: (id: string) => string; onWin: (side: 'team1' | 'team2') => void }) {
  const team = (side: 'team1' | 'team2') => {
    const ids = match[side];
    const won = match.winner === side;
    const lost = match.winner !== null && !won;
    return (
      <button type="button" class={`team${won ? ' is-win' : ''}${lost ? ' is-lose' : ''}`} aria-pressed={won} data-side={side} onClick={() => onWin(side)}>
        <span class="team__names">{ids.map(name).join(' ・ ')}</span>
        {won && <span class="team__win">WIN</span>}
      </button>
    );
  };
  return (
    <article class="court" data-court={match.courtNumber}>
      <header class="court__head">
        <strong>コート{match.courtNumber}</strong>
        <span>
          {match.isMixed && <span class="tag tag--mix">ミックス</span>}
          {match.skillDiff === 0 && <span class="tag tag--even">互角</span>}
        </span>
      </header>
      {team('team1')}
      <div class="court__vs">VS</div>
      {team('team2')}
    </article>
  );
}

function LastResult({ round, name }: { round: Round; name: (id: string) => string }) {
  return (
    <section class="panel stack" id="last-result">
      <h3 class="h3">直前の試合結果(第{round.roundNumber}試合)</h3>
      {round.matches.map((m) => {
        const w = m.winner === 'team1' ? m.team1 : m.winner === 'team2' ? m.team2 : null;
        return (
          <p key={m.courtNumber} class="small">
            コート{m.courtNumber}: {w ? <>🏆 {w.map(name).join('・')}</> : <span class="muted">勝敗なし</span>}
          </p>
        );
      })}
    </section>
  );
}

export function MatchesTab() {
  const { players, settings, history, currentRound } = useApp();
  const name = nameMap(players);
  const roster = rosterSummary(players, settings.courtsCount);
  const last = history[history.length - 1];

  if (!currentRound) {
    const nextNumber = history.length + 1;
    const lack = roster.shortage > 0;
    return (
      <div class="stack">
        <section class="panel stack center">
          <h2 class="h2">第{nextNumber}試合</h2>
          {lack ? (
            <p class="warn" id="shortage">
              参加メンバーが足りません(あと{roster.shortage}名。{settings.courtsCount}面には{roster.required}名必要)。
            </p>
          ) : (
            <p class="muted small">参加中{roster.activeCount}名から{settings.courtsCount}面の組み合わせを作ります。</p>
          )}
          <button type="button" class="primary big" id="start-round" disabled={lack} onClick={() => begin(undefined, players, settings.autoSpeak)}>
            第{nextNumber}試合を開始
          </button>
          {lack && roster.maxPossibleCourts >= 1 && (
            <button type="button" id="start-fewer" onClick={() => begin(roster.maxPossibleCourts, players, settings.autoSpeak)}>
              {roster.maxPossibleCourts}面に変更して開始
            </button>
          )}
        </section>
        {last && <LastResult round={last} name={name} />}
      </div>
    );
  }

  const resting = currentRound.restingPlayerIds.filter((id) => players.some((p) => p.id === id));
  const undecided = currentRound.matches.filter((m) => m.winner === null).length;

  const reshuffle = () => {
    if (window.confirm('組み合わせを作り直しますか?(入力した勝敗は消えます)')) begin(undefined, players, settings.autoSpeak);
  };
  const finish = () => {
    if (undecided > 0 && !window.confirm(`勝敗が未設定のコートが${undecided}面あります。このまま終了して次へ進みますか?`)) return;
    stopSpeaking();
    finishRound();
  };
  const cancel = () => {
    if (window.confirm('この試合をキャンセルしますか?(履歴には残りません)')) {
      stopSpeaking();
      cancelRound();
    }
  };

  return (
    <div class="stack">
      <section class="panel stack">
        <h2 class="h2" id="round-title">第{currentRound.roundNumber}試合</h2>
        <p class="muted small">勝ったペアをタップすると記録されます(もう一度タップで解除)。</p>
      </section>

      {currentRound.matches.map((m) => (
        <Court key={m.courtNumber} match={m} name={name} onWin={(side) => setWinner(m.courtNumber, side)} />
      ))}

      {resting.length > 0 && (
        <section class="panel" id="resting">
          <h3 class="h3">お休み / 見学中</h3>
          <p>{resting.map(name).join('、')}</p>
        </section>
      )}

      <div class="row row--wrap">
        <button type="button" id="speak" onClick={() => announce(currentRound, players)}>🔊 読み上げ</button>
        <button type="button" id="speak-stop" onClick={stopSpeaking}>■ 停止</button>
        <button type="button" id="reshuffle" onClick={reshuffle}>🔀 再シャッフル</button>
      </div>
      <button type="button" class="primary big" id="finish-round" onClick={finish}>終了して次へ</button>
      <button type="button" class="link" id="cancel-round" onClick={cancel}>この試合をキャンセル</button>

      {last && <LastResult round={last} name={name} />}
    </div>
  );
}
