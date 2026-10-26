import { LOBBY_CODE_LENGTH, MAX_OWNERS } from "../../shared/const/lobby.const";
import {
  createLobbyInputSchema,
  joinLobbyInputSchema,
  lobbyCodeSchema,
  lobbySchema,
} from "../../shared/types/lobby.schema";
import type { Lobby, Owner } from "../../shared/types/lobby.types";
import { createSeededRandom } from "../../shared/utils/seeded-random";
import { LobbyFullError, LobbyNotFoundError } from "./game-api.errors";
import type { GameApi } from "./game-api.types";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Options for the mock game API.
 */
export type MockGameApiOptions = {
  /**
   * Seed for lobby codes. The same seed and the same sequence of creates give
   * the same codes, so tests and Storybook can assert on them. When omitted, a
   * fresh seed is drawn, so codes differ between page loads.
   */
  readonly seed?: string;
};

/**
 * Draws a fresh seed for a mock that was not given one.
 *
 * @returns A short random string.
 */
function freshSeed(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Builds the in-memory mock of the game API. It keeps lobbies for as long as
 * the returned object lives, so each page load starts with an empty set, as
 * `docs/specs/mock-api-mvp.md` accepts.
 *
 * Every result is a fresh copy parsed through {@link lobbySchema}, so callers
 * cannot mutate the mock's state by accident.
 *
 * @param options - Optional seed for lobby codes.
 * @returns A {@link GameApi} backed by memory.
 */
export function createMockGameApi(options: MockGameApiOptions = {}): GameApi {
  const random = createSeededRandom(options.seed ?? freshSeed());
  const lobbiesByCode = new Map<string, Lobby>();
  let sequence = 0;

  /**
   * Draws a code that no existing lobby uses. Retries on collision, which is
   * rare with 36^6 codes but cheap to handle.
   *
   * @returns A code of {@link LOBBY_CODE_LENGTH} characters.
   */
  function drawUnusedCode(): string {
    let code: string;
    do {
      code = "";
      for (let index = 0; index < LOBBY_CODE_LENGTH; index += 1) {
        code += CODE_ALPHABET.charAt(
          Math.floor(random() * CODE_ALPHABET.length),
        );
      }
    } while (lobbiesByCode.has(code));
    return code;
  }

  /**
   * Normalises a code the guest typed, then validates it. Guests may type
   * lowercase or pad the code with spaces. Every entry point goes through here,
   * so `getLobby` and `joinLobby` accept the same inputs.
   *
   * @param code - The raw code from the caller.
   * @returns The uppercase, trimmed code.
   * @throws {ZodError} When the code is not a valid lobby code.
   */
  function normalizeCode(code: string): string {
    return lobbyCodeSchema.parse(code.trim().toUpperCase());
  }

  /**
   * Looks up a lobby by normalised code.
   *
   * @param code - A code that has already been normalised.
   * @returns The stored lobby.
   * @throws {LobbyNotFoundError} When no lobby has that code.
   */
  function findLobby(code: string): Lobby {
    const lobby = lobbiesByCode.get(code);
    if (!lobby) {
      throw new LobbyNotFoundError(code);
    }
    return lobby;
  }

  return {
    async createLobby(rawInput) {
      const input = createLobbyInputSchema.parse(rawInput);
      const owner: Owner = {
        guestId: input.guestId,
        displayName: input.displayName,
      };
      const code = drawUnusedCode();
      sequence += 1;
      const lobby: Lobby = {
        id: `lobby-${sequence}`,
        code,
        name: input.name,
        phase: "auction",
        round: 0,
        owners: [owner],
      };
      lobbiesByCode.set(code, lobby);
      return lobbySchema.parse(lobby);
    },

    async getLobby(rawCode) {
      const code = normalizeCode(rawCode);
      return lobbySchema.parse(findLobby(code));
    },

    async joinLobby(rawInput) {
      const input = joinLobbyInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      const lobby = findLobby(input.code);

      const alreadyOwner = lobby.owners.some(
        (owner) => owner.guestId === input.guestId,
      );
      if (alreadyOwner) {
        return lobbySchema.parse(lobby);
      }
      if (lobby.owners.length >= MAX_OWNERS) {
        throw new LobbyFullError(input.code);
      }

      lobby.owners.push({
        guestId: input.guestId,
        displayName: input.displayName,
      });
      return lobbySchema.parse(lobby);
    },
  };
}
