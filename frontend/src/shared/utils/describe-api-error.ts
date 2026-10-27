import { ZodError } from "zod";

import { MIN_BOWLING_OPTIONS } from "../const/squad.const";
import type { BidBlock } from "./auction-rules";
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

/** What to tell the guest for each reason a starting XI is refused. */
const XI_BLOCK_MESSAGES = {
  "wrong-size": "Pick exactly 11 players for your starting XI.",
  duplicate: "Each player can appear in the XI only once.",
  "not-in-squad": "Only players from your squad can play in the XI.",
  "captain-not-in-xi": "Choose a captain from your starting XI.",
  "vice-captain-not-in-xi": "Choose a vice-captain from your starting XI.",
  "same-captain-and-vice-captain":
    "The captain and vice-captain must be different players.",
  "no-wicket-keeper": "Your starting XI needs one wicket-keeper.",
  "too-many-wicket-keepers":
    "Your starting XI can have only one wicket-keeper.",
  "too-few-bowling-options": `Your starting XI needs at least ${MIN_BOWLING_OPTIONS} bowling options: bowlers and bowling all-rounders.`,
} as const satisfies Record<XiBlock, string>;

/** What to tell the guest for each reason a substitution is refused, other than an XI rule. */
const SUBSTITUTION_BLOCK_MESSAGES = {
  "not-yet-played": "Substitutions open after the first match.",
  "already-used": "You have already used your free substitution this season.",
  "no-starting-xi": "Save your starting XI before you make a substitution.",
  "out-not-in-xi": "Pick a player from your starting XI to take off.",
  "captain-or-vice-captain":
    "Your captain and vice-captain cannot be substituted out.",
  "in-not-in-squad": "Pick a player from your squad to bring on.",
  "in-already-in-xi": "That player is already in your starting XI.",
} as const satisfies Record<Exclude<SubstitutionBlock, XiBlock>, string>;

/**
 * Whether a substitution refusal is really a starting-XI rule, which the swap
 * would break, rather than a rule about the swap itself.
 *
 * @param reason - The reason a substitution was refused.
 * @returns True when the reason is one of the XI rules.
 */
function isXiBlock(reason: SubstitutionBlock): reason is XiBlock {
  return reason in XI_BLOCK_MESSAGES;
}

/**
 * Says why a starting XI is not allowed, in words the guest can act on. The
 * picker shows it while the guest is still choosing.
 *
 * @param reason - The reason from the squad rules.
 * @returns A short sentence.
 */
export function describeXiBlock(reason: XiBlock): string {
  return XI_BLOCK_MESSAGES[reason];
}

/**
 * Says why a substitution is not allowed. A refusal that comes from an XI rule
 * names that rule, so the guest knows what the swap would break.
 *
 * @param reason - The reason from the squad rules.
 * @returns A short sentence.
 */
export function describeSubstitutionBlock(reason: SubstitutionBlock): string {
  if (isXiBlock(reason)) {
    return `That swap would leave an illegal XI. ${XI_BLOCK_MESSAGES[reason]}`;
  }
  return SUBSTITUTION_BLOCK_MESSAGES[reason];
}

/** What to tell the guest for each reason the next round is refused. */
const ADVANCE_BLOCK_MESSAGES = {
  "season-over": "The season is over. The champion has been crowned.",
  "no-legal-starting-xi":
    "An owner's squad cannot field a legal starting XI, so the round cannot be played.",
} as const satisfies Record<AdvanceBlock, string>;

/**
 * Says why the next league round cannot be played.
 *
 * @param reason - The reason from the league rules.
 * @returns A short sentence.
 */
export function describeAdvanceBlock(reason: AdvanceBlock): string {
  return ADVANCE_BLOCK_MESSAGES[reason];
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
  if (error instanceof SquadNotReadyError) {
    return "The squad is ready once every owner has finished the auction.";
  }
  if (error instanceof XiLockedError) {
    return "Your starting XI is locked for the season, since the first match has been played.";
  }
  if (error instanceof XiBlockedError) {
    return describeXiBlock(error.reason);
  }
  if (error instanceof SubstitutionBlockedError) {
    return describeSubstitutionBlock(error.reason);
  }
  if (error instanceof LeagueNotStartedError) {
    return "The season starts once the auction has finished.";
  }
  if (error instanceof LeagueAdvanceBlockedError) {
    return describeAdvanceBlock(error.reason);
  }
  if (error instanceof ZodError) {
    return "Check what you entered and try again.";
  }
  return "Something went wrong. Try again.";
}
