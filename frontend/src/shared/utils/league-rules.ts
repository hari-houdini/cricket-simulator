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
};

/**
 * Checks whether the next round can be played. The season ends after the last
 * playoff round, and no round is played until every owner can field an XI,
 * because the XI is what the owner's franchise plays with.
 *
 * @param check - The lobby's round and whether every owner can field an XI.
 * @returns The reason the round cannot be played, or null when it can.
 */
export function advanceBlock(check: AdvanceCheck): AdvanceBlock | null {
  if (check.round >= LAST_ROUND) {
    return "season-over";
  }
  if (!check.everyOwnerCanField) {
    return "no-legal-starting-xi";
  }
  return null;
}
