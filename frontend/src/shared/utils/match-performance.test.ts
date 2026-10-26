import { describe, expect, it } from "vitest";

import { CATCH_RATE } from "../const/awards.const";
import {
  allocate,
  allocateMatch,
  type PlayerPerformance,
  type PlayingSide,
} from "./match-performance";

/**
 * A side of eleven players with the same ratings, in batting order.
 *
 * @param franchiseId - The franchise.
 * @param batting - The batting rating for every player.
 * @returns A playing side.
 */
function side(franchiseId: string, batting: number): PlayingSide {
  return {
    franchiseId,
    xi: Array.from({ length: 11 }, (_, index) => ({
      id: `${franchiseId}-${index + 1}`,
      batting,
      bowling: 60,
      fielding: 50,
    })),
  };
}

/**
 * Adds up one side's values from a list of performances.
 *
 * @param rows - The performances.
 * @param franchiseId - The side to add up.
 * @param pick - The value to add from each performance.
 * @returns The total.
 */
function total(
  rows: readonly PlayerPerformance[],
  franchiseId: string,
  pick: (row: PlayerPerformance) => number,
): number {
  return rows
    .filter((row) => row.franchiseId === franchiseId)
    .reduce((running, row) => running + pick(row), 0);
}

describe("allocate", () => {
  it("splits a total in proportion to the weights, and the shares add back up to it", () => {
    const shares = allocate(10, [
      { weight: 1 },
      { weight: 1 },
      { weight: 2 },
    ]).map((item) => item.share);

    expect(shares).toEqual([3, 2, 5]);
    expect(shares.reduce((running, share) => running + share, 0)).toBe(10);
  });

  it("splits equally when every weight is zero", () => {
    const shares = allocate(9, [
      { weight: 0 },
      { weight: 0 },
      { weight: 0 },
    ]).map((item) => item.share);

    expect(shares).toEqual([3, 3, 3]);
  });

  it("gives a zero-weight entry nothing", () => {
    const shares = allocate(6, [{ weight: 0 }, { weight: 1 }]).map(
      (item) => item.share,
    );

    expect(shares).toEqual([0, 6]);
  });

  it("gives the leftover units to the largest fractions, and a tie to the earlier entry", () => {
    const shares = allocate(2, [
      { weight: 1 },
      { weight: 1 },
      { weight: 1 },
    ]).map((item) => item.share);

    expect(shares).toEqual([1, 1, 0]);
  });

  it("returns the entries it was given, in order", () => {
    const entries = [
      { weight: 1, name: "first" },
      { weight: 1, name: "second" },
    ];

    expect(allocate(2, entries).map((item) => item.entry.name)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("allocateMatch", () => {
  const home = side("csk", 60);
  const away = side("mi", 50);
  const score = {
    homeRuns: 170,
    homeWickets: 5,
    awayRuns: 150,
    awayWickets: 8,
  };
  const rows = allocateMatch("seed", home, away, score);

  it("gives one performance per player on both sides", () => {
    expect(rows).toHaveLength(22);
    expect(rows.slice(0, 11).every((row) => row.franchiseId === "csk")).toBe(
      true,
    );
  });

  it("gives each side's batters exactly the runs the side scored", () => {
    expect(total(rows, "csk", (row) => row.runs)).toBe(170);
    expect(total(rows, "mi", (row) => row.runs)).toBe(150);
  });

  it("gives the bowling side exactly the wickets the batting side lost", () => {
    // Away bowls the first innings, so it takes home's five wickets.
    expect(total(rows, "mi", (row) => row.wickets)).toBe(5);
    expect(total(rows, "csk", (row) => row.wickets)).toBe(8);
  });

  it("gives the bowling side exactly the runs the batting side scored", () => {
    expect(total(rows, "mi", (row) => row.runsConceded)).toBe(170);
    expect(total(rows, "csk", (row) => row.runsConceded)).toBe(150);
  });

  it("gives the fielding side catches at the catch rate, rounded", () => {
    // Away fields the first innings, home fields the second.
    expect(total(rows, "mi", (row) => row.catches)).toBe(
      Math.round(5 * CATCH_RATE),
    );
    expect(total(rows, "csk", (row) => row.catches)).toBe(
      Math.round(8 * CATCH_RATE),
    );
  });

  it("lets only the batters who went in bat, one more than the wickets lost", () => {
    const homeBatters = rows.filter(
      (row) => row.franchiseId === "csk" && row.batted,
    );
    const awayBatters = rows.filter(
      (row) => row.franchiseId === "mi" && row.batted,
    );

    expect(homeBatters).toHaveLength(6);
    expect(awayBatters).toHaveLength(9);
    expect(
      rows.filter((row) => !row.batted).every((row) => row.runs === 0),
    ).toBe(true);
  });

  it("numbers batting positions in the order the side was given", () => {
    expect(rows.slice(0, 11).map((row) => row.battingPosition)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  it("gives the same split for the same seed", () => {
    expect(allocateMatch("seed", home, away, score)).toEqual(rows);
  });

  it("can split a different seed differently", () => {
    expect(allocateMatch("another", home, away, score)).not.toEqual(rows);
  });

  it("lets one batter bat when no wicket fell", () => {
    const none = allocateMatch("seed", home, away, {
      homeRuns: 40,
      homeWickets: 0,
      awayRuns: 0,
      awayWickets: 0,
    });

    expect(
      none.filter((row) => row.franchiseId === "csk" && row.batted),
    ).toHaveLength(1);
    expect(total(none, "mi", (row) => row.catches)).toBe(0);
  });
});
