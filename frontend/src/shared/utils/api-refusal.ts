import type { ZodType } from "zod";

import {
  advanceBlockSchema,
  auctionStartBlockSchema,
  bidBlockSchema,
  substitutionBlockSchema,
  xiBlockSchema,
} from "../types/refusal.schema";
import type { Refusal } from "../types/refusal.types";
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

/**
 * What the caller asked for. A refusal names the lobby, guest or franchise it
 * refused, but the class needs the value the caller sent, so the mapping takes
 * it from here. Fields the request did not name are passed as an empty string.
 */
export type RefusalContext = {
  readonly code: string;
  readonly guestId: string;
  readonly franchiseId: string;
};

/**
 * Returns the reason when it is one the frontend knows for this class, or
 * `null` so the caller falls back to a generic error.
 *
 * @param schema - The reason vocabulary for the class.
 * @param reason - The reason from the backend, if any.
 * @returns The typed reason, or `null`.
 */
function knownReason<T extends string>(
  schema: ZodType<T>,
  reason: string | null,
): T | null {
  const parsed = schema.safeParse(reason);
  return parsed.success ? parsed.data : null;
}

/**
 * Turns a backend refusal into the typed error the mock throws for the same
 * situation, so the UI handles both modes with one set of `instanceof` checks.
 * A refusal the frontend does not know, or a reason outside its vocabulary,
 * becomes a plain `Error` naming the refusal, rather than a guessed class.
 *
 * @param refusal - The refusal body from the backend.
 * @param context - The lobby, guest and franchise the request named.
 * @returns The typed error for the refusal.
 */
export function refusalError(refusal: Refusal, context: RefusalContext): Error {
  const { error, reason } = refusal;
  const unknown = new Error(`The API refused the request: ${error}.`);

  switch (error) {
    case "LobbyNotFoundError":
      return new LobbyNotFoundError(context.code);
    case "LobbyFullError":
      return new LobbyFullError(context.code);
    case "FranchiseNotFoundError":
      return new FranchiseNotFoundError(context.franchiseId);
    case "FranchiseTakenError":
      return new FranchiseTakenError(context.franchiseId);
    case "NotAnOwnerError":
      return new NotAnOwnerError(context.guestId);
    case "FranchiseClaimClosedError":
      return new FranchiseClaimClosedError();
    case "AuctionNotStartedError":
      return new AuctionNotStartedError(context.code);
    case "AuctionAlreadyStartedError":
      return new AuctionAlreadyStartedError(context.code);
    case "SquadNotReadyError":
      return new SquadNotReadyError(context.code);
    case "XiLockedError":
      return new XiLockedError(context.code);
    case "LeagueNotStartedError":
      return new LeagueNotStartedError(context.code);
    case "AuctionStartBlockedError": {
      const known = knownReason(auctionStartBlockSchema, reason);
      return known ? new AuctionStartBlockedError(known) : unknown;
    }
    case "BidBlockedError": {
      const known = knownReason(bidBlockSchema, reason);
      return known ? new BidBlockedError(known) : unknown;
    }
    case "XiBlockedError": {
      const known = knownReason(xiBlockSchema, reason);
      return known ? new XiBlockedError(known) : unknown;
    }
    case "SubstitutionBlockedError": {
      const known = knownReason(substitutionBlockSchema, reason);
      return known ? new SubstitutionBlockedError(known) : unknown;
    }
    case "LeagueAdvanceBlockedError": {
      const known = knownReason(advanceBlockSchema, reason);
      return known ? new LeagueAdvanceBlockedError(known) : unknown;
    }
    default:
      return unknown;
  }
}
