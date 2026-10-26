import type { z } from "zod";

import type {
  leagueMatchSchema,
  playoffMatchSchema,
  playoffSlotSchema,
  playoffSourceSchema,
} from "./schedule.schema";

/** A league match, derived from {@link leagueMatchSchema}. */
export type LeagueMatch = z.infer<typeof leagueMatchSchema>;

/** A playoff match, derived from {@link playoffMatchSchema}. */
export type PlayoffMatch = z.infer<typeof playoffMatchSchema>;

/** A playoff slot name, derived from {@link playoffSlotSchema}. */
export type PlayoffSlot = z.infer<typeof playoffSlotSchema>;

/** Where a playoff team comes from, derived from {@link playoffSourceSchema}. */
export type PlayoffSource = z.infer<typeof playoffSourceSchema>;
