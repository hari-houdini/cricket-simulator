/**
 * The four roles in the glossary. Names are kebab-case so the same values work
 * in JSON and in a future Rust enum with serde.
 */
export const PLAYER_ROLES = [
  "batter",
  "bowler",
  "all-rounder",
  "wicket-keeper",
] as const;

/**
 * Auction categories. `marquee` is the top tier, `capped` is a capped player
 * below it, and `uncapped` has not yet been capped. The uncapped definition is
 * still open (`docs/game-design.md` section 14.2).
 */
export const PLAYER_CATEGORIES = ["marquee", "capped", "uncapped"] as const;

/**
 * Base price per category, in lakhs (₹1cr is 100 lakhs). A player's base price
 * follows from its category, so the seed cannot disagree with itself.
 */
export const BASE_PRICE_LAKHS_BY_CATEGORY = {
  marquee: 200,
  capped: 100,
  uncapped: 30,
} as const;

/**
 * Trouble rating used when a player has no entry. Set by
 * `docs/game-design.md` section 9.
 */
export const DEFAULT_TROUBLE_RATING = 2;

/**
 * The approved size and split of the player pool. The seed file is tested
 * against these numbers, so changing the pool means changing them on purpose.
 */
export const PLAYER_POOL = {
  total: 300,
  marquee: 125,
  capped: 100,
  uncapped: 75,
  retired: 90,
  current: 210,
} as const;
