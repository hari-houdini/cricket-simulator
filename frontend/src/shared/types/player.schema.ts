import { boolean, number, object, string, enum as zodEnum } from "zod";

import {
  BASE_PRICE_LAKHS_BY_CATEGORY,
  PLAYER_CATEGORIES,
  PLAYER_ROLES,
} from "../const/player.const";

/**
 * A player id: a lowercase slug such as `"virat-kohli"`. Ids are stable across
 * seed versions, so never use array positions as ids.
 */
export const playerIdSchema = string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** The role of a player, from {@link PLAYER_ROLES}. */
export const playerRoleSchema = zodEnum(PLAYER_ROLES);

/** The auction category of a player, from {@link PLAYER_CATEGORIES}. */
export const playerCategorySchema = zodEnum(PLAYER_CATEGORIES);

/** A batting, bowling or fielding rating: an integer from 0 to 100. */
export const ratingSchema = number().int().min(0).max(100);

/** A trouble rating: an integer from 0 to 10 (`docs/game-design.md` section 9). */
export const troubleRatingSchema = number().int().min(0).max(10);

/**
 * A player in the master pool. Money is in lakhs, so the schema holds only
 * integers and no floats.
 *
 * Two rules are enforced beyond the field types. A player is retired exactly
 * when it has no franchise, and the base price must match the category, so the
 * seed cannot give a marquee player a capped player's price.
 */
export const playerSchema = object({
  id: playerIdSchema,
  name: string().trim().min(1).max(60),
  franchiseId: string().min(1).nullable(),
  role: playerRoleSchema,
  category: playerCategorySchema,
  retired: boolean(),
  batting: ratingSchema,
  bowling: ratingSchema,
  fielding: ratingSchema,
  basePrice: number().int().positive(),
  troubleRating: troubleRatingSchema.optional(),
})
  .refine((player) => player.retired === (player.franchiseId === null), {
    message: "A retired player has no franchise, and a current player has one.",
    path: ["retired"],
  })
  .refine(
    (player) =>
      player.basePrice === BASE_PRICE_LAKHS_BY_CATEGORY[player.category],
    {
      message: "The base price must match the player's category.",
      path: ["basePrice"],
    },
  );
