import { describe, expect, it } from "vitest";

import type { Lobby } from "../types/lobby.types";
import { franchiseClaimBlock, franchiseStatus } from "./franchise-claim";

const lobby: Lobby = {
  id: "lobby-1",
  code: "ABC123",
  name: "Sunday League",
  phase: "auction",
  round: 0,
  seedVersion: "1.1.0",
  owners: [
    { guestId: "asha", displayName: "Asha", franchiseId: "csk" },
    { guestId: "ravi", displayName: "Ravi", franchiseId: null },
  ],
};

describe("franchiseClaimBlock", () => {
  it("allows a guest to claim a free franchise in the auction phase", () => {
    expect(franchiseClaimBlock(lobby, "ravi", "mi")).toBeNull();
  });

  it("allows a guest to re-claim the franchise they already hold", () => {
    expect(franchiseClaimBlock(lobby, "asha", "csk")).toBeNull();
  });

  it("blocks a claim on a franchise another owner holds", () => {
    expect(franchiseClaimBlock(lobby, "ravi", "csk")).toBe("taken");
  });

  it("blocks a claim from a guest who has not joined the lobby", () => {
    expect(franchiseClaimBlock(lobby, "nobody", "mi")).toBe("not-an-owner");
  });

  it("blocks a claim once the lobby has left the auction phase", () => {
    expect(
      franchiseClaimBlock(
        { ...lobby, phase: "league", round: 1 },
        "ravi",
        "mi",
      ),
    ).toBe("closed");
  });
});

describe("franchiseStatus", () => {
  it("reports a franchise no owner holds as available", () => {
    expect(franchiseStatus(lobby, "ravi", "mi")).toEqual({ kind: "available" });
  });

  it("reports the holder and marks it as mine for the guest who holds it", () => {
    expect(franchiseStatus(lobby, "asha", "csk")).toEqual({
      kind: "owned",
      owner: lobby.owners[0],
      isMine: true,
    });
  });

  it("reports the holder and marks it as not mine for anyone else", () => {
    expect(franchiseStatus(lobby, "ravi", "csk")).toEqual({
      kind: "owned",
      owner: lobby.owners[0],
      isMine: false,
    });
  });
});
