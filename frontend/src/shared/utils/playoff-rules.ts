import type { PlayoffSlot, PlayoffSource } from "../types/schedule.types";

/**
 * Who won and who lost a decided playoff slot. Later slots refer to these, so
 * the Final can name the winners of Qualifier 1 and Qualifier 2.
 */
export type SlotDecision = {
  readonly winnerFranchiseId: string;
  readonly loserFranchiseId: string;
};

/**
 * Builds the decision for a played match from its winner.
 *
 * @param homeFranchiseId - The home franchise.
 * @param awayFranchiseId - The away franchise.
 * @param winnerFranchiseId - The franchise that won, which must be one of the two.
 * @returns The winner, and the other franchise as the loser.
 */
export function decisionFor(
  homeFranchiseId: string,
  awayFranchiseId: string,
  winnerFranchiseId: string,
): SlotDecision {
  if (winnerFranchiseId === homeFranchiseId) {
    return { winnerFranchiseId, loserFranchiseId: awayFranchiseId };
  }
  return { winnerFranchiseId, loserFranchiseId: homeFranchiseId };
}

/**
 * Settles a level playoff match with a super over. Each side has the same
 * chance, so the draw picks the winner. Playoffs cannot end in a tie.
 *
 * @param homeFranchiseId - The home franchise.
 * @param awayFranchiseId - The away franchise.
 * @param draw - A seeded draw in [0, 1).
 * @returns The franchise that won the super over.
 */
export function superOverWinner(
  homeFranchiseId: string,
  awayFranchiseId: string,
  draw: number,
): string {
  return draw < 0.5 ? homeFranchiseId : awayFranchiseId;
}

/**
 * Works out which franchise fills a bracket place. A league place is taken from
 * the table, by its position. A winner or loser place is taken from the slot
 * that decided it, once that slot has been played.
 *
 * @param source - Where the place comes from.
 * @param standingOrder - Franchise ids in table order, best first. Empty until the league is over.
 * @param decided - The decisions made so far, keyed by slot.
 * @returns The franchise id, or null when the place is not known yet.
 */
export function resolvePlayoffSource(
  source: PlayoffSource,
  standingOrder: readonly string[],
  decided: ReadonlyMap<PlayoffSlot, SlotDecision>,
): string | null {
  if (source.kind === "standing") {
    return standingOrder[source.position - 1] ?? null;
  }
  const decision = decided.get(source.slot);
  if (!decision) {
    return null;
  }
  return source.kind === "winner"
    ? decision.winnerFranchiseId
    : decision.loserFranchiseId;
}
