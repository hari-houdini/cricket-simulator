import type { FairPlayFranchise } from "../types/awards.types";
import type { Standing } from "../types/league.types";

/** A franchise's Fair Play entry with its place in the table, 1 for the best. */
export type RankedFairPlay = FairPlayFranchise & { readonly rank: number };

/**
 * Ranks the Fair Play table. A franchise ranks higher with a higher season fair-play
 * standing, since a higher standing means cleaner conduct. Ties are broken by league
 * points, then net run rate, so the order reads the same way the league table does.
 * A franchise with no league row counts as zero on both tie-breakers.
 *
 * @param franchises - Each franchise's Fair Play entry, in any order.
 * @param standings - The league table, which supplies the tie-breakers.
 * @returns The entries best first, each with its rank.
 */
export function rankFairPlay(
  franchises: readonly FairPlayFranchise[],
  standings: readonly Standing[],
): RankedFairPlay[] {
  /**
   * @param franchiseId - The franchise to look up.
   * @returns Its league row, or undefined when the table has none.
   */
  function tableRow(franchiseId: string): Standing | undefined {
    return standings.find((row) => row.franchiseId === franchiseId);
  }

  const ordered = [...franchises].sort((first, second) => {
    if (second.standing !== first.standing) {
      return second.standing - first.standing;
    }
    const firstRow = tableRow(first.franchiseId);
    const secondRow = tableRow(second.franchiseId);
    const pointsGap = (secondRow?.points ?? 0) - (firstRow?.points ?? 0);
    if (pointsGap !== 0) {
      return pointsGap;
    }
    return (secondRow?.netRunRate ?? 0) - (firstRow?.netRunRate ?? 0);
  });

  return ordered.map((franchise, index) => ({ ...franchise, rank: index + 1 }));
}
