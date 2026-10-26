import type { GameApi } from "./game-api.types";
import { createHttpGameApi } from "./http-game-api";
import { createMockGameApi } from "./mock-game-api";

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
 * Creates the game API for the selected mode. This is the single switch between
 * mock data and the Rust backend.
 *
 * `process.env.NEXT_PUBLIC_API_MODE` is read here, through `process.env`, so Next
 * inlines the value at build time for client code.
 *
 * @param rawMode - The mode value. Defaults to the environment.
 * @returns The mock or HTTP {@link GameApi}.
 * @throws {Error} When the mode is not recognised.
 */
export function createGameApi(
  rawMode: string | undefined = process.env.NEXT_PUBLIC_API_MODE,
): GameApi {
  return resolveApiMode(rawMode) === "http"
    ? createHttpGameApi()
    : createMockGameApi();
}
