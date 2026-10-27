/**
 * Players in the starting XI. The XI is drawn from the 15-player squad
 * (`docs/game-design.md` section 4).
 */
export const XI_SIZE = 11;

/** The starting XI must include exactly this many wicket-keepers. */
export const REQUIRED_WICKET_KEEPERS = 1;

/**
 * The fewest bowling options in the starting XI. A bowling option is a bowler
 * or an all-rounder (`docs/game-design.md` section 4).
 */
export const MIN_BOWLING_OPTIONS = 4;

/**
 * The lobby round in which the first match is played. The starting XI locks
 * from this round on, and substitutions open from it (`docs/game-design.md` section 4).
 */
export const FIRST_MATCH_ROUND = 1;
