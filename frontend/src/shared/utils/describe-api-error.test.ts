import { describe, expect, it } from "vitest";
import { lobbyCodeSchema } from "../types/lobby.schema";
import { describeApiError } from "./describe-api-error";
import {
  FranchiseClaimClosedError,
  FranchiseNotFoundError,
  FranchiseTakenError,
  LobbyFullError,
  LobbyNotFoundError,
  NotAnOwnerError,
} from "./game-api.errors";

describe("describeApiError", () => {
  it("names the missing lobby and says how to recover", () => {
    expect(describeApiError(new LobbyNotFoundError("ZZZZZZ"))).toBe(
      "No lobby has that code. Check the code and try again.",
    );
  });

  it("says a lobby is full", () => {
    expect(describeApiError(new LobbyFullError("ABC123"))).toContain("full");
  });

  it("says a franchise is held by another owner", () => {
    expect(describeApiError(new FranchiseTakenError("csk"))).toContain(
      "already holds that franchise",
    );
  });

  it("says franchises can no longer change once the phase has moved on", () => {
    expect(describeApiError(new FranchiseClaimClosedError())).toContain(
      "can no longer be changed",
    );
  });

  it("asks a guest who has not joined to join first", () => {
    expect(describeApiError(new NotAnOwnerError("guest-9"))).toContain(
      "Join the lobby",
    );
  });

  it("says a franchise is not part of the season", () => {
    expect(describeApiError(new FranchiseNotFoundError("xyz"))).toContain(
      "not part of this season",
    );
  });

  it("asks the guest to check invalid input, without showing the validator's text", () => {
    const zodError = lobbyCodeSchema.safeParse("abc");
    expect(zodError.success).toBe(false);
    if (zodError.success) {
      throw new Error("expected the code to be rejected");
    }

    expect(describeApiError(zodError.error)).toBe(
      "Check what you entered and try again.",
    );
  });

  it("falls back to a generic message for anything unexpected", () => {
    expect(describeApiError(new Error("socket closed"))).toBe(
      "Something went wrong. Try again.",
    );
  });
});
