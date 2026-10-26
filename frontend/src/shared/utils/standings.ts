import {
  OVERS_PER_INNINGS,
  POINTS_PER_LOSS,
  POINTS_PER_TIE,
  POINTS_PER_WIN,
} from "../const/league.const";
import type { Fixture, Standing } from "../types/league.types";

/** How a franchise finished one match. */
type Outcome = "won" | "tied" | "lost";

/** Points awarded for each outcome (`docs/game-design.md` section 6). */
const POINTS: Record<Outcome, number> = {
  won: POINTS_PER_WIN,
  tied: POINTS_PER_TIE,
  lost: POINTS_PER_LOSS,
};

/** The columns of the league table that can be sorted. */
export type StandingSortKey =
  | "played"
  | "won"
  | "lost"
  | "points"
  | "netRunRate";

/** The direction of a sort. */
export type SortDirection = "ascending" | "descending";

/**
 * Net run rate: runs scored per over, minus runs conceded per over, across every
 * match played. Every league innings is {@link OVERS_PER_INNINGS} overs, so the
 * overs are the matches played times that length.
 *
 * @param runsFor - Runs scored across the matches.
 * @param runsAgainst - Runs conceded across the matches.
 * @param matches - Matches played. With none, the rate is 0.
 * @returns The net run rate, unrounded.
 */
export function netRunRate(
  runsFor: number,
  runsAgainst: number,
  matches: number,
): number {
  if (matches === 0) {
    return 0;
  }
  const overs = matches * OVERS_PER_INNINGS;
  return (runsFor - runsAgainst) / overs;
}

/**
 * The order of the league table: more points first, then the better net run
 * rate, then the franchise id, so the order is always the same.
 *
 * @param left - One row.
 * @param right - The other row.
 * @returns A negative number when `left` ranks higher, positive when lower.
 */
export function compareStandings(left: Standing, right: Standing): number {
  return (
    right.points - left.points ||
    right.netRunRate - left.netRunRate ||
    left.franchiseId.localeCompare(right.franchiseId)
  );
}

/**
 * The outcome for one franchise in a match.
 *
 * @param franchiseId - The franchise to judge.
 * @param winnerFranchiseId - The winner, or null for a tie.
 * @returns Whether the franchise won, tied or lost.
 */
function outcomeFor(
  franchiseId: string,
  winnerFranchiseId: string | null,
): Outcome {
  if (winnerFranchiseId === null) {
    return "tied";
  }
  return winnerFranchiseId === franchiseId ? "won" : "lost";
}

/** A franchise's running totals, before its net run rate is worked out. */
type Tally = {
  franchiseId: string;
  played: number;
  won: number;
  tied: number;
  lost: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
};

/**
 * Adds one side of a played match to a franchise's totals.
 *
 * @param tally - The franchise's running totals, changed in place.
 * @param runsFor - Runs the franchise scored in the match.
 * @param runsAgainst - Runs the franchise conceded in the match.
 * @param outcome - How the franchise finished the match.
 */
function addMatch(
  tally: Tally,
  runsFor: number,
  runsAgainst: number,
  outcome: Outcome,
) {
  tally.played += 1;
  tally.runsFor += runsFor;
  tally.runsAgainst += runsAgainst;
  tally.points += POINTS[outcome];
  if (outcome === "won") {
    tally.won += 1;
  } else if (outcome === "tied") {
    tally.tied += 1;
  } else {
    tally.lost += 1;
  }
}

/**
 * Builds the league table from the fixtures that have been played. Unplayed
 * fixtures are skipped, and so is a fixture naming a franchise that is not in
 * `franchiseIds`, so a stray row cannot corrupt the table.
 *
 * @param franchiseIds - Every franchise in the league. Each gets a row, even with no matches.
 * @param fixtures - The league fixtures, played or not.
 * @returns One row per franchise, in table order.
 */
export function buildStandings(
  franchiseIds: readonly string[],
  fixtures: readonly Fixture[],
): Standing[] {
  const tallies = new Map<string, Tally>(
    franchiseIds.map((franchiseId) => [
      franchiseId,
      {
        franchiseId,
        played: 0,
        won: 0,
        tied: 0,
        lost: 0,
        points: 0,
        runsFor: 0,
        runsAgainst: 0,
      },
    ]),
  );

  for (const fixture of fixtures) {
    const { result } = fixture;
    if (result === null) {
      continue;
    }
    const home = tallies.get(fixture.homeFranchiseId);
    const away = tallies.get(fixture.awayFranchiseId);
    if (!home || !away) {
      continue;
    }
    addMatch(
      home,
      result.homeRuns,
      result.awayRuns,
      outcomeFor(home.franchiseId, result.winnerFranchiseId),
    );
    addMatch(
      away,
      result.awayRuns,
      result.homeRuns,
      outcomeFor(away.franchiseId, result.winnerFranchiseId),
    );
  }

  return [...tallies.values()]
    .map((tally) => ({
      franchiseId: tally.franchiseId,
      played: tally.played,
      won: tally.won,
      tied: tally.tied,
      lost: tally.lost,
      points: tally.points,
      runsFor: tally.runsFor,
      runsAgainst: tally.runsAgainst,
      netRunRate: netRunRate(tally.runsFor, tally.runsAgainst, tally.played),
    }))
    .sort(compareStandings);
}

/**
 * Sorts the table by one column. Rows that tie on that column keep the table
 * order, so a sort never reshuffles equal rows.
 *
 * @param standings - The table to sort. It is not changed.
 * @param key - The column to sort by.
 * @param direction - Whether the smallest or the largest value comes first.
 * @returns A new array in the requested order.
 */
export function sortStandings(
  standings: readonly Standing[],
  key: StandingSortKey,
  direction: SortDirection,
): Standing[] {
  const sign = direction === "ascending" ? 1 : -1;
  return [...standings].sort(
    (left, right) =>
      sign * (left[key] - right[key]) || compareStandings(left, right),
  );
}

/**
 * Formats a net run rate for the table: three decimals, with a plus sign when
 * it is positive.
 *
 * @param value - The net run rate.
 * @returns Text such as `"+0.482"` or `"-0.120"`.
 */
export function formatNetRunRate(value: number): string {
  const text = value.toFixed(3);
  return value > 0 ? `+${text}` : text;
}
