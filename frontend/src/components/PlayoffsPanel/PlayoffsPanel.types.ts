/** Props for {@link PlayoffsPanel}. */
export type PlayoffsPanelProps = {
  /** The lobby whose playoffs are running. */
  readonly code: string;
  /** The lobby's current round. The bracket is read again each time it moves. */
  readonly round: number;
  /** Called once the Final's match log has finished, when the champion is decided. */
  readonly onFinished: () => void;
};
