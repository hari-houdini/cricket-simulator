import { DEFAULT_TROUBLE_RATING } from "../../shared/const/player.const";
import type { MatchScore } from "../../shared/types/league.types";
import type { Player } from "../../shared/types/player.types";
import type {
  LeagueMatch,
  PlayoffSlot,
} from "../../shared/types/schedule.types";
import { fairPlayFactor, playerMatchScore } from "../../shared/utils/fair-play";
import {
  fantasyPointsFor,
  pickManOfTheMatch,
} from "../../shared/utils/fantasy-points";
import type { PlayerPerformance } from "../../shared/utils/match-performance";
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

/** A player's line in one match, with the scores the awards are worked from. */
export type RecordedPerformance = PlayerPerformance & {
  /** Fantasy points before any captain or vice-captain multiplier. */
  readonly fantasyPoints: number;
  /** The player's fair-play score in this match. */
  readonly fairPlayScore: number;
};

/** Everything kept about one played match: each player's line, and the Man of the Match. */
export type MatchRecord = {
  /** The match's seed key, which identifies it within the lobby. */
  readonly matchKey: string;
  readonly round: number;
  readonly homeFranchiseId: string;
  readonly awayFranchiseId: string;
  readonly performances: readonly RecordedPerformance[];
  readonly manOfTheMatchId: string | null;
};

/**
 * Turns a match's allocated performances into a record: fantasy points, each
 * player's fair-play score, and the Man of the Match. The fair-play factor is
 * seeded per player and match, so every guest sees the same scores.
 *
 * @param input - The match, its allocated performances, and each player's trouble rating.
 * @returns The record of the match.
 */
export function recordMatch(input: {
  readonly matchKey: string;
  readonly round: number;
  readonly homeFranchiseId: string;
  readonly awayFranchiseId: string;
  readonly performances: readonly PlayerPerformance[];
  readonly troubleRatingById: ReadonlyMap<string, number>;
}): MatchRecord {
  const performances: RecordedPerformance[] = input.performances.map(
    (performance) => {
      const factor = fairPlayFactor(
        createSeededRandom(
          `${input.matchKey}:fair-play:${performance.playerId}`,
        )(),
      );
      const trouble =
        input.troubleRatingById.get(performance.playerId) ??
        DEFAULT_TROUBLE_RATING;
      return {
        ...performance,
        fantasyPoints: fantasyPointsFor(performance),
        fairPlayScore: playerMatchScore(trouble, factor),
      };
    },
  );
  return {
    matchKey: input.matchKey,
    round: input.round,
    homeFranchiseId: input.homeFranchiseId,
    awayFranchiseId: input.awayFranchiseId,
    performances,
    manOfTheMatchId: pickManOfTheMatch(performances),
  };
}
