import { array, boolean, number, object, string, type ZodType } from "zod";

import { FAIR_PLAY_COLUMN_SIZE } from "../const/awards.const";
import { franchiseIdSchema, guestIdSchema } from "./lobby.schema";

/**
 * A player's line on an individual award screen: the stats that earned the
 * award, with the franchise the player represents.
 */
export const playerAwardLineSchema = object({
  playerId: string().min(1),
  name: string().min(1),
  franchiseId: franchiseIdSchema,
  innings: number().int().min(0),
  runs: number().int().min(0),
  wickets: number().int().min(0),
  runsConceded: number().int().min(0),
  fantasyPoints: number().min(0),
});

/** An owner's line on the Most Valuable Player screen. */
export const ownerAwardLineSchema = object({
  guestId: guestIdSchema,
  displayName: string().min(1),
  franchiseId: franchiseIdSchema,
  fantasyPoints: number().min(0),
});

/** Two places on an award screen. Each is null until someone has earned it. */
export function awardPairSchema<T extends ZodType>(line: T) {
  return object({
    winner: line.nullable(),
    runnerUp: line.nullable(),
  });
}

/** One player's name and average effect on a franchise's fair-play rating. */
export const fairPlayLineSchema = object({
  playerId: string().min(1),
  name: string().min(1),
  averageEffect: number().max(0),
});

/**
 * A franchise's Fair Play screen: its season standing, and the two players who
 * pulled the rating down most and the two who held it up most.
 */
export const fairPlayFranchiseSchema = object({
  franchiseId: franchiseIdSchema,
  standing: number().min(0).max(10),
  lowering: array(fairPlayLineSchema).max(FAIR_PLAY_COLUMN_SIZE),
  lifting: array(fairPlayLineSchema).max(FAIR_PLAY_COLUMN_SIZE),
});

/** The Man of the Match in one played match. */
export const manOfTheMatchSchema = object({
  round: number().int().min(1),
  homeFranchiseId: franchiseIdSchema,
  awayFranchiseId: franchiseIdSchema,
  playerId: string().min(1),
  name: string().min(1),
  franchiseId: franchiseIdSchema,
});

/**
 * Every award for a lobby's season so far. Awards are read from the matches
 * played, so an award shows the leader until the season is over.
 * `seasonComplete` says whether the Final has been played.
 */
export const awardsSchema = object({
  seasonComplete: boolean(),
  orangeCap: awardPairSchema(playerAwardLineSchema),
  purpleCap: awardPairSchema(playerAwardLineSchema),
  mostValuable: awardPairSchema(ownerAwardLineSchema),
  emerging: awardPairSchema(playerAwardLineSchema),
  fairPlay: object({
    winnerFranchiseId: franchiseIdSchema.nullable(),
    franchises: array(fairPlayFranchiseSchema),
  }),
  manOfTheMatch: array(manOfTheMatchSchema),
});
