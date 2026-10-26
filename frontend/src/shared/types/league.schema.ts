import { array, boolean, number, object } from "zod";

import {
  FRANCHISE_COUNT,
  LEAGUE_MATCHES,
  LEAGUE_ROUNDS,
} from "../const/league.const";
import { MAX_WICKETS } from "../const/match.const";
import {
  franchiseIdSchema,
  guestIdSchema,
  lobbyCodeSchema,
} from "./lobby.schema";

/**
 * The score of a played league match. `winnerFranchiseId` is null when the
 * match is tied, so a tie is a value the reader can see, not a missing one.
 */
export const matchScoreSchema = object({
  homeRuns: number().int().min(0),
  homeWickets: number().int().min(0).max(MAX_WICKETS),
  awayRuns: number().int().min(0),
  awayWickets: number().int().min(0).max(MAX_WICKETS),
  winnerFranchiseId: franchiseIdSchema.nullable(),
});

/**
 * One league fixture: a match on the schedule, with its score once it has been
 * played. `result` is null until the round is played.
 */
export const fixtureSchema = object({
  round: number().int().min(1).max(LEAGUE_ROUNDS),
  homeFranchiseId: franchiseIdSchema,
  awayFranchiseId: franchiseIdSchema,
  result: matchScoreSchema.nullable(),
});

/**
 * One franchise's row in the league table. Net run rate is runs per over for
 * minus runs per over against, over the overs played.
 */
export const standingSchema = object({
  franchiseId: franchiseIdSchema,
  played: number().int().min(0),
  won: number().int().min(0),
  tied: number().int().min(0),
  lost: number().int().min(0),
  points: number().int().min(0),
  runsFor: number().int().min(0),
  runsAgainst: number().int().min(0),
  netRunRate: number(),
});

/**
 * The league as the frontend sees it: every fixture in round order, the table,
 * and how far the season has got. `round` is 0 before the first round is played.
 */
export const leagueSchema = object({
  round: number().int().min(0).max(LEAGUE_ROUNDS),
  fixtures: array(fixtureSchema).length(LEAGUE_MATCHES),
  standings: array(standingSchema).length(FRANCHISE_COUNT),
  seasonComplete: boolean(),
});

/** Input for playing the next league round. Only an owner may play it. */
export const advanceRoundInputSchema = object({
  code: lobbyCodeSchema,
  guestId: guestIdSchema,
});
