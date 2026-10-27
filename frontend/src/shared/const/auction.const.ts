/**
 * Money in the auction is integer lakhs (₹1cr is 100 lakhs), so purse
 * arithmetic never rounds (ADR 0004).
 */
export const LAKHS_PER_CRORE = 100;

/** Starting purse for each owner: ₹100cr, in lakhs (`docs/game-design.md` section 3). */
export const STARTING_PURSE_LAKHS = 100 * LAKHS_PER_CRORE;

/** Players in a squad. The starting XI is drawn from these (`docs/game-design.md` section 4). */
export const SQUAD_SIZE = 15;

/**
 * Seconds on the clock at the start of each lot and after every bid. A bid
 * resets it, and when it reaches zero the highest bidder wins (the hammer).
 */
export const BID_TIMER_SECONDS = 5;

/** The same timer in milliseconds, the unit the clock uses. */
export const BID_TIMER_MS = BID_TIMER_SECONDS * 1000;

/**
 * Bid steps by the band the current bid falls in, in lakhs. Below ₹1cr the step
 * is ₹10L; from ₹1cr to ₹5cr inclusive it is ₹50L; above ₹5cr it is ₹1cr.
 * `docs/game-design.md` section 3 defines the bands.
 */
export const BID_STEPS_LAKHS = {
  below1Crore: 10,
  upTo5Crore: 50,
  above5Crore: 100,
} as const;
