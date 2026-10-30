import type { z } from "zod";

import type { lineupSchema } from "./lineup.schema";

/** One owner's lineup, derived from {@link lineupSchema} so the type and the validator cannot drift. */
export type Lineup = z.infer<typeof lineupSchema>;
