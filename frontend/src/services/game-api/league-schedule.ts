import scheduleFile from "../../../../data/seeds/ipl-schedule.v1.json";
import type { LeagueMatch } from "../../shared/types/schedule.types";
import { scheduleSeedFileSchema } from "../../shared/types/seed.schema";

let leagueFixtures: readonly LeagueMatch[] | undefined;

/**
 * The league's fixtures from the schedule seed, in the seed's order. The file
 * is parsed once, the first time a season needs it.
 *
 * @returns The 70 league matches, each with its round and two franchises.
 */
export function leagueSchedule(): readonly LeagueMatch[] {
  leagueFixtures ??= scheduleSeedFileSchema.parse(scheduleFile).league;
  return leagueFixtures;
}
