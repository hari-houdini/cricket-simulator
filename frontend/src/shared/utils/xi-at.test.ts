import { describe, expect, it } from "vitest";

import type { Substitution } from "../types/lobby.types";
import type { StartingXi } from "../types/squad.types";
import { xiAt } from "./xi-at";

/** The XI as the owner first saved it, before any substitution. */
const SAVED: StartingXi = {
  playerIds: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
  captainId: "a",
  viceCaptainId: "b",
};

/** The XI the backend stores after `d` is replaced by `z`. The stored XI is always the current one. */
const AFTER_D_FOR_Z: StartingXi = {
  ...SAVED,
  playerIds: ["a", "b", "c", "z", "e", "f", "g", "h", "i", "j", "k"],
};

/** The XI after `z` is replaced by `y` as well. */
const AFTER_Z_FOR_Y: StartingXi = {
  ...SAVED,
  playerIds: ["a", "b", "c", "y", "e", "f", "g", "h", "i", "j", "k"],
};

/**
 * A substitution record.
 *
 * @param guestId - The owner who made it.
 * @param outPlayerId - The player who left the XI.
 * @param inPlayerId - The player who came into the XI.
 * @param matchesPlayed - How many matches had been played when it was confirmed.
 * @returns The record.
 */
function sub(
  guestId: string,
  outPlayerId: string,
  inPlayerId: string,
  matchesPlayed: number,
): Substitution {
  return { guestId, outPlayerId, inPlayerId, matchesPlayed };
}

describe("xiAt", () => {
  it("returns null when the owner saved no XI", () => {
    expect(xiAt(null, [sub("g1", "d", "z", 1)], "g1", 3)).toBeNull();
  });

  it("returns the stored XI when there are no substitutions", () => {
    expect(xiAt(SAVED, [], "g1", 3)).toEqual(SAVED);
  });

  it("keeps a substitution made at or before the point", () => {
    const made = [sub("g1", "d", "z", 2)];
    expect(xiAt(AFTER_D_FOR_Z, made, "g1", 2)).toEqual(AFTER_D_FOR_Z);
  });

  it("undoes a substitution made after the point", () => {
    const made = [sub("g1", "d", "z", 5)];
    expect(xiAt(AFTER_D_FOR_Z, made, "g1", 4)).toEqual(SAVED);
  });

  it("undoes later substitutions newest first, so a player who came in and went out is restored", () => {
    const made = [sub("g1", "d", "z", 2), sub("g1", "z", "y", 4)];
    expect(xiAt(AFTER_Z_FOR_Y, made, "g1", 1)).toEqual(SAVED);
    expect(xiAt(AFTER_Z_FOR_Y, made, "g1", 3)).toEqual(AFTER_D_FOR_Z);
    expect(xiAt(AFTER_Z_FOR_Y, made, "g1", 4)).toEqual(AFTER_Z_FOR_Y);
  });

  it("ignores substitutions made by other owners", () => {
    const made = [sub("g2", "d", "z", 5)];
    expect(xiAt(AFTER_D_FOR_Z, made, "g1", 1)).toEqual(AFTER_D_FOR_Z);
  });

  it("keeps the captain and vice-captain when a substitution is undone", () => {
    const made = [sub("g1", "d", "z", 5)];
    const rebuilt = xiAt(AFTER_D_FOR_Z, made, "g1", 0);
    expect(rebuilt?.captainId).toBe("a");
    expect(rebuilt?.viceCaptainId).toBe("b");
  });
});
