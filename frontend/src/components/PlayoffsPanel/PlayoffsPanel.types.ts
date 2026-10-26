/** Props for {@link PlayoffsPanel}. */
export type PlayoffsPanelProps = {
  /** The lobby whose playoffs are running or finished. */
  readonly code: string;
  /** Whether the viewer may play the next playoff match. Only owners may. */
  readonly canAdvance: boolean;
  /** Called after a playoff match is played, so the lobby can re-read its phase. */
  readonly onRoundAdvanced?: () => void;
};
