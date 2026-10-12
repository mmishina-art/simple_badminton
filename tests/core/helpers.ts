import type { Gender, Level, Match, Player, Round, Winner } from '../../src/core/types';

export function player(id: string, gender: Gender = 'male', level: Level = 'intermediate', active = true): Player {
  return { id, name: id.toUpperCase(), gender, level, active };
}

export function match(court: number, team1: [string, string], team2: [string, string], winner: Winner = null): Match {
  return { courtNumber: court, team1, team2, score1: null, score2: null, winner, isMixed: false, skillDiff: 0, team1Skill: 0, team2Skill: 0 };
}

export function round(roundNumber: number, matches: Match[], resting: string[] = []): Round {
  return { roundNumber, timestamp: 0, matches, restingPlayerIds: resting };
}
