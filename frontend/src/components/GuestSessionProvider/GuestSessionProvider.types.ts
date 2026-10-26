import type { ReactNode } from "react";

import type { GameApi } from "../../shared/types/game-api.types";

/** Props for {@link GuestSessionProvider}. */
export type GuestSessionProviderProps = {
  /** The game API every screen in this session calls. */
  readonly api: GameApi;
  readonly children: ReactNode;
};

/**
 * What a screen needs from the session: the API, and the guest's ID once the
 * browser has produced one. `guestId` is `null` until the first client render,
 * since the browser storage is not readable on the server.
 */
export type GuestSession = {
  readonly api: GameApi;
  readonly guestId: string | null;
};
