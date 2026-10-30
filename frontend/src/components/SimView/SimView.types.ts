import type { Lobby } from "../../shared/types/lobby.types";

/** Props for {@link SimView}. */
export type SimViewProps = {
  /** The lobby whose season is running. */
  readonly code: string;
  /** The lobby as the screen last read it. */
  readonly lobby: Lobby;
  /** The guest viewing the sim. Owners get the controls; other guests only watch. */
  readonly guestId: string;
  /** Called with the lobby an action returned, so the screen shows the change at once. */
  readonly onLobbyUpdated: (lobby: Lobby) => void;
};
