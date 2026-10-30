import type { ManOfTheMatch } from "../../shared/types/awards.types";
import type { Owner } from "../../shared/types/lobby.types";
import type { StackEntry } from "../../shared/utils/sim-stack";

/** Props for {@link SimStack}. */
export type SimStackProps = {
  /** The entries to show, newest first, from {@link stackEntries}. */
  readonly entries: readonly StackEntry[];
  /** The lobby's owners, so a log line can name them. */
  readonly owners: readonly Owner[];
  /** The Man of the Match in each played league match, so a card can name it. */
  readonly manOfTheMatch: readonly ManOfTheMatch[];
  /** Player names by player ID, so a substitution line can name the players. */
  readonly playerNames: ReadonlyMap<string, string>;
};
