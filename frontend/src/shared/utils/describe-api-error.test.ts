import { describe, expect, it } from "vitest";
import { lobbyCodeSchema } from "../types/lobby.schema";
import { describeApiError } from "./describe-api-error";
import {
  AuctionAlreadyStartedError,
  AuctionNotStartedError,
  AuctionStartBlockedError,
  BidBlockedError,
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

  it("tells an owner the auction has not started", () => {
    expect(describeApiError(new AuctionNotStartedError("ABC123"))).toBe(
      "The auction has not started yet.",
    );
  });

  it("says the lobby is closed once the auction has started", () => {
    expect(
      describeApiError(new AuctionAlreadyStartedError("ABC123")),
    ).toContain("lobby is closed");
  });

  it("says who must act before the auction can start", () => {
    expect(
      describeApiError(new AuctionStartBlockedError("no-owners")),
    ).toContain("Add an owner");
    expect(
      describeApiError(new AuctionStartBlockedError("unclaimed-franchise")),
    ).toContain("pick a franchise");
  });

  it("gives a specific reason for every refused bid", () => {
    expect(describeApiError(new BidBlockedError("lot-closed"))).toContain(
      "just been sold",
    );
    expect(describeApiError(new BidBlockedError("not-an-owner"))).toContain(
      "Join the lobby",
    );
    expect(describeApiError(new BidBlockedError("squad-full"))).toContain(
      "squad is full",
    );
    expect(
      describeApiError(new BidBlockedError("already-high-bidder")),
    ).toContain("highest bid");
    expect(describeApiError(new BidBlockedError("not-next-step"))).toContain(
      "moved on",
    );
    expect(describeApiError(new BidBlockedError("over-purse"))).toContain(
      "purse",
    );
    expect(describeApiError(new BidBlockedError("no-open-lot"))).toContain(
      "no player",
    );
  });

  it("falls back to a generic message for anything unexpected", () => {
    expect(describeApiError(new Error("socket closed"))).toBe(
      "Something went wrong. Try again.",
    );
  });
});
