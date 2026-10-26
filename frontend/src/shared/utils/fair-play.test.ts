import { describe, expect, it } from "vitest";

import { FAIR_PLAY_MAX_SCORE } from "../const/awards.const";
import {
  averageEffect,
  type FairPlayEntry,
  fairPlayColumns,
  fairPlayFactor,
  mean,
  pickFairPlayWinner,
  playerMatchScore,
} from "./fair-play";

/**
 * A franchise's fair-play entry with the given figures.
 *
 * @param franchiseId - The franchise.
 * @param standing - The season standing.
 * @param points - League points.
 * @param netRunRate - Net run rate.
 * @returns The entry.
 */
function entry(
  franchiseId: string,
  standing: number,
  points = 0,
  netRunRate = 0,
): FairPlayEntry {
  return { franchiseId, standing, points, netRunRate };
}

describe("fairPlayFactor", () => {
  it("runs from 0.5 up to just under 1.5", () => {
    expect(fairPlayFactor(0)).toBe(0.5);
    expect(fairPlayFactor(0.999)).toBeLessThan(1.5);
  });
});

describe("playerMatchScore", () => {
  it("scores a clean record at the maximum", () => {
    expect(playerMatchScore(0, 1)).toBe(FAIR_PLAY_MAX_SCORE);
  });

  it("takes the trouble rating off the maximum, scaled by the factor", () => {
    expect(playerMatchScore(4, 1)).toBe(6);
    expect(playerMatchScore(4, 0.5)).toBe(8);
  });

  it("keeps a score between zero and the maximum", () => {
    expect(playerMatchScore(10, 1.5)).toBe(0);
  });
});

describe("mean", () => {
  it("averages the values", () => {
    expect(mean([2, 4, 9])).toBe(5);
  });

  it("is zero when there are no values", () => {
    expect(mean([])).toBe(0);
  });
});

describe("averageEffect", () => {
  it("is zero for a player who always scores the maximum", () => {
    expect(averageEffect([10, 10])).toBe(0);
  });

  it("is the shortfall from the maximum on average", () => {
    expect(averageEffect([6, 8])).toBe(-3);
  });
});

describe("pickFairPlayWinner", () => {
  it("is null when no franchise has played", () => {
    expect(pickFairPlayWinner([])).toBeNull();
  });

  it("gives the award to the best season standing", () => {
    expect(pickFairPlayWinner([entry("csk", 7), entry("mi", 9)])).toBe("mi");
  });

  it("breaks a standing tie on league points", () => {
    expect(pickFairPlayWinner([entry("csk", 8, 4), entry("mi", 8, 6)])).toBe(
      "mi",
    );
  });

  it("breaks a points tie on net run rate", () => {
    expect(
      pickFairPlayWinner([entry("csk", 8, 4, 0.1), entry("mi", 8, 4, 0.4)]),
    ).toBe("mi");
  });

  it("breaks a last tie on franchise id", () => {
    expect(
      pickFairPlayWinner([entry("mi", 8, 4, 0.1), entry("csk", 8, 4, 0.1)]),
    ).toBe("csk");
  });
});

describe("fairPlayColumns", () => {
  it("names the two players with the largest shortfall as pulling the rating down", () => {
    const columns = fairPlayColumns([
      { playerId: "a", averageEffect: -1 },
      { playerId: "b", averageEffect: -4 },
      { playerId: "c", averageEffect: -2 },
    ]);

    expect(columns.lowering.map((item) => item.playerId)).toEqual(["b", "c"]);
  });

  it("names no one as pulling the rating down when nobody dropped below the maximum", () => {
    const columns = fairPlayColumns([{ playerId: "a", averageEffect: 0 }]);

    expect(columns.lowering).toEqual([]);
  });

  it("names the two players closest to the maximum as holding the rating up", () => {
    const columns = fairPlayColumns([
      { playerId: "a", averageEffect: -1 },
      { playerId: "b", averageEffect: 0 },
      { playerId: "c", averageEffect: 0 },
    ]);

    expect(columns.lifting.map((item) => item.playerId)).toEqual(["b", "c"]);
  });
});
