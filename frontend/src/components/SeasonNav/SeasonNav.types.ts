import type { Lobby } from "../../shared/types/lobby.types";

/** Props for {@link SeasonNav}. */
export type SeasonNavProps = {
  /** The lobby whose season the views describe. */
  readonly code: string;
  /** The lobby, for its owners and substitutions. */
  readonly lobby: Lobby;
  /**
   * How many league matches the viewer has been shown. The squads view rebuilds each XI as it
   * stood after this many matches, so pass `Infinity` once the season is over.
   */
  readonly point: number;
};
