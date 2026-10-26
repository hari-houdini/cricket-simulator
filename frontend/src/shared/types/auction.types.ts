import type { z } from "zod";

import type {
  auctionPurseSchema,
  auctionSchema,
  auctionStatusSchema,
  bidLogEntrySchema,
  highBidSchema,
  lotSchema,
  placeBidInputSchema,
  soldRecordSchema,
  startAuctionInputSchema,
} from "./auction.schema";

/** Whether the auction is running or finished, derived from {@link auctionStatusSchema}. */
export type AuctionStatus = z.infer<typeof auctionStatusSchema>;

/** The highest bid on a lot, derived from {@link highBidSchema}. */
export type HighBid = z.infer<typeof highBidSchema>;

/** The player up for auction, derived from {@link lotSchema}. */
export type Lot = z.infer<typeof lotSchema>;

/** One bid in the log, derived from {@link bidLogEntrySchema}. */
export type BidLogEntry = z.infer<typeof bidLogEntrySchema>;

/** A sale at the hammer, derived from {@link soldRecordSchema}. */
export type SoldRecord = z.infer<typeof soldRecordSchema>;

/** An owner's purse and squad, derived from {@link auctionPurseSchema}. */
export type AuctionPurse = z.infer<typeof auctionPurseSchema>;

/** The auction state, derived from {@link auctionSchema} so the type and the validator cannot drift. */
export type Auction = z.infer<typeof auctionSchema>;

/** Input for starting the auction, derived from {@link startAuctionInputSchema}. */
export type StartAuctionInput = z.infer<typeof startAuctionInputSchema>;

/** Input for placing a bid, derived from {@link placeBidInputSchema}. */
export type PlaceBidInput = z.infer<typeof placeBidInputSchema>;
