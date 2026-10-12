import type { Gender, Level, Player } from './types';
import { GENDER_LABEL, LEVEL_LABEL } from './types';
import type { Rng } from './rng';

export const normalizeGender = (g: unknown): Gender => (g === 'female' ? 'female' : 'male');
export const normalizeLevel = (l: unknown): Level => (l === 'beginner' || l === 'advanced' ? l : 'intermediate');

export interface ParsedMember {
  name: string;
  gender: Gender;
  level: Level;
}

const FEMALE = /^(女|女性|♀|female|f)$/i;
const MALE = /^(男|男性|♂|male|m)$/i;
const ADVANCED = /^(上級|advanced|上)$/i;
const BEGINNER = /^(初級|beginner|初)$/i;
const LEVEL_WORD = /^(上級|advanced|上|初級|beginner|初|中級|intermediate|中)$/i;

function parseOne(item: string, defaultGender: Gender, defaultLevel: Level): ParsedMember | null {
  let gender = defaultGender;
  let level = defaultLevel;
  let work = item.trim();

  // 1. カッコ内の性別・腕前（例: 田中(女・初級)、佐藤（男 上級））
  const paren = work.match(/[(（]([^)）]+)[)）]/);
  if (paren) {
    const text = paren[1];
    if (/女|女性|♀|female|f/i.test(text)) gender = 'female';
    else if (/男|男性|♂|male|m/i.test(text)) gender = 'male';

    if (/上級|advanced/i.test(text) || /上/i.test(text)) level = 'advanced';
    else if (/初級|beginner/i.test(text) || /初/i.test(text)) level = 'beginner';
    else if (/中級|intermediate/i.test(text) || /中/i.test(text)) level = 'intermediate';
    work = work.replace(/[(（][^)）]+[)）]/g, ' ').trim();
  }

  // 2. 空白やスラッシュなどで区切られた語を判定
  const tokens = work.split(/[\s\u3000/\uff0f|\uff5c]+/).filter((t) => t.length > 0);
  const nameTokens: string[] = [];
  for (const tok of tokens) {
    if (FEMALE.test(tok)) gender = 'female';
    else if (MALE.test(tok)) gender = 'male';
    else if (LEVEL_WORD.test(tok)) {
      if (ADVANCED.test(tok)) level = 'advanced';
      else if (BEGINNER.test(tok)) level = 'beginner';
      else level = 'intermediate';
    } else nameTokens.push(tok);
  }

  let name = nameTokens.join(' ').trim();

  // 3. 区切りがなく、末尾にくっついているとき（例: 田中女初級）
  if (!name && work) {
    name = work;
  } else if (nameTokens.length === 1) {
    const suffix = name.match(/^(.*?)(女性|男性|女|男|♀|♂)?(上級|中級|初級|advanced|intermediate|beginner)$/i);
    if (suffix && suffix[1].trim()) {
      name = suffix[1].trim();
      if (suffix[2]) gender = /女|女性|♀/i.test(suffix[2]) ? 'female' : 'male';
      if (suffix[3]) {
        if (/上級|advanced/i.test(suffix[3])) level = 'advanced';
        else if (/初級|beginner/i.test(suffix[3])) level = 'beginner';
        else level = 'intermediate';
      }
    }
  }

  return name ? { name, gender, level } : null;
}

/**
 * 貼り付けたテキストから、メンバーを読み取る（一括登録・テキストからの復元・旧アプリのメンバーの取り込みに共通）。
 * 1行に1名（「、」「,」で区切って、1行に複数名も可）。例: `佐藤 男 上級` / `鈴木(女・初級)` / `田中女初級`
 */
export function parseMembers(text: string, defaultGender: Gender = 'male', defaultLevel: Level = 'intermediate'): ParsedMember[] {
  const out: ParsedMember[] = [];
  for (const rawLine of (text || '').split(/[\n\r]+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const items = line
      .split(/[、,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    for (const item of items) {
      const member = parseOne(item, defaultGender, defaultLevel);
      if (member) out.push(member);
    }
  }
  return out;
}

/** 登録メンバーを、「名前 男 初級」の行にする（LINE やメモ帳に貼り付けて保存でき、parseMembers で読み戻せる） */
export function exportMembersText(players: Player[]): string {
  return players.map((p) => `${p.name} ${GENDER_LABEL[p.gender]} ${LEVEL_LABEL[p.level]}`).join('\n');
}

/** 新しいメンバーの ID。同じ瞬間に何人も作っても重ならないよう、連番を入れる。 */
export function makeId(now: number, rng: Rng, index = 0): string {
  return `p_${now}_${Math.floor(rng() * 10000)}_${index}`;
}

export function createPlayers(members: ParsedMember[], now: number, rng: Rng): Player[] {
  return members.map((m, i) => ({
    id: makeId(now, rng, i),
    name: m.name,
    gender: m.gender,
    level: m.level,
    active: true,
  }));
}

/** 試しに入れる、バランスのよい8名（男女各4名・上級2名・中級4名・初級2名） */
export const SAMPLE_MEMBERS_TEXT = '佐藤 男 上級\n鈴木 女 中級\n高橋 男 中級\n田中 女 初級\n伊藤 男 中級\n渡辺 女 上級\n山本 男 初級\n中村 女 中級';

export interface RosterSummary {
  activeCount: number;
  required: number;
  /** 足りない人数（足りているとき 0） */
  shortage: number;
  /** 休憩になる人数（足りないとき 0） */
  bench: number;
  /** いまの参加人数で、使える最大のコート数 */
  maxPossibleCourts: number;
}

/** 参加人数とコート数から、必要人数・不足・休憩の内訳を出す */
export function rosterSummary(players: Player[], courtsCount: number): RosterSummary {
  const activeCount = players.filter((p) => p.active).length;
  const required = courtsCount * 4;
  return {
    activeCount,
    required,
    shortage: Math.max(0, required - activeCount),
    bench: Math.max(0, activeCount - required),
    maxPossibleCourts: Math.floor(activeCount / 4),
  };
}
