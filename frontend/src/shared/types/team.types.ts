import type { z } from "zod";

import type { teamSchema } from "./team.schema";

/**
 * An IPL franchise. Derived from {@link teamSchema}, so the type and the
 * validator cannot drift apart.
 */
export type Team = z.infer<typeof teamSchema>;
