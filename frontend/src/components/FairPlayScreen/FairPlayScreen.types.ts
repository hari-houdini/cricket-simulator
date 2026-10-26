import type { FairPlayFranchise } from "../../shared/types/awards.types";

/** Props for {@link FairPlayScreen}. */
export type FairPlayScreenProps = {
  /** Each franchise's rating, in table order. Empty before the first match. */
  readonly franchises: readonly FairPlayFranchise[];
  /** The franchise with the best Fair Play rating, or null before any match. */
  readonly winnerFranchiseId: string | null;
};
