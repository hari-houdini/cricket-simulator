import type { MatchScore } from "./league.types";

/**
 * Where a fixture is in the round being shown: not yet played, being played
 * now, or finished. The league panel reveals a round one match at a time, so
 * a finished match can still be waiting its turn to show.
 */
export type FixtureStatus = "to-play" | "in-play" | "played";

/**
 * One line of the schedule as the screen shows it. `result` is only set when
 * the match is `played`.
 */
export type FixtureRow = {
  readonly key: string;
  readonly round: number;
  readonly homeFranchiseId: string;
  readonly awayFranchiseId: string;
  readonly status: FixtureStatus;
  readonly result: MatchScore | null;
};

/**
 * Which round is being revealed, and how many of its matches have shown so far.
 * `null` means no reveal is running, so every result shows at once.
 */
export type Reveal = {
  readonly round: number;
  readonly shown: number;
};
