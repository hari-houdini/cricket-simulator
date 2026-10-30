import { discriminatedUnion, literal, number, object } from "zod";

import { LAST_ROUND } from "../const/lobby.const";
import { matchIdSchema, matchScoreSchema } from "./league.schema";
import {
  franchiseIdSchema,
  guestIdSchema,
  lobbyCodeSchema,
} from "./lobby.schema";
import { playerIdSchema } from "./player.schema";
import { keyMomentSchema } from "./playoffs.schema";

/**
 * A live event in a lobby. The mock sends these now; the WebSocket transport
 * will send the same shapes. `type` names the event, and each event carries
 * what a hook needs to update the screen without fetching again.
 */
export const gameEventSchema = discriminatedUnion("type", [
  object({
    type: literal("auction_bid"),
    code: lobbyCodeSchema,
    playerId: playerIdSchema,
    guestId: guestIdSchema,
    amountLakhs: number().int().positive(),
  }),
  object({
    type: literal("auction_hammer"),
    code: lobbyCodeSchema,
    playerId: playerIdSchema,
    guestId: guestIdSchema,
    amountLakhs: number().int().positive(),
  }),
  object({
    type: literal("match_started"),
    code: lobbyCodeSchema,
    matchId: matchIdSchema,
    round: number().int().min(1).max(LAST_ROUND),
    homeFranchiseId: franchiseIdSchema,
    awayFranchiseId: franchiseIdSchema,
  }),
  object({
    type: literal("key_moment"),
    code: lobbyCodeSchema,
    matchId: matchIdSchema,
    moment: keyMomentSchema,
  }),
  object({
    type: literal("match_complete"),
    code: lobbyCodeSchema,
    matchId: matchIdSchema,
    result: matchScoreSchema,
  }),
  object({
    type: literal("season_complete"),
    code: lobbyCodeSchema,
    championFranchiseId: franchiseIdSchema,
  }),
]);
