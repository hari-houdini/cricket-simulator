/**
 * Maximum owners in one lobby. Each owner holds one of the 10 IPL franchises,
 * so a full lobby has every franchise taken (`docs/game-design.md` section 2).
 */
export const MAX_OWNERS = 10;

/**
 * Length of a shareable lobby code. Codes are letters and digits, so the
 * validator and the code generator must both use this value.
 */
export const LOBBY_CODE_LENGTH = 6;

/**
 * The last round of a season: 14 league rounds, then 4 playoff rounds
 * (`docs/game-design.md` section 5).
 */
export const LAST_ROUND = 18;
