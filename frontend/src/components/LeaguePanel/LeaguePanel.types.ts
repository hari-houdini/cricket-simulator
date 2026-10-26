/** Props for {@link LeaguePanel}. */
export type LeaguePanelProps = {
  /** The lobby whose season is running. */
  readonly code: string;
  /** Whether the viewer may play the next round. Only owners may. */
  readonly canAdvance: boolean;
  /** Called after a round is played, so the lobby can re-read its round. */
  readonly onRoundAdvanced?: () => void;
};
