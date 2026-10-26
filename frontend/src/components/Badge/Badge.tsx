import * as stylex from "@stylexjs/stylex";

import { badgeSchema } from "./Badge.schema";
import { styles } from "./Badge.styles";
import type { BadgeProps } from "./Badge.types";

/** Visible text for each status chip. Text, not color, carries the meaning. */
const statusLabels = {
  available: "Available",
  sold: "Sold",
  captain: "Captain",
} as const;

/**
 * A small label for a franchise, a player role, or a status.
 *
 * A team badge shows the franchise color as a swatch next to its abbreviation.
 * The swatch is decorative, so the abbreviation is always rendered as text.
 * Color is never the only signal, as `AGENTS.md` requires.
 *
 * @param props - A `kind` of `team`, `role`, or `status`, with that kind's fields.
 * @returns A `<span>` styled as a badge.
 * @throws {ZodError} When the props don't match one of the three kinds.
 */
export function Badge(props: BadgeProps) {
  const parsed = badgeSchema.parse(props);

  if (parsed.kind === "team") {
    return (
      <span {...stylex.props(styles.base, styles.team)}>
        <span
          aria-hidden="true"
          style={{ backgroundColor: parsed.color }}
          {...stylex.props(styles.swatch)}
        />
        {parsed.label}
      </span>
    );
  }

  if (parsed.kind === "role") {
    return (
      <span {...stylex.props(styles.base, styles.role)}>{parsed.role}</span>
    );
  }

  return (
    <span
      {...stylex.props(
        styles.base,
        parsed.status === "available" && styles.statusAvailable,
        parsed.status === "sold" && styles.statusSold,
        parsed.status === "captain" && styles.statusCaptain,
      )}
    >
      {statusLabels[parsed.status]}
    </span>
  );
}
