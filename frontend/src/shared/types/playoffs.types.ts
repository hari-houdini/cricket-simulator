import type { z } from "zod";

import type {
  keyMomentSchema,
  playoffResultSchema,
  playoffSlotViewSchema,
  playoffsSchema,
} from "./playoffs.schema";

/** One key moment in a playoff match, derived from {@link keyMomentSchema}. */
export type KeyMoment = z.infer<typeof keyMomentSchema>;

/** A played playoff match, derived from {@link playoffResultSchema}. */
export type PlayoffResult = z.infer<typeof playoffResultSchema>;

/** One slot in the bracket, derived from {@link playoffSlotViewSchema}. */
export type PlayoffSlotView = z.infer<typeof playoffSlotViewSchema>;

/** The bracket, derived from {@link playoffsSchema}. */
export type Playoffs = z.infer<typeof playoffsSchema>;
