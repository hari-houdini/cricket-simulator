import { MAX_OWNERS } from "../const/lobby.const";
import type { BidBlock } from "./auction-rules";

/**
 * Thrown when no lobby has the requested code. The UI shows this as a clear
 * "check the code" message, not as a generic failure.
 */
export class LobbyNotFoundError extends Error {
  /**
   * @param code - The code that was looked up, as the caller typed it.
   */
  constructor(code: string) {
    super(`No lobby has the code "${code}".`);
    this.name = "LobbyNotFoundError";
  }
}

/**
 * Thrown when a new guest tries to join a lobby that already has
 * {@link MAX_OWNERS} owners, one for each franchise.
 */
export class LobbyFullError extends Error {
  /**
   * @param code - The code of the full lobby.
   */
  constructor(code: string) {
    super(`Lobby "${code}" already has ${MAX_OWNERS} owners.`);
    this.name = "LobbyFullError";
  }
}

/**
 * Thrown when a claim names a franchise that is not one of the 10 IPL
 * franchises in the seed.
 */
export class FranchiseNotFoundError extends Error {
  /**
   * @param franchiseId - The id the caller asked for.
   */
  constructor(franchiseId: string) {
    super(`No IPL franchise has the id "${franchiseId}".`);
    this.name = "FranchiseNotFoundError";
  }
}

/**
 * Thrown when a franchise is already owned by another guest in the lobby.
 */
export class FranchiseTakenError extends Error {
  /**
   * @param franchiseId - The franchise that is already owned.
   */
  constructor(franchiseId: string) {
    super(`The franchise "${franchiseId}" is already owned in this lobby.`);
    this.name = "FranchiseTakenError";
  }
}

/**
 * Thrown when a guest who is not an owner in the lobby tries to claim a
 * franchise. Guests must join first.
 */
export class NotAnOwnerError extends Error {
  /**
   * @param guestId - The guest who is not in the lobby.
   */
  constructor(guestId: string) {
    super(`Guest "${guestId}" is not an owner in this lobby.`);
    this.name = "NotAnOwnerError";
  }
}

/**
 * Thrown when a franchise is claimed outside the auction phase. A lobby is
 * created in the auction phase, so this only fires once the season has moved on.
 */
export class FranchiseClaimClosedError extends Error {
  constructor() {
    super(
      "Franchises can only be claimed while the lobby is in the auction phase.",
    );
    this.name = "FranchiseClaimClosedError";
  }
}

/**
 * Thrown when an auction call is made before the owner has started the auction.
 */
export class AuctionNotStartedError extends Error {
  /**
   * @param code - The lobby code.
   */
  constructor(code: string) {
    super(`The auction in lobby "${code}" has not started.`);
    this.name = "AuctionNotStartedError";
  }
}

/**
 * Thrown when a join, a franchise claim or a second start arrives after the
 * auction has started. The lobby's membership is fixed from then on.
 */
export class AuctionAlreadyStartedError extends Error {
  /**
   * @param code - The lobby code.
   */
  constructor(code: string) {
    super(`The auction in lobby "${code}" has already started.`);
    this.name = "AuctionAlreadyStartedError";
  }
}

/**
 * Why the auction cannot start yet. `no-owners` means the lobby is empty, and
 * `unclaimed-franchise` means an owner has not picked a franchise.
 */
export type AuctionStartBlock = "no-owners" | "unclaimed-franchise";

/**
 * Thrown when the auction is asked to start before every owner has a franchise.
 */
export class AuctionStartBlockedError extends Error {
  /**
   * @param reason - Why the auction cannot start yet.
   */
  constructor(readonly reason: AuctionStartBlock) {
    super(`The auction cannot start yet: ${reason}.`);
    this.name = "AuctionStartBlockedError";
  }
}

/**
 * Thrown when a bid is refused. The reason is kept on the error so the UI can
 * say what to do, rather than showing a generic failure.
 */
export class BidBlockedError extends Error {
  /**
   * @param reason - Why the bid was refused, from {@link BidBlock}.
   */
  constructor(readonly reason: BidBlock) {
    super(`The bid was refused: ${reason}.`);
    this.name = "BidBlockedError";
  }
}
