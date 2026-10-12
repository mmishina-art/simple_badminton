// 読み上げ文と、LINE で共有するテキスト。既存のアプリ(v2.5)の文面を、そのまま移したもの。
import { calculateMVP } from './mvp';
import type { Player, Round } from './types';

/** 試合の組み合わせを、音声で読み上げるための文 */
export function generateAnnouncementText(round: Round, nameOf: (id: string) => string): string {
  // スピーカーの立ち上がりで頭が切れないよう、先頭に余白のポーズを入れる
  const lines: string[] = ['……。', `第${round.roundNumber}試合の組み合わせを発表します。`];

  for (const m of round.matches) {
    const t1 = m.team1.map(nameOf).join('さん、');
    const t2 = m.team2.map(nameOf).join('さん、');
    lines.push(`コート${m.courtNumber}。`);
    lines.push(`${t1}さんペア、対、${t2}さんペア。`);
  }

  const resting = round.restingPlayerIds ?? [];
  if (resting.length > 0) lines.push(`今回のお休みは、${resting.map(nameOf).join('さん、')}さんです。`);

  lines.push('よろしくお願いします。');
  return lines.join(' ');
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** 「本日の結果・順位」を、LINE に貼り付けるテキストにする。試合の履歴がなければ null。 */
export function generateLineStatsText(players: Player[], history: Round[], now: Date = new Date()): string | null {
  if (!history || history.length === 0) return null;

  const dateStr = `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}`;
  const mvpData = calculateMVP(players, history);
  const active = players.filter((p) => p && p.active);

  const lines: string[] = [];
  lines.push('🏸 バドミントン練習会 本日の結果 🏸');
  lines.push(`📅 ${dateStr} (全 ${history.length} 試合)`);
  lines.push(`👥 参加メンバー: ${active.length || players.length}名`);
  lines.push('');

  if (mvpData.isReady && mvpData.mvp) {
    const mvp = mvpData.mvp;
    lines.push('👑 【本日のMVP】');
    lines.push(`1位: ${mvp.name}さん (${mvp.wins}勝 / 勝率${mvp.winRate}%) - ${mvp.score}pt`);
    if (mvp.reasonText) lines.push(mvp.reasonText);
    lines.push('');

    if (mvpData.runnerUp || mvpData.third) {
      if (mvpData.runnerUp) {
        const r = mvpData.runnerUp;
        lines.push(`🥈 準MVP: ${r.name}さん (${r.wins}勝 / 勝率${r.winRate}%) - ${r.score}pt`);
      }
      if (mvpData.third) {
        const t = mvpData.third;
        lines.push(`🥉 敢闘賞: ${t.name}さん (${t.wins}勝 / 勝率${t.winRate}%) - ${t.score}pt`);
      }
      lines.push('');
    }
  }

  if (mvpData.candidates.length > 0) {
    lines.push('📊 【個人成績ランキング】');
    mvpData.candidates.forEach((c, idx) => {
      const rank = idx + 1;
      const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '・';
      const total = c.wins + c.losses;
      const record = total > 0 ? `${c.wins}勝${c.losses}敗 (勝率${c.winRate}%)` : '勝敗記録なし';
      lines.push(`${medal}${rank}位: ${c.name} [${c.playedCount}出場] ${record}`);
    });
    lines.push('');
  }

  lines.push('本日もお疲れ様でした！🏸');
  return lines.join('\n');
}
