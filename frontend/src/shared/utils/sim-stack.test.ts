import { describe, expect, it } from "vitest";

import type { Fixture } from "../types/league.types";
import type { Substitution } from "../types/lobby.types";
import { type StackInput, stackEntries } from "./sim-stack";

/**
 * A league fixture, played or still to play.
 *
 * @param home - The home franchise.
 * @param away - The away franchise.
 * @param played - Whether the match has a result.
 * @returns The fixture.
 */
function fixture(home: string, away: string, played: boolean): Fixture {
  return {
    round: 1,
    homeFranchiseId: home,
    awayFranchiseId: away,
    result: played
      ? {
          homeRuns: 150,
          homeWickets: 4,
          awayRuns: 120,
          awayWickets: 10,
          winnerFranchiseId: home,
        }
      : null,
  };
}

/**
 * A substitution record.
 *
 * @param matchesPlayed - How many matches had been played when it was confirmed.
 * @param guestId - The owner who made it.
 * @returns The record.
 */
function sub(matchesPlayed: number, guestId = "g1"): Substitution {
  return {
    guestId,
    outPlayerId: `out-${matchesPlayed}-${guestId}`,
    inPlayerId: `in-${matchesPlayed}-${guestId}`,
    matchesPlayed,
  };
}

/**
 * Stack input with nothing happening, overridden by the test.
 *
 * @param overrides - The fields to set.
 * @returns The input.
 */
function input(overrides: Partial<StackInput>): StackInput {
  return {
    fixtures: [],
    revealed: 0,
    substitutions: [],
    skippedAfterMatches: null,
    substituting: [],
    ...overrides,
  };
}

/**
 * A short label for each entry, so a test reads as the order it expects.
 *
 * @param entries - The stack entries.
 * @returns One label per entry, newest first.
 */
function labels(entries: ReturnType<typeof stackEntries>): string[] {
  return entries.map((entry) => {
    switch (entry.kind) {
      case "pause":
        return "pause";
      case "in-play":
        return `in-play:${entry.index}`;
      case "match":
        return `match:${entry.index}`;
      case "substitution":
        return `sub:${entry.substitution.matchesPlayed}:${entry.substitution.guestId}`;
      case "skip":
        return `skip:${entry.matchesPlayed}`;
      default:
        return "unknown";
    }
  });
}

describe("stackEntries", () => {
  it("is empty before the first match is in play", () => {
    const fixtures = [fixture("a", "b", false)];
    expect(stackEntries(input({ fixtures }))).toEqual([]);
  });

  it("shows the match in play on top, with no result", () => {
    const fixtures = [fixture("a", "b", true), fixture("c", "d", true)];
    const entries = stackEntries(input({ fixtures, revealed: 0 }));
    expect(labels(entries)).toEqual(["in-play:0"]);
  });

  it("shows the completed matches below the match in play, newest first", () => {
    const fixtures = [
      fixture("a", "b", true),
      fixture("c", "d", true),
      fixture("e", "f", true),
    ];
    const entries = stackEntries(input({ fixtures, revealed: 2 }));
    expect(labels(entries)).toEqual(["in-play:2", "match:1", "match:0"]);
  });

  it("never shows a fixture that has not been played", () => {
    const fixtures = [
      fixture("a", "b", true),
      fixture("c", "d", true),
      fixture("e", "f", false),
    ];
    const entries = stackEntries(input({ fixtures, revealed: 2 }));
    expect(labels(entries)).toEqual(["match:1", "match:0"]);
  });

  it("shows the pause at the top while a substitution is open", () => {
    const fixtures = [fixture("a", "b", true)];
    const entries = stackEntries(
      input({ fixtures, revealed: 1, substituting: ["g1"] }),
    );
    expect(labels(entries)).toEqual(["pause", "match:0"]);
    expect(entries[0]).toEqual({ kind: "pause", guestIds: ["g1"] });
  });

  it("places a substitution between the match before it and the match after it", () => {
    const fixtures = [
      fixture("a", "b", true),
      fixture("c", "d", true),
      fixture("e", "f", true),
    ];
    const entries = stackEntries(
      input({ fixtures, revealed: 3, substitutions: [sub(2)] }),
    );
    expect(labels(entries)).toEqual([
      "match:2",
      "sub:2:g1",
      "match:1",
      "match:0",
    ]);
  });

  it("places a substitution made at the viewer's position below the match in play", () => {
    const fixtures = [fixture("a", "b", true), fixture("c", "d", true)];
    const entries = stackEntries(
      input({ fixtures, revealed: 1, substitutions: [sub(1)] }),
    );
    expect(labels(entries)).toEqual(["in-play:1", "sub:1:g1", "match:0"]);
  });

  it("hides a substitution the viewer has not reached yet", () => {
    const fixtures = [fixture("a", "b", true), fixture("c", "d", true)];
    const entries = stackEntries(
      input({ fixtures, revealed: 0, substitutions: [sub(1)] }),
    );
    expect(labels(entries)).toEqual(["in-play:0"]);
  });

  it("lists two substitutions at one point newest first", () => {
    const fixtures = [fixture("a", "b", true), fixture("c", "d", true)];
    const entries = stackEntries(
      input({
        fixtures,
        revealed: 2,
        substitutions: [sub(1, "g1"), sub(1, "g2")],
      }),
    );
    expect(labels(entries)).toEqual([
      "match:1",
      "sub:1:g2",
      "sub:1:g1",
      "match:0",
    ]);
  });

  it("hides a playoff-era substitution until every league match is shown, then puts it on top", () => {
    const fixtures = [fixture("a", "b", true), fixture("c", "d", true)];
    const hidden = stackEntries(
      input({ fixtures, revealed: 1, substitutions: [sub(3)] }),
    );
    expect(labels(hidden)).toEqual(["in-play:1", "match:0"]);

    const shown = stackEntries(
      input({ fixtures, revealed: 2, substitutions: [sub(2), sub(3)] }),
    );
    expect(labels(shown)).toEqual([
      "sub:3:g1",
      "sub:2:g1",
      "match:1",
      "match:0",
    ]);
  });

  it("places the skip after the matches played before it", () => {
    const fixtures = [
      fixture("a", "b", true),
      fixture("c", "d", true),
      fixture("e", "f", true),
    ];
    const entries = stackEntries(
      input({ fixtures, revealed: 3, skippedAfterMatches: 1 }),
    );
    expect(labels(entries)).toEqual([
      "match:2",
      "match:1",
      "skip:1",
      "match:0",
    ]);
  });

  it("hides the skip until the viewer has reached it", () => {
    const fixtures = [fixture("a", "b", true), fixture("c", "d", true)];
    const entries = stackEntries(
      input({ fixtures, revealed: 0, skippedAfterMatches: 1 }),
    );
    expect(labels(entries)).toEqual(["in-play:0"]);
  });
});
