import { describe, expect, it } from "vitest";

import {
  createLobbyInputSchema,
  joinLobbyInputSchema,
  lobbySchema,
} from "./lobby.schema";

const owner = { guestId: "guest-1", displayName: "Asha", franchiseId: null };

const validLobby = {
  id: "lobby-1",
  code: "ABC123",
  name: "Sunday League",
  phase: "auction",
  round: 0,
  owners: [owner],
  seedVersion: "1.0.0",
};

describe("lobbySchema", () => {
  it("accepts a well-formed lobby", () => {
    expect(lobbySchema.parse(validLobby)).toEqual(validLobby);
  });

  it("rejects an 11th owner, since a lobby holds one owner per franchise", () => {
    const owners = Array.from({ length: 11 }, (_, index) => ({
      guestId: `guest-${index}`,
      displayName: `Owner ${index}`,
      franchiseId: null,
    }));

    expect(() => lobbySchema.parse({ ...validLobby, owners })).toThrow();
  });

  it("rejects a round past the last playoff round", () => {
    expect(() => lobbySchema.parse({ ...validLobby, round: 19 })).toThrow();
  });

  it("rejects a code that is not six characters", () => {
    expect(() => lobbySchema.parse({ ...validLobby, code: "ABC12" })).toThrow();
  });

  it("rejects a phase outside the four lobby phases", () => {
    expect(() =>
      lobbySchema.parse({ ...validLobby, phase: "pre-season" }),
    ).toThrow();
  });
});

describe("createLobbyInputSchema", () => {
  it("trims the lobby name and display name", () => {
    const parsed = createLobbyInputSchema.parse({
      name: "  Finals  ",
      guestId: "guest-1",
      displayName: "  Asha  ",
    });

    expect(parsed.name).toBe("Finals");
    expect(parsed.displayName).toBe("Asha");
  });

  it("rejects a display name that is only spaces", () => {
    expect(() =>
      createLobbyInputSchema.parse({
        name: "Finals",
        guestId: "guest-1",
        displayName: "   ",
      }),
    ).toThrow();
  });
});

describe("joinLobbyInputSchema", () => {
  it("rejects a lowercase code, since callers must normalise it first", () => {
    expect(() =>
      joinLobbyInputSchema.parse({
        code: "abc123",
        guestId: "guest-2",
        displayName: "Ravi",
      }),
    ).toThrow();
  });
});
