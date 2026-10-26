import type {
  CreateLobbyInput,
  JoinLobbyInput,
  Lobby,
} from "../../shared/types/lobby.types";

/**
 * The game API the UI depends on. Components and hooks use this type only, so
 * the mock and the Rust backend are interchangeable behind one switch
 * (`NEXT_PUBLIC_API_MODE`, see {@link createGameApi}).
 *
 * Every method rejects with a typed error from `game-api.errors.ts` when the
 * lobby cannot be found or joined, and with a `ZodError` when input is invalid.
 */
export type GameApi = {
  /** Creates a lobby with the caller as its first owner. */
  readonly createLobby: (input: CreateLobbyInput) => Promise<Lobby>;
  /** Fetches a lobby by its code. The code is case-insensitive. */
  readonly getLobby: (code: string) => Promise<Lobby>;
  /** Adds the caller as an owner. Joining again with the same guest ID is a no-op. */
  readonly joinLobby: (input: JoinLobbyInput) => Promise<Lobby>;
};
