import type { MatchScore } from "../../shared/types/league.types";
import type { Player } from "../../shared/types/player.types";
import type { LeagueMatch } from "../../shared/types/schedule.types";
import {
  simulateMatch,
  teamStrength,
} from "../../shared/utils/match-simulator";
import { createSeededRandom } from "../../shared/utils/seeded-random";

/**
 * The map key for one fixture's result in one lobby. Each lobby keeps its own
 * results, so the key includes the lobby code.
 *
 * @param code - A normalised lobby code.
 * @param match - The fixture.
 * @returns A string that is unique to the lobby and fixture.
 */
export function resultKey(code: string, match: LeagueMatch): string {
  return JSON.stringify([
    code,
    match.round,
    match.homeFranchiseId,
    match.awayFranchiseId,
  ]);
}

/**
 * Plays one league match. The draws come from a seed built from the lobby code
 * and the fixture, so a match gives the same score every time it is played in
 * the same lobby, whatever order the rounds are played in.
 *
 * @param code - A normalised lobby code.
 * @param match - The fixture being played.
 * @param homeField - The home franchise's players on the field.
 * @param awayField - The away franchise's players on the field.
 * @returns The score, with the winner's franchise id or null for a tie.
 */
export function playMatch(
  code: string,
  match: LeagueMatch,
  homeField: readonly Player[],
  awayField: readonly Player[],
): MatchScore {
  const seed = `${code}:match:${match.round}:${match.homeFranchiseId}:${match.awayFranchiseId}`;
  const outcome = simulateMatch(
    teamStrength(homeField),
    teamStrength(awayField),
    createSeededRandom(seed),
  );

  let winnerFranchiseId: string | null = null;
  if (outcome.winner === "home") {
    winnerFranchiseId = match.homeFranchiseId;
  } else if (outcome.winner === "away") {
    winnerFranchiseId = match.awayFranchiseId;
  }
  return {
    homeRuns: outcome.homeRuns,
    homeWickets: outcome.homeWickets,
    awayRuns: outcome.awayRuns,
    awayWickets: outcome.awayWickets,
    winnerFranchiseId,
  };
}
