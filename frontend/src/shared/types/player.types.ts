import type { z } from "zod";

import type {
  playerCategorySchema,
  playerRoleSchema,
  playerSchema,
} from "./player.schema";

/** A player in the master pool, derived from {@link playerSchema}. */
export type Player = z.infer<typeof playerSchema>;

/** A player role, derived from {@link playerRoleSchema}. */
export type PlayerRole = z.infer<typeof playerRoleSchema>;

/** An auction category, derived from {@link playerCategorySchema}. */
export type PlayerCategory = z.infer<typeof playerCategorySchema>;
