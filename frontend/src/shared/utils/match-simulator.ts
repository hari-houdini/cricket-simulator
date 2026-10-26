import {
  BASE_INNINGS_RUNS,
  INNINGS_NOISE_RUNS,
  MAX_INNINGS_RUNS,
  MAX_WICKETS,
  MIN_INNINGS_RUNS,
  MIN_WICKETS,
  RUNS_PER_STRENGTH_POINT,
} from "../const/match.const";
import { XI_SIZE } from "../const/squad.const";
import type { Player } from "../types/player.types";

/**
 * A team's strength for the simulator: the mean batting and bowling ratings of
 * the players who take the field.
 */
export type TeamStrength = {
  readonly batting: number;
  readonly bowling: number;
};

/** The result of one simulated match. A `winner` of `null` means a tie. */
export type MatchOutcome = {
  readonly homeRuns: number;
  readonly homeWickets: number;
  readonly awayRuns: number;
  readonly awayWickets: number;
  readonly winner: "home" | "away" | null;
};

/**
 * Averages the batting and bowling ratings of a starting XI. Every player counts
 * in both averages, since any player can bat and bowl a little; the captain and
 * vice-captain are not weighted here.
 *
 * @param players - The players who take the field.
 * @returns The team's strength, or zero in both ratings when no one plays.
 */
export function teamStrength(players: readonly Player[]): TeamStrength {
  if (players.length === 0) {
    return { batting: 0, bowling: 0 };
  }
  const total = players.reduce(
    (sum, player) => ({
      batting: sum.batting + player.batting,
      bowling: sum.bowling + player.bowling,
    }),
    { batting: 0, bowling: 0 },
  );
  return {
    batting: total.batting / players.length,
    bowling: total.bowling / players.length,
  };
}

/**
 * Picks the strongest starting XI from a franchise's players, by the sum of
 * their three ratings. A system squad plays this XI.
 *
 * @param players - Every player the franchise has.
 * @returns Up to {@link XI_SIZE} players, strongest first.
 */
export function strongestXi(players: readonly Player[]): Player[] {
  return [...players]
    .sort(
      (left, right) =>
        right.batting +
        right.bowling +
        right.fielding -
        (left.batting + left.bowling + left.fielding),
    )
    .slice(0, XI_SIZE);
}

/**
 * The runs an innings makes against an opposing attack. A stronger batting side
 * scores more, a stronger bowling side concedes fewer, and the random draw moves
 * the total within {@link INNINGS_NOISE_RUNS} of the centre.
 *
 * @param batting - The batting side's batting strength.
 * @param bowling - The fielding side's bowling strength.
 * @param random - A draw in [0, 1).
 * @returns The innings total, kept within the minimum and maximum runs.
 */
function inningsRuns(
  batting: number,
  bowling: number,
  random: () => number,
): number {
  const centre =
    BASE_INNINGS_RUNS + (batting - bowling) * RUNS_PER_STRENGTH_POINT;
  const swing = (random() * 2 - 1) * INNINGS_NOISE_RUNS;
  const runs = Math.round(centre + swing);
  return Math.min(MAX_INNINGS_RUNS, Math.max(MIN_INNINGS_RUNS, runs));
}

/**
 * The wickets an innings loses, drawn uniformly from the allowed range.
 *
 * @param random - A draw in [0, 1).
 * @returns A whole number from {@link MIN_WICKETS} to {@link MAX_WICKETS}.
 */
function inningsWickets(random: () => number): number {
  return MIN_WICKETS + Math.floor(random() * (MAX_WICKETS - MIN_WICKETS + 1));
}

/**
 * Plays one league match between two teams. The home side bats first; the
 * higher total wins, and equal totals are a tie. The draws are taken in a fixed
 * order, so the same seed always gives the same match.
 *
 * @param home - The home team's strength.
 * @param away - The away team's strength.
 * @param random - A seeded draw source, in [0, 1).
 * @returns The score, the wickets and the winner.
 */
export function simulateMatch(
  home: TeamStrength,
  away: TeamStrength,
  random: () => number,
): MatchOutcome {
  const homeRuns = inningsRuns(home.batting, away.bowling, random);
  const homeWickets = inningsWickets(random);
  const awayRuns = inningsRuns(away.batting, home.bowling, random);
  const awayWickets = inningsWickets(random);

  let winner: MatchOutcome["winner"] = null;
  if (homeRuns > awayRuns) {
    winner = "home";
  } else if (awayRuns > homeRuns) {
    winner = "away";
  }
  return { homeRuns, homeWickets, awayRuns, awayWickets, winner };
}
