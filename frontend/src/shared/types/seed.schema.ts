import { array, literal, object, string } from "zod";

import {
  FRANCHISE_COUNT,
  LEAGUE_MATCHES,
  PLAYOFF_MATCHES,
} from "../const/league.const";
import { PLAYER_POOL } from "../const/player.const";
import { SEED_SCHEMA_VERSION, SEED_VERSION } from "../const/seed.const";
import { playerSchema } from "./player.schema";
import { leagueMatchSchema, playoffMatchSchema } from "./schedule.schema";
import { teamSchema } from "./team.schema";

/**
 * A seed version string, such as `"1.0.0"`. Lobbies store the version they were
 * created with, so a value is checked for shape here and not for a single
 * release, which lets old lobbies keep parsing after the data moves on.
 */
export const seedVersionSchema = string().regex(/^\d+\.\d+\.\d+$/);

/**
 * The header every seed file carries. `schemaVersion` gates the shape, and
 * `seedVersion` pins the data set. `dataAsOf` is the day the data was compiled,
 * and `source` records how the data was obtained, so a reader can judge it.
 */
export const seedMetadataSchema = object({
  schemaVersion: literal(SEED_SCHEMA_VERSION),
  seedVersion: literal(SEED_VERSION),
  dataAsOf: string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: string().min(1),
});

/** The franchise seed file, `franchises.v1.json`. */
export const franchiseSeedFileSchema = seedMetadataSchema.extend({
  franchises: array(teamSchema).length(FRANCHISE_COUNT),
});

/** The player master seed file, `players.v1.json`. */
export const playerSeedFileSchema = seedMetadataSchema.extend({
  players: array(playerSchema).length(PLAYER_POOL.total),
});

/** The league and playoff template, `ipl-schedule.v1.json`. */
export const scheduleSeedFileSchema = seedMetadataSchema.extend({
  league: array(leagueMatchSchema).length(LEAGUE_MATCHES),
  playoffs: array(playoffMatchSchema).length(PLAYOFF_MATCHES),
});
