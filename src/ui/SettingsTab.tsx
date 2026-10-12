import { useRef, useState } from 'preact/hooks';
import { exportMembersText, parseMembers } from '../core/players';
import { copyText } from '../platform/clipboard';
import { qrModules } from '../platform/qr';
import { addMembers, reloadFromStorage, replaceMembersFromText, resetAll, resetHistory, setAutoSpeak, setCourts, setScoreboardSync } from '../state/app';
import { exportBackup, importBackup } from '../storage';
import { toast } from '../state/toast';
import { useApp } from './hooks';

function Qr({ url }: { url: string }) {
  const { size, dark } = qrModules(url);
  return (
    <svg class="qr" viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label="このアプリを開く QR コード" shape-rendering="crispEdges">
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
      {dark.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000" />
      ))}
    </svg>
  );
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SettingsTab() {
  const { settings, players } = useApp();
  const [restore, setRestore] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const url = location.href.split('#')[0];

  const copyUrl = async () => toast((await copyText(url)) ? 'URLをコピーしました' : 'コピーできませんでした');
  const copyMembers = async () => {
    if (players.length === 0) return toast('メンバーがいません');
    toast((await copyText(exportMembersText(players))) ? 'メンバーをコピーしました' : 'コピーできませんでした');
  };
  const restoreAdd = () => {
    const members = parseMembers(restore);
    if (members.length === 0) return toast('復元できるメンバーが見つかりません');
    addMembers(members);
    setRestore('');
    toast(`${members.length}名を追加しました`);
  };
  const restoreReplace = () => {
    if (parseMembers(restore).length === 0) return toast('復元できるメンバーが見つかりません');
    if (!window.confirm('いまのメンバーをすべて入れ替えます。よろしいですか?')) return;
    toast(`${replaceMembersFromText(restore)}名に入れ替えました`);
    setRestore('');
  };
  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!window.confirm('バックアップを読み込むと、いまの記録は置き換わります。よろしいですか?')) return;
    try {
      importBackup(await file.text());
      reloadFromStorage();
      toast('バックアップを読み込みました');
    } catch (err) {
      toast(err instanceof Error ? err.message : '読み込めませんでした');
    }
  };
  const resetHist = () => {
    if (window.confirm('試合の履歴と成績を消します(メンバーは残ります)。よろしいですか?')) {
      resetHistory();
      toast('履歴を消しました');
    }
  };
  const resetEverything = () => {
    if (window.confirm('メンバー・履歴・設定をすべて消します。元に戻せません。よろしいですか?')) {
      resetAll();
      toast('すべて消しました');
    }
  };

  return (
    <div class="stack">
      <section class="panel stack">
        <h3 class="h3">コート数</h3>
        <div class="seg" role="group" aria-label="コート数">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" class={settings.courtsCount === n ? 'is-on' : ''} aria-pressed={settings.courtsCount === n} onClick={() => setCourts(n)}>{n}面</button>
          ))}
        </div>
        <p class="muted small">1面あたり4名が必要です(いま{settings.courtsCount * 4}名)。</p>
      </section>

      <section class="panel stack">
        <h3 class="h3">オプション</h3>
        <label class="check">
          <input type="checkbox" id="opt-autospeak" checked={settings.autoSpeak} onChange={(e) => setAutoSpeak((e.currentTarget as HTMLInputElement).checked)} />
          <span>試合を作ったら、自動で読み上げる</span>
        </label>
        <label class="check">
          <input type="checkbox" id="opt-sync" checked={settings.scoreboardSync} onChange={(e) => setScoreboardSync((e.currentTarget as HTMLInputElement).checked)} />
          <span>得点板を試合と連動させる(コートの読込・結果の反映)</span>
        </label>
      </section>

      <section class="panel stack center">
        <h3 class="h3">みんなに共有(QR コード)</h3>
        <Qr url={url} />
        <p class="muted small" id="share-url">{url}</p>
        <button type="button" id="copy-url" onClick={copyUrl}>URLをコピー</button>
        <p class="muted small">ホーム画面に追加すると、オフラインでも使えます。方法は、画面上の「アプリにする方法」を見てください。</p>
      </section>

      <section class="panel stack">
        <h3 class="h3">メンバーの保存・復元(テキスト)</h3>
        <button type="button" id="copy-members" onClick={copyMembers}>いまのメンバーをコピー</button>
        <textarea id="restore-input" class="input" rows={4} placeholder={'コピーしたメンバーを貼り付け\n佐藤 男 上級'} value={restore} onInput={(e) => setRestore((e.currentTarget as HTMLTextAreaElement).value)} />
        <div class="row">
          <button type="button" id="restore-add" onClick={restoreAdd}>追加する</button>
          <button type="button" id="restore-replace" onClick={restoreReplace}>入れ替える</button>
        </div>
      </section>

      <section class="panel stack">
        <h3 class="h3">記録のバックアップ(ファイル)</h3>
        <p class="muted small">ブラウザの都合で記録が消えることがあります。ときどきファイルに残しておくと安心です。</p>
        <div class="row">
          <button type="button" id="backup-export" onClick={() => download(`${__APP_ID__}-backup.json`, exportBackup())}>書き出す</button>
          <button type="button" id="backup-import" onClick={() => fileRef.current?.click()}>読み込む</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </section>

      <section class="panel stack">
        <h3 class="h3">データのリセット</h3>
        <button type="button" class="danger" id="reset-history" onClick={resetHist}>履歴だけ消す</button>
        <button type="button" class="danger" id="reset-all" onClick={resetEverything}>すべて消す</button>
      </section>
    </div>
  );
}
