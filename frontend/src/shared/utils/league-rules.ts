import { LAST_ROUND } from "../const/lobby.const";
import type { AdvanceBlock } from "../types/refusal.types";

/** What the advance check needs to know about the lobby. */
export type AdvanceCheck = {
  /** The round most recently played. 0 before the first round. */
  readonly round: number;
  /**
   * True when every owner has a starting XI, either saved or the default one
   * (see `defaultStartingXi`).
   */
  readonly everyOwnerCanField: boolean;
  /** True while a substitution is open, which pauses the sim for every guest. */
  readonly paused: boolean;
};

/**
 * Checks whether the next match can be played. The season ends after the last
 * playoff round. No match is played while a substitution is open, since the sim
 * waits for it for every guest. No match is played until every owner can field
 * an XI, because the XI is what the owner's franchise plays with.
 *
 * @param check - The lobby's round, whether every owner can field an XI, and whether the sim is paused.
 * @returns The reason the match cannot be played, or null when it can.
 */
export function advanceBlock(check: AdvanceCheck): AdvanceBlock | null {
  if (check.round >= LAST_ROUND) {
    return "season-over";
  }
  if (check.paused) {
    return "sim-paused";
  }
  if (!check.everyOwnerCanField) {
    return "no-legal-starting-xi";
  }
  return null;
}
