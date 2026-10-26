import { object, enum as zodEnum } from "zod";

/** Shadow depth. `raised` is the default surface, `subtle` suits secondary cards. */
export const cardElevations = ["raised", "subtle"] as const;

/**
 * Props the {@link Card} owns. The schema is the single source for the accepted
 * values, and the component type is derived from it.
 */
export const cardSchema = object({
  elevation: zodEnum(cardElevations).default("raised"),
});
