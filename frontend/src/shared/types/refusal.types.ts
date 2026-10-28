import type { z } from "zod";

import type { refusalSchema } from "./refusal.schema";

/**
 * A refusal as the backend sends it, derived from {@link refusalSchema}.
 */
export type Refusal = z.infer<typeof refusalSchema>;
