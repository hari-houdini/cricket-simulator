import { describe, expect, it } from "vitest";

import {
  MAX_INNINGS_RUNS,
  MAX_WICKETS,
  MIN_INNINGS_RUNS,
  MIN_WICKETS,
} from "../const/match.const";
import { XI_SIZE } from "../const/squad.const";
import type { Player } from "../types/player.types";
import { simulateMatch, strongestXi, teamStrength } from "./match-simulator";

/**
 * Builds a player with the given ratings. Only the ratings matter to the simulator.
 *
 * @param id - The player id.
 * @param ratings - Batting, bowling and fielding.
 * @returns A player.
 */
function player(
  id: string,
  ratings: { batting: number; bowling: number; fielding: number },
): Player {
  return {
    id,
    name: id,
    franchiseId: "csk",
    role: "batter",
    category: "capped",
    retired: false,
    basePrice: 200,
    ...ratings,
  };
}

/**
 * A draw source that returns the same value every time, so a test can pick
 * exact draws.
 *
 * @param value - The value to return, in [0, 1).
 * @returns A draw function.
 */
function constant(value: number): () => number {
  return () => value;
}

describe("teamStrength", () => {
  it("averages batting and bowling across the players", () => {
    const strength = teamStrength([
      player("a", { batting: 80, bowling: 20, fielding: 0 }),
      player("b", { batting: 40, bowling: 60, fielding: 0 }),
    ]);

    expect(strength).toEqual({ batting: 60, bowling: 40 });
  });

  it("is zero for a team with no players", () => {
    expect(teamStrength([])).toEqual({ batting: 0, bowling: 0 });
  });
});

describe("strongestXi", () => {
  it("keeps the strongest eleven by total rating, in order", () => {
    const squad = Array.from({ length: XI_SIZE + 2 }, (_, index) =>
      player(`p${index}`, { batting: index, bowling: 0, fielding: 0 }),
    );

    const xi = strongestXi(squad);

    expect(xi).toHaveLength(XI_SIZE);
    expect(xi[0]?.id).toBe(`p${XI_SIZE + 1}`);
    expect(xi.at(-1)?.id).toBe("p2");
  });

  it("returns the whole squad when it has fewer than eleven players", () => {
    const squad = [player("a", { batting: 1, bowling: 1, fielding: 1 })];

    expect(strongestXi(squad)).toHaveLength(1);
  });

  it("does not reorder the squad it is given", () => {
    const squad = [
      player("low", { batting: 1, bowling: 1, fielding: 1 }),
      player("high", { batting: 90, bowling: 90, fielding: 90 }),
    ];

    strongestXi(squad);

    expect(squad.map((item) => item.id)).toEqual(["low", "high"]);
  });
});

describe("simulateMatch", () => {
  const even = { batting: 50, bowling: 50 };

  it("gives the higher total the win", () => {
    // Home draws the top of the range and away the bottom, so home scores more.
    const outcome = simulateMatch(
      even,
      even,
      (() => {
        const draws = [1 - 1e-9, 0, 0, 0];
        let index = 0;
        return () => draws[index++] ?? 0;
      })(),
    );

    expect(outcome.winner).toBe("home");
    expect(outcome.homeRuns).toBeGreaterThan(outcome.awayRuns);
  });

  it("gives the away side the win when it scores more", () => {
    const outcome = simulateMatch(
      even,
      even,
      (() => {
        const draws = [0, 0, 1 - 1e-9, 0];
        let index = 0;
        return () => draws[index++] ?? 0;
      })(),
    );

    expect(outcome.winner).toBe("away");
  });

  it("calls equal totals a tie", () => {
    const outcome = simulateMatch(even, even, constant(0.5));

    expect(outcome.homeRuns).toBe(outcome.awayRuns);
    expect(outcome.winner).toBeNull();
  });

  it("keeps every total inside the allowed runs range", () => {
    const low = simulateMatch(
      { batting: 0, bowling: 100 },
      { batting: 0, bowling: 0 },
      constant(0),
    );
    const high = simulateMatch(
      { batting: 100, bowling: 0 },
      { batting: 100, bowling: 0 },
      constant(0.999),
    );

    for (const total of [
      low.homeRuns,
      low.awayRuns,
      high.homeRuns,
      high.awayRuns,
    ]) {
      expect(total).toBeGreaterThanOrEqual(MIN_INNINGS_RUNS);
      expect(total).toBeLessThanOrEqual(MAX_INNINGS_RUNS);
    }
  });

  it("keeps every wicket count inside the allowed range", () => {
    for (const draw of [0, 0.5, 0.999]) {
      const outcome = simulateMatch(even, even, constant(draw));
      expect(outcome.homeWickets).toBeGreaterThanOrEqual(MIN_WICKETS);
      expect(outcome.homeWickets).toBeLessThanOrEqual(MAX_WICKETS);
      expect(outcome.awayWickets).toBeGreaterThanOrEqual(MIN_WICKETS);
      expect(outcome.awayWickets).toBeLessThanOrEqual(MAX_WICKETS);
    }
  });

  it("is the same for the same draws", () => {
    const first = simulateMatch(even, even, constant(0.3));
    const second = simulateMatch(even, even, constant(0.3));

    expect(first).toEqual(second);
  });
});
