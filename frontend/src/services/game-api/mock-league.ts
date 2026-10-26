import type { MatchScore } from "../../shared/types/league.types";
import type { Player } from "../../shared/types/player.types";
import type {
  LeagueMatch,
  PlayoffSlot,
} from "../../shared/types/schedule.types";
import {
  simulateMatch,
  teamStrength,
} from "../../shared/utils/match-simulator";
import { createSeededRandom } from "../../shared/utils/seeded-random";

/**
 * The map key for one league fixture's result in one lobby. Each lobby keeps its
 * own results, so the key includes the lobby code.
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
 * The map key for one playoff slot's result in one lobby.
 *
 * @param code - A normalised lobby code.
 * @param slot - The playoff slot.
 * @returns A string that is unique to the lobby and slot.
 */
export function playoffResultKey(code: string, slot: PlayoffSlot): string {
  return JSON.stringify([code, slot]);
}

/**
 * The seed for one match's draws. It comes from the lobby and the fixture, so a
 * match gives the same score each time it is played in the same lobby.
 *
 * @param code - A normalised lobby code.
 * @param round - The round the match is played in.
 * @param homeFranchiseId - The home franchise.
 * @param awayFranchiseId - The away franchise.
 * @returns The seed string.
 */
export function matchSeedKey(
  code: string,
  round: number,
  homeFranchiseId: string,
  awayFranchiseId: string,
): string {
  return `${code}:match:${round}:${homeFranchiseId}:${awayFranchiseId}`;
}

/**
 * Plays one match. The draws come from `seedKey`, so the same key always gives
 * the same score, whatever order the rounds are played in.
 *
 * @param seedKey - The seed from {@link matchSeedKey}.
 * @param homeFranchiseId - The home franchise, which bats first.
 * @param awayFranchiseId - The away franchise.
 * @param homeField - The home franchise's players on the field.
 * @param awayField - The away franchise's players on the field.
 * @returns The score. The winner is null when the match is tied.
 */
export function playMatch(
  seedKey: string,
  homeFranchiseId: string,
  awayFranchiseId: string,
  homeField: readonly Player[],
  awayField: readonly Player[],
): MatchScore {
  const outcome = simulateMatch(
    teamStrength(homeField),
    teamStrength(awayField),
    createSeededRandom(seedKey),
  );

  let winnerFranchiseId: string | null = null;
  if (outcome.winner === "home") {
    winnerFranchiseId = homeFranchiseId;
  } else if (outcome.winner === "away") {
    winnerFranchiseId = awayFranchiseId;
  }
  return {
    homeRuns: outcome.homeRuns,
    homeWickets: outcome.homeWickets,
    awayRuns: outcome.awayRuns,
    awayWickets: outcome.awayWickets,
    winnerFranchiseId,
  };
}
