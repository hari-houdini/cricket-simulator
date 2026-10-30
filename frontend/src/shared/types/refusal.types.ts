import type { z } from "zod";

import type {
  advanceBlockSchema,
  auctionStartBlockSchema,
  bidBlockSchema,
  refusalSchema,
  substitutionBlockSchema,
  xiBlockSchema,
} from "./refusal.schema";

/**
 * A refusal as the backend sends it, derived from {@link refusalSchema}.
 */
export type Refusal = z.infer<typeof refusalSchema>;

/**
 * Why a bid is refused. `null` from `bidBlockReason` means the bid is allowed.
 *
 * - `no-open-lot`: the auction is not running, or no player is on a lot.
 * - `lot-closed`: the timer has already run out, so the hammer is due first.
 * - `not-an-owner`: the guest has no purse in this auction.
 * - `squad-full`: the owner already has a full squad.
 * - `already-high-bidder`: the owner holds the lot already, so they cannot raise it.
 * - `not-next-step`: the amount is not the lot's minimum next bid.
 * - `over-purse`: the amount is more than the owner has left.
 */
export type BidBlock = z.infer<typeof bidBlockSchema>;

/** Why the auction cannot start yet. Derived from {@link auctionStartBlockSchema}. */
export type AuctionStartBlock = z.infer<typeof auctionStartBlockSchema>;

/**
 * Why a starting XI is not legal, checked in this order: size, duplicates,
 * squad membership, captain and vice-captain, then the role rules. Derived from
 * {@link xiBlockSchema}.
 */
export type XiBlock = z.infer<typeof xiBlockSchema>;

/**
 * Why a substitution is refused. The XI reasons apply when the swap would leave
 * an illegal XI, so the owner sees the same rule that a saved XI must meet.
 * Derived from {@link substitutionBlockSchema}.
 */
export type SubstitutionBlock = z.infer<typeof substitutionBlockSchema>;

/** Why the next round cannot be played. Derived from {@link advanceBlockSchema}. */
export type AdvanceBlock = z.infer<typeof advanceBlockSchema>;
