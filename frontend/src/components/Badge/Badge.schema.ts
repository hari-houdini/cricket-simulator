import {
  discriminatedUnion,
  literal,
  object,
  string,
  enum as zodEnum,
} from "zod";

/** Player roles, abbreviated as the design system shows them. */
export const badgeRoles = ["BAT", "BOWL", "AR", "WK"] as const;

/** Status chips: availability, sold, and captaincy. */
export const badgeStatuses = ["available", "sold", "captain"] as const;

/**
 * Props the {@link Badge} owns, discriminated by `kind`. Each kind carries only
 * the fields it needs, so an invalid combination fails validation.
 */
export const badgeSchema = discriminatedUnion("kind", [
  object({
    kind: literal("team"),
    label: string().min(1),
    color: string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  object({
    kind: literal("role"),
    role: zodEnum(badgeRoles),
  }),
  object({
    kind: literal("status"),
    status: zodEnum(badgeStatuses),
  }),
]);
