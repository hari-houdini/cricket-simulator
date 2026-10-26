import {
  array,
  boolean,
  discriminatedUnion,
  literal,
  number,
  object,
} from "zod";

import { LEAGUE_ROUNDS, PLAYOFF_MATCHES } from "../const/league.const";
import { LAST_ROUND } from "../const/lobby.const";
import { MAX_WICKETS } from "../const/match.const";
import { matchScoreSchema } from "./league.schema";
import { franchiseIdSchema } from "./lobby.schema";
import { playoffSlotSchema } from "./schedule.schema";

/**
 * A key moment in a playoff match: a wicket, or the result. Wickets are the only
 * milestones the engine produces so far; the rest of the list in
 * `docs/game-design.md` section 6 needs ball-by-ball play.
 */
export const keyMomentSchema = discriminatedUnion("kind", [
  object({
    kind: literal("wicket"),
    innings: number().int().min(1).max(2),
    wicketNumber: number().int().min(1).max(MAX_WICKETS),
    battingFranchiseId: franchiseIdSchema,
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
  keyMoments: array(keyMomentSchema).min(1),
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
