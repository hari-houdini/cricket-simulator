import type { LobbyPhase } from "../types/lobby.types";

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

/**
 * Display labels for each lobby phase. Keyed by phase, so adding a phase to the
 * schema fails the type check here until it has a label.
 */
export const LOBBY_PHASE_LABELS = {
  auction: "Auction",
  league: "League",
  playoffs: "Playoffs",
  complete: "Complete",
} as const satisfies Record<LobbyPhase, string>;
