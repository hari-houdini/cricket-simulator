import { LEAGUE_ROUNDS } from "../const/league.const";

/** Why the next league round cannot be played. */
export type AdvanceBlock = "season-over" | "missing-starting-xi";

/** What the advance check needs to know about the lobby. */
export type AdvanceCheck = {
  /** The round most recently played. 0 before the first round. */
  readonly round: number;
  /** True once every owner has saved a starting XI. */
  readonly everyOwnerHasStartingXi: boolean;
};

/**
 * Checks whether the next league round can be played. The season ends after
 * the last league round, and no round is played until every owner has an XI,
 * because the XI is what the owner's franchise plays with.
 *
 * @param check - The lobby's round and whether every owner has saved an XI.
 * @returns The reason the round cannot be played, or null when it can.
 */
export function advanceBlock(check: AdvanceCheck): AdvanceBlock | null {
  if (check.round >= LEAGUE_ROUNDS) {
    return "season-over";
  }
  if (!check.everyOwnerHasStartingXi) {
    return "missing-starting-xi";
  }
  return null;
}
