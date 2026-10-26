import type { Lobby } from "../../shared/types/lobby.types";

/** Props for {@link LobbyView}. The view is presentational: it shows what it is given. */
export type LobbyViewProps = {
  /** The lobby to show. */
  readonly lobby: Lobby;
  /** The guest viewing it, who may or may not already own a franchise here. */
  readonly guestId: string;
  /** The absolute link other guests open to join this lobby. */
  readonly shareUrl: string;
  /** True while a join or claim is in flight. */
  readonly pending: boolean;
  /** A message for the last failed action, or `null`. */
  readonly error: string | null;
  /** Called with the franchise id the guest picked. */
  readonly onClaim: (franchiseId: string) => void;
  /** Called with the display name the guest typed to join. */
  readonly onJoin: (displayName: string) => void;
};
