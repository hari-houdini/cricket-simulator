import { object, string, enum as zodEnum } from "zod";

/**
 * The body the Rust backend sends with every refusal: `{ "error": <class name>, "reason": <kebab-case or null> }`.
 * The class name is one of the typed errors in `shared/utils/game-api.errors.ts`.
 */
export const refusalSchema = object({
  error: string(),
  reason: string().nullable(),
});

/** Reasons a bid is refused, matching `BidBlock` in `shared/utils/auction-rules.ts`. */
export const bidBlockSchema = zodEnum([
  "no-open-lot",
  "lot-closed",
  "not-an-owner",
  "squad-full",
  "already-high-bidder",
  "not-next-step",
  "over-purse",
]);

/** Reasons the auction cannot start, matching `AuctionStartBlock` in `shared/utils/game-api.errors.ts`. */
export const auctionStartBlockSchema = zodEnum([
  "no-owners",
  "unclaimed-franchise",
]);

/** Reasons a starting XI is refused, matching `XiBlock` in `shared/utils/squad-rules.ts`. */
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

/** Reasons a substitution is refused, matching `SubstitutionBlock` in `shared/utils/squad-rules.ts`. */
export const substitutionBlockSchema = zodEnum([
  "not-yet-played",
  "already-used",
  "no-starting-xi",
  "out-not-in-xi",
  "captain-or-vice-captain",
  "in-not-in-squad",
  "in-already-in-xi",
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

/** Reasons a round is not played, matching `AdvanceBlock` in `shared/utils/league-rules.ts`. */
export const advanceBlockSchema = zodEnum([
  "season-over",
  "no-legal-starting-xi",
]);
