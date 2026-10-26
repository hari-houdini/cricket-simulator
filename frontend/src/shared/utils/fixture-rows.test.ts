import { describe, expect, it } from "vitest";

import type { Fixture, MatchScore } from "../types/league.types";
import { fixtureRows } from "./fixture-rows";

const score: MatchScore = {
  homeRuns: 170,
  homeWickets: 5,
  awayRuns: 160,
  awayWickets: 7,
  winnerFranchiseId: "csk",
};

/**
 * A fixture in a round, played with {@link score} or not.
 *
 * @param round - The round.
 * @param home - The home franchise.
 * @param played - Whether the fixture has a result.
 * @returns A fixture.
 */
function fixture(round: number, home: string, played: boolean): Fixture {
  return {
    round,
    homeFranchiseId: home,
    awayFranchiseId: "away",
    result: played ? score : null,
  };
}

describe("fixtureRows", () => {
  it("shows results and unplayed fixtures when no reveal is running", () => {
    const rows = fixtureRows(
      [fixture(1, "csk", true), fixture(2, "mi", false)],
      null,
    );

    expect(rows.map((row) => row.status)).toEqual(["played", "to-play"]);
    expect(rows[0]?.result).toEqual(score);
    expect(rows[1]?.result).toBeNull();
  });

  it("gives each row a key from its round and franchises", () => {
    const rows = fixtureRows([fixture(3, "csk", false)], null);

    expect(rows[0]?.key).toBe("3:csk:away");
  });

  it("marks the match at the reveal position in play, with no result yet", () => {
    const rows = fixtureRows(
      [fixture(1, "csk", true), fixture(1, "mi", true), fixture(1, "gt", true)],
      { round: 1, shown: 1 },
    );

    expect(rows.map((row) => row.status)).toEqual([
      "played",
      "in-play",
      "to-play",
    ]);
    expect(rows[1]?.result).toBeNull();
    expect(rows[2]?.result).toBeNull();
  });

  it("leaves fixtures in other rounds alone while a round is revealed", () => {
    const rows = fixtureRows(
      [fixture(1, "csk", true), fixture(2, "mi", true)],
      { round: 1, shown: 0 },
    );

    expect(rows[1]).toMatchObject({ status: "played", result: score });
  });

  it("shows nothing in play once every match in the round has shown", () => {
    const rows = fixtureRows([fixture(1, "csk", true)], { round: 1, shown: 1 });

    expect(rows[0]).toMatchObject({ status: "played", result: score });
  });
});
