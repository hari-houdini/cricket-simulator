/**
 * Thrown when no lobby has the requested code. The UI shows this as a clear
 * "check the code" message, not as a generic failure.
 */
export class LobbyNotFoundError extends Error {
  /**
   * @param code - The code that was looked up, as the caller typed it.
   */
  constructor(code: string) {
    super(`No lobby has the code "${code}".`);
    this.name = "LobbyNotFoundError";
  }
}

import { MAX_OWNERS } from "../../shared/const/lobby.const";

/**
 * Thrown when a new guest tries to join a lobby that already has
 * {@link MAX_OWNERS} owners, one for each franchise.
 */
export class LobbyFullError extends Error {
  /**
   * @param code - The code of the full lobby.
   */
  constructor(code: string) {
    super(`Lobby "${code}" already has ${MAX_OWNERS} owners.`);
    this.name = "LobbyFullError";
  }
}
