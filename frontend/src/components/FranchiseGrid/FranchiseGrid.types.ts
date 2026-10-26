import type { Lobby } from "../../shared/types/lobby.types";

/** Props for {@link FranchiseGrid}. */
export type FranchiseGridProps = {
  /** The lobby whose franchises are shown. */
  readonly lobby: Lobby;
  /** The guest looking at the grid, so their own franchise is marked as theirs. */
  readonly guestId: string;
  /** True while a claim is in flight. Disables every claim button. */
  readonly pending: boolean;
  /** Called with the franchise id when the guest claims a free franchise. */
  readonly onClaim: (franchiseId: string) => void;
};
