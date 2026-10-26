import { describe, expect, it } from "vitest";

import { OVERS_PER_INNINGS } from "../const/league.const";
import type { Fixture, Standing } from "../types/league.types";
import {
  buildStandings,
  compareStandings,
  formatNetRunRate,
  netRunRate,
  sortStandings,
} from "./standings";

/**
 * A fixture between two franchises. Pass `null` for an unplayed match.
 *
 * @param home - The home franchise.
 * @param away - The away franchise.
 * @param result - The score as home runs, away runs and the winner (null for a tie).
 * @returns A fixture in round 1.
 */
function fixture(
  home: string,
  away: string,
  result: { homeRuns: number; awayRuns: number; winner: string | null } | null,
): Fixture {
  return {
    round: 1,
    homeFranchiseId: home,
    awayFranchiseId: away,
    result:
      result === null
        ? null
        : {
            homeRuns: result.homeRuns,
            homeWickets: 5,
            awayRuns: result.awayRuns,
            awayWickets: 5,
            winnerFranchiseId: result.winner,
          },
  };
}

/**
 * Builds a table row with the given values, so comparison tests can pick them.
 *
 * @param franchiseId - The franchise.
 * @param values - The fields that matter to the order.
 * @returns A standing with the other fields zeroed.
 */
function row(
  franchiseId: string,
  values: Partial<
    Pick<Standing, "points" | "netRunRate" | "won" | "played" | "lost">
  >,
): Standing {
  return {
    franchiseId,
    played: 0,
    won: 0,
    tied: 0,
    lost: 0,
    points: 0,
    runsFor: 0,
    runsAgainst: 0,
    netRunRate: 0,
    ...values,
  };
}

describe("netRunRate", () => {
  it("divides the run difference by the overs played", () => {
    expect(netRunRate(300, 240, 2)).toBeCloseTo(60 / (2 * OVERS_PER_INNINGS));
  });

  it("is zero when no match has been played", () => {
    expect(netRunRate(0, 0, 0)).toBe(0);
  });

  it("is negative when the franchise concedes more than it scores", () => {
    expect(netRunRate(100, 150, 1)).toBeLessThan(0);
  });
});

describe("compareStandings", () => {
  it("ranks more points first", () => {
    const more = row("csk", { points: 4 });
    const fewer = row("mi", { points: 2 });

    expect(compareStandings(more, fewer)).toBeLessThan(0);
  });

  it("breaks a points tie on net run rate", () => {
    const better = row("csk", { points: 2, netRunRate: 0.5 });
    const worse = row("mi", { points: 2, netRunRate: -0.1 });

    expect(compareStandings(better, worse)).toBeLessThan(0);
  });

  it("breaks a points and run-rate tie on franchise id", () => {
    const first = row("csk", { points: 2, netRunRate: 0.1 });
    const second = row("mi", { points: 2, netRunRate: 0.1 });

    expect(compareStandings(first, second)).toBeLessThan(0);
    expect(compareStandings(second, first)).toBeGreaterThan(0);
  });
});

describe("buildStandings", () => {
  it("gives every franchise a row, even with no matches", () => {
    const table = buildStandings(["csk", "mi"], []);

    expect(table).toHaveLength(2);
    expect(table.every((item) => item.played === 0 && item.points === 0)).toBe(
      true,
    );
  });

  it("gives 2 points for a win and none for the loss", () => {
    const table = buildStandings(
      ["csk", "mi"],
      [fixture("csk", "mi", { homeRuns: 170, awayRuns: 150, winner: "csk" })],
    );

    expect(table[0]).toMatchObject({
      franchiseId: "csk",
      won: 1,
      lost: 0,
      points: 2,
    });
    expect(table[1]).toMatchObject({
      franchiseId: "mi",
      won: 0,
      lost: 1,
      points: 0,
    });
  });

  it("gives 1 point each for a tie", () => {
    const table = buildStandings(
      ["csk", "mi"],
      [fixture("csk", "mi", { homeRuns: 150, awayRuns: 150, winner: null })],
    );

    expect(table.map((item) => [item.points, item.tied])).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });

  it("totals runs for and against from each side's view", () => {
    const table = buildStandings(
      ["csk", "mi"],
      [fixture("csk", "mi", { homeRuns: 170, awayRuns: 150, winner: "csk" })],
    );
    const csk = table.find((item) => item.franchiseId === "csk");
    const mi = table.find((item) => item.franchiseId === "mi");

    expect(csk).toMatchObject({ runsFor: 170, runsAgainst: 150 });
    expect(mi).toMatchObject({ runsFor: 150, runsAgainst: 170 });
    expect(csk?.netRunRate).toBeCloseTo(20 / OVERS_PER_INNINGS);
    expect(mi?.netRunRate).toBeCloseTo(-20 / OVERS_PER_INNINGS);
  });

  it("skips unplayed fixtures", () => {
    const table = buildStandings(["csk", "mi"], [fixture("csk", "mi", null)]);

    expect(table.every((item) => item.played === 0)).toBe(true);
  });

  it("skips a fixture naming a franchise that is not in the league", () => {
    const table = buildStandings(
      ["csk", "mi"],
      [
        fixture("csk", "ghost", {
          homeRuns: 170,
          awayRuns: 150,
          winner: "csk",
        }),
      ],
    );

    expect(table.every((item) => item.played === 0)).toBe(true);
  });

  it("orders the table by points, then run rate", () => {
    const table = buildStandings(
      ["csk", "mi", "gt"],
      [
        fixture("csk", "mi", { homeRuns: 160, awayRuns: 150, winner: "csk" }),
        fixture("gt", "csk", { homeRuns: 200, awayRuns: 120, winner: "gt" }),
      ],
    );

    expect(table.map((item) => item.franchiseId)).toEqual(["gt", "csk", "mi"]);
  });
});

describe("sortStandings", () => {
  const table = [
    row("csk", { points: 4, won: 2, played: 2, lost: 0, netRunRate: 0.2 }),
    row("mi", { points: 2, won: 1, played: 2, lost: 1, netRunRate: -0.1 }),
    row("gt", { points: 2, won: 1, played: 2, lost: 1, netRunRate: 0.4 }),
  ];

  it("sorts by a column in the requested direction", () => {
    const ascending = sortStandings(table, "points", "ascending");
    const descending = sortStandings(table, "points", "descending");

    expect(descending[0]?.franchiseId).toBe("csk");
    expect(ascending.at(-1)?.franchiseId).toBe("csk");
  });

  it("keeps table order for rows that tie on the column", () => {
    const sorted = sortStandings(table, "points", "ascending");

    expect(sorted.map((item) => item.franchiseId)).toEqual(["gt", "mi", "csk"]);
  });

  it("does not change the table it was given", () => {
    sortStandings(table, "netRunRate", "ascending");

    expect(table.map((item) => item.franchiseId)).toEqual(["csk", "mi", "gt"]);
  });
});

describe("formatNetRunRate", () => {
  it("adds a plus sign to a positive rate", () => {
    expect(formatNetRunRate(0.4821)).toBe("+0.482");
  });

  it("shows a negative rate with its minus sign", () => {
    expect(formatNetRunRate(-0.12)).toBe("-0.120");
  });

  it("shows zero without a sign", () => {
    expect(formatNetRunRate(0)).toBe("0.000");
  });
});
