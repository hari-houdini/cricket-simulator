import { describe, expect, it } from "vitest";

import type { Refusal } from "../types/refusal.types";
import type { RefusalContext } from "./api-refusal";
import { refusalError } from "./api-refusal";
import {
  AuctionAlreadyStartedError,
  AuctionNotStartedError,
  FranchiseClaimClosedError,
  FranchiseNotFoundError,
  FranchiseTakenError,
  LeagueNotStartedError,
  LobbyFullError,
  LobbyNotFoundError,
  NotAnOwnerError,
  SquadNotReadyError,
  XiLockedError,
} from "./game-api.errors";

const context: RefusalContext = {
  code: "ABC123",
  guestId: "guest-1",
  franchiseId: "csk",
};

/**
 * Builds a refusal body as the backend sends it.
 *
 * @param error - The error class name.
 * @param reason - The reason, or `null` for none.
 * @returns The refusal.
 */
function refusal(error: string, reason: string | null = null): Refusal {
  return { error, reason };
}

describe("refusalError", () => {
  it("maps the refusals that name only the lobby, guest or franchise", () => {
    expect(refusalError(refusal("LobbyNotFoundError"), context)).toBeInstanceOf(
      LobbyNotFoundError,
    );
    expect(refusalError(refusal("LobbyFullError"), context)).toBeInstanceOf(
      LobbyFullError,
    );
    expect(
      refusalError(refusal("FranchiseNotFoundError"), context),
    ).toBeInstanceOf(FranchiseNotFoundError);
    expect(
      refusalError(refusal("FranchiseTakenError"), context),
    ).toBeInstanceOf(FranchiseTakenError);
    expect(refusalError(refusal("NotAnOwnerError"), context)).toBeInstanceOf(
      NotAnOwnerError,
    );
    expect(
      refusalError(refusal("FranchiseClaimClosedError"), context),
    ).toBeInstanceOf(FranchiseClaimClosedError);
    expect(
      refusalError(refusal("AuctionNotStartedError"), context),
    ).toBeInstanceOf(AuctionNotStartedError);
    expect(
      refusalError(refusal("AuctionAlreadyStartedError"), context),
    ).toBeInstanceOf(AuctionAlreadyStartedError);
    expect(refusalError(refusal("SquadNotReadyError"), context)).toBeInstanceOf(
      SquadNotReadyError,
    );
    expect(refusalError(refusal("XiLockedError"), context)).toBeInstanceOf(
      XiLockedError,
    );
    expect(
      refusalError(refusal("LeagueNotStartedError"), context),
    ).toBeInstanceOf(LeagueNotStartedError);
  });

  it("names the value the caller sent in the classes that take one", () => {
    expect(
      refusalError(refusal("LobbyNotFoundError"), context).message,
    ).toContain("ABC123");
    expect(refusalError(refusal("NotAnOwnerError"), context).message).toContain(
      "guest-1",
    );
    expect(
      refusalError(refusal("FranchiseNotFoundError"), context).message,
    ).toContain("csk");
  });

  it("keeps a known reason on each class that carries one", () => {
    const cases: ReadonlyArray<[string, string, string]> = [
      ["AuctionStartBlockedError", "no-owners", "no-owners"],
      ["BidBlockedError", "over-purse", "over-purse"],
      ["XiBlockedError", "wrong-size", "wrong-size"],
      ["SubstitutionBlockedError", "in-already-in-xi", "in-already-in-xi"],
      ["LeagueAdvanceBlockedError", "season-over", "season-over"],
    ];

    for (const [name, reason, expected] of cases) {
      const error = refusalError(refusal(name, reason), context);
      expect(error.name).toBe(name);
      expect((error as { reason?: string }).reason).toBe(expected);
    }
  });

  it("gives a plain error, not a guessed class, for a reason outside the vocabulary", () => {
    const names = [
      "AuctionStartBlockedError",
      "BidBlockedError",
      "XiBlockedError",
      "SubstitutionBlockedError",
      "LeagueAdvanceBlockedError",
    ];

    for (const name of names) {
      const error = refusalError(refusal(name, "not-a-reason"), context);
      expect(error.name).toBe("Error");
      expect(error.message).toBe(`The API refused the request: ${name}.`);
    }
  });

  it("gives a plain error when a reason-bearing class has no reason", () => {
    const error = refusalError(refusal("BidBlockedError"), context);

    expect(error.name).toBe("Error");
  });

  it("gives a plain error for a refusal the frontend does not know", () => {
    const error = refusalError(refusal("NotFoundError"), context);

    expect(error.name).toBe("Error");
    expect(error.message).toBe("The API refused the request: NotFoundError.");
  });
});
