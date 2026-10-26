import type { KeyMoment } from "../../shared/types/playoffs.types";

/** Props for {@link KeyMomentView}. */
export type KeyMomentViewProps = {
  /** Every key moment in the match, in order. */
  readonly moments: readonly KeyMoment[];
  /** How many of them have been shown so far. */
  readonly shown: number;
  /** Called when the guest asks to skip to the result. */
  readonly onSkip: () => void;
};
