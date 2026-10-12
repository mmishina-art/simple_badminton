import { calculateMVP, type MvpCandidate } from '../core/mvp';
import { generateLineStatsText } from '../core/share';
import { LEVEL_LABEL } from '../core/types';
import { copyText } from '../platform/clipboard';
import { toast } from '../state/toast';
import { useApp } from './hooks';
import { nameMap } from './MatchesTab';

function Winner({ c, title, big }: { c: MvpCandidate; title: string; big?: boolean }) {
  return (
    <section class={`panel winner${big ? ' winner--mvp' : ''}`}>
      <p class="winner__title">{title}</p>
      <p class="winner__name">{c.name}さん <span class="muted small">({LEVEL_LABEL[c.level]})</span></p>
      <p class="small">{c.wins}勝{c.losses}敗 / 勝率{c.winRate}% / {Math.round(c.score * 10) / 10}pt</p>
      {big && c.reasonText && <p class="small winner__reason">{c.reasonText}</p>}
    </section>
  );
}

export function StatsTab() {
  const { players, history } = useApp();
  const name = nameMap(players);
  const mvp = calculateMVP(players, history);

  const share = async () => {
    const text = generateLineStatsText(players, history);
    if (!text) {
      toast('まだ試合の履歴がありません');
      return;
    }
    toast((await copyText(text)) ? 'LINE用のテキストをコピーしました' : 'コピーできませんでした');
  };

  if (history.length === 0) {
    return (
      <section class="panel center stack">
        <h2 class="h2">成績</h2>
        <p class="muted">試合を終了すると、ここに成績が出ます。</p>
      </section>
    );
  }

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

  return (
    <div class="stack">
      {!mvp.isReady ? (
        <section class="panel center" id="mvp-waiting">
          <p class="h3">🏅 MVP 選出まで あと{mvp.requiredMatches - mvp.totalDecided}試合</p>
          <p class="muted small">勝敗を記録した試合が{mvp.requiredMatches}試合になると選出します(いま{mvp.totalDecided}試合)。</p>
        </section>
      ) : (
        <>
          {mvp.mvp && <Winner c={mvp.mvp} title="👑 本日のMVP" big />}
          {mvp.runnerUp && <Winner c={mvp.runnerUp} title="🥈 準MVP" />}
          {mvp.third && <Winner c={mvp.third} title="🥉 敢闘賞" />}
        </>
      )}

      <section class="panel stack">
        <h3 class="h3">成績表</h3>
        <table class="table" id="stats-table">
          <thead>
            <tr><th>順位</th><th>名前</th><th>出場</th><th>勝</th><th>敗</th><th>勝率</th></tr>
          </thead>
          <tbody>
            {mvp.candidates.map((c, i) => (
              <tr key={c.id}>
                <td>{medal(i)}</td>
                <td>{c.name}</td>
                <td>{c.playedCount}</td>
                <td>{c.wins}</td>
                <td>{c.losses}</td>
                <td>{c.decidedCount > 0 ? `${c.winRate}%` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button type="button" class="primary" id="share-line" onClick={share}>📋 LINE用に結果をコピー</button>

      <section class="panel stack">
        <h3 class="h3">試合履歴</h3>
        {[...history].reverse().map((r) => (
          <div key={r.roundNumber} class="history">
            <p class="small"><strong>第{r.roundNumber}試合</strong></p>
            {r.matches.map((m) => (
              <p key={m.courtNumber} class="small">
                コート{m.courtNumber}: <span class={m.winner === 'team1' ? 'win' : ''}>{m.team1.map(name).join('・')}</span> vs{' '}
                <span class={m.winner === 'team2' ? 'win' : ''}>{m.team2.map(name).join('・')}</span>
              </p>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
