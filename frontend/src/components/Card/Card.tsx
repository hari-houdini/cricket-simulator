import * as stylex from "@stylexjs/stylex";
import { styles } from "./Card.styles";
import type { CardProps } from "./Card.types";

/**
 * A surface that groups related content, such as a player or a standings row.
 *
 * Use `elevation="subtle"` for secondary cards so they don't compete with the
 * primary surface. The card has no interactive behavior of its own. Make it
 * clickable by putting a button or link inside it.
 *
 * @param props - Elevation plus native `<div>` attributes.
 * @returns A `<div>` styled as a card.
 */
export function Card({ elevation = "raised", children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      {...stylex.props(
        styles.base,
        elevation === "raised" && styles.elevationRaised,
        elevation === "subtle" && styles.elevationSubtle,
      )}
    >
      {children}
    </div>
  );
}
