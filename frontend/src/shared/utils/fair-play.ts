import {
  FAIR_PLAY_COLUMN_SIZE,
  FAIR_PLAY_FACTOR_MIN,
  FAIR_PLAY_MAX_SCORE,
} from "../const/awards.const";

/** A franchise's fair-play entry, for choosing the Fair Play award. */
export type FairPlayEntry = {
  readonly franchiseId: string;
  /** The season fair-play standing: the average of the team's match ratings. */
  readonly standing: number;
  readonly points: number;
  readonly netRunRate: number;
};

/** A player's average effect on a franchise's fair-play rating across the season. */
export type PlayerEffect = {
  readonly playerId: string;
  /** Average of the player's match score minus the maximum, so never above 0. */
  readonly averageEffect: number;
};

/**
 * The seeded factor applied to a player's trouble rating in one match, between
 * 0.5 and 1.5 (`docs/game-design.md` section 9).
 *
 * @param draw - A seeded draw in [0, 1).
 * @returns The factor.
 */
export function fairPlayFactor(draw: number): number {
  return FAIR_PLAY_FACTOR_MIN + draw;
}

/**
 * A player's score for one match: 10 minus the trouble rating scaled by the
 * seeded factor, kept between 0 and 10.
 *
 * @param troubleRating - The player's trouble rating, from 0 to 10.
 * @param factor - The seeded factor from {@link fairPlayFactor}.
 * @returns The match score.
 */
export function playerMatchScore(
  troubleRating: number,
  factor: number,
): number {
  return Math.min(
    FAIR_PLAY_MAX_SCORE,
    Math.max(0, FAIR_PLAY_MAX_SCORE - troubleRating * factor),
  );
}

/**
 * The mean of some numbers, or zero when there are none.
 *
 * @param values - The numbers to average.
 * @returns The average.
 */
export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * A player's average effect on the fair-play rating, from their match scores.
 *
 * @param scores - The player's match scores across the season.
 * @returns The average shortfall from the maximum, which is 0 or below.
 */
export function averageEffect(scores: readonly number[]): number {
  return mean(scores) - FAIR_PLAY_MAX_SCORE;
}

/**
 * Picks the Fair Play award: the best season standing, then the most league
 * points, then the better net run rate, then the franchise id so the pick is
 * always the same.
 *
 * @param entries - The franchises that have played.
 * @returns The winning franchise's id, or null when nobody has played.
 */
export function pickFairPlayWinner(
  entries: readonly FairPlayEntry[],
): string | null {
  const ranked = [...entries].sort(
    (left, right) =>
      right.standing - left.standing ||
      right.points - left.points ||
      right.netRunRate - left.netRunRate ||
      left.franchiseId.localeCompare(right.franchiseId),
  );
  return ranked[0]?.franchiseId ?? null;
}

/**
 * The two columns on a franchise's Fair Play screen: the players who pulled its
 * rating down most, and the players who held it up most. A player who never
 * dropped below the maximum is not named as pulling it down.
 *
 * @param effects - Each player's average effect for the franchise.
 * @returns The two lowering players, and the two lifting players.
 */
export function fairPlayColumns(effects: readonly PlayerEffect[]): {
  readonly lowering: PlayerEffect[];
  readonly lifting: PlayerEffect[];
} {
  const lowestFirst = [...effects].sort(
    (left, right) =>
      left.averageEffect - right.averageEffect ||
      left.playerId.localeCompare(right.playerId),
  );
  const highestFirst = [...effects].sort(
    (left, right) =>
      right.averageEffect - left.averageEffect ||
      left.playerId.localeCompare(right.playerId),
  );
  return {
    lowering: lowestFirst
      .filter((effect) => effect.averageEffect < 0)
      .slice(0, FAIR_PLAY_COLUMN_SIZE),
    lifting: highestFirst.slice(0, FAIR_PLAY_COLUMN_SIZE),
  };
}
