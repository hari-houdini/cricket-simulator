import { array, number, object, string, enum as zodEnum } from "zod";

import { SQUAD_SIZE } from "../const/auction.const";
import { playerSchema } from "./player.schema";

/** Whether the auction is still running or has finished. */
export const auctionStatusSchema = zodEnum(["running", "complete"]);

/** The highest bid on the lot so far, or none yet. */
export const highBidSchema = object({
  guestId: string().min(1),
  displayName: string().min(1),
  amountLakhs: number().int().positive(),
});

/**
 * The player currently up for auction. `minimumBidLakhs` is the only amount
 * the next bid button may offer, so the UI never has to compute increments.
 */
export const lotSchema = object({
  player: playerSchema,
  highBid: highBidSchema.nullable(),
  minimumBidLakhs: number().int().positive(),
  /** Epoch milliseconds when the hammer falls if no one bids again. */
  endsAt: number().int().nonnegative(),
});

/** One bid in the log, in the order bids were placed. */
export const bidLogEntrySchema = object({
  sequence: number().int().positive(),
  playerName: string().min(1),
  guestId: string().min(1),
  displayName: string().min(1),
  amountLakhs: number().int().positive(),
  /** Epoch milliseconds when the bid was placed. */
  at: number().int().nonnegative(),
});

/** A player sold at the hammer, and to whom, at what price. */
export const soldRecordSchema = object({
  player: playerSchema,
  guestId: string().min(1),
  displayName: string().min(1),
  amountLakhs: number().int().positive(),
});

/** An owner's money and squad during the auction. */
export const auctionPurseSchema = object({
  guestId: string().min(1),
  displayName: string().min(1),
  purseLakhs: number().int().nonnegative(),
  squad: array(playerSchema).max(SQUAD_SIZE),
});

/**
 * The state of one lobby's auction, as the UI sees it. `remaining` counts the
 * players not yet on a lot, sold or unsold, so progress can be shown.
 */
export const auctionSchema = object({
  lobbyCode: string().regex(/^[A-Z0-9]{6}$/),
  status: auctionStatusSchema,
  lot: lotSchema.nullable(),
  remaining: number().int().nonnegative(),
  sold: array(soldRecordSchema),
  unsold: array(playerSchema),
  log: array(bidLogEntrySchema),
  purses: array(auctionPurseSchema),
});

/** Input for starting the auction. Any owner may start it, once every owner has a franchise. */
export const startAuctionInputSchema = object({
  code: string().regex(/^[A-Z0-9]{6}$/),
  guestId: string().min(1).max(64),
});

/** Input for a bid. The amount must be the lot's minimum next bid, since bids use increment buttons only. */
export const placeBidInputSchema = object({
  code: string().regex(/^[A-Z0-9]{6}$/),
  guestId: string().min(1).max(64),
  amountLakhs: number().int().positive(),
});
