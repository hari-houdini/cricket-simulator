import { ZodError } from "zod";

import type { BidBlock } from "./auction-rules";
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

/** What to tell the guest for each reason a bid is refused. */
const BID_BLOCK_MESSAGES = {
  "no-open-lot": "There is no player up for auction right now.",
  "lot-closed": "That player has just been sold. Bid on the next one.",
  "not-an-owner": "Join the lobby before you bid.",
  "squad-full": "Your squad is full, so you cannot bid again.",
  "already-high-bidder": "You already hold the highest bid on this player.",
  "not-next-step": "The bid has moved on. Bid the new amount.",
  "over-purse": "That bid is more than your purse has left.",
} as const;

/**
 * Says why a bid is not allowed, in words the guest can act on. The auction
 * screen uses it to explain a disabled bid button.
 *
 * @param reason - The reason from the auction rules.
 * @returns A short sentence.
 */
export function describeBidBlock(reason: BidBlock): string {
  return BID_BLOCK_MESSAGES[reason];
}

/**
 * Turns an error from the game API into a sentence the guest can act on. The
 * raw error text is for developers, so it is never shown.
 *
 * @param error - Whatever the API call rejected with.
 * @returns A message that says what went wrong and what to do next.
 */
export function describeApiError(error: unknown): string {
  if (error instanceof LobbyNotFoundError) {
    return "No lobby has that code. Check the code and try again.";
  }
  if (error instanceof LobbyFullError) {
    return "This lobby is full. Every franchise already has an owner.";
  }
  if (error instanceof FranchiseTakenError) {
    return "Another owner already holds that franchise. Pick a free one.";
  }
  if (error instanceof FranchiseClaimClosedError) {
    return "Franchises can no longer be changed in this lobby.";
  }
  if (error instanceof NotAnOwnerError) {
    return "Join the lobby before you pick a franchise.";
  }
  if (error instanceof FranchiseNotFoundError) {
    return "That franchise is not part of this season.";
  }
  if (error instanceof AuctionNotStartedError) {
    return "The auction has not started yet.";
  }
  if (error instanceof AuctionAlreadyStartedError) {
    return "The auction has already started, so the lobby is closed.";
  }
  if (error instanceof AuctionStartBlockedError) {
    return error.reason === "no-owners"
      ? "Add an owner before you start the auction."
      : "Every owner must pick a franchise before the auction starts.";
  }
  if (error instanceof BidBlockedError) {
    return describeBidBlock(error.reason);
  }
  if (error instanceof ZodError) {
    return "Check what you entered and try again.";
  }
  return "Something went wrong. Try again.";
}
