import { LEAGUE_MATCHES, LEAGUE_ROUNDS } from "../../shared/const/league.const";
import { LAST_ROUND } from "../../shared/const/lobby.const";
import type { GameApi } from "../../shared/types/game-api.types";

/** Advances in the league and the playoffs, one match per step. */
export const SEASON_STEPS = LEAGUE_MATCHES + (LAST_ROUND - LEAGUE_ROUNDS);

/** The league matches in one round. */
export const ROUND_MATCHES = LEAGUE_MATCHES / LEAGUE_ROUNDS;

/** The playoff matches, one per step. */
export const PLAYOFF_STEPS = LAST_ROUND - LEAGUE_ROUNDS;

/**
 * Plays a number of matches, one step each, as an owner. Each step plays a single match, so tests
 * that want a season state ask for the matches it takes to reach it.
 *
 * @param api - The game API under test.
 * @param code - The lobby code.
 * @param guestId - An owner in the lobby.
 * @param steps - How many matches to play.
 */
export async function advanceMatches(
  api: GameApi,
  code: string,
  guestId: string,
  steps: number,
): Promise<void> {
  for (let step = 0; step < steps; step += 1) {
    await api.advanceRound({ code, guestId });
  }
}
