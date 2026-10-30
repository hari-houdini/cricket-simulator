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
  InternalError,
  InvalidInputError,
  LeagueAdvanceBlockedError,
  LeagueNotStartedError,
  LobbyCodeTakenError,
  LobbyCodeUnavailableError,
  LobbyFullError,
  LobbyNotFoundError,
  MatchNotFoundError,
  NotAnOwnerError,
  SquadNotReadyError,
  SubstitutionBlockedError,
  WrongPhaseError,
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
  readonly matchId: string;
};

/** Turns one refusal body into its typed error. */
type RefusalMapping = (refusal: Refusal) => Error;

/**
 * A plain error for a refusal the frontend cannot map. It names the class the
 * backend sent, so the message still says what was refused.
 *
 * @param error - The class name from the backend.
 * @returns A plain `Error`.
 */
function unrecognisedRefusal(error: string): Error {
  return new Error(`The API refused the request: ${error}.`);
}

/**
 * Builds the mapping for a class that carries a reason. A reason outside the
 * class's vocabulary becomes an unrecognised refusal, never a guessed class.
 *
 * @param schema - The reason vocabulary for the class.
 * @param build - Creates the typed error from a known reason.
 * @returns The mapping from a refusal body to its typed error.
 */
function blocked<T extends string>(
  schema: ZodType<T>,
  build: (reason: T) => Error,
): RefusalMapping {
  return ({ error, reason }) => {
    const parsed = schema.safeParse(reason);
    return parsed.success ? build(parsed.data) : unrecognisedRefusal(error);
  };
}

/**
 * The refusals that carry a reason, keyed by the backend's class name. A
 * `Map`, so a name such as `constructor` cannot match an inherited property.
 */
const blockedRefusals = new Map<string, RefusalMapping>([
  [
    "AuctionStartBlockedError",
    blocked(
      auctionStartBlockSchema,
      (reason) => new AuctionStartBlockedError(reason),
    ),
  ],
  [
    "BidBlockedError",
    blocked(bidBlockSchema, (reason) => new BidBlockedError(reason)),
  ],
  [
    "XiBlockedError",
    blocked(xiBlockSchema, (reason) => new XiBlockedError(reason)),
  ],
  [
    "SubstitutionBlockedError",
    blocked(
      substitutionBlockSchema,
      (reason) => new SubstitutionBlockedError(reason),
    ),
  ],
  [
    "LeagueAdvanceBlockedError",
    blocked(
      advanceBlockSchema,
      (reason) => new LeagueAdvanceBlockedError(reason),
    ),
  ],
]);

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
  const reasonMapping = blockedRefusals.get(error);
  if (reasonMapping) {
    return reasonMapping(refusal);
  }

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
    case "WrongPhaseError":
      return new WrongPhaseError();
    case "MatchNotFoundError":
      return new MatchNotFoundError(context.matchId);
    case "InvalidInputError":
      return new InvalidInputError(reason);
    case "LobbyCodeTakenError":
      return new LobbyCodeTakenError();
    case "LobbyCodeUnavailableError":
      return new LobbyCodeUnavailableError();
    case "InternalError":
      return new InternalError();
    default:
      return unrecognisedRefusal(error);
  }
}
