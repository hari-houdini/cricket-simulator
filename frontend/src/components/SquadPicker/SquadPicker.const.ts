import type { Player } from "../../shared/types/player.types";

/** The name shown for each role. The role values are lowercase in the data, so they are mapped here. */
export const ROLE_LABELS = {
  batter: "Batter",
  bowler: "Bowler",
  "all-rounder": "All-rounder",
  "wicket-keeper": "Wicket-keeper",
} as const satisfies Record<Player["role"], string>;
