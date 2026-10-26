/** Fantasy points for each run a player scores. Working value: the formula is an open item (`docs/game-design.md` section 14.1). */
export const POINTS_PER_RUN = 1;

/** Fantasy points for each wicket. Matches the weight of the Man of the Match tie-break, `runs + 20 × wickets`. */
export const POINTS_PER_WICKET = 20;

/** Fantasy points for each catch. Working value, see {@link POINTS_PER_RUN}. */
export const POINTS_PER_CATCH = 10;

/** Share of wickets that come with a catch. The engine has no ball-by-ball detail, so catches are drawn at this rate. */
export const CATCH_RATE = 0.6;

/** Multiplier on a captain's fantasy points (`docs/game-design.md` section 4). Working value. */
export const CAPTAIN_MULTIPLIER = 2;

/** Multiplier on a vice-captain's fantasy points. Working value. */
export const VICE_CAPTAIN_MULTIPLIER = 1.5;

/** The best a player's match score can be in the fair-play rating (`docs/game-design.md` section 9). */
export const FAIR_PLAY_MAX_SCORE = 10;

/** The fewest a seeded fair-play factor can be. */
export const FAIR_PLAY_FACTOR_MIN = 0.5;

/** The number of players named in each fair-play column. */
export const FAIR_PLAY_COLUMN_SIZE = 2;
