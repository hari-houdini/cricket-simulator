import {
  LEAGUE_MATCHES,
  LEAGUE_ROUNDS,
  MATCH_INTERVAL_MS,
} from "../../shared/const/league.const";
import { LAST_ROUND } from "../../shared/const/lobby.const";
import type { GameApi } from "../../shared/types/game-api.types";

/** Steps in the league and the playoffs, one match per step. */
export const SEASON_STEPS = LEAGUE_MATCHES + (LAST_ROUND - LEAGUE_ROUNDS);

/** The league matches in one round. */
export const ROUND_MATCHES = LEAGUE_MATCHES / LEAGUE_ROUNDS;

/** The playoff matches, one per step. */
export const PLAYOFF_STEPS = LAST_ROUND - LEAGUE_ROUNDS;

/**
 * Plays a number of matches, one step each. The season moves on the server clock, so each step
 * moves the test's clock forward by one interval and then reads the lobby, which settles the step
 * that has come due. The first read starts the clock and plays nothing.
 *
 * @param api - The game API under test.
 * @param code - The lobby code.
 * @param steps - How many matches to play.
 * @param advanceClock - Moves the test's clock forward by the given milliseconds.
 */
export async function advanceMatches(
  api: GameApi,
  code: string,
  steps: number,
  advanceClock: (ms: number) => void,
): Promise<void> {
  await api.getLobby(code);
  for (let step = 0; step < steps; step += 1) {
    advanceClock(MATCH_INTERVAL_MS);
    await api.getLobby(code);
  }
}
