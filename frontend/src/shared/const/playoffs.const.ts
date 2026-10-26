import type { PlayoffSlot } from "../types/schedule.types";

/**
 * How each playoff slot is named in the bracket, in the glossary's terms
 * (`GLOSSARY.md`). Keyed by slot, so adding a slot fails the type check until it
 * has a label.
 */
export const PLAYOFF_SLOT_LABELS = {
  "qualifier-1": "Qualifier 1",
  eliminator: "Eliminator",
  "qualifier-2": "Qualifier 2",
  final: "Final",
} as const satisfies Record<PlayoffSlot, string>;

/**
 * How long a playoff match takes to show its key moments, in milliseconds. The
 * moments share this time, so the match finishes within 5 seconds
 * (`docs/game-design.md` section 6).
 */
export const KEY_MOMENTS_TOTAL_MS = 5000;
