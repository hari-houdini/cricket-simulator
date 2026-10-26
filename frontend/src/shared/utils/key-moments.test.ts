import { describe, expect, it } from "vitest";

import type { MatchScore } from "../types/league.types";
import { describeKeyMoment, keyMomentsFor } from "./key-moments";

/**
 * A match score with the given wickets, won by the given franchise or tied.
 *
 * @param homeWickets - Wickets lost by the home side.
 * @param awayWickets - Wickets lost by the away side.
 * @param winner - The winner's id, or null for a tie.
 * @returns A score.
 */
function score(
  homeWickets: number,
  awayWickets: number,
  winner: string | null,
): MatchScore {
  return {
    homeRuns: 170,
    homeWickets,
    awayRuns: 160,
    awayWickets,
    winnerFranchiseId: winner,
  };
}

describe("keyMomentsFor", () => {
  it("lists the first innings' wickets, then the second innings', then the result", () => {
    const moments = keyMomentsFor(score(2, 1, "csk"), "csk", "mi");

    expect(moments).toEqual([
      {
        kind: "wicket",
        innings: 1,
        wicketNumber: 1,
        battingFranchiseId: "csk",
      },
      {
        kind: "wicket",
        innings: 1,
        wicketNumber: 2,
        battingFranchiseId: "csk",
      },
      { kind: "wicket", innings: 2, wicketNumber: 1, battingFranchiseId: "mi" },
      { kind: "result", winnerFranchiseId: "csk" },
    ]);
  });

  it("ends with the result even when neither innings lost a wicket", () => {
    const moments = keyMomentsFor(score(0, 0, "mi"), "csk", "mi");

    expect(moments).toEqual([{ kind: "result", winnerFranchiseId: "mi" }]);
  });

  it("carries a tied result through", () => {
    const moments = keyMomentsFor(score(0, 0, null), "csk", "mi");

    expect(moments.at(-1)).toEqual({ kind: "result", winnerFranchiseId: null });
  });
});

describe("describeKeyMoment", () => {
  it("names the wicket, the franchise and the innings", () => {
    expect(
      describeKeyMoment({
        kind: "wicket",
        innings: 1,
        wicketNumber: 3,
        battingFranchiseId: "csk",
      }),
    ).toBe("Wicket 3 falls for CSK in the first innings.");
  });

  it("calls a second-innings wicket a second-innings wicket", () => {
    expect(
      describeKeyMoment({
        kind: "wicket",
        innings: 2,
        wicketNumber: 7,
        battingFranchiseId: "mi",
      }),
    ).toBe("Wicket 7 falls for MI in the second innings.");
  });

  it("says who won the match", () => {
    expect(describeKeyMoment({ kind: "result", winnerFranchiseId: "gt" })).toBe(
      "GT win the match.",
    );
  });

  it("says a tied match is tied", () => {
    expect(describeKeyMoment({ kind: "result", winnerFranchiseId: null })).toBe(
      "The match is tied.",
    );
  });
});
