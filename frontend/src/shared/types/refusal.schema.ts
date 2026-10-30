import { object, string, enum as zodEnum } from "zod";

/**
 * The body the Rust backend sends with every refusal: `{ "error": <class name>, "reason": <kebab-case or null> }`.
 * The class name is one of the typed errors in `shared/utils/game-api.errors.ts`.
 */
export const refusalSchema = object({
  error: string(),
  reason: string().nullable(),
});

/**
 * Reasons a bid is refused. Each reason's meaning is documented on
 * {@link BidBlock} in `refusal.types.ts`, and the auction rules return them.
 */
export const bidBlockSchema = zodEnum([
  "no-open-lot",
  "lot-closed",
  "not-an-owner",
  "squad-full",
  "already-high-bidder",
  "not-next-step",
  "over-purse",
]);

/** Reasons the auction cannot start: the lobby is empty, or an owner has no franchise. */
export const auctionStartBlockSchema = zodEnum([
  "no-owners",
  "unclaimed-franchise",
]);

/** Reasons a starting XI is refused. The squad rules return them in this order of checks. */
export const xiBlockSchema = zodEnum([
  "wrong-size",
  "duplicate",
  "not-in-squad",
  "captain-not-in-xi",
  "vice-captain-not-in-xi",
  "same-captain-and-vice-captain",
  "no-wicket-keeper",
  "too-many-wicket-keepers",
  "too-few-bowling-options",
]);

/**
 * Reasons a substitution is refused: its own reasons, plus every XI reason,
 * since a swap that leaves an illegal XI is refused with that rule.
 */
export const substitutionBlockSchema = zodEnum([
  "not-yet-played",
  "not-in-progress",
  "already-used",
  "no-starting-xi",
  "out-not-in-xi",
  "captain-or-vice-captain",
  "in-not-in-squad",
  "in-already-in-xi",
  ...xiBlockSchema.options,
]);

/**
 * Reasons a match is not played: the season is over, an owner has no legal XI, or a
 * substitution is open and the sim is paused for it.
 */
export const advanceBlockSchema = zodEnum([
  "season-over",
  "no-legal-starting-xi",
  "sim-paused",
]);
