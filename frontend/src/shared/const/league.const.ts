/** Franchises in the league. Each holds at most one owner in a lobby. */
export const FRANCHISE_COUNT = 10;

/** League rounds, one match per franchise pair in each round slot. */
export const LEAGUE_ROUNDS = 14;

/** Matches each franchise plays in the league: 9 opponents once, 5 twice. */
export const MATCHES_PER_FRANCHISE = 14;

/** Total league matches: every franchise plays 14, and each match has two. */
export const LEAGUE_MATCHES = (FRANCHISE_COUNT * MATCHES_PER_FRANCHISE) / 2;

/** Playoff matches: Qualifier 1, Eliminator, Qualifier 2 and the Final. */
export const PLAYOFF_MATCHES = 4;
