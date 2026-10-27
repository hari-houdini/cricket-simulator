import { describe, expect, it } from "vitest";

import { FIRST_MATCH_ROUND } from "../const/squad.const";
import type { Player } from "../types/player.types";
import type { StartingXi } from "../types/squad.types";
import {
  isBowlingOption,
  isXiLocked,
  startingXiBlock,
  substitutionBlock,
  type XiSelection,
} from "./squad-rules";

/**
 * Builds a player for the rules. Only the role and bowling rating matter here.
 *
 * @param id - The player id.
 * @param role - The player's role.
 * @param bowling - The bowling rating.
 * @returns A player with the other fields fixed.
 */
function player(id: string, role: Player["role"], bowling = 0): Player {
  return {
    id,
    name: id,
    franchiseId: "csk",
    role,
    category: "capped",
    retired: false,
    batting: 50,
    bowling,
    fielding: 50,
    basePrice: 2000,
  };
}

/**
 * A 16-player squad: one wicket-keeper to spare, four bowlers, two all-rounders
 * (both bowling options), and nine batters. Any legal XI
 * can be built from it, and each test breaks one rule.
 */
const squad: Player[] = [
  player("wk1", "wicket-keeper"),
  player("wk2", "wicket-keeper"),
  player("b1", "bowler", 70),
  player("b2", "bowler", 70),
  player("b3", "bowler", 70),
  player("b4", "bowler", 70),
  player("ar1", "all-rounder"),
  player("ar2", "all-rounder"),
  player("bat1", "batter"),
  player("bat2", "batter"),
  player("bat3", "batter"),
  player("bat4", "batter"),
  player("bat5", "batter"),
  player("bat6", "batter"),
  player("bat7", "batter"),
  player("bat8", "batter"),
];

/**
 * A legal XI: wk1, four bowlers, the bowling all-rounder and five batters. The
 * captain is bat1 and the vice-captain b1.
 */
const legal: XiSelection = {
  playerIds: [
    "wk1",
    "b1",
    "b2",
    "b3",
    "b4",
    "ar1",
    "bat1",
    "bat2",
    "bat3",
    "bat4",
    "bat5",
  ],
  captainId: "bat1",
  viceCaptainId: "b1",
};

/**
 * Returns a copy of the legal XI with some changes.
 *
 * @param changes - Fields to replace.
 * @returns The changed selection.
 */
function change(changes: Partial<XiSelection>): XiSelection {
  return { ...legal, ...changes };
}

describe("isBowlingOption", () => {
  it("counts every bowler", () => {
    expect(isBowlingOption(player("b", "bowler", 0))).toBe(true);
  });

  it("counts every all-rounder, whatever their bowling rating", () => {
    expect(isBowlingOption(player("a", "all-rounder", 100))).toBe(true);
    expect(isBowlingOption(player("a", "all-rounder", 0))).toBe(true);
  });

  it("never counts batters or wicket-keepers", () => {
    expect(isBowlingOption(player("bat", "batter", 100))).toBe(false);
    expect(isBowlingOption(player("wk", "wicket-keeper", 100))).toBe(false);
  });
});

describe("startingXiBlock", () => {
  it("accepts a legal XI", () => {
    expect(startingXiBlock(squad, legal)).toBeNull();
  });

  it("refuses an XI that is not eleven players", () => {
    expect(
      startingXiBlock(squad, change({ playerIds: legal.playerIds.slice(1) })),
    ).toBe("wrong-size");
  });

  it("refuses an XI that lists a player twice", () => {
    expect(
      startingXiBlock(
        squad,
        change({ playerIds: [...legal.playerIds.slice(1), "b1"] }),
      ),
    ).toBe("duplicate");
  });

  it("refuses a player who is not in the squad", () => {
    expect(
      startingXiBlock(
        squad,
        change({ playerIds: [...legal.playerIds.slice(1), "ghost"] }),
      ),
    ).toBe("not-in-squad");
  });

  it("refuses a missing captain, and a captain who is not in the XI", () => {
    expect(startingXiBlock(squad, change({ captainId: null }))).toBe(
      "captain-not-in-xi",
    );
    expect(startingXiBlock(squad, change({ captainId: "bat8" }))).toBe(
      "captain-not-in-xi",
    );
  });

  it("refuses a missing vice-captain, and a vice-captain who is not in the XI", () => {
    expect(startingXiBlock(squad, change({ viceCaptainId: null }))).toBe(
      "vice-captain-not-in-xi",
    );
    expect(startingXiBlock(squad, change({ viceCaptainId: "bat8" }))).toBe(
      "vice-captain-not-in-xi",
    );
  });

  it("refuses the same player as captain and vice-captain", () => {
    expect(startingXiBlock(squad, change({ viceCaptainId: "bat1" }))).toBe(
      "same-captain-and-vice-captain",
    );
  });

  it("refuses an XI with no wicket-keeper", () => {
    const withoutKeeper = change({
      playerIds: legal.playerIds.map((id) => (id === "wk1" ? "bat6" : id)),
    });
    expect(startingXiBlock(squad, withoutKeeper)).toBe("no-wicket-keeper");
  });

  it("refuses an XI with two wicket-keepers", () => {
    const twoKeepers = change({
      playerIds: legal.playerIds.map((id) => (id === "bat5" ? "wk2" : id)),
    });
    expect(startingXiBlock(squad, twoKeepers)).toBe("too-many-wicket-keepers");
  });

  it("refuses an XI with fewer than four bowling options", () => {
    const fewBowlers = change({
      playerIds: legal.playerIds.map((id) => {
        if (id === "b4") return "bat6";
        if (id === "ar1") return "bat7";
        return id;
      }),
    });
    expect(startingXiBlock(squad, fewBowlers)).toBe("too-few-bowling-options");
  });

  it("checks size before membership, so a short XI reports its size", () => {
    expect(
      startingXiBlock(squad, change({ playerIds: ["ghost"], captainId: null })),
    ).toBe("wrong-size");
  });
});

describe("isXiLocked", () => {
  it("is open before the first match", () => {
    expect(isXiLocked(0)).toBe(false);
  });

  it("is locked from the first match on", () => {
    expect(isXiLocked(FIRST_MATCH_ROUND)).toBe(true);
    expect(isXiLocked(FIRST_MATCH_ROUND + 5)).toBe(true);
  });
});

describe("substitutionBlock", () => {
  const saved: StartingXi = {
    playerIds: [...legal.playerIds],
    captainId: "bat1",
    viceCaptainId: "b1",
  };

  /**
   * Builds a substitution check that is allowed by default, so each test
   * changes one thing.
   *
   * @param changes - Fields to replace.
   * @returns The check to pass to {@link substitutionBlock}.
   */
  function check(changes: Partial<Parameters<typeof substitutionBlock>[0]>) {
    return {
      squad,
      startingXi: saved,
      substitutionUsed: false,
      round: FIRST_MATCH_ROUND,
      outPlayerId: "bat5",
      inPlayerId: "bat6",
      ...changes,
    };
  }

  it("allows a legal swap after the first match", () => {
    expect(substitutionBlock(check({}))).toBeNull();
  });

  it("refuses any swap before the first match", () => {
    expect(substitutionBlock(check({ round: 0 }))).toBe("not-yet-played");
  });

  it("refuses a second swap", () => {
    expect(substitutionBlock(check({ substitutionUsed: true }))).toBe(
      "already-used",
    );
  });

  it("refuses a swap when no XI was saved", () => {
    expect(substitutionBlock(check({ startingXi: null }))).toBe(
      "no-starting-xi",
    );
  });

  it("refuses to take off a player who is not in the XI", () => {
    expect(substitutionBlock(check({ outPlayerId: "bat8" }))).toBe(
      "out-not-in-xi",
    );
  });

  it("refuses to take off the captain or the vice-captain", () => {
    expect(substitutionBlock(check({ outPlayerId: "bat1" }))).toBe(
      "captain-or-vice-captain",
    );
    expect(substitutionBlock(check({ outPlayerId: "b1" }))).toBe(
      "captain-or-vice-captain",
    );
  });

  it("refuses to bring on a player who is not in the squad", () => {
    expect(substitutionBlock(check({ inPlayerId: "ghost" }))).toBe(
      "in-not-in-squad",
    );
  });

  it("refuses to bring on a player who is already in the XI", () => {
    expect(substitutionBlock(check({ inPlayerId: "bat2" }))).toBe(
      "in-already-in-xi",
    );
  });

  it("refuses a swap that leaves an illegal XI, and names the XI rule", () => {
    // Taking off the only wicket-keeper leaves the XI without one.
    expect(
      substitutionBlock(check({ outPlayerId: "wk1", inPlayerId: "bat6" })),
    ).toBe("no-wicket-keeper");
  });
});
