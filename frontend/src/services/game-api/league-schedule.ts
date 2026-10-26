import type { z } from "zod";

import scheduleFile from "../../../../data/seeds/ipl-schedule.v1.json";
import type {
  LeagueMatch,
  PlayoffMatch,
} from "../../shared/types/schedule.types";
import { scheduleSeedFileSchema } from "../../shared/types/seed.schema";

let scheduleSeed: z.infer<typeof scheduleSeedFileSchema> | undefined;

/**
 * The schedule seed, parsed once, the first time a season needs it.
 *
 * @returns The league fixtures and the playoff template.
 */
function parsedSchedule() {
  scheduleSeed ??= scheduleSeedFileSchema.parse(scheduleFile);
  return scheduleSeed;
}

/**
 * The league's fixtures from the schedule seed, in the seed's order.
 *
 * @returns The 70 league matches, each with its round and two franchises.
 */
export function leagueSchedule(): readonly LeagueMatch[] {
  return parsedSchedule().league;
}

/**
 * The playoff template from the schedule seed: which round each slot is played
 * in, and where its two teams come from.
 *
 * @returns The four playoff slots in round order.
 */
export function playoffSchedule(): readonly PlayoffMatch[] {
  return parsedSchedule().playoffs;
}
