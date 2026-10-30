import { describe, expect, it } from "vitest";

import type { FairPlayFranchise } from "../types/awards.types";
import type { Standing } from "../types/league.types";
import { rankFairPlay } from "./fair-play-ranking";

/**
 * A Fair Play entry with no players listed.
 *
 * @param franchiseId - The franchise.
 * @param standing - Its season fair-play standing.
 * @returns The entry.
 */
function fair(franchiseId: string, standing: number): FairPlayFranchise {
  return { franchiseId, standing, lowering: [], lifting: [] };
}

/**
 * A league row with only the fields the ranking reads.
 *
 * @param franchiseId - The franchise.
 * @param points - Its league points.
 * @param netRunRate - Its net run rate.
 * @returns The row.
 */
function row(
  franchiseId: string,
  points: number,
  netRunRate: number,
): Standing {
  return {
    franchiseId,
    played: 0,
    won: 0,
    tied: 0,
    lost: 0,
    points,
    runsFor: 0,
    runsAgainst: 0,
    netRunRate,
  };
}

describe("rankFairPlay", () => {
  it("ranks the higher fair-play standing first", () => {
    const ranked = rankFairPlay(
      [fair("csk", 6.1), fair("mi", 8.4), fair("kkr", 7.2)],
      [],
    );
    expect(ranked.map((entry) => entry.franchiseId)).toEqual([
      "mi",
      "kkr",
      "csk",
    ]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it("breaks a standing tie by league points", () => {
    const ranked = rankFairPlay(
      [fair("csk", 7), fair("mi", 7)],
      [row("csk", 10, 0.5), row("mi", 14, -0.2)],
    );
    expect(ranked.map((entry) => entry.franchiseId)).toEqual(["mi", "csk"]);
  });

  it("breaks a standing and points tie by net run rate", () => {
    const ranked = rankFairPlay(
      [fair("csk", 7), fair("mi", 7)],
      [row("csk", 10, 0.1), row("mi", 10, 0.6)],
    );
    expect(ranked.map((entry) => entry.franchiseId)).toEqual(["mi", "csk"]);
  });

  it("counts a franchise missing from the table as zero on both tie-breakers", () => {
    const ranked = rankFairPlay(
      [fair("csk", 7), fair("mi", 7)],
      [row("csk", 0, 0), row("mi", 0, -1)],
    );
    expect(ranked.map((entry) => entry.franchiseId)).toEqual(["csk", "mi"]);

    const withoutRows = rankFairPlay([fair("csk", 7), fair("mi", 7)], []);
    expect(withoutRows.map((entry) => entry.franchiseId)).toEqual([
      "csk",
      "mi",
    ]);
  });

  it("keeps each franchise's players with its entry", () => {
    const player = { playerId: "p1", name: "Ravi", averageEffect: -0.5 };
    const ranked = rankFairPlay(
      [{ franchiseId: "csk", standing: 5, lowering: [player], lifting: [] }],
      [],
    );
    expect(ranked[0]?.lowering).toEqual([player]);
  });
});
