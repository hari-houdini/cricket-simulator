import type { GameApi } from "../../shared/types/game-api.types";
import { createHttpGameApi } from "./http-game-api";

/** The API modes the frontend can run against. */
export type ApiMode = "mock" | "http";

/**
 * Turns the `NEXT_PUBLIC_API_MODE` value into a mode. An unset or empty value
 * means `mock`, so a fresh checkout works with no configuration.
 *
 * @param rawMode - The raw environment value, if any.
 * @returns The selected mode.
 * @throws {Error} When the value is set to something other than `mock` or `http`.
 */
export function resolveApiMode(rawMode: string | undefined): ApiMode {
  if (rawMode === undefined || rawMode === "" || rawMode === "mock") {
    return "mock";
  }
  if (rawMode === "http") {
    return "http";
  }
  throw new Error(
    `Unknown NEXT_PUBLIC_API_MODE "${rawMode}". Use "mock" or "http".`,
  );
}

/**
 * Wraps the mock API so its module (the seed data and rule code) loads on the
 * first call, not with the first page. Every page mounts the API, but most
 * pages never call it, so this keeps the initial JavaScript within the budget.
 * The mock is still built once, so its lobbies survive client navigation.
 *
 * @returns A {@link GameApi} that forwards every call to the lazily loaded mock.
 */
function createLazyMockGameApi(): GameApi {
  let mock: Promise<GameApi> | undefined;
  const loaded = (): Promise<GameApi> => {
    mock ??= import("./mock-game-api").then(({ createMockGameApi }) =>
      createMockGameApi(),
    );
    return mock;
  };
  return {
    createLobby: async (input) => (await loaded()).createLobby(input),
    getLobby: async (code) => (await loaded()).getLobby(code),
    joinLobby: async (input) => (await loaded()).joinLobby(input),
    claimFranchise: async (input) => (await loaded()).claimFranchise(input),
    startAuction: async (input) => (await loaded()).startAuction(input),
    getAuction: async (code) => (await loaded()).getAuction(code),
    placeBid: async (input) => (await loaded()).placeBid(input),
    getSquad: async (input) => (await loaded()).getSquad(input),
    setStartingXi: async (input) => (await loaded()).setStartingXi(input),
    substitute: async (input) => (await loaded()).substitute(input),
    getLeague: async (code) => (await loaded()).getLeague(code),
    advanceRound: async (input) => (await loaded()).advanceRound(input),
    getStandings: async (code) => (await loaded()).getStandings(code),
    getMatch: async (code, matchId) => (await loaded()).getMatch(code, matchId),
    getPlayoffs: async (code) => (await loaded()).getPlayoffs(code),
    getAwards: async (code) => (await loaded()).getAwards(code),
    subscribe: async (code, listener) =>
      (await loaded()).subscribe(code, listener),
  };
}

/**
 * Creates the game API for the selected mode. This is the single switch between
 * mock data and the Rust backend.
 *
 * `process.env.NEXT_PUBLIC_API_MODE` and `process.env.NEXT_PUBLIC_API_URL` are
 * read here, through `process.env`, so Next inlines them at build time for client code.
 * `http` needs the backend origin, and it fails here rather than on the first call,
 * so a missing URL shows up at startup.
 *
 * @param rawMode - The mode value. Defaults to the environment.
 * @param rawBaseUrl - The backend origin, used only in `http` mode. Defaults to the environment.
 * @returns The mock or HTTP {@link GameApi}.
 * @throws {Error} When the mode is not recognised, or `http` has no backend URL.
 */
export function createGameApi(
  rawMode: string | undefined = process.env.NEXT_PUBLIC_API_MODE,
  rawBaseUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
): GameApi {
  if (resolveApiMode(rawMode) === "mock") {
    return createLazyMockGameApi();
  }
  if (rawBaseUrl === undefined || rawBaseUrl === "") {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be set when NEXT_PUBLIC_API_MODE is "http", for example to the local Worker at http://localhost:8787.',
    );
  }
  return createHttpGameApi({ baseUrl: rawBaseUrl });
}
