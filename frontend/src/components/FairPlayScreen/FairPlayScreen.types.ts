import type { FairPlayLine } from "../../shared/types/awards.types";
import type { RankedFairPlay } from "../../shared/utils/fair-play-ranking";

/** Props for {@link FairPlayScreen}. */
export type FairPlayScreenProps = {
  /** Each franchise's entry, already ranked best first by {@link rankFairPlay}. Empty before the first match. */
  readonly franchises: readonly RankedFairPlay[];
  /** The franchise with the best Fair Play rating, or null before any match. */
  readonly winnerFranchiseId: string | null;
};

/** Props for {@link FairPlayPlayers}, the players in one of a franchise's two columns. */
export type FairPlayPlayersProps = {
  /** The players in the column, with their average effect. */
  readonly lines: readonly FairPlayLine[];
};
