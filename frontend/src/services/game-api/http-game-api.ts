import type { GameApi } from "../../shared/types/game-api.types";

const NOT_IMPLEMENTED_MESSAGE =
  'The HTTP game API is not implemented yet. Set NEXT_PUBLIC_API_MODE to "mock" until the Rust backend exists.';

/**
 * Rejects every call. This is a placeholder for the client that will call the
 * Rust API in `ARCHITECTURE.md`. It exists so that choosing `http` before the
 * backend is ready fails loudly, instead of silently returning nothing.
 *
 * @returns A {@link GameApi} whose methods all reject.
 */
export function createHttpGameApi(): GameApi {
  const notImplemented = async (): Promise<never> => {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  };

  return {
    createLobby: notImplemented,
    getLobby: notImplemented,
    joinLobby: notImplemented,
    claimFranchise: notImplemented,
    startAuction: notImplemented,
    getAuction: notImplemented,
    placeBid: notImplemented,
  };
}
