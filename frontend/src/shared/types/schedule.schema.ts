import {
  discriminatedUnion,
  literal,
  number,
  object,
  string,
  enum as zodEnum,
} from "zod";
import { LEAGUE_ROUNDS } from "../const/league.const";
import { LAST_ROUND } from "../const/lobby.const";

/**
 * The four playoff slots, in IPL order (`docs/game-design.md` section 5). A
 * slot is referenced by the matches that depend on its winner or loser.
 */
export const playoffSlotSchema = zodEnum([
  "qualifier-1",
  "eliminator",
  "qualifier-2",
  "final",
]);

/**
 * One league match. Both franchises are ids from the franchise seed, and a
 * franchise cannot play itself.
 */
export const leagueMatchSchema = object({
  round: number().int().min(1).max(LEAGUE_ROUNDS),
  homeFranchiseId: string().min(1),
  awayFranchiseId: string().min(1),
}).refine((match) => match.homeFranchiseId !== match.awayFranchiseId, {
  message: "A franchise cannot play itself.",
  path: ["awayFranchiseId"],
});

/**
 * Where a playoff team comes from: a league finishing position, or the winner
 * or loser of an earlier playoff slot. The `kind` field tags the variant.
 */
export const playoffSourceSchema = discriminatedUnion("kind", [
  object({
    kind: literal("standing"),
    position: number().int().min(1).max(4),
  }),
  object({
    kind: literal("winner"),
    slot: playoffSlotSchema,
  }),
  object({
    kind: literal("loser"),
    slot: playoffSlotSchema,
  }),
]);

/**
 * One playoff match, placed in a playoff round after the league (rounds
 * {@link LEAGUE_ROUNDS} + 1 to {@link LAST_ROUND}).
 */
export const playoffMatchSchema = object({
  round: number()
    .int()
    .min(LEAGUE_ROUNDS + 1)
    .max(LAST_ROUND),
  slot: playoffSlotSchema,
  home: playoffSourceSchema,
  away: playoffSourceSchema,
});
