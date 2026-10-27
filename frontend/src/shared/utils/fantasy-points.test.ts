import { describe, expect, it } from "vitest";

import {
  fantasyPointsFor,
  multiplierFor,
  pickManOfTheMatch,
  type ScoringLine,
} from "./fantasy-points";

/**
 * A scoring line with the given figures. Batting position defaults to 1.
 *
 * @param playerId - The player.
 * @param values - Runs, wickets, catches and fantasy points.
 * @returns The line.
 */
function line(
  playerId: string,
  values: {
    runs?: number;
    wickets?: number;
    catches?: number;
    points?: number;
    battingPosition?: number;
  },
): ScoringLine & { fantasyPoints: number } {
  return {
    playerId,
    runs: values.runs ?? 0,
    wickets: values.wickets ?? 0,
    catches: values.catches ?? 0,
    battingPosition: values.battingPosition ?? 1,
    fantasyPoints: values.points ?? 0,
  };
}

describe("fantasyPointsFor", () => {
  it("scores runs, wickets and catches at their rates", () => {
    expect(fantasyPointsFor({ runs: 30, wickets: 2, catches: 1 })).toBe(
      30 + 40 + 10,
    );
  });

  it("is zero for a player who did nothing", () => {
    expect(fantasyPointsFor({ runs: 0, wickets: 0, catches: 0 })).toBe(0);
  });
});

describe("multiplierFor", () => {
  it("scales a captain's points by one and a half", () => {
    expect(multiplierFor("captain")).toBe(1.5);
  });

  it("scales a vice-captain's points by one and a quarter", () => {
    expect(multiplierFor("vice-captain")).toBe(1.25);
  });

  it("leaves everyone else at one", () => {
    expect(multiplierFor("none")).toBe(1);
  });
});

describe("pickManOfTheMatch", () => {
  it("is null when nobody played", () => {
    expect(pickManOfTheMatch([])).toBeNull();
  });

  it("picks the player with the most fantasy points", () => {
    const winner = pickManOfTheMatch([
      line("a", { points: 30 }),
      line("b", { points: 55 }),
    ]);

    expect(winner).toBe("b");
  });

  it("breaks a points tie on runs plus twenty times wickets", () => {
    const winner = pickManOfTheMatch([
      line("bowler", { points: 40, wickets: 2, runs: 0 }),
      line("batter", { points: 40, runs: 40, wickets: 0 }),
    ]);

    expect(winner).toBe("batter");
  });

  it("breaks a further tie on the earlier batting position", () => {
    const winner = pickManOfTheMatch([
      line("late", { points: 20, battingPosition: 9 }),
      line("early", { points: 20, battingPosition: 3 }),
    ]);

    expect(winner).toBe("early");
  });

  it("breaks the last tie on player id, so the same match always names the same player", () => {
    const winner = pickManOfTheMatch([
      line("zed", { points: 20, battingPosition: 2 }),
      line("ash", { points: 20, battingPosition: 2 }),
    ]);

    expect(winner).toBe("ash");
  });
});
