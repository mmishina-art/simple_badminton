// アプリ全体で使う型。保存データの形でもある（変えるときは storage.ts の migrate() に移行処理を書く）。

export type Gender = 'male' | 'female';
export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  level: Level;
  /** 参加中か（false = お休み・見学中。抽選の対象外） */
  active: boolean;
}

export type Winner = 'team1' | 'team2' | null;

export interface Match {
  courtNumber: number;
  team1: [string, string];
  team2: [string, string];
  score1: number | null;
  score2: number | null;
  winner: Winner;
  /** 両チームとも男女ペアか（ミックスダブルス） */
  isMixed: boolean;
  /** 2チームの腕前ポイントの差 */
  skillDiff: number;
  team1Skill: number;
  team2Skill: number;
}

export interface Round {
  roundNumber: number;
  timestamp: number;
  matches: Match[];
  restingPlayerIds: string[];
}

export interface Settings {
  /** 使うコートの面数（1〜4） */
  courtsCount: number;
  /** 試合を生成したとき、組み合わせを自動で読み上げるか */
  autoSpeak: boolean;
  /** 得点板を、進行中の試合と連動させるか */
  scoreboardSync: boolean;
}

/** 腕前ポイント */
export const LEVEL_POINTS: Record<Level, number> = { beginner: 1, intermediate: 2, advanced: 3 };

export const LEVEL_LABEL: Record<Level, string> = { beginner: '初級', intermediate: '中級', advanced: '上級' };
export const LEVEL_SHORT: Record<Level, string> = { beginner: '初', intermediate: '中', advanced: '上' };
export const GENDER_LABEL: Record<Gender, string> = { male: '男', female: '女' };
