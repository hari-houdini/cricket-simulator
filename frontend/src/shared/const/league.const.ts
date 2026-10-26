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

/** Points for a league win (`docs/game-design.md` section 6). */
export const POINTS_PER_WIN = 2;

/** Points each side gets for a league tie. */
export const POINTS_PER_TIE = 1;

/** Points for a league loss. */
export const POINTS_PER_LOSS = 0;

/** Overs in each innings. Every league match is 20 overs, so net run rate divides by 20 per match. */
export const OVERS_PER_INNINGS = 20;
