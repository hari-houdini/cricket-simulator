import { describe, expect, it } from "vitest";

import type { Owner } from "../types/lobby.types";
import { ownersInFixture } from "./owner-match";

/**
 * An owner holding a franchise.
 *
 * @param guestId - The owner's guest ID.
 * @param franchiseId - The franchise the owner holds.
 * @returns The owner.
 */
function owner(guestId: string, franchiseId: string | null): Owner {
  return { guestId, displayName: guestId, franchiseId };
}

describe("ownersInFixture", () => {
  const owners = [
    owner("ravi", "csk"),
    owner("meera", "mi"),
    owner("sam", null),
  ];

  it("returns both owners for a match between two owners, home first", () => {
    const result = ownersInFixture(
      { homeFranchiseId: "mi", awayFranchiseId: "csk" },
      owners,
    );
    expect(result.map((item) => item.guestId)).toEqual(["meera", "ravi"]);
  });

  it("returns the one owner for a match with one owner", () => {
    const result = ownersInFixture(
      { homeFranchiseId: "csk", awayFranchiseId: "kkr" },
      owners,
    );
    expect(result.map((item) => item.guestId)).toEqual(["ravi"]);
  });

  it("returns no owners for a match with none", () => {
    const result = ownersInFixture(
      { homeFranchiseId: "kkr", awayFranchiseId: "rcb" },
      owners,
    );
    expect(result).toEqual([]);
  });

  it("ignores an owner who holds no franchise yet", () => {
    const result = ownersInFixture(
      { homeFranchiseId: "kkr", awayFranchiseId: "rcb" },
      [owner("sam", null)],
    );
    expect(result).toEqual([]);
  });
});
