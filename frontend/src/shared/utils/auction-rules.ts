import {
  BID_STEPS_LAKHS,
  LAKHS_PER_CRORE,
  SQUAD_SIZE,
} from "../const/auction.const";
import type { Auction, Lot, SoldRecord } from "../types/auction.types";

/**
 * Why a bid is refused. `null` from {@link bidBlockReason} means the bid is
 * allowed.
 *
 * - `no-open-lot`: the auction is not running, or no player is on a lot.
 * - `lot-closed`: the timer has already run out, so the hammer is due first.
 * - `not-an-owner`: the guest has no purse in this auction.
 * - `squad-full`: the owner already has a full squad.
 * - `already-high-bidder`: the owner holds the lot already, so they cannot raise it.
 * - `not-next-step`: the amount is not the lot's minimum next bid.
 * - `over-purse`: the amount is more than the owner has left.
 */
export type BidBlock =
  | "no-open-lot"
  | "lot-closed"
  | "not-an-owner"
  | "squad-full"
  | "already-high-bidder"
  | "not-next-step"
  | "over-purse";

/**
 * The outcome of a lot when its timer runs out: sold to the highest bidder, or
 * unsold if no one bid.
 */
export type LotOutcome =
  | { readonly kind: "sold"; readonly sale: Omit<SoldRecord, "player"> }
  | { readonly kind: "unsold" };

/**
 * The bid step at a given current bid. Below ₹1cr the step is ₹10L, from ₹1cr to
 * ₹5cr inclusive it is ₹50L, and above ₹5cr it is ₹1cr. A bid exactly on a
 * boundary takes the step of the band it sits in.
 *
 * @param currentLakhs - The current high bid, in lakhs.
 * @returns The increment to add, in lakhs.
 */
export function bidIncrementLakhs(currentLakhs: number): number {
  if (currentLakhs < LAKHS_PER_CRORE) {
    return BID_STEPS_LAKHS.below1Crore;
  }
  if (currentLakhs <= 5 * LAKHS_PER_CRORE) {
    return BID_STEPS_LAKHS.upTo5Crore;
  }
  return BID_STEPS_LAKHS.above5Crore;
}

/**
 * The only amount the next bid button may offer. With no bid yet it is the base
 * price; after a bid it is the current bid plus its increment.
 *
 * @param basePriceLakhs - The player's base price, in lakhs.
 * @param highBidLakhs - The current high bid, or `null` if none.
 * @returns The minimum next bid, in lakhs.
 */
export function minimumBidLakhs(
  basePriceLakhs: number,
  highBidLakhs: number | null,
): number {
  if (highBidLakhs === null) {
    return basePriceLakhs;
  }
  return highBidLakhs + bidIncrementLakhs(highBidLakhs);
}

/**
 * Decides whether a bid may be placed now. Checks run in the order a guest would
 * hit them, so the reason shown is the most useful one.
 *
 * @param auction - The auction as it is now.
 * @param guestId - The guest placing the bid.
 * @param amountLakhs - The amount they want to bid.
 * @param now - The current time, in epoch milliseconds.
 * @returns The reason the bid is refused, or `null` when it is allowed.
 */
export function bidBlockReason(
  auction: Auction,
  guestId: string,
  amountLakhs: number,
  now: number,
): BidBlock | null {
  const lot = auction.lot;
  if (auction.status !== "running" || lot === null) {
    return "no-open-lot";
  }
  if (isLotExpired(lot, now)) {
    return "lot-closed";
  }
  const purse = auction.purses.find((item) => item.guestId === guestId);
  if (!purse) {
    return "not-an-owner";
  }
  if (purse.squad.length >= SQUAD_SIZE) {
    return "squad-full";
  }
  if (lot.highBid?.guestId === guestId) {
    return "already-high-bidder";
  }
  if (amountLakhs !== lot.minimumBidLakhs) {
    return "not-next-step";
  }
  if (amountLakhs > purse.purseLakhs) {
    return "over-purse";
  }
  return null;
}

/**
 * Whether a lot's timer has run out at the given time.
 *
 * @param lot - The lot to check.
 * @param now - The current time, in epoch milliseconds.
 * @returns `true` once the hammer is due.
 */
export function isLotExpired(lot: Lot, now: number): boolean {
  return now >= lot.endsAt;
}

/**
 * Milliseconds left on a lot's timer, never below zero.
 *
 * @param endsAt - When the hammer falls, in epoch milliseconds.
 * @param now - The current time, in epoch milliseconds.
 * @returns The time left, in milliseconds.
 */
export function timeLeftMs(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}

/**
 * Decides how a lot ends when its timer runs out: sold to the highest bidder at
 * their bid, or unsold if no one bid.
 *
 * @param lot - The lot that has expired.
 * @returns The sale, or `unsold`.
 */
export function lotOutcome(lot: Lot): LotOutcome {
  if (lot.highBid === null) {
    return { kind: "unsold" };
  }
  return {
    kind: "sold",
    sale: {
      guestId: lot.highBid.guestId,
      displayName: lot.highBid.displayName,
      amountLakhs: lot.highBid.amountLakhs,
    },
  };
}
