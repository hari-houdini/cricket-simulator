import { describe, expect, it } from "vitest";
import { lobbyCodeSchema } from "../types/lobby.schema";
import {
  describeAdvanceBlock,
  describeApiError,
  describeSubstitutionBlock,
  describeXiBlock,
} from "./describe-api-error";
import {
  AuctionAlreadyStartedError,
  AuctionNotStartedError,
  AuctionStartBlockedError,
  BidBlockedError,
  FranchiseClaimClosedError,
  FranchiseNotFoundError,
  FranchiseTakenError,
  LeagueAdvanceBlockedError,
  LeagueNotStartedError,
  LobbyFullError,
  LobbyNotFoundError,
  NotAnOwnerError,
  SquadNotReadyError,
  SubstitutionBlockedError,
  XiBlockedError,
  XiLockedError,
} from "./game-api.errors";
import type { AdvanceBlock } from "./league-rules";
import type { SubstitutionBlock, XiBlock } from "./squad-rules";

const XI_REASONS: readonly XiBlock[] = [
  "wrong-size",
  "duplicate",
  "not-in-squad",
  "captain-not-in-xi",
  "vice-captain-not-in-xi",
  "same-captain-and-vice-captain",
  "no-wicket-keeper",
  "too-many-wicket-keepers",
  "too-few-bowling-options",
];

const SUBSTITUTION_REASONS: readonly SubstitutionBlock[] = [
  "not-yet-played",
  "already-used",
  "no-starting-xi",
  "out-not-in-xi",
  "captain-or-vice-captain",
  "in-not-in-squad",
  "in-already-in-xi",
];

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

  it("says the squad is not ready until the auction has finished", () => {
    expect(describeApiError(new SquadNotReadyError("ABC123"))).toContain(
      "once every owner has finished the auction",
    );
  });

  it("says the starting XI is locked once the first match has been played", () => {
    expect(describeApiError(new XiLockedError("ABC123"))).toContain("locked");
  });

  it("explains a refused starting XI with the rule it broke", () => {
    for (const reason of XI_REASONS) {
      expect(describeApiError(new XiBlockedError(reason))).toBe(
        describeXiBlock(reason),
      );
    }
  });

  it("explains a refused substitution with the reason it was refused", () => {
    for (const reason of SUBSTITUTION_REASONS) {
      expect(describeApiError(new SubstitutionBlockedError(reason))).toBe(
        describeSubstitutionBlock(reason),
      );
    }
  });
});

describe("describeXiBlock", () => {
  it("gives a specific message for every XI rule, with the bowling minimum filled in", () => {
    for (const reason of XI_REASONS) {
      expect(describeXiBlock(reason).length).toBeGreaterThan(0);
    }
    expect(describeXiBlock("too-few-bowling-options")).toContain("4 bowling");
  });
});

describe("describeSubstitutionBlock", () => {
  it("names the XI rule a swap would break", () => {
    expect(describeSubstitutionBlock("no-wicket-keeper")).toContain(
      "illegal XI",
    );
    expect(describeSubstitutionBlock("no-wicket-keeper")).toContain(
      describeXiBlock("no-wicket-keeper"),
    );
  });

  it("gives a message for every swap rule that is not an XI rule", () => {
    for (const reason of SUBSTITUTION_REASONS) {
      expect(describeSubstitutionBlock(reason)).not.toContain("illegal XI");
    }
  });
});

const ADVANCE_REASONS: readonly AdvanceBlock[] = [
  "season-over",
  "no-legal-starting-xi",
];

describe("describeAdvanceBlock", () => {
  it("says the season is over once every league round has been played", () => {
    expect(describeAdvanceBlock("season-over")).toContain("season is over");
  });

  it("says a squad with no legal XI blocks the round", () => {
    expect(describeAdvanceBlock("no-legal-starting-xi")).toContain(
      "legal starting XI",
    );
  });
});

describe("describeApiError for the league", () => {
  it("says the season has not started before the auction finishes", () => {
    expect(describeApiError(new LeagueNotStartedError("ABC123"))).toContain(
      "auction",
    );
  });

  it("explains a refused round with the reason it was refused", () => {
    for (const reason of ADVANCE_REASONS) {
      expect(describeApiError(new LeagueAdvanceBlockedError(reason))).toBe(
        describeAdvanceBlock(reason),
      );
    }
  });
});
