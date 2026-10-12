import { parseMembers } from '../core/players';
import { GENDER_LABEL, LEVEL_LABEL, type Gender, type Level } from '../core/types';
import { addMembers, addPlayer, addSampleMembers, cycleLevel, removePlayer, toggleGender, togglePlayerActive } from '../state/app';
import { useStore } from '../state/createStore';
import { playerDraft } from '../state/drafts';
import { toast } from '../state/toast';
import { useApp } from './hooks';

const selectDraft = (d: ReturnType<typeof playerDraft.get>) => d;
const setDraft = (patch: Partial<ReturnType<typeof playerDraft.get>>) => playerDraft.set((d) => ({ ...d, ...patch }));
const GENDERS: Gender[] = ['male', 'female'];
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export function PlayersTab() {
  const { players } = useApp();
  const draft = useStore(playerDraft, selectDraft);
  const active = players.filter((p) => p.active);
  const count = (fn: (p: (typeof players)[number]) => boolean) => active.filter(fn).length;

  const submit = (e: Event) => {
    e.preventDefault();
    if (addPlayer(draft.name, draft.gender, draft.level)) setDraft({ name: '' });
    else toast('名前を入力してください');
  };

  const bulkAdd = () => {
    const members = parseMembers(draft.bulk);
    if (members.length === 0) {
      toast('登録できるメンバーが見つかりません');
      return;
    }
    addMembers(members);
    setDraft({ bulk: '' });
    toast(`${members.length}名を登録しました`);
  };

  const remove = (id: string, name: string) => {
    if (window.confirm(`${name}さんを削除しますか?(過去の成績からも名前が消えます)`)) removePlayer(id);
  };

  return (
    <div class="stack">
      <section class="panel">
        <h2 class="h2">メンバー <span class="muted small">参加中 {active.length} / 全 {players.length}名</span></h2>
        {players.length > 0 && (
          <p class="muted small" id="roster-summary">
            男{count((p) => p.gender === 'male')}・女{count((p) => p.gender === 'female')} / 初級{count((p) => p.level === 'beginner')}・中級{count((p) => p.level === 'intermediate')}・上級{count((p) => p.level === 'advanced')}(参加中)
          </p>
        )}
      </section>

      <form class="panel stack" onSubmit={submit} aria-label="メンバーを追加">
        <h3 class="h3">1人ずつ追加</h3>
        <input
          id="player-name"
          class="input"
          type="text"
          placeholder="名前"
          autocomplete="off"
          value={draft.name}
          onInput={(e) => setDraft({ name: (e.currentTarget as HTMLInputElement).value })}
        />
        <div class="seg" role="group" aria-label="性別">
          {GENDERS.map((g) => (
            <button key={g} type="button" class={draft.gender === g ? 'is-on' : ''} aria-pressed={draft.gender === g} onClick={() => setDraft({ gender: g })}>
              {GENDER_LABEL[g]}
            </button>
          ))}
        </div>
        <div class="seg" role="group" aria-label="腕前">
          {LEVELS.map((l) => (
            <button key={l} type="button" class={draft.level === l ? 'is-on' : ''} aria-pressed={draft.level === l} onClick={() => setDraft({ level: l })}>
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <button type="submit" class="primary" id="player-add">追加</button>
      </form>

      <section class="panel stack">
        <h3 class="h3">まとめて登録</h3>
        <p class="muted small">1行に1人。「名前 男 初級」のように書きます(性別・腕前は省略できます)。</p>
        <textarea
          id="bulk-input"
          class="input"
          rows={4}
          placeholder={'佐藤 男 上級\n鈴木 女 中級'}
          value={draft.bulk}
          onInput={(e) => setDraft({ bulk: (e.currentTarget as HTMLTextAreaElement).value })}
        />
        <div class="row">
          <button type="button" class="primary" id="bulk-add" onClick={bulkAdd}>一括登録</button>
          <button type="button" id="sample-add" onClick={() => toast(`サンプル${addSampleMembers()}名を追加しました`)}>サンプル8名を追加</button>
        </div>
      </section>

      <section class="panel stack">
        <h3 class="h3">メンバー一覧</h3>
        {players.length === 0 && <p class="muted">まだ登録されていません。</p>}
        <ul class="list" id="player-list">
          {players.map((p) => (
            <li key={p.id} class={`player${p.active ? '' : ' is-rest'}`}>
              <button type="button" class="player__active" aria-pressed={p.active} aria-label={`${p.name}: ${p.active ? '参加中(タップでお休み)' : 'お休み(タップで参加)'}`} onClick={() => togglePlayerActive(p.id)}>
                {p.active ? '参加' : '休み'}
              </button>
              <span class="player__name">{p.name}</span>
              <button type="button" class={`chip chip--${p.gender}`} aria-label={`${p.name}の性別: ${GENDER_LABEL[p.gender]}(タップで変更)`} onClick={() => toggleGender(p.id)}>
                {GENDER_LABEL[p.gender]}
              </button>
              <button type="button" class={`chip chip--${p.level}`} aria-label={`${p.name}の腕前: ${LEVEL_LABEL[p.level]}(タップで変更)`} onClick={() => cycleLevel(p.id)}>
                {LEVEL_LABEL[p.level]}
              </button>
              <button type="button" class="player__del" aria-label={`${p.name}を削除`} onClick={() => remove(p.id, p.name)}>✕</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
