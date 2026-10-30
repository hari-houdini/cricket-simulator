import type { ManOfTheMatch } from "../../shared/types/awards.types";
import type { Fixture } from "../../shared/types/league.types";
import type { Owner } from "../../shared/types/lobby.types";

/** Props for {@link MatchEntry}. */
export type MatchEntryProps = {
  /** The match. Its result is read only once the match is played. */
  readonly fixture: Fixture;
  /**
   * `in-play` shows the teams with no result and cannot be opened. `played` shows the result,
   * and opens to a scorecard.
   */
  readonly status: "in-play" | "played";
  /** The owners in the match, home owner first. Empty when neither team has an owner. */
  readonly owners: readonly Owner[];
  /** The Man of the Match, once the match has been played. */
  readonly manOfTheMatch: ManOfTheMatch | null;
};
