import { averageEffect, mean, type PlayerEffect } from "./fair-play";

/** One player's line in one match, as the season totals need it. */
export type PerformanceRow = {
  /** Identifies the match, so team ratings can be taken per match. */
  readonly matchKey: string;
  readonly playerId: string;
  readonly franchiseId: string;
  readonly batted: boolean;
  readonly runs: number;
  readonly wickets: number;
  readonly runsConceded: number;
  /** Fantasy points before any captain or vice-captain multiplier. */
  readonly fantasyPoints: number;
  /** The player's fair-play score in this match. */
  readonly fairPlayScore: number;
};

/** A player's totals across the season. */
export type PlayerSeason = {
  readonly playerId: string;
  /** The franchise the player first appeared for. A player on two squads is not split. */
  readonly franchiseId: string;
  readonly innings: number;
  readonly runs: number;
  readonly wickets: number;
  readonly runsConceded: number;
  readonly fantasyPoints: number;
  readonly fairPlayScores: readonly number[];
};

/** A season total while it is being added up. */
type MutableSeason = {
  playerId: string;
  franchiseId: string;
  innings: number;
  runs: number;
  wickets: number;
  runsConceded: number;
  fantasyPoints: number;
  fairPlayScores: number[];
};

/** A franchise's season fair-play standing, with each of its players' effects. */
export type FranchiseFairPlay = {
  readonly franchiseId: string;
  /** The average of the franchise's team ratings, one per match. */
  readonly standing: number;
  readonly effects: readonly PlayerEffect[];
};

/**
 * Adds up each player's season from their match rows, in the order the players
 * first appear.
 *
 * @param rows - Every performance in the season.
 * @returns One season total per player.
 */
export function playerSeasons(rows: readonly PerformanceRow[]): PlayerSeason[] {
  const seasons = new Map<string, MutableSeason>();
  for (const row of rows) {
    const season = seasons.get(row.playerId) ?? {
      playerId: row.playerId,
      franchiseId: row.franchiseId,
      innings: 0,
      runs: 0,
      wickets: 0,
      runsConceded: 0,
      fantasyPoints: 0,
      fairPlayScores: [],
    };
    season.innings += row.batted ? 1 : 0;
    season.runs += row.runs;
    season.wickets += row.wickets;
    season.runsConceded += row.runsConceded;
    season.fantasyPoints += row.fantasyPoints;
    season.fairPlayScores.push(row.fairPlayScore);
    seasons.set(row.playerId, season);
  }
  return [...seasons.values()];
}

/**
 * Works out each franchise's fair-play standing and the effect of each of its
 * players. A team's rating for a match is the mean of its eleven fair-play
 * scores, and the standing is the mean of those ratings.
 *
 * @param rows - Every performance in the season.
 * @returns One entry per franchise that has played, in the order they first appear.
 */
export function franchiseFairPlay(
  rows: readonly PerformanceRow[],
): FranchiseFairPlay[] {
  const franchises = new Map<
    string,
    { matches: Map<string, number[]>; players: Map<string, number[]> }
  >();
  for (const row of rows) {
    const franchise = franchises.get(row.franchiseId) ?? {
      matches: new Map(),
      players: new Map(),
    };
    const ratings = franchise.matches.get(row.matchKey) ?? [];
    ratings.push(row.fairPlayScore);
    franchise.matches.set(row.matchKey, ratings);
    const scores = franchise.players.get(row.playerId) ?? [];
    scores.push(row.fairPlayScore);
    franchise.players.set(row.playerId, scores);
    franchises.set(row.franchiseId, franchise);
  }

  return [...franchises.entries()].map(
    ([franchiseId, { matches, players }]) => ({
      franchiseId,
      standing: mean([...matches.values()].map((ratings) => mean(ratings))),
      effects: [...players.entries()].map(([playerId, scores]) => ({
        playerId,
        averageEffect: averageEffect(scores),
      })),
    }),
  );
}

/**
 * Takes the first two places in a ranking. The comparison decides the order, so
 * a tie is broken by whatever the comparison breaks it with.
 *
 * @param items - Everything to rank.
 * @param compare - Negative when the left item ranks higher.
 * @returns The winner and the runner-up, each null when there is no such item.
 */
export function topTwo<T>(
  items: readonly T[],
  compare: (left: T, right: T) => number,
): { readonly winner: T | null; readonly runnerUp: T | null } {
  const ranked = [...items].sort(compare);
  return { winner: ranked[0] ?? null, runnerUp: ranked[1] ?? null };
}

/**
 * Orange Cap order: most runs first, then the player id.
 *
 * @param left - One season.
 * @param right - Another season.
 * @returns Negative when `left` ranks higher.
 */
export function compareOrangeCap(
  left: PlayerSeason,
  right: PlayerSeason,
): number {
  return right.runs - left.runs || left.playerId.localeCompare(right.playerId);
}

/**
 * Purple Cap order: most wickets first, then fewer runs conceded, then the player id.
 *
 * @param left - One season.
 * @param right - Another season.
 * @returns Negative when `left` ranks higher.
 */
export function comparePurpleCap(
  left: PlayerSeason,
  right: PlayerSeason,
): number {
  return (
    right.wickets - left.wickets ||
    left.runsConceded - right.runsConceded ||
    left.playerId.localeCompare(right.playerId)
  );
}

/**
 * Emerging Player order: most fantasy points first, then the player id.
 *
 * @param left - One season.
 * @param right - Another season.
 * @returns Negative when `left` ranks higher.
 */
export function compareEmerging(
  left: PlayerSeason,
  right: PlayerSeason,
): number {
  return (
    right.fantasyPoints - left.fantasyPoints ||
    left.playerId.localeCompare(right.playerId)
  );
}
