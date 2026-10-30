import type { z } from "zod";

import type {
  matchEventSchema,
  playoffResultSchema,
  playoffSlotViewSchema,
  playoffsSchema,
} from "./playoffs.schema";

/** One key moment in a playoff match's match log, derived from {@link matchEventSchema}. */
export type MatchEvent = z.infer<typeof matchEventSchema>;

/** A played playoff match, derived from {@link playoffResultSchema}. */
export type PlayoffResult = z.infer<typeof playoffResultSchema>;

/** One slot in the bracket, derived from {@link playoffSlotViewSchema}. */
export type PlayoffSlotView = z.infer<typeof playoffSlotViewSchema>;

/** The bracket, derived from {@link playoffsSchema}. */
export type Playoffs = z.infer<typeof playoffsSchema>;
