import type { PlayoffResult } from "../../shared/types/playoffs.types";

/** Props for {@link MatchLogView}. */
export type MatchLogViewProps = {
  /** The match's heading, such as "Qualifier 1: MI v SRH". */
  readonly title: string;
  /** The played match: its match log, score and Man of the Match. */
  readonly result: PlayoffResult;
  /** Whether the log is still being revealed. A live log reveals one key moment at a time. */
  readonly live: boolean;
  /** Called once a live log is complete and its pause is over. Ignored when not live. */
  readonly onDone: () => void;
};
