import * as stylex from "@stylexjs/stylex";

import { tokens } from "./tokens.stylex";

/**
 * The keyboard focus ring shared by links and scroll regions. It is a gold
 * outline shown only for `:focus-visible`, so a mouse click leaves no ring.
 * Apply `focusRing.ring` alongside a component's own styles.
 */
export const focusRing = stylex.create({
  ring: {
    outlineColor: tokens.colorGoldPrimary,
    outlineOffset: tokens.offsetFocusRing,
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineWidth: tokens.widthFocusRing,
  },
});
