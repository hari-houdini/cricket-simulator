import {
  array,
  boolean,
  discriminatedUnion,
  literal,
  number,
  object,
  string,
  tuple,
  union,
} from "zod";

import { LEAGUE_ROUNDS, PLAYOFF_MATCHES } from "../const/league.const";
import { LAST_ROUND } from "../const/lobby.const";
import { MAX_WICKETS } from "../const/match.const";
import { manOfTheMatchSchema } from "./awards.schema";
import { matchScoreSchema } from "./league.schema";
import { franchiseIdSchema } from "./lobby.schema";
import { playoffSlotSchema } from "./schedule.schema";

/** A batting milestone a batter brings up. Fifties and hundreds are the ones a pair brings up. */
const milestoneSchema = union([
  literal("thirty"),
  literal("fifty"),
  literal("hundred"),
]);

/** How a batter was dismissed, as the simulator names it. */
const wicketKindSchema = union([
  literal("caught"),
  literal("lbw"),
  literal("bowled"),
  literal("run-out"),
  literal("other"),
]);

/** An over and ball within an innings, both one-based. */
const deliverySchema = {
  innings: number().int().min(1),
  over: number().int().min(1).max(20),
  ball: number().int().min(1).max(6),
};

/**
 * One key moment in a playoff match's match log, in the order it happened. Players are named.
 * `kind` tags the variant. The log runs from the toss, through each innings, to the result.
 */
export const matchEventSchema = discriminatedUnion("kind", [
  object({
    kind: literal("toss"),
    winnerFranchiseId: franchiseIdSchema,
  }),
  object({
    kind: literal("inningsStart"),
    innings: number().int().min(1),
    superOver: boolean(),
    battingFranchiseId: franchiseIdSchema,
    bowlingFranchiseId: franchiseIdSchema,
    openers: tuple([string().min(1), string().min(1)]),
    openingBowler: string().min(1),
  }),
  object({
    kind: literal("milestone"),
    ...deliverySchema,
    batter: string().min(1),
    milestone: milestoneSchema,
  }),
  object({
    kind: literal("partnership"),
    ...deliverySchema,
    batters: tuple([string().min(1), string().min(1)]),
    milestone: union([literal("fifty"), literal("hundred")]),
  }),
  object({
    kind: literal("wicket"),
    ...deliverySchema,
    batter: string().min(1),
    bowler: string().min(1),
    wicketKind: wicketKindSchema,
    fielder: string().min(1).nullable(),
    runs: number().int().min(0),
    wickets: number().int().min(0).max(MAX_WICKETS),
  }),
  object({
    kind: literal("fourWickets"),
    ...deliverySchema,
    bowler: string().min(1),
  }),
  object({
    kind: literal("finalOver"),
    innings: number().int().min(1),
    runs: number().int().min(0),
    wickets: number().int().min(0).max(MAX_WICKETS),
    target: number().int().min(1).nullable(),
  }),
  object({
    kind: literal("inningsEnd"),
    innings: number().int().min(1),
    battingFranchiseId: franchiseIdSchema,
    runs: number().int().min(0),
    wickets: number().int().min(0).max(MAX_WICKETS),
    legalBalls: number().int().min(0).max(120),
  }),
  object({
    kind: literal("result"),
    winnerFranchiseId: franchiseIdSchema.nullable(),
  }),
]);

/**
 * A played playoff match. Playoffs cannot be tied, so a level score goes to a
 * super over, and `superOver` records that. `winnerFranchiseId` is always set.
 */
export const playoffResultSchema = object({
  homeFranchiseId: franchiseIdSchema,
  awayFranchiseId: franchiseIdSchema,
  winnerFranchiseId: franchiseIdSchema,
  superOver: boolean(),
  score: matchScoreSchema,
  manOfTheMatch: manOfTheMatchSchema.nullable(),
  matchLog: array(matchEventSchema).min(1),
});

/**
 * One slot in the bracket. The teams are null until they are known, and the
 * result is null until the match is played.
 */
export const playoffSlotViewSchema = object({
  slot: playoffSlotSchema,
  round: number()
    .int()
    .min(LEAGUE_ROUNDS + 1)
    .max(LAST_ROUND),
  homeFranchiseId: franchiseIdSchema.nullable(),
  awayFranchiseId: franchiseIdSchema.nullable(),
  result: playoffResultSchema.nullable(),
});

/** The bracket: the four slots in IPL order, and the champion once the Final is played. */
export const playoffsSchema = object({
  matches: array(playoffSlotViewSchema).length(PLAYOFF_MATCHES),
  champion: franchiseIdSchema.nullable(),
});
