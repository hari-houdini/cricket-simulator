/** Props for {@link LobbyScreen}. */
export type LobbyScreenProps = {
  /** The lobby code from the URL. It is normalised and checked before any request. */
  readonly code: string;
};
