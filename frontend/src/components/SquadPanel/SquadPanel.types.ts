/** Props for {@link SquadPanel}. */
export type SquadPanelProps = {
  /** The lobby whose auction has finished, from the URL or the lobby view. */
  readonly code: string;
  /** Called once the starting XI has been saved, so the lobby can move on to the sim. */
  readonly onSaved?: () => void;
  /** Called once the free substitution has been made, so the lobby can resume the sim. */
  readonly onSubstituted?: () => void;
};
