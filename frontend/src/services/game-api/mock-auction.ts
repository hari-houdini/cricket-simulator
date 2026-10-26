import {
  BID_TIMER_MS,
  SQUAD_SIZE,
  STARTING_PURSE_LAKHS,
} from "../../shared/const/auction.const";
import type { Auction, Lot } from "../../shared/types/auction.types";
import type { Owner } from "../../shared/types/lobby.types";
import type { Player } from "../../shared/types/player.types";
import {
  isLotExpired,
  lotOutcome,
  minimumBidLakhs,
} from "../../shared/utils/auction-rules";

/**
 * Starts an auction for a lobby. Every owner gets the starting purse and an
 * empty squad, and the first lot opens at `now`.
 *
 * @param code - The lobby code.
 * @param owners - The owners in the lobby. Each must already have a franchise.
 * @param queue - The players to auction, in the order they come up. Consumed as
 *   lots open, so the caller must keep this same array to settle later lots.
 * @param now - The start time, in epoch milliseconds.
 * @returns The running auction.
 */
export function createMockAuction(
  code: string,
  owners: readonly Owner[],
  queue: Player[],
  now: number,
): Auction {
  const auction: Auction = {
    lobbyCode: code,
    status: "running",
    lot: null,
    remaining: 0,
    sold: [],
    unsold: [],
    log: [],
    purses: owners.map((owner) => ({
      guestId: owner.guestId,
      displayName: owner.displayName,
      purseLakhs: STARTING_PURSE_LAKHS,
      squad: [],
    })),
  };
  openNextLot(auction, queue, now);
  return auction;
}

/**
 * Opens the next lot, or completes the auction when the queue is empty or every
 * squad is full. The queue is passed in and consumed, so the auction keeps only
 * the count of players left.
 *
 * @param auction - The auction to advance. Mutated in place.
 * @param queue - The players not yet on a lot. Mutated in place.
 * @param now - When the lot opens, in epoch milliseconds.
 */
function openNextLot(auction: Auction, queue: Player[], now: number): void {
  const everySquadFull = auction.purses.every(
    (purse) => purse.squad.length >= SQUAD_SIZE,
  );
  const next = queue.shift();
  if (everySquadFull || next === undefined) {
    auction.status = "complete";
    auction.lot = null;
    auction.remaining = 0;
    return;
  }
  auction.lot = {
    player: next,
    highBid: null,
    minimumBidLakhs: minimumBidLakhs(next.basePrice, null),
    endsAt: now + BID_TIMER_MS,
  };
  auction.remaining = queue.length;
}

/**
 * Runs the hammer on every lot whose timer has run out by `now`, opening the
 * next lot each time. Lots that expired while nobody was reading open at `now`
 * instead of at their hammer time, so a long idle gap does not sell the whole
 * pool at once.
 *
 * @param auction - The auction to settle. Mutated in place.
 * @param queue - The players not yet on a lot. Mutated in place.
 * @param now - The current time, in epoch milliseconds.
 */
export function settleExpiredLots(
  auction: Auction,
  queue: Player[],
  now: number,
): void {
  while (auction.status === "running" && auction.lot !== null) {
    const lot: Lot = auction.lot;
    if (!isLotExpired(lot, now)) {
      return;
    }
    const outcome = lotOutcome(lot);
    if (outcome.kind === "sold") {
      const purse = auction.purses.find(
        (item) => item.guestId === outcome.sale.guestId,
      );
      if (purse) {
        purse.purseLakhs -= outcome.sale.amountLakhs;
        purse.squad.push(lot.player);
      }
      auction.sold.push({ player: lot.player, ...outcome.sale });
    } else {
      auction.unsold.push(lot.player);
    }
    openNextLot(auction, queue, now);
  }
}

/**
 * Records an accepted bid on the current lot and restarts its timer. The caller
 * has already checked the bid with `bidBlockReason`.
 *
 * @param auction - The auction. Mutated in place.
 * @param guestId - The bidder.
 * @param amountLakhs - The bid, which must be the lot's minimum next bid.
 * @param now - When the bid is placed, in epoch milliseconds.
 * @throws {Error} When there is no open lot, which the caller must rule out first.
 */
export function recordBid(
  auction: Auction,
  guestId: string,
  amountLakhs: number,
  now: number,
): void {
  const lot = auction.lot;
  const purse = auction.purses.find((item) => item.guestId === guestId);
  if (lot === null || purse === undefined) {
    throw new Error("recordBid needs an open lot and a purse for the bidder.");
  }
  lot.highBid = {
    guestId,
    displayName: purse.displayName,
    amountLakhs,
  };
  lot.minimumBidLakhs = minimumBidLakhs(lot.player.basePrice, amountLakhs);
  lot.endsAt = now + BID_TIMER_MS;
  auction.log.push({
    sequence: auction.log.length + 1,
    playerName: lot.player.name,
    guestId,
    displayName: purse.displayName,
    amountLakhs,
    at: now,
  });
}
