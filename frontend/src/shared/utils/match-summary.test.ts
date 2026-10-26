import { describe, expect, it } from "vitest";

import type { MatchScore } from "../types/league.types";
import { summarizeMatch } from "./match-summary";

/**
 * A match score with the given runs and wickets. The winner follows the runs
 * unless `winner` says otherwise.
 *
 * @param values - Runs and wickets for each side, and the winner's id or null.
 * @returns A score.
 */
function score(values: {
  homeRuns: number;
  homeWickets?: number;
  awayRuns: number;
  awayWickets?: number;
  winner: string | null;
}): MatchScore {
  return {
    homeRuns: values.homeRuns,
    homeWickets: values.homeWickets ?? 5,
    awayRuns: values.awayRuns,
    awayWickets: values.awayWickets ?? 5,
    winnerFranchiseId: values.winner,
  };
}

describe("summarizeMatch", () => {
  it("says a home win is by runs", () => {
    const text = summarizeMatch(
      "CSK",
      "MI",
      score({ homeRuns: 170, awayRuns: 158, winner: "csk" }),
    );

    expect(text).toBe("CSK won by 12 runs");
  });

  it("says an away win is by the wickets left in hand", () => {
    const text = summarizeMatch(
      "CSK",
      "MI",
      score({ homeRuns: 150, awayRuns: 152, awayWickets: 6, winner: "mi" }),
    );

    expect(text).toBe("MI won by 4 wickets");
  });

  it("says so when the away side won with no wickets in hand", () => {
    const text = summarizeMatch(
      "CSK",
      "MI",
      score({ homeRuns: 150, awayRuns: 151, awayWickets: 10, winner: "mi" }),
    );

    expect(text).toBe("MI won with no wickets to spare");
  });

  it("says a tie when no one won", () => {
    const text = summarizeMatch(
      "CSK",
      "MI",
      score({ homeRuns: 150, awayRuns: 150, winner: null }),
    );

    expect(text).toBe("Match tied");
  });
});
