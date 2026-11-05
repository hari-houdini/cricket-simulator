import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for the prototype layout's column. It fills the root layout's
 * `<main>`, and its children are stacked with one gap at every width.
 */
export const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: tokens.spaceXl,
    width: "100%",
    minHeight: "100%",
    color: tokens.colorText,
    fontFamily: tokens.fontSans,
  },
});
