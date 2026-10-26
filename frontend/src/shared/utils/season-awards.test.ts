import { describe, expect, it } from "vitest";

import {
  compareEmerging,
  compareOrangeCap,
  comparePurpleCap,
  franchiseFairPlay,
  type PerformanceRow,
  type PlayerSeason,
  playerSeasons,
  topTwo,
} from "./season-awards";

/**
 * A performance row with the given figures. Unspecified figures are zero.
 *
 * @param values - The row's fields.
 * @returns The row.
 */
function row(
  values: Partial<PerformanceRow> &
    Pick<PerformanceRow, "playerId" | "franchiseId">,
): PerformanceRow {
  return {
    matchKey: "m1",
    batted: false,
    runs: 0,
    wickets: 0,
    runsConceded: 0,
    fantasyPoints: 0,
    fairPlayScore: 10,
    ...values,
  };
}

/**
 * A season total with the given figures.
 *
 * @param playerId - The player.
 * @param values - The totals that matter to the ranking.
 * @returns The season.
 */
function season(
  playerId: string,
  values: Partial<PlayerSeason> = {},
): PlayerSeason {
  return {
    playerId,
    franchiseId: "csk",
    innings: 0,
    runs: 0,
    wickets: 0,
    runsConceded: 0,
    fantasyPoints: 0,
    fairPlayScores: [],
    ...values,
  };
}

describe("playerSeasons", () => {
  it("adds a player's matches together, counting innings only where he batted", () => {
    const [only] = playerSeasons([
      row({
        playerId: "kohli",
        franchiseId: "rcb",
        batted: true,
        runs: 30,
        fantasyPoints: 30,
      }),
      row({
        playerId: "kohli",
        franchiseId: "rcb",
        batted: false,
        wickets: 1,
        fantasyPoints: 20,
      }),
    ]);

    expect(only).toMatchObject({
      innings: 1,
      runs: 30,
      wickets: 1,
      fantasyPoints: 50,
    });
    expect(only?.fairPlayScores).toEqual([10, 10]);
  });

  it("keeps players in the order they first appear", () => {
    const seasons = playerSeasons([
      row({ playerId: "b", franchiseId: "mi" }),
      row({ playerId: "a", franchiseId: "csk" }),
      row({ playerId: "b", franchiseId: "mi" }),
    ]);

    expect(seasons.map((item) => item.playerId)).toEqual(["b", "a"]);
  });

  it("is empty before any match is played", () => {
    expect(playerSeasons([])).toEqual([]);
  });
});

describe("franchiseFairPlay", () => {
  it("takes a franchise's standing as the average of its team ratings per match", () => {
    const [csk] = franchiseFairPlay([
      row({
        matchKey: "m1",
        playerId: "a",
        franchiseId: "csk",
        fairPlayScore: 8,
      }),
      row({
        matchKey: "m1",
        playerId: "b",
        franchiseId: "csk",
        fairPlayScore: 6,
      }),
      row({
        matchKey: "m2",
        playerId: "a",
        franchiseId: "csk",
        fairPlayScore: 10,
      }),
    ]);

    // Match 1 rates 7 and match 2 rates 10, so the standing is 8.5.
    expect(csk?.standing).toBe(8.5);
  });

  it("gives each player the average shortfall from the maximum across the season", () => {
    const [csk] = franchiseFairPlay([
      row({
        matchKey: "m1",
        playerId: "a",
        franchiseId: "csk",
        fairPlayScore: 6,
      }),
      row({
        matchKey: "m2",
        playerId: "a",
        franchiseId: "csk",
        fairPlayScore: 8,
      }),
    ]);

    expect(csk?.effects).toEqual([{ playerId: "a", averageEffect: -3 }]);
  });

  it("keeps each franchise's players apart", () => {
    const result = franchiseFairPlay([
      row({
        matchKey: "m1",
        playerId: "a",
        franchiseId: "csk",
        fairPlayScore: 4,
      }),
      row({
        matchKey: "m1",
        playerId: "a",
        franchiseId: "mi",
        fairPlayScore: 10,
      }),
    ]);

    expect(result.map((item) => item.franchiseId)).toEqual(["csk", "mi"]);
    expect(result[1]?.effects).toEqual([{ playerId: "a", averageEffect: 0 }]);
  });

  it("is empty before any match is played", () => {
    expect(franchiseFairPlay([])).toEqual([]);
  });
});

describe("topTwo", () => {
  it("is empty for no items", () => {
    expect(topTwo([], (left: number, right: number) => left - right)).toEqual({
      winner: null,
      runnerUp: null,
    });
  });

  it("gives the winner and the runner-up, with no runner-up for a single item", () => {
    expect(topTwo([3], (left, right) => left - right)).toEqual({
      winner: 3,
      runnerUp: null,
    });
  });

  it("ranks the rest by the comparison", () => {
    expect(topTwo([1, 9, 4], (left, right) => right - left)).toEqual({
      winner: 9,
      runnerUp: 4,
    });
  });
});

describe("cap comparisons", () => {
  it("ranks Orange Cap by runs, then player id", () => {
    expect(
      compareOrangeCap(season("a", { runs: 500 }), season("b", { runs: 400 })),
    ).toBeLessThan(0);
    expect(
      compareOrangeCap(season("a", { runs: 300 }), season("b", { runs: 300 })),
    ).toBeLessThan(0);
  });

  it("ranks Purple Cap by wickets, then fewer runs conceded, then player id", () => {
    expect(
      comparePurpleCap(
        season("a", { wickets: 20 }),
        season("b", { wickets: 15 }),
      ),
    ).toBeLessThan(0);
    expect(
      comparePurpleCap(
        season("a", { wickets: 15, runsConceded: 300 }),
        season("b", { wickets: 15, runsConceded: 280 }),
      ),
    ).toBeGreaterThan(0);
    expect(
      comparePurpleCap(
        season("a", { wickets: 15, runsConceded: 280 }),
        season("b", { wickets: 15, runsConceded: 280 }),
      ),
    ).toBeLessThan(0);
  });

  it("ranks Emerging Player by fantasy points, then player id", () => {
    expect(
      compareEmerging(
        season("a", { fantasyPoints: 90 }),
        season("b", { fantasyPoints: 60 }),
      ),
    ).toBeLessThan(0);
    expect(
      compareEmerging(
        season("b", { fantasyPoints: 60 }),
        season("a", { fantasyPoints: 60 }),
      ),
    ).toBeGreaterThan(0);
  });
});
